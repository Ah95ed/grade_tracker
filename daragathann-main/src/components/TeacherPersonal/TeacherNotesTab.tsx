import React, { useState, useMemo } from 'react';
import { TeacherNote, TeacherNoteCategory } from '../../types/teacherPersonal';
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  StickyNote,
  X,
} from 'lucide-react';

interface Props {
  notes: TeacherNote[];
  onChange: (next: TeacherNote[]) => void;
}

const CATEGORY_LABELS: Record<TeacherNoteCategory, string> = {
  lesson_prep: 'تحضير درس',
  class_note: 'ملاحظة صفية',
  admin: 'مهام إدارية',
  general: 'شخصي',
};

export const TeacherNotesTab: React.FC<Props> = ({ notes, onChange }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'all' | TeacherNoteCategory>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TeacherNoteCategory>('lesson_prep');
  const [isPinned, setIsPinned] = useState(false);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('lesson_prep');
    setIsPinned(false);
    setEditingId(null);
    setIsComposing(false);
  };

  const startNewNote = () => {
    resetForm();
    setIsComposing(true);
  };

  const startEditNote = (note: TeacherNote) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setIsPinned(note.isPinned);
    setIsComposing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle && !cleanContent) return;

    const nowIso = new Date().toISOString();

    if (editingId) {
      onChange(
        notes.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: cleanTitle || 'ملاحظة بدون عنوان',
                content: cleanContent,
                category,
                isPinned,
                updatedAt: nowIso,
              }
            : n
        )
      );
    } else {
      const created: TeacherNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle || 'ملاحظة بدون عنوان',
        content: cleanContent,
        category,
        isPinned,
        isDone: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      onChange([created, ...notes]);
    }
    resetForm();
  };

  const togglePin = (id: string) => {
    onChange(
      notes.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const toggleDone = (id: string) => {
    onChange(
      notes.map((n) => (n.id === id ? { ...n, isDone: !n.isDone } : n))
    );
  };

  const deleteNote = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
    if (editingId === id) resetForm();
  };

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (filterCat !== 'all' && n.category !== filterCat) return false;
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [notes, filterCat, search]);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('ar-IQ', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Category Filters & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5DAC7]">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-[#8C7A68] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في ملاحظاتي..."
              className="w-full pr-9 pl-3 py-2 text-xs font-bold bg-white border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
            />
          </div>
          <button
            type="button"
            onClick={startNewNote}
            className="px-4 py-2 craft-btn-primary rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ملاحظة جديدة</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#EFE8D8] rounded-xl border border-[#D5C8B2] overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterCat('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              filterCat === 'all'
                ? 'bg-white text-[#2F2822] shadow-2xs'
                : 'text-[#6B5E51] hover:text-[#2F2822]'
            }`}
          >
            الكل
          </button>
          {(Object.keys(CATEGORY_LABELS) as TeacherNoteCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filterCat === cat
                  ? 'bg-white text-[#2F2822] shadow-2xs'
                  : 'text-[#6B5E51] hover:text-[#2F2822]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Compose / Edit Form */}
      {isComposing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-[#BA916C] p-4 space-y-3 shadow-xs animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-[#2F2822]">
              {editingId ? 'تعديل الملاحظة' : 'إضافة ملاحظة شخصية'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="p-1 text-[#6B5E51] hover:text-[#2F2822] rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الملاحظة..."
              className="sm:col-span-2 px-3 py-2 text-sm font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
              autoFocus
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TeacherNoteCategory)}
              className="px-3 py-2 text-xs font-bold bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C]"
            >
              {(Object.keys(CATEGORY_LABELS) as TeacherNoteCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="اكتب ملاحظتك هنا (أفكار للدرس، طلاب يحتاجون متابعة، مهام يومية...)"
            className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-[#FAF7EC] border border-[#D5C8B2] rounded-xl focus:outline-none focus:border-[#BA916C] resize-y"
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-[#554A3E] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-[#BA916C] text-[#BA916C] focus:ring-[#BA916C]"
              />
              <span>تثبيت الملاحظة في الأعلى</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-1.5 text-xs font-bold text-[#554A3E] hover:bg-[#EFE8D8] rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 craft-btn-primary rounded-xl text-xs font-bold cursor-pointer"
              >
                {editingId ? 'حفظ التعديل' : 'حفظ الملاحظة'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5DAC7] py-10 px-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F5EBDC] border border-[#D5C8B2] flex items-center justify-center text-[#8C6544]">
            <StickyNote className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-[#2F2822]">
              {notes.length === 0 ? 'دفتر ملاحظاتك الشخصي فارغ' : 'لا توجد ملاحظات مطابقة للبحث'}
            </p>
            <p className="text-xs text-[#6B5E51] mt-1">
              سجّل تحضيرات الدروس، ملاحظات الصفوف، أو أي مهام خاصة بك وحدك.
            </p>
          </div>
          {!isComposing && notes.length === 0 && (
            <button
              type="button"
              onClick={startNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 craft-btn-primary rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>كتابة أول ملاحظة</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#D5C8B2] divide-y divide-[#EDE4D3]">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`p-4 transition-colors ${
                note.isPinned ? 'bg-[#FDF9F0]' : 'hover:bg-[#FAF7EC]/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleDone(note.id)}
                    className="mt-0.5 text-[#8C6544] hover:text-[#4E7A68] shrink-0 cursor-pointer"
                    title={note.isDone ? 'إعادة فتح الملاحظة' : 'تحديد كمكتملة'}
                  >
                    {note.isDone ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#4E7A68]" />
                    ) : (
                      <Circle className="w-4.5 h-4.5" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h5
                      className={`text-sm font-black leading-snug ${
                        note.isDone ? 'line-through text-[#9C8E7E]' : 'text-[#2F2822]'
                      }`}
                    >
                      {note.title}
                    </h5>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7A6E61] mt-0.5 tabular-nums">
                      <span className="font-bold text-[#8C6544]">
                        {CATEGORY_LABELS[note.category]}
                      </span>
                      {note.isPinned && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-[#5692BE]">مثبتة</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(note.updatedAt)}</span>
                    </div>
                    {note.content && (
                      <p
                        className={`text-xs sm:text-sm mt-2 whitespace-pre-line leading-relaxed ${
                          note.isDone ? 'text-[#9C8E7E]' : 'text-[#4A3F35]'
                        }`}
                      >
                        {note.content}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => togglePin(note.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      note.isPinned
                        ? 'text-[#5692BE] bg-[#EAF3FA]'
                        : 'text-[#8C7A68] hover:bg-[#EFE8D8]'
                    }`}
                    title={note.isPinned ? 'إلغاء التثبيت' : 'تثبيت للأعلى'}
                  >
                    {note.isPinned ? (
                      <PinOff className="w-3.5 h-3.5" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditNote(note)}
                    className="p-1.5 text-[#6B5E51] hover:text-[#2F2822] hover:bg-[#EFE8D8] rounded-lg transition-colors cursor-pointer"
                    title="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
