export interface WorkerEnv {
  DB: D1Database;
  FIREBASE_PROJECT_ID?: string;
  ADMIN_EMAILS?: string;
  CORS_ORIGIN?: string;
  ENVIRONMENT?: string;
}

const DEFAULT_FIREBASE_PROJECT_ID = 'gen-lang-client-0369327125';
const DEFAULT_ADMIN_EMAILS = ['asmaomar5566@gmail.com', 'm11287137@gmail.com'];

export function getFirebaseProjectId(env: Partial<WorkerEnv>): string {
  const configured = env.FIREBASE_PROJECT_ID?.trim();
  return configured || DEFAULT_FIREBASE_PROJECT_ID;
}

export function getAdminEmails(env: Partial<WorkerEnv>): string[] {
  const raw = env.ADMIN_EMAILS?.trim();
  if (!raw) return DEFAULT_ADMIN_EMAILS;
  const parsed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...parsed]));
}

export function isAdminEmail(env: Partial<WorkerEnv>, email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails(env).includes(email.trim().toLowerCase());
}
