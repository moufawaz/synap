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
  inbody_url: string   // optional InBody scan upload
}

export type OnboardingContext = Partial<OnboardingData>

// ── Goal display helpers ──────────────────────────────────
function goalLabel(goal: string | undefined): string {
  const map: Record<string, string> = {
    lose_fat: 'losing fat',
    build_muscle: 'building muscle',
    recomposition: 'body recomposition',
    improve_fitness: 'improving your fitness',
    be_healthier: 'living healthier',
  }
  return goal ? (map[goal] || goal) : 'your goal'
}

// ── The full flow ─────────────────────────────────────────
export const ONBOARDING_STEPS: OnboardingStep[] = [

  // ── PHASE 1: Identity ─────────────────────────────────
  {
    id: 'greeting',
    phase: 1,
    ionMessage: () => "Hey — I'm Ion, your AI personal trainer.\n\nI'm not going to hand you a template. I'm going to ask you real questions — your body, your schedule, your food, your life — and build you something that actually works.\n\nLet's start simple. What's your name?",
    ionMessageAr: () => 'مرحباً — أنا Ion، مدرّبك الشخصي بالذكاء الاصطناعي.\n\nلن أعطيك قالباً جاهزاً. سأسألك أسئلة حقيقية — جسمك، جدولك، طعامك، حياتك — وأبني لك شيئاً يناسبك فعلاً.\n\nنبدأ ببساطة. ما اسمك؟',
    responseType: 'text',
    field: 'name',
  },
  {
    id: 'age',
    phase: 1,
    ionMessage: (ctx) => `${ctx.name} — good name. How old are you?`,
    ionMessageAr: (ctx) => `${ctx.name} — اسم جميل. كم عمرك؟`,
    responseType: 'number',
    field: 'age',
  },
  {
    id: 'weight_height',
    phase: 1,
    ionMessage: (ctx) => `Alright${ctx.name ? `, ${ctx.name}` : ''}. I need two numbers — your current weight in kg, and your height in cm.\n\nJust where you are right now. No pressure, this is your starting point.`,
    ionMessageAr: (ctx) => `حسناً${ctx.name ? `، ${ctx.name}` : ''}. أحتاج رقمين — وزنك الحالي بالكيلو، وطولك بالسنتيمتر.\n\nوضعك الآن فقط. لا ضغط، هذه نقطة البداية.`,
    responseType: 'text',
    field: null,
  },
  {
    id: 'gender',
    phase: 1,
    ionMessage: () => 'Male or female? This affects how I calculate your targets.',
    ionMessageAr: () => 'ذكر أم أنثى؟ هذا يؤثر على كيفية حساب أهدافك.',
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
    ionMessage: () => 'One more thing — do you want me to show up as male or female? Completely up to you.',
    ionMessageAr: () => 'شيء أخير — هل تريدني أن أظهر كذكر أم أنثى؟ الخيار لك تماماً.',
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
    ionMessage: (ctx) => `Perfect${ctx.name ? `, ${ctx.name}` : ''}. Now I want your body measurements — chest, waist, arms, legs. These are your baseline.\n\nWhen you see them change, that's where the motivation comes from. Grab a tape measure and fill in what you have. You can add the rest later.`,
    ionMessageAr: (ctx) => `ممتاز${ctx.name ? `، ${ctx.name}` : ''}. الآن أريد قياسات جسمك — صدر، خصر، ذراعين، أرجل. هذه نقطة البداية.\n\nعندما ترى التغييرات، من هنا تأتي الحافز. خذ شريط القياس وأدخل ما لديك. يمكنك إضافة الباقي لاحقاً.`,
    responseType: 'measurement_card',
    field: 'measurements',
  },

  // ── PHASE 3: Goal ─────────────────────────────────────
  {
    id: 'goal',
    phase: 3,
    ionMessage: (ctx) => `Good. Now the real question, ${ctx.name || 'tell me'} — what do you actually want from this? Be honest.`,
    ionMessageAr: (ctx) => `جيد. الآن السؤال الحقيقي، ${ctx.name || 'أخبرني'} — ماذا تريد فعلاً من هذا؟ كن صادقاً.`,
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
    ionMessage: (ctx) => `${goalLabel(ctx.goal)} — I respect that. How aggressive do you want the approach to be?`,
    ionMessageAr: (ctx) => `${ctx.goal === 'lose_fat' ? 'خسارة الدهون' : ctx.goal === 'build_muscle' ? 'بناء العضلات' : 'هدفك'} — أحترم ذلك. كم تريد أن يكون النهج مكثفاً؟`,
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
    ionMessage: () => 'Do you have something specific in mind — a weight, a size, an event, a date? Or just a general direction?',
    ionMessageAr: () => 'هل لديك شيء محدد في ذهنك — وزن، مقاس، حدث، تاريخ؟ أم مجرد اتجاه عام؟',
    responseType: 'text',
    field: 'goal_target',
    optional: true,
  },
  {
    id: 'goal_date',
    phase: 3,
    ionMessage: () => 'When do you want to hit this? Give me a rough timeframe.',
    ionMessageAr: () => 'متى تريد الوصول إلى هذا؟ أعطني إطاراً زمنياً تقريبياً.',
    responseType: 'text',
    field: 'goal_date',
    optional: true,
  },

  // ── PHASE 4: Daily Life ───────────────────────────────
  {
    id: 'work_schedule',
    phase: 4,
    ionMessage: (ctx) => `Here's where most plans break down — they don't account for real life. I'm not going to let that happen.\n\n${ctx.name ? `${ctx.name}, do` : 'Do'} you work or study?`,
    ionMessageAr: (ctx) => `هنا تنهار معظم الخطط — لا تأخذ الحياة الحقيقية بعين الاعتبار. لن أدع ذلك يحدث.\n\n${ctx.name ? `${ctx.name}, هل` : 'هل'} تعمل أم تدرس؟`,
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
    ionMessage: () => `What are your hours like? For example: "9 to 5", "rotating shifts", "flexible remote".`,
    ionMessageAr: () => 'كيف ساعاتك؟ مثلاً: "9 إلى 5"، "مناوبات متغيرة"، "عن بُعد مرن".',
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
    ionMessage: () => 'And what time do you usually go to sleep?',
    ionMessageAr: () => 'وفي أي وقت تنام عادةً؟',
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
    ionMessage: () => 'Do you get a lunch break? I need to know when you can eat during the day.',
    ionMessageAr: () => 'هل لديك استراحة غداء؟ أحتاج معرفة متى يمكنك الأكل خلال اليوم.',
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
    ionMessage: () => 'Be honest — how stressed are you on a typical day?',
    ionMessageAr: () => 'كن صادقاً — ما مستوى التوتر لديك في يوم عادي؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '😌 Pretty calm', labelAr: '😌 هادئ نسبياً', value: 'low' },
      { label: '😐 Moderate', labelAr: '😐 معتدل', value: 'moderate' },
      { label: '😓 High most days', labelAr: '😓 مرتفع معظم الأيام', value: 'high' },
    ],
    field: 'stress_level',
  },
  {
    id: 'sleep_quality',
    phase: 4,
    ionMessage: () => 'How is your sleep quality? Recovery matters more than most people think.',
    ionMessageAr: () => 'كيف جودة نومك؟ التعافي أهم مما يعتقد معظم الناس.',
    responseType: 'quickreply',
    quickReplies: [
      { label: '✅ Sleep well', labelAr: '✅ أنام جيداً', value: 'solid' },
      { label: '🔄 Hit or miss', labelAr: '🔄 أحياناً جيد وأحياناً لا', value: 'average' },
      { label: '😴 Struggle to sleep', labelAr: '😴 أجد صعوبة في النوم', value: 'struggling' },
    ],
    field: 'sleep_quality',
  },

  // ── PHASE 5: Training ────────────────────────────────
  {
    id: 'currently_training',
    phase: 5,
    ionMessage: (ctx) => `Let's talk training. ${ctx.name ? `${ctx.name}, are` : 'Are'} you currently working out, or are we starting from scratch?`,
    ionMessageAr: (ctx) => `نتحدث عن التدريب. ${ctx.name ? `${ctx.name}، هل` : 'هل'} تتدرب حالياً، أم نبدأ من الصفر؟`,
    responseType: 'quickreply',
    quickReplies: [
      { label: '🏋️ Already training', labelAr: '🏋️ أتدرب بالفعل', value: 'already' },
      { label: '🆕 Starting fresh', labelAr: '🆕 أبدأ من الصفر', value: 'fresh' },
    ],
    field: 'currently_training',
  },
  {
    id: 'current_training_desc',
    phase: 5,
    ionMessage: () => "Good — what does your current week look like? Gym, home, sports, cardio? Walk me through it.",
    ionMessageAr: () => 'جيد — كيف يبدو أسبوعك الحالي؟ صالة، منزل، رياضة، كارديو؟ أخبرني.',
    responseType: 'text',
    field: 'current_training_desc',
    condition: (ctx) => ctx.currently_training === 'already',
  },
  {
    id: 'gym_access',
    phase: 5,
    ionMessage: () => 'Do you have gym access, or are we working with what you have at home?',
    ionMessageAr: () => 'هل لديك إمكانية الوصول لصالة رياضية، أم نعمل بما لديك في المنزل؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '🏋️ Gym', labelAr: '🏋️ صالة رياضية', value: 'gym' },
      { label: '🏠 Home', labelAr: '🏠 المنزل', value: 'home' },
    ],
    field: 'gym_access',
    condition: (ctx) => ctx.currently_training === 'fresh',
  },
  {
    id: 'equipment',
    phase: 5,
    ionMessage: () => "What equipment do you actually have? I'll build around what's available.",
    ionMessageAr: () => 'ما المعدات المتوفرة لديك فعلاً؟ سأبني حول ما هو متاح.',
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
    ionMessage: (ctx) => `How many days per week can you realistically commit? Be honest — ${ctx.goal === 'build_muscle' ? 'more is better but only if you show up' : ctx.goal === 'lose_fat' ? 'consistency beats intensity' : 'the best plan is one you actually follow'}.`,
    ionMessageAr: (ctx) => `كم يوماً في الأسبوع يمكنك الالتزام بواقعية؟ كن صادقاً — ${ctx.goal === 'build_muscle' ? 'الأكثر أفضل لكن فقط إذا كنت ستلتزم' : 'الاستمرارية تتغلب على الشدة'}.`,
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
    ionMessage: () => 'How much time per session? I need to know what I am actually working with.',
    ionMessageAr: () => 'كم وقتاً لكل جلسة؟ أحتاج معرفة ما أعمل معه فعلاً.',
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
    ionMessage: (ctx) => `And when will you train? I'll time your meals around this${ctx.wake_time ? ` — you wake up around ${ctx.wake_time}` : ''}.`,
    ionMessageAr: () => 'ومتى ستتدرب؟ سأضبط وجباتك حول ذلك.',
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
    ionMessage: () => 'Any preference on training style in the gym?',
    ionMessageAr: () => 'هل لديك تفضيل لأسلوب التدريب في الصالة؟',
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
    ionMessage: () => 'Any exercises you hate or have pain doing? I will remove them from your program.',
    ionMessageAr: () => 'هل هناك تمارين تكرهها أو تشعر بألم أثناءها؟ سأزيلها من برنامجك.',
    responseType: 'text',
    field: 'exercises_hated',
    optional: true,
  },

  // ── PHASE 6: Nutrition ───────────────────────────────
  {
    id: 'foods_loved',
    phase: 6,
    ionMessage: (ctx) => `Now food — and I mean real food. ${ctx.name ? `${ctx.name}, what` : 'What'} do you actually enjoy eating? Don't hold back — the more specific you are, the better your meal plan will taste.`,
    ionMessageAr: (ctx) => `الآن الطعام — أعني الطعام الحقيقي. ${ctx.name ? `${ctx.name}، ما` : 'ما'} الذي تستمتع بأكله فعلاً؟ لا تتردد — كلما كنت أكثر تحديداً، كانت خطة وجباتك أشهى.`,
    responseType: 'text',
    field: 'foods_loved',
  },
  {
    id: 'foods_hated',
    phase: 6,
    ionMessage: () => "And what do you absolutely refuse to eat? I won't put it anywhere near your plan.",
    ionMessageAr: () => 'وما الذي ترفض أكله تماماً؟ لن أضعه في خطتك على الإطلاق.',
    responseType: 'text',
    field: 'foods_hated',
    optional: true,
  },
  {
    id: 'dietary_preference',
    phase: 6,
    ionMessage: () => 'Any dietary rules I must follow?',
    ionMessageAr: () => 'هل هناك قواعد غذائية يجب أن أتبعها؟',
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
    ionMessage: () => 'Any actual food allergies — things that could cause a real reaction? I need to know.',
    ionMessageAr: () => 'هل هناك حساسية غذائية حقيقية — أشياء قد تسبب رد فعل؟ أحتاج معرفة ذلك.',
    responseType: 'text',
    field: 'allergies',
    optional: true,
  },
  {
    id: 'meals_per_day',
    phase: 6,
    ionMessage: (ctx) => `How many meals a day works for your schedule? ${ctx.work_schedule === 'neither' ? "You've got more flexibility, so think about what actually suits you." : "Keep in mind your work hours."}`,
    ionMessageAr: () => 'كم وجبة في اليوم تناسب جدولك؟',
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
    ionMessage: () => 'Do you cook, or do you need meals that take under 10 minutes?',
    ionMessageAr: () => 'هل تطهو، أم تحتاج وجبات تستغرق أقل من 10 دقائق؟',
    responseType: 'quickreply',
    quickReplies: [
      { label: '👨‍🍳 I cook properly', labelAr: '👨‍🍳 أطهو بشكل صحيح', value: 'cook' },
      { label: '⚡ Quick & simple', labelAr: '⚡ سريع وبسيط', value: 'quick' },
      { label: '🍽️ Mostly eat out', labelAr: '🍽️ آكل خارجاً غالباً', value: 'eat_out' },
    ],
    field: 'cooking_ability',
  },
  {
    id: 'food_budget',
    phase: 6,
    ionMessage: () => "What's your food budget like? I'll keep the plan realistic.",
    ionMessageAr: () => 'كيف ميزانيتك للطعام؟ سأجعل الخطة واقعية.',
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
    ionMessage: () => 'Any injuries, joint pain, or physical limitations I need to work around?',
    ionMessageAr: () => 'هل هناك إصابات أو آلام في المفاصل أو قيود جسدية أحتاج للتعامل معها؟',
    responseType: 'text',
    field: 'injuries',
    optional: true,
  },
  {
    id: 'medical_conditions',
    phase: 7,
    ionMessage: () => 'Any medical conditions — diabetes, blood pressure, hormonal issues, heart? Nothing you say here leaves this plan.',
    ionMessageAr: () => 'هل هناك حالات طبية — سكري، ضغط، مشاكل هرمونية، قلب؟ كل ما تقوله هنا يبقى في هذه الخطة.',
    responseType: 'text',
    field: 'medical_conditions',
    optional: true,
  },
  {
    id: 'supplements',
    phase: 7,
    ionMessage: () => "What supplements are you taking right now, if any? I'll factor this into your nutrition.",
    ionMessageAr: () => 'ما المكملات الغذائية التي تتناولها الآن، إن وجدت؟ سأضع هذا في حسبان تغذيتك.',
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

  // ── InBody Upload (optional) ──────────────────────────
  {
    id: 'inbody_upload',
    phase: 7,
    ionMessage: (ctx) => `One last thing before I build your plan, ${ctx.name || 'you'} — do you have an InBody scan or body composition report?\n\n📊 An InBody gives me your exact muscle mass, fat mass, and water distribution — which lets me fine-tune your targets far more accurately than weight alone.\n\nIf you have one, take a photo or upload the PDF now. If not, no problem — you can always add it later from the Measurements section.\n\nThis step is completely optional.`,
    ionMessageAr: (ctx) => `شيء أخير قبل أن أبني خطتك، ${ctx.name || 'أنت'} — هل لديك تقرير InBody أو تحليل تركيب الجسم؟\n\n📊 يعطيني InBody قيم كتلة العضلات والدهون والماء بدقة — مما يتيح لي ضبط أهدافك بشكل أدق بكثير من الوزن وحده.\n\nإذا كان لديك، التقط صورة أو حمّل ملف PDF الآن. إن لم يكن لديك، لا مشكلة — يمكنك إضافته لاحقاً من قسم القياسات.\n\nهذه الخطوة اختيارية تماماً.`,
    responseType: 'photo_upload',
    field: 'inbody_url',
    optional: true,
  },

  // ── PHASE 8: Done ─────────────────────────────────────
  {
    id: 'generating',
    phase: 8,
    ionMessage: (ctx) => `That's everything I need, ${ctx.name || 'you'}.\n\nI know your body, your schedule, your food, your lifestyle, and your goal. I'm not going to give you something generic — this is yours.\n\nGive me a moment.`,
    ionMessageAr: (ctx) => `هذا كل ما أحتاجه، ${ctx.name || 'أنت'}.\n\nأعرف جسمك وجدولك وطعامك وأسلوب حياتك وهدفك. لن أعطيك شيئاً عاماً — هذا خاصٌّ بك.\n\nأعطني لحظة.`,
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
