import React from 'react';
import { ClassSectionCard, TeacherProfile, TermModel, PrintSettings } from '../../types';
import { X, Printer, Users } from 'lucide-react';
import { ReportCardItem } from './ReportCardItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classCard: ClassSectionCard | null;
  terms: TermModel[];
  profile: TeacherProfile;
  academicYear?: string;
  subject?: string;
  printSettings?: PrintSettings;
}

export const StudentCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  classCard,
  terms,
  profile,
  academicYear,
  subject,
  printSettings,
}) => {
  if (!isOpen || !classCard || terms.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 single-card-modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden single-card-modal-content print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        {/* Modal Top Actions - Hidden during Print */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              كارت درجات الصف:{' '}
              <strong className="text-amber-300">
                {classCard.gradeLevel || 'غير محدد'} - شعبة ({classCard.section || 'غير محدد'})
                {classCard.subject && ` | مادة ${classCard.subject}`}
                {classCard.teacherName && ` | أ. ${classCard.teacherName}`}
              </strong>{' '}
              <span className="text-xs text-slate-300">({classCard.students.length} طالب)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="طباعة كارت هذا الصف"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة هذا الكارت</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Card Display Area with Scroll */}
        <div className="p-4 sm:p-6 bg-slate-100 flex-1 overflow-y-auto print:bg-white print:p-0 print:overflow-visible print:max-h-none">
          <ReportCardItem
            classCard={classCard}
            terms={terms}
            profile={profile}
            academicYear={academicYear}
            subject={classCard.subject || subject}
            isPrintMode={true}
            printSettings={printSettings}
          />
        </div>
      </div>
    </div>
  );
};
