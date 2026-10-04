import type { TopicId } from './topics';

// Official Iranian math textbooks, grades 7–12, chapter by chapter —
// transcribed from the books' own tables of contents
// (.design/screen_book, captured 2026-09-29 from chap.sch.ir PDFs).
// Titles are the books' Persian wording on purpose: this curriculum only
// exists in Persian, so it isn't routed through i18n.
//
// `topics` links a chapter to the app's own topics (content/topics.ts)
// whose problems the Math Engine can actually solve; a chapter without
// any is shown for reference only. Grade 7–9 chapter ids equal the exam
// syllabus ids (content/examSyllabus.ts), which is how a chapter finds
// its "take an exam" link.
//
// Not covered yet: the تجربی-track books for grades 11–12 — no
// screenshots of those were provided.
export type CurriculumGrade = 7 | 8 | 9 | 10 | 11 | 12;

export interface CurriculumChapter {
  id: string;
  title: string;
  lessons: string[];
  topics?: TopicId[];
}

export interface CurriculumBook {
  id: string;
  title: string;
  // Which tracks use this book (shown under the title for grades 10–12).
  track?: string;
  chapters: CurriculumChapter[];
}

export interface CurriculumGradeEntry {
  grade: CurriculumGrade;
  books: CurriculumBook[];
}

export const CURRICULUM: CurriculumGradeEntry[] = [
  {
    grade: 7,
    books: [
      {
        id: 'math7',
        title: 'ریاضی هفتم',
        chapters: [
          { id: 'g7_strategies', title: 'راهبردهای حل مسئله', lessons: [] },
          {
            id: 'g7_integers',
            title: 'عددهای صحیح',
            lessons: ['معرفی عددهای علامت‌دار', 'جمع و تفریق عددهای صحیح (۱)', 'جمع و تفریق عددهای صحیح (۲)', 'ضرب و تقسیم عددهای صحیح'],
            topics: ['arithmetic'],
          },
          {
            id: 'g7_algebra',
            title: 'جبر و معادله',
            lessons: ['الگوهای عددی', 'عبارت‌های جبری', 'مقدار عددی یک عبارت جبری', 'معادله'],
            topics: ['expressions', 'linear'],
          },
          {
            id: 'g7_geometry',
            title: 'هندسه و استدلال',
            lessons: ['روابط بین پاره‌خط‌ها', 'روابط بین زاویه‌ها', 'تبدیلات هندسی (انتقال، تقارن، دوران)', 'شکل‌های مساوی (هم‌نهشت)'],
          },
          {
            id: 'g7_divisors',
            title: 'شمارنده‌ها و اعداد اول',
            lessons: ['عدد اول', 'شمارنده‌ی اول', 'بزرگ‌ترین شمارنده‌ی مشترک', 'کوچک‌ترین مضرب مشترک'],
          },
          {
            id: 'g7_area',
            title: 'سطح و حجم',
            lessons: ['حجم‌های هندسی', 'محاسبه‌ی حجم‌های منشوری', 'مساحت جانبی و کل', 'حجم و سطح'],
            topics: ['geometry'],
          },
          {
            id: 'g7_powers',
            title: 'توان و جذر',
            lessons: ['تعریف توان', 'محاسبه‌ی عبارت توان‌دار', 'ساده کردن عبارت‌های توان‌دار', 'جذر و ریشه'],
            topics: ['powers'],
          },
          {
            id: 'g7_vectors',
            title: 'بردار و مختصات',
            lessons: ['پاره‌خط جهت‌دار', 'بردارهای مساوی و قرینه', 'مختصات', 'بردار انتقال'],
            topics: ['vectors'],
          },
          {
            id: 'g7_statistics',
            title: 'آمار و احتمال',
            lessons: ['جمع‌آوری و نمایش داده‌ها', 'نمودارها و تفسیر نتیجه‌ها', 'احتمال یا اندازه‌گیری شانس', 'احتمال و تجربه'],
          },
        ],
      },
    ],
  },
  {
    grade: 8,
    books: [
      {
        id: 'math8',
        title: 'ریاضی هشتم',
        chapters: [
          {
            id: 'g8_rationals',
            title: 'عددهای صحیح و گویا',
            lessons: ['یادآوری عددهای صحیح', 'معرفی عددهای گویا', 'جمع و تفریق عددهای گویا', 'ضرب و تقسیم عددهای گویا'],
            topics: ['arithmetic', 'fractions'],
          },
          { id: 'g8_primes', title: 'عددهای اول', lessons: ['یادآوری عددهای اول', 'تعیین عددهای اول'] },
          {
            id: 'g8_polygons',
            title: 'چندضلعی‌ها',
            lessons: ['چندضلعی‌ها و تقارن', 'توازی و تعامد', 'چهارضلعی‌ها', 'زاویه‌های داخلی', 'زاویه‌های خارجی'],
            topics: ['geometry'],
          },
          {
            id: 'g8_algebra',
            title: 'جبر و معادله',
            lessons: ['ساده کردن عبارت‌های جبری', 'پیدا کردن مقدار یک عبارت جبری', 'تجزیه‌ی عبارت‌های جبری', 'معادله'],
            topics: ['expressions', 'linear'],
          },
          {
            id: 'g8_vectors',
            title: 'بردار و مختصات',
            lessons: ['جمع بردارها', 'ضرب عدد در بردار', 'بردارهای واحد مختصات'],
            topics: ['vectors'],
          },
          {
            id: 'g8_triangle',
            title: 'مثلث',
            lessons: ['رابطه‌ی فیثاغورس', 'شکل‌های هم‌نهشت', 'مثلث‌های هم‌نهشت', 'هم‌نهشتی مثلث‌های قائم‌الزاویه'],
            topics: ['geometry'],
          },
          {
            id: 'g8_powers',
            title: 'توان و جذر',
            lessons: ['توان', 'تقسیم اعداد توان‌دار', 'جذر تقریبی', 'نمایش اعداد رادیکالی روی محور اعداد', 'خواص ضرب و تقسیم رادیکال‌ها'],
            topics: ['powers'],
          },
          {
            id: 'g8_statistics',
            title: 'آمار و احتمال',
            lessons: ['دسته‌بندی داده‌ها', 'میانگین داده‌ها', 'احتمال یا اندازه‌گیری شانس', 'بررسی حالت‌های ممکن'],
          },
          { id: 'g8_circle', title: 'دایره', lessons: ['خط و دایره', 'زاویه‌های مرکزی', 'زاویه‌های محاطی'] },
        ],
      },
    ],
  },
  {
    grade: 9,
    books: [
      {
        id: 'math9',
        title: 'ریاضی نهم',
        chapters: [
          {
            id: 'g9_sets',
            title: 'مجموعه‌ها',
            lessons: ['معرفی مجموعه', 'مجموعه‌های برابر و نمایش مجموعه‌ها', 'اجتماع، اشتراک و تفاضل مجموعه‌ها', 'مجموعه‌ها و احتمال'],
            topics: ['sets'],
          },
          {
            id: 'g9_reals',
            title: 'عددهای حقیقی',
            lessons: ['عددهای گویا', 'عددهای حقیقی', 'قدر مطلق و محاسبه‌ی تقریبی'],
            topics: ['fractions', 'arithmetic'],
          },
          {
            id: 'g9_proof',
            title: 'استدلال و اثبات در هندسه',
            lessons: ['استدلال', 'آشنایی با اثبات در هندسه', 'هم‌نهشتی مثلث‌ها', 'حل مسئله در هندسه', 'شکل‌های متشابه'],
          },
          {
            id: 'g9_powers',
            title: 'توان و ریشه',
            lessons: ['توان صحیح', 'نماد علمی', 'ریشه‌گیری', 'جمع و تفریق رادیکال‌ها'],
            topics: ['powers'],
          },
          {
            id: 'g9_algebraic',
            title: 'عبارت‌های جبری',
            lessons: ['عبارت‌های جبری و مفهوم اتحاد', 'چند اتحاد دیگر، تجزیه و کاربردها', 'نابرابری‌ها و نامعادله‌ها'],
            topics: ['expressions'],
          },
          {
            id: 'g9_lines',
            title: 'خط و معادله‌های خطی',
            lessons: ['معادله‌ی خط', 'شیب خط و عرض از مبدأ', 'دستگاه معادله‌های خطی'],
            topics: ['linear'],
          },
          {
            id: 'g9_rational',
            title: 'عبارت‌های گویا',
            lessons: ['معرفی و ساده کردن عبارت‌های گویا', 'محاسبات عبارت‌های گویا', 'تقسیم چندجمله‌ای‌ها'],
            topics: ['expressions'],
          },
          {
            id: 'g9_volume',
            title: 'حجم و مساحت',
            lessons: ['حجم و مساحت کره', 'حجم هرم و مخروط', 'سطح و حجم'],
            topics: ['geometry'],
          },
        ],
      },
    ],
  },
  {
    grade: 10,
    books: [
      {
        id: 'math10',
        title: 'ریاضی (۱)',
        track: 'رشته‌های ریاضی و فیزیک — علوم تجربی',
        chapters: [
          {
            id: 'g10_sets',
            title: 'مجموعه، الگو و دنباله',
            lessons: ['مجموعه‌های متناهی و نامتناهی', 'متمم یک مجموعه', 'الگو و دنباله', 'دنباله‌های حسابی و هندسی'],
            topics: ['sets'],
          },
          {
            id: 'g10_trig',
            title: 'مثلثات',
            lessons: ['نسبت‌های مثلثاتی', 'دایره‌ی مثلثاتی', 'روابط بین نسبت‌های مثلثاتی'],
            topics: ['trig'],
          },
          {
            id: 'g10_powers',
            title: 'توان‌های گویا و عبارت‌های جبری',
            lessons: ['ریشه و توان', 'ریشه‌ی nام', 'توان‌های گویا', 'عبارت‌های جبری'],
            topics: ['powers', 'expressions'],
          },
          {
            id: 'g10_equations',
            title: 'معادله‌ها و نامعادله‌ها',
            lessons: ['معادله‌ی درجه دوم و روش‌های مختلف حل آن', 'سهمی', 'تعیین علامت'],
            topics: ['quadratic'],
          },
          { id: 'g10_function', title: 'تابع', lessons: ['مفهوم تابع و بازنمایی‌های آن', 'دامنه و برد توابع', 'انواع تابع'] },
          { id: 'g10_counting', title: 'شمارش، بدون شمردن', lessons: ['شمارش', 'جایگشت', 'ترکیب'] },
          {
            id: 'g10_statistics',
            title: 'آمار و احتمال',
            lessons: ['احتمال یا اندازه‌گیری شانس', 'مقدمه‌ای بر علم آمار، جامعه و نمونه', 'متغیر و انواع آن'],
          },
        ],
      },
      {
        id: 'geometry1',
        title: 'هندسه (۱)',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g10h_constructions',
            title: 'ترسیم‌های هندسی و استدلال',
            lessons: ['ترسیم‌های هندسی', 'استدلال'],
          },
          {
            id: 'g10h_thales',
            title: 'قضیه‌ی تالس، تشابه و کاربردهای آن',
            lessons: ['نسبت و تناسب در هندسه', 'قضیه‌ی تالس', 'تشابه مثلث‌ها', 'کاربردهایی از قضیه‌ی تالس و تشابه مثلث‌ها'],
          },
          {
            id: 'g10h_polygons',
            title: 'چندضلعی‌ها',
            lessons: ['چندضلعی‌ها و ویژگی‌هایی از آن‌ها', 'مساحت و کاربردهای آن'],
          },
          {
            id: 'g10h_solids',
            title: 'تجسم فضایی',
            lessons: ['خط، نقطه و صفحه', 'تفکر تجسمی'],
          },
        ],
      },
    ],
  },
  {
    grade: 11,
    books: [
      {
        id: 'calculus1',
        title: 'حسابان (۱)',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g11c_algebra',
            title: 'جبر و معادله',
            lessons: [
              'مجموع جملات دنباله‌های حسابی و هندسی',
              'معادلات درجه دوم',
              'معادلات گویا و گنگ',
              'قدر مطلق و ویژگی‌های آن',
              'آشنایی با هندسه‌ی تحلیلی',
            ],
            topics: ['quadratic', 'linear'],
          },
          { id: 'g11c_function', title: 'تابع', lessons: ['آشنایی بیشتر با تابع', 'انواع توابع', 'وارون تابع', 'اعمال روی توابع'] },
          {
            id: 'g11c_exp_log',
            title: 'توابع نمایی و لگاریتمی',
            lessons: ['تابع نمایی', 'تابع لگاریتمی و لگاریتم', 'ویژگی‌های لگاریتم و حل معادله‌های لگاریتمی'],
            topics: ['logarithm'],
          },
          {
            id: 'g11c_trig',
            title: 'مثلثات',
            lessons: ['رادیان', 'نسبت‌های مثلثاتی برخی زوایا', 'توابع مثلثاتی', 'روابط مثلثاتی مجموع و تفاضل زوایا'],
            topics: ['trig'],
          },
          {
            id: 'g11c_limits',
            title: 'حد و پیوستگی',
            lessons: [
              'مفهوم حد و فرایندهای حدی',
              'حدهای یک‌طرفه (حد چپ و حد راست)',
              'قضایای حد',
              'محاسبه‌ی حد توابع کسری (حالت ۰/۰)',
              'پیوستگی',
            ],
            topics: ['limit'],
          },
        ],
      },
      {
        id: 'stats11',
        title: 'آمار و احتمال',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          { id: 'g11s_logic', title: 'آشنایی با مبانی ریاضیات', lessons: ['آشنایی با منطق ریاضی', 'جبر مجموعه‌ها'] },
          {
            id: 'g11s_probability',
            title: 'احتمال',
            lessons: ['مبانی احتمال', 'احتمال غیرهم‌شانس', 'احتمال شرطی', 'پیشامدهای مستقل و وابسته'],
          },
          {
            id: 'g11s_descriptive',
            title: 'آمار توصیفی',
            lessons: ['توصیف و نمایش داده‌ها', 'معیارهای گرایش به مرکز', 'معیارهای پراکندگی'],
          },
          { id: 'g11s_inferential', title: 'آمار استنباطی', lessons: ['گردآوری داده‌ها', 'برآورد'] },
        ],
      },
      {
        id: 'geometry2',
        title: 'هندسه (۲)',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g11h_circle',
            title: 'دایره',
            lessons: ['مفاهیم اولیه و زاویه‌ها در دایره', 'رابطه‌های طولی در دایره', 'چندضلعی‌های محاطی و محیطی'],
          },
          {
            id: 'g11h_transformations',
            title: 'تبدیل‌های هندسی و کاربردها',
            lessons: ['تبدیل‌های هندسی', 'کاربرد تبدیل‌ها'],
          },
          {
            id: 'g11h_triangle',
            title: 'روابط طولی در مثلث',
            lessons: ['قضیه‌ی سینوس‌ها', 'قضیه‌ی کسینوس‌ها', 'قضیه‌ی نیمسازهای زوایای داخلی و محاسبه‌ی طول نیمسازها', 'قضیه‌ی هرون (محاسبه‌ی ارتفاع‌ها و مساحت مثلث)'],
          },
        ],
      },
    ],
  },
  {
    grade: 12,
    books: [
      {
        id: 'calculus2',
        title: 'حسابان (۲)',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g12c_function',
            title: 'تابع',
            lessons: ['تبدیل نمودار توابع', 'تابع درجه سوم، توابع یکنوا و بخش‌پذیری و تقسیم'],
          },
          { id: 'g12c_trig', title: 'مثلثات', lessons: ['تناوب و تانژانت', 'معادلات مثلثاتی'], topics: ['trig'] },
          {
            id: 'g12c_limits',
            title: 'حدهای نامتناهی — حد در بی‌نهایت',
            lessons: ['حدهای نامتناهی', 'حد در بی‌نهایت'],
            topics: ['limit'],
          },
          {
            id: 'g12c_derivative',
            title: 'مشتق',
            lessons: ['آشنایی با مفهوم مشتق', 'مشتق‌پذیری و پیوستگی', 'آهنگ متوسط تغییر و آهنگ لحظه‌ای تغییر'],
            topics: ['derivative'],
          },
          {
            id: 'g12c_applications',
            title: 'کاربردهای مشتق',
            lessons: [
              'اکسترمم‌های یک تابع و توابع صعودی و نزولی',
              'جهت تقعر نمودار یک تابع و نقطه‌ی عطف آن',
              'رسم نمودار تابع',
            ],
            topics: ['derivative'],
          },
        ],
      },
      {
        id: 'discrete12',
        title: 'ریاضیات گسسته',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g12d_numbers',
            title: 'آشنایی با نظریه‌ی اعداد',
            lessons: ['استدلال ریاضی', 'بخش‌پذیری در اعداد صحیح', 'هم‌نهشتی در اعداد صحیح و کاربردها'],
          },
          {
            id: 'g12d_graphs',
            title: 'گراف و مدل‌سازی',
            lessons: ['معرفی گراف', 'مدل‌سازی با گراف'],
            topics: ['graphs'],
          },
          { id: 'g12d_counting', title: 'ترکیبیات (شمارش)', lessons: ['مباحثی در ترکیبیات', 'روش‌هایی برای شمارش'] },
        ],
      },
      {
        id: 'geometry3',
        title: 'هندسه (۳)',
        track: 'رشته‌ی ریاضی و فیزیک',
        chapters: [
          {
            id: 'g12h_matrices',
            title: 'ماتریس و کاربردها',
            lessons: ['ماتریس و اعمال روی ماتریس‌ها', 'وارون ماتریس و دترمینان'],
          },
          {
            id: 'g12h_conics',
            title: 'آشنایی با مقاطع مخروطی',
            lessons: ['آشنایی با مقاطع مخروطی و مکان هندسی', 'دایره', 'بیضی و سهمی'],
          },
          {
            id: 'g12h_vectors',
            title: 'بردارها',
            lessons: ['معرفی فضای ℝ³', 'ضرب داخلی و ضرب خارجی بردارها'],
          },
        ],
      },
    ],
  },
];

export const CURRICULUM_GRADES = CURRICULUM.map(g => g.grade);

export function findCurriculumGrade(grade: CurriculumGrade): CurriculumGradeEntry | undefined {
  return CURRICULUM.find(g => g.grade === grade);
}

export interface ChapterRef {
  grade: CurriculumGrade;
  book: string;
  number: number;
  chapter: CurriculumChapter;
}

// Where a topic appears in the textbooks (for "in your books" on a topic page).
export function chaptersForTopic(topicId: TopicId): ChapterRef[] {
  return CURRICULUM.flatMap(({ grade, books }) =>
    books.flatMap(book =>
      book.chapters.flatMap((chapter, i) =>
        chapter.topics?.includes(topicId) ? [{ grade, book: book.title, number: i + 1, chapter }] : [],
      ),
    ),
  );
}
