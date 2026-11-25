import type { WorkerEnv } from '../../src/config/env';
import type { TokenVerifier, VerifiedCaller } from '../../src/utils/firebaseJwt';

export const TEST_CALLERS: Record<string, VerifiedCaller> = {
  'teacher-1': {
    uid: 'uid-teacher-1',
    email: 'teacher1@daragat.test',
    emailVerified: true,
    firebaseEmailVerified: true,
    isAnonymous: false,
    isAdmin: false,
    provider: 'password',
  },
  'teacher-1-newuid': {
    uid: 'uid-teacher-1-relinked',
    email: 'teacher1@daragat.test',
    emailVerified: true,
    firebaseEmailVerified: true,
    isAnonymous: false,
    isAdmin: false,
    provider: 'password',
  },
  'teacher-2': {
    uid: 'uid-teacher-2',
    email: 'teacher2@daragat.test',
    emailVerified: true,
    firebaseEmailVerified: true,
    isAnonymous: false,
    isAdmin: false,
    provider: 'google.com',
  },
  'unverified-user': {
    uid: 'uid-unverified',
    email: 'unverified@daragat.test',
    emailVerified: false,
    firebaseEmailVerified: false,
    isAnonymous: false,
    isAdmin: false,
    provider: 'password',
  },
  'admin-1': {
    uid: 'uid-admin-1',
    email: 'asmaomar5566@gmail.com',
    emailVerified: true,
    firebaseEmailVerified: true,
    isAnonymous: false,
    isAdmin: true,
    provider: 'google.com',
  },
  'anon-1': {
    uid: 'uid-anon-1',
    email: '',
    emailVerified: false,
    firebaseEmailVerified: false,
    isAnonymous: true,
    isAdmin: false,
    provider: 'anonymous',
  },
};

export const testTokenVerifier: TokenVerifier = async (token: string) => {
  const found = TEST_CALLERS[token];
  if (!found) return null;
  return { ...found };
};

export function createTestEnv(db: D1Database): WorkerEnv {
  return {
    DB: db,
    FIREBASE_PROJECT_ID: 'gen-lang-client-0369327125',
    ADMIN_EMAILS: 'asmaomar5566@gmail.com,m11287137@gmail.com',
    CORS_ORIGIN: '*',
    ENVIRONMENT: 'test',
  };
}
