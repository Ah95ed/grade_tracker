import React, { useState } from 'react';
import { 
  X, 
  FolderGit2, 
  Plus, 
  Trash2, 
  Check, 
  Globe, 
  Terminal, 
  Atom, 
  FileBox 
} from 'lucide-react';
import { Project, EditorSettings } from '../types/workspace';
import { t } from '../utils/translations';
import { formatIraqDate } from '../utils/dateUtils';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, template: 'empty' | 'web' | 'python' | 'react') => void;
  onDeleteProject: (id: string) => void;
  settings: EditorSettings;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  settings,
}) => {
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'empty' | 'web' | 'python' | 'react'>('empty');

  const labels = t[settings.language];

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), selectedTemplate);
    setNewProjectName('');
    setIsCreatingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white">إدارة المشاريع البرمجية</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {!isCreatingNew ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">مشاريعك المحفوظة ({projects.length}):</span>
                <button
                  onClick={() => setIsCreatingNew(true)}
                  className="px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{labels.newProject}</span>
                </button>
              </div>

              {/* Projects List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                {projects.map(proj => {
                  const isActive = proj.id === activeProjectId;
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj.id);
                        onClose();
                      }}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isActive
                          ? 'border-sky-500 bg-sky-950/30 text-white'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-900 text-slate-400'}`}>
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold flex items-center gap-2">
                            <span>{proj.name}</span>
                            {isActive && (
                              <span className="text-[10px] text-sky-400 font-medium">
                                (المشروع النشط)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {proj.files.filter(f => !f.isFolder).length} ملفات · تم التحديث{' '}
                            {formatIraqDate(proj.updatedAt)}
                          </div>
                        </div>
                      </div>

                      {/* Delete action (if not the only project) */}
                      {projects.length > 1 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (confirm(labels.deleteConfirmMsg)) {
                              onDeleteProject(proj.id);
                            }
                          }}
                          title={labels.deleteProject}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Create new project form */
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">اسم المشروع:</label>
                <input
                  type="text"
                  autoFocus
                  placeholder={labels.projectNamePlaceholder}
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {labels.selectTemplate}:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedTemplate('empty')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate === 'empty'
                        ? 'border-sky-500 bg-sky-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <FileBox className="w-5 h-5 text-sky-400 mb-1.5" />
                    <div className="text-xs font-semibold text-slate-200">مشروع فارغ تماماً</div>
                    <div className="text-[10px] text-slate-500">جاهز لرفع ملفاتك الخاصة</div>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('web')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate === 'web'
                        ? 'border-sky-500 bg-sky-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Globe className="w-5 h-5 text-emerald-400 mb-1.5" />
                    <div className="text-xs font-semibold text-slate-200">تطبيق ويب (HTML/JS)</div>
                    <div className="text-[10px] text-slate-500">معاينة مباشرة في المتصفح</div>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('python')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate === 'python'
                        ? 'border-sky-500 bg-sky-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Terminal className="w-5 h-5 text-yellow-400 mb-1.5" />
                    <div className="text-xs font-semibold text-slate-200">سكربت بايثون</div>
                    <div className="text-[10px] text-slate-500">تشغيل وخوارزميات</div>
                  </div>

                  <div
                    onClick={() => setSelectedTemplate('react')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate === 'react'
                        ? 'border-sky-500 bg-sky-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Atom className="w-5 h-5 text-cyan-400 mb-1.5" />
                    <div className="text-xs font-semibold text-slate-200">مكون React</div>
                    <div className="text-[10px] text-slate-500">مكونات تفاعلية JSX</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-md"
                >
                  {labels.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-md disabled:opacity-50 transition-colors"
                >
                  {labels.create}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
