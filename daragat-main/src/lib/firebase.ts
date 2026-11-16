import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

const cfg: any = rawConfig || {};

// Fallback client API key for applet development and preview
const DEFAULT_API_KEY = 'AIzaSyCt83OG0NioLFOMK2qHwoJHcu40cJnB5gw';

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch {}
  return undefined;
};

// قراءة المتغيرات من Cloudflare Environment Variables أولاً (سواء مع بادئة VITE_ أو بدونها)، ثم من ملف الإعدادات
const apiKey =
  getEnvVar('VITE_FIREBASE_API_KEY')?.trim() ||
  getEnvVar('FIREBASE_API_KEY')?.trim() ||
  cfg.apiKey ||
  DEFAULT_API_KEY;

const authDomain =
  getEnvVar('VITE_FIREBASE_AUTH_DOMAIN')?.trim() ||
  getEnvVar('FIREBASE_AUTH_DOMAIN')?.trim() ||
  cfg.authDomain ||
  'gen-lang-client-0369327125.firebaseapp.com';

const projectId =
  getEnvVar('VITE_FIREBASE_PROJECT_ID')?.trim() ||
  getEnvVar('FIREBASE_PROJECT_ID')?.trim() ||
  cfg.projectId ||
  'gen-lang-client-0369327125';

const storageBucket =
  getEnvVar('VITE_FIREBASE_STORAGE_BUCKET')?.trim() ||
  getEnvVar('FIREBASE_STORAGE_BUCKET')?.trim() ||
  cfg.storageBucket ||
  'gen-lang-client-0369327125.firebasestorage.app';

const messagingSenderId =
  getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID')?.trim() ||
  getEnvVar('FIREBASE_MESSAGING_SENDER_ID')?.trim() ||
  cfg.messagingSenderId ||
  '1059409489946';

const appId =
  getEnvVar('VITE_FIREBASE_APP_ID')?.trim() ||
  getEnvVar('FIREBASE_APP_ID')?.trim() ||
  cfg.appId ||
  '1:1059409489946:web:d251a04020251d32b8a1a3';

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

let app: any;
try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  console.warn('Firebase app init warning, retrying with fallback:', e);
  app = initializeApp({ ...firebaseConfig, apiKey: firebaseConfig.apiKey || DEFAULT_API_KEY }, 'fallback-app');
}

let authInstance: any;
try {
  authInstance = getAuth(app);
} catch (e) {
  console.warn('Firebase getAuth warning, falling back to safe auth initialization:', e);
  try {
    const safeApp = initializeApp({ ...firebaseConfig, apiKey: firebaseConfig.apiKey || DEFAULT_API_KEY }, 'safe-auth-app');
    authInstance = getAuth(safeApp);
  } catch (err2) {
    console.error('Critical Firebase Auth initialization error:', err2);
    // Return existing auth or basic object to prevent runtime import crashing
    authInstance = getAuth(app);
  }
}

// تثبيت بقاء جلسة تسجيل الدخول محلياً عبر المتصفح لمنع تسجيل الخروج التلقائي عند إغلاق التبويب أو المتصفح
try {
  if (authInstance && typeof browserLocalPersistence !== 'undefined') {
    setPersistence(authInstance, browserLocalPersistence).catch((err) => {
      console.warn('Firebase setPersistence warning:', err);
    });
  }
} catch (e) {
  console.warn('Persistence setup warning:', e);
}

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();


