'use client'

import { useEffect } from 'react'

const TEXT: Record<string, string> = {
  // Global actions
  'Save': 'حفظ',
  'Cancel': 'إلغاء',
  'Loading...': 'جار التحميل...',
  'Generate': 'إنشاء',
  'Open': 'افتح',
  'OPEN': 'افتح',
  'Start': 'ابدأ',
  'START': 'ابدأ',
  'Watch': 'شاهد',
  'Recipe': 'الوصفة',
  'Refresh': 'تحديث',
  'Share': 'مشاركة',
  'Copied': 'تم النسخ',
  'Download': 'تحميل',
  'Copy text list': 'نسخ القائمة',
  'Try Again': 'حاول مرة أخرى',
  'Upload': 'رفع',
  'Replace Scan': 'استبدال الفحص',
  'Analyze with Ion': 'حلّل مع آيون',
  'Ask': 'اسأل',
  'ASK': 'اسأل',
  'LOG': 'سجّل',
  'LOGGING...': 'جار التسجيل...',
  'LOG THIS ORDER': 'سجّل هذا الطلب',
  'LOG BACKUP': 'سجّل البديل',

  // Navigation / shell
  'ADMIN': 'الإدارة',
  'SETTINGS': 'الإعدادات',
  'Support': 'الدعم',
  'ATHLETE': 'رياضي',

  // Dashboard / coaching
  'LAUNCH SPECIAL:': 'وصول الإطلاق:',
  'All features unlocked for free during launch.': 'كل الميزات مفتوحة مجاناً أثناء فترة الإطلاق.',
  'GOOD MORNING': 'صباح الخير',
  'GOOD AFTERNOON': 'مساء الخير',
  'GOOD EVENING': 'مساء الخير',
  'ION SAYS': 'آيون يقول',
  'ION COACHING ENGINE': 'محرك آيون التدريبي',
  'Weekly Mission': 'المهمة الأسبوعية',
  'What Should I Eat Now?': 'ماذا آكل الآن؟',
  'Body Symmetry Coach': 'مدرب تناسق الجسم',
  'Smart Plateau Intervention': 'تدخل ذكي عند الثبات',
  'Coach Memory Timeline': 'ذاكرة آيون التدريبية',
  'Form check': 'فحص الأداء',
  'Open nutrition': 'افتح التغذية',
  'Review symmetry': 'راجع التناسق',
  'View all': 'عرض الكل',
  'Balance check': 'فحص التوازن',
  'Correction needed': 'يحتاج تصحيح',
  'Applying...': 'جار التطبيق...',
  'Adjust calories': 'تعديل السعرات',
  'Add cardio note': 'إضافة ملاحظة كارديو',
  'Training push': 'دفعة تدريبية',
  'Close the training gap': 'أغلق فجوة التمرين',
  'Your fastest win this week is getting the planned sessions done.': 'أسرع فوز هذا الأسبوع هو إكمال الجلسات المخططة.',
  'Breakfast': 'الفطور',
  'Planned for 9:00 AM': 'مخطط لها الساعة 9:00 AM',
  'Nutrition patterns are being remembered for smarter meal guidance.': 'أنماط التغذية محفوظة لتوجيه غذائي أذكى.',
  'Latest Ion coaching note': 'آخر ملاحظة تدريبية من آيون',

  // Nutrition
  'NUTRITION PLAN': 'خطة التغذية',
  "Today's Meals": 'وجبات اليوم',
  'PHOTO SCAN': 'تصوير الطعام',
  'SCAN FOOD': 'مسح الطعام',
  'Calories': 'السعرات',
  'Fat': 'الدهون',
  'Water': 'الماء',
  'eaten': 'تم تناولها',
  'LOGGED FOODS': 'الأطعمة المسجلة',
  'Weekly Grocery Builder': 'منشئ قائمة التسوق الأسبوعية',
  'Eating Out Mode': 'وضع الأكل خارجاً',
  'Find the best restaurant or delivery order for your macros.': 'اختر أفضل طلب من مطعم أو توصيل حسب ماكروزك.',
  'Turn your diet plan into a global-first shopping list.': 'حوّل خطتك الغذائية إلى قائمة تسوق عالمية.',

  // Eating out
  'EATING OUT MODE': 'وضع الأكل خارجاً',
  'Smart Order Coach': 'مدرب الطلب الذكي',
  'Where are you ordering?': 'من أين ستطلب؟',
  'Best order': 'أفضل طلب',
  'Backup order': 'طلب بديل',
  'Context note': 'ملاحظة السياق',
  'Avoid or limit': 'تجنب أو قلّل',
  'Portion rules': 'قواعد الكمية',
  'How to log it': 'طريقة تسجيله',
  'Type any restaurant, cuisine, delivery app, buffet, cafe, or travel situation. Ion fits the best order to your remaining macros.': 'اكتب أي مطعم أو مطبخ أو تطبيق توصيل أو بوفيه أو مقهى أو موقف سفر. آيون يختار أفضل طلب يناسب ماكروزك المتبقية.',

  // Grocery
  'WEEKLY GROCERY BUILDER': 'منشئ قائمة التسوق الأسبوعية',
  'Smart Grocery List': 'قائمة تسوق ذكية',
  'Shopping Progress': 'تقدم التسوق',
  'Clear checked items': 'مسح العناصر المحددة',
  'Protein': 'البروتين',
  'Carbs': 'الكارب',
  'Fruits & vegetables': 'الفواكه والخضار',
  'Dairy': 'الألبان',
  'Fats': 'الدهون',
  'Pantry & spices': 'المخزن والبهارات',
  'Drinks & supplements': 'المشروبات والمكملات',
  'Other': 'أخرى',
  'Built from your active diet plan. Global-first by default, with local foods only when your plan includes them.': 'مبنية من خطتك الغذائية الحالية. عالمية أولاً، مع الأطعمة المحلية فقط إذا كانت موجودة في خطتك.',

  // Plan
  'YOUR PLANS': 'خططك',
  'My Programme': 'برنامجي',
  'Ion-generated plans tailored to your goals': 'خطط من آيون مخصصة لأهدافك',
  'Diet Plan': 'خطة التغذية',
  'Workout Plan': 'خطة التمرين',
  'No diet plan yet': 'لا توجد خطة تغذية بعد',
  'No workout plan yet': 'لا توجد خطة تمرين بعد',
  'Complete onboarding to generate your personalised diet plan.': 'أكمل الإعداد لإنشاء خطة التغذية الخاصة بك.',
  'Generate a grouped shopping list from this diet plan.': 'أنشئ قائمة تسوق مجمعة من هذه الخطة.',

  // Progress
  'ANALYTICS': 'التحليلات',
  'Your Progress': 'تقدمك',
  'Progress Share Card': 'بطاقة مشاركة التقدم',
  'Generate a clean weekly image for sharing or saving.': 'أنشئ صورة أسبوعية نظيفة للمشاركة أو الحفظ.',
  'Generating...': 'جار الإنشاء...',
  'Workout Streak': 'سلسلة التمرين',
  'Weekly Frequency': 'التكرار الأسبوعي',
  'Ion Monthly Summary': 'ملخص آيون الشهري',
  'Ion is reviewing your month...': 'آيون يراجع شهرك...',
  'Measurement Log': 'سجل القياسات',
  'Weight': 'الوزن',
  'Waist': 'الخصر',
  'Body Fat': 'دهون الجسم',
  'WORKOUTS': 'التمارين',
  'AVG DURATION': 'متوسط المدة',
  'WEIGHT CHANGE': 'تغير الوزن',
  'WEEKLY REPORTS': 'التقارير الأسبوعية',
  'No reports yet': 'لا توجد تقارير بعد',

  // Measurements / InBody
  'BODY TRACKING': 'تتبع الجسم',
  'Measurements': 'القياسات',
  'Stats': 'الإحصائيات',
  'Symmetry': 'التناسق',
  'Photos': 'الصور',
  'Inbody': 'إنبودي',
  'InBody': 'إنبودي',
  'Latest': 'الأحدث',
  'HISTORY': 'السجل',
  'Limb Symmetry Tracker': 'متتبع تناسق الأطراف',
  'Correction plan': 'خطة التصحيح',
  'No progress photos yet': 'لا توجد صور تقدم بعد',
  'Upload Photo': 'رفع صورة',
  'Add photo': 'إضافة صورة',
  'INBODY SCAN': 'فحص إنبودي',
  'Body composition analysis report': 'تقرير تحليل تركيب الجسم',
  'Analysis Error': 'خطأ في التحليل',
  'View PDF Report': 'عرض تقرير PDF',
  'Upload InBody Scan': 'رفع فحص إنبودي',
  'Photo of your report or PDF - Any InBody model': 'صورة التقرير أو PDF - أي جهاز إنبودي',

  // Workout / form
  'WORKOUT PLAN': 'خطة التمرين',
  'TODAY': 'اليوم',
  'TODAY\'S WORKOUT': 'تمرين اليوم',
  'AI FORM CHECK': 'فحص الأداء بالذكاء الاصطناعي',
  'Lift Form Review': 'مراجعة أداء الرفعة',
  'Exercise': 'التمرين',
  'Choose form photo': 'اختر صورة الأداء',
  'CHECK FORM': 'افحص الأداء',
  'CHECKING FORM...': 'جار فحص الأداء...',
  'Ion Form Feedback': 'ملاحظات آيون على الأداء',
  'NEXT SET CUE': 'تلميح الجولة القادمة',
  'Upload a clear photo or screenshot from a set. Ion will score the frame, flag the safest correction, and give you one cue for the next set.': 'ارفع صورة واضحة أو لقطة شاشة من المجموعة. سيقيّم آيون الإطار، ويحدد التصحيح الأكثر أماناً، ويعطيك ملاحظة واحدة للمجموعة التالية.',
  'Best angle: full body, side or 45 degrees, good lighting.': 'أفضل زاوية: الجسم كامل، من الجانب أو 45 درجة، مع إضاءة جيدة.',
}

const PLACEHOLDERS: Record<string, string> = {
  'e.g. sushi delivery, airport breakfast, Chipotle...': 'مثلاً: توصيل سوشي، فطور في المطار، مطعم إيطالي...',
  'Bench press, squat, deadlift...': 'بنش برس، سكوات، ديدلفت...',
  'Ask Ion anything...': 'اسأل آيون أي شيء...',
}

function translateTextNode(node: Text) {
  const original = node.nodeValue
  if (!original) return
  const trimmed = original.trim()
  if (!trimmed) return
  const translated = TEXT[trimmed]
  if (!translated) return
  node.nodeValue = original.replace(trimmed, translated)
}

function translateElement(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  nodes.forEach(translateTextNode)

  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[placeholder], textarea[placeholder]').forEach(el => {
    const value = el.getAttribute('placeholder')
    if (value && PLACEHOLDERS[value]) el.setAttribute('placeholder', PLACEHOLDERS[value])
  })
}

export default function ArabicUiTranslator({ lang }: { lang: 'en' | 'ar' }) {
  useEffect(() => {
    if (lang !== 'ar') return

    const run = () => translateElement(document.body)
    run()

    const observer = new MutationObserver(() => run())
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [lang])

  return null
}
