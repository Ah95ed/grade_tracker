import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((fn) => fn(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    promptListeners.forEach((fn) => fn(null));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect standalone mode (already installed or running as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect device OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const onPromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };

    promptListeners.add(onPromptChange);

    return () => {
      promptListeners.delete(onPromptChange);
    };
  }, []);

  const installApp = async (): Promise<'accepted' | 'dismissed' | 'ios' | 'manual'> => {
    if (isIOS) {
      return 'ios';
    }

    const activePrompt = deferredPrompt || globalDeferredPrompt;
    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const choiceResult = await activePrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
        return choiceResult.outcome;
      } catch {
        return 'manual';
      }
    }

    return 'manual';
  };

  return {
    isInstallable: !!deferredPrompt || isIOS,
    hasNativePrompt: !!deferredPrompt || !!globalDeferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    installApp,
  };
}
