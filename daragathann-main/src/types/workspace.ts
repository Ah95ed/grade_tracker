export interface WorkspaceFile {
  id: string;
  name: string;
  path: string; // e.g. "/index.html" or "/src/app.js"
  content: string;
  isFolder: boolean;
  parentId: string | null;
  isOpen?: boolean;
  language: string;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  templateType: 'web' | 'react' | 'python' | 'markdown' | 'empty' | 'custom';
  files: WorkspaceFile[];
  activeFileId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface OpenTab {
  fileId: string;
  isDirty: boolean;
}

export interface ConsoleLog {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'system';
  message: string;
  timestamp: string;
  data?: any;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoRunPreview: boolean;
  language: 'ar' | 'en';
  theme: 'dark' | 'midnight';
}

export interface CodeSnippet {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  language: string;
  code: string;
  category: 'web' | 'react' | 'python' | 'algorithm' | 'utils';
}
