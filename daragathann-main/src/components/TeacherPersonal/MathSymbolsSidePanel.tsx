import React, { useMemo, useState } from 'react';
import { X, Sigma, Sparkles, ArrowDownToLine, Trash2 } from 'lucide-react';
import { SmartMathField, KatexInline } from './SmartMathField';
import { normalizeArabicMathSpeech } from '../../utils/mathExpressionParser';

interface MathSymbolsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAtCursor: (
    text: string,
    addSmartSpace?: boolean,
    caretOffset?: number
  ) => void;
  activeCursorLabel: string;
  isVoiceActive: boolean;
  useArabicDigits?: boolean;
}

interface SymbolItem {
  label: string;
  insert: string;
  caretOffset?: number;
  latexPreview?: string;
  title?: string;
  isLtr?: boolean;
}

function getIraqiSymbolGroups(
  useArabicDigits: boolean
): { title: string; items: SymbolItem[] }[] {
  if (useArabicDigits) {
    return [
      {
        title: 'الجذور والأسس (منهج العراق - أرقام عربية)',
        items: [
          {
            label: '√٢٥',
            insert: '$\\sqrt{٢٥}$',
            latexPreview: '\\sqrt{٢٥}',
            title: 'جذر تربيعي (كمعادلة)',
            isLtr: true,
          },
          {
            label: '∛٨',
            insert: '$\\sqrt[٣]{٨}$',
            latexPreview: '\\sqrt[٣]{٨}',
            title: 'جذر تكعيبي (كمعادلة)',
            isLtr: true,
          },
          {
            label: '√س',
            insert: '$\\sqrt{س}$',
            latexPreview: '\\sqrt{س}',
            title: 'جذر تربيعي للمتغير س',
            isLtr: true,
          },
          { label: '√', insert: '√', title: 'رمز الجذر التربيعي', isLtr: true },
          { label: '∛', insert: '∛', title: 'رمز الجذر التكعيبي', isLtr: true },
          {
            label: 'س²',
            insert: '$س^{٢}$',
            latexPreview: 'س^{٢}',
            title: 'س تربيع',
            isLtr: true,
          },
          {
            label: 'س³',
            insert: '$س^{٣}$',
            latexPreview: 'س^{٣}',
            title: 'س تكعيب',
            isLtr: true,
          },
          {
            label: '٥²',
            insert: '$٥^{٢}$',
            latexPreview: '٥^{٢}',
            title: 'أس تربيعي بالرقم العربي',
            isLtr: true,
          },
          {
            label: '(٥²)²',
            insert: '$(٥^{٢})^{٢}$',
            latexPreview: '(٥^{٢})^{٢}',
            title: 'أس على أس بالأرقام العربية',
            isLtr: true,
          },
          {
            label: '(س²)³',
            insert: '$(س^{٢})^{٣}$',
            latexPreview: '(س^{٢})^{٣}',
            title: 'متغير أس على أس بالأرقام العربية',
            isLtr: true,
          },
          {
            label: '٥²³',
            insert: '$٥^{٢^{٣}}$',
            latexPreview: '٥^{٢^{٣}}',
            title: 'أس فوق أس بالأرقام العربية',
            isLtr: true,
          },
          { label: 'س² نصي', insert: 'س²', title: 'س تربيع نصي' },
          { label: 'س³ نصي', insert: 'س³', title: 'س تكعيب نصي' },
          { label: '²', insert: '²', title: 'أس ٢' },
          { label: '³', insert: '³', title: 'أس ٣' },
          { label: 'ⁿ', insert: 'ⁿ', title: 'أس ن' },
          { label: '^', insert: '^', title: 'علامة الأس', isLtr: true },
        ],
      },
      {
        title: 'الكسور والعمليات والمقارنة',
        items: [
          {
            label: '١/٢',
            insert: '$\\frac{١}{٢}$',
            latexPreview: '\\frac{١}{٢}',
            title: 'كسر عمودي (نصف)',
            isLtr: true,
          },
          {
            label: '٣/٤',
            insert: '$\\frac{٣}{٤}$',
            latexPreview: '\\frac{٣}{٤}',
            title: 'كسر عمودي (ثلاثة أرباع)',
            isLtr: true,
          },
          {
            label: 'س/ص',
            insert: '$\\frac{س}{ص}$',
            latexPreview: '\\frac{س}{ص}',
            title: 'كسر عمودي بالمتغيرات',
            isLtr: true,
          },
          {
            label: '()',
            insert: '()',
            caretOffset: 1,
            title: 'قوسان — يضع مؤشر الكتابة في الوسط',
            isLtr: true,
          },
          { label: '+', insert: ' + ', title: 'جمع' },
          { label: '−', insert: ' − ', title: 'طرح' },
          { label: '×', insert: ' × ', title: 'ضرب' },
          { label: '÷', insert: ' ÷ ', title: 'قسمة' },
          { label: '=', insert: ' = ', title: 'يساوي' },
          { label: '≠', insert: ' ≠ ', title: 'لا يساوي' },
          { label: '≈', insert: ' ≈ ', title: 'يساوي تقريباً' },
          { label: '<', insert: ' < ', title: 'أصغر من' },
          { label: '>', insert: ' > ', title: 'أكبر من' },
          { label: '≤', insert: ' ≤ ', title: 'أصغر أو يساوي' },
          { label: '≥', insert: ' ≥ ', title: 'أكبر أو يساوي' },
          { label: '±', insert: ' ± ', title: 'موجب أو سالب' },
          { label: '٪', insert: '٪', title: 'نسبة مئوية' },
        ],
      },
      {
        title: 'المجموعات والهندسة والمتغيرات',
        items: [
          { label: '|س|', insert: '|س|', title: 'القيمة المطلقة' },
          { label: '∈', insert: ' ∈ ', title: 'ينتمي إلى' },
          { label: '∉', insert: ' ∉ ', title: 'لا ينتمي إلى' },
          { label: '⊂', insert: ' ⊂ ', title: 'مجموعة جزئية' },
          { label: '⊄', insert: ' ⊄ ', title: 'ليست مجموعة جزئية' },
          { label: '∪', insert: ' ∪ ', title: 'اتحاد' },
          { label: '∩', insert: ' ∩ ', title: 'تقاطع' },
          { label: '∅', insert: '∅', title: 'المجموعة الخالية (فاي)' },
          { label: '∠', insert: '∠', title: 'زاوية' },
          { label: '△', insert: '△', title: 'مثلث' },
          { label: '⊥', insert: ' ⊥ ', title: 'عمودي على' },
          { label: '//', insert: ' // ', title: 'يوازي' },
          { label: '≅', insert: ' ≅ ', title: 'يطابق' },
          { label: '∼', insert: ' ∼ ', title: 'يشابه' },
          { label: '°', insert: '°', title: 'درجة' },
          { label: 'π', insert: 'π', title: 'النسبة الثابتة باي', isLtr: true },
          { label: 'س', insert: 'س' },
          { label: 'ص', insert: 'ص' },
          { label: 'ع', insert: 'ع' },
          { label: 'أ', insert: 'أ' },
          { label: 'ب', insert: 'ب' },
          { label: 'ن', insert: 'ن' },
        ],
      },
      {
        title: 'المثلثات واللوغاريتم والتفاضل والتكامل',
        items: [
          { label: 'جا س', insert: 'جا س', title: 'جيب الزاوية' },
          { label: 'جتا س', insert: 'جتا س', title: 'جيب تمام الزاوية' },
          { label: 'ظا س', insert: 'ظا س', title: 'ظل الزاوية' },
          {
            label: 'لو₂(س)',
            insert: '$\\text{لو}_{٢}(س)$',
            latexPreview: '\\text{لو}_{٢}(س)',
            title: 'لوغاريتم',
            isLtr: true,
          },
          {
            label: 'دص/دس',
            insert: '$\\frac{\\text{د}ص}{\\text{د}س}$',
            latexPreview: '\\frac{\\text{د}ص}{\\text{د}س}',
            title: 'مشتقة ص بالنسبة إلى س',
            isLtr: true,
          },
          { label: "ق'(س)", insert: "ق'(س)", title: 'المشتقة الأولى' },
          {
            label: 'غا(س→٠)',
            insert: '$\\lim_{س \\to ٠}$',
            latexPreview: '\\lim_{س \\to ٠}',
            title: 'الغاية عند اقتراب س',
            isLtr: true,
          },
          {
            label: '∫ س² دس',
            insert: '$\\int س^{٢}\\,دس$',
            latexPreview: '\\int س^{٢}\\,دس',
            title: 'تكامل غير محدد',
            isLtr: true,
          },
          {
            label: '∫₀⁵ دس',
            insert: '$\\int_{٠}^{٥}\\,دس$',
            latexPreview: '\\int_{٠}^{٥}\\,دس',
            title: 'تكامل محدد',
            isLtr: true,
          },
          { label: '∑', insert: '∑', title: 'مجموع', isLtr: true },
          { label: '∞', insert: '∞', title: 'ما لا نهاية', isLtr: true },
        ],
      },
    ];
  }

  // English digits mode (Iraqi modernized secondary curriculum)
  return [
    {
      title: 'الجذور والأسس (المنهج المطور - أرقام إنجليزية)',
      items: [
        {
          label: '√25',
          insert: '$\\sqrt{25}$',
          latexPreview: '\\sqrt{25}',
          title: 'جذر تربيعي (كمعادلة)',
          isLtr: true,
        },
        {
          label: '∛8',
          insert: '$\\sqrt[3]{8}$',
          latexPreview: '\\sqrt[3]{8}',
          title: 'جذر تكعيبي (كمعادلة)',
          isLtr: true,
        },
        {
          label: '√x',
          insert: '$\\sqrt{x}$',
          latexPreview: '\\sqrt{x}',
          title: 'جذر تربيعي للمتغير x',
          isLtr: true,
        },
        { label: '√', insert: '√', title: 'رمز الجذر التربيعي', isLtr: true },
        { label: '∛', insert: '∛', title: 'رمز الجذر التكعيبي', isLtr: true },
        {
          label: 'x²',
          insert: '$x^{2}$',
          latexPreview: 'x^{2}',
          title: 'x تربيع',
          isLtr: true,
        },
        {
          label: 'x³',
          insert: '$x^{3}$',
          latexPreview: 'x^{3}',
          title: 'x تكعيب',
          isLtr: true,
        },
        {
          label: '5²',
          insert: '$5^{2}$',
          latexPreview: '5^{2}',
          title: 'أس تربيعي بالأرقام الإنجليزية',
          isLtr: true,
        },
        {
          label: '(5²)²',
          insert: '$(5^{2})^{2}$',
          latexPreview: '(5^{2})^{2}',
          title: 'أس على أس بالأرقام الإنجليزية',
          isLtr: true,
        },
        {
          label: '(x²)³',
          insert: '$(x^{2})^{3}$',
          latexPreview: '(x^{2})^{3}',
          title: 'متغير أس على أس بالأرقام الإنجليزية',
          isLtr: true,
        },
        {
          label: '5^{2^3}',
          insert: '$5^{2^{3}}$',
          latexPreview: '5^{2^{3}}',
          title: 'أس فوق أس بالأرقام الإنجليزية',
          isLtr: true,
        },
        { label: 'x² نصي', insert: 'x²', title: 'x تربيع نصي', isLtr: true },
        { label: '²', insert: '²', title: 'أس 2', isLtr: true },
        { label: '³', insert: '³', title: 'أس 3', isLtr: true },
        { label: 'ⁿ', insert: 'ⁿ', title: 'أس n', isLtr: true },
        { label: '^', insert: '^', title: 'علامة الأس', isLtr: true },
      ],
    },
    {
      title: 'الكسور والعمليات والمقارنة',
      items: [
        {
          label: '1/2',
          insert: '$\\frac{1}{2}$',
          latexPreview: '\\frac{1}{2}',
          title: 'كسر عمودي (نصف)',
          isLtr: true,
        },
        {
          label: '3/4',
          insert: '$\\frac{3}{4}$',
          latexPreview: '\\frac{3}{4}',
          title: 'كسر عمودي (ثلاثة أرباع)',
          isLtr: true,
        },
        {
          label: 'x/y',
          insert: '$\\frac{x}{y}$',
          latexPreview: '\\frac{x}{y}',
          title: 'كسر عمودي بالمتغيرات',
          isLtr: true,
        },
        { label: '½', insert: '½', title: 'نصف', isLtr: true },
        { label: '⅓', insert: '⅓', title: 'ثلث', isLtr: true },
        { label: '¼', insert: '¼', title: 'ربع', isLtr: true },
        { label: '¾', insert: '¾', title: 'ثلاثة أرباع', isLtr: true },
        {
          label: '()',
          insert: '()',
          caretOffset: 1,
          title: 'قوسان — يضع مؤشر الكتابة في الوسط',
          isLtr: true,
        },
        { label: '+', insert: ' + ', title: 'جمع' },
        { label: '−', insert: ' − ', title: 'طرح' },
        { label: '×', insert: ' × ', title: 'ضرب' },
        { label: '÷', insert: ' ÷ ', title: 'قسمة' },
        { label: '=', insert: ' = ', title: 'يساوي' },
        { label: '≠', insert: ' ≠ ', title: 'لا يساوي' },
        { label: '≈', insert: ' ≈ ', title: 'يساوي تقريباً' },
        { label: '<', insert: ' < ', title: 'أصغر من' },
        { label: '>', insert: ' > ', title: 'أكبر من' },
        { label: '≤', insert: ' ≤ ', title: 'أصغر أو يساوي' },
        { label: '≥', insert: ' ≥ ', title: 'أكبر أو يساوي' },
        { label: '±', insert: ' ± ', title: 'موجب أو سالب' },
      ],
    },
    {
      title: 'المجموعات والهندسة والمتغيرات',
      items: [
        {
          label: '|x|',
          insert: '$|x|$',
          latexPreview: '|x|',
          title: 'القيمة المطلقة',
          isLtr: true,
        },
        { label: '∈', insert: ' ∈ ', title: 'ينتمي إلى' },
        { label: '∉', insert: ' ∉ ', title: 'لا ينتمي إلى' },
        { label: '⊂', insert: ' ⊂ ', title: 'مجموعة جزئية' },
        { label: '∪', insert: ' ∪ ', title: 'اتحاد' },
        { label: '∩', insert: ' ∩ ', title: 'تقاطع' },
        { label: '∅', insert: '∅', title: 'المجموعة الخالية', isLtr: true },
        { label: '∠', insert: '∠', title: 'زاوية' },
        { label: '△', insert: '△', title: 'مثلث' },
        { label: '⊥', insert: ' ⊥ ', title: 'عمودي على' },
        { label: '//', insert: ' // ', title: 'يوازي' },
        { label: '≅', insert: ' ≅ ', title: 'يطابق' },
        { label: '°', insert: '°', title: 'درجة', isLtr: true },
        { label: 'π', insert: 'π', title: 'باي', isLtr: true },
        { label: 'x', insert: 'x', isLtr: true },
        { label: 'y', insert: 'y', isLtr: true },
        { label: 'z', insert: 'z', isLtr: true },
        { label: 'θ', insert: 'θ', isLtr: true },
        { label: 'α', insert: 'α', isLtr: true },
        { label: 'β', insert: 'β', isLtr: true },
        { label: 'Δ', insert: 'Δ', isLtr: true },
      ],
    },
    {
      title: 'المثلثات واللوغاريتم والتفاضل والتكامل',
      items: [
        {
          label: 'sin x',
          insert: '$\\sin(x)$',
          latexPreview: '\\sin(x)',
          title: 'دالة الجيب',
          isLtr: true,
        },
        {
          label: 'cos x',
          insert: '$\\cos(x)$',
          latexPreview: '\\cos(x)',
          title: 'دالة الجيب تمام',
          isLtr: true,
        },
        {
          label: 'tan x',
          insert: '$\\tan(x)$',
          latexPreview: '\\tan(x)',
          title: 'دالة الظل',
          isLtr: true,
        },
        {
          label: 'log₂(x)',
          insert: '$\\log_{2}(x)$',
          latexPreview: '\\log_{2}(x)',
          title: 'لوغاريتم',
          isLtr: true,
        },
        {
          label: 'ln(x)',
          insert: '$\\ln(x)$',
          latexPreview: '\\ln(x)',
          title: 'لوغاريتم طبيعي',
          isLtr: true,
        },
        {
          label: 'dy/dx',
          insert: '$\\frac{dy}{dx}$',
          latexPreview: '\\frac{dy}{dx}',
          title: 'المشتقة',
          isLtr: true,
        },
        { label: "f'(x)", insert: "f'(x)", title: 'المشتقة الأولى', isLtr: true },
        {
          label: 'lim',
          insert: '$\\lim_{x \\to 0}$',
          latexPreview: '\\lim_{x \\to 0}',
          title: 'الغاية',
          isLtr: true,
        },
        {
          label: '∫ x² dx',
          insert: '$\\int x^{2}\\,dx$',
          latexPreview: '\\int x^{2}\\,dx',
          title: 'تكامل غير محدد',
          isLtr: true,
        },
        {
          label: '∫₀⁵ dx',
          insert: '$\\int_{0}^{5}\\,dx$',
          latexPreview: '\\int_{0}^{5}\\,dx',
          title: 'تكامل محدد',
          isLtr: true,
        },
        { label: '∑', insert: '∑', title: 'مجموع', isLtr: true },
        { label: '∞', insert: '∞', title: 'لا نهاية', isLtr: true },
      ],
    },
  ];
}

function getQuickMathPhrases(useArabicDigits: boolean): string[] {
  if (useArabicDigits) {
    return [
      'جذر ٢٥',
      'الجذر التكعيبي ٨',
      'خمسة أس ٢',
      '(٥^٢)^٢',
      'س تربيع',
      'واحد على اثنين',
      'لوغاريتم س للأساس ٢',
      'تكامل من ٠ إلى ٥',
    ];
  }
  return [
    'جذر 25',
    'الجذر التكعيبي 8',
    'خمسة أس 2',
    '(5^2)^2',
    'x تربيع',
    'واحد على اثنين',
    'لوغاريتم x للأساس 2',
    'تكامل من 0 إلى 5',
  ];
}

export const MathSymbolsSidePanel: React.FC<MathSymbolsSidePanelProps> = ({
  isOpen,
  onClose,
  onInsertAtCursor,
  activeCursorLabel,
  isVoiceActive,
  useArabicDigits = true,
}) => {
  const [sandboxText, setSandboxText] = useState<string>('');

  const symbolGroups = useMemo(
    () => getIraqiSymbolGroups(useArabicDigits),
    [useArabicDigits]
  );

  const quickPhrases = useMemo(
    () => getQuickMathPhrases(useArabicDigits),
    [useArabicDigits]
  );

  if (!isOpen) return null;

  const handleInsertSandbox = () => {
    const trimmed = sandboxText.trim();
    if (!trimmed) return;
    onInsertAtCursor(trimmed, true);
    setSandboxText('');
    onClose();
  };

  return (
    <aside
      dir="rtl"
      className="fixed top-14 left-2 sm:left-4 bottom-20 sm:bottom-24 w-[300px] sm:w-[360px] z-[62] no-print bg-[#FAF7EC] border-2 border-[#BA916C] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-left-4 duration-150"
      aria-label="لوحة رموز الرياضيات والمحرر الذكي"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-[#2F2822] text-[#FAF6EC] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#BA916C]/25 border border-[#BA916C]/50 flex items-center justify-center shrink-0">
            <Sigma className="w-4 h-4 text-[#E8C59B]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                رموز الرياضيات العراقية
              </h4>
              <span className="px-1.5 py-0.5 rounded bg-[#BA916C]/30 text-[#E8C59B] text-[9px] font-bold shrink-0">
                {useArabicDigits ? '١ ٢ ٣' : '1 2 3'}
              </span>
            </div>
            <p className="text-[10px] text-[#D8CEBD] truncate">
              الإدراج عند: {activeCursorLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          className="p-1 text-[#D8CEBD] hover:text-white hover:bg-white/10 rounded-lg cursor-pointer shrink-0"
          aria-label="إغلاق لوحة الرياضيات"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {/* Quick Parentheses Shortcut (Places Caret Inside Middle) */}
        <div className="bg-white rounded-xl border border-[#D5C8B2] px-2.5 py-2 flex items-center justify-between gap-2 shadow-2xs">
          <span className="text-[11px] font-black text-[#2F2822]">
            أقواس سريعة:
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onInsertAtCursor('()', false, 1);
              onClose();
            }}
            title="إدراج قوسين () مع وضع مؤشر الكتابة في الوسط"
            className="px-3 py-1 bg-[#FAF3E8] hover:bg-[#E8D7C2] text-[#2F2822] border border-[#BA916C] rounded-lg text-xs font-black cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <bdi dir="ltr" className="text-sm leading-none">
              ()
            </bdi>
            <span className="text-[10px] font-bold text-[#6B5E51]">
              المؤشر بالوسط
            </span>
          </button>
        </div>

        {/* Smart Expression Builder / Sandbox */}
        <div className="bg-white rounded-xl border border-[#D5C8B2] p-2.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-black text-[#2F2822] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#8C6544]" />
              <span>محرر التعابير الذكي (تبديل فوري)</span>
            </span>
            {sandboxText && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSandboxText('')}
                className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>مسح</span>
              </button>
            )}
          </div>

          <div className="min-h-[48px] px-2 py-2 bg-[#FAF7EC] border border-[#C2A88F] rounded-lg flex items-center">
            <SmartMathField
              value={sandboxText}
              onChange={setSandboxText}
              useArabicDigits={useArabicDigits}
              textDir="rtl"
              isVoiceActive={isVoiceActive}
              placeholder={
                useArabicDigits
                  ? 'اكتب مثلاً: جذر ٢٥ أو س تربيع أو واحد على اثنين...'
                  : 'اكتب مثلاً: جذر 25 أو x تربيع أو واحد على اثنين...'
              }
              ariaLabel="محرر التعبير الرياضي"
              className="text-xs sm:text-sm font-bold text-[#2F2822]"
            />
          </div>

          {/* Quick-try spoken Arabic expressions */}
          <div className="flex flex-wrap items-center gap-1">
            {quickPhrases.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  setSandboxText((prev) => (prev ? `${prev} ${phrase}` : phrase))
                }
                className="px-1.5 py-0.5 bg-[#F4EDE0] hover:bg-[#E8D7C2] text-[#2F2822] border border-[#D5C8B2] rounded text-[10px] font-bold cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                setSandboxText((prev) =>
                  normalizeArabicMathSpeech(prev, useArabicDigits)
                )
              }
              disabled={!sandboxText.trim()}
              className="px-2 py-1 text-[10px] font-bold text-[#6B5E51] hover:text-[#2F2822] bg-[#FAF7EC] border border-[#D5C8B2] rounded-lg disabled:opacity-40 cursor-pointer"
              title="تحويل الكلمات الرقمية العربية إلى أرقام متوافقة مع الورقة"
            >
              توحيد الأرقام
            </button>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleInsertSandbox}
              disabled={!sandboxText.trim()}
              className="px-3 py-1 craft-btn-primary rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-45"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>إدراج في الورقة</span>
            </button>
          </div>
        </div>

        {/* Categorized Quick Math Symbols Palette */}
        {symbolGroups.map((group) => (
          <div
            key={group.title}
            className="bg-white rounded-xl border border-[#D5C8B2] p-2.5 space-y-2"
          >
            <h5 className="text-[11px] font-black text-[#6B5E51]">
              {group.title}
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <button
                  key={`${group.title}-${item.label}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onInsertAtCursor(item.insert, false, item.caretOffset);
                    onClose();
                  }}
                  title={item.title || item.label}
                  className="px-2 py-1 bg-[#FAF7EC] hover:bg-[#E8D7C2] text-[#2F2822] border border-[#D5C8B2] hover:border-[#BA916C] rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center"
                >
                  {item.latexPreview ? (
                    <KatexInline latex={item.latexPreview} className="text-[11px]" />
                  ) : (
                    <bdi dir={item.isLtr ? 'ltr' : 'rtl'}>{item.label}</bdi>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
