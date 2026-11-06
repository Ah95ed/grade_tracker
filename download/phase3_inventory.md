# فهرس مكوّنات مشروع درجات (Component Inventory)

> إجمالي المكوّنات المفهرسة: **57 مكوّناً**  
> تصنيف الأولويات: **11 شاشة أساسية (أولوية 1)** • **30 نافذة منبثقة (أولوية 2)** • **16 كرت وعنصر واجهة (أولوية 3)**

---

## 1. جدول الحصر الشامل لكافة المكوّنات

| # | اسم المكوّن | النوع | الأولوية | عدد الـ State | عدد الـ Props | المسار في المشروع |
|---|-------------|-------|----------|---------------|---------------|-------------------|
| 1 | **AdminDashboardView** | شاشة / لوحة رئيسية | 🔴 عالية | 14 | 2 | `src/components/Admin/AdminDashboardView.tsx` |
| 2 | **App** | شاشة / لوحة رئيسية | 🔴 عالية | 19 | 0 | `src/App.tsx` |
| 3 | **CleanTableView** | شاشة / لوحة رئيسية | 🔴 عالية | 2 | 14 | `src/components/MonthlySheet/CleanTableView.tsx` |
| 4 | **CleanTermTableView** | شاشة / لوحة رئيسية | 🔴 عالية | 1 | 9 | `src/components/TermCalculation/CleanTermTableView.tsx` |
| 5 | **EditorArea** | شاشة / لوحة رئيسية | 🔴 عالية | 6 | 8 | `src/components/EditorArea.tsx` |
| 6 | **Header** | شاشة / لوحة رئيسية | 🔴 عالية | 5 | 14 | `src/components/Header.tsx` |
| 7 | **InteractiveClassroomView** | شاشة / لوحة رئيسية | 🔴 عالية | 17 | 10 | `src/components/MonthlySheet/InteractiveClassroomView.tsx` |
| 8 | **MonthlySheetView** | شاشة / لوحة رئيسية | 🔴 عالية | 42 | 9 | `src/components/MonthlySheet/MonthlySheetView.tsx` |
| 9 | **PrivacyPolicyView** | شاشة / لوحة رئيسية | 🔴 عالية | 2 | 2 | `src/components/PrivacyPolicy/PrivacyPolicyView.tsx` |
| 10 | **ReportCardsView** | شاشة / لوحة رئيسية | 🔴 عالية | 10 | 5 | `src/components/ReportCards/ReportCardsView.tsx` |
| 11 | **TermCalculationView** | شاشة / لوحة رئيسية | 🔴 عالية | 22 | 10 | `src/components/TermCalculation/TermCalculationView.tsx` |
| 12 | **AccountCancelledModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 6 | `src/components/Auth/AccountCancelledModal.tsx` |
| 13 | **AttendanceRecordModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 7 | `src/components/MonthlySheet/AttendanceRecordModal.tsx` |
| 14 | **BatchImportModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 20 | 7 | `src/components/MonthlySheet/BatchImportModal.tsx` |
| 15 | **ClassCumulativeAttendanceModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 1 | 6 | `src/components/MonthlySheet/ClassCumulativeAttendanceModal.tsx` |
| 16 | **ColumnSettingsModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 9 | 4 | `src/components/MonthlySheet/ColumnSettingsModal.tsx` |
| 17 | **ConfirmDeleteModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 0 | 7 | `src/components/Common/ConfirmDeleteModal.tsx` |
| 18 | **ContactModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 2 | `src/components/Common/ContactModal.tsx` |
| 19 | **CreateModelModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 13 | 8 | `src/components/MonthlySheet/CreateModelModal.tsx` |
| 20 | **DeleteAccountModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 5 | `src/components/Common/DeleteAccountModal.tsx` |
| 21 | **EditModelModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 8 | 14 | `src/components/MonthlySheet/EditModelModal.tsx` |
| 22 | **ExitSyncModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 4 | `src/components/Common/ExitSyncModal.tsx` |
| 23 | **FinalScoreOperationModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 8 | `src/components/MonthlySheet/FinalScoreOperationModal.tsx` |
| 24 | **GradeRenameMergeModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 6 | 10 | `src/components/MonthlySheet/GradeRenameMergeModal.tsx` |
| 25 | **NewProjectModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 3 | 8 | `src/components/NewProjectModal.tsx` |
| 26 | **OfflineVerificationModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 4 | `src/components/Auth/OfflineVerificationModal.tsx` |
| 27 | **PrintSettingsModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 0 | 16 | `src/components/ReportCards/PrintSettingsModal.tsx` |
| 28 | **PWAInstallModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 2 | `src/components/Common/PWAInstallModal.tsx` |
| 29 | **RenameColumnsModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 4 | `src/components/MonthlySheet/RenameColumnsModal.tsx` |
| 30 | **RoleSelectionModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 5 | `src/components/Auth/RoleSelectionModal.tsx` |
| 31 | **ScoreRoundingModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 9 | `src/components/MonthlySheet/ScoreRoundingModal.tsx` |
| 32 | **SingleStudentCardModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 0 | 8 | `src/components/ReportCards/SingleStudentCardModal.tsx` |
| 33 | **SmartCropModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 8 | `src/components/MonthlySheet/SmartCropModal.tsx` |
| 34 | **SnippetLibraryModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 5 | `src/components/SnippetLibraryModal.tsx` |
| 35 | **SqlDatabaseModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 2 | 2 | `src/components/Common/SqlDatabaseModal.tsx` |
| 36 | **StudentCardModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 0 | 8 | `src/components/ReportCards/StudentCardModal.tsx` |
| 37 | **SubscriptionExpiredModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 3 | 6 | `src/components/Auth/SubscriptionExpiredModal.tsx` |
| 38 | **TeacherSectionsSwapModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 7 | 7 | `src/components/MonthlySheet/TeacherSectionsSwapModal.tsx` |
| 39 | **TeacherSettingsModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 1 | 6 | `src/components/TeacherSettingsModal.tsx` |
| 40 | **TermModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 4 | 9 | `src/components/TermCalculation/TermModal.tsx` |
| 41 | **UploadModal** | نافذة منبثقة (Modal) | 🟡 متوسطة | 5 | 6 | `src/components/UploadModal.tsx` |
| 42 | **AppLogo** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 3 | `src/components/Common/AppLogo.tsx` |
| 43 | **AuthScreen** | بطاقة / عنصر واجهة | 🟢 منخفضة | 11 | 4 | `src/components/Auth/AuthScreen.tsx` |
| 44 | **BottomScoreKeypad** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 12 | `src/components/Common/BottomScoreKeypad.tsx` |
| 45 | **BottomTerminal** | بطاقة / عنصر واجهة | 🟢 منخفضة | 8 | 10 | `src/components/BottomTerminal.tsx` |
| 46 | **ClassesSectionsOverview** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 6 | `src/components/MonthlySheet/ClassesSectionsOverview.tsx` |
| 47 | **ColumnSlantToggle** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 4 | `src/components/Common/ColumnSlantToggle.tsx` |
| 48 | **ErrorBoundary** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 2 | `src/components/Common/ErrorBoundary.tsx` |
| 49 | **FileTreeItem** | بطاقة / عنصر واجهة | 🟢 منخفضة | 2 | 9 | `src/components/FileTreeItem.tsx` |
| 50 | **PreviewPane** | بطاقة / عنصر واجهة | 🟢 منخفضة | 2 | 4 | `src/components/PreviewPane.tsx` |
| 51 | **PWAInstallButton** | بطاقة / عنصر واجهة | 🟢 منخفضة | 1 | 2 | `src/components/Common/PWAInstallButton.tsx` |
| 52 | **ReportCardItem** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 11 | `src/components/ReportCards/ReportCardItem.tsx` |
| 53 | **Sidebar** | بطاقة / عنصر واجهة | 🟢 منخفضة | 5 | 12 | `src/components/Sidebar.tsx` |
| 54 | **StudentFloatingCloud** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 4 | `src/components/Common/StudentFloatingCloud.tsx` |
| 55 | **StudentIndividualCardItem** | بطاقة / عنصر واجهة | 🟢 منخفضة | 0 | 9 | `src/components/ReportCards/StudentIndividualCardItem.tsx` |
| 56 | **SyncStatusBadge** | بطاقة / عنصر واجهة | 🟢 منخفضة | 3 | 1 | `src/components/Common/SyncStatusBadge.tsx` |
| 57 | **TrialBanner** | بطاقة / عنصر واجهة | 🟢 منخفضة | 1 | 4 | `src/components/Auth/TrialBanner.tsx` |

---

## 2. تفصيل مكوّنات الأولوية 1: الشاشات واللوحات الأساسية (11 مكوّناً)

### 🔹 AdminDashboardView (`src/components/Admin/AdminDashboardView.tsx`)
- **الوصف**: لوحة تحكم الإدارة لمتابعة المستخدمين والاشتراكات وقاعدة بيانات D1
- **الهدف في Flutter**: `lib/features/admindashboard/admindashboardview_screen.dart`
- **حالات الـ State**: `users`, `admins`, `newAdminEmail`, `adminSuccessMsg`, `adminErrorMsg`, `searchQuery`, `filterType`, `actionNotice`, `isSqlModalOpen`, `isRefreshing`, `syncResult`, `nowTick`, `quickEmail`, `quickPlan`
- **الـ Hooks المستخدمة**: useState, useEffect, useMemo
- **المكوّنات الفرعية المستدعاة**: `SqlDatabaseModal`, `AppUser`, `RemoteUsersResult`, `PRIMARY_ADMIN_EMAIL`, `SUPPORT_PHONE_NUMBER`, `TRIAL_DURATION_MS`, `IRAQ_TIMEZONE`
- **التبعيات الخارجية**: lucide-react, firebase/auth

### 🔹 App (`src/App.tsx`)
- **الوصف**: الجذر الرئيسي للتطبيق وإدارة حالة التبويبات النشطة والمزامنة وعرض النوافذ
- **الهدف في Flutter**: `lib/main.dart & lib/features/home/home_screen.dart`
- **حالات الـ State**: `currentUser`, `hadExpiredNotice`, `isPrivacyPage`, `models`, `terms`, `profile`, `activeTab`, `activeModelId`, `activeTermId`, `hasDismissedProfileModal`, `isProfileModalOpen`, `isSubscriptionModalOpen`, `isRoleModalOpen`, `isRoundingModalOpen`, `toastMessage`, `isOfflineTimeoutModalOpen`, `cancelledAccountInfo`, `isExitSyncModalOpen`, `isLoggingOutSyncing`
- **الـ Hooks المستخدمة**: useState, useEffect, useRef
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `TermModel`, `TeacherProfile`, `RoundingMode`, `DEFAULT_TEACHER_PROFILE`, `AppUser`, `OFFLINE_VERIFICATION_TIMEOUT_MS`, `SUPPORT_PHONE_NUMBER`, `AuthScreen`, `TrialBanner`, `SubscriptionExpiredModal`, `OfflineVerificationModal`, `AccountCancelledModal`, `RoleSelectionModal`, `AdminDashboardView`, `Header`, `MonthlySheetView`, `TermCalculationView`, `ReportCardsView`, `TeacherSettingsModal`, `ScoreRoundingModal`, `PrivacyPolicyView`
- **التبعيات الخارجية**: react, firebase/auth, lucide-react

### 🔹 CleanTableView (`src/components/MonthlySheet/CleanTableView.tsx`)
- **الوصف**: عرض جدول الدرجات الصافي والطباعي الخالي من أدوات التعديل
- **الهدف في Flutter**: `lib/features/cleantable/cleantableview_screen.dart`
- **حالات الـ State**: `activeStudentCloud`, `selectedAttendanceStudent`
- **الـ Hooks المستخدمة**: useState, useEffect, useRef, useMemo
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `StudentRow`, `CustomColumn`, `AttendanceRecord`, `WrittenScoreMode`, `ColumnLabels`, `StudentFloatingCloud`, `ActiveStudentCloudInfo`, `AttendanceRecordModal`
- **التبعيات الخارجية**: lucide-react

### 🔹 CleanTermTableView (`src/components/TermCalculation/CleanTermTableView.tsx`)
- **الوصف**: عرض جدول الفصول والمعدل الصافي المركز بدون أزرار تحكم
- **الهدف في Flutter**: `lib/features/cleantermtable/cleantermtableview_screen.dart`
- **حالات الـ State**: `activeStudentCloud`
- **الـ Hooks المستخدمة**: useState, useEffect, useRef, useMemo
- **المكوّنات الفرعية المستدعاة**: `TermModel`, `MonthlyModel`, `StudentFloatingCloud`, `ActiveStudentCloudInfo`
- **التبعيات الخارجية**: lucide-react

### 🔹 EditorArea (`src/components/EditorArea.tsx`)
- **الوصف**: منطقة العمل الرئيسية وتوجيه الصفحات بين الجدول والمعدل والكروت
- **الهدف في Flutter**: `lib/features/common/widgets/editorarea.dart`
- **حالات الـ State**: `copied`, `showSearch`, `searchQuery`, `replaceQuery`, `cursorPos`, `isEditorFullscreen`
- **الـ Hooks المستخدمة**: useState, useEffect, useRef
- **المكوّنات الفرعية المستدعاة**: `WorkspaceFile`, `EditorSettings`
- **التبعيات الخارجية**: lucide-react, prismjs

### 🔹 Header (`src/components/Header.tsx`)
- **الوصف**: شريط العنوان العلوي الديناميكي، شارة المزامنة السحابية وشعار المدرسة
- **الهدف في Flutter**: `lib/features/common/widgets/header.dart`
- **حالات الـ State**: `isMenuOpen`, `isResetModalOpen`, `isDeleteAccountModalOpen`, `isContactModalOpen`, `isInstallModalOpen`
- **الـ Hooks المستخدمة**: useRef, useState, useEffect, usePWAInstall
- **المكوّنات الفرعية المستدعاة**: `TeacherProfile`, `AppUser`, `ConfirmDeleteModal`, `DeleteAccountModal`, `ContactModal`, `SyncStatusBadge`, `PWAInstallButton`, `PWAInstallModal`, `AppLogo`
- **التبعيات الخارجية**: lucide-react

### 🔹 InteractiveClassroomView (`src/components/MonthlySheet/InteractiveClassroomView.tsx`)
- **الوصف**: واجهة الفصل التفاعلية لإدخال الدرجات بطريقة شبكة المقاعد
- **الهدف في Flutter**: `lib/features/interactiveclassroom/interactiveclassroomview_screen.dart`
- **حالات الـ State**: `activeTab`, `searchQuery`, `session`, `selectedParticipationColId`, `selectedOralColId`, `columnAlert`, `createColModal`, `confirmResetOpen`, `isSyncModalOpen`, `syncTargetColId`, `newSyncColName`, `syncColMaxScore`, `syncSuccessMsg`, `oralFilter`, `gradingStudent`, `gradingScoreInput`, `randomStudentHighlight`
- **الـ Hooks المستخدمة**: useState, useEffect, useMemo, useInstitutionTerms
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `StudentRow`, `ParticipationRecord`
- **التبعيات الخارجية**: lucide-react

### 🔹 MonthlySheetView (`src/components/MonthlySheet/MonthlySheetView.tsx`)
- **الوصف**: الشاشة الأساسية لإدارة وعرض جدول الدرجات الشهرية والطلاب
- **الهدف في Flutter**: `lib/features/monthlysheet/monthlysheetview_screen.dart`
- **حالات الـ State**: `isBatchImportOpen`, `isCreateModelOpen`, `editingModelForRename`, `isSectionsSwapOpen`, `swapInitialGrade`, `swapInitialSubject`, `selectedGradeFilter`, `selectedSubjectFilter`, `isAddingColumn`, `newColName`, `newColMax`, `isAttendanceMode`, `attendanceAffectsGrade`, `presentAction`, `presentPoints`, `excusedAction`, `excusedPoints`, `absentAction`, `absentPoints`, `attendanceCrossMonthMode`, `selectedPriorModelIds`, `selectedStudentForAttendance`, `isClassCumulativeAttendanceOpen`, `isRoundingModalOpen`, `isFinalOperationModalOpen`, `viewMode`, `isCleanTableView`, `searchQuery`, `selectedGradeLevel`, `selectedSection`, `managingGrade`, `columnSlants`, `activeStudentCloud`, `isNameColumnVisible`, `isTableScrolledIntoView`, `confirmDelete`, `actionPrompt`, `newlyCreatedModel`, `isRenameColumnsModalOpen`, `editingColumnKey`, `inlineEditValue`, `showRatingColumn`
- **الـ Hooks المستخدمة**: useState, useEffect, useMemo, useRef, useCallback
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `StudentRow`, `CustomColumn`, `TeacherProfile`, `RoundingMode`, `WrittenScoreMode`, `ColumnLabels`, `FinalScoreOperation`, `AttendanceRecord`, `AttendanceColumnConfig`, `InteractiveClassroomView`, `CleanTableView`, `GradeRenameMergeModal`, `BatchImportModal`, `CreateModelModal`, `EditModelModal`, `TeacherSectionsSwapModal`, `ConfirmDeleteModal`, `ScoreRoundingModal`, `RenameColumnsModal`, `FinalScoreOperationModal`, `AttendanceRecordModal`, `ClassCumulativeAttendanceModal`, `StudentFloatingCloud`, `ActiveStudentCloudInfo`, `ColumnSlant`, `SlantButton`, `AppUser`
- **التبعيات الخارجية**: lucide-react

### 🔹 PrivacyPolicyView (`src/components/PrivacyPolicy/PrivacyPolicyView.tsx`)
- **الوصف**: صفحة سياسة الخصوصية وحماية البيانات وحقوق المستخدمين
- **الهدف في Flutter**: `lib/features/privacypolicy/privacypolicyview_screen.dart`
- **حالات الـ State**: `copiedType`, `isMobileDevice`
- **الـ Hooks المستخدمة**: useState, useEffect
- **المكوّنات الفرعية المستدعاة**: `AppLogo`, `AppUser`
- **التبعيات الخارجية**: lucide-react

### 🔹 ReportCardsView (`src/components/ReportCards/ReportCardsView.tsx`)
- **الوصف**: شاشة استعراض كروت وشهادات الطلاب وإعدادات الطباعة المدرسية
- **الهدف في Flutter**: `lib/features/reportcards/reportcardsview_screen.dart`
- **حالات الـ State**: `cardGroupingMode`, `searchQuery`, `selectedSection`, `selectedGradeLevel`, `selectedSubjectFilter`, `viewMode`, `isPrintSettingsOpen`, `selectedCardForModal`, `selectedStudentForModal`, `printSettings`
- **الـ Hooks المستخدمة**: useState, useMemo
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `TermModel`, `TeacherProfile`, `StudentSimpleCard`, `ClassSectionCard`, `PrintSettings`, `ReportCardItem`, `StudentCardModal`, `PrintSettingsModal`, `StudentIndividualCardItem`, `StudentCardData`, `StudentSubjectScoreDetail`, `SingleStudentCardModal`
- **التبعيات الخارجية**: lucide-react

### 🔹 TermCalculationView (`src/components/TermCalculation/TermCalculationView.tsx`)
- **الوصف**: شاشة حساب المعدلات الفصلية والنهائية والإحصائيات التراكمية
- **الهدف في Flutter**: `lib/features/termcalculation/termcalculationview_screen.dart`
- **حالات الـ State**: `searchQuery`, `selectedGradeLevel`, `selectedSection`, `isCleanTableView`, `columnSlants`, `activeStudentCloud`, `isNameColumnVisible`, `isAddingNewTerm`, `newTermName`, `newTermGrade`, `newTermSubject`, `newTermTeacher`, `newTermSections`, `isDeleteModalOpen`, `isRoundingModalOpen`, `showRatingColumn`, `isEditingTermName`, `editTermNameValue`, `editTermGradeValue`, `editTermSubjectValue`, `editTermTeacherValue`, `editTermSectionsValue`
- **الـ Hooks المستخدمة**: useState, useMemo, useEffect, useRef, useCallback
- **المكوّنات الفرعية المستدعاة**: `MonthlyModel`, `TermModel`, `TeacherProfile`, `RoundingMode`, `STANDARD_GRADE_LEVELS`, `CleanTermTableView`, `ConfirmDeleteModal`, `ScoreRoundingModal`, `StudentFloatingCloud`, `ActiveStudentCloudInfo`, `ColumnSlant`, `SlantButton`, `AppUser`
- **التبعيات الخارجية**: lucide-react


---

## 3. تفصيل مكوّنات الأولوية 2: النوافذ المنبثقة والحوارية (30 نافذة)

### 🔸 AccountCancelledModal (`src/components/Auth/AccountCancelledModal.tsx`)
- **الوصف**: نافذة إشعار إيقاف أو إلغاء الحساب من قِبل إدارة النظام
- **الـ Props المستلمة**: isOpen: boolean; message?: string; onLogout?: () => void; onSwitchAccount?: () => void; onRecheck?: () => Promise<void> | void ...
- **حالات الـ State**: `isChecking`, `checkStatus`
- **المقابل في Flutter**: `lib/features/common/dialogs/accountcancelledmodal.dart (showDialog)`

### 🔸 AttendanceRecordModal (`src/components/MonthlySheet/AttendanceRecordModal.tsx`)
- **الوصف**: نافذة رصد وحساب أيام الغياب والحضور للطلاب في الشهر
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; student: StudentRow; column: CustomColumn; model: MonthlyModel ...
- **حالات الـ State**: `activeTab`, `selectedDay`, `selectedDate`, `note`
- **المقابل في Flutter**: `lib/features/common/dialogs/attendancerecordmodal.dart (showDialog)`

### 🔸 BatchImportModal (`src/components/MonthlySheet/BatchImportModal.tsx`)
- **الوصف**: نافذة الاستيراد الجماعي للطلاب من Excel أو النصوص أو الصور
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; onImport: (; students: Partial<StudentRow>[],; options?: { ...
- **حالات الـ State**: `savedCustomSections`, `activeTab`, `namesText`, `gradeLevel`, `isCustomGrade`, `gradeValidationError`, `section`, `images`, `isProcessing`, `errorMessage`, `isPrepaymentError`, `extractedStudents`, `detectedColumns`, `columnMappings`, `hasExtracted`, `updateExisting`, `autoAddColumns`, `trialCount`, `isCropOpen`, `cropImageIndex`
- **المقابل في Flutter**: `lib/features/common/dialogs/batchimportmodal.dart (showDialog)`

### 🔸 ClassCumulativeAttendanceModal (`src/components/MonthlySheet/ClassCumulativeAttendanceModal.tsx`)
- **الوصف**: نافذة التقرير التراكمي لغياب وحضور صفوف المدرسة
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; currentModel: MonthlyModel; allModels: MonthlyModel[]; selectedGradeLevel?: string ...
- **حالات الـ State**: `search`
- **المقابل في Flutter**: `lib/features/common/dialogs/classcumulativeattendancemodal.dart (showDialog)`

### 🔸 ColumnSettingsModal (`src/components/MonthlySheet/ColumnSettingsModal.tsx`)
- **الوصف**: نافذة ضبط أوزان وعلامات الأعمدة والدرجة التحريرية العظمى
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; model: MonthlyModel; onSave: (updated: Partial<MonthlyModel>) => void
- **حالات الـ State**: `writtenWeight`, `writtenMaxScore`, `writtenScoreMode`, `totalMaxScore`, `customColumns`, `roundingMode`, `roundingThreshold`, `newColName`, `newColMaxScore`
- **المقابل في Flutter**: `lib/features/common/dialogs/columnsettingsmodal.dart (showDialog)`

### 🔸 ConfirmDeleteModal (`src/components/Common/ConfirmDeleteModal.tsx`)
- **الوصف**: نافذة التأكيد الحذر قبل حذف طالب أو نموذج درجات نهائياً
- **الـ Props المستلمة**: isOpen: boolean; title: string; message: string; confirmText?: string; cancelText?: string ...
- **حالات الـ State**: عديمة الحالة
- **المقابل في Flutter**: `lib/features/common/dialogs/confirmdeletemodal.dart (showDialog)`

### 🔸 ContactModal (`src/components/Common/ContactModal.tsx`)
- **الوصف**: نافذة التواصل مع الدعم الفني عبر واتساب والهاتف المباشر
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void
- **حالات الـ State**: `copiedType`, `isMobileDevice`
- **المقابل في Flutter**: `lib/features/common/dialogs/contactmodal.dart (showDialog)`

### 🔸 CreateModelModal (`src/components/MonthlySheet/CreateModelModal.tsx`)
- **الوصف**: نافذة إنشاء جدول درجات جديد واختيار المادة والصف والسنة الدراسية
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; currentModel?: MonthlyModel; allModels: MonthlyModel[]; onCreate: (newModel: MonthlyModel) => void ...
- **حالات الـ State**: `modelName`, `totalMaxInput`, `subjectName`, `gradeLevelInput`, `showValidation`, `customSubjects`, `newSubjectInput`, `showAddSubjectInput`, `teacherNameInput`, `selectedSections`, `customSectionsList`, `newSectionInput`, `showAddSectionInput`
- **المقابل في Flutter**: `lib/features/common/dialogs/createmodelmodal.dart (showDialog)`

### 🔸 DeleteAccountModal (`src/components/Common/DeleteAccountModal.tsx`)
- **الوصف**: نافذة طلب الحذف الكامل للحساب وتطهير كافة البيانات
- **الـ Props المستلمة**: isOpen: boolean; userEmail: string; userName?: string; onConfirm: () => Promise<void> | void; onCancel: () => void
- **حالات الـ State**: `isDeleting`, `confirmedCheck`
- **المقابل في Flutter**: `lib/features/common/dialogs/deleteaccountmodal.dart (showDialog)`

### 🔸 EditModelModal (`src/components/MonthlySheet/EditModelModal.tsx`)
- **الوصف**: نافذة تعديل مسميات ومعايير جدول الدرجات الحالي
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; model: MonthlyModel | null; onSave: (; modelId: string, ...
- **حالات الـ State**: `name`, `subject`, `gradeLevel`, `teacherName`, `selectedSections`, `customSectionsList`, `newSectionInput`, `showAddSectionInput`
- **المقابل في Flutter**: `lib/features/common/dialogs/editmodelmodal.dart (showDialog)`

### 🔸 ExitSyncModal (`src/components/Common/ExitSyncModal.tsx`)
- **الوصف**: نافذة تحذير وجود تعديلات غير متزامنة قبل الخروج من التطبيق
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; onConfirmSyncAndExit: () => Promise<void>; onExitWithoutSync: () => void
- **حالات الـ State**: `isSyncing`, `syncFeedback`
- **المقابل في Flutter**: `lib/features/common/dialogs/exitsyncmodal.dart (showDialog)`

### 🔸 FinalScoreOperationModal (`src/components/MonthlySheet/FinalScoreOperationModal.tsx`)
- **الوصف**: نافذة ضبط العمليات الحسابية للدرجة النهائية (جمع أو متوسط أو دمج)
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; currentOperation?: FinalScoreOperation; totalMaxScore: number; modelName: string ...
- **حالات الـ State**: `selectedType`, `value`, `applyScope`, `testScore`
- **المقابل في Flutter**: `lib/features/common/dialogs/finalscoreoperationmodal.dart (showDialog)`

### 🔸 GradeRenameMergeModal (`src/components/MonthlySheet/GradeRenameMergeModal.tsx`)
- **الوصف**: نافذة دمج وإعادة تسمية الدرجات والتقييمات المتعددة
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; currentGrade: string; allGrades: string[]; currentSections: string[] ...
- **حالات الـ State**: `activeTab`, `newGradeName`, `selectedTargetGrade`, `isConfirmingMerge`, `editingSection`, `newSectionName`
- **المقابل في Flutter**: `lib/features/common/dialogs/graderenamemergemodal.dart (showDialog)`

### 🔸 NewProjectModal (`src/components/NewProjectModal.tsx`)
- **الوصف**: نافذة إنشاء ملف أو مشروع جديد في المحرر
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; projects: Project[]; activeProjectId: string; onSelectProject: (id: string) => void ...
- **حالات الـ State**: `isCreatingNew`, `newProjectName`, `selectedTemplate`
- **المقابل في Flutter**: `lib/features/common/dialogs/newprojectmodal.dart (showDialog)`

### 🔸 OfflineVerificationModal (`src/components/Auth/OfflineVerificationModal.tsx`)
- **الوصف**: نافذة التحقق وإدخال رمز التفعيل بدون اتصال بالإنترنت
- **الـ Props المستلمة**: isOpen: boolean; onRecheck: () => Promise<void>; onLogout: () => void; userEmail?: string
- **حالات الـ State**: `isChecking`, `errorMsg`
- **المقابل في Flutter**: `lib/features/common/dialogs/offlineverificationmodal.dart (showDialog)`

### 🔸 PrintSettingsModal (`src/components/ReportCards/PrintSettingsModal.tsx`)
- **الوصف**: نافذة تخصيص إعدادات الطباعة، مقاس الورق (A4/A5) وهوامش الكروت
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; settings: PrintSettings; onUpdateSettings: (newSettings: PrintSettings) => void; profile: TeacherProfile ...
- **حالات الـ State**: عديمة الحالة
- **المقابل في Flutter**: `lib/features/common/dialogs/printsettingsmodal.dart (showDialog)`

### 🔸 PWAInstallModal (`src/components/Common/PWAInstallModal.tsx`)
- **الوصف**: نافذة توجيه تثبيت التطبيق كـ Progressive Web App
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void
- **حالات الـ State**: `activeTab`, `installSuccess`
- **المقابل في Flutter**: `lib/features/common/dialogs/pwainstallmodal.dart (showDialog)`

### 🔸 RenameColumnsModal (`src/components/MonthlySheet/RenameColumnsModal.tsx`)
- **الوصف**: نافذة إعادة تسمية أعمدة الاختبارات والنشاطات دفعة واحدة
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; model: MonthlyModel; onSave: (newLabels: ColumnLabels, updatedCustomColumns: CustomColumn[]) => void
- **حالات الـ State**: `labels`, `customCols`
- **المقابل في Flutter**: `lib/features/common/dialogs/renamecolumnsmodal.dart (showDialog)`

### 🔸 RoleSelectionModal (`src/components/Auth/RoleSelectionModal.tsx`)
- **الوصف**: نافذة اختيار صفة المستخدم (إدارة مدرسة أو أستاذ مادة)
- **الـ Props المستلمة**: isOpen: boolean; currentUser: AppUser; onRoleSelected: (updatedUser: AppUser) => void; onLogout: () => void; onClose?: () => void
- **حالات الـ State**: `isOnline`, `selectedChoice`, `isSubmitting`, `errorMessage`
- **المقابل في Flutter**: `lib/features/common/dialogs/roleselectionmodal.dart (showDialog)`

### 🔸 ScoreRoundingModal (`src/components/MonthlySheet/ScoreRoundingModal.tsx`)
- **الوصف**: نافذة خيارات وقواعد جبر الدرجات والتقريب (لأقرب نصف أو كسر)
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; currentMode: RoundingMode; currentThreshold?: number; modelName: string ...
- **حالات الـ State**: `mode`, `threshold`, `applyScope`, `testScore`
- **المقابل في Flutter**: `lib/features/common/dialogs/scoreroundingmodal.dart (showDialog)`

### 🔸 SingleStudentCardModal (`src/components/ReportCards/SingleStudentCardModal.tsx`)
- **الوصف**: نافذة عرض شهادة طالب فردي مفصلة مع زر الطباعة المنفرد
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; studentCard: StudentCardData | null; terms: TermModel[]; profile: TeacherProfile ...
- **حالات الـ State**: عديمة الحالة
- **المقابل في Flutter**: `lib/features/common/dialogs/singlestudentcardmodal.dart (showDialog)`

### 🔸 SmartCropModal (`src/components/MonthlySheet/SmartCropModal.tsx`)
- **الوصف**: نافذة القص والتدوير الذكي لصور كشوف الدرجات الورقية بالذكاء الاصطناعي
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; images: ImageUploadItem[]; activeImageIndex?: number; onApplyCrop: ( ...
- **حالات الـ State**: `currentIdx`, `rotation`, `crop`, `activeHandle`
- **المقابل في Flutter**: `lib/features/common/dialogs/smartcropmodal.dart (showDialog)`

### 🔸 SnippetLibraryModal (`src/components/SnippetLibraryModal.tsx`)
- **الوصف**: نافذة مكتبة القوالب والنصوص البرمجية الجاهزة
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; onInsertSnippet: (code: string) => void; onCreateFileWithSnippet: (fileName: string, code: string) => void; settings: EditorSettings
- **حالات الـ State**: `selectedCategory`, `copiedId`
- **المقابل في Flutter**: `lib/features/common/dialogs/snippetlibrarymodal.dart (showDialog)`

### 🔸 SqlDatabaseModal (`src/components/Common/SqlDatabaseModal.tsx`)
- **الوصف**: نافذة إدارة واستعراض جداول قاعدة بيانات SQLite السحابية D1
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void
- **حالات الـ State**: `selectedEngine`, `copied`
- **المقابل في Flutter**: `lib/features/common/dialogs/sqldatabasemodal.dart (showDialog)`

### 🔸 StudentCardModal (`src/components/ReportCards/StudentCardModal.tsx`)
- **الوصف**: نافذة معاينة كرت الطالب الشامل مع التفاصيل والتقديرات
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; classCard: ClassSectionCard | null; terms: TermModel[]; profile: TeacherProfile ...
- **حالات الـ State**: عديمة الحالة
- **المقابل في Flutter**: `lib/features/common/dialogs/studentcardmodal.dart (showDialog)`

### 🔸 SubscriptionExpiredModal (`src/components/Auth/SubscriptionExpiredModal.tsx`)
- **الوصف**: نافذة انتهاء فترة الاشتراك التجريبي أو الشهري وطرق التجديد
- **الـ Props المستلمة**: isOpen: boolean; onClose?: () => void; user: AppUser; onLogout: () => void; canDismiss?: boolean ...
- **حالات الـ State**: `isChecking`, `checkStatusMsg`, `isMobileDevice`
- **المقابل في Flutter**: `lib/features/common/dialogs/subscriptionexpiredmodal.dart (showDialog)`

### 🔸 TeacherSectionsSwapModal (`src/components/MonthlySheet/TeacherSectionsSwapModal.tsx`)
- **الوصف**: نافذة تبديل وتوزيع الشعب بين المدرسين والمعلمين
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; allModels: MonthlyModel[]; onUpdateAllModels?: (updatedModels: MonthlyModel[]) => void; initialGrade?: string ...
- **حالات الـ State**: `selectedGrade`, `selectedSubject`, `teacherSectionsMap`, `customSectionsList`, `newSectionInput`, `showAddSectionInput`, `successNotice`
- **المقابل في Flutter**: `lib/features/common/dialogs/teachersectionsswapmodal.dart (showDialog)`

### 🔸 TeacherSettingsModal (`src/components/TeacherSettingsModal.tsx`)
- **الوصف**: نافذة إعدادات المعلم وبيانات المدرسة والمحافظة والتوقيع
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; profile: TeacherProfile; onSave: (updated: TeacherProfile) => void; currentUser?: AppUser | null ...
- **حالات الـ State**: `formData`
- **المقابل في Flutter**: `lib/features/common/dialogs/teachersettingsmodal.dart (showDialog)`

### 🔸 TermModal (`src/components/TermCalculation/TermModal.tsx`)
- **الوصف**: نافذة إضافة أو تعديل الفصل الدراسي واختيار الأشهر المحسوبة فيه
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; mode: 'create' | 'edit'; initialName?: string; initialSubject?: string ...
- **حالات الـ State**: `termName`, `subject`, `gradeLevel`, `showValidation`
- **المقابل في Flutter**: `lib/features/common/dialogs/termmodal.dart (showDialog)`

### 🔸 UploadModal (`src/components/UploadModal.tsx`)
- **الوصف**: نافذة رفع الملفات والمستندات
- **الـ Props المستلمة**: isOpen: boolean; onClose: () => void; onFilesSelected: (files: FileList | File[]) => void; onZipSelected: (file: File) => void; onRawCodeSubmit: (fileName: string, code: string) => void ...
- **حالات الـ State**: `activeTab`, `pasteFileName`, `pasteContent`, `isDragOver`, `statusMessage`
- **المقابل في Flutter**: `lib/features/common/dialogs/uploadmodal.dart (showDialog)`


---

## 4. تفصيل مكوّنات الأولوية 3: الكروت والأدوات التفاعلية (16 مكوّناً)

### ▫️ AppLogo (`src/components/Common/AppLogo.tsx`)
- **الوصف**: شعار التطبيق المتجهي (قبعة التخرج، الأعمدة البيانية، النجمة)
- **المقابل في Flutter**: `lib/features/common/widgets/applogo.dart`
- **الـ Props**: className?: string, size?: number | string, alt?: string

### ▫️ AuthScreen (`src/components/Auth/AuthScreen.tsx`)
- **الوصف**: شاشة تسجيل الدخول وإنشاء الحساب وحسابات Google وكلمة المرور
- **المقابل في Flutter**: `lib/features/common/widgets/authscreen.dart`
- **الـ Props**: onLoginSuccess: (user: AppUser, isTrial: boolean) => void, expiredNotice?: boolean, onOpenPrivacy?: () => void, onAccountCancelled?: (email: string, message?: string) => void

### ▫️ BottomScoreKeypad (`src/components/Common/BottomScoreKeypad.tsx`)
- **الوصف**: لوحة مفاتيح الأرقام اللمسية العائمة أسفل الشاشة لإدخال الدرجات بسرعة
- **المقابل في Flutter**: `lib/features/common/widgets/bottomscorekeypad.dart`
- **الـ Props**: isOpen: boolean, studentName: string, studentSection?: string, columnName: string, maxScore: number, currentValue: string, onValueChange: (newValue: string) => void, onNextStudent?: () => void, onPrevStudent?: () => void, hasNextStudent?: boolean, hasPrevStudent?: boolean, onClose: () => void

### ▫️ BottomTerminal (`src/components/BottomTerminal.tsx`)
- **الوصف**: لوحة سجلات المطورين وفحص استجابات الشبكة وقاعدة البيانات
- **المقابل في Flutter**: `lib/features/common/widgets/bottomterminal.dart`
- **الـ Props**: logs: ConsoleLog[], files: WorkspaceFile[], settings: EditorSettings, isOpen: boolean, onToggleOpen: () => void, onClearLogs: () => void, onRunActiveCode: () => void, onCreateFile: (name: string, parentId: string | null) => void, onDeleteFile: (fileId: string) => void, onExportZip: () => void

### ▫️ ClassesSectionsOverview (`src/components/MonthlySheet/ClassesSectionsOverview.tsx`)
- **الوصف**: نظرة شاملة وسريعة على الصفوف والشعب المدرسية والطلاب
- **المقابل في Flutter**: `lib/features/common/widgets/classessectionsoverview.dart`
- **الـ Props**: model: MonthlyModel, onSelectClassAndSection: (gradeLevel: string, section: string | 'ALL') => void, onOpenBatchImport: () => void, onOpenManageGrade: (gradeLevel: string) => void, onViewAllTable: () => void, onOpenSectionsSwap?: (gradeLevel: string) => void

### ▫️ ColumnSlantToggle (`src/components/Common/ColumnSlantToggle.tsx`)
- **الوصف**: زر تبديل ميلان وتدوير عناوين أعمدة الجدول لسهولة القراءة
- **المقابل في Flutter**: `lib/features/common/widgets/columnslanttoggle.dart`
- **الـ Props**: slant: ColumnSlant | undefined, onToggle: () => void, title?: string, className?: string

### ▫️ ErrorBoundary (`src/components/Common/ErrorBoundary.tsx`)
- **الوصف**: مكوّن التقاط ومعالجة أخطاء الواجهة البرمجية لمنع انهيار التطبيق
- **المقابل في Flutter**: `lib/features/common/widgets/errorboundary.dart`
- **الـ Props**: children: ReactNode, fallback?: ReactNode

### ▫️ FileTreeItem (`src/components/FileTreeItem.tsx`)
- **الوصف**: عنصر في شجرة ملفات المشروع
- **المقابل في Flutter**: `lib/features/common/widgets/filetreeitem.dart`
- **الـ Props**: file: WorkspaceFile, level: number, isActive: boolean, onSelect: (file: WorkspaceFile) => void, onToggleFolder: (fileId: string) => void, onRename: (fileId: string, newName: string) => void, onDelete: (fileId: string) => void, onDuplicate: (file: WorkspaceFile) => void, onDownload: (file: WorkspaceFile) => void

### ▫️ PreviewPane (`src/components/PreviewPane.tsx`)
- **الوصف**: لوحة المعاينة اللحظية للمشاريع وتنسيقات الويب
- **المقابل في Flutter**: `lib/features/common/widgets/previewpane.dart`
- **الـ Props**: files: WorkspaceFile[], activeFile: WorkspaceFile | null, settings: EditorSettings, onReceiveIframeConsole: (level: string, message: string) => void

### ▫️ PWAInstallButton (`src/components/Common/PWAInstallButton.tsx`)
- **الوصف**: زر تثبيت التطبيق في شريط الأدوات العلوي
- **المقابل في Flutter**: `lib/features/common/widgets/pwainstallbutton.dart`
- **الـ Props**: variant?: 'icon' | 'menu-item', onAfterClick?: () => void

### ▫️ ReportCardItem (`src/components/ReportCards/ReportCardItem.tsx`)
- **الوصف**: بطاقة شهادة الطالب الورقية المصممة للطباعة A4/A5
- **المقابل في Flutter**: `lib/features/common/widgets/reportcarditem.dart`
- **الـ Props**: classCard: ClassSectionCard, terms: TermModel[], profile: TeacherProfile, academicYear?: string, subject?: string, onPreview?: () => void, onPrint?: () => void, onExportExcel?: () => void, isPrintMode?: boolean, printSettings?: PrintSettings, searchQuery?: string

### ▫️ Sidebar (`src/components/Sidebar.tsx`)
- **الوصف**: الشريط الجانبي لشجرة الملفات وأدوات المشروع
- **المقابل في Flutter**: `lib/features/common/widgets/sidebar.dart`
- **الـ Props**: files: WorkspaceFile[], activeFileId: string | null, settings: EditorSettings, onSelectFile: (file: WorkspaceFile) => void, onCreateFile: (name: string, parentId: string | null) => void, onCreateFolder: (name: string, parentId: string | null) => void, onRenameFile: (fileId: string, newName: string) => void, onDeleteFile: (fileId: string) => void, onDuplicateFile: (file: WorkspaceFile) => void, onDownloadFile: (file: WorkspaceFile) => void, onTriggerUploadModal: () => void, onFilesDropped: (files: FileList) => void

### ▫️ StudentFloatingCloud (`src/components/Common/StudentFloatingCloud.tsx`)
- **الوصف**: زر سحابة التنقل العائمة بين الطلاب في الجدول
- **المقابل في Flutter**: `lib/features/common/widgets/studentfloatingcloud.dart`
- **الـ Props**: info: ActiveStudentCloudInfo | null, isOpen: boolean, onClose: () => void, zIndexClass?: string

### ▫️ StudentIndividualCardItem (`src/components/ReportCards/StudentIndividualCardItem.tsx`)
- **الوصف**: عنصر بطاقة الطالب الفردية داخل شبكة الكروت التجاوبية
- **المقابل في Flutter**: `lib/features/common/widgets/studentindividualcarditem.dart`
- **الـ Props**: studentCard: StudentCardData, terms: TermModel[], profile: TeacherProfile, academicYear?: string, onPreview?: () => void, onPrint?: () => void, isPrintMode?: boolean, printSettings?: PrintSettings, isAdministration?: boolean

### ▫️ SyncStatusBadge (`src/components/Common/SyncStatusBadge.tsx`)
- **الوصف**: شارة حالة المزامنة اللحظية (سحابي / محلي / جاري الحفظ)
- **المقابل في Flutter**: `lib/features/common/widgets/syncstatusbadge.dart`
- **الـ Props**: userUid?: string

### ▫️ TrialBanner (`src/components/Auth/TrialBanner.tsx`)
- **الوصف**: شريط الإشعار العلوي للفترة التجريبية المجانية (48 ساعة)
- **المقابل في Flutter**: `lib/features/common/widgets/trialbanner.dart`
- **الـ Props**: user: AppUser, onLogout: () => void, onExpire: () => void, onOpenSubscriptionModal?: () => void

