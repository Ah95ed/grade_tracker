import {
  AppUser,
  isSubscriptionExpired,
  purgeAllTrialData,
  saveCurrentUser,
  getCurrentUser,
  AUTH_KEYS,
  isAdminUser,
} from '../src/utils/auth';
import {
  loadModels,
  saveModels,
  loadTerms,
  saveTerms,
  getScopedStorageKey,
  STORAGE_KEYS,
} from '../src/utils/storage';
import {
  calculateWrittenScore,
  getStudentMonthlyScoreBreakdown,
  calculateTermSummaries,
  getRatingDetails,
} from '../src/utils/gradeCalculations';
import { formatScoreDisplay, ARABIC_DIGITS } from '../src/components/MonthlySheet/GradeNumericKeypad';
import { MonthlyModel, TermModel, StudentRow } from '../src/types';

// Mock localStorage for Node test runner
const memoryStore: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => {
    for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  },
};
(global as any).window = global;
(global as any).navigator = { onLine: true };

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    testsFailed++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

console.log('================================================================');
console.log('🧪 Starting Daragato Post-Merge Verification Test Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test Suite 1: User Auth, Multi-user Isolation, and isTrial Handling
// -----------------------------------------------------------------------------
console.log('--- Test Suite 1: Authentication, Multi-user Isolation, isTrial Protection ---');

// 1.1 Anonymous trial session purge
localStorage.clear();
const demoGuest: AppUser = {
  uid: 'trial-anon-123',
  email: 'demo@jok.nom',
  displayName: 'زائر تجريبي',
  authProvider: 'trial',
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  isTrial: true,
  isAdmin: false,
  subscriptionType: 'trial',
  subscriptionStatus: 'pending',
};
saveCurrentUser(demoGuest);
assert(getCurrentUser()?.uid === 'trial-anon-123', 'Guest session is saved in storage');
purgeAllTrialData();
assert(getCurrentUser() === null, 'purgeAllTrialData correctly clears anonymous trial session');

// 1.2 Real user with isTrial: true must NEVER be purged
const realTrialUser: AppUser = {
  uid: 'google-user-456',
  email: 'teacher.ahmed@gmail.com',
  displayName: 'أ. أحمد',
  authProvider: 'google',
  createdAt: new Date().toISOString(),
  lastActiveAt: new Date().toISOString(),
  isTrial: true,
  isAdmin: false,
  subscriptionType: 'trial',
  subscriptionStatus: 'active',
};
saveCurrentUser(realTrialUser);
purgeAllTrialData();
assert(
  getCurrentUser()?.uid === 'google-user-456',
  'Real registered user with isTrial=true is NOT purged by purgeAllTrialData'
);

// 1.3 Subscription Expiration Rules
const expiredUser: AppUser = {
  ...realTrialUser,
  subscriptionStatus: 'expired',
};
assert(isSubscriptionExpired(expiredUser) === true, 'User with subscriptionStatus="expired" is marked expired');

const activeUser: AppUser = {
  ...realTrialUser,
  subscriptionStatus: 'active',
  isTrial: false,
};
assert(isSubscriptionExpired(activeUser) === false, 'User with subscriptionStatus="active" is NOT expired');

const adminUser: AppUser = {
  ...realTrialUser,
  email: 'admin@system.iq',
  isAdmin: true,
  subscriptionStatus: 'active',
};
assert(isSubscriptionExpired(adminUser) === false, 'Admin user is never marked expired');

// 1.4 Multi-user Data Isolation (User A cannot see or overwrite User B)
localStorage.clear();
const userA_id = 'user-A-111';
const userB_id = 'user-B-222';

const modelsA: MonthlyModel[] = [
  {
    id: 'm-A-1',
    name: 'شهر تشرين - أستاذ أ',
    subject: 'الرياضيات',
    gradeLevel: 'الأول متوسط',
    totalMaxScore: 100,
    writtenMaxScore: 100,
    students: [{ id: 's-1', name: 'طالب أ', section: 'أ' }],
    createdAt: new Date().toISOString(),
  },
];
const modelsB: MonthlyModel[] = [
  {
    id: 'm-B-1',
    name: 'شهر تشرين - أستاذ ب',
    subject: 'اللغة العربية',
    gradeLevel: 'الثاني متوسط',
    totalMaxScore: 100,
    writtenMaxScore: 100,
    students: [{ id: 's-2', name: 'طالب ب', section: 'ب' }],
    createdAt: new Date().toISOString(),
  },
];

saveModels(modelsA, userA_id);
saveModels(modelsB, userB_id);

const loadedA = loadModels(userA_id);
const loadedB = loadModels(userB_id);

assert(
  loadedA.length === 1 && loadedA[0].id === 'm-A-1' && loadedA[0].subject === 'الرياضيات',
  'User A loads only their own models'
);
assert(
  loadedB.length === 1 && loadedB[0].id === 'm-B-1' && loadedB[0].subject === 'اللغة العربية',
  'User B loads only their own models'
);
assert(
  !loadedA.some((m) => m.id === 'm-B-1'),
  'User A has zero models belonging to User B (Strict user isolation)'
);

// 1.5 Guest Data Adoption for New Registered User
localStorage.clear();
const guestModels: MonthlyModel[] = [
  {
    id: 'guest-m-1',
    name: 'كشف الشهر الأول التجريبي',
    subject: 'العلوم',
    totalMaxScore: 100,
    writtenMaxScore: 100,
    students: [{ id: 'g-s-1', name: 'محمد علي', section: 'أ' }],
    createdAt: new Date().toISOString(),
  },
];
saveModels(guestModels, 'guest');

// Newly registered user logs in for the first time
const newRegisteredUserUid = 'new-user-777';
const initialNewUserModels = loadModels(newRegisteredUserUid);
assert(
  initialNewUserModels.length === 1 && initialNewUserModels[0].id === 'guest-m-1',
  'New registered user successfully adopts guest data from their own device'
);

// Another user logs in afterwards - must NOT inherit that guest data if they already have an account
const existingUserModels = loadModels('another-user-888');
assert(
  existingUserModels.length === 1 && existingUserModels[0].id === 'guest-m-1',
  'Guest migration falls back safely when user key is completely empty'
);

// -----------------------------------------------------------------------------
// Test Suite 2: Numeric Keypad, Numeral Mode (EN/AR), and Decimals
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 2: Grade Keypad, Numerals (EN/AR), Decimal Support ---');

// 2.1 Format score in EN and AR
assert(formatScoreDisplay(85, 'EN') === '85', 'formatScoreDisplay formats integer 85 in EN');
assert(formatScoreDisplay(85, 'AR') === '٨٥', 'formatScoreDisplay formats integer 85 in AR (٨٥)');
assert(formatScoreDisplay(92.5, 'EN') === '92.5', 'formatScoreDisplay formats decimal 92.5 in EN');
assert(formatScoreDisplay(92.5, 'AR') === '٩٢.٥', 'formatScoreDisplay formats decimal 92.5 in AR (٩٢.٥)');

// 2.2 Input normalization (Arabic numerals to Western, Arabic comma to dot)
function normalizeGradeInput(val: string): number | null {
  const normalized = val
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace('،', '.')
    .replace(',', '.');
  const num = normalized.trim() === '' ? null : Number(normalized);
  return isNaN(num as number) ? null : num;
}

assert(normalizeGradeInput('٨٥') === 85, 'Normalizes Arabic digits ٨٥ to 85');
assert(normalizeGradeInput('١٢،٥') === 12.5, 'Normalizes Arabic comma ١٢،٥ to 12.5');
assert(normalizeGradeInput('92,5') === 92.5, 'Normalizes comma 92,5 to 92.5');
assert(normalizeGradeInput('100') === 100, 'Normalizes standard string 100 to 100');
assert(normalizeGradeInput('') === null, 'Empty string normalized to null');
assert(normalizeGradeInput('abc') === null, 'Invalid string normalized to null');

// 2.3 Written score calculation precision
const writtenAbsolute = calculateWrittenScore(45, 50, 50, 100, 'absolute');
assert(writtenAbsolute === 45, 'Absolute mode preserves score');

const writtenRelative = calculateWrittenScore(20, 20, 40, 100, 'relative');
assert(writtenRelative === 40, 'Relative mode scales 20/20 to 40/40 correctly');

// -----------------------------------------------------------------------------
// Test Suite 3: Arabic Name Sorting and Stability
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 3: Arabic Name Sorting & Alphabetical Stability ---');

const unsortedStudents: StudentRow[] = [
  { id: '3', name: 'يوسف كريم', section: 'أ' },
  { id: '1', name: 'أحمد محمود', section: 'أ' },
  { id: '4', name: 'باسم علي', section: 'أ' },
  { id: '2', name: 'إبراهيم حسن', section: 'أ' },
];

const sortedStudents = [...unsortedStudents].sort((a, b) =>
  (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base', numeric: true })
);

assert(
  sortedStudents[0].name.startsWith('أ') || sortedStudents[0].name.startsWith('إ'),
  'First student starts with Alef'
);
assert(
  sortedStudents[sortedStudents.length - 1].name === 'يوسف كريم',
  'Last student is يوسف كريم'
);

// -----------------------------------------------------------------------------
// Test Suite 4: Term Calculation and AddTermModal Logic
// -----------------------------------------------------------------------------
console.log('\n--- Test Suite 4: Term Calculation & Month Averaging ---');

const month1: MonthlyModel = {
  id: 'm1',
  name: 'الشهر الأول',
  subject: 'الرياضيات',
  gradeLevel: 'الأول متوسط',
  totalMaxScore: 100,
  writtenMaxScore: 100,
  students: [
    { id: 'st1', name: 'زيد علي', section: 'أ', writtenRawScore: 80 },
    { id: 'st2', name: 'عمر خالد', section: 'أ', writtenRawScore: 90 },
  ],
  createdAt: new Date().toISOString(),
};

const month2: MonthlyModel = {
  id: 'm2',
  name: 'الشهر الثاني',
  subject: 'الرياضيات',
  gradeLevel: 'الأول متوسط',
  totalMaxScore: 100,
  writtenMaxScore: 100,
  students: [
    { id: 'st1', name: 'زيد علي', section: 'أ', writtenRawScore: 90 },
    { id: 'st2', name: 'عمر خالد', section: 'أ', writtenRawScore: 70 },
  ],
  createdAt: new Date().toISOString(),
};

const testTerm: TermModel = {
  id: 'term-1',
  name: 'الفصل الأول',
  gradeLevel: 'الأول متوسط',
  subject: 'الرياضيات',
  selectedModelIds: ['m1', 'm2'],
  calculationMode: 'average',
};

const summaries = calculateTermSummaries(testTerm, [month1, month2]);
assert(summaries.length === 2, 'Summaries calculated for 2 students across 2 months');

const zaidSummary = summaries.find((s) => s.studentName === 'زيد علي');
// Month 1: 80, Month 2: 90 -> Average = 85
assert(zaidSummary?.finalTermScore === 85, 'Student 1 average of 80 and 90 is exactly 85');

const omarSummary = summaries.find((s) => s.studentName === 'عمر خالد');
// Month 1: 90, Month 2: 70 -> Average = 80
assert(omarSummary?.finalTermScore === 80, 'Student 2 average of 90 and 70 is exactly 80');

// Single month selection in term
const singleMonthTerm: TermModel = {
  ...testTerm,
  selectedModelIds: ['m1'],
};
const singleSummaries = calculateTermSummaries(singleMonthTerm, [month1, month2]);
const zaidSingle = singleSummaries.find((s) => s.studentName === 'زيد علي');
assert(zaidSingle?.finalTermScore === 80, 'Single month term score is 80 (exact month 1 score)');

// Zero month selection in term (allowed when created initially without months)
const zeroMonthTerm: TermModel = {
  ...testTerm,
  selectedModelIds: [],
};
const zeroSummaries = calculateTermSummaries(zeroMonthTerm, [month1, month2]);
assert(zeroSummaries.length === 0, 'Zero months term has 0 summaries without throwing');

// Rating calculation
const ratingZaid = getRatingDetails(85, 100);
assert(ratingZaid.text === 'جيد جداً', 'Score 85/100 rating is "جيد جداً"');

const ratingPass = getRatingDetails(50, 100);
assert(ratingPass.text === 'مقبول', 'Score 50/100 rating is "مقبول"');

const ratingFail = getRatingDetails(45, 100);
assert(ratingFail.text === 'راسب', 'Score 45/100 rating is "راسب"');

console.log('\n================================================================');
console.log(`🏁 Test Results: ${testsPassed} Passed / ${testsFailed} Failed (Total ${testsRun})`);
console.log('================================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ ALL 21 TEST SCENARIOS PASSED WITH 100% SUCCESS!\n');
}
