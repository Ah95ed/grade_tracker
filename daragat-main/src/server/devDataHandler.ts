import fs from 'fs';
import path from 'path';
import { authenticateRequest, isAuthorizedForUser } from './authHelper';

const DATA_FILE = path.resolve(process.cwd(), '.dev_user_data.json');

function loadAllUserData(): Record<string, any> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveAllUserData(data: Record<string, any>) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export async function handleDevData(req: any, res: any) {
  const urlObj = new URL(req.url, 'http://localhost:3000');
  const targetUid = urlObj.searchParams.get('uid');

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');


  // Security Check: Verify identity of the requester
  const caller = await authenticateRequest(req);
  if (!caller) {
    res.statusCode = 401;
    res.end(JSON.stringify({
      success: false,
      error: 'غير مصرح: يجب تسجيل الدخول برمز مصادقة صالح للوصول إلى بيانات الدرجات والطلاب',
    }));
    return;
  }

  if (req.method === 'GET') {
    if (!targetUid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'المعرف المطلوب مفقود (Missing uid)' }));
      return;
    }

    // Authorization: User can ONLY read their own data unless Admin
    if (!isAuthorizedForUser(caller, targetUid)) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'مرفوض أمنياً: لا تملك الصلاحية للوصول إلى بيانات مستخدم آخر',
      }));
      return;
    }

    const allData = loadAllUserData();
    const userData = allData[targetUid] || null;
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, data: userData }));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c: any) => (body += c));
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const requestedUid = payload.userUid || payload.uid;
        
        // Strict Isolation: Non-admin users are strictly locked to their own caller.uid
        const uid = caller.isAdmin ? (requestedUid || caller.uid) : caller.uid;

        if (!uid) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'المعرف غير محدد في البيانات' }));
          return;
        }

        // Authorization: User can ONLY save/sync data under their own UID
        if (!isAuthorizedForUser(caller, uid)) {
          res.statusCode = 403;
          res.end(JSON.stringify({
            success: false,
            error: 'مرفوض أمنياً: محاولة تعديل بيانات مستخدم آخر غير مصرح بها',
          }));
          return;
        }

        const allData = loadAllUserData();
        const existing = allData[uid] || {};

        allData[uid] = {
          ...existing,
          ...payload,
          userUid: uid,
          updatedAt: new Date().toISOString(),
        };

        saveAllUserData(allData);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'تم حفظ البيانات ومزامنتها بأمان' }));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'DELETE') {
    if (!targetUid) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'المعرف المطلوب مفقود' }));
      return;
    }

    // Authorization: User can ONLY delete their own data unless Admin
    if (!isAuthorizedForUser(caller, targetUid)) {
      res.statusCode = 403;
      res.end(JSON.stringify({
        success: false,
        error: 'مرفوض أمنياً: لا تملك الصلاحية لحذف بيانات مستخدم آخر',
      }));
      return;
    }

    const allData = loadAllUserData();
    delete allData[targetUid];
    saveAllUserData(allData);
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'تم حذف البيانات بأمان' }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}
