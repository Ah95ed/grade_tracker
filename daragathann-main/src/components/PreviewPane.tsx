import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ExternalLink, 
  Eye, 
  FileText 
} from 'lucide-react';
import { WorkspaceFile, EditorSettings } from '../types/workspace';
import { buildPreviewDocument } from '../utils/codeRunner';
import { t } from '../utils/translations';

interface PreviewPaneProps {
  files: WorkspaceFile[];
  activeFile: WorkspaceFile | null;
  settings: EditorSettings;
  onReceiveIframeConsole: (level: string, message: string) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  files,
  activeFile,
  settings,
  onReceiveIframeConsole,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const labels = t[settings.language];
  const isMarkdown = activeFile && activeFile.language === 'markdown';

  // Listen for console messages from the preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'IFRAME_CONSOLE') {
        onReceiveIframeConsole(event.data.level, event.data.message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReceiveIframeConsole]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const doc = buildPreviewDocument(files);

  const getViewportWidth = () => {
    switch (viewport) {
      case 'tablet':
        return '768px';
      case 'mobile':
        return '375px';
      default:
        return '100%';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 border-s border-slate-800 overflow-hidden h-full">
      {/* Preview Header */}
      <div className="h-9 bg-slate-950 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-300 select-none shrink-0">
        <div className="flex items-center gap-2 font-medium">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <span>{labels.preview}</span>
        </div>

        {/* Viewport size buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setViewport('desktop')}
            title="Desktop (100%)"
            className={`p-1 rounded transition-colors ${viewport === 'desktop' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            title="Tablet (768px)"
            className={`p-1 rounded transition-colors ${viewport === 'tablet' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            title="Mobile (375px)"
            className={`p-1 rounded transition-colors ${viewport === 'mobile' ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            title={labels.refreshPreview}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 bg-slate-950/60 p-2 flex items-center justify-center overflow-auto">
        {isMarkdown ? (
          <div className="w-full h-full bg-slate-900 p-6 overflow-y-auto rounded border border-slate-800 prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed" dir="auto">
            <div className="flex items-center gap-2 text-xs text-sky-400 mb-4 pb-2 border-b border-slate-800">
              <FileText className="w-4 h-4" />
              <span>معاينة مستند Markdown</span>
            </div>
            <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 m-0 text-slate-200">
              {activeFile.content}
            </pre>
          </div>
        ) : (
          <div
            className="h-full bg-white transition-all shadow-xl rounded overflow-hidden"
            style={{ width: getViewportWidth() }}
          >
            <iframe
              key={refreshKey}
              ref={iframeRef}
              title="Live Preview"
              srcDoc={doc}
              sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
};
