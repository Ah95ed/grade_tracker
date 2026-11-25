import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import {
  parseMathSegments,
  prepareLatexForKatex,
  MathAlternative,
  MathTokenSegment,
} from '../../utils/mathExpressionParser';

export interface SmartTextFieldHandle {
  focus: () => void;
  blur: () => void;
  isFocused: () => boolean;
  getSelectionRange: () => { start: number; end: number };
  setSelectionRange: (start: number, end: number) => void;
  getValueLength: () => number;
}

interface KatexSpanProps {
  latex: string;
  className?: string;
}

export const KatexInline: React.FC<KatexSpanProps> = ({
  latex,
  className = '',
}) => {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const preparedLatex = useMemo(() => prepareLatexForKatex(latex), [latex]);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    try {
      katex.render(preparedLatex, el, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      el.textContent = latex;
    }
  }, [preparedLatex, latex]);

  return (
    <span
      ref={spanRef}
      dir="ltr"
      className={`inline-block align-baseline ${className}`}
      style={{ unicodeBidi: 'isolate' }}
    />
  );
};

interface SmartMathFieldProps {
  value: string;
  onChange: (val: string) => void;
  useArabicDigits?: boolean;
  textDir?: 'rtl' | 'ltr';
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  resizeTrigger?: string | number;
  ariaLabel?: string;
  isVoiceActive?: boolean;
  isVoiceTarget?: boolean;
  inputRef?: (handle: SmartTextFieldHandle | null) => void;
  onCursorActivity?: (handle: SmartTextFieldHandle) => void;
  onVoiceFieldSelect?: () => void;
}

const ZWS = '\u200B';

function stripZws(s: string): string {
  return s.replace(/\u200B/g, '');
}

/**
 * Serializes the contentEditable DOM back into the canonical raw string.
 */
function serializeEditorDom(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += stripZws(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const mathRaw = el.dataset.mathRaw;
    if (mathRaw !== undefined) {
      out += mathRaw;
      return;
    }
    if (el.tagName === 'BR') {
      out += '\n';
      return;
    }
    const isBlock = el.tagName === 'DIV' || el.tagName === 'P';
    if (isBlock && out.length > 0 && !out.endsWith('\n')) {
      out += '\n';
    }
    el.childNodes.forEach(walk);
  };
  root.childNodes.forEach(walk);
  return out;
}

/**
 * Computes the character offset in `value` corresponding to a DOM (node, offset) point.
 */
function domPointToValueOffset(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number
): number {
  let acc = 0;
  let found = false;

  const walk = (node: Node) => {
    if (found) return;

    if (node === targetNode) {
      if (node.nodeType === Node.TEXT_NODE) {
        const rawText = node.textContent || '';
        acc += stripZws(rawText.slice(0, targetOffset)).length;
        found = true;
        return;
      }
      // Target is an element node; count childNodes up to targetOffset
      const children = Array.from(node.childNodes);
      for (let i = 0; i < Math.min(targetOffset, children.length); i++) {
        walk(children[i]);
        if (found) return;
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      acc += stripZws(node.textContent || '').length;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const mathRaw = el.dataset.mathRaw;
    if (mathRaw !== undefined) {
      if (el.contains(targetNode)) {
        acc += mathRaw.length;
        found = true;
        return;
      }
      acc += mathRaw.length;
      return;
    }

    if (el.tagName === 'BR') {
      acc += 1;
      return;
    }

    el.childNodes.forEach(walk);
  };

  root.childNodes.forEach(walk);
  return acc;
}

/**
 * Finds the DOM (node, offset) or Range endpoint matching a character offset in `value`.
 */
function setSelectionOffsetsInDom(
  root: HTMLElement,
  startOffset: number,
  endOffset: number
): boolean {
  if (typeof window === 'undefined') return false;
  const sel = window.getSelection();
  if (!sel) return false;

  const resolvePoint = (
    targetPos: number
  ): { node: Node; offset: number } | null => {
    let acc = 0;
    let lastValid: { node: Node; offset: number } = {
      node: root,
      offset: root.childNodes.length,
    };

    const children = Array.from(root.childNodes);
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.nodeType === Node.TEXT_NODE) {
        const raw = child.textContent || '';
        const cleanLen = stripZws(raw).length;
        if (targetPos <= acc + cleanLen) {
          const cleanTarget = Math.max(0, targetPos - acc);
          // Map clean character index back to raw DOM text offset (skipping ZWS)
          let cleanCount = 0;
          let domIdx = 0;
          while (domIdx < raw.length && cleanCount < cleanTarget) {
            if (raw[domIdx] !== ZWS) cleanCount++;
            domIdx++;
          }
          // If raw starts with ZWS and cleanTarget is 0, step right after leading ZWS
          while (domIdx < raw.length && raw[domIdx] === ZWS && cleanTarget === 0) {
            domIdx++;
          }
          return { node: child, offset: domIdx };
        }
        acc += cleanLen;
        lastValid = { node: child, offset: raw.length };
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const mathRaw = el.dataset.mathRaw;
        if (mathRaw !== undefined) {
          if (targetPos <= acc) {
            return { node: root, offset: i };
          }
          if (targetPos <= acc + mathRaw.length) {
            // Snap right after the math span (preferring following text node if available)
            const next = children[i + 1];
            if (next && next.nodeType === Node.TEXT_NODE) {
              const nextRaw = next.textContent || '';
              let domIdx = 0;
              while (domIdx < nextRaw.length && nextRaw[domIdx] === ZWS) domIdx++;
              return { node: next, offset: domIdx };
            }
            return { node: root, offset: i + 1 };
          }
          acc += mathRaw.length;
          lastValid = { node: root, offset: i + 1 };
        } else if (el.tagName === 'BR') {
          if (targetPos <= acc) {
            return { node: root, offset: i };
          }
          acc += 1;
          lastValid = { node: root, offset: i + 1 };
        }
      }
    }
    return lastValid;
  };

  const pStart = resolvePoint(Math.max(0, startOffset));
  const pEnd = resolvePoint(Math.max(startOffset, endOffset));
  if (!pStart || !pEnd) return false;

  try {
    const range = document.createRange();
    range.setStart(pStart.node, pStart.offset);
    range.setEnd(pEnd.node, pEnd.offset);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  } catch {
    return false;
  }
}

export const SmartMathField: React.FC<SmartMathFieldProps> = ({
  value,
  onChange,
  useArabicDigits = true,
  textDir = 'rtl',
  placeholder,
  className = '',
  style,
  ariaLabel,
  isVoiceActive = false,
  isVoiceTarget = false,
  inputRef,
  onCursorActivity,
  onVoiceFieldSelect,
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [activeCanonicalKey, setActiveCanonicalKey] = useState<string | null>(null);
  const [hoveredTokenKey, setHoveredTokenKey] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sourceMemoryRef = useRef<Map<string, string>>(new Map());
  const lastSerializedRef = useRef<string>(value);
  const lastDigitsRef = useRef<boolean>(useArabicDigits);
  const lastSelectionRef = useRef<{ start: number; end: number }>({
    start: value.length,
    end: value.length,
  });
  const isComposingRef = useRef<boolean>(false);

  const segments = useMemo(
    () =>
      parseMathSegments(value, sourceMemoryRef.current, {
        useArabicDigits,
      }),
    [value, useArabicDigits]
  );

  const mathTokens = useMemo(
    () => segments.filter((s): s is MathTokenSegment => s.type === 'math'),
    [segments]
  );

  const prevTokenSignaturesRef = useRef<string[]>(
    mathTokens.map((t) => `${t.canonicalKey}:${t.rawText}`)
  );

  const readSelectionOffsets = useCallback((): { start: number; end: number } => {
    const el = editorRef.current;
    if (!el || typeof window === 'undefined') {
      return lastSelectionRef.current;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
      return lastSelectionRef.current;
    }
    const range = sel.getRangeAt(0);
    const s = domPointToValueOffset(el, range.startContainer, range.startOffset);
    const e = domPointToValueOffset(el, range.endContainer, range.endOffset);
    const ordered = s <= e ? { start: s, end: e } : { start: e, end: s };
    lastSelectionRef.current = ordered;
    return ordered;
  }, []);

  const fieldHandle = useMemo<SmartTextFieldHandle>(
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      blur: () => {
        editorRef.current?.blur();
      },
      isFocused: () => {
        const el = editorRef.current;
        return Boolean(el && typeof document !== 'undefined' && document.activeElement === el);
      },
      getSelectionRange: () => readSelectionOffsets(),
      setSelectionRange: (start: number, end: number) => {
        lastSelectionRef.current = { start, end };
        const el = editorRef.current;
        if (el) {
          setSelectionOffsetsInDom(el, start, end);
        }
      },
      getValueLength: () => value.length,
    }),
    [readSelectionOffsets, value.length]
  );

  // Register imperative handle with parent
  useEffect(() => {
    inputRef?.(fieldHandle);
    return () => {
      inputRef?.(null);
    };
  }, [inputRef, fieldHandle]);

  /**
   * Builds inline Text nodes & non-editable KaTeX atomic spans from parsed segments.
   */
  const syncDomFromSegments = useCallback(
    (
      segs: ReturnType<typeof parseMathSegments>,
      preserveCaretOffset?: { start: number; end: number }
    ) => {
      const el = editorRef.current;
      if (!el) return;

      const frag = document.createDocumentFragment();
      let prevWasMathSpan = false;

      segs.forEach((seg, idx) => {
        if (seg.type === 'text') {
          if (seg.text.length > 0) {
            frag.appendChild(document.createTextNode(seg.text));
            if (idx === segs.length - 1 && seg.text.endsWith('\n')) {
              frag.appendChild(document.createTextNode(ZWS));
            }
            prevWasMathSpan = false;
          }
          return;
        }

        const activeAlt =
          seg.alternatives.find((a) => a.id === seg.selectedAltId) ||
          seg.alternatives[0];

        if (activeAlt.kind === 'katex' && activeAlt.latex) {
          const span = document.createElement('span');
          span.contentEditable = 'false';
          span.dataset.mathRaw = seg.rawText;
          span.dataset.canonicalKey = seg.canonicalKey;
          span.className =
            'inline-flex items-baseline align-baseline mx-0.5 rounded px-0.5 border-b border-dashed border-[#BA916C]/70 hover:bg-amber-50/75 cursor-pointer select-none print:border-none print:bg-transparent print:px-0 print:mx-0';
          span.dir = 'ltr';
          span.style.unicodeBidi = 'isolate';
          span.title = 'اضغط لتغيير صيغة الرمز الرياضي';

          try {
            katex.render(prepareLatexForKatex(activeAlt.latex), span, {
              throwOnError: false,
              displayMode: false,
              strict: false,
            });
          } catch {
            span.textContent = seg.rawText;
          }

          frag.appendChild(span);

          // Ensure an anchor text node follows trailing/adjacent KaTeX spans for reliable mobile caret placement
          const nextSeg = segs[idx + 1];
          const needsAnchor =
            !nextSeg ||
            (nextSeg.type === 'math' &&
              (nextSeg.alternatives.find((a) => a.id === nextSeg.selectedAltId)?.kind ===
                'katex'));
          if (needsAnchor) {
            frag.appendChild(document.createTextNode(ZWS));
          }
          prevWasMathSpan = true;
        } else {
          // Non-KaTeX math expressions stay plain editable text so user can edit freely
          const prefix = prevWasMathSpan ? '' : '';
          frag.appendChild(document.createTextNode(`${prefix}${seg.rawText}`));
          prevWasMathSpan = false;
        }
      });

      el.replaceChildren(frag);

      if (
        preserveCaretOffset &&
        typeof document !== 'undefined' &&
        document.activeElement === el
      ) {
        setSelectionOffsetsInDom(
          el,
          preserveCaretOffset.start,
          preserveCaretOffset.end
        );
      }
    },
    []
  );

  // Sync DOM whenever external value changes (voice dictation, side panel insert, alternative switch, saved paper switch, digit toggle)
  useEffect(() => {
    const digitsChanged = lastDigitsRef.current !== useArabicDigits;
    const externalValueChanged = lastSerializedRef.current !== value;
    const currentSignatures = mathTokens.map(
      (t) => `${t.canonicalKey}:${t.rawText}`
    );

    if (externalValueChanged || digitsChanged) {
      const wasFocused =
        typeof document !== 'undefined' &&
        editorRef.current &&
        document.activeElement === editorRef.current;

      const prevSignatures = prevTokenSignaturesRef.current;
      const prevLength = lastSerializedRef.current.length;

      lastSerializedRef.current = value;
      lastDigitsRef.current = useArabicDigits;

      syncDomFromSegments(
        segments,
        wasFocused ? lastSelectionRef.current : undefined
      );

      // Show faint floating math alternatives automatically when voice dictation or external insertion
      // adds or updates a math expression in the active field (without requiring a tap first).
      if (externalValueChanged && (isVoiceTarget || isFocused)) {
        if (mathTokens.length > 0) {
          let targetToken: MathTokenSegment | null = null;
          for (let i = mathTokens.length - 1; i >= 0; i--) {
            const sig = currentSignatures[i];
            if (!prevSignatures.includes(sig)) {
              targetToken = mathTokens[i];
              break;
            }
          }
          if (!targetToken && value.length > prevLength) {
            targetToken = mathTokens[mathTokens.length - 1];
          }
          if (targetToken) {
            setActiveCanonicalKey(targetToken.canonicalKey);
          }
        } else if (isVoiceTarget) {
          setActiveCanonicalKey(null);
        }
      }
    }

    prevTokenSignaturesRef.current = currentSignatures;
  }, [
    value,
    useArabicDigits,
    segments,
    mathTokens,
    isVoiceTarget,
    isFocused,
    syncDomFromSegments,
  ]);

  // Initial mount population
  useEffect(() => {
    lastSerializedRef.current = value;
    lastDigitsRef.current = useArabicDigits;
    syncDomFromSegments(segments);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismiss focus when voice mode activates, and clear floating bar when voice moves to another field
  useEffect(() => {
    if (isVoiceActive && isFocused) {
      editorRef.current?.blur();
      setIsFocused(false);
    }
    if (isVoiceActive && !isVoiceTarget) {
      setActiveCanonicalKey(null);
    }
  }, [isVoiceActive, isVoiceTarget, isFocused]);

  // Close pinned floating bar on outside tap
  useEffect(() => {
    if (!activeCanonicalKey && !hoveredTokenKey) return;
    const handleOutside = (ev: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        ev.target instanceof Node &&
        !containerRef.current.contains(ev.target)
      ) {
        setActiveCanonicalKey(null);
        setHoveredTokenKey(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [activeCanonicalKey, hoveredTokenKey]);

  const emitInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const nextRaw = serializeEditorDom(el);
    lastSerializedRef.current = nextRaw;

    // Record live caret immediately
    const offsets = readSelectionOffsets();
    onCursorActivity?.(fieldHandle);

    if (nextRaw !== value) {
      onChange(nextRaw);
    } else {
      lastSelectionRef.current = offsets;
    }

    // Track latest token as active while typing
    const parsedNow = parseMathSegments(nextRaw, sourceMemoryRef.current, {
      useArabicDigits,
    });
    const tokensNow = parsedNow.filter(
      (s): s is MathTokenSegment => s.type === 'math'
    );
    if (tokensNow.length > 0) {
      setActiveCanonicalKey(tokensNow[tokensNow.length - 1].canonicalKey);
    } else {
      setActiveCanonicalKey(null);
    }
  };

  const applyAlternative = (token: MathTokenSegment, alt: MathAlternative) => {
    const spokenAlt = token.alternatives.find((a) => a.kind === 'spoken');
    if (spokenAlt) {
      sourceMemoryRef.current.set(token.canonicalKey, spokenAlt.insertText);
    }

    const before = value.slice(0, token.start);
    const after = value.slice(token.end);
    const nextValue = `${before}${alt.insertText}${after}`;
    const nextCaretPos = before.length + alt.insertText.length;

    // Preserve active token key so remaining alternatives stay floating faintly for changing mind
    setActiveCanonicalKey(token.canonicalKey);
    lastSelectionRef.current = { start: nextCaretPos, end: nextCaretPos };
    lastSerializedRef.current = nextValue;

    const nextSegments = parseMathSegments(nextValue, sourceMemoryRef.current, {
      useArabicDigits,
    });
    syncDomFromSegments(nextSegments);

    // Keep cursor alive right after the converted symbol so the user can continue typing or dictating seamlessly!
    const el = editorRef.current;
    if (el && !isVoiceActive) {
      el.focus();
      setIsFocused(true);
      setSelectionOffsetsInDom(el, nextCaretPos, nextCaretPos);
      window.requestAnimationFrame(() => {
        if (editorRef.current) {
          setSelectionOffsetsInDom(editorRef.current, nextCaretPos, nextCaretPos);
          onCursorActivity?.(fieldHandle);
        }
      });
    } else if (isVoiceActive) {
      window.requestAnimationFrame(() => {
        onCursorActivity?.(fieldHandle);
      });
    }

    onChange(nextValue);
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isVoiceActive) {
      onVoiceFieldSelect?.();
    }
    const target = e.target as HTMLElement | null;
    const mathSpan = target?.closest('[data-math-raw]') as HTMLElement | null;

    if (mathSpan && mathSpan.dataset.canonicalKey) {
      e.stopPropagation();
      const key = mathSpan.dataset.canonicalKey;
      setActiveCanonicalKey(key);
      const matchingToken = mathTokens.find((t) => t.canonicalKey === key);
      if (matchingToken && editorRef.current && !isVoiceActive) {
        editorRef.current.focus();
        setIsFocused(true);
        setSelectionOffsetsInDom(
          editorRef.current,
          matchingToken.end,
          matchingToken.end
        );
        lastSelectionRef.current = {
          start: matchingToken.end,
          end: matchingToken.end,
        };
        onCursorActivity?.(fieldHandle);
      }
      return;
    }

    // Clicked text or after symbol: keep caret where clicked, keep floating bar faint & non-intrusive
    window.requestAnimationFrame(() => {
      readSelectionOffsets();
      onCursorActivity?.(fieldHandle);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isVoiceActive) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // Allow clean newline inside multiline exam questions without wrapping messy divs
      e.preventDefault();
      const sel = window.getSelection();
      const el = editorRef.current;
      if (!sel || !el || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const nl = document.createTextNode('\n');
      range.insertNode(nl);
      const anchor = document.createTextNode(ZWS);
      nl.after(anchor);
      range.setStart(anchor, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      emitInput();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isVoiceActive) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const plain = e.clipboardData.getData('text/plain');
    if (!plain) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(plain);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    emitInput();
  };

  // Determine which token's alternatives float faintly above the field
  const displayedToken = useMemo(() => {
    if (mathTokens.length === 0) return null;
    const targetKey = hoveredTokenKey || activeCanonicalKey;
    if (targetKey) {
      const found = mathTokens.find((t) => t.canonicalKey === targetKey);
      if (found) return found;
    }
    return isFocused ? mathTokens[mathTokens.length - 1] : null;
  }, [mathTokens, hoveredTokenKey, activeCanonicalKey, isFocused]);

  const showFloatingBar = Boolean(
    displayedToken && (isFocused || activeCanonicalKey || hoveredTokenKey)
  );

  const renderAlternativePill = (
    token: MathTokenSegment,
    alt: MathAlternative
  ) => {
    const isSelected = token.selectedAltId === alt.id;
    return (
      <button
        key={alt.id}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyAlternative(token, alt);
        }}
        className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
          isSelected
            ? 'bg-[#2F2822]/90 text-white shadow-2xs'
            : 'text-[#2F2822]/90 hover:text-[#2F2822] hover:bg-[#FAF3E8] border border-transparent hover:border-[#D5C8B2]'
        }`}
        title={`تحويل إلى: ${alt.label}`}
      >
        {alt.kind === 'katex' && alt.latex ? (
          <KatexInline latex={alt.latex} className="text-[11px]" />
        ) : (
          <bdi dir={alt.isLtr ? 'ltr' : 'rtl'}>
            {alt.previewText || alt.insertText}
          </bdi>
        )}
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0"
      onMouseLeave={() => setHoveredTokenKey(null)}
    >
      {/* Faint Floating Math Alternatives Bar (Never Affects Layout & Never Prints) */}
      {showFloatingBar && displayedToken && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
          className={`math-alternatives-bar no-print print:hidden absolute bottom-full mb-1 z-40 max-w-full flex flex-wrap items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/90 hover:bg-white backdrop-blur-xs border border-[#D5C8B2]/90 shadow-sm transition-opacity duration-150 ${
            textDir === 'rtl' ? 'right-0' : 'left-0'
          } opacity-75 hover:opacity-100 focus-within:opacity-100`}
        >
          {mathTokens.length > 1 && (
            <div className="flex items-center gap-0.5 pl-1 border-l border-[#E5DAC7]">
              {mathTokens.map((t, idx) => {
                const isCur = t.canonicalKey === displayedToken.canonicalKey;
                return (
                  <button
                    key={`${t.id}-tab`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCanonicalKey(t.canonicalKey);
                    }}
                    className={`px-1 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                      isCur
                        ? 'bg-[#BA916C]/25 text-[#2F2822]'
                        : 'text-slate-400 hover:text-[#2F2822]'
                    }`}
                    title={`تعبير رياضي ${idx + 1}`}
                  >
                    #{idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-0.5 overflow-x-auto max-w-full">
            {displayedToken.alternatives.map((alt) =>
              renderAlternativePill(displayedToken, alt)
            )}
          </div>
        </div>
      )}

      {/* Faint Placeholder When Field Is Empty */}
      {value === '' && placeholder && (
        <span
          aria-hidden="true"
          dir={textDir}
          className={`pointer-events-none select-none print:hidden absolute top-0 ${
            textDir === 'rtl' ? 'right-1 left-1 text-right' : 'left-1 right-1 text-left'
          } text-slate-300 font-normal truncate ${
            className.includes('py-0.5') ? 'py-0.5' : ''
          }`}
          style={{ lineHeight: style?.lineHeight }}
        >
          {placeholder}
        </span>
      )}

      {/* Direct Rich-Inline Editable Paper Field (Supports RTL/LTR Cursor & Atomic KaTeX) */}
      <div
        ref={editorRef}
        contentEditable={!isVoiceActive}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        dir={textDir}
        style={{
          ...style,
          direction: textDir,
          textAlign: textDir === 'rtl' ? 'right' : 'left',
          minHeight: '1.4em',
        }}
        onFocus={() => {
          setIsFocused(true);
          window.requestAnimationFrame(() => {
            readSelectionOffsets();
            onCursorActivity?.(fieldHandle);
          });
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        onKeyUp={() => {
          readSelectionOffsets();
          onCursorActivity?.(fieldHandle);
        }}
        onMouseUp={() => {
          readSelectionOffsets();
          onCursorActivity?.(fieldHandle);
        }}
        onMouseOver={(e) => {
          const span = (e.target as HTMLElement | null)?.closest('[data-math-raw]') as HTMLElement | null;
          if (span?.dataset.canonicalKey) {
            setHoveredTokenKey(span.dataset.canonicalKey);
          }
        }}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
          emitInput();
        }}
        onInput={() => {
          if (!isComposingRef.current) {
            emitInput();
          }
        }}
        onPaste={handlePaste}
        className={`w-full whitespace-pre-wrap break-words bg-transparent focus:outline-none ${className}`}
      />
    </div>
  );
};
