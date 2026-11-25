import { flushSync } from 'react-dom';

export type PrintPlatformStatus = {
  isIOS: boolean;
  isStandalonePWA: boolean;
  isInAppBrowser: boolean;
  isRestrictedIOSPrint: boolean;
};

const IOS_PRINT_HELPER_EVENT = 'gradebook:ios-print-helper';

export function getIOSPrintStatus(): PrintPlatformStatus {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isStandalonePWA: false,
      isInAppBrowser: false,
      isRestrictedIOSPrint: false,
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // Detect iPhone / iPad / iPod (including iPadOS reporting MacIntel with touch)
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);

  // Detect Home Screen PWA standalone mode on iOS
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const displayStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const isStandalonePWA = isIOS && (navStandalone || displayStandalone);

  // Detect iOS in-app browsers (WhatsApp, Facebook, Instagram, Messenger, Telegram, Snapchat, TikTok, Line)
  const isInAppBrowser =
    isIOS &&
    /(FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Telegram|Line\/|MicroMessenger|Snapchat|Musical_ly|BytedanceWebview|GSA\/)/i.test(
      ua
    );

  return {
    isIOS,
    isStandalonePWA,
    isInAppBrowser,
    isRestrictedIOSPrint: isStandalonePWA || isInAppBrowser,
  };
}

export function openIosPrintHelper(status?: PrintPlatformStatus) {
  if (typeof window === 'undefined') return;
  const detail = status || getIOSPrintStatus();
  window.dispatchEvent(new CustomEvent(IOS_PRINT_HELPER_EVENT, { detail }));
}

export function subscribeIosPrintHelper(
  handler: (status: PrintPlatformStatus) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<PrintPlatformStatus>;
    handler(customEvent.detail || getIOSPrintStatus());
  };
  window.addEventListener(IOS_PRINT_HELPER_EVENT, listener);
  return () => window.removeEventListener(IOS_PRINT_HELPER_EVENT, listener);
}

/**
 * Triggers window.print() SYNCHRONOUSLY inside the user's click/tap event stack.
 * Using React's flushSync avoids setTimeout delays that break iOS Safari user-gesture activation.
 * Also monitors `beforeprint` on restricted iOS contexts (Home-Screen PWA / in-app browsers)
 * and opens a helpful Safari fallback modal if iOS suppresses the native print dialog.
 */
export function triggerPrint(prepareStateSync?: () => void) {
  if (typeof window === 'undefined') return;

  if (prepareStateSync) {
    flushSync(() => {
      prepareStateSync();
    });
  }

  const status = getIOSPrintStatus();
  let beforePrintFired = false;

  const onBeforePrint = () => {
    beforePrintFired = true;
  };

  window.addEventListener('beforeprint', onBeforePrint, { once: true });

  // Call synchronously within the active user gesture so iOS Safari accepts it
  try {
    window.print();
  } catch {
    // Ignore and let fallback handle if needed
  }

  // On iOS Home-Screen PWA or in-app browsers, Apple blocks window.print() silently.
  // If beforeprint didn't fire, offer one-tap "Open in Safari" + AirPrint/PDF guidance.
  if (status.isRestrictedIOSPrint) {
    window.setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
      if (!beforePrintFired) {
        openIosPrintHelper(status);
      }
    }, 350);
  } else {
    window.setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
    }, 1000);
  }
}
