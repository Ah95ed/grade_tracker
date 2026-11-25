import React, { useState } from 'react';
import { X, Code2, Plus, Copy, Check } from 'lucide-react';
import { CODE_SNIPPETS } from '../utils/defaultProjects';
import { EditorSettings } from '../types/workspace';
import { t } from '../utils/translations';

interface SnippetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet: (code: string) => void;
  onCreateFileWithSnippet: (fileName: string, code: string) => void;
  settings: EditorSettings;
}

export const SnippetLibraryModal: React.FC<SnippetLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
  onCreateFileWithSnippet,
  settings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const labels = t[settings.language];

  if (!isOpen) return null;

  const filtered = selectedCategory === 'all'
    ? CODE_SNIPPETS
    : CODE_SNIPPETS.filter(s => s.category === selectedCategory);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">المقتطفات البرمجية الجاهزة (Code Snippets)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 py-2 gap-2 text-xs overflow-x-auto">
          {['all', 'web', 'utils', 'algorithm', 'python'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-sky-500/20 text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'all'
                ? 'الكل'
                : cat === 'web'
                ? 'Web & APIs'
                : cat === 'utils'
                ? 'Utilities'
                : cat === 'algorithm'
                ? 'خوارزميات'
                : 'Python'}
            </button>
          ))}
        </div>

        {/* Body Snippet List */}
        <div className="p-5 overflow-y-auto space-y-4">
          {filtered.map(snippet => (
            <div
              key={snippet.id}
              className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    {settings.language === 'ar' ? snippet.titleAr : snippet.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{snippet.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(snippet.id, snippet.code)}
                    title={labels.copySnippet}
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs flex items-center gap-1 transition-colors"
                  >
                    {copiedId === snippet.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => {
                      onInsertSnippet(snippet.code);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-sky-400 hover:bg-sky-300 text-slate-950 font-medium rounded text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{labels.insertSnippet}</span>
                  </button>
                </div>
              </div>

              {/* Code preview block */}
              <pre
                className="bg-slate-900/90 p-3 rounded border border-slate-800 text-slate-300 font-code text-xs overflow-x-auto max-h-36"
                dir="ltr"
              >
                <code>{snippet.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
