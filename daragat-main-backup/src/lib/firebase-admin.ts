// Safe stub for Firebase Admin in Vite client/dev build environment
export const adminAuth = {
  verifyIdToken: async (_token: string): Promise<any> => {
    throw new Error('firebase-admin server verification not configured in browser build');
  },
};

