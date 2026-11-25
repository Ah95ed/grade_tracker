// Guard utility to prevent the native mobile virtual keyboard from popping up
// when tapping score cells that use the app's custom numeric keypad, while
// keeping physical keyboard typing fully functional on desktop mouse/keyboard.

let lastPointerKind: 'touch' | 'mouse' | null = null;

export const isCoarseTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

export const shouldSuppressNativeKeyboard = (): boolean => {
  return isCoarseTouchDevice() || lastPointerKind === 'touch';
};

export const markTouchScoreInputInteraction = (el: HTMLInputElement | null): void => {
  lastPointerKind = 'touch';
  if (el) {
    el.readOnly = true;
    el.setAttribute('inputmode', 'none');
  }
  // If another editable input (such as student name or search) was focused with the mobile keyboard open,
  // blur it immediately so the mobile OS closes its virtual keyboard cleanly.
  if (typeof document !== 'undefined') {
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== el && typeof active.blur === 'function') {
      active.blur();
    }
  }
};

export const markMouseScoreInputInteraction = (
  el: HTMLInputElement | null,
  forceReadOnly: boolean
): void => {
  lastPointerKind = 'mouse';
  if (el && !isCoarseTouchDevice()) {
    el.readOnly = forceReadOnly;
  }
};

export const suppressFocusedScoreInputOnTouch = (el: HTMLInputElement | null): void => {
  if (!el || !shouldSuppressNativeKeyboard()) return;
  el.readOnly = true;
  el.setAttribute('inputmode', 'none');
  if (typeof document !== 'undefined' && document.activeElement === el) {
    el.blur();
  }
};
