import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // قراءة متغيرات Firebase المحددة في لوحة Cloudflare Pages (سواء ببادئة VITE_ أو بدونها)
  const fbApiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';
  const fbAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '';
  const fbProjectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
  const fbStorageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '';
  const fbSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '';
  const fbAppId = env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '';

  const cloudflareDefines: Record<string, string> = {};
  if (fbApiKey) cloudflareDefines['import.meta.env.VITE_FIREBASE_API_KEY'] = JSON.stringify(fbApiKey);
  if (fbAuthDomain) cloudflareDefines['import.meta.env.VITE_FIREBASE_AUTH_DOMAIN'] = JSON.stringify(fbAuthDomain);
  if (fbProjectId) cloudflareDefines['import.meta.env.VITE_FIREBASE_PROJECT_ID'] = JSON.stringify(fbProjectId);
  if (fbStorageBucket) cloudflareDefines['import.meta.env.VITE_FIREBASE_STORAGE_BUCKET'] = JSON.stringify(fbStorageBucket);
  if (fbSenderId) cloudflareDefines['import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID'] = JSON.stringify(fbSenderId);
  if (fbAppId) cloudflareDefines['import.meta.env.VITE_FIREBASE_APP_ID'] = JSON.stringify(fbAppId);

  return {
    envPrefix: ['VITE_', 'FIREBASE_'],
    define: cloudflareDefines,
    plugins: [
      {
        name: 'dev-api-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url && req.url.startsWith('/dev-sw.js')) {
              res.setHeader('Content-Type', 'application/javascript');
              res.end('self.addEventListener("install", () => self.skipWaiting()); self.addEventListener("activate", () => self.registration.unregister());');
              return;
            }
            next();
          });

          // مسار المستخدمين والاشتراكات في وضع التطوير
          server.middlewares.use('/api/users', async (req, res, next) => {
            try {
              const { handleDevUsers } = await import('./src/server/devUsersHandler');
              await handleDevUsers(req, res);
            } catch (err: any) {
              console.error('dev /api/users error:', err);
              next();
            }
          });

          // مسار حفظ بيانات الدرجات في وضع التطوير
          server.middlewares.use('/api/data', async (req, res, next) => {
            try {
              const { handleDevData } = await import('./src/server/devDataHandler');
              await handleDevData(req, res);
            } catch (err: any) {
              console.error('dev /api/data error:', err);
              next();
            }
          });

          // مسار استخراج الطلاب والدرجات بالذكاء الاصطناعي أثناء التطوير والمعاينة
          server.middlewares.use('/api/extract-students', async (req, res, next) => {
            if (req.method !== 'POST') return next();
            try {
              let body = '';
              req.on('data', (chunk) => (body += chunk));
              req.on('end', async () => {
                try {
                  const authHeader = (req.headers['authorization'] || '') as string;
                  const trialHeader = (req.headers['x-trial-user-uid'] || '') as string;
                  const emailHeader = (req.headers['x-user-email'] || '') as string;
                  const uidHeader = (req.headers['x-user-uid'] || '') as string;

                  const hasAuth = Boolean(
                    authHeader.length > 7 ||
                    trialHeader ||
                    emailHeader ||
                    uidHeader
                  );

                  if (!hasAuth) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({
                      success: false,
                      error: 'يجب تسجيل الدخول بحساب مفعّل لاستخراج بيانات الطلاب.',
                    }));
                    return;
                  }

                  const payload = JSON.parse(body || '{}');
                  const { extractStudentsFromImages } = await import('./src/server/extractStudentsHandler');
                  const result = await extractStudentsFromImages(payload);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ success: true, ...result }));
                } catch (err: any) {
                  console.error('dev /api/extract-students error:', err);
                  res.statusCode = err?.status || 500;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({
                    success: false,
                    error: err?.message || 'حدث خطأ أثناء معالجة الصور بالذكاء الاصطناعي.',
                    isAuthError: Boolean(err?.isAuthError),
                  }));
                }
              });
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          id: '/',
          name: 'دفتر درجات المعلم',
          short_name: 'دفتر الدرجات',
          description: 'نظام رصد درجات الطلاب الذكي للمعلمين والمدرسين • يعمل أونلاين وبدون إنترنت',
          theme_color: '#1e3a8a',
          background_color: '#FAF8F5',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
