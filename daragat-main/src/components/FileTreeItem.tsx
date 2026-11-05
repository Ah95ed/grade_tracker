import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  Trash2, 
  Download, 
  Edit2, 
  Copy,
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { WorkspaceFile } from '../types/workspace';

interface FileTreeItemProps {
  file: WorkspaceFile;
  level: number;
  isActive: boolean;
  onSelect: (file: WorkspaceFile) => void;
  onToggleFolder: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onDuplicate: (file: WorkspaceFile) => void;
  onDownload: (file: WorkspaceFile) => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  file,
  level,
  isActive,
  onSelect,
  onToggleFolder,
  onRename,
  onDelete,
  onDuplicate,
  onDownload,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim() && editName !== file.name) {
      onRename(file.id, editName.trim());
    }
    setIsEditing(false);
  };

  const getFileIcon = () => {
    if (file.isFolder) {
      return file.isOpen ? (
        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
      case 'css':
      case 'scss':
        return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
      case 'js':
      case 'jsx':
        return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
      case 'ts':
      case 'tsx':
        return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'py':
        return <FileCode className="w-4 h-4 text-green-400 shrink-0" />;
      case 'md':
        return <FileText className="w-4 h-4 text-slate-300 shrink-0" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div
      style={{ paddingInlineStart: `${level * 14 + 8}px` }}
      className={`group relative flex items-center justify-between py-1.5 px-2 text-xs cursor-pointer select-none transition-colors ${
        isActive
          ? 'bg-sky-500/15 text-sky-300 font-medium'
          : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
      }`}
      onClick={() => {
        if (file.isFolder) {
          onToggleFolder(file.id);
        } else {
          onSelect(file);
        }
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {file.isFolder ? (
          <span className="text-slate-500 hover:text-slate-300">
            {file.isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            )}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {getFileIcon()}

        {isEditing ? (
          <form onSubmit={handleRenameSubmit} className="flex-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => {
                if (e.key === 'Escape') setIsEditing(false);
              }}
              className="w-full bg-slate-900 border border-sky-500 text-white px-1.5 py-0.5 rounded text-xs outline-none"
            />
          </form>
        ) : (
          <span className="truncate text-left font-code text-[12.5px]">{file.name}</span>
        )}
      </div>

      {/* Hover action buttons */}
      {!isEditing && (
        <div
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-slate-400 hover:text-slate-200 shrink-0 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          {!file.isFolder && (
            <button
              onClick={() => onDownload(file)}
              title="تحميل الملف (Download)"
              className="p-1 hover:text-sky-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {!file.isFolder && (
            <button
              onClick={() => onDuplicate(file)}
              title="تكرار (Duplicate)"
              className="p-1 hover:text-sky-400 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsEditing(true)}
            title="إعادة تسمية (Rename)"
            className="p-1 hover:text-amber-400 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(file.id)}
            title="حذف (Delete)"
            className="p-1 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
