import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Archive, 
  FolderUp, 
  FileCode, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { EditorSettings } from '../types/workspace';
import { t } from '../utils/translations';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onZipSelected: (file: File) => void;
  onRawCodeSubmit: (fileName: string, code: string) => void;
  settings: EditorSettings;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onFilesSelected,
  onZipSelected,
  onRawCodeSubmit,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteFileName, setPasteFileName] = useState('script.js');
  const [pasteContent, setPasteContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const labels = t[settings.language];

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = e.dataTransfer.files;
      const firstFile = fileList[0];

      if (firstFile.name.endsWith('.zip')) {
        onZipSelected(firstFile);
        setStatusMessage(`تم استخراج أرشيف ZIP (${firstFile.name}) بنجاح!`);
        setTimeout(() => onClose(), 800);
      } else {
        onFilesSelected(fileList);
        setStatusMessage(`تم رفع ${fileList.length} ملفات بنجاح!`);
        setTimeout(() => onClose(), 800);
      }
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteFileName.trim() || !pasteContent.trim()) return;
    onRawCodeSubmit(pasteFileName.trim(), pasteContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">رفع الأكواد والمشاريع البرمجية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2 gap-4 text-xs">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'upload'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            رفع ملفات أو مجلد أو ZIP
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              activeTab === 'paste'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            لصق كود برمجي مباشر
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5">
          {statusMessage && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? 'border-sky-400 bg-sky-950/30 text-sky-300'
                    : 'border-slate-700 bg-slate-950/50 hover:border-slate-500 text-slate-400'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-sky-400" />
                <p className="text-xs font-semibold text-slate-200 mb-1">
                  اسحب وأفلت ملفاتك البرمجية أو أرشيف ZIP هنا
                </p>
                <p className="text-[11px] text-slate-500">
                  يدعم جميع اللغات: JS, TS, HTML, CSS, Python, JSON, Markdown وغيرها
                </p>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all text-center gap-1.5 cursor-pointer"
                >
                  <FileCode className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-medium text-slate-200">ملفات متعددة</span>
                  <span className="text-[10px] text-slate-500">.js, .py, .html</span>
                </button>

                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-center gap-1.5 cursor-pointer"
                >
                  <FolderUp className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-medium text-slate-200">مجلد كامل</span>
                  <span className="text-[10px] text-slate-500">Directory upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => zipInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-center gap-1.5 cursor-pointer"
                >
                  <Archive className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-medium text-slate-200">أرشيف ZIP</span>
                  <span className="text-[10px] text-slate-500">استخراج تلقائي</span>
                </button>
              </div>
            </div>
          ) : (
            /* Direct code paste form */
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">اسم الملف المراد إنشاؤه:</label>
                <input
                  type="text"
                  value={pasteFileName}
                  onChange={e => setPasteFileName(e.target.value)}
                  placeholder="مثال: app.js أو styles.css أو test.py"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500 font-code"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">الكود البرمجي:</label>
                <textarea
                  value={pasteContent}
                  onChange={e => setPasteContent(e.target.value)}
                  rows={8}
                  placeholder="// الصق كودك البرمجي هنا..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white outline-none focus:border-sky-500 font-code resize-none"
                  dir="ltr"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-md"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!pasteFileName.trim() || !pasteContent.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-md disabled:opacity-50 transition-colors"
                >
                  حفظ وإدراج الملف
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(e.target.files);
              setStatusMessage(`تم رفع ${e.target.files.length} ملفات بنجاح!`);
              setTimeout(() => onClose(), 800);
            }
          }}
        />

        <input
          type="file"
          ref={folderInputRef}
          // @ts-ignore
          webkitdirectory=""
          // @ts-ignore
          directory=""
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(e.target.files);
              setStatusMessage(`تم رفع المجلد (${e.target.files.length} ملفات) بنجاح!`);
              setTimeout(() => onClose(), 800);
            }
          }}
        />

        <input
          type="file"
          ref={zipInputRef}
          accept=".zip"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              onZipSelected(e.target.files[0]);
              setStatusMessage(`تم استخراج أرشيف ZIP بنجاح!`);
              setTimeout(() => onClose(), 800);
            }
          }}
        />
      </div>
    </div>
  );
};
