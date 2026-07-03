export interface DiplomaType {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export interface Instructor {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  specialty?: string;
  hourlyRate?: number;
  rating?: number;
}

export interface Mentor {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  specialty?: string;
  hourlyRate?: number;
  rating?: number;
}

export interface Diploma {
  id: string;
  name: string; // Arabic Name
  description: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'Upcoming' | 'Active' | 'Completed'; // 'قادم' | 'نشط' | 'مكتمل'
  typeId?: string; // links to DiplomaType
  round?: number; // رقم الدورة التي بدأت فيها الدبلومة (e.g. 33, 34, ...)
  location?: 'DT' | 'DM' | 'ON'; // Dokki Tahrir | Dokki Messadk | Online
  instructorId?: string; // links to Instructor
  mentorId?: string; // links to Mentor
  instructorName?: string;
  instructorPhone?: string;
  instructorEmail?: string;
  mentorName?: string;
  mentorPhone?: string;
  mentorEmail?: string;
  googleSheetUrl?: string;
  googleDocUrl?: string; // Google Drive
  googleClassroomUrl?: string; // Google Classroom
  googleFormUrl?: string;
  whatsappGroupUrl?: string;

  // Additional settings
  numberOfSessionsPlanned?: number;
  studyDays?: string; // e.g. "الأحد، الثلاثاء"
  sessionTime?: string; // e.g. "06:00 مساءً"
  studyLocation?: string; // e.g. "المنصة أونلاين"
  requiredAttendanceRate?: number; // e.g. 75
  allowedAbsences?: number; // e.g. 3
  assignments?: Assignment[];
}

export interface AssignmentSubmission {
  submitted: boolean;
  submittedAt?: string;
  grade?: number;
  notes?: string;
}

export interface Assignment {
  id: string;
  diplomaId: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxGrade: number;
  submissions: Record<string, AssignmentSubmission>;
}

export interface DiplomaTemplate {
  id: string;
  name: string; // Arabic name
  description: string;
  estimatedDurationMonths: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Excused' | 'Unmarked'; // 'حاضر' | 'غائب' | 'معذور' | 'غير مسجل'

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  note: string;
}

export interface Session {
  id: string;
  diplomaId: string;
  title: string; // Arabic
  instructor: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string;
  attendance: Record<string, AttendanceRecord>; // keyed by studentId
  googleFormUrl?: string; // Google Form Link
  googleSheetUrl?: string; // Google Sheet Link
  recordingUploaded?: boolean;
  materialsUploaded?: boolean;
  attendanceReviewed?: boolean;
  absenteesFollowedUp?: boolean;
  instructorPresent?: boolean; // Whether the instructor was present for this session
  sessionStatus?: 'Scheduled' | 'Held' | 'Cancelled' | 'Postponed'; // Lifecycle status
}

export interface CommunicationLog {
  id: string;
  date: string; // YYYY-MM-DD or HH:MM
  text: string;
}

export interface Student {
  id: string;
  name: string; // Arabic name
  parentName: string; // Arabic guardian name
  phone: string; // e.g., +966500000000
  diplomaIds: string[]; // assigned to one or more diplomas
  joinedDate: string; // YYYY-MM-DD
  notes: string;
  email?: string;
  communicationLogs?: CommunicationLog[];
  studentType?: string;      // maps to St-Type
  coursePrice?: number;      // maps to Course Price
  remainingAmount?: number;  // maps to Remaining Amount
  payedAmount?: number;      // maps to Payed
  discount?: string;         // maps to Discount
  deposit?: number;          // maps to Deposit
  paymentMethod?: string;    // maps to Payment method
  salesName?: string;        // maps to Sales-Name
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetType: 'all' | 'diploma' | 'students';
  targetDiplomaId?: string; // if diploma
  targetStudentIds?: string[]; // if specific students
  date: string; // YYYY-MM-DD HH:MM
}

export type TaskCategory = 'Academic' | 'Logistics' | 'Communication' | 'Financial' | 'Other';

export interface Task {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  priority: 'Low' | 'Medium' | 'High'; // 'منخفض' | 'متوسط' | 'مرتفع'
  status: 'Pending' | 'In Progress' | 'Completed'; // 'قيد الانتظار' | 'قيد التنفيذ' | 'مكتمل'
  notes: string;
  category?: TaskCategory;
  diplomaId?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
}

export interface AppConfig {
  minAttendanceRate: number; // e.g. 75
  language: 'ar' | 'en'; // Arabic first by default
  groqApiKey?: string;
  groqModel?: string;
  scheduledMessages?: ScheduledMessage[];
  smartNotificationLogs?: SmartNotificationLog[];
}

export interface ScheduledMessage {
  id: string;
  diplomaId: string;
  diplomaName: string;
  messageType: 'session_reminder' | 'absence_warning' | 'custom';
  messageTemplate: string;
  targetGroup: 'all' | 'absent_only' | 'exceeded_absences';
  scheduledAt: string; // ISO datetime string e.g. "2026-06-29T18:00:00"
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  createdAt: string;
  sentAt?: string;
  note?: string;
  createdBy?: string;
}

export type SmartScenarioType =
  | 'absence_last_session'     // غائبو آخر جلسة
  | 'repeated_absence'         // تجاوز حد الغياب
  | 'session_reminder'         // تذكير الجلسة القادمة
  | 'custom';                  // رسالة مخصصة

export interface SmartNotificationLog {
  id: string;
  diplomaId: string;
  diplomaName: string;
  scenarioType: SmartScenarioType;
  studentIds: string[];   // IDs of students messaged
  sentAt: string;         // ISO datetime
  totalSent: number;
  totalSkipped: number;
  messagePreview: string; // first 100 chars
}

export const DEFAULT_CONFIG: AppConfig = {
  minAttendanceRate: 75,
  language: 'ar',
  groqModel: 'llama-3.3-70b-versatile',
  scheduledMessages: [],
  smartNotificationLogs: []
};

export const DEFAULT_ARABIC_TEMPLATES: MessageTemplate[] = [
  {
    id: 'ar-parent-polite',
    name: 'رسالة ودية للطالب (عن الغياب)',
    text: 'السلام عليكم {studentName}، افتقدنا حضورك في جلسة {course} اليوم بتاريخ {date}. نأمل أن يكون المانع خيراً! يرجى مراجعة التسجيل فور رفعه على المنصة لتعويض ما فاتك. نراك الجلسة القادمة 🙂 — إدارة البرنامج.'
  },
  {
    id: 'ar-student-direct',
    name: 'تواصل مباشر مع الطالب (تحفيزي)',
    text: 'مرحباً {studentName}، افتقدنا حضورك المميز اليوم وبصمتك في دبلوم {course} بتاريخ {date}. نتمنى أن تكون بأفضل حال! يرجى الاطلاع على منصتنا التعليمية لمراجعة محاضرات اليوم حتى تظل مواكباً لزملائك. نراك الجلسة القادمة! منسق البرنامج الأكاديمي.'
  },
  {
    id: 'ar-formal-warning',
    name: 'إشعار أكاديمي رسمي (تنبيه غياب)',
    text: 'عزيزي {studentName}، نفيدك علماً بتسجيل غيابك عن الجلسة الأكاديمية لدبلوم {course} بتاريخ {date}. نظراً لأهمية الوحدات والمشاريع العملية الحالية، فإن المواظبة شرط أساسي للاستمرار وإصدار الشهادة. يرجى التواصل معنا لتأكيد سبب الغياب. إدارة الشؤون الأكاديمية.'
  },
  {
    id: 'ar-risk-alert',
    name: 'تنبيه تدني نسبة الحضور (حالة خطر)',
    text: 'تنبيه أكاديمي عاجل: عزيزي {studentName}، نود إشعارك بأن نسبة حضورك في دبلوم {course} قد انخفضت دون الحد المقبول أكاديمياً. استمرار الغياب المتكرر قد يعرضك لعدم الاستحقاق في شهادة الدبلوم. يرجى التواصل معنا عاجلاً لتسوية الوضع وتفادي الاستبعاد الأكاديمي.'
  }
];

// High fidelity demo databases in professional Arabic
export const DUMMY_DIPLOMAS: Diploma[] = [
  {
    id: 'dip-1',
    name: 'دبلوم هندسة البرمجيات المتقدمة',
    description: 'تأهيل شامل للمهندسين لبناء وتصميم الأنظمة السحابية المعقدة وبنية الخدمات المصغرة.',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    status: 'Active',
    studyDays: 'الأحد، الأربعاء',
    sessionTime: '06:00 مساءً'
  },
  {
    id: 'dip-2',
    name: 'دبلوم تطوير الويب المتكامل (Fullstack)',
    description: 'إتقان تقنيات الويب الحديثة وتصميم قواعد البيانات الموزعة وتطوير الواجهات الخلفية.',
    startDate: '2026-02-15',
    endDate: '2026-08-15',
    status: 'Active',
    studyDays: 'السبت، الإثنين، الأربعاء',
    sessionTime: '08:00 مساءً'
  },
  {
    id: 'dip-3',
    name: 'دبلوم تصميم واجهات وتجربة المستخدم UX/UI',
    description: 'دراسة وتطبيق واجهات وتجربة المستخدم الموجهة للمستهلك والتفاعل الإنساني الحاسوبي بروتوتايبينغ.',
    startDate: '2026-07-01',
    endDate: '2026-12-31',
    status: 'Upcoming'
  }
];

export const DUMMY_STUDENTS: Student[] = [
  {
    id: 'st-1',
    name: 'سليمان الحربي',
    parentName: 'أبو سليمان الحربي',
    phone: '+966501111111',
    diplomaIds: ['dip-1', 'dip-2'],
    joinedDate: '2026-01-05',
    notes: 'طالب متميز جداً ولديه خلفية تقنية جيدة. يحتاج متابعة في واجهات React المتقدمة.'
  },
  {
    id: 'st-2',
    name: 'فاطمة الغامدي',
    parentName: 'عبد الرحمن الغامدي',
    phone: '+966502222222',
    diplomaIds: ['dip-1'],
    joinedDate: '2026-01-10',
    notes: 'مجتهدة للغاية، مهارات ممتازة في الخوارزميات وبناء قواعد البيانات.'
  },
  {
    id: 'st-3',
    name: 'خالد العنزي',
    parentName: 'أبو خالد العنزي',
    phone: '+966503333333',
    diplomaIds: ['dip-2'],
    joinedDate: '2026-02-20',
    notes: 'ملتزم بالحضور والأنشطة العملية. يواجه صعوبة في الربط مع واجهات REST في البداية.'
  },
  {
    id: 'st-4',
    name: 'رهف القحطاني',
    parentName: 'علي القحطاني',
    phone: '+966504444444',
    diplomaIds: ['dip-1', 'dip-3'],
    joinedDate: '2026-01-12',
    notes: 'لديها حس فني وجمالي رائع وتدمج بين الجانب البرمجي والجمالي.'
  },
  {
    id: 'st-5',
    name: 'فيصل الثبيتي',
    parentName: 'أبو فيصل الثبيتي',
    phone: '+966505555555',
    diplomaIds: ['dip-2'],
    joinedDate: '2026-02-25',
    notes: 'يحتاج لرفع معدل الحضور لتجنب نزول النسبة لخطورة الغياب.'
  }
];

export const DUMMY_SESSIONS: Session[] = [
  {
    id: 'ses-1',
    diplomaId: 'dip-1',
    title: 'مقدمة في معمارية البرمجيات المتقدمة',
    instructor: 'د. عادل القحطاني',
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '12:00',
    notes: 'تغطية أنماط التصميم والتركيز على الخدمات المصغرة.',
    attendance: {
      'st-1': { studentId: 'st-1', status: 'Present', note: 'مشارك متفاعل' },
      'st-2': { studentId: 'st-2', status: 'Present', note: 'ناقشت بشكل ممتاز' },
      'st-4': { studentId: 'st-4', status: 'Absent', note: 'عذر مرضي مقبول' }
    }
  },
  {
    id: 'ses-2',
    diplomaId: 'dip-1',
    title: 'إدارة الحالة المتطورة وإطار العمل React',
    instructor: 'م. أحمد الشمري',
    date: '2026-06-12',
    startTime: '10:00',
    endTime: '13:00',
    notes: 'شرح فصلي وتطبيقات عملية على Redux Toolkit و Context API.',
    attendance: {
      'st-1': { studentId: 'st-1', status: 'Present', note: 'أنجز تمرين التحدي' },
      'st-2': { studentId: 'st-2', status: 'Present', note: 'متفاعلة' },
      'st-4': { studentId: 'st-4', status: 'Present', note: '' }
    }
  },
  {
    id: 'ses-3',
    diplomaId: 'dip-2',
    title: 'تأسيس قواعد البيانات SQL وتدشين الجداول',
    instructor: 'م. ياسر القاضي',
    date: '2026-06-14',
    startTime: '14:00',
    endTime: '17:00',
    notes: 'إنشاء الجداول والترميز والربط الأساسي والمفاتيح الخارجية.',
    attendance: {
      'st-1': { studentId: 'st-1', status: 'Present', note: 'مشارك بقوة واقترح تحسينات' },
      'st-3': { studentId: 'st-3', status: 'Present', note: 'أنهى التطبيق العملي' },
      'st-5': { studentId: 'st-5', status: 'Absent', note: 'تأخر ولم يدخل المحاضرة' }
    }
  }
];

export const DUMMY_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'اللقاء الارشادي السنوي وعرض المشاريع',
    content: 'يرجى العلم بأنه تم تحديد موعد اللقاء التشاوري الأول لعرض مشاريع دبلوم هندسة البرمجيات غداً لمناقشة التقييمات والأكواد.',
    targetType: 'diploma',
    targetDiplomaId: 'dip-1',
    date: '2026-06-14 10:00'
  },
  {
    id: 'ann-2',
    title: 'تنويه بضرورة مراجعة سجلات الحضور والغياب الأسبوعية',
    content: 'يرجى من جميع منسوبي منصة الدبلومات مراجعة بياناتهم والتحقق من الحضور لتجنب نزول النسبة تحت 75% وبدء تنبيهات WhatsApp.',
    targetType: 'all',
    date: '2026-06-15 08:30'
  }
];

export const DUMMY_TASKS: Task[] = [
  {
    id: 'tsk-1',
    title: 'مراجعة طلبات الغياب وتنسيق الأعذار الطبية المقبولة',
    dueDate: '2026-06-20',
    priority: 'High',
    status: 'Pending',
    notes: 'التحقق من سجلات الطالب فيصل الثبيتي والتواصل مع ولي أمره.'
  },
  {
    id: 'tsk-2',
    title: 'تجهيز قوالب ونماذج شهادات التخرج للمؤهلين',
    dueDate: '2026-06-28',
    priority: 'Medium',
    status: 'In Progress',
    notes: 'حصر المؤهلين للدبلوم الأول وحساب النسبة لمعرفة الأهلية.'
  }
];

export const DEFAULT_DIPLOMA_TEMPLATES: DiplomaTemplate[] = [
  { id: 'dt-ai', name: 'دبلوم الذكاء الاصطناعي وهندسة البيانات (AI)', description: 'دراسة شاملة لتقنيات تعلم الآلة والشبكات العصبية وتطبيقات الذكاء الاصطناعي التوليدي وهندسة البيانات الضخمة.', estimatedDurationMonths: 6 },
  { id: 'dt-da', name: 'دبلوم تحليل البيانات الاحترافي (Data Analysis)', description: 'تحليل وتفسير البيانات الإحصائية المعقدة باستخدام لغات الاستعلام وبايثون وتطبيقات ذكاء الأعمال الموزعة.', estimatedDurationMonths: 4 },
  { id: 'dt-ds', name: 'دبلوم علم البيانات الإستراتيجي (Data Science)', description: 'استكشاف الأنماط المعقدة، التحليل التنبؤي المتطور، وبناء نماذج الاستدلال الرياضي والتعلم للتنبؤ بسلوك الأنظمة.', estimatedDurationMonths: 6 },
  { id: 'dt-cyber', name: 'دبلوم الأمن السيبراني الشامل (Cyber Security)', description: 'حماية وتأمين البنية التحتية البرمجية، اختبار الاختراق الأخلاقي، وتحليل الثغرات للشبكات والخوادم السحابية.', estimatedDurationMonths: 5 },
  { id: 'dt-fs', name: 'دبلوم تطوير الويب المتكامل (Full Stack)', description: 'إتقان بناء وتطوير الواجهات وتصميم قواعد البيانات وبناء واجهات التطبيقات البرمجية المستدامة والمستقلة بالكامل.', estimatedDurationMonths: 6 },
  { id: 'dt-dm', name: 'دبلوم التسويق الرقمي وإدارة النمو (Digital Marketing)', description: 'التسويق بمحركات البحث، ابتكار المزيج الإعلاني الرقمي المتكامل، رصد وتحليل سلوك زوار المواقع والعملاء.', estimatedDurationMonths: 3 },
  { id: 'dt-uiux', name: 'دبلوم تصميم واجهات وتجربة المستخدم (UI/UX)', description: 'تصميم وبناء رحلات مستخدمين سهلة ومشوقة، تخطيط النماذج السلكية والتفاعلية الاحترافية على فيجما Figma وموائمة الهويات البصرية للشركات.', estimatedDurationMonths: 4 }
];

export const DEFAULT_DIPLOMA_TYPES: DiplomaType[] = [
  { id: 'dtype-ai', nameAr: 'دبلومة الذكاء الاصطناعي', nameEn: 'AI Diploma', description: 'دراسة شاملة لتقنيات تعلم الآلة والشبكات العصبية وتطبيقات الذكاء الاصطناعي التوليدي.', status: 'Active' },
  { id: 'dtype-da', nameAr: 'دبلومة تحليل البيانات', nameEn: 'Data Analysis Diploma', description: 'تحليل وتفسير البيانات الإحصائية باستخدام Python وSQL وتطبيقات ذكاء الأعمال.', status: 'Active' },
  { id: 'dtype-ai-adv', nameAr: 'دبلومة الذكاء الاصطناعي المتقدم', nameEn: 'AI Advanced Diploma', description: 'تعمق متقدم في نماذج الـ LLM وهندسة الـ Generative AI وتطبيقات RAG والـ Agents.', status: 'Active' },
  { id: 'dtype-frontend', nameAr: 'دبلومة الفرونت إند', nameEn: 'Front End Diploma', description: 'بناء واجهات ويب تفاعلية باستخدام HTML و CSS و JavaScript وأطر العمل الحديثة.', status: 'Active' },
  { id: 'dtype-backend', nameAr: 'دبلومة الباك إند', nameEn: 'Back End Diploma', description: 'تطوير خوادم وAPIs وقواعد بيانات قوية باستخدام Node.js وPython وDjango.', status: 'Active' },
  { id: 'dtype-fullstack', nameAr: 'دبلومة الفول ستاك', nameEn: 'Fullstack Diploma', description: 'إتقان تطوير الواجهات والخوادم وقواعد البيانات بشكل متكامل من الصفر للنشر.', status: 'Active' },
  { id: 'dtype-flutter', nameAr: 'دبلومة فلاتر لتطوير التطبيقات', nameEn: 'Flutter Diploma', description: 'تطوير تطبيقات موبايل متعددة المنصات باستخدام Flutter و Dart.', status: 'Active' },
  { id: 'dtype-instant', nameAr: 'دبلومة الانطلاق الفوري', nameEn: 'Instant Start Diploma', description: 'برنامج مكثف سريع للانطلاق في عالم التقنية باحترافية في أقصر وقت ممكن.', status: 'Active' },
  { id: 'dtype-uiux', nameAr: 'دبلومة واجهات وتجربة المستخدم', nameEn: 'UI/UX Diploma', description: 'تصميم تجارب مستخدمين احترافية باستخدام Figma ومبادئ تصميم الواجهات.', status: 'Active' },
  { id: 'dtype-net', nameAr: 'دبلومة الشبكات', nameEn: 'Network Diploma', description: 'هندسة وتوجيه وإدارة الشبكات وتأسيس الخوادم ونظم الاتصالات الحديثة.', status: 'Active' },
  { id: 'dtype-soc', nameAr: 'دبلومة مركز عمليات الأمن', nameEn: 'SOC Diploma', description: 'مراقبة التهديدات السيبرانية والاستجابة للحوادث وتحليل السجلات في بيئة SOC.', status: 'Active' },
  { id: 'dtype-pen', nameAr: 'دبلومة اختبار الاختراق', nameEn: 'PEN Diploma', description: 'اختبار اختراق أخلاقي لأنظمة الويب والشبكات واكتشاف الثغرات ومعالجتها.', status: 'Active' },
  { id: 'dtype-testing', nameAr: 'دبلومة اختبار البرمجيات', nameEn: 'Software Testing Diploma', description: 'ضمان جودة البرمجيات عبر الاختبار اليدوي والأتمتة باستخدام Selenium وJest.', status: 'Active' },
  { id: 'dtype-devops', nameAr: 'دبلومة ديف أوبس', nameEn: 'Dev Ops Diploma', description: 'أتمتة النشر وإدارة البنية التحتية باستخدام Docker وKubernetes وCI/CD Pipelines.', status: 'Active' },
  { id: 'dtype-ai-auto', nameAr: 'دبلومة أتمتة الذكاء الاصطناعي', nameEn: 'AI Automation Diploma', description: 'بناء وأتمتة سير العمل الذكي باستخدام أدوات No-Code وLLM APIs وAI Agents.', status: 'Active' },
  { id: 'dtype-de', nameAr: 'دبلومة هندسة البيانات', nameEn: 'Data Engineering Diploma', description: 'بناء خطوط أنابيب البيانات ومعالجتها وتخزينها باستخدام Spark وKafka وAirflow.', status: 'Active' },
];

export const DEFAULT_INSTRUCTORS: Instructor[] = [
  { id: 'inst-4', name: 'Eng. Abanoub', phone: '', email: '', status: 'Active' },
  { id: 'inst-5', name: 'Eng. Abdallah Wageh', phone: '', email: '', status: 'Active' },
  { id: 'inst-6', name: 'Eng. Abdelnaby', phone: '', email: '', status: 'Active' },
  { id: 'inst-7', name: 'Eng. Abdelrahman Afefy', phone: '', email: '', status: 'Active' },
  { id: 'inst-8', name: 'Eng. Abdelrahman Fathy', phone: '', email: '', status: 'Active' },
  { id: 'inst-9', name: 'Eng. Abdelrahman Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-10', name: 'Eng. Abdelrahman Reda', phone: '', email: '', status: 'Active' },
  { id: 'inst-11', name: 'Eng. Abdelrhman Tarek', phone: '', email: '', status: 'Active' },
  { id: 'inst-12', name: 'Eng. Abderhman Farg', phone: '', email: '', status: 'Active' },
  { id: 'inst-13', name: 'Eng. Abderhman Maher', phone: '', email: '', status: 'Active' },
  { id: 'inst-14', name: 'Eng. Abderhman Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-15', name: 'Eng. Abdurahman Fakher Mohammed', phone: '', email: '', status: 'Active' },
  { id: 'inst-16', name: 'Eng. Afaf Wael', phone: '', email: '', status: 'Active' },
  { id: 'inst-17', name: 'Eng. Ahmed Adel', phone: '', email: '', status: 'Active' },
  { id: 'inst-18', name: 'Eng. Ahmed Anwer', phone: '', email: '', status: 'Active' },
  { id: 'inst-19', name: 'Eng. Ahmed Deebs', phone: '', email: '', status: 'Active' },
  { id: 'inst-20', name: 'Eng. Ahmed El Banhawy', phone: '', email: '', status: 'Active' },
  { id: 'inst-21', name: 'Eng. Ahmed El Omda', phone: '', email: '', status: 'Active' },
  { id: 'inst-22', name: 'Eng. Ahmed Farag', phone: '', email: '', status: 'Active' },
  { id: 'inst-23', name: 'Eng. Ahmed Hassan', phone: '', email: '', status: 'Active' },
  { id: 'inst-24', name: 'Eng. Ahmed Hatem', phone: '', email: '', status: 'Active' },
  { id: 'inst-25', name: 'Eng. Ahmed Sobhy', phone: '', email: '', status: 'Active' },
  { id: 'inst-26', name: 'Eng. Ahmed Waleed', phone: '', email: '', status: 'Active' },
  { id: 'inst-27', name: 'Eng. Alaa', phone: '', email: '', status: 'Active' },
  { id: 'inst-28', name: 'Eng. Alaa Adam', phone: '', email: '', status: 'Active' },
  { id: 'inst-29', name: 'Eng. Ali Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-30', name: 'Eng. Alshimaa Abdallahh', phone: '', email: '', status: 'Active' },
  { id: 'inst-31', name: 'Eng. Amr Bughdady', phone: '', email: '', status: 'Active' },
  { id: 'inst-32', name: 'Eng. Anas Emad', phone: '', email: '', status: 'Active' },
  { id: 'inst-33', name: 'Eng. Arwaa Essam', phone: '', email: '', status: 'Active' },
  { id: 'inst-34', name: 'Eng. Asmaa Ahmed', phone: '', email: '', status: 'Active' },
  { id: 'inst-35', name: 'Eng. Assem Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-36', name: 'Eng. Aya Wanis', phone: '', email: '', status: 'Active' },
  { id: 'inst-37', name: 'Eng. Bashar', phone: '', email: '', status: 'Active' },
  { id: 'inst-38', name: 'Eng. Doaa', phone: '', email: '', status: 'Active' },
  { id: 'inst-39', name: 'Eng. Eman Ahmed', phone: '', email: '', status: 'Active' },
  { id: 'inst-40', name: 'Eng. Eman Negm', phone: '', email: '', status: 'Active' },
  { id: 'inst-41', name: 'Eng. Enas', phone: '', email: '', status: 'Active' },
  { id: 'inst-42', name: 'Eng. Eslam Essam', phone: '', email: '', status: 'Active' },
  { id: 'inst-43', name: 'Eng. Farouk Rehan', phone: '', email: '', status: 'Active' },
  { id: 'inst-44', name: 'Eng. Ghada', phone: '', email: '', status: 'Active' },
  { id: 'inst-45', name: 'Eng. Ghada Ahmed', phone: '', email: '', status: 'Active' },
  { id: 'inst-46', name: 'Eng. Habiba Naeam', phone: '', email: '', status: 'Active' },
  { id: 'inst-47', name: 'Eng. Haidi Ali', phone: '', email: '', status: 'Active' },
  { id: 'inst-48', name: 'Eng. Hamdy', phone: '', email: '', status: 'Active' },
  { id: 'inst-49', name: 'Eng. Hamed Hany', phone: '', email: '', status: 'Active' },
  { id: 'inst-50', name: 'Eng. Hassan', phone: '', email: '', status: 'Active' },
  { id: 'inst-51', name: 'Eng. Hazem Sayed', phone: '', email: '', status: 'Active' },
  { id: 'inst-52', name: 'Eng. Hosam Eldeen Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-53', name: 'Eng. Hossam Fakher', phone: '', email: '', status: 'Active' },
  { id: 'inst-54', name: 'Eng. Ibrahem Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-55', name: 'Eng. Jana Hatem', phone: '', email: '', status: 'Active' },
  { id: 'inst-56', name: 'Eng. Khaled Al-Difrawi', phone: '', email: '', status: 'Active' },
  { id: 'inst-57', name: 'Eng. Mahmoud Abd Rab-Elnaby', phone: '', email: '', status: 'Active' },
  { id: 'inst-58', name: 'Eng. Mahmoud El-Shimey', phone: '', email: '', status: 'Active' },
  { id: 'inst-59', name: 'Eng. Mahmoud Elhlaly', phone: '', email: '', status: 'Active' },
  { id: 'inst-60', name: 'Eng. Mahmoud Elshemy', phone: '', email: '', status: 'Active' },
  { id: 'inst-61', name: 'Eng. Mariam Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-62', name: 'Eng. Maryam Mutawa', phone: '', email: '', status: 'Active' },
  { id: 'inst-63', name: 'Eng. Mayar Sweilam', phone: '', email: '', status: 'Active' },
  { id: 'inst-64', name: 'Eng. Mazen Osman', phone: '', email: '', status: 'Active' },
  { id: 'inst-65', name: 'Eng. Mohamed', phone: '', email: '', status: 'Active' },
  { id: 'inst-66', name: 'Eng. Mohamed Abdel Mohsen', phone: '', email: '', status: 'Active' },
  { id: 'inst-67', name: 'Eng. Mohamed Abdelazeem', phone: '', email: '', status: 'Active' },
  { id: 'inst-68', name: 'Eng. Mohamed Abdelnaser', phone: '', email: '', status: 'Active' },
  { id: 'inst-69', name: 'Eng. Mohamed Abo Obida', phone: '', email: '', status: 'Active' },
  { id: 'inst-70', name: 'Eng. Mohamed Aymen', phone: '', email: '', status: 'Active' },
  { id: 'inst-71', name: 'Eng. Mohamed Elgherany', phone: '', email: '', status: 'Active' },
  { id: 'inst-72', name: 'Eng. Mohamed Elhossiny', phone: '', email: '', status: 'Active' },
  { id: 'inst-73', name: 'Eng. Mohamed Khaled', phone: '', email: '', status: 'Active' },
  { id: 'inst-74', name: 'Eng. Mohamed Khatib', phone: '', email: '', status: 'Active' },
  { id: 'inst-75', name: 'Eng. Mohamed L Hossiny', phone: '', email: '', status: 'Active' },
  { id: 'inst-76', name: 'Eng. Mohamed Mostafa', phone: '', email: '', status: 'Active' },
  { id: 'inst-77', name: 'Eng. Mohamed Omran', phone: '', email: '', status: 'Active' },
  { id: 'inst-78', name: 'Eng. Mohamed Tharwat', phone: '', email: '', status: 'Active' },
  { id: 'inst-79', name: 'Eng. Mohamed Waled', phone: '', email: '', status: 'Active' },
  { id: 'inst-80', name: 'Eng. Mohamed Youssef', phone: '', email: '', status: 'Active' },
  { id: 'inst-81', name: 'Eng. Mohammed Abdel-Mohsen', phone: '', email: '', status: 'Active' },
  { id: 'inst-82', name: 'Eng. Momen Yasser', phone: '', email: '', status: 'Active' },
  { id: 'inst-83', name: 'Eng. Mostafa Zyada', phone: '', email: '', status: 'Active' },
  { id: 'inst-84', name: 'Eng. Norhan Zaid', phone: '', email: '', status: 'Active' },
  { id: 'inst-85', name: 'Eng. Omar Abelzez', phone: '', email: '', status: 'Active' },
  { id: 'inst-86', name: 'Eng. Rana', phone: '', email: '', status: 'Active' },
  { id: 'inst-87', name: 'Eng. Rawan Mahmoud', phone: '', email: '', status: 'Active' },
  { id: 'inst-88', name: 'Eng. Sayed Abdelmenem', phone: '', email: '', status: 'Active' },
  { id: 'inst-89', name: 'Eng. Shaimaa', phone: '', email: '', status: 'Active' },
  { id: 'inst-90', name: 'Eng. Shaimaa Abdallah', phone: '', email: '', status: 'Active' },
  { id: 'inst-91', name: 'Eng. Sharliz Nabil', phone: '', email: '', status: 'Active' },
  { id: 'inst-92', name: 'Eng. Sherouk', phone: '', email: '', status: 'Active' },
  { id: 'inst-93', name: 'Eng. Shimaa Ezzat', phone: '', email: '', status: 'Active' },
  { id: 'inst-94', name: 'Eng. Sobhy Farag', phone: '', email: '', status: 'Active' },
  { id: 'inst-95', name: 'Eng. Yasser Hamada', phone: '', email: '', status: 'Active' },
  { id: 'inst-96', name: 'Eng. Yossef', phone: '', email: '', status: 'Active' },
  { id: 'inst-97', name: 'Eng. Youssef El Badri', phone: '', email: '', status: 'Active' },
  { id: 'inst-98', name: 'Eng. Youssef El Khawanki', phone: '', email: '', status: 'Active' },
  { id: 'inst-99', name: 'Eng. Youssef Esmail', phone: '', email: '', status: 'Active' },
  { id: 'inst-100', name: 'Eng. Youssef Karayem', phone: '', email: '', status: 'Active' },
  { id: 'inst-101', name: 'Eng. Zeyad Abdelazim', phone: '', email: '', status: 'Active' }
];

export const DEFAULT_MENTORS: Mentor[] = [
];
