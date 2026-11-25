import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  FileCode, 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import { WorkspaceFile, EditorSettings } from '../types/workspace';
import { formatCodeContent, downloadSingleFile } from '../utils/fileSystem';
import { t } from '../utils/translations';

interface EditorAreaProps {
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  openFileIds: string[];
  settings: EditorSettings;
  onSelectTab: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onChangeContent: (fileId: string, content: string) => void;
  onRun: () => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  files,
  activeFile,
  openFileIds,
  settings,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onRun,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const labels = t[settings.language];

  // Sync scroll between textarea, syntax highlight pre, and line numbers
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = top;
    }
  };

  // Track cursor position
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const textBefore = (activeFile?.content || '').substring(0, pos);
    const lines = textBefore.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  // Keyboard shortcuts handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S: prevent browser save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // Auto-saved already
      return;
    }

    // Ctrl+F / Cmd+F: search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setShowSearch(prev => !prev);
      return;
    }

    // Ctrl+Enter: run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }

    // Tab key indent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!textareaRef.current || !activeFile) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const spaces = ' '.repeat(settings.tabSize || 2);

      const newContent =
        activeFile.content.substring(0, start) +
        spaces +
        activeFile.content.substring(end);

      onChangeContent(activeFile.id, newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
            start + spaces.length;
        }
      }, 0);
    }
  };

  // Format code action
  const handleFormat = () => {
    if (!activeFile) return;
    const formatted = formatCodeContent(activeFile.content, activeFile.language);
    onChangeContent(activeFile.id, formatted);
  };

  // Copy code action
  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Search & Replace actions
  const handleReplaceAll = () => {
    if (!activeFile || !searchQuery) return;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const newContent = activeFile.content.replace(regex, replaceQuery);
    onChangeContent(activeFile.id, newContent);
  };

  // Syntax highlighting computation
  const getHighlightedHtml = () => {
    if (!activeFile) return '';
    const lang = activeFile.language;
    const prismLang = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.plain;
    try {
      return Prism.highlight(activeFile.content || '', prismLang, lang);
    } catch {
      return activeFile.content || '';
    }
  };

  const lineCount = (activeFile?.content || '').split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  // Open tabs list
  const openFiles = openFileIds
    .map(id => files.find(f => f.id === id))
    .filter((f): f is WorkspaceFile => Boolean(f));

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 text-slate-500 p-8 text-center select-none">
        <FileCode className="w-12 h-12 text-slate-700 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300 mb-1">{labels.appTitle}</h3>
        <p className="text-xs max-w-sm mb-4 leading-relaxed">{labels.noOpenFiles}</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-slate-950 overflow-hidden relative ${
      isEditorFullscreen ? 'fixed inset-0 z-50' : ''
    }`}>
      {/* 1. Multi-Tab Header Bar */}
      <div className="h-9 bg-slate-950 border-b border-slate-800 flex items-center overflow-x-auto select-none no-scrollbar shrink-0">
        <div className="flex items-center h-full">
          {openFiles.map(file => {
            const isActive = file.id === activeFile.id;
            return (
              <div
                key={file.id}
                onClick={() => onSelectTab(file.id)}
                className={`group h-full px-3 flex items-center gap-2 text-xs border-r border-slate-800 cursor-pointer transition-colors max-w-[180px] shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-sky-400 font-medium border-t-2 border-t-sky-400'
                    : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <span className="truncate font-code text-[12px]">{file.name}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseTab(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Secondary Context / Toolbar Row */}
      <div className="h-8 bg-slate-950/80 px-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 font-code text-[11px] text-slate-400 truncate">
          <span>workspace</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="text-slate-200 font-medium">{activeFile.name}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title={labels.findReplace + ' (Ctrl+F)'}
            className={`p-1 rounded hover:text-white transition-colors ${showSearch ? 'text-sky-400 bg-slate-800' : ''}`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFormat}
            title={labels.formatCode}
            className="p-1 rounded hover:text-sky-400 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            title={copied ? labels.snippetCopied : labels.copySnippet}
            className="p-1 rounded hover:text-sky-400 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => downloadSingleFile(activeFile)}
            title={labels.downloadFile}
            className="p-1 rounded hover:text-sky-400 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsEditorFullscreen(!isEditorFullscreen)}
            title="ملء الشاشة"
            className="p-1 rounded hover:text-white transition-colors"
          >
            {isEditorFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 3. Search and Replace Drawer */}
      {showSearch && (
        <div className="p-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={labels.find}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-white outline-none text-xs w-36 font-code"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-700">
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={labels.replace}
              value={replaceQuery}
              onChange={e => setReplaceQuery(e.target.value)}
              className="bg-transparent text-white outline-none text-xs w-36 font-code"
            />
          </div>

          <button
            onClick={handleReplaceAll}
            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded text-xs transition-colors"
          >
            {labels.replaceAll}
          </button>

          <button
            onClick={() => setShowSearch(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Main Code Editor Container */}
      <div className="flex-1 relative flex overflow-hidden font-code" dir="ltr">
        {/* Line Numbers Column */}
        {settings.lineNumbers && (
          <div
            ref={lineNumbersRef}
            className="w-12 bg-slate-950/90 py-3 text-right pr-3 select-none text-slate-600 border-r border-slate-800/80 overflow-hidden font-code text-[13px] leading-[21px]"
          >
            {lineNumbers.map(num => (
              <div key={num} className={num === cursorPos.line ? 'text-sky-400 font-bold' : ''}>
                {num}
              </div>
            ))}
          </div>
        )}

        {/* Editor Body */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Syntax Highlighted Render (Behind) */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 pointer-events-none overflow-hidden font-code text-[13px] leading-[21px] whitespace-pre"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: `${settings.fontSize * 1.5}px`,
              tabSize: settings.tabSize,
            }}
            dangerouslySetInnerHTML={{ __html: getHighlightedHtml() + '\n' }}
          />

          {/* Interactive Transparent Textarea (Front) */}
          <textarea
            ref={textareaRef}
            value={activeFile.content}
            onChange={e => {
              onChangeContent(activeFile.id, e.target.value);
              updateCursorPosition();
            }}
            onScroll={handleScroll}
            onSelect={updateCursorPosition}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap={settings.wordWrap ? 'on' : 'off'}
            className="code-editor-textarea absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent resize-none outline-none font-code text-[13px] leading-[21px] whitespace-pre overflow-auto"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: `${settings.fontSize * 1.5}px`,
              tabSize: settings.tabSize,
            }}
          />
        </div>
      </div>

      {/* 5. Bottom Status Bar */}
      <div className="h-6 bg-slate-950 border-t border-slate-800/90 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0" dir="ltr">
        <div className="flex items-center gap-4">
          <span className="font-code">
            {labels.line} {cursorPos.line}, {labels.column} {cursorPos.col}
          </span>
          <span className="text-slate-600">·</span>
          <span>
            {lineCount} {labels.lines} ({activeFile.content.length} {labels.characters})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="uppercase font-code text-sky-400">{activeFile.language}</span>
          <span className="text-slate-600">·</span>
          <span>Spaces: {settings.tabSize}</span>
          <span className="text-slate-600">·</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};
