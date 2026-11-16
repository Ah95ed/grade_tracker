import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Copy,
  Check,
  Search
} from 'lucide-react';
import { ConsoleLog, WorkspaceFile, EditorSettings } from '../types/workspace';
import { t } from '../utils/translations';

interface BottomTerminalProps {
  logs: ConsoleLog[];
  files: WorkspaceFile[];
  settings: EditorSettings;
  isOpen: boolean;
  onToggleOpen: () => void;
  onClearLogs: () => void;
  onRunActiveCode: () => void;
  onCreateFile: (name: string, parentId: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onExportZip: () => void;
}

export const BottomTerminal: React.FC<BottomTerminalProps> = ({
  logs,
  files,
  settings,
  isOpen,
  onToggleOpen,
  onClearLogs,
  onRunActiveCode,
  onCreateFile,
  onDeleteFile,
  onExportZip,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'terminal'>('console');
  const [filterLevel, setFilterLevel] = useState<'all' | 'log' | 'warn' | 'error'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'CodeForge Studio CLI v2.0 - بيئة الأوامر التفاعلية',
    'Type "help" to see available terminal commands.',
  ]);
  const [commandInput, setCommandInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const labels = t[settings.language];

  // Auto-scroll on new log or terminal line
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'console') {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs, terminalHistory, isOpen, activeTab]);

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Save to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    const parts = cmd.split(' ');
    const action = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    const outputLines: string[] = [`codeforge@studio:~$ ${cmd}`];

    switch (action) {
      case 'help':
        outputLines.push(
          'Available commands:',
          '  help               - Show this list of commands',
          '  ls                 - List files in current project',
          '  cat <filename>     - Print content of a file',
          '  touch <filename>   - Create a new file',
          '  rm <filename>      - Remove a file',
          '  run                - Execute active code / preview',
          '  zip / export       - Export project as ZIP',
          '  stats              - Display project statistics',
          '  clear              - Clear terminal window',
          '  echo <text>        - Print text to screen'
        );
        break;

      case 'ls': {
        const fileNames = files.map(f => (f.isFolder ? `📁 ${f.name}/` : `📄 ${f.name}`));
        outputLines.push(...fileNames);
        break;
      }

      case 'cat': {
        if (!arg) {
          outputLines.push('Usage: cat <filename>');
        } else {
          const target = files.find(f => f.name.toLowerCase() === arg.toLowerCase());
          if (target) {
            outputLines.push(target.content || '(empty file)');
          } else {
            outputLines.push(`cat: ${arg}: No such file`);
          }
        }
        break;
      }

      case 'touch':
      case 'new': {
        if (!arg) {
          outputLines.push('Usage: touch <filename>');
        } else {
          onCreateFile(arg, null);
          outputLines.push(`Created file: ${arg}`);
        }
        break;
      }

      case 'rm': {
        if (!arg) {
          outputLines.push('Usage: rm <filename>');
        } else {
          const target = files.find(f => f.name.toLowerCase() === arg.toLowerCase());
          if (target) {
            onDeleteFile(target.id);
            outputLines.push(`Removed: ${arg}`);
          } else {
            outputLines.push(`rm: cannot remove '${arg}': No such file`);
          }
        }
        break;
      }

      case 'run':
        onRunActiveCode();
        outputLines.push('🚀 Executing code...');
        break;

      case 'zip':
      case 'export':
        onExportZip();
        outputLines.push('📦 Packaging project into ZIP download...');
        break;

      case 'stats': {
        const nonFolder = files.filter(f => !f.isFolder);
        const totalChars = nonFolder.reduce((a, b) => a + (b.content?.length || 0), 0);
        outputLines.push(
          `Project Files: ${nonFolder.length}`,
          `Total Size: ${totalChars} characters`,
          `Folders: ${files.filter(f => f.isFolder).length}`
        );
        break;
      }

      case 'clear':
        setTerminalHistory([]);
        setCommandInput('');
        return;

      case 'echo':
        outputLines.push(arg);
        break;

      default:
        outputLines.push(`bash: ${action}: command not found. Type "help" for command list.`);
    }

    setTerminalHistory(prev => [...prev, ...outputLines]);
    setCommandInput('');
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.type !== filterLevel) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      className={`border-t border-slate-800 bg-slate-950 flex flex-col shrink-0 select-none transition-all duration-200 ${
        isOpen ? 'h-52' : 'h-8'
      }`}
    >
      {/* Terminal Drawer Header Bar */}
      <div className="h-8 bg-slate-950 px-3 flex items-center justify-between text-xs text-slate-400 select-none border-b border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('console');
                if (!isOpen) onToggleOpen();
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'console' && isOpen
                  ? 'bg-slate-800 text-sky-400'
                  : 'hover:text-slate-200'
              }`}
            >
              <span>{labels.console}</span>
              {logs.length > 0 && (
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300 font-mono">
                  {logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('terminal');
                if (!isOpen) onToggleOpen();
              }}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'terminal' && isOpen
                  ? 'bg-slate-800 text-sky-400'
                  : 'hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{labels.terminal}</span>
            </button>
          </div>

          {/* Console filters (when Console tab is active) */}
          {isOpen && activeTab === 'console' && (
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="text-slate-600">|</span>
              <button
                onClick={() => setFilterLevel('all')}
                className={`hover:text-white ${filterLevel === 'all' ? 'text-sky-400 font-bold' : ''}`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilterLevel('error')}
                className={`hover:text-rose-400 flex items-center gap-0.5 ${filterLevel === 'error' ? 'text-rose-400 font-bold' : ''}`}
              >
                <XCircle className="w-3 h-3 text-rose-500" />
                <span>{logs.filter(l => l.type === 'error').length}</span>
              </button>
              <button
                onClick={() => setFilterLevel('warn')}
                className={`hover:text-amber-400 flex items-center gap-0.5 ${filterLevel === 'warn' ? 'text-amber-400 font-bold' : ''}`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>{logs.filter(l => l.type === 'warn').length}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          {isOpen && activeTab === 'console' && (
            <>
              <div className="hidden md:flex items-center bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-[11px]">
                <Search className="w-3 h-3 text-slate-500 me-1" />
                <input
                  type="text"
                  placeholder="فلترة المخرجات..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-transparent text-white outline-none text-[11px] w-24"
                />
              </div>

              <button
                onClick={handleCopyLogs}
                title="نسخ المخرجات"
                className="p-1 hover:text-white text-slate-400 rounded"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>

              <button
                onClick={onClearLogs}
                title={labels.clear}
                className="p-1 hover:text-rose-400 text-slate-400 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}

          <button
            onClick={onToggleOpen}
            title={isOpen ? 'تصغير' : 'تكبير'}
            className="p-1 hover:text-white text-slate-400 rounded"
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      {isOpen && (
        <div className="flex-1 bg-slate-950 overflow-y-auto p-2 font-code text-xs" dir="ltr">
          {activeTab === 'console' ? (
            <div className="flex flex-col gap-1 min-h-full">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 text-xs py-4 text-center">
                  الكونسول فارغ. قم بتشغيل الكود لرؤية المخرجات والأخطاء مباشرة.
                </div>
              ) : (
                filteredLogs.map(log => {
                  let badgeColor = 'text-slate-400';
                  let Icon = Info;
                  if (log.type === 'error') {
                    badgeColor = 'text-rose-400 bg-rose-500/10 border border-rose-500/20';
                    Icon = XCircle;
                  } else if (log.type === 'warn') {
                    badgeColor = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
                    Icon = AlertTriangle;
                  } else if (log.type === 'system') {
                    badgeColor = 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
                  }

                  return (
                    <div
                      key={log.id}
                      className={`flex items-start gap-2 py-1 px-1.5 rounded transition-colors ${
                        log.type === 'error'
                          ? 'bg-rose-950/20 text-rose-200'
                          : log.type === 'warn'
                          ? 'bg-amber-950/20 text-amber-200'
                          : 'text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <span className="text-[10px] text-slate-600 shrink-0 font-mono">
                        {log.timestamp}
                      </span>
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${badgeColor}`} />
                      <pre className="whitespace-pre-wrap break-all flex-1 font-code text-[12px] m-0">
                        {log.message}
                      </pre>
                    </div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>
          ) : (
            /* Interactive Shell Terminal */
            <div className="flex flex-col gap-1 min-h-full">
              {terminalHistory.map((line, idx) => (
                <div
                  key={idx}
                  className={`whitespace-pre-wrap ${
                    line.startsWith('codeforge@')
                      ? 'text-sky-400 font-semibold'
                      : line.includes('error') || line.includes('No such')
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {line}
                </div>
              ))}

              <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-1">
                <span className="text-emerald-400 font-semibold shrink-0">codeforge@studio:~$</span>
                <input
                  type="text"
                  autoFocus
                  value={commandInput}
                  onChange={e => setCommandInput(e.target.value)}
                  className="flex-1 bg-transparent text-white outline-none font-code text-xs"
                />
              </form>
              <div ref={terminalEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
