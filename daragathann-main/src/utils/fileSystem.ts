import JSZip from 'jszip';
import { WorkspaceFile } from '../types/workspace';

export function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'css';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'jsx';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'tsx';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'txt':
      return 'text';
    case 'svg':
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function sortFiles(files: WorkspaceFile[]): WorkspaceFile[] {
  return [...files].sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function buildFullPath(files: WorkspaceFile[], file: WorkspaceFile): string {
  if (!file.parentId) {
    return '/' + file.name;
  }
  const parent = files.find(f => f.id === file.parentId);
  if (!parent) return '/' + file.name;
  return buildFullPath(files, parent) + '/' + file.name;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Exports project files into a downloadable ZIP archive
 */
export async function exportProjectToZip(files: WorkspaceFile[], projectName: string): Promise<void> {
  const zip = new JSZip();

  // Mapping from folder id to folder zip instance
  const folderMap = new Map<string, JSZip>();

  // Helper to ensure folder path in zip
  function getZipFolder(folderId: string | null): JSZip {
    if (!folderId) return zip;
    if (folderMap.has(folderId)) return folderMap.get(folderId)!;

    const folder = files.find(f => f.id === folderId);
    if (!folder) return zip;

    const parentZip = getZipFolder(folder.parentId);
    const subZip = parentZip.folder(folder.name) || parentZip;
    folderMap.set(folderId, subZip);
    return subZip;
  }

  // First create folders
  files.filter(f => f.isFolder).forEach(f => {
    getZipFolder(f.id);
  });

  // Then populate files
  files.filter(f => !f.isFolder).forEach(f => {
    const targetZip = getZipFolder(f.parentId);
    targetZip.file(f.name, f.content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const safeName = projectName.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_') || 'code_project';
  a.download = `${safeName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Downloads a single file directly
 */
export function downloadSingleFile(file: WorkspaceFile): void {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Reads a user-uploaded ZIP file and extracts it into WorkspaceFile array
 */
export async function importFromZip(file: File): Promise<WorkspaceFile[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const extractedFiles: WorkspaceFile[] = [];
  const folderPaths = new Map<string, string>(); // path string -> id

  const entries: { path: string; isDir: boolean; zipEntry: JSZip.JSZipObject }[] = [];
  loadedZip.forEach((relativePath, zipEntry) => {
    // Ignore OS junk like __MACOSX or .DS_Store
    if (relativePath.startsWith('__MACOSX') || relativePath.includes('.DS_Store')) return;
    entries.push({
      path: relativePath.replace(/\/$/, ''),
      isDir: zipEntry.dir,
      zipEntry,
    });
  });

  // Sort so folders are processed top to bottom
  entries.sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  for (const entry of entries) {
    const parts = entry.path.split('/');
    const name = parts[parts.length - 1];
    if (!name) continue;

    const parentPath = parts.slice(0, -1).join('/');
    const parentId = parentPath ? folderPaths.get(parentPath) || null : null;
    const id = 'file_' + Math.random().toString(36).substring(2, 9);

    if (entry.isDir) {
      folderPaths.set(entry.path, id);
      extractedFiles.push({
        id,
        name,
        path: '/' + entry.path,
        content: '',
        isFolder: true,
        parentId,
        isOpen: true,
        language: 'folder',
        updatedAt: Date.now(),
      });
    } else {
      let content = '';
      try {
        content = await entry.zipEntry.async('string');
      } catch {
        content = '// Binary or unreadable content';
      }

      extractedFiles.push({
        id,
        name,
        path: '/' + entry.path,
        content,
        isFolder: false,
        parentId,
        language: detectLanguage(name),
        updatedAt: Date.now(),
      });
    }
  }

  return extractedFiles;
}

/**
 * Pretty formats code content based on language
 */
export function formatCodeContent(code: string, language: string): string {
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return code;
    }
  }

  // Basic indentation prettifier for HTML/JS/CSS
  try {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      // Decrease indent for closing tokens
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith('</') || trimmed === ')') {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indented = '  '.repeat(indentLevel) + trimmed;

      // Increase indent for opening tokens
      if (
        (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(') ||
         (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</'))) &&
        !trimmed.endsWith(';')
      ) {
        indentLevel++;
      }

      return indented;
    });

    return formatted.join('\n');
  } catch {
    return code;
  }
}
