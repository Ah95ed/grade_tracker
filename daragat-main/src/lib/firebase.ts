import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import rawConfig from '../../firebase-applet-config.json';

const cfg: any = rawConfig || {};

// Fallback client API key for applet development and preview
const DEFAULT_API_KEY = 'AIzaSyCt83OG0NioLFOMK2qHwoJHcu40cJnB5gw';

// قراءة المتغيرات من Cloudflare Environment Variables أولاً (سواء مع بادئة VITE_ أو بدونها)، ثم من ملف الإعدادات
const apiKey =
  ((import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_API_KEY as string | undefined)?.trim()) ||
  cfg.apiKey ||
  DEFAULT_API_KEY;

const authDomain =
  ((import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_AUTH_DOMAIN as string | undefined)?.trim()) ||
  cfg.authDomain ||
  'gen-lang-client-0369327125.firebaseapp.com';

const projectId =
  ((import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_PROJECT_ID as string | undefined)?.trim()) ||
  cfg.projectId ||
  'gen-lang-client-0369327125';

const storageBucket =
  ((import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_STORAGE_BUCKET as string | undefined)?.trim()) ||
  cfg.storageBucket ||
  'gen-lang-client-0369327125.firebasestorage.app';

const messagingSenderId =
  ((import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_MESSAGING_SENDER_ID as string | undefined)?.trim()) ||
  cfg.messagingSenderId ||
  '1059409489946';

const appId =
  ((import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim()) ||
  ((import.meta.env.FIREBASE_APP_ID as string | undefined)?.trim()) ||
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

export const auth = authInstance;
export const googleAuthProvider = new GoogleAuthProvider();

