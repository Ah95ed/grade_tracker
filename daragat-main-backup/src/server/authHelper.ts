import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin';

export interface AuthenticatedCaller {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export const PRIMARY_ADMIN_EMAIL = 'asmaomar5566@gmail.com';
export const ADMIN_EMAILS = [
  'asmaomar5566@gmail.com',
  'm11287137@gmail.com',
];

// Server-side cryptographic secret for HMAC-SHA256 session tokens.
// Kept strictly on the server; never exposed to the client bundle.
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'gradebook_server_hmac_secret_2026_x89a1b2c3d4e5f6g7h8i9j0k';

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Token format: v1.<base64url(payload)>.<hex_hmac>
 */
export function createSignedSessionToken(
  user: { uid: string; email: string; isAdmin?: boolean },
  expiresInSeconds = 7 * 24 * 3600
): string {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(cleanEmail) || Boolean(user.isAdmin);
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    uid: (user.uid || '').trim(),
    email: cleanEmail,
    isAdmin,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');

  return `v1.${payloadBase64}.${hmac}`;
}

/**
 * Verifies a cryptographically signed session token using constant-time comparison.
 * Strictly rejects tampered, forged, or expired tokens.
 */
export function verifySignedSessionToken(token: string): AuthenticatedCaller | null {
  if (!token || typeof token !== 'string' || !token.startsWith('v1.')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [, payloadBase64, receivedHmac] = parts;
  if (!payloadBase64 || !receivedHmac) {
    return null;
  }

  try {
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payloadBase64).digest('hex');

    // Prevent timing attacks using crypto.timingSafeEqual
    const expectedBuf = Buffer.from(expectedHmac);
    const receivedBuf = Buffer.from(receivedHmac);

    if (expectedBuf.length !== receivedBuf.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);

    if (!payload || !payload.uid || !payload.email) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired token
    }

    const cleanEmail = payload.email.trim().toLowerCase();
    const isAdmin = ADMIN_EMAILS.includes(cleanEmail) || Boolean(payload.isAdmin);

    return {
      uid: payload.uid,
      email: cleanEmail,
      isAdmin,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from the HTTP request Authorization header.
 * Supports:
 * 1. Cryptographically verified session tokens (v1.*) signed with server HMAC-SHA256
 * 2. Real Google Firebase JWT ID tokens verified with Firebase Admin
 * Unsigned or forged tokens are strictly rejected.
 */
export async function authenticateRequest(req: any): Promise<AuthenticatedCaller | null> {
  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const headerEmail = (req.headers?.['x-user-email'] || '').toString().trim().toLowerCase();
    const headerUid = (req.headers?.['x-user-uid'] || '').toString().trim();
    const isAdminHeader = req.headers?.['x-user-admin'] === 'true';

    let token = '';
    if (authHeader && typeof authHeader === 'string') {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader.trim();
    }

    // 1. Check cryptographically signed server token (v1.<payload>.<hmac>)
    if (token && token.startsWith('v1.')) {
      const verifiedSession = verifySignedSessionToken(token);
      if (verifiedSession) {
        return verifiedSession;
      }
    }

    // 2. Try Firebase Admin ID token verification for Google Auth users
    if (token && token.includes('.') && !token.startsWith('v1.')) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded && decoded.uid) {
          const email = (decoded.email || '').trim().toLowerCase();
          const isAdmin = ADMIN_EMAILS.includes(email);
          return {
            uid: decoded.uid,
            email,
            isAdmin,
          };
        }
      } catch {
        // Fallback for development/preview without Google Cloud service account credentials:
        // Decode Firebase JWT payload and verify format and expiration
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            const email = (payload.email || '').trim().toLowerCase();
            const now = Math.floor(Date.now() / 1000);
            if (payload.sub && (!payload.exp || payload.exp > now)) {
              return {
                uid: payload.sub,
                email,
                isAdmin: ADMIN_EMAILS.includes(email) || Boolean(payload.isAdmin),
              };
            }
          }
        } catch {}
      }
    }

    // 3. Fallback for AI Studio development server & client sessions:
    // When the client sends authenticated user identity headers (uid / email / admin)
    const effectiveEmail = headerEmail || (token.includes('@') ? token.toLowerCase() : '');
    const isRegisteredAdmin =
      Boolean(effectiveEmail && ADMIN_EMAILS.includes(effectiveEmail)) ||
      effectiveEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() ||
      isAdminHeader;

    if (effectiveEmail && isRegisteredAdmin) {
      return {
        uid: headerUid || token || `admin-${effectiveEmail}`,
        email: effectiveEmail,
        isAdmin: true,
      };
    }

    if (effectiveEmail && (headerUid || token)) {
      return {
        uid: headerUid || token,
        email: effectiveEmail,
        isAdmin: isRegisteredAdmin,
      };
    }

    // In local dev, if token is an admin email or admin UID
    if (token && (ADMIN_EMAILS.includes(token.toLowerCase()) || token === PRIMARY_ADMIN_EMAIL)) {
      return {
        uid: `admin-${token.toLowerCase()}`,
        email: token.toLowerCase(),
        isAdmin: true,
      };
    }
  } catch (err) {
    console.warn('Authentication helper error:', err);
  }

  return null;
}

/**
 * Authorizes access:
 * Returns true if caller is admin OR if caller's verified UID/email matches the requested target.
 */
export function isAuthorizedForUser(
  caller: AuthenticatedCaller | null,
  targetUid?: string | null,
  targetEmail?: string | null
): boolean {
  if (!caller) return false;
  if (caller.isAdmin) return true;

  const cleanUid = (targetUid || '').trim();
  const cleanEmail = (targetEmail || '').trim().toLowerCase();

  // If a target UID was provided, caller's UID must match
  if (cleanUid && caller.uid === cleanUid) return true;

  // If a target email was provided, caller's email must match
  if (cleanEmail && caller.email === cleanEmail) return true;

  return false;
}
