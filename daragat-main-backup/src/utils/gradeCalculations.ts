import {
  MonthlyModel,
  StudentRow,
  TermModel,
  StudentTermSummary,
  MultiTermStudentSummary,
  RoundingMode,
  WrittenScoreMode,
  FinalScoreOperation,
  FinalScoreOperationType,
} from '../types';
import { isGradeLevelMatch } from './gradeAndSectionMatcher';

/**
 * Applies a mathematical operation (divide, multiply, add, subtract) on a score.
 * Used for final score column customizations.
 */
export function applyFinalScoreOperation(
  rawTotal: number,
  operation?: FinalScoreOperation
): number {
  if (!operation || !operation.type || operation.type === 'none') {
    return rawTotal;
  }
  const val = Number(operation.value);
  if (isNaN(val) || val <= 0) {
    return rawTotal;
  }

  let result = rawTotal;
  switch (operation.type) {
    case 'divide':
      result = rawTotal / val;
      break;
    case 'multiply':
      result = rawTotal * val;
      break;
    case 'add':
      result = rawTotal + val;
      break;
    case 'subtract':
      result = Math.max(0, rawTotal - val);
      break;
    default:
      result = rawTotal;
  }
  return Math.round(result * 100) / 100;
}

/**
 * Calculates the effective total max score for a model, accounting for any final score operation.
 * E.g. totalMaxScore = 100 and operation = divide by 2 => effective max = 50.
 */
export function getEffectiveTotalMax(model: MonthlyModel): number {
  const baseMax = Number(model.totalMaxScore) || 100;
  const op = model.finalScoreOperation;
  if (!op || !op.type || op.type === 'none') {
    return baseMax;
  }
  const val = Number(op.value);
  if (isNaN(val) || val <= 0) {
    return baseMax;
  }
  let effectiveMax = baseMax;
  switch (op.type) {
    case 'divide': {
      // In school gradebooks, dividing by 2 is often used to average components (e.g. Written 100 + Oral 100 = 200, divided by 2 = 100).
      // The maximum final grade for the subject remains out of baseMax (e.g. 100).
      const customSum = (model.customColumns || [])
        .filter((col) => !col.isAttendance)
        .reduce((sum, col) => sum + Number(col.maxScore || 0), 0);
      const rawWritten = Number(model.writtenMaxScore) || baseMax;
      const totalPotentialSum = rawWritten + customSum;
      if (totalPotentialSum > baseMax && val > 1) {
        effectiveMax = Math.round((totalPotentialSum / val) * 100) / 100;
      } else {
        effectiveMax = baseMax;
      }
      break;
    }
    case 'multiply':
      effectiveMax = baseMax * val;
      break;
    case 'add':
      effectiveMax = baseMax + val;
      break;
    case 'subtract':
      effectiveMax = Math.max(0, baseMax - val);
      break;
  }
  return Math.max(baseMax, Math.round(effectiveMax * 100) / 100);
}

/**
 * Returns a human-friendly Arabic label for a final score operation.
 * E.g. "÷ 2" or "× 2" or "+ 5" or "- 3" or ""
 */
export function getOperationLabel(operation?: FinalScoreOperation): string {
  if (!operation || !operation.type || operation.type === 'none') {
    return '';
  }
  const val = operation.value;
  switch (operation.type) {
    case 'divide':
      return `÷ ${val}`;
    case 'multiply':
      return `× ${val}`;
    case 'add':
      return `+ ${val}`;
    case 'subtract':
      return `- ${val}`;
    default:
      return '';
  }
}

/**
 * Applies score rounding rules chosen by the teacher.
 * Options:
 * - 'none': keeps decimals (e.g. 7.2 or 8.2)
 * - 'half_up': fraction >= 0.5 rounds up to next integer, < 0.5 rounds down (e.g. 7.5 -> 8, 7.4 -> 7)
 * - 'any_fraction': fraction >= 0.1 rounds up to next integer (e.g. 7.1 -> 8, 8.2 -> 9)
 * - 'custom_threshold': fraction >= customThreshold rounds up, else rounds down
 */
export function applyScoreRounding(
  score: number | null | undefined,
  mode?: RoundingMode,
  customThreshold?: number,
  maxAllowed?: number
): number | null {
  if (score === null || score === undefined || isNaN(score)) {
    return null;
  }

  // If no rounding (default / 'none'), return rounded to 2 decimal places
  if (!mode || mode === 'none') {
    return Math.round(score * 100) / 100;
  }

  const integerPart = Math.floor(score);
  // Get decimal fraction with precision (e.g. 7.2 -> 0.2)
  const fraction = Math.round((score - integerPart) * 1000) / 1000;

  if (fraction === 0) {
    return integerPart;
  }

  let threshold = 0.5;
  if (mode === 'half_up') {
    threshold = 0.5;
  } else if (mode === 'any_fraction') {
    threshold = 0.1;
  } else if (mode === 'custom_threshold') {
    threshold =
      customThreshold !== undefined && customThreshold > 0 && customThreshold < 1
        ? customThreshold
        : 0.5;
  }

  let rounded: number;
  if (fraction >= threshold) {
    rounded = integerPart + 1;
  } else {
    rounded = integerPart;
  }

  // Only clamp if the original unrounded score was within maxAllowed, to prevent rounding up past the ceiling (e.g. 99.5 -> 100).
  // If the score already exceeds maxAllowed (e.g. 69.5 when maxAllowed was erroneously 50),
  // rounding must NEVER crush the score down below the actual score or integerPart!
  if (maxAllowed !== undefined && maxAllowed > 0) {
    if (score <= maxAllowed) {
      rounded = Math.min(rounded, maxAllowed);
    }
  }

  return rounded;
}

export {
  isStudentNameColumn,
  isSectionColumn,
  isGradeLevelColumn,
  isSequenceColumn,
  isNotesOrStatusColumn,
  isFinalTotalOrRatingColumn,
  isWrittenExamColumn,
  isStandardSystemColumn,
  areColumnsSemanticallyEquivalent,
  findMatchingExistingColumn,
  normalizeArabicColumnName,
} from './columnClassifier';

import {
  isWrittenExamColumn,
  isStandardSystemColumn,
} from './columnClassifier';

/**
 * Detects whether a column name or type represents the written exam / monthly paper exam,
 * which belongs exclusively in the main table's native `writtenRawScore` column ("التحريري بالورقة من ...")
 * and should NEVER be created as an extra custom column.
 */
export function isWrittenScoreColumn(name?: string, type?: string): boolean {
  return isWrittenExamColumn(name, type);
}

/**
 * Checks if a column is an oral, activity, homework, or behavioral grade column.
 */
export function isOralOrActivityScoreColumn(name?: string, type?: string): boolean {
  if (!name && !type) return false;
  if (type === 'oral' || type === 'activity' || type === 'homework' || type === 'attendance' || type === 'behavior') return true;
  if (!name) return false;
  const clean = name
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .toLowerCase()
    .trim();
  return (
    clean.includes('شفه') ||
    clean.includes('شفو') ||
    clean.includes('نشاط') ||
    clean.includes('يومي') ||
    clean.includes('واجب') ||
    clean.includes('دفتر') ||
    clean.includes('حضور') ||
    clean.includes('مواظب') ||
    clean.includes('سلوك') ||
    clean.includes('مشارك') ||
    clean.includes('مشروع')
  );
}

/**
 * Calculates the converted written score based on raw score and automatic or defined weight.
 * If mode is 'raw' ("الدرجة كما في ورقة الطالب"), the score is taken directly as-is without ratio calculation.
 * If mode is 'relative' ("الدرجة النسبية للطالب"), it converts proportionately: (raw / max) * effectiveWeight.
 */
export function calculateWrittenScore(
  rawScore: number | null | undefined,
  maxScore: number,
  weightPercentage: number | null | undefined,
  modelTotalMax?: number,
  mode: WrittenScoreMode = 'raw'
): number | null {
  if (rawScore === null || rawScore === undefined || isNaN(rawScore)) {
    return null;
  }

  // "الدرجة كما في ورقة الطالب": توضع الدرجة كما هي بدون حساب نسبة
  if (mode === 'raw') {
    return Math.round(Number(rawScore) * 100) / 100;
  }

  const safeMax = maxScore > 0 ? maxScore : (modelTotalMax && modelTotalMax > 0 ? modelTotalMax : 100);
  // If weight is null, undefined, or empty, it defaults to model total max score
  const fallbackWeight = modelTotalMax && modelTotalMax > 0 ? modelTotalMax : safeMax;
  const effectiveWeight =
    weightPercentage === null ||
    weightPercentage === undefined ||
    isNaN(weightPercentage) ||
    weightPercentage <= 0
      ? fallbackWeight
      : weightPercentage;

  // Converted value based on the assigned weight
  const calculated = (Number(rawScore) / safeMax) * effectiveWeight;
  return Math.round(calculated * 100) / 100;
}

/**
 * Calculates the total final monthly score for a student row in a monthly model.
 * Automatically computes effective written weight as (model.totalMaxScore - sum(customColumns))
 * unless an explicit writtenWeight is saved.
 * Sum = calculated written score + custom columns scores
 * Applies score rounding rules if configured on the model.
 */
/**
 * Calculates the total final monthly score for a student row in a monthly model.
 * Automatically computes effective written weight as (model.totalMaxScore - sum(customColumns))
 * unless an explicit writtenWeight is saved.
 * Sum = calculated written score + custom columns scores +/- attendance impact
 * Applies score rounding rules if configured on the model.
 */
export function calculateStudentMonthlyTotal(
  student: StudentRow,
  model: MonthlyModel,
  skipRounding: boolean = false
): number | null {
  let hasAnyScore = false;
  let total = 0;

  // Automatic calculation of written weight:
  // totalMax - sum(customColumns). Attendance columns are excluded from taking away written exam weight.
  const totalMax = Number(model.totalMaxScore) || 100;
  const customSum = (model.customColumns || [])
    .filter((col) => !col.isAttendance)
    .reduce((sum, col) => sum + Number(col.maxScore || 0), 0);
  const autoWrittenWeight = Math.max(0, totalMax - customSum);
  const effectiveWrittenWeight = autoWrittenWeight;

  // 1. Written exam part
  if (student.writtenRawScore !== null && student.writtenRawScore !== undefined) {
    const writtenPart = calculateWrittenScore(
      student.writtenRawScore,
      model.writtenMaxScore,
      effectiveWrittenWeight,
      model.totalMaxScore,
      model.writtenScoreMode
    );
    if (writtenPart !== null) {
      total += writtenPart;
      hasAnyScore = true;
    }
  }

  // 2. Custom columns (oral, behavior, etc.)
  if (model.customColumns && model.customColumns.length > 0) {
    for (const col of model.customColumns) {
      if (col.isAttendance) continue;
      const colScore = student.scores[col.id];
      if (colScore !== null && colScore !== undefined && !isNaN(colScore)) {
        total += Number(colScore);
        hasAnyScore = true;
      }
    }
  }

  // 3. Attendance columns impact (increases or decreases final score)
  let attendanceDelta = 0;
  if (model.customColumns && model.customColumns.length > 0) {
    for (const col of model.customColumns) {
      if (!col.isAttendance) continue;
      const records = student.attendanceRecords?.[col.id] || [];
      if (records.length > 0) {
        hasAnyScore = true;
      }
      const cfg = col.attendanceConfig;
      if (cfg && cfg.affectsGrade) {
        let absCount = 0;
        let excCount = 0;
        let presCount = 0;
        for (const r of records) {
          if (r.status === 'absent') absCount++;
          else if (r.status === 'excused') excCount++;
          else if (r.status === 'present') presCount++;
        }

        if (cfg.absent.action === 'deduct') {
          attendanceDelta -= absCount * (Number(cfg.absent.points) || 0);
        } else if (cfg.absent.action === 'add') {
          attendanceDelta += absCount * (Number(cfg.absent.points) || 0);
        }

        if (cfg.excused.action === 'deduct') {
          attendanceDelta -= excCount * (Number(cfg.excused.points) || 0);
        } else if (cfg.excused.action === 'add') {
          attendanceDelta += excCount * (Number(cfg.excused.points) || 0);
        }

        if (cfg.present.action === 'add') {
          attendanceDelta += presCount * (Number(cfg.present.points) || 0);
        } else if (cfg.present.action === 'deduct') {
          attendanceDelta -= presCount * (Number(cfg.present.points) || 0);
        }
      }
    }
  }

  if (!hasAnyScore) return null;

  // Add attendance adjustment (clamped so total score cannot fall below 0)
  total = Math.max(0, total + attendanceDelta);

  const baseRawTotal = Math.round(total * 100) / 100;
  // Apply final score mathematical operation (division, multiplication, addition, subtraction)
  const operatedTotal = applyFinalScoreOperation(baseRawTotal, model.finalScoreOperation);

  if (skipRounding || !model.roundingMode || model.roundingMode === 'none') {
    return operatedTotal;
  }

  const effectiveMax = getEffectiveTotalMax(model);
  return applyScoreRounding(
    operatedTotal,
    model.roundingMode,
    model.roundingThreshold,
    effectiveMax
  );
}

/**
 * Returns breakdown of raw vs rounded final score, as well as base raw score, attendance impact, and operation details
 */
export function getStudentMonthlyScoreBreakdown(
  student: StudentRow,
  model: MonthlyModel
): {
  baseScore: number | null; // Raw sum before any operation
  rawScore: number | null;  // Score after operation, before rounding
  finalScore: number | null; // Final rounded score
  isRounded: boolean;
  hasOperation: boolean;
  operationLabel: string;
  attendanceDelta: number;
} {
  // 1. Calculate base sum before operation
  const totalMax = Number(model.totalMaxScore) || 100;
  const customSum = (model.customColumns || [])
    .filter((col) => !col.isAttendance)
    .reduce((sum, col) => sum + Number(col.maxScore || 0), 0);
  const autoWrittenWeight = Math.max(0, totalMax - customSum);
  let baseSum = 0;
  let hasAny = false;

  if (student.writtenRawScore !== null && student.writtenRawScore !== undefined) {
    const writtenPart = calculateWrittenScore(
      student.writtenRawScore,
      model.writtenMaxScore,
      autoWrittenWeight,
      model.totalMaxScore,
      model.writtenScoreMode
    );
    if (writtenPart !== null) {
      baseSum += writtenPart;
      hasAny = true;
    }
  }

  if (model.customColumns && model.customColumns.length > 0) {
    for (const col of model.customColumns) {
      if (col.isAttendance) continue;
      const colScore = student.scores[col.id];
      if (colScore !== null && colScore !== undefined && !isNaN(colScore)) {
        baseSum += Number(colScore);
        hasAny = true;
      }
    }
  }

  // Calculate attendance delta
  let attendanceDelta = 0;
  if (model.customColumns && model.customColumns.length > 0) {
    for (const col of model.customColumns) {
      if (!col.isAttendance) continue;
      const records = student.attendanceRecords?.[col.id] || [];
      if (records.length > 0) {
        hasAny = true;
      }
      const cfg = col.attendanceConfig;
      if (cfg && cfg.affectsGrade) {
        let absCount = 0;
        let excCount = 0;
        let presCount = 0;
        for (const r of records) {
          if (r.status === 'absent') absCount++;
          else if (r.status === 'excused') excCount++;
          else if (r.status === 'present') presCount++;
        }

        if (cfg.absent.action === 'deduct') {
          attendanceDelta -= absCount * (Number(cfg.absent.points) || 0);
        } else if (cfg.absent.action === 'add') {
          attendanceDelta += absCount * (Number(cfg.absent.points) || 0);
        }

        if (cfg.excused.action === 'deduct') {
          attendanceDelta -= excCount * (Number(cfg.excused.points) || 0);
        } else if (cfg.excused.action === 'add') {
          attendanceDelta += excCount * (Number(cfg.excused.points) || 0);
        }

        if (cfg.present.action === 'add') {
          attendanceDelta += presCount * (Number(cfg.present.points) || 0);
        } else if (cfg.present.action === 'deduct') {
          attendanceDelta -= presCount * (Number(cfg.present.points) || 0);
        }
      }
    }
  }

  if (hasAny) {
    baseSum = Math.max(0, baseSum + attendanceDelta);
  }

  const baseScore = hasAny ? Math.round(baseSum * 100) / 100 : null;
  const rawScore = calculateStudentMonthlyTotal(student, model, true);
  const finalScore = calculateStudentMonthlyTotal(student, model, false);
  const isRounded =
    rawScore !== null &&
    finalScore !== null &&
    rawScore !== finalScore &&
    model.roundingMode !== undefined &&
    model.roundingMode !== 'none';
  const hasOperation = Boolean(
    model.finalScoreOperation &&
      model.finalScoreOperation.type &&
      model.finalScoreOperation.type !== 'none' &&
      Number(model.finalScoreOperation.value) > 0
  );
  const operationLabel = getOperationLabel(model.finalScoreOperation);

  return { baseScore, rawScore, finalScore, isRounded, hasOperation, operationLabel, attendanceDelta };
}

/**
 * Get Arabic verbal rating and color badge for a given score (based on 100 or normalized)
 */
export function getRatingDetails(score: number | null, maxScore: number = 100): {
  text: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  status: 'passed' | 'failed' | 'incomplete';
} {
  if (score === null || score === undefined) {
    return {
      text: 'غير مرصود',
      color: 'text-slate-400',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      status: 'incomplete',
    };
  }

  const percentage = (score / (maxScore > 0 ? maxScore : 100)) * 100;

  if (percentage >= 90) {
    return {
      text: 'ممتاز',
      color: 'text-emerald-600',
      badgeBg: 'bg-emerald-50 border-emerald-200',
      badgeText: 'text-emerald-700',
      status: 'passed',
    };
  }
  if (percentage >= 80) {
    return {
      text: 'جيد جداً',
      color: 'text-blue-600',
      badgeBg: 'bg-blue-50 border-blue-200',
      badgeText: 'text-blue-700',
      status: 'passed',
    };
  }
  if (percentage >= 70) {
    return {
      text: 'جيد',
      color: 'text-teal-600',
      badgeBg: 'bg-teal-50 border-teal-200',
      badgeText: 'text-teal-700',
      status: 'passed',
    };
  }
  if (percentage >= 60) {
    return {
      text: 'متوسط',
      color: 'text-amber-600',
      badgeBg: 'bg-amber-50 border-amber-200',
      badgeText: 'text-amber-700',
      status: 'passed',
    };
  }
  if (percentage >= 50) {
    return {
      text: 'مقبول',
      color: 'text-orange-600',
      badgeBg: 'bg-orange-50 border-orange-200',
      badgeText: 'text-orange-700',
      status: 'passed',
    };
  }
  return {
    text: 'راسب',
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    status: 'failed',
  };
}

/**
 * Calculates term grade for all students across the selected monthly models.
 * If 1 model selected: Final = that model's score
 * If 2 models selected: Final = (Model1 + Model2) / 2
 * If >2 models selected: Final = Sum / count
 */
export function calculateTermSummaries(
  term: TermModel,
  allModels: MonthlyModel[]
): StudentTermSummary[] {
  const selectedModels = allModels.filter((m) =>
    term.selectedModelIds.includes(m.id)
  );

  if (selectedModels.length === 0) {
    return [];
  }

  // Gather unique students across the selected models (matched by name or id)
  const studentMap = new Map<
    string,
    {
      name: string;
      gradeLevel: string;
      section: string;
    }
  >();

  // Populate students
  for (const model of selectedModels) {
    for (const student of model.students) {
      if (term.gradeLevel && !isGradeLevelMatch(student.gradeLevel, term.gradeLevel)) {
        continue;
      }
      const key = student.name.trim();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: student.name,
          gradeLevel: student.gradeLevel,
          section: student.section,
        });
      }
    }
  }

  const summaries: StudentTermSummary[] = [];

  studentMap.forEach((meta, studentName) => {
    const monthlyScores: {
      modelId: string;
      modelName: string;
      score: number | null;
      maxScore: number;
    }[] = [];

    let sum = 0;
    let validCount = 0;

    for (const model of selectedModels) {
      const st = model.students.find(
        (s) => s.name.trim().toLowerCase() === studentName.toLowerCase()
      );
      const score = st ? calculateStudentMonthlyTotal(st, model) : null;
      monthlyScores.push({
        modelId: model.id,
        modelName: model.name,
        score,
        maxScore: model.totalMaxScore,
      });

      if (score !== null) {
        sum += score;
        validCount++;
      }
    }

    // Determine raw and final term score
    let rawTermScore: number | null = null;
    let finalTermScore: number | null = null;
    let isRounded = false;

    if (term.calculationMode === 'sum') {
      rawTermScore = validCount > 0 ? Math.round(sum * 100) / 100 : null;
    } else {
      // 'average' or 'single'
      if (validCount > 0) {
        // As requested by user: e.g. (70 + 90) / 2
        // We divide by number of selected models or valid count
        const divisor = selectedModels.length > 0 ? selectedModels.length : 1;
        rawTermScore = Math.round((sum / divisor) * 100) / 100;
      }
    }

    const termMaxScore = selectedModels.reduce(
      (max, m) => Math.max(max, Number(m.totalMaxScore) || 100),
      100
    );

    // Apply rounding rules if configured on term or inherited from models
    const effectiveRoundingMode =
      term.roundingMode !== undefined && term.roundingMode !== null
        ? term.roundingMode
        : selectedModels.find((m) => m.roundingMode && m.roundingMode !== 'none')?.roundingMode || 'none';

    const effectiveRoundingThreshold =
      term.roundingThreshold !== undefined && term.roundingThreshold !== null
        ? term.roundingThreshold
        : selectedModels.find((m) => m.roundingThreshold !== undefined)?.roundingThreshold ?? 0.5;

    if (rawTermScore !== null) {
      if (effectiveRoundingMode && effectiveRoundingMode !== 'none') {
        finalTermScore = applyScoreRounding(
          rawTermScore,
          effectiveRoundingMode,
          effectiveRoundingThreshold,
          termMaxScore
        );
        isRounded = finalTermScore !== rawTermScore;
      } else {
        finalTermScore = rawTermScore;
        isRounded = false;
      }
    }

    const rating = getRatingDetails(finalTermScore, termMaxScore);

    summaries.push({
      studentId: studentName,
      name: meta.name,
      gradeLevel: meta.gradeLevel,
      section: meta.section,
      monthlyScores,
      rawTermScore,
      finalTermScore,
      isRounded,
      termMaxScore,
      gradeText: rating.text,
      gradeColor: rating.color,
      status: rating.status,
    });
  });

  return summaries;
}

/**
 * Calculates combined grade across multiple selected terms.
 * If 1 term selected: finalAverageScore = that term's final score
 * If 2 terms selected: finalAverageScore = (Term1 + Term2) / 2
 * If N terms selected: finalAverageScore = (Sum of Term final scores) / N
 */
export function calculateMultiTermSummaries(
  selectedTerms: TermModel[],
  allModels: MonthlyModel[]
): MultiTermStudentSummary[] {
  if (selectedTerms.length === 0) return [];

  // 1. Calculate individual term summaries for each selected term
  const termResults = selectedTerms.map((t) => ({
    term: t,
    summaries: calculateTermSummaries(t, allModels),
  }));

  // 2. Collect unique students across all selected terms
  const studentMap = new Map<
    string,
    {
      name: string;
      gradeLevel: string;
      section: string;
    }
  >();

  for (const { summaries } of termResults) {
    for (const s of summaries) {
      const key = s.name.trim();
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          name: s.name,
          gradeLevel: s.gradeLevel,
          section: s.section,
        });
      }
    }
  }

  const multiSummaries: MultiTermStudentSummary[] = [];

  studentMap.forEach((meta, studentKey) => {
    const termBreakdowns: {
      termId: string;
      termName: string;
      rawTermScore?: number | null;
      finalTermScore: number | null;
      isRounded?: boolean;
      termMaxScore: number;
      monthlyScores: {
        modelId: string;
        modelName: string;
        score: number | null;
        maxScore: number;
      }[];
    }[] = [];

    let sum = 0;
    let validCount = 0;

    for (const { term, summaries } of termResults) {
      const found = summaries.find(
        (s) => s.name.trim().toLowerCase() === studentKey.toLowerCase()
      );

      const finalTermScore = found ? found.finalTermScore : null;
      const rawTermScore = found ? found.rawTermScore : null;
      const isRounded = found ? found.isRounded : false;
      const termMaxScore = found ? found.termMaxScore : 100;
      const monthlyScores = found ? found.monthlyScores : [];

      termBreakdowns.push({
        termId: term.id,
        termName: term.name,
        rawTermScore,
        finalTermScore,
        isRounded,
        termMaxScore,
        monthlyScores,
      });

      if (finalTermScore !== null && !isNaN(finalTermScore)) {
        sum += finalTermScore;
        validCount++;
      }
    }

    const combinedMaxScore = termBreakdowns.reduce(
      (max, t) => Math.max(max, t.termMaxScore || 100),
      100
    );

    let rawAverageScore: number | null = null;
    let finalAverageScore: number | null = null;
    let isAverageRounded = false;

    if (selectedTerms.length === 1) {
      finalAverageScore = termBreakdowns[0]?.finalTermScore ?? null;
      rawAverageScore = termBreakdowns[0]?.rawTermScore ?? finalAverageScore;
      isAverageRounded = termBreakdowns[0]?.isRounded ?? false;
    } else {
      // Divide sum by number of selected terms (e.g. 2 terms -> divide by 2, 3 terms -> divide by 3)
      if (validCount > 0) {
        rawAverageScore = Math.round((sum / selectedTerms.length) * 100) / 100;
        const firstTermWithRounding = selectedTerms.find((t) => t.roundingMode && t.roundingMode !== 'none');
        if (firstTermWithRounding && firstTermWithRounding.roundingMode && firstTermWithRounding.roundingMode !== 'none') {
          finalAverageScore = applyScoreRounding(
            rawAverageScore,
            firstTermWithRounding.roundingMode,
            firstTermWithRounding.roundingThreshold ?? 0.5,
            combinedMaxScore
          );
          isAverageRounded = finalAverageScore !== rawAverageScore;
        } else {
          finalAverageScore = rawAverageScore;
        }
      }
    }

    const rating = getRatingDetails(finalAverageScore, combinedMaxScore);

    multiSummaries.push({
      studentId: studentKey,
      name: meta.name,
      gradeLevel: meta.gradeLevel,
      section: meta.section,
      termBreakdowns,
      rawAverageScore,
      finalAverageScore,
      isAverageRounded,
      combinedMaxScore,
      gradeText: rating.text,
      gradeColor: rating.color,
      status: rating.status,
    });
  });

  return multiSummaries;
}

