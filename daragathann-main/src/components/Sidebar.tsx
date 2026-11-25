import React, { useState, useRef } from 'react';
import { 
  FilePlus, 
  FolderPlus, 
  Upload, 
  Archive, 
  ChevronDown, 
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import { WorkspaceFile, EditorSettings } from '../types/workspace';
import { FileTreeItem } from './FileTreeItem';
import { sortFiles, formatFileSize } from '../utils/fileSystem';
import { t } from '../utils/translations';

interface SidebarProps {
  files: WorkspaceFile[];
  activeFileId: string | null;
  settings: EditorSettings;
  onSelectFile: (file: WorkspaceFile) => void;
  onCreateFile: (name: string, parentId: string | null) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDuplicateFile: (file: WorkspaceFile) => void;
  onDownloadFile: (file: WorkspaceFile) => void;
  onTriggerUploadModal: () => void;
  onFilesDropped: (files: FileList) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activeFileId,
  settings,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
  onDownloadFile,
  onTriggerUploadModal,
  onFilesDropped,
}) => {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const labels = t[settings.language];

  // Calculate stats
  const nonFolderFiles = files.filter(f => !f.isFolder);
  const totalBytes = nonFolderFiles.reduce((acc, f) => acc + (f.content?.length || 0), 0);

  const handleToggleFolder = (folderId: string) => {
    const target = files.find(f => f.id === folderId);
    if (target) {
      target.isOpen = !target.isOpen;
      // Trigger re-render
      onRenameFile(folderId, target.name);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }

    if (isCreatingFile) {
      onCreateFile(newItemName.trim(), null);
    } else if (isCreatingFolder) {
      onCreateFolder(newItemName.trim(), null);
    }

    setNewItemName('');
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesDropped(e.dataTransfer.files);
    }
  };

  // Recursive renderer for files
  const renderTree = (parentId: string | null = null, level: number = 0): React.ReactNode => {
    const currentLevelFiles = sortFiles(files.filter(f => f.parentId === parentId));
    if (currentLevelFiles.length === 0) return null;

    return currentLevelFiles.map(file => (
      <React.Fragment key={file.id}>
        <FileTreeItem
          file={file}
          level={level}
          isActive={activeFileId === file.id}
          onSelect={onSelectFile}
          onToggleFolder={handleToggleFolder}
          onRename={onRenameFile}
          onDelete={onDeleteFile}
          onDuplicate={onDuplicateFile}
          onDownload={onDownloadFile}
        />
        {file.isFolder && file.isOpen && renderTree(file.id, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <aside
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-64 bg-slate-950 border-e border-slate-800 flex flex-col h-full shrink-0 relative select-none transition-colors ${
        isDragOver ? 'ring-2 ring-sky-400/80 bg-sky-950/20' : ''
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>{labels.explorer}</span>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => {
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
              setNewItemName('');
            }}
            title={labels.newFile}
            className="p-1 hover:text-sky-400 hover:bg-slate-900 rounded transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
              setNewItemName('');
            }}
            title={labels.newFolder}
            className="p-1 hover:text-amber-400 hover:bg-slate-900 rounded transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTriggerUploadModal}
            title={labels.uploadFiles}
            className="p-1 hover:text-emerald-400 hover:bg-slate-900 rounded transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline input for new file or folder */}
      {(isCreatingFile || isCreatingFolder) && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-1.5">
            {isCreatingFile ? (
              <FilePlus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            ) : (
              <FolderPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              placeholder={isCreatingFile ? labels.fileNamePlaceholder : labels.folderNamePlaceholder}
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                }
              }}
              className="w-full bg-slate-950 border border-sky-500 text-white px-2 py-1 rounded text-xs outline-none"
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>Enter للإنشاء</span>
            <span>Esc للإلغاء</span>
          </div>
        </form>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 flex flex-col items-center justify-center h-48 gap-2">
            <FolderOpen className="w-8 h-8 text-slate-700" />
            <p>{labels.emptyProjectWarn}</p>
            <button
              onClick={onTriggerUploadModal}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded text-xs transition-colors"
            >
              {labels.uploadFiles}
            </button>
          </div>
        ) : (
          renderTree(null, 0)
        )}
      </div>

      {/* Drag & drop helper banner at bottom */}
      <div className="p-2 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
        <span>{nonFolderFiles.length} {labels.files}</span>
        <span className="font-mono text-slate-400">{formatFileSize(totalBytes)}</span>
      </div>

      {isDragOver && (
        <div className="absolute inset-0 bg-sky-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
          <Archive className="w-10 h-10 text-sky-400 mb-2 animate-bounce" />
          <p className="text-xs font-semibold text-white">{labels.dragDropHere}</p>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        onChange={e => {
          if (e.target.files) onFilesDropped(e.target.files);
        }}
      />
    </aside>
  );
};
