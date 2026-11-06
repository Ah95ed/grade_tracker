const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'daragat-main', 'src');

function getAllTsx(dir) {
  let list = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      list = list.concat(getAllTsx(full));
    } else if (item.name.endsWith('.tsx') && item.name !== 'main.tsx') {
      list.push(full);
    }
  }
  return list;
}

const files = getAllTsx(srcDir);
// Ensure App.tsx is first
const appIdx = files.findIndex(f => path.basename(f) === 'App.tsx');
if (appIdx > -1) {
  const [appFile] = files.splice(appIdx, 1);
  files.unshift(appFile);
}

const componentDescriptions = {
  'App': 'الجذر الرئيسي للتطبيق وإدارة حالة التبويبات النشطة والمزامنة وعرض النوافذ',
  'Header': 'شريط العنوان العلوي الديناميكي، شارة المزامنة السحابية وشعار المدرسة',
  'EditorArea': 'منطقة العمل الرئيسية وتوجيه الصفحات بين الجدول والمعدل والكروت',
  'AuthScreen': 'شاشة تسجيل الدخول وإنشاء الحساب وحسابات Google وكلمة المرور',
  'MonthlySheetView': 'الشاشة الأساسية لإدارة وعرض جدول الدرجات الشهرية والطلاب',
  'TermCalculationView': 'شاشة حساب المعدلات الفصلية والنهائية والإحصائيات التراكمية',
  'ReportCardsView': 'شاشة استعراض كروت وشهادات الطلاب وإعدادات الطباعة المدرسية',
  'AdminDashboardView': 'لوحة تحكم الإدارة لمتابعة المستخدمين والاشتراكات وقاعدة بيانات D1',
  'CleanTableView': 'عرض جدول الدرجات الصافي والطباعي الخالي من أدوات التعديل',
  'CleanTermTableView': 'عرض جدول الفصول والمعدل الصافي المركز بدون أزرار تحكم',
  'InteractiveClassroomView': 'واجهة الفصل التفاعلية لإدخال الدرجات بطريقة شبكة المقاعد',
  'ClassesSectionsOverview': 'نظرة شاملة وسريعة على الصفوف والشعب المدرسية والطلاب',
  'PrivacyPolicyView': 'صفحة سياسة الخصوصية وحماية البيانات وحقوق المستخدمين',
  'BottomTerminal': 'لوحة سجلات المطورين وفحص استجابات الشبكة وقاعدة البيانات',
  'PreviewPane': 'لوحة المعاينة اللحظية للمشاريع وتنسيقات الويب',
  'Sidebar': 'الشريط الجانبي لشجرة الملفات وأدوات المشروع',
  'FileTreeItem': 'عنصر في شجرة ملفات المشروع',

  // Modals
  'BatchImportModal': 'نافذة الاستيراد الجماعي للطلاب من Excel أو النصوص أو الصور',
  'SmartCropModal': 'نافذة القص والتدوير الذكي لصور كشوف الدرجات الورقية بالذكاء الاصطناعي',
  'ColumnSettingsModal': 'نافذة ضبط أوزان وعلامات الأعمدة والدرجة التحريرية العظمى',
  'CreateModelModal': 'نافذة إنشاء جدول درجات جديد واختيار المادة والصف والسنة الدراسية',
  'EditModelModal': 'نافذة تعديل مسميات ومعايير جدول الدرجات الحالي',
  'FinalScoreOperationModal': 'نافذة ضبط العمليات الحسابية للدرجة النهائية (جمع أو متوسط أو دمج)',
  'GradeRenameMergeModal': 'نافذة دمج وإعادة تسمية الدرجات والتقييمات المتعددة',
  'RenameColumnsModal': 'نافذة إعادة تسمية أعمدة الاختبارات والنشاطات دفعة واحدة',
  'ScoreRoundingModal': 'نافذة خيارات وقواعد جبر الدرجات والتقريب (لأقرب نصف أو كسر)',
  'TeacherSectionsSwapModal': 'نافذة تبديل وتوزيع الشعب بين المدرسين والمعلمين',
  'AttendanceRecordModal': 'نافذة رصد وحساب أيام الغياب والحضور للطلاب في الشهر',
  'ClassCumulativeAttendanceModal': 'نافذة التقرير التراكمي لغياب وحضور صفوف المدرسة',
  'TermModal': 'نافذة إضافة أو تعديل الفصل الدراسي واختيار الأشهر المحسوبة فيه',
  'PrintSettingsModal': 'نافذة تخصيص إعدادات الطباعة، مقاس الورق (A4/A5) وهوامش الكروت',
  'SingleStudentCardModal': 'نافذة عرض شهادة طالب فردي مفصلة مع زر الطباعة المنفرد',
  'StudentCardModal': 'نافذة معاينة كرت الطالب الشامل مع التفاصيل والتقديرات',
  'TeacherSettingsModal': 'نافذة إعدادات المعلم وبيانات المدرسة والمحافظة والتوقيع',
  'AccountCancelledModal': 'نافذة إشعار إيقاف أو إلغاء الحساب من قِبل إدارة النظام',
  'OfflineVerificationModal': 'نافذة التحقق وإدخال رمز التفعيل بدون اتصال بالإنترنت',
  'RoleSelectionModal': 'نافذة اختيار صفة المستخدم (إدارة مدرسة أو أستاذ مادة)',
  'SubscriptionExpiredModal': 'نافذة انتهاء فترة الاشتراك التجريبي أو الشهري وطرق التجديد',
  'ConfirmDeleteModal': 'نافذة التأكيد الحذر قبل حذف طالب أو نموذج درجات نهائياً',
  'ContactModal': 'نافذة التواصل مع الدعم الفني عبر واتساب والهاتف المباشر',
  'DeleteAccountModal': 'نافذة طلب الحذف الكامل للحساب وتطهير كافة البيانات',
  'ExitSyncModal': 'نافذة تحذير وجود تعديلات غير متزامنة قبل الخروج من التطبيق',
  'PWAInstallModal': 'نافذة توجيه تثبيت التطبيق كـ Progressive Web App',
  'SqlDatabaseModal': 'نافذة إدارة واستعراض جداول قاعدة بيانات SQLite السحابية D1',
  'NewProjectModal': 'نافذة إنشاء ملف أو مشروع جديد في المحرر',
  'SnippetLibraryModal': 'نافذة مكتبة القوالب والنصوص البرمجية الجاهزة',
  'UploadModal': 'نافذة رفع الملفات والمستندات',

  // Cards & Widgets
  'AppLogo': 'شعار التطبيق المتجهي (قبعة التخرج، الأعمدة البيانية، النجمة)',
  'BottomScoreKeypad': 'لوحة مفاتيح الأرقام اللمسية العائمة أسفل الشاشة لإدخال الدرجات بسرعة',
  'ColumnSlantToggle': 'زر تبديل ميلان وتدوير عناوين أعمدة الجدول لسهولة القراءة',
  'ErrorBoundary': 'مكوّن التقاط ومعالجة أخطاء الواجهة البرمجية لمنع انهيار التطبيق',
  'PWAInstallButton': 'زر تثبيت التطبيق في شريط الأدوات العلوي',
  'StudentFloatingCloud': 'زر سحابة التنقل العائمة بين الطلاب في الجدول',
  'SyncStatusBadge': 'شارة حالة المزامنة اللحظية (سحابي / محلي / جاري الحفظ)',
  'TrialBanner': 'شريط الإشعار العلوي للفترة التجريبية المجانية (48 ساعة)',
  'ReportCardItem': 'بطاقة شهادة الطالب الورقية المصممة للطباعة A4/A5',
  'StudentIndividualCardItem': 'عنصر بطاقة الطالب الفردية داخل شبكة الكروت التجاوبية'
};

const components = [];

for (const filePath of files) {
  const fileName = path.basename(filePath, '.tsx');
  const relPath = path.relative(path.join(__dirname, 'daragat-main'), filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract Props interface
  let props = [];
  const propsMatch = content.match(/interface\s+(?:Props|[A-Za-z0-9]+Props)\s*\{([^}]+)\}/);
  if (propsMatch) {
    props = propsMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//') && line.includes(':'))
      .map(line => line.replace(/;$/, ''));
  }

  // Extract state variables
  const stateVars = [];
  const stateRegex = /const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState/g;
  let sMatch;
  while ((sMatch = stateRegex.exec(content)) !== null) {
    stateVars.push(sMatch[1]);
  }

  // Extract hooks
  const hooks = new Set();
  const hookRegex = /\b(use[A-Z][a-zA-Z0-9_]+)\b/g;
  let hMatch;
  while ((hMatch = hookRegex.exec(content)) !== null) {
    hooks.add(hMatch[1]);
  }

  // Extract subcomponents & external dependencies
  const extDeps = new Set();
  const subComponents = new Set();
  const importRegex = /import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  let iMatch;
  while ((iMatch = importRegex.exec(content)) !== null) {
    const importSource = iMatch[3];
    const importedItems = (iMatch[1] || iMatch[2] || '').split(',').map(s => s.trim()).filter(Boolean);

    if (importSource.startsWith('.') || importSource.startsWith('/')) {
      importedItems.forEach(item => {
        if (/^[A-Z]/.test(item) && !item.endsWith('Type') && !item.endsWith('Props') && item !== 'React') {
          subComponents.add(item);
        }
      });
    } else {
      extDeps.add(importSource);
    }
  }

  // Priority classification
  let priority = 3;
  let priorityLabel = 'منخفضة (كروت وعناصر فرعية)';
  let category = 'عنصر واجهة فرعي';

  if (relPath.includes('App.tsx') || relPath.endsWith('View.tsx') || fileName === 'Header' || fileName === 'EditorArea') {
    priority = 1;
    priorityLabel = 'عالية (شاشات وتوجيه أساسي)';
    category = 'شاشة / لوحة رئيسية';
  } else if (fileName.includes('Modal') || fileName.includes('Dialog') || relPath.includes('Modal')) {
    priority = 2;
    priorityLabel = 'متوسطة (نوافذ منبثقة وحوارية)';
    category = 'نافذة منبثقة (Modal)';
  } else {
    priority = 3;
    priorityLabel = 'منخفضة (كروت وعناصر فرعية)';
    category = 'بطاقة / عنصر واجهة';
  }

  components.push({
    name: fileName,
    path: relPath,
    category,
    priority,
    priorityLabel,
    description: componentDescriptions[fileName] || 'مكوّن واجهة في تطبيق درجات',
    propsCount: props.length,
    props,
    stateCount: stateVars.length,
    stateVars,
    hooks: Array.from(hooks),
    subComponents: Array.from(subComponents),
    externalDependencies: Array.from(extDeps),
    suggestedFlutterTarget: getFlutterEquivalent(fileName, category)
  });
}

function getFlutterEquivalent(name, category) {
  if (name === 'App') return 'lib/main.dart & lib/features/home/home_screen.dart';
  if (name.endsWith('View')) return `lib/features/${name.toLowerCase().replace('view', '')}/${name.toLowerCase()}_screen.dart`;
  if (category.includes('Modal')) return `lib/features/common/dialogs/${name.toLowerCase()}.dart (showDialog)`;
  return `lib/features/common/widgets/${name.toLowerCase()}.dart`;
}

// Sort by priority (1 first, then 2, then 3), then by name
components.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

const componentsMap = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "فهرس مكوّنات مشروع درجات (Components Map)",
  "version": "1.0.0",
  "totalComponents": components.length,
  "summary": {
    "priority1Screens": components.filter(c => c.priority === 1).length,
    "priority2Modals": components.filter(c => c.priority === 2).length,
    "priority3CardsAndWidgets": components.filter(c => c.priority === 3).length
  },
  "components": components
};

// Generate Markdown Table
let md = `# فهرس مكوّنات مشروع درجات (Component Inventory)

> إجمالي المكوّنات المفهرسة: **${components.length} مكوّناً**  
> تصنيف الأولويات: **11 شاشة أساسية (أولوية 1)** • **30 نافذة منبثقة (أولوية 2)** • **16 كرت وعنصر واجهة (أولوية 3)**

---

## 1. جدول الحصر الشامل لكافة المكوّنات

| # | اسم المكوّن | النوع | الأولوية | عدد الـ State | عدد الـ Props | المسار في المشروع |
|---|-------------|-------|----------|---------------|---------------|-------------------|
`;

components.forEach((c, idx) => {
  md += `| ${idx + 1} | **${c.name}** | ${c.category} | ${c.priority === 1 ? '🔴 عالية' : (c.priority === 2 ? '🟡 متوسطة' : '🟢 منخفضة')} | ${c.stateCount} | ${c.propsCount} | \`${c.path}\` |\n`;
});

md += `
---

## 2. تفصيل مكوّنات الأولوية 1: الشاشات واللوحات الأساسية (11 مكوّناً)

`;

components.filter(c => c.priority === 1).forEach((c) => {
  const states = c.stateVars.length > 0 ? c.stateVars.map(s => '`' + s + '`').join(', ') : 'بدون State داخلية';
  const subComps = c.subComponents.length > 0 ? c.subComponents.map(s => '`' + s + '`').join(', ') : 'لا يوجد';
  md += `### 🔹 ${c.name} (\`${c.path}\`)
- **الوصف**: ${c.description}
- **الهدف في Flutter**: \`${c.suggestedFlutterTarget}\`
- **حالات الـ State**: ${states}
- **الـ Hooks المستخدمة**: ${c.hooks.length > 0 ? c.hooks.join(', ') : 'لا يوجد'}
- **المكوّنات الفرعية المستدعاة**: ${subComps}
- **التبعيات الخارجية**: ${c.externalDependencies.length > 0 ? c.externalDependencies.join(', ') : 'لا يوجد'}

`;
});

md += `
---

## 3. تفصيل مكوّنات الأولوية 2: النوافذ المنبثقة والحوارية (30 نافذة)

`;

components.filter(c => c.priority === 2).forEach((c) => {
  const states = c.stateVars.length > 0 ? c.stateVars.map(s => '`' + s + '`').join(', ') : 'عديمة الحالة';
  md += `### 🔸 ${c.name} (\`${c.path}\`)
- **الوصف**: ${c.description}
- **الـ Props المستلمة**: ${c.propsCount > 0 ? c.props.slice(0, 5).join('; ') + (c.propsCount > 5 ? ' ...' : '') : 'بدون Props'}
- **حالات الـ State**: ${states}
- **المقابل في Flutter**: \`${c.suggestedFlutterTarget}\`

`;
});

md += `
---

## 4. تفصيل مكوّنات الأولوية 3: الكروت والأدوات التفاعلية (16 مكوّناً)

`;

components.filter(c => c.priority === 3).forEach((c) => {
  md += `### ▫️ ${c.name} (\`${c.path}\`)
- **الوصف**: ${c.description}
- **المقابل في Flutter**: \`${c.suggestedFlutterTarget}\`
- **الـ Props**: ${c.propsCount > 0 ? c.props.join(', ') : 'بدون Props'}

`;
});

const targetDirs = [
  '/home/z/my-project/download',
  'D:/home/z/my-project/download',
  'C:/home/z/my-project/download',
  path.join(__dirname, 'download')
];

for (const d of targetDirs) {
  try {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'components_map.json'), JSON.stringify(componentsMap, null, 2), 'utf8');
    fs.writeFileSync(path.join(d, 'phase3_inventory.md'), md, 'utf8');
    console.log('Saved Phase 3 files to:', d);
  } catch (err) {
    console.log('Could not write to:', d, err.message);
  }
}
