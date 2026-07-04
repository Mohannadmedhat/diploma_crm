import React, { useState, useMemo } from 'react';
import { Diploma, DiplomaTemplate, DiplomaType, Student, Instructor, Mentor } from '../types';
import { STUDY_DAYS_PRESETS } from '../services/business';
import {
  BookOpen,
  Calendar,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  Award,
  User,
  Users,
  Search,
  Filter,
  Link,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Clock,
  MapPin,
  BarChart2,
  Zap,
  Star,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiplomaManagerProps {
  diplomas: Diploma[];
  onSaveDiplomas: (diplomas: Diploma[]) => void;
  onSelectDiploma?: (id: string) => void;
  templates: DiplomaTemplate[];
  diplomaTypes: DiplomaType[];
  students: Student[];
  instructors: Instructor[];
  mentors: Mentor[];
  onSaveInstructors: (insts: Instructor[]) => void;
  onSaveMentors: (ments: Mentor[]) => void;
}

const STEPS = [
  { id: 1, label: 'المعلومات الأساسية', icon: BookOpen, color: 'blue' },
  { id: 2, label: 'الفريق الأكاديمي', icon: Users, color: 'indigo' },
  { id: 3, label: 'الروابط التشغيلية', icon: Link, color: 'emerald' },
  { id: 4, label: 'إعدادات التشغيل', icon: Settings, color: 'amber' },
];

const STEP_COLORS: Record<string, { ring: string; bg: string; text: string; border: string; active: string; activeBg: string }> = {
  blue: { ring: 'ring-blue-500', bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/40', active: 'text-blue-300', activeBg: 'bg-blue-950/30' },
  indigo: { ring: 'ring-indigo-500', bg: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/40', active: 'text-indigo-300', activeBg: 'bg-indigo-950/30' },
  emerald: { ring: 'ring-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/40', active: 'text-emerald-300', activeBg: 'bg-emerald-950/30' },
  amber: { ring: 'ring-amber-500', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/40', active: 'text-amber-300', activeBg: 'bg-amber-950/30' },
};

export default function DiplomaManager({
  diplomas,
  onSaveDiplomas,
  onSelectDiploma,
  templates,
  diplomaTypes,
  students,
  instructors,
  mentors,
  onSaveInstructors,
  onSaveMentors,
}: DiplomaManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});

  // Filter States
  const [filterType, setFilterType] = useState('');
  const [filterInstructor, setFilterInstructor] = useState('');
  const [filterMentor, setFilterMentor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Diploma['status']>('Active');
  const [typeId, setTypeId] = useState('');
  const [round, setRound] = useState<number | null>(null);
  const AVAILABLE_ROUNDS = [33, 34, 35, 36, 37, 38];
  const [location, setLocation] = useState<'DT' | 'DM' | 'ON' | ''>('');
  const [isManualName, setIsManualName] = useState(false);
  const [instructorName, setInstructorName] = useState('');
  const [instructorPhone, setInstructorPhone] = useState('');
  const [instructorEmail, setInstructorEmail] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorPhone, setMentorPhone] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [numberOfSessionsPlanned, setNumberOfSessionsPlanned] = useState<number>(12);
  const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const [selectedDays, setSelectedDays] = useState<string[]>(['السبت', 'الاثنين', 'الأربعاء']);
  const [presetId, setPresetId] = useState<string>('custom');
  const daysToString = (days: string[]) => ALL_WEEK_DAYS.filter(d => days.includes(d)).join('، ');
  const stringToDays = (str: string) => ALL_WEEK_DAYS.filter(d => str.includes(d));
  const toggleDay = (day: string) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  const [sessionTime, setSessionTime] = useState('٨:٠٠ مساءً');
  const [studyLocation, setStudyLocation] = useState('المنصة أونلاين / زووم');
  const [requiredAttendanceRateForm, setRequiredAttendanceRateForm] = useState<number>(75);
  const [allowedAbsencesForm, setAllowedAbsencesForm] = useState<number>(3);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const activeDiplomaTypes = useMemo(() => {
    const active = diplomaTypes.filter((t) => t.status === 'Active');
    return active.length > 0 ? active : diplomaTypes;
  }, [diplomaTypes]);

  const generateDiplomaName = (
    typeIdVal: string,
    selectedDaysVal: string[],
    roundVal: number | null,
    instructorNameVal: string,
    locationVal: 'DT' | 'DM' | 'ON' | ''
  ): string => {
    const type = activeDiplomaTypes.find(t => t.id === typeIdVal);
    if (!type) return '';
    
    // 1. Type name without "Diploma"
    let typeName = type.nameEn || '';
    typeName = typeName.replace(/\s*diploma\s*/gi, '').trim();

    // 2. Days
    const DAY_MAP: Record<string, { letter: string; code3: string; order: number }> = {
      'السبت': { letter: 'S', code3: 'SAT', order: 0 },
      'الأحد': { letter: 'S', code3: 'SUN', order: 1 },
      'الاثنين': { letter: 'M', code3: 'MON', order: 2 },
      'الثلاثاء': { letter: 'T', code3: 'TUE', order: 3 },
      'الأربعاء': { letter: 'W', code3: 'WED', order: 4 },
      'الخميس': { letter: 'T', code3: 'THU', order: 5 },
      'الجمعة': { letter: 'F', code3: 'FRI', order: 6 },
    };

    const sortedDays = [...selectedDaysVal].sort((a, b) => {
      return (DAY_MAP[a]?.order ?? 9) - (DAY_MAP[b]?.order ?? 9);
    });

    let daysPart = '';
    if (sortedDays.length === 1) {
      daysPart = DAY_MAP[sortedDays[0]]?.code3 ?? '';
    } else if (sortedDays.length === 2) {
      daysPart = (DAY_MAP[sortedDays[0]]?.letter ?? '') + (DAY_MAP[sortedDays[1]]?.letter ?? '');
    } else if (sortedDays.length > 2) {
      daysPart = sortedDays.map(d => DAY_MAP[d]?.letter ?? '').join('');
    }

    // 3. Round
    const roundPart = roundVal ? `R${roundVal}` : '';

    // 4. Instructor initial
    let instPart = '';
    if (instructorNameVal) {
      let clean = instructorNameVal.trim();
      const prefixes = ['eng.', 'dr.', 'mr.', 'ms.', 'mrs.', 'د.', 'م.', 'أ.'];
      for (const p of prefixes) {
        if (clean.toLowerCase().startsWith(p)) {
          clean = clean.substring(p.length).trim();
        }
      }
      if (clean) {
        const char = clean.charAt(0).toUpperCase();
        const AR_TO_EN_INITIALS: Record<string, string> = {
          'أ': 'A', 'إ': 'A', 'آ': 'A', 'ا': 'A', 'ع': 'A',
          'ب': 'B',
          'ت': 'T', 'ط': 'T',
          'ث': 'T',
          'ج': 'J',
          'ح': 'H', 'ه': 'H', 'هـ': 'H',
          'خ': 'K', 'ك': 'K',
          'د': 'D', 'ض': 'D',
          'ذ': 'Z', 'ز': 'Z', 'ظ': 'Z',
          'ر': 'R',
          'س': 'S', 'ص': 'S',
          'ش': 'S',
          'ف': 'F',
          'ق': 'Q',
          'ل': 'L',
          'م': 'M',
          'ن': 'N',
          'و': 'W',
          'ي': 'Y'
        };
        instPart = AR_TO_EN_INITIALS[char] || char;
      }
    }

    // Bracket content
    const parts = [daysPart, roundPart, instPart].filter(Boolean);
    const bracket = parts.length > 0 ? `[${parts.join('-')}]` : '';

    return `${typeName}${bracket}${locationVal}`;
  };

  React.useEffect(() => {
    if (showForm && !isManualName) {
      const generated = generateDiplomaName(typeId, selectedDays, round, instructorName, location);
      setName(generated);
    }
  }, [typeId, selectedDays, round, instructorName, location, showForm, isManualName, activeDiplomaTypes]);


  const existingInstructors = useMemo(() => {
    const list: { name: string; phone: string; email: string }[] = [];
    const seen = new Set<string>();
    diplomas.forEach((d) => {
      if (d.instructorName && d.instructorName.trim() && !seen.has(d.instructorName.trim().toLowerCase())) {
        seen.add(d.instructorName.trim().toLowerCase());
        list.push({ name: d.instructorName.trim(), phone: d.instructorPhone || '', email: d.instructorEmail || '' });
      }
    });
    return list;
  }, [diplomas]);

  const existingMentors = useMemo(() => {
    const list: { name: string; phone: string; email: string }[] = [];
    const seen = new Set<string>();
    diplomas.forEach((d) => {
      if (d.mentorName && d.mentorName.trim() && !seen.has(d.mentorName.trim().toLowerCase())) {
        seen.add(d.mentorName.trim().toLowerCase());
        list.push({ name: d.mentorName.trim(), phone: d.mentorPhone || '', email: d.mentorEmail || '' });
      }
    });
    return list;
  }, [diplomas]);

  const resetForm = () => {
    setName(''); setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    setEndDate(sixMonthsLater.toISOString().split('T')[0]);
    setStatus('Active');
    setTypeId(activeDiplomaTypes[0]?.id || '');
    setRound(null);
    setLocation('');
    setIsManualName(false);
    setInstructorName(''); setInstructorPhone(''); setInstructorEmail('');
    setMentorName(''); setMentorPhone(''); setMentorEmail('');
    setGoogleSheetUrl(''); setGoogleFormUrl(''); setWhatsappGroupUrl('');
    setNumberOfSessionsPlanned(12);
    setSelectedDays(['السبت', 'الاثنين', 'الأربعاء']);
    setPresetId('custom');
    setSessionTime('٨:٠٠ مساءً');
    setStudyLocation('المنصة أونلاين / زووم');
    setRequiredAttendanceRateForm(75);
    setAllowedAbsencesForm(3);
    setCurrentStep(1);
    setStepErrors({});
  };

  const handleStartAdd = () => {
    setEditingId(null);
    resetForm();
    setShowForm(true);
  };

  const handleStartEdit = (d: Diploma) => {
    setEditingId(d.id);
    setName(d.name); setDescription(d.description);
    setStartDate(d.startDate); setEndDate(d.endDate); setStatus(d.status);
    setTypeId(d.typeId || '');
    setRound(d.round ?? null);
    setLocation(d.location ?? '');
    setIsManualName(true); // Preserve existing name when editing
    setInstructorName(d.instructorName || ''); setInstructorPhone(d.instructorPhone || ''); setInstructorEmail(d.instructorEmail || '');
    setMentorName(d.mentorName || ''); setMentorPhone(d.mentorPhone || ''); setMentorEmail(d.mentorEmail || '');
    setGoogleSheetUrl(d.googleSheetUrl || ''); setGoogleFormUrl(d.googleFormUrl || ''); setWhatsappGroupUrl(d.whatsappGroupUrl || '');
    setNumberOfSessionsPlanned(d.numberOfSessionsPlanned ?? 12);
    setSelectedDays(stringToDays(d.studyDays ?? 'السبت، الاثنين، الأربعاء'));
    const matched = STUDY_DAYS_PRESETS.find(p => p.value === d.studyDays);
    setPresetId(matched ? matched.id : 'custom');
    setSessionTime(d.sessionTime ?? '٨:٠٠ مساءً');
    setStudyLocation(d.studyLocation ?? 'المنصة أونلاين / زووم');
    setRequiredAttendanceRateForm(d.requiredAttendanceRate ?? 75);
    setAllowedAbsencesForm(d.allowedAbsences ?? 3);
    setCurrentStep(1);
    setStepErrors({});
    setShowForm(true);
  };


  const validateStep = (step: number): string => {
    if (step === 1) {
      if (!typeId) return 'يرجى اختيار نوع الدبلومة.';
      if (!location) return 'يرجى اختيار مكان انعقاد الدبلومة (Location).';
      if (!name.trim()) return 'يرجى إدخال اسم الدبلوم الأكاديمي أو التأكد من إدخال كافة الحقول لتوليده تلقائياً.';
      if (!startDate) return 'يرجى تحديد تاريخ بداية التدريس.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validateStep(currentStep);
    if (err) {
      setStepErrors(prev => ({ ...prev, [currentStep]: err }));
      return;
    }
    setStepErrors(prev => ({ ...prev, [currentStep]: '' }));
    setCurrentStep(s => Math.min(s + 1, 4));
  };

  const handlePrev = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSave = () => {
    const err = validateStep(currentStep);
    if (err) { setStepErrors(prev => ({ ...prev, [currentStep]: err })); return; }

    const savedDiploma: Diploma = {
      id: editingId || `dip-${Date.now()}`,
      name: name.trim(), description: description.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
      status, typeId,
      round: round ?? undefined,
      location: location || undefined,
      instructorName: instructorName.trim(), instructorPhone: instructorPhone.trim(), instructorEmail: instructorEmail.trim(),
      mentorName: mentorName.trim(), mentorPhone: mentorPhone.trim(), mentorEmail: mentorEmail.trim(),
      googleSheetUrl: googleSheetUrl.trim(), googleFormUrl: googleFormUrl.trim(), whatsappGroupUrl: whatsappGroupUrl.trim(),
      numberOfSessionsPlanned: Number(numberOfSessionsPlanned),
      studyDays: presetId !== 'custom'
        ? (STUDY_DAYS_PRESETS.find(p => p.id === presetId)?.value || daysToString(selectedDays))
        : daysToString(selectedDays),
      sessionTime: sessionTime.trim(), studyLocation: studyLocation.trim(),
      requiredAttendanceRate: Number(requiredAttendanceRateForm),
      allowedAbsences: Number(allowedAbsencesForm),
    };

    let updatedList: Diploma[];
    if (editingId) {
      updatedList = diplomas.map((d) => (d.id === editingId ? savedDiploma : d));
    } else {
      updatedList = [...diplomas, savedDiploma];
    }
    onSaveDiplomas(updatedList);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    if (window.confirm(`هل أنت متأكد من مسح دبلوم "${label}"؟ سيؤدي ذلك لفك ارتباط المحاضرات والطلاب المرتبطين.`)) {
      onSaveDiplomas(diplomas.filter((d) => d.id !== id));
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredDiplomas = useMemo(() => {
    return diplomas.filter((d) => {
      const matchType = !filterType || d.typeId === filterType;
      const matchStatus = !filterStatus || d.status === filterStatus;
      const cleanInstFilter = filterInstructor.toLowerCase().trim();
      const matchInstructor = !cleanInstFilter || (d.instructorName && d.instructorName.toLowerCase().includes(cleanInstFilter));
      const cleanMentFilter = filterMentor.toLowerCase().trim();
      const matchMentor = !cleanMentFilter || (d.mentorName && d.mentorName.toLowerCase().includes(cleanMentFilter));
      return matchType && matchStatus && matchInstructor && matchMentor;
    });
  }, [diplomas, filterType, filterStatus, filterInstructor, filterMentor]);

  const getStudentCount = (dipId: string) => students.filter((s) => s.diplomaIds.includes(dipId)).length;
  const selectedTypeName = activeDiplomaTypes.find(t => t.id === typeId)?.nameAr || '';

  /* ───────────────── Step Indicator ───────────────── */
  const StepIndicator = () => (
    <div className="flex items-center justify-between px-2 py-4 mb-2 select-none">
      {STEPS.map((step, idx) => {
        const c = STEP_COLORS[step.color];
        const isActive = currentStep === step.id;
        const isDone = currentStep > step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isDone
                    ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20'
                    : isActive
                      ? `${c.bg} ${c.ring} ring-2 ring-offset-2 ring-offset-[#0F0F0F] shadow-lg`
                      : 'bg-[#111] border-zinc-800'
                  }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                )}
              </div>
              <span className={`text-[10px] font-bold text-center leading-tight ${isActive ? c.active : isDone ? 'text-emerald-400' : 'text-zinc-600'
                }`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-500 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-zinc-800'
                }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ───────────────── Summary Sidebar ───────────────── */
  const SummaryPanel = () => (
    <div className="w-52 shrink-0 bg-[#080808] border border-zinc-900 rounded-xl p-4 space-y-3 self-start sticky top-4">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
        <BarChart2 className="w-3.5 h-3.5" /> ملخص البيانات
      </div>
      <div className="space-y-2.5 text-[11px]">
        {name ? (
          <div>
            <div className="text-zinc-600 mb-0.5">الدبلوم</div>
            <div className="text-white font-semibold leading-snug line-clamp-2">{name}</div>
          </div>
        ) : <div className="text-zinc-700 italic">لم يُدخل اسم بعد...</div>}

        {selectedTypeName && (
          <div>
            <div className="text-zinc-600 mb-0.5">التخصص</div>
            <div className="text-indigo-400 font-semibold">{selectedTypeName}</div>
          </div>
        )}

        {round !== null && (
          <div>
            <div className="text-zinc-600 mb-0.5">الدورة</div>
            <div className="text-blue-400 font-bold font-mono">Round {round}</div>
          </div>
        )}

        {location && (
          <div>
            <div className="text-zinc-600 mb-0.5">الموقع (Branch)</div>
            <div className="text-emerald-450 font-bold font-mono">{location === 'DT' ? 'Dokki Tahrir (DT)' : location === 'DM' ? 'Dokki Messadk (DM)' : 'Online (ON)'}</div>
          </div>
        )}


        {status && (
          <div>
            <div className="text-zinc-600 mb-0.5">الحالة</div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status === 'Active' ? 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40' :
                status === 'Upcoming' ? 'text-blue-400 bg-blue-950/30 border-blue-800/40' :
                  'text-zinc-400 bg-zinc-900 border-zinc-800'
              }`}>
              {status === 'Active' ? 'نشط' : status === 'Upcoming' ? 'قادم' : 'منتهي'}
            </span>
          </div>
        )}

        {startDate && (
          <div>
            <div className="text-zinc-600 mb-0.5">البداية</div>
            <div className="text-zinc-300 font-mono">{startDate}</div>
          </div>
        )}

        {instructorName && (
          <div>
            <div className="text-zinc-600 mb-0.5">المحاضر</div>
            <div className="text-zinc-200 font-semibold">{instructorName}</div>
          </div>
        )}

        {mentorName && (
          <div>
            <div className="text-zinc-600 mb-0.5">المنسق</div>
            <div className="text-zinc-200 font-semibold">{mentorName}</div>
          </div>
        )}

        {numberOfSessionsPlanned > 0 && (
          <div>
            <div className="text-zinc-600 mb-0.5">المحاضرات</div>
            <div className="text-amber-400 font-bold">{numberOfSessionsPlanned} محاضرة</div>
          </div>
        )}

        {selectedDays.length > 0 && (
          <div>
            <div className="text-zinc-600 mb-1">الأيام</div>
            <div className="flex flex-wrap gap-1">
              {selectedDays.map(d => (
                <span key={d} className="px-1.5 py-0.5 bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 rounded text-[9px] font-bold">{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion indicator */}
      <div className="pt-2 border-t border-zinc-900">
        <div className="text-[10px] text-zinc-600 mb-1.5">اكتمال البيانات</div>
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.round(((name ? 1 : 0) + (typeId ? 1 : 0) + (instructorName ? 1 : 0) + (mentorName ? 1 : 0) + (googleFormUrl ? 1 : 0) + (selectedDays.length > 0 ? 1 : 0)) / 6 * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  /* ───────────────── STEP 1: Basic Info ───────────────── */
  const Step1 = () => (
    <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

      {/* Name */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            اسم الدبلوم الأكاديمي (توليد تلقائي)
            <span className="text-rose-400 text-sm leading-none">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsManualName(!isManualName)}
            className={`px-2 py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
              isManualName 
                ? 'bg-amber-955/20 border-amber-800/40 text-amber-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {isManualName ? '✍️ تعديل يدوي نشط' : '⚙️ توليد الاسم تلقائياً'}
          </button>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isManualName}
          placeholder={isManualName ? "اكتب الاسم المخصص..." : "سيتم توليد الاسم تلقائياً..."}
          className={`w-full px-4 py-2.5 border text-sm rounded-lg outline-hidden text-right transition-all ${
            isManualName 
              ? 'bg-[#0A0A0A] border-amber-600/30 text-zinc-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20' 
              : 'bg-[#050505] border-[#1f1f1f] text-zinc-450 cursor-not-allowed select-none'
          }`}
        />
        {!isManualName && (
          <p className="text-[10px] text-zinc-500 mt-1 font-sans">
            * يتم تكوين الاسم تلقائياً عند اختيار: نوع التخصص، الأيام (خطوة 4)، رقم الدورة، المحاضر (خطوة 2)، ومكان الانعقاد.
          </p>
        )}
      </div>

      {/* Type */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
          <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
          نوع التخصص / المنصة
          <span className="text-rose-400 text-sm leading-none">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {activeDiplomaTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setTypeId(type.id)}
              className={`px-3 py-2.5 rounded-lg border text-xs font-semibold text-right transition-all cursor-pointer ${typeId === type.id
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-[#0A0A0A] border-[#262626] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
            >
              <div className="flex items-center gap-1.5">
                {typeId === type.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                <span className="line-clamp-1">{type.nameAr}</span>
              </div>
              <div className="text-[10px] text-zinc-650 font-mono mt-0.5">{type.nameEn}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          مكان انعقاد الدبلومة (Location)
          <span className="text-rose-400 text-sm leading-none">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { v: 'DT', label: 'Dokki Tahrir', code: 'DT' },
            { v: 'DM', label: 'Dokki Messadk', code: 'DM' },
            { v: 'ON', label: 'Online', code: 'ON' },
          ].map((loc) => (
            <button
              key={loc.v}
              type="button"
              onClick={() => {
                setLocation(loc.v as any);
                setStudyLocation(loc.label);
              }}
              className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                location === loc.v
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-[#0A0A0A] border-[#262626] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              <div>{loc.label}</div>
              <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{loc.code}</div>
            </button>
          ))}
        </div>
      </div>


      {/* Round Number */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
          <Star className="w-3.5 h-3.5 text-blue-400" />
          رقم الدورة (Round) التي بدأت فيها هذه الدبلومة
          <span className="text-zinc-600 text-[10px] mr-1">(اختياري)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ROUNDS.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRound(round === r ? null : r)}
              className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                round === r
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-[#0A0A0A] border-[#262626] text-zinc-500 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              R{r}
            </button>
          ))}
          {round !== null && (
            <button
              type="button"
              onClick={() => setRound(null)}
              className="px-3 py-2 rounded-lg border border-rose-900/40 bg-rose-950/10 text-rose-400 text-xs font-semibold cursor-pointer hover:bg-rose-950/20 transition-all"
            >
              ✕ إلغاء
            </button>
          )}
        </div>
        {round !== null && (
          <p className="text-[10px] text-blue-400 mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            الدورة المحددة: Round {round}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
          <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
          حالة الدبلوم
        </label>
        <div className="flex gap-2">
          {[
            { v: 'Upcoming', label: 'قادم قريباً', color: 'blue' },
            { v: 'Active', label: 'نشط ومستمر', color: 'emerald' },
            { v: 'Completed', label: 'مكتمل ومنتهي', color: 'zinc' },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setStatus(opt.v as Diploma['status'])}
              className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${status === opt.v
                  ? opt.color === 'blue' ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                    : opt.color === 'emerald' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-600 text-zinc-300'
                  : 'bg-[#0A0A0A] border-[#262626] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            تاريخ البداية
            <span className="text-rose-400 text-sm leading-none">*</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (_) {} }}
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] focus:border-blue-500 text-xs text-zinc-100 rounded-lg outline-hidden cursor-pointer transition-all"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-600" />
            تاريخ النهاية
            <span className="text-zinc-600 text-[10px] mr-1">(اختياري)</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onClick={(e) => { try { e.currentTarget.showPicker(); } catch (_) {} }}
            className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] focus:border-blue-500 text-xs text-zinc-100 rounded-lg outline-hidden cursor-pointer transition-all"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 mb-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-600" />
          الوصف الأكاديمي ومحاور التدريس
          <span className="text-zinc-600 text-[10px] mr-1">(اختياري)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="الوصف التفصيلي والمنهج العلمي المعتمد للطلاب..."
          rows={3}
          className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#262626] focus:border-blue-500 text-xs text-zinc-100 rounded-lg outline-hidden resize-none text-right placeholder-zinc-700 transition-all"
        />
      </div>
    </motion.div>
  );

  /* ───────────────── STEP 2: Academic Team ───────────────── */
  const Step2 = () => (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

      {/* Quick-pick from registered */}
      <div className="p-3.5 bg-indigo-950/10 border border-indigo-800/20 rounded-xl space-y-3">
        <div className="text-xs font-bold text-indigo-400 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          تعيين سريع من قوائم المسجلين
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1.5 font-bold">اختر محاضراً مسجلاً:</label>
            <select
              onChange={(e) => {
                const selected = instructors.find(i => i.id === e.target.value);
                if (selected) { setInstructorName(selected.name); setInstructorPhone(selected.phone); setInstructorEmail(selected.email); }
              }}
              className="w-full px-2.5 py-2 bg-[#050505] border border-indigo-900/30 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
            >
              <option value="">-- اختر محاضراً --</option>
              {instructors.filter(ins => ins.status === 'Active').map(ins => (
                <option key={ins.id} value={ins.id}>{ins.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1.5 font-bold">اختر منسقاً مسجلاً:</label>
            <select
              onChange={(e) => {
                const selected = mentors.find(m => m.id === e.target.value);
                if (selected) { setMentorName(selected.name); setMentorPhone(selected.phone); setMentorEmail(selected.email); }
              }}
              className="w-full px-2.5 py-2 bg-[#050505] border border-indigo-900/30 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
            >
              <option value="">-- اختر منسقاً --</option>
              {mentors.filter(men => men.status === 'Active').map(men => (
                <option key={men.id} value={men.id}>{men.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Memory chips */}
        {(existingInstructors.length > 0 || existingMentors.length > 0) && (
          <div className="pt-2 border-t border-indigo-900/20">
            <div className="text-[10px] text-zinc-600 mb-2">⚡ من الذاكرة (اختيار سريع):</div>
            <div className="flex flex-wrap gap-1.5">
              {existingInstructors.map((ins, i) => (
                <button
                  key={`ins-sug-${i}`} type="button"
                  onClick={() => { setInstructorName(ins.name); setInstructorPhone(ins.phone); setInstructorEmail(ins.email); }}
                  className="px-2.5 py-1 bg-indigo-900/20 border border-indigo-800/30 text-indigo-300 hover:bg-indigo-900/40 rounded-full text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                >
                  <User className="w-3 h-3" /> {ins.name}
                </button>
              ))}
              {existingMentors.map((men, i) => (
                <button
                  key={`men-sug-${i}`} type="button"
                  onClick={() => { setMentorName(men.name); setMentorPhone(men.phone); setMentorEmail(men.email); }}
                  className="px-2.5 py-1 bg-purple-900/20 border border-purple-800/30 text-purple-300 hover:bg-purple-900/40 rounded-full text-[10px] font-semibold cursor-pointer transition-all flex items-center gap-1"
                >
                  <Award className="w-3 h-3" /> {men.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Instructor + Mentor cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Instructor */}
        <div className="bg-[#0c0c0f] border border-indigo-900/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-xs font-bold text-indigo-300">المحاضر الرئيسي</span>
            <span className="text-[10px] text-zinc-600 font-mono">(Principal Instructor)</span>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">الاسم الكامل:</label>
            <input type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)}
              placeholder="د. عادل القحطاني"
              className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-indigo-500 text-xs text-zinc-200 rounded-lg outline-hidden transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">رقم الهاتف:</label>
              <input type="tel" value={instructorPhone} onChange={e => setInstructorPhone(e.target.value)}
                placeholder="+9665..." dir="ltr"
                className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-indigo-500 text-xs text-zinc-200 rounded-lg outline-hidden text-left transition-all" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">البريد الإلكتروني:</label>
              <input type="email" value={instructorEmail} onChange={e => setInstructorEmail(e.target.value)}
                placeholder="instructor@domain.com" dir="ltr"
                className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-indigo-500 text-xs text-zinc-200 rounded-lg outline-hidden text-left font-sans transition-all" />
            </div>
          </div>
        </div>

        {/* Mentor */}
        <div className="bg-[#0c0c0f] border border-purple-900/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-600/30 flex items-center justify-center">
              <Award className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs font-bold text-purple-300">المنسق / الموجه</span>
            <span className="text-[10px] text-zinc-600 font-mono">(Mentor)</span>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">الاسم الكامل:</label>
            <input type="text" value={mentorName} onChange={e => setMentorName(e.target.value)}
              placeholder="م. ممدوح الشمري"
              className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-purple-500 text-xs text-zinc-200 rounded-lg outline-hidden transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">رقم الهاتف:</label>
              <input type="tel" value={mentorPhone} onChange={e => setMentorPhone(e.target.value)}
                placeholder="+9665..." dir="ltr"
                className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-purple-500 text-xs text-zinc-200 rounded-lg outline-hidden text-left transition-all" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">البريد الإلكتروني:</label>
              <input type="email" value={mentorEmail} onChange={e => setMentorEmail(e.target.value)}
                placeholder="mentor@domain.com" dir="ltr"
                className="w-full px-3 py-2 bg-[#050505] border border-[#1f1f1f] focus:border-purple-500 text-xs text-zinc-200 rounded-lg outline-hidden text-left font-sans transition-all" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ───────────────── STEP 3: Links ───────────────── */
  const LinkField = ({ label, icon: Icon, value, onChange, placeholder }: {
    label: string; icon: React.ElementType; value: string; onChange: (v: string) => void; placeholder: string;
  }) => (
    <div className="bg-[#080808] border border-emerald-900/20 rounded-xl p-4 space-y-2">
      <label className="flex items-center gap-2 text-xs font-bold text-emerald-400">
        <Icon className="w-4 h-4" />
        {label}
        <span className="text-zinc-600 text-[10px] font-normal">(اختياري)</span>
      </label>
      <div className="relative flex items-center gap-2">
        <input
          type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} dir="ltr"
          className="w-full px-3 py-2 bg-[#040404] border border-[#1a1a1a] focus:border-emerald-500 text-xs text-zinc-200 rounded-lg outline-hidden text-left font-sans transition-all pl-10"
        />
        {value && (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => copyUrl(value)}
              className="p-1.5 bg-emerald-900/20 border border-emerald-800/30 text-emerald-400 hover:bg-emerald-900/40 rounded-lg cursor-pointer transition-all"
              title="نسخ الرابط"
            >
              {copiedUrl === value ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>
            <a
              href={value} target="_blank" rel="noopener noreferrer"
              className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all"
              title="فتح الرابط"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
      {value && (value.startsWith('http://') || value.startsWith('https://')) ? (
        <div className="flex items-center gap-1 text-[10px] text-emerald-500">
          <CheckCircle2 className="w-3 h-3" /> رابط صالح
        </div>
      ) : value ? (
        <div className="flex items-center gap-1 text-[10px] text-rose-500">
          <AlertCircle className="w-3 h-3" /> يبدو الرابط غير صحيح
        </div>
      ) : null}
    </div>
  );

  const Step3 = () => (
    <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      <div className="text-xs text-zinc-500 flex items-center gap-2 bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2">
        <Link className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        هذه الروابط تُستخدم في الأتمتة والإشعارات والتقارير التلقائية — كلها اختيارية لكن موصى بها.
      </div>
      <LinkField
        label="نموذج تسجيل الحضور (Google Form)"
        icon={FileSpreadsheet}
        value={googleFormUrl}
        onChange={setGoogleFormUrl}
        placeholder="https://docs.google.com/forms/d/..."
      />
      <LinkField
        label="جدول الردود والبيانات (Google Sheet)"
        icon={FileSpreadsheet}
        value={googleSheetUrl}
        onChange={setGoogleSheetUrl}
        placeholder="https://docs.google.com/spreadsheets/d/..."
      />
      <LinkField
        label="مجموعة واتساب الرسمية للطلاب"
        icon={MessageSquare}
        value={whatsappGroupUrl}
        onChange={setWhatsappGroupUrl}
        placeholder="https://chat.whatsapp.com/..."
      />
    </motion.div>
  );

  /* ───────────────── STEP 4: Run Settings ───────────────── */
  const Step4 = () => (
    <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
      {/* Sessions count */}
      <div className="bg-[#080808] border border-amber-900/20 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Star className="w-4 h-4" />
          عدد المحاضرات المخطط لها
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range" min={1} max={60} value={numberOfSessionsPlanned}
            onChange={e => setNumberOfSessionsPlanned(Number(e.target.value))}
            className="flex-1 premium-slider"
            style={{
              '--slider-fill-percent': `${((numberOfSessionsPlanned - 1) / (60 - 1)) * 100}%`
            } as React.CSSProperties}
          />
          <div className="w-14 h-10 bg-[#0A0A0A] border border-amber-800/30 rounded-lg flex items-center justify-center">
            <span className="text-amber-400 font-bold text-sm font-mono">{numberOfSessionsPlanned}</span>
          </div>
        </div>
      </div>

      {/* Study Days */}
      <div className="bg-[#080808] border border-amber-900/20 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <Calendar className="w-4 h-4" />
          أيام الدراسة الأسبوعية
        </label>
        <select
          value={presetId}
          onChange={(e) => {
            const pId = e.target.value;
            setPresetId(pId);
            if (pId !== 'custom') {
              const preset = STUDY_DAYS_PRESETS.find(p => p.id === pId);
              if (preset) setSelectedDays(preset.days);
            }
          }}
          className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
        >
          {STUDY_DAYS_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.labelEn} ({p.labelAr})</option>
          ))}
          <option value="custom">أيام مخصصة (تحديد يدوي)</option>
        </select>
        <div className="flex flex-wrap gap-2">
          {ALL_WEEK_DAYS.map(day => (
            <button
              key={day} type="button" onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${selectedDays.includes(day)
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                  : 'bg-[#0A0A0A] border-[#262626] text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
            >
              {day}
            </button>
          ))}
        </div>
        {selectedDays.length > 0 && (
          <p className="text-[10px] text-amber-500 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {daysToString(selectedDays)}
          </p>
        )}
      </div>

      {/* Time & Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#080808] border border-amber-900/20 rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <Clock className="w-4 h-4" /> وقت المحاضرة
          </label>
          <input
            type="text" value={sessionTime} onChange={e => setSessionTime(e.target.value)}
            placeholder="مثال: ٨:٠٠ مساءً"
            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-200 rounded-lg outline-hidden text-right transition-all"
          />
        </div>
        <div className="bg-[#080808] border border-amber-900/20 rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <MapPin className="w-4 h-4" /> مكان التدريس
          </label>
          <input
            type="text" value={studyLocation} onChange={e => setStudyLocation(e.target.value)}
            placeholder="مثال: أونلاين / زووم"
            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-200 rounded-lg outline-hidden text-right transition-all"
          />
        </div>
      </div>

      {/* Attendance */}
      <div className="bg-[#080808] border border-amber-900/20 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <BarChart2 className="w-4 h-4" /> سياسة الحضور والغياب
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-zinc-500 mb-2">نسبة المواظبة المطلوبة للتخرج (%):</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={100} value={requiredAttendanceRateForm}
                onChange={e => setRequiredAttendanceRateForm(Number(e.target.value))}
                className="flex-1 premium-slider"
                style={{
                  '--slider-fill-percent': `${requiredAttendanceRateForm}%`
                } as React.CSSProperties}
              />
              <span className="text-amber-300 font-bold text-sm font-mono w-10 text-center">{requiredAttendanceRateForm}%</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-2">عدد الغيابات المسموح بها (حد أقصى):</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAllowedAbsencesForm(Math.max(0, allowedAbsencesForm - 1))}
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold cursor-pointer transition-all">−</button>
              <div className="flex-1 text-center py-1.5 bg-[#0A0A0A] border border-zinc-800 rounded-lg text-amber-300 font-bold text-lg font-mono">{allowedAbsencesForm}</div>
              <button type="button" onClick={() => setAllowedAbsencesForm(allowedAbsencesForm + 1)}
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-bold cursor-pointer transition-all">+</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  /* ───────────────── MAIN RENDER ───────────────── */
  return (
    <div className="space-y-4 text-right" id="diploma-manager-component" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            إدارة الدبلومات والبرامج الأكاديمية
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            إنشاء وتحديث فصول الدبلومات المسندة للفريق الأكاديمي
          </p>
        </div>
        <button
          onClick={handleStartAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95"
          id="btn-add-diploma"
        >
          <Plus className="w-4 h-4" />
          <span>دبلوم جديد</span>
        </button>
      </div>

      {/* Wizard Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
            id="form-diploma-record"
          >
            {/* Form Header */}
            <div className="bg-[#0A0A0A] border-b border-zinc-900 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {editingId ? '✏️ تعديل بيانات الدبلوم' : '🎓 تأسيس دبلوم جديد'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">خطوة {currentStep} من {STEPS.length} — {STEPS[currentStep - 1].label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <StepIndicator />
            </div>

            {/* Form Body */}
            <div className="bg-[#080808] p-6">
              <div className="flex gap-5">
                {/* Main Form Area */}
                <div className="flex-1 min-w-0">
                  {/* Step Error */}
                  <AnimatePresence>
                    {stepErrors[currentStep] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 bg-rose-950/20 border border-rose-800/30 text-rose-300 text-xs rounded-lg flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{stepErrors[currentStep]}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {currentStep === 1 && <Step1 key="s1" />}
                    {currentStep === 2 && <Step2 key="s2" />}
                    {currentStep === 3 && <Step3 key="s3" />}
                    {currentStep === 4 && <Step4 key="s4" />}
                  </AnimatePresence>
                </div>

                {/* Summary Sidebar */}
                <SummaryPanel />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-5 mt-5 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentStep === 1}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border border-zinc-800"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>

                <div className="flex items-center gap-1.5">
                  {STEPS.map(s => (
                    <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${s.id === currentStep ? 'w-6 bg-blue-500' : s.id < currentStep ? 'w-3 bg-emerald-500' : 'w-3 bg-zinc-800'
                      }`} />
                  ))}
                </div>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? 'تأكيد التعديلات' : 'تدشين الدبلوم 🎓'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl text-xs space-y-3 select-none">
        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400" />
          تصفية قاعدة البيانات:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">النوع:</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded font-sans cursor-pointer text-zinc-300 outline-hidden">
              <option value="">-- كل الأنواع --</option>
              {diplomaTypes.map((t) => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">المحاضر:</label>
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input type="text" value={filterInstructor} onChange={e => setFilterInstructor(e.target.value)}
                placeholder="اسم المحاضر..."
                className="w-full pr-7 pl-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded text-zinc-300 outline-hidden" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">المنسق:</label>
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input type="text" value={filterMentor} onChange={e => setFilterMentor(e.target.value)}
                placeholder="المنتور المسؤول..."
                className="w-full pr-7 pl-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded text-zinc-300 outline-hidden" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">الحالة:</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded cursor-pointer text-zinc-300 outline-hidden">
              <option value="">-- كل الحالات --</option>
              <option value="Upcoming">قادم / غير نشط</option>
              <option value="Active">نشط ومستمر</option>
              <option value="Completed">مكتمل ومنتهي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Diploma Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDiplomas.map((dip) => {
          const isActive = dip.status === 'Active';
          const isUpcoming = dip.status === 'Upcoming';
          const statusColor = isActive
            ? 'text-emerald-400 bg-emerald-950/20 border-emerald-800/40'
            : isUpcoming
              ? 'text-blue-400 bg-blue-950/20 border-blue-800/40'
              : 'text-zinc-400 bg-zinc-900/40 border-zinc-800';
          const statusText = isActive ? 'نشط' : isUpcoming ? 'قادم' : 'منتهي';
          const matchedType = diplomaTypes.find((t) => t.id === dip.typeId);
          const studCount = getStudentCount(dip.id);

          return (
            <motion.div
              key={dip.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-[#0A0A0A] border border-[#1e1e1e] hover:border-zinc-700 rounded-xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="space-y-3">
                {/* Status + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>{statusText}</span>
                    {dip.round && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-blue-800/40 bg-blue-950/20 text-blue-400 font-mono">
                        R{dip.round}
                      </span>
                    )}
                    {dip.location && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-800/40 bg-emerald-950/20 text-emerald-400 font-mono">
                        {dip.location}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(dip)}
                      className="p-1.5 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 cursor-pointer transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {onSelectDiploma && (
                      <button
                        onClick={() => onSelectDiploma(dip.id)}
                        className="p-1.5 bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 rounded-lg border border-indigo-800/30 cursor-pointer transition-all"
                        title="فتح"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(dip.id, dip.name)}
                      className="p-1.5 text-zinc-600 hover:text-rose-400 cursor-pointer transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Name & Type */}
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <h4 className="text-xs font-bold text-white leading-relaxed">{dip.name}</h4>
                  </div>
                  {matchedType && (
                    <div className="text-[10px] font-bold text-indigo-400 tracking-wide pr-6">{matchedType.nameAr}</div>
                  )}
                </div>

                {dip.description && (
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans line-clamp-2 pr-6">{dip.description}</p>
                )}

                {/* Team */}
                <div className="space-y-1.5 border-t border-zinc-900 pt-2.5">
                  {dip.instructorName && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-zinc-500">المحاضر:</span>
                      <span className="text-zinc-200 font-semibold">{dip.instructorName}</span>
                    </div>
                  )}
                  {dip.mentorName && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Award className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                      <span className="text-zinc-500">المنسق:</span>
                      <span className="text-zinc-200 font-semibold">{dip.mentorName}</span>
                    </div>
                  )}
                </div>

                {/* Quick links */}
                {(dip.googleFormUrl || dip.whatsappGroupUrl) && (
                  <div className="flex gap-1.5 pt-1">
                    {dip.googleFormUrl && (
                      <a href={dip.googleFormUrl} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 bg-emerald-900/20 border border-emerald-800/30 text-emerald-400 rounded text-[10px] font-semibold hover:bg-emerald-900/40 transition-all flex items-center gap-1">
                        <FileSpreadsheet className="w-3 h-3" /> Form
                      </a>
                    )}
                    {dip.whatsappGroupUrl && (
                      <a href={dip.whatsappGroupUrl} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 bg-green-900/20 border border-green-800/30 text-green-400 rounded text-[10px] font-semibold hover:bg-green-900/40 transition-all flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> WA
                      </a>
                    )}
                  </div>
                )}

                {/* Students count */}
                <div className="flex items-center justify-between text-[11px] bg-zinc-950/50 p-2 rounded-lg border border-zinc-900">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    <span>الطلاب المقيدين</span>
                  </div>
                  <span className="font-bold text-white font-mono bg-zinc-900 px-2 py-0.5 rounded-md text-xs">{studCount}</span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center justify-between text-[10px] text-zinc-600 font-mono border-t border-zinc-900 pt-2.5">
                <span>📅 {dip.startDate}</span>
                {dip.endDate && <span>🏁 {dip.endDate}</span>}
              </div>
            </motion.div>
          );
        })}

        {filteredDiplomas.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 p-12 text-center bg-[#070707] border border-dashed border-zinc-900 rounded-xl">
            <GraduationCap className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 font-semibold mb-1">لا توجد دبلومات</p>
            <p className="text-xs text-zinc-700">لا توجد دبلومات مطابقة لفلاتر التصفية الحالية.</p>
          </div>
        )}
      </div>
    </div>
  );
}
