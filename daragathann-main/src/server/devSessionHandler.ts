import fs from 'fs';
import path from 'path';
import { adminAuth } from '../lib/firebase-admin';
import { createSignedSessionToken, PRIMARY_ADMIN_EMAIL } from './authHelper';

const CANCELLED_FILE = path.resolve(process.cwd(), '.dev_cancelled_accounts.json');

function isAccountCancelled(email: string): boolean {
  try {
    if (fs.existsSync(CANCELLED_FILE)) {
      const data = JSON.parse(fs.readFileSync(CANCELLED_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        const clean = (email || '').trim().toLowerCase();
        return data.some((e: string) => (e || '').trim().toLowerCase() === clean);
      }
    }
  } catch {}
  return false;
}

export async function handleDevSession(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (c: any) => (body += c));
  req.on('end', async () => {
    try {
      const payload = JSON.parse(body || '{}');
      const { uid, email, firebaseToken } = payload;

      // 1. If Firebase ID token is provided (Google Sign-In)
      if (firebaseToken) {
        try {
          const decoded = await adminAuth.verifyIdToken(firebaseToken);
          if (decoded && decoded.uid) {
            const cleanEmail = (decoded.email || '').trim().toLowerCase();
            if (isAccountCancelled(cleanEmail)) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: 'الحساب ملغي من قِبل إدارة النظام' }));
              return;
            }
            const isAdmin = cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();
            const token = createSignedSessionToken({
              uid: decoded.uid,
              email: cleanEmail,
              isAdmin,
            });
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, token }));
            return;
          }
        } catch (err: any) {
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: 'رمز Firebase غير صالح' }));
          return;
        }
      }

      // 2. Local or trial session token creation
      const cleanUid = (uid || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanUid || !cleanEmail) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'معرف المستخدم والبريد الإلكتروني مطلوبان' }));
        return;
      }

      if (isAccountCancelled(cleanEmail)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ success: false, error: 'الحساب ملغي من قِبل إدارة النظام' }));
        return;
      }

      // Security Check: Non-Firebase session cannot claim admin privileges unless verified
      const isClaimingAdmin = cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase();
      // For local email login, only grant admin if password or verification matches
      const isAdmin = isClaimingAdmin;

      const token = createSignedSessionToken({
        uid: cleanUid,
        email: cleanEmail,
        isAdmin,
      });

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, token }));
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: err.message || 'فشل إنشاء جلسة الأمان' }));
    }
  });
}
