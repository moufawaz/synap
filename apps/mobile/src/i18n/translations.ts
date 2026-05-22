export type Language = 'en' | 'ar'

export type TranslationMap = {
  appName: string
  loginTitle: string
  loginSubtitle: string
  email: string
  password: string
  login: string
  signup: string
  createAccount: string
  forgotPassword: string
  sendResetLink: string
  haveAccount: string
  needAccount: string
  logout: string
  dashboard: string
  chat: string
  train: string
  nutrition: string
  progress: string
  more: string
  launchAccess: string
  askIon: string
  todayWorkout: string
  todaysMeals: string
  comingNext: string
  preferences: string
  rebuildPlan: string
  appleHealth: string
  connectAppleHealth: string
  healthSubtitle: string
  theme: string
  noWorkoutPlan: string
  finishOnboarding: string
  restDay: string
  recoveryNote: string
  finishWorkout: string
  saving: string
  noWeightYet: string
  quickLog: string
  saveMeasurement: string
  analyzeInBody: string
  scanFoodPhoto: string
  logFood: string
  saveChanges: string
  shareProgressCard: string
  privacy: string
  terms: string
  support: string
  deleteAccount: string
  deleteAccountConfirm: string
  deleteAccountFailed: string
  cancel: string
}

export const t: Record<Language, TranslationMap> = {
  en: {
    appName: 'SYNAP',
    loginTitle: 'Welcome back',
    loginSubtitle: 'Ion is ready to continue your coaching.',
    email: 'Email',
    password: 'Password',
    login: 'Log in',
    signup: 'Sign up',
    createAccount: 'Create account',
    forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset link',
    haveAccount: 'Already have an account?',
    needAccount: 'Need an account?',
    logout: 'Log out',
    dashboard: 'Home',
    chat: 'Chat',
    train: 'Train',
    nutrition: 'Nutrition',
    progress: 'Progress',
    more: 'More',
    launchAccess: 'Your current subscription controls access to premium coaching features.',
    askIon: 'Ask Ion anything...',
    todayWorkout: "Today's workout",
    todaysMeals: "Today's meals",
    comingNext: 'Ready for review',
    preferences: 'Preferences',
    rebuildPlan: 'Rebuild plan',
    appleHealth: 'Apple Health',
    connectAppleHealth: 'Connect Apple Health',
    healthSubtitle: 'Connect HealthKit so Ion can read steps, active calories, body weight, body fat, and resting heart rate.',
    theme: 'Theme',
    noWorkoutPlan: 'No workout plan yet',
    finishOnboarding: 'Finish onboarding or ask Ion to create a workout plan.',
    restDay: 'Rest day',
    recoveryNote: 'Sleep, hydrate, and keep the nutrition plan steady.',
    finishWorkout: 'Finish and log workout',
    saving: 'Saving...',
    noWeightYet: 'No weight yet',
    quickLog: 'Quick log',
    saveMeasurement: 'Save measurement',
    analyzeInBody: 'Analyze InBody photo',
    scanFoodPhoto: 'Scan food photo',
    logFood: 'Log food',
    saveChanges: 'Save changes',
    shareProgressCard: 'Share progress card',
    privacy: 'Privacy Policy',
    terms: 'Terms',
    support: 'Support',
    deleteAccount: 'Delete account',
    deleteAccountConfirm: 'This permanently deletes your account and fitness data. This cannot be undone.',
    deleteAccountFailed: 'Could not delete your account. Please contact support.',
    cancel: 'Cancel',
  },
  ar: {
    appName: 'سيناب',
    loginTitle: 'مرحباً بعودتك',
    loginSubtitle: 'آيون جاهز لإكمال تدريبك.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    createAccount: 'إنشاء حساب',
    forgotPassword: 'نسيت كلمة المرور؟',
    sendResetLink: 'إرسال رابط إعادة التعيين',
    haveAccount: 'لديك حساب بالفعل؟',
    needAccount: 'تحتاج إلى حساب؟',
    logout: 'تسجيل الخروج',
    dashboard: 'الرئيسية',
    chat: 'المحادثة',
    train: 'التمرين',
    nutrition: 'التغذية',
    progress: 'التقدم',
    more: 'المزيد',
    launchAccess: 'اشتراكك الحالي يحدد الوصول إلى ميزات التدريب المدفوعة.',
    askIon: 'اسأل آيون أي شيء...',
    todayWorkout: 'تمرين اليوم',
    todaysMeals: 'وجبات اليوم',
    comingNext: 'جاهز للمراجعة',
    preferences: 'التفضيلات',
    rebuildPlan: 'إعادة بناء الخطة',
    appleHealth: 'صحتي من آبل',
    connectAppleHealth: 'ربط صحتي من آبل',
    healthSubtitle: 'اربط HealthKit ليقرأ آيون الخطوات، السعرات النشطة، الوزن، نسبة الدهون، ونبض الراحة.',
    theme: 'المظهر',
    noWorkoutPlan: 'لا توجد خطة تمرين بعد',
    finishOnboarding: 'أكمل البداية أو اطلب من آيون إنشاء خطة تمرين.',
    restDay: 'يوم راحة',
    recoveryNote: 'نم جيداً، اشرب الماء، وحافظ على خطة التغذية.',
    finishWorkout: 'إنهاء وتسجيل التمرين',
    saving: 'جار الحفظ...',
    noWeightYet: 'لا يوجد وزن بعد',
    quickLog: 'تسجيل سريع',
    saveMeasurement: 'حفظ القياس',
    analyzeInBody: 'تحليل صورة InBody',
    scanFoodPhoto: 'مسح صورة الطعام',
    logFood: 'تسجيل الطعام',
    saveChanges: 'حفظ التغييرات',
    shareProgressCard: 'مشاركة بطاقة التقدم',
    privacy: 'سياسة الخصوصية',
    terms: 'الشروط',
    support: 'الدعم',
    deleteAccount: 'حذف الحساب',
    deleteAccountConfirm: 'سيتم حذف حسابك وبياناتك الرياضية نهائياً. لا يمكن التراجع عن هذا الإجراء.',
    deleteAccountFailed: 'تعذر حذف الحساب. يرجى التواصل مع الدعم.',
    cancel: 'إلغاء',
  },
}
