import { JWT_CONSTANTS } from '../config/constants';
import { getFirebaseProjectId, isAdminEmail, type WorkerEnv } from '../config/env';

export interface VerifiedCaller {
  uid: string;
  email: string;
  emailVerified: boolean;
  firebaseEmailVerified: boolean;
  isAnonymous: boolean;
  isAdmin: boolean;
  provider: string;
}

export type TokenVerifier = (token: string, env: WorkerEnv) => Promise<VerifiedCaller | null>;

interface JwkCache {
  keys: JsonWebKey[];
  expiresAt: number;
}

let jwkCache: JwkCache | null = null;

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToJson<T = Record<string, any>>(input: string): T {
  const bytes = base64UrlToBytes(input);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function fetchGoogleJwks(forceRefresh = false): Promise<JsonWebKey[]> {
  if (!forceRefresh && jwkCache && jwkCache.expiresAt > Date.now()) {
    return jwkCache.keys;
  }
  const res = await fetch(JWT_CONSTANTS.JWKS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${res.status}`);
  }
  const payload = (await res.json()) as { keys?: JsonWebKey[] };
  const keys = Array.isArray(payload?.keys) ? payload.keys : [];
  jwkCache = {
    keys,
    expiresAt: Date.now() + JWT_CONSTANTS.JWKS_TTL_MS,
  };
  return keys;
}

export async function verifyFirebaseIdToken(
  token: string,
  env: WorkerEnv
): Promise<VerifiedCaller | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSig] = parts;

    const header = base64UrlToJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (header.alg !== 'RS256' || !header.kid) return null;

    let keys = await fetchGoogleJwks(false);
    let jwk = keys.find((k) => (k as { kid?: string }).kid === header.kid);
    if (!jwk) {
      keys = await fetchGoogleJwks(true);
      jwk = keys.find((k) => (k as { kid?: string }).kid === header.kid);
    }
    if (!jwk) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      base64UrlToBytes(encodedSig),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    if (!signatureValid) return null;

    const claims = base64UrlToJson<Record<string, any>>(encodedPayload);
    const nowSec = Math.floor(Date.now() / 1000);
    const projectId = getFirebaseProjectId(env);

    const matchesProject =
      !projectId ||
      claims.aud === projectId ||
      claims.iss === `https://securetoken.google.com/${projectId}`;
    if (!matchesProject) return null;

    if (typeof claims.exp !== 'number' || claims.exp <= nowSec - JWT_CONSTANTS.CLOCK_SKEW_SECONDS) {
      return null;
    }
    if (typeof claims.iat !== 'number' || claims.iat > nowSec + JWT_CONSTANTS.CLOCK_SKEW_SECONDS) {
      return null;
    }
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) {
      return null;
    }

    const email = String(claims.email || '').trim().toLowerCase();
    const provider = String(claims.firebase?.sign_in_provider || '');
    const isAnonymous = provider === 'anonymous';
    const firebaseEmailVerified = claims.email_verified === true;
    const emailVerified = firebaseEmailVerified || Boolean(email);
    const isAdmin = Boolean(email) && isAdminEmail(env, email);

    return {
      uid: claims.sub,
      email,
      emailVerified,
      firebaseEmailVerified,
      isAnonymous,
      isAdmin,
      provider,
    };
  } catch {
    return null;
  }
}
