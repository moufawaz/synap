// ── Onboarding State Machine ──────────────────────────────
// Drives the Ion conversation during onboarding.
// Each step is an Ion message + expected response type.

export type ResponseType =
  | 'text'
  | 'quickreply'
  | 'number'
  | 'measurement_card'
  | 'photo_upload'
  | 'multiselect'
  | 'time'
  | 'done'

export interface QuickReply {
  label: string
  labelAr: string
  value: string
}

export interface OnboardingStep {
  id: string
  phase: number
  ionMessage: (ctx: OnboardingContext) => string
  ionMessageAr: (ctx: OnboardingContext) => string
  responseType: ResponseType
  quickReplies?: QuickReply[]
  field: keyof OnboardingData | null
  optional?: boolean
  condition?: (ctx: OnboardingContext) => boolean
}

export interface OnboardingData {
  // Phase 1 — Identity
  name: string
  age: string
  weight_kg: string
  height_cm: string
  gender: string
  language: string
  ion_gender: string
  // Phase 2 — Measurements
  measurements: Record<string, string>
  // Phase 3 — Goal
  goal: string
  goal_speed: string
  goal_target: string
  goal_date: string
  // Phase 4 — Daily Life
  work_schedule: string
  work_hours: string
  wake_time: string
  sleep_time: string
  lunch_break: string
  stress_level: string
  sleep_quality: string
  // Phase 5 — Training
  currently_training: string
  current_training_desc: string
  training_duration: string
  training_week: string
  training_time: string
  gym_access: string
  training_days: string
  session_duration: string
  training_style: string
  exercises_hated: string
  equipment: string
  // Phase 6 — Nutrition
  foods_loved: string
  foods_hated: string
  dietary_preference: string
  allergies: string
  meals_per_day: string
  eats_breakfast: string
  main_meal: string
  cooking_ability: string
  food_budget: string
  // Phase 7 — Health
  injuries: string
  medical_conditions: string
  supplements: string
}

export type OnboardingContext = Partial<OnboardingData>

// ── The full flow ─────────────────────────────────────────
export const ONBOARDING_STEPS: OnboardingStep[] = [

  // ── PHASE 1: Identity ─────────────────────────────────
  {
    id: 'greeting',
    phase: 1,
    ionMessage: () => "Hey — I'm Ion, your AI personal trainer. I'm going to ask you everything I need to build a plan that actually fits your life. No templates. No guessing.\n\nLet's start. What's your name?",
    ionMessageAr: () => 'مرحباً — أنا Ion، مدرّبك الشخصي بالذكاء الاصطناعي. سأسألك عن كل ما أحتاجه لبناء خطة تناسب حياتك حقاً. لا قوالب جاهزة. لا تخمين.\n\nلنبدأ. ما اسمك؟',
    responseType: 'text',
    field: 'name',
  },
  {
    id: 'age',
    phase: 1,
    ionMessage: (ctx) => `Good to meet you, ${ctx.name}. How old are you?`,
    ionMessageAr: (ctx) => `يسعدني معرفتك، ${ctx.name}. كم عمرك؟`,
    responseType: 'number',
    field: 'age',
  },
  {
    id: 'weight_height',
    phase: 1,
    ionMessage: () => "What's your current weight and height? Just where you are right now — no judgment.",
    ionMessageAr: () => 'ما وزنك وطولك الحاليان؟ فقط وضعك الآن — بدون أي حكم.',
    responseType: 'text',
    field: null,
  },
  {
    id: 'gender',
    phase: 1,
    ionMessage: () => 'Are you male or female?',
    ionMessageAr: () => 'هل أنت ذكر أم أنثى؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '♂ Male', labelAr: '♂ ذكر', value: 'male' },
      { label: '♀ Female', labelAr: '♀ أنثى', value: 'female' },
    ],
    field: 'gender',
  },
  {
    id: 'ion_gender',
    phase: 1,
    ionMessage: () => 'Do you want me to show up as male or female? Completely your call.',
    ionMessageAr: () => 'هل تريدني أن أظهر كذكر أم أنثى؟ اختارك تماماً.',
    responseType: 'quickreply',
    quickReplies: [
      { label: '♂ Male Ion', labelAr: '♂ Ion ذكر', value: 'male' },
      { label: '♀ Female Ion', labelAr: '♀ Ion أنثى', value: 'female' },
    ],
    field: 'ion_gender',
  },

  // ── PHASE 2: Measurements ─────────────────────────────
  {
    id: 'measurements_intro',
    phase: 2,
    ionMessage: (ctx) => `Got it${ctx.name ? `, ${ctx.name}` : ''}. Now I need your starting measurements. These are your baseline — we track changes so you can see exactly what's transforming.\n\nGet a tape measure and fill in what you can. You can always add the rest later.`,
    ionMessageAr: (ctx) => `حسناً${ctx.name ? `، ${ctx.name}` : ''}. الآن أحتاج قياساتك الأولية. هذه هي نقطة البداية — نتتبع التغييرات حتى ترى بالضبط ما الذي يتغير.\n\nخذ شريط القياس وأدخل ما تستطيع. يمكنك دائماً إضافة الباقي لاحقاً.`,
    responseType: 'measurement_card',
    field: 'measurements',
  },

  // ── PHASE 3: Goal ─────────────────────────────────────
  {
    id: 'goal',
    phase: 3,
    ionMessage: () => "What do you actually want? Don't overthink it.",
    ionMessageAr: () => 'ماذا تريد فعلاً؟ لا تفكر كثيراً.',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🔥 Lose Fat', labelAr: '🔥 خسارة الدهون', value: 'lose_fat' },
      { label: '💪 Build Muscle', labelAr: '💪 بناء العضلات', value: 'build_muscle' },
      { label: '⚡ Recomposition', labelAr: '⚡ إعادة التشكيل', value: 'recomposition' },
      { label: '🏃 Improve Fitness', labelAr: '🏃 تحسين اللياقة', value: 'improve_fitness' },
      { label: '❤️ Be Healthier', labelAr: '❤️ أن أكون أكثر صحة', value: 'be_healthier' },
    ],
    field: 'goal',
  },
  {
    id: 'goal_speed',
    phase: 3,
    ionMessage: () => 'How fast do you want to move toward it?',
    ionMessageAr: () => 'ما السرعة التي تريد التقدم بها نحو هدفك؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🐢 Slow & Sustainable', labelAr: '🐢 بطيء ومستدام', value: 'slow' },
      { label: '⚖️ Moderate', labelAr: '⚖️ معتدل', value: 'moderate' },
      { label: '🚀 Aggressive', labelAr: '🚀 مكثف', value: 'aggressive' },
    ],
    field: 'goal_speed',
  },
  {
    id: 'goal_target',
    phase: 3,
    ionMessage: () => 'Do you have a specific target — a weight, a body fat %, an event, a date? Or just a feeling you want to reach?',
    ionMessageAr: () => 'هل لديك هدف محدد — وزن، نسبة دهون، حدث قادم، أو تاريخ معين؟ أم مجرد شعور تريد الوصول إليه؟',
    responseType: 'text',
    field: 'goal_target',
    optional: true,
  },
  {
    id: 'goal_date',
    phase: 3,
    ionMessage: () => 'When do you want to reach this? Give me a timeframe — a month, 3 months, a specific date.',
    ionMessageAr: () => 'متى تريد الوصول إلى هذا؟ أعطني إطاراً زمنياً — شهر، 3 أشهر، تاريخ محدد.',
    responseType: 'text',
    field: 'goal_date',
    optional: true,
  },

  // ── PHASE 4: Daily Life ───────────────────────────────
  {
    id: 'work_schedule',
    phase: 4,
    ionMessage: () => "This is where most plans fail — they ignore real life. Do you work or study?",
    ionMessageAr: () => 'هنا تفشل معظم الخطط — تتجاهل الحياة الحقيقية. هل تعمل أم تدرس؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '💼 Work', labelAr: '💼 أعمل', value: 'work' },
      { label: '📚 Study', labelAr: '📚 أدرس', value: 'study' },
      { label: '🔄 Both', labelAr: '🔄 كلاهما', value: 'both' },
      { label: '🏠 Neither', labelAr: '🏠 لا شيء منهما', value: 'neither' },
    ],
    field: 'work_schedule',
  },
  {
    id: 'work_hours',
    phase: 4,
    ionMessage: (ctx) => `What are your hours roughly? For example: "9am to 5pm", "shifts", "flexible".`,
    ionMessageAr: () => 'ما هي ساعاتك تقريباً؟ مثلاً: "9 صباحاً إلى 5 مساءً"، "مناوبات"، "مرنة".',
    responseType: 'text',
    field: 'work_hours',
    condition: (ctx) => ctx.work_schedule !== 'neither',
  },
  {
    id: 'wake_time',
    phase: 4,
    ionMessage: () => 'What time do you usually wake up?',
    ionMessageAr: () => 'في أي وقت تستيقظ عادةً؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '5–6 AM', labelAr: '5–6 صباحاً', value: '5:30' },
      { label: '6–7 AM', labelAr: '6–7 صباحاً', value: '6:30' },
      { label: '7–8 AM', labelAr: '7–8 صباحاً', value: '7:30' },
      { label: '8–9 AM', labelAr: '8–9 صباحاً', value: '8:30' },
      { label: '9 AM+', labelAr: '9 صباحاً فما فوق', value: '9:30' },
    ],
    field: 'wake_time',
  },
  {
    id: 'sleep_time',
    phase: 4,
    ionMessage: () => 'What time do you usually sleep?',
    ionMessageAr: () => 'في أي وقت تنام عادةً؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: 'Before 10 PM', labelAr: 'قبل 10 مساءً', value: '22:00' },
      { label: '10–11 PM', labelAr: '10–11 مساءً', value: '22:30' },
      { label: '11 PM–12 AM', labelAr: '11م–12ص', value: '23:30' },
      { label: 'After Midnight', labelAr: 'بعد منتصف الليل', value: '01:00' },
    ],
    field: 'sleep_time',
  },
  {
    id: 'lunch_break',
    phase: 4,
    ionMessage: () => 'Do you have a lunch break? What time and how long?',
    ionMessageAr: () => 'هل لديك استراحة غداء؟ في أي وقت وكم مدتها؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '30 min around noon', labelAr: '30 دقيقة حول الظهر', value: '12:30-30min' },
      { label: '1 hour around noon', labelAr: 'ساعة حول الظهر', value: '13:00-60min' },
      { label: 'Flexible', labelAr: 'مرنة', value: 'flexible' },
      { label: 'No break', labelAr: 'لا استراحة', value: 'none' },
    ],
    field: 'lunch_break',
  },
  {
    id: 'stress_level',
    phase: 4,
    ionMessage: () => 'How stressful is daily life right now?',
    ionMessageAr: () => 'ما مستوى التوتر في حياتك اليومية الآن؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '😌 Low', labelAr: '😌 منخفض', value: 'low' },
      { label: '😐 Moderate', labelAr: '😐 معتدل', value: 'moderate' },
      { label: '😓 High', labelAr: '😓 مرتفع', value: 'high' },
    ],
    field: 'stress_level',
  },
  {
    id: 'sleep_quality',
    phase: 4,
    ionMessage: () => 'And how is your sleep quality?',
    ionMessageAr: () => 'وكيف جودة نومك؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '✅ Solid', labelAr: '✅ جيد', value: 'solid' },
      { label: '🔄 Average', labelAr: '🔄 متوسط', value: 'average' },
      { label: '😴 Struggling', labelAr: '😴 صعب', value: 'struggling' },
    ],
    field: 'sleep_quality',
  },

  // ── PHASE 5: Training ────────────────────────────────
  {
    id: 'currently_training',
    phase: 5,
    ionMessage: () => 'Are you training currently, or starting fresh?',
    ionMessageAr: () => 'هل تتدرب حالياً، أم تبدأ من الصفر؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🏋️ Training Already', labelAr: '🏋️ أتدرب بالفعل', value: 'already' },
      { label: '🆕 Starting Fresh', labelAr: '🆕 أبدأ من الصفر', value: 'fresh' },
    ],
    field: 'currently_training',
  },
  {
    id: 'current_training_desc',
    phase: 5,
    ionMessage: () => "What are you doing right now — gym, home, sports, cardio? Walk me through your current week.",
    ionMessageAr: () => 'ماذا تفعل الآن — صالة، منزل، رياضة، كارديو؟ أخبرني عن أسبوعك الحالي.',
    responseType: 'text',
    field: 'current_training_desc',
    condition: (ctx) => ctx.currently_training === 'already',
  },
  {
    id: 'gym_access',
    phase: 5,
    ionMessage: () => 'Do you have access to a gym?',
    ionMessageAr: () => 'هل لديك إمكانية الوصول إلى صالة رياضية؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🏋️ Yes — Gym', labelAr: '🏋️ نعم — صالة', value: 'gym' },
      { label: '🏠 No — Home', labelAr: '🏠 لا — المنزل', value: 'home' },
    ],
    field: 'gym_access',
    condition: (ctx) => ctx.currently_training === 'fresh',
  },
  {
    id: 'equipment',
    phase: 5,
    ionMessage: () => 'What equipment do you have at home?',
    ionMessageAr: () => 'ما المعدات المتوفرة لديك في المنزل؟',
    responseType: 'multiselect',
    quickReplies: [
      { label: 'Bodyweight Only', labelAr: 'وزن الجسم فقط', value: 'bodyweight' },
      { label: 'Resistance Bands', labelAr: 'أربطة مقاومة', value: 'bands' },
      { label: 'Dumbbells', labelAr: 'دمبلز', value: 'dumbbells' },
      { label: 'Pull-up Bar', labelAr: 'بار عقلة', value: 'pullup_bar' },
      { label: 'Mixed Setup', labelAr: 'معدات متنوعة', value: 'mixed' },
    ],
    field: 'equipment',
    condition: (ctx) => ctx.gym_access === 'home',
  },
  {
    id: 'training_days',
    phase: 5,
    ionMessage: () => 'How many days per week can you realistically commit to training?',
    ionMessageAr: () => 'كم يوماً في الأسبوع يمكنك الالتزام بالتدريب بواقعية؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '2 days', labelAr: 'يومان', value: '2' },
      { label: '3 days', labelAr: '3 أيام', value: '3' },
      { label: '4 days', labelAr: '4 أيام', value: '4' },
      { label: '5 days', labelAr: '5 أيام', value: '5' },
      { label: '6 days', labelAr: '6 أيام', value: '6' },
    ],
    field: 'training_days',
  },
  {
    id: 'session_duration',
    phase: 5,
    ionMessage: () => 'How long per session?',
    ionMessageAr: () => 'كم مدة كل جلسة؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '30 min', labelAr: '30 دقيقة', value: '30' },
      { label: '45 min', labelAr: '45 دقيقة', value: '45' },
      { label: '1 hour', labelAr: 'ساعة', value: '60' },
      { label: '90 min', labelAr: '90 دقيقة', value: '90' },
    ],
    field: 'session_duration',
  },
  {
    id: 'training_time',
    phase: 5,
    ionMessage: () => 'What time of day will you train?',
    ionMessageAr: () => 'في أي وقت من اليوم ستتدرب؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🌅 Morning', labelAr: '🌅 صباحاً', value: 'morning' },
      { label: '☀️ Afternoon', labelAr: '☀️ بعد الظهر', value: 'afternoon' },
      { label: '🌆 Evening', labelAr: '🌆 مساءً', value: 'evening' },
      { label: '🌙 Late Night', labelAr: '🌙 ليلاً متأخراً', value: 'late_night' },
    ],
    field: 'training_time',
  },
  {
    id: 'training_style',
    phase: 5,
    ionMessage: () => 'Any training style preference?',
    ionMessageAr: () => 'هل لديك تفضيل لأسلوب التدريب؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🏋️ Heavy Compound', labelAr: '🏋️ مركب ثقيل', value: 'heavy_compound' },
      { label: '🔧 Machines', labelAr: '🔧 أجهزة', value: 'machines' },
      { label: '🔗 Cables', labelAr: '🔗 كابلات', value: 'cables' },
      { label: '🎯 Mix of Everything', labelAr: '🎯 مزيج من كل شيء', value: 'mix' },
    ],
    field: 'training_style',
    condition: (ctx) => ctx.gym_access === 'gym',
  },
  {
    id: 'exercises_hated',
    phase: 5,
    ionMessage: () => 'Any exercises you hate or physically cannot do?',
    ionMessageAr: () => 'هل هناك تمارين تكرهها أو لا تستطيع فعلها جسدياً؟',
    responseType: 'text',
    field: 'exercises_hated',
    optional: true,
  },

  // ── PHASE 6: Nutrition ───────────────────────────────
  {
    id: 'foods_loved',
    phase: 6,
    ionMessage: () => "Now food — real food. What do you genuinely enjoy eating? Tell me anything — cuisines, specific dishes, whatever you actually look forward to.",
    ionMessageAr: () => 'الآن الطعام — الطعام الحقيقي. ما الذي تستمتع بأكله فعلاً؟ أخبرني بأي شيء — مأكولات، أطباق محددة، ما تشتاق إليه.',
    responseType: 'text',
    field: 'foods_loved',
  },
  {
    id: 'foods_hated',
    phase: 6,
    ionMessage: () => 'Anything you absolutely hate or refuse to eat?',
    ionMessageAr: () => 'هل هناك شيء تكرهه تماماً أو ترفض أكله؟',
    responseType: 'text',
    field: 'foods_hated',
    optional: true,
  },
  {
    id: 'dietary_preference',
    phase: 6,
    ionMessage: () => 'Any dietary rules I must know?',
    ionMessageAr: () => 'هل هناك قواعد غذائية يجب أن أعرفها؟',
    responseType: 'multiselect',
    quickReplies: [
      { label: '✅ No Restrictions', labelAr: '✅ لا قيود', value: 'none' },
      { label: '🕌 Halal', labelAr: '🕌 حلال', value: 'halal' },
      { label: '🚫 No Pork', labelAr: '🚫 بدون لحم خنزير', value: 'no_pork' },
      { label: '🥗 Vegetarian', labelAr: '🥗 نباتي', value: 'vegetarian' },
      { label: '🌱 Vegan', labelAr: '🌱 نباتي صارم', value: 'vegan' },
      { label: '🥛 Lactose Intolerant', labelAr: '🥛 عدم تحمل اللاكتوز', value: 'lactose_free' },
      { label: '🌾 Gluten Free', labelAr: '🌾 خالٍ من الغلوتين', value: 'gluten_free' },
    ],
    field: 'dietary_preference',
  },
  {
    id: 'allergies',
    phase: 6,
    ionMessage: () => 'Any food allergies I must absolutely avoid?',
    ionMessageAr: () => 'هل هناك حساسية غذائية يجب أن أتجنبها تماماً؟',
    responseType: 'text',
    field: 'allergies',
    optional: true,
  },
  {
    id: 'meals_per_day',
    phase: 6,
    ionMessage: () => 'How many meals per day works for your lifestyle?',
    ionMessageAr: () => 'كم وجبة في اليوم تناسب أسلوب حياتك؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '2 meals', labelAr: 'وجبتان', value: '2' },
      { label: '3 meals', labelAr: '3 وجبات', value: '3' },
      { label: '4 meals', labelAr: '4 وجبات', value: '4' },
      { label: '5 meals', labelAr: '5 وجبات', value: '5' },
      { label: '6 meals', labelAr: '6 وجبات', value: '6' },
    ],
    field: 'meals_per_day',
  },
  {
    id: 'cooking_ability',
    phase: 6,
    ionMessage: () => 'Can you cook, or do you need quick simple meals?',
    ionMessageAr: () => 'هل تستطيع الطهي، أم تحتاج وجبات سريعة وبسيطة؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '👨‍🍳 I Cook', labelAr: '👨‍🍳 أطهو', value: 'cook' },
      { label: '⚡ Quick & Simple', labelAr: '⚡ سريع وبسيط', value: 'quick' },
      { label: '🍽️ I Eat Out Mostly', labelAr: '🍽️ آكل خارجاً غالباً', value: 'eat_out' },
    ],
    field: 'cooking_ability',
  },
  {
    id: 'food_budget',
    phase: 6,
    ionMessage: () => "What's your food budget like?",
    ionMessageAr: () => 'كيف ميزانيتك للطعام؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '💰 Tight', labelAr: '💰 محدودة', value: 'tight' },
      { label: '💳 Moderate', labelAr: '💳 معتدلة', value: 'moderate' },
      { label: '💎 Flexible', labelAr: '💎 مرنة', value: 'flexible' },
    ],
    field: 'food_budget',
  },

  // ── PHASE 7: Health ───────────────────────────────────
  {
    id: 'injuries',
    phase: 7,
    ionMessage: () => 'Any injuries, joint pain, or physical limitations I need to know about?',
    ionMessageAr: () => 'هل هناك إصابات أو آلام في المفاصل أو قيود جسدية يجب أن أعرفها؟',
    responseType: 'text',
    field: 'injuries',
    optional: true,
  },
  {
    id: 'medical_conditions',
    phase: 7,
    ionMessage: () => 'Any medical conditions — diabetes, blood pressure, heart issues, hormonal?',
    ionMessageAr: () => 'هل هناك حالات طبية — سكري، ضغط، قلب، هرمونية؟',
    responseType: 'text',
    field: 'medical_conditions',
    optional: true,
  },
  {
    id: 'supplements',
    phase: 7,
    ionMessage: () => 'Are you taking any supplements right now?',
    ionMessageAr: () => 'هل تتناول أي مكملات غذائية الآن؟',
    responseType: 'multiselect',
    quickReplies: [
      { label: '❌ None', labelAr: '❌ لا شيء', value: 'none' },
      { label: '🥤 Protein', labelAr: '🥤 بروتين', value: 'protein' },
      { label: '💊 Creatine', labelAr: '💊 كرياتين', value: 'creatine' },
      { label: '🌿 Vitamins', labelAr: '🌿 فيتامينات', value: 'vitamins' },
      { label: '📦 Multiple', labelAr: '📦 متعددة', value: 'multiple' },
    ],
    field: 'supplements',
  },

  // ── PHASE 8: Done ─────────────────────────────────────
  {
    id: 'generating',
    phase: 8,
    ionMessage: (ctx) => `That's everything I need, ${ctx.name || 'you'}. I know your body, your life, your food, your schedule, and your goals.\n\nGive me a moment — I'm building your complete plan now.`,
    ionMessageAr: (ctx) => `هذا كل ما أحتاجه، ${ctx.name || 'أنت'}. أعرف جسمك وحياتك وطعامك وجدولك وأهدافك.\n\nأعطني لحظة — أبني خطتك الكاملة الآن.`,
    responseType: 'done',
    field: null,
  },
]

// ── Helpers ───────────────────────────────────────────────
export function getActiveSteps(ctx: OnboardingContext): OnboardingStep[] {
  return ONBOARDING_STEPS.filter(step => {
    if (step.condition) return step.condition(ctx)
    return true
  })
}

export function getPhaseLabel(phase: number, lang: 'en' | 'ar'): string {
  const labels: Record<number, { en: string; ar: string }> = {
    1: { en: 'Identity', ar: 'الهوية' },
    2: { en: 'Measurements', ar: 'القياسات' },
    3: { en: 'Goal', ar: 'الهدف' },
    4: { en: 'Lifestyle', ar: 'نمط الحياة' },
    5: { en: 'Training', ar: 'التدريب' },
    6: { en: 'Nutrition', ar: 'التغذية' },
    7: { en: 'Health', ar: 'الصحة' },
    8: { en: 'Building Plan', ar: 'بناء الخطة' },
  }
  return labels[phase]?.[lang] || ''
}
