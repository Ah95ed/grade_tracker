import React from 'react';
import { TeacherProfile, TermModel, PrintSettings } from '../../types';
import { X, Printer, User } from 'lucide-react';
import { StudentIndividualCardItem, StudentCardData } from './StudentIndividualCardItem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentCard: StudentCardData | null;
  terms: TermModel[];
  profile: TeacherProfile;
  academicYear?: string;
  printSettings?: PrintSettings;
  isAdministration?: boolean;
}

export const SingleStudentCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  studentCard,
  terms,
  profile,
  academicYear,
  printSettings,
  isAdministration,
}) => {
  if (!isOpen || !studentCard) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 single-card-modal-backdrop">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden single-card-modal-content print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        {/* Modal Top Actions - Hidden during Print */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              كارت الطالب:{' '}
              <strong className="text-amber-300">
                {studentCard.name}
              </strong>{' '}
              <span className="text-xs text-slate-300">
                (الصف: {studentCard.gradeLevel} - شعبة {studentCard.section})
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="طباعة كارت هذا الطالب"
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
          <StudentIndividualCardItem
            studentCard={studentCard}
            terms={terms}
            profile={profile}
            academicYear={academicYear}
            isPrintMode={true}
            printSettings={printSettings}
            isAdministration={isAdministration}
          />
        </div>
      </div>
    </div>
  );
};
