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
  Check,
  X,
  ShieldAlert,
  Award,
  User,
  Phone,
  Mail,
  Users,
  Search,
  Filter,
  Link,
  MessageSquare,
  FileSpreadsheet
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
  onSaveMentors
}: DiplomaManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  // New critical form states
  const [typeId, setTypeId] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorPhone, setInstructorPhone] = useState('');
  const [instructorEmail, setInstructorEmail] = useState('');
  const [mentorName, setMentorName] = useState('');
  const [mentorPhone, setMentorPhone] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');

  // NEW: Diploma run settings for Section 8
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

  const [error, setError] = useState('');

  // Extract unique instructors and mentors across existing diplomas to enable fast-choice autocomplete
  const existingInstructors = useMemo(() => {
    const list: { name: string; phone: string; email: string }[] = [];
    const seen = new Set<string>();
    diplomas.forEach((d) => {
      if (d.instructorName && d.instructorName.trim() && !seen.has(d.instructorName.trim().toLowerCase())) {
        seen.add(d.instructorName.trim().toLowerCase());
        list.push({
          name: d.instructorName.trim(),
          phone: d.instructorPhone || '',
          email: d.instructorEmail || ''
        });
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
        list.push({
          name: d.mentorName.trim(),
          phone: d.mentorPhone || '',
          email: d.mentorEmail || ''
        });
      }
    });
    return list;
  }, [diplomas]);

  // Load active diploma types only (fallback to all if somehow empty or non active)
  const activeDiplomaTypes = useMemo(() => {
    const active = diplomaTypes.filter((t) => t.status === 'Active');
    return active.length > 0 ? active : diplomaTypes;
  }, [diplomaTypes]);

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    // 6 months default end date
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    setEndDate(sixMonthsLater.toISOString().split('T')[0]);
    setStatus('Active');

    // Reset extras
    setTypeId(activeDiplomaTypes[0]?.id || '');
    setInstructorName('');
    setInstructorPhone('');
    setInstructorEmail('');
    setMentorName('');
    setMentorPhone('');
    setMentorEmail('');
    setGoogleSheetUrl('');
    setGoogleFormUrl('');
    setWhatsappGroupUrl('');

    // Reset run settings (Section 8)
    setNumberOfSessionsPlanned(12);
    setSelectedDays(['السبت', 'الاثنين', 'الأربعاء']);
    setPresetId('custom');
    setSessionTime('٨:٠٠ مساءً');
    setStudyLocation('المنصة أونلاين / زووم');
    setRequiredAttendanceRateForm(75);
    setAllowedAbsencesForm(3);

    setShowForm(true);
    setError('');
  };

  const handleStartEdit = (d: Diploma) => {
    setEditingId(d.id);
    setName(d.name);
    setDescription(d.description);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setStatus(d.status);

    // Load extras
    setTypeId(d.typeId || '');
    setInstructorName(d.instructorName || '');
    setInstructorPhone(d.instructorPhone || '');
    setInstructorEmail(d.instructorEmail || '');
    setMentorName(d.mentorName || '');
    setMentorPhone(d.mentorPhone || '');
    setMentorEmail(d.mentorEmail || '');
    setGoogleSheetUrl(d.googleSheetUrl || '');
    setGoogleFormUrl(d.googleFormUrl || '');
    setWhatsappGroupUrl(d.whatsappGroupUrl || '');

    // Load run settings
    setNumberOfSessionsPlanned(d.numberOfSessionsPlanned ?? 12);
    setSelectedDays(stringToDays(d.studyDays ?? 'السبت، الاثنين، الأربعاء'));
    const matched = STUDY_DAYS_PRESETS.find(p => p.value === d.studyDays);
    setPresetId(matched ? matched.id : (d.studyDays ? 'custom' : 'custom'));
    setSessionTime(d.sessionTime ?? '٨:٠٠ مساءً');
    setStudyLocation(d.studyLocation ?? 'المنصة أونلاين / زووم');
    setRequiredAttendanceRateForm(d.requiredAttendanceRate ?? 75);
    setAllowedAbsencesForm(d.allowedAbsences ?? 3);

    setShowForm(true);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم الدبلوم الأكاديمي.');
      return;
    }

    if (!typeId) {
      setError('يرجى اختيار نوع الدبلومة الصحيح المتطابق مع المنصة.');
      return;
    }

    const savedDiploma: Diploma = {
      id: editingId || `dip-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '', // End date is optional
      status,
      typeId,
      instructorName: instructorName.trim(),
      instructorPhone: instructorPhone.trim(),
      instructorEmail: instructorEmail.trim(),
      mentorName: mentorName.trim(),
      mentorPhone: mentorPhone.trim(),
      mentorEmail: mentorEmail.trim(),
      googleSheetUrl: googleSheetUrl.trim(),
      googleFormUrl: googleFormUrl.trim(),
      whatsappGroupUrl: whatsappGroupUrl.trim(),
      
      // Save run settings
      numberOfSessionsPlanned: Number(numberOfSessionsPlanned),
      studyDays: presetId !== 'custom' 
        ? (STUDY_DAYS_PRESETS.find(p => p.id === presetId)?.value || daysToString(selectedDays))
        : daysToString(selectedDays),
      sessionTime: sessionTime.trim(),
      studyLocation: studyLocation.trim(),
      requiredAttendanceRate: Number(requiredAttendanceRateForm),
      allowedAbsences: Number(allowedAbsencesForm)
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

  // Filter computation
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

  const getStudentCount = (dipId: string) => {
    return students.filter((s) => s.diplomaIds.includes(dipId)).length;
  };

  return (
    <div className="space-y-4 text-right" id="diploma-manager-component" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            إدارة الدبلومات والبرامج الأكاديمية (Diploma Catalog)
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">إنشاء وتحديث فصول الدبلومات المسندة للفريق الأكاديمي والروابط الخدمية</p>
        </div>
        <button
          onClick={handleStartAdd}
          className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md active:scale-95"
          id="btn-add-diploma"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة دبلوم جديد</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-955/20 border border-red-500/20 text-red-100 text-xs rounded flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Diploma entry/edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-zinc-900 rounded-xl space-y-4 shadow-xl"
            onSubmit={handleSave}
            id="form-diploma-record"
          >
            <div className="text-xs font-bold text-[#3B82F6] uppercase border-b border-zinc-900 pb-1.5 flex items-center justify-between">
              <span>{editingId ? 'صيانة معلومات ومحاور المسار الأكاديمي' : 'تأسيس مسار دبلوم جديد متكامل'}</span>
              {!editingId && templates.length > 0 && (
                <span className="text-[10px] text-zinc-400 font-sans font-normal">تأسيس ذكي مسند للقوالب المعتمدة</span>
              )}
            </div>

            {/* Template select prefill (Optional) */}
            {!editingId && templates.length > 0 && (
              <div className="p-3 bg-amber-950/10 border border-amber-900/10 rounded-lg space-y-1.5">
                <label className="block text-xs font-bold text-amber-500 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  اختر تخصص دبلوم سابق لملء البيانات والمسمى تلقائياً:
                </label>
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      const chosen = templates.find((t) => t.id === val);
                      if (chosen) {
                        setName(chosen.name);
                        setDescription(chosen.description);
                        // Also try to pre-select correct type
                        const matchingType = diplomaTypes.find(
                          (t) =>
                            t.nameAr.toLowerCase().includes(chosen.name.toLowerCase()) ||
                            chosen.name.toLowerCase().includes(t.nameAr.toLowerCase())
                        );
                        if (matchingType) {
                          setTypeId(matchingType.id);
                        }
                        
                        const referenceDate = startDate ? new Date(startDate) : new Date();
                        if (!isNaN(referenceDate.getTime())) {
                          referenceDate.setMonth(referenceDate.getMonth() + chosen.estimatedDurationMonths);
                          setEndDate(referenceDate.toISOString().split('T')[0]);
                        }
                      }
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-amber-900/20 text-xs text-amber-200 rounded outline-hidden cursor-pointer"
                  id="select-diploma-template-prefill"
                >
                  <option value="">-- اختر قالب معتمد مجدول مسبقاً (اختياري) --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Core Data Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  اسم ومسمى الدبلوم الأكاديمي (مثال: دبلوم مبرمج الويب - الدفعة الأولى)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: دبلوم هندسة البرمجيات المتقدمة - الدفعة الثانية"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  نوع الدبلومة (تخصص المنصة الأساسي) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                  required
                >
                  <option value="">-- اختر نوع التخصص --</option>
                  {activeDiplomaTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.nameAr} ({type.nameEn})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  الوصف الأكاديمي ومحاور التدريس
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="الوصف التفصيلي والمنهج العلمي المعتمد للطلاب..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-none text-right placeholder-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  حالة الدبلوم الحالية
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Diploma['status'])}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                >
                  <option value="Upcoming">قريباً / قادم غير نشط (Upcoming)</option>
                  <option value="Active">نشط ومستمر حالياً (Active)</option>
                  <option value="Completed">مكتمل ومنتهي (Completed)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  تاريخ بداية التدريس
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  تاريخ النهاية المتوقع (اختياري)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                />
              </div>
            </div>

            {/* 3. Academic Team Section */}
            <div className="p-4 bg-zinc-950/40 border border-[#262626] rounded-xl space-y-4">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                <User className="w-4 h-4 text-indigo-400" />
                بيانات الفريق الأكاديمي المهني (Academic Team)
              </div>

              {/* Master selectors row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#09090C] border border-[#1F1F27]/60 p-3 rounded-lg">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5 font-bold">تعيين سريع للمحاضر من قائمة المحاضرين المسجلين:</label>
                  <select
                    onChange={(e) => {
                      const selected = instructors.find(i => i.id === e.target.value);
                      if (selected) {
                        setInstructorName(selected.name);
                        setInstructorPhone(selected.phone);
                        setInstructorEmail(selected.email);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                  >
                    <option value="">-- اختر محاضر معتمد من المسجلين --</option>
                    {instructors.filter(ins => ins.status === 'Active').map(ins => (
                      <option key={ins.id} value={ins.id}>{ins.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5 font-bold">تعيين سريع للـمنسق من المنسقين المسجلين:</label>
                  <select
                    onChange={(e) => {
                      const selected = mentors.find(m => m.id === e.target.value);
                      if (selected) {
                        setMentorName(selected.name);
                        setMentorPhone(selected.phone);
                        setMentorEmail(selected.email);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                  >
                    <option value="">-- اختر منسق (منتور) معتمد من المسجلين --</option>
                    {mentors.filter(men => men.status === 'Active').map(men => (
                      <option key={men.id} value={men.id}>{men.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Suggestions row from memory (only if there are previous entries in diplomas) */}
              {(existingInstructors.length > 0 || existingMentors.length > 0) && (
                <div className="flex flex-wrap gap-2 items-center bg-[#070707] p-2.5 rounded text-[10px]">
                  <span className="text-zinc-500">من الذاكرة سريعة الاختيار:</span>
                  {existingInstructors.map((ins, i) => (
                    <button
                      key={`ins-sug-${i}`}
                      type="button"
                      onClick={() => {
                        setInstructorName(ins.name);
                        setInstructorPhone(ins.phone);
                        setInstructorEmail(ins.email);
                      }}
                      className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded cursor-pointer transition-colors"
                    >
                      محاضر: {ins.name}
                    </button>
                  ))}
                  {existingMentors.map((men, i) => (
                    <button
                      key={`men-sug-${i}`}
                      type="button"
                      onClick={() => {
                        setMentorName(men.name);
                        setMentorPhone(men.phone);
                        setMentorEmail(men.email);
                      }}
                      className="px-2 py-0.5 bg-zinc-900 border border-zinc-805 text-zinc-300 hover:text-white rounded cursor-pointer transition-colors"
                    >
                      منتور: {men.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Main Instructor */}
                <div className="space-y-3 bg-[#0c0c0c] p-3 rounded-lg border border-zinc-900">
                  <span className="text-xs font-bold text-zinc-300 block">المحاضر الرئيسي (Principal Instructor)</span>
                  
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">اسم المحاضر:</label>
                    <input
                      type="text"
                      value={instructorName}
                      onChange={(e) => setInstructorName(e.target.value)}
                      placeholder="د. عادل القحطاني"
                      className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رقم الهاتف:</label>
                      <input
                        type="tel"
                        value={instructorPhone}
                        onChange={(e) => setInstructorPhone(e.target.value)}
                        placeholder="+9665..."
                        className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">البريد الإلكتروني:</label>
                      <input
                        type="email"
                        value={instructorEmail}
                        onChange={(e) => setInstructorEmail(e.target.value)}
                        placeholder="instructor@domain.com"
                        className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden text-left font-sans"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Mentor */}
                <div className="space-y-3 bg-[#0c0c0c] p-3 rounded-lg border border-zinc-900">
                  <span className="text-xs font-bold text-zinc-300 block">المنسق / موجه دبلوم (Mentor Name)</span>
                  
                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">اسم المنتور المسؤول:</label>
                    <input
                      type="text"
                      value={mentorName}
                      onChange={(e) => setMentorName(e.target.value)}
                      placeholder="م. ممدوح الشمري"
                      className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رقم هاتف المنتور:</label>
                      <input
                        type="tel"
                        value={mentorPhone}
                        onChange={(e) => setMentorPhone(e.target.value)}
                        placeholder="+9665..."
                        className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden text-left"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">البريد الإلكتروني:</label>
                      <input
                        type="email"
                        value={mentorEmail}
                        onChange={(e) => setMentorEmail(e.target.value)}
                        placeholder="mentor@domain.com"
                        className="w-full px-2.5 py-1.5 bg-[#050505] border border-[#1f1f1f] text-xs text-zinc-200 rounded outline-hidden text-left font-sans"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

             {/* Integration Links */}
            <div className="p-4 bg-zinc-950/40 border border-[#262626] rounded-xl space-y-3">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <Link className="w-4 h-4 text-emerald-450" />
                الروابط التشغيلية وقنوات التواصل (Diploma Operations Links)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1">رابط نموذج الحضور (Google Form URL)</label>
                  <input
                    type="url"
                    value={googleFormUrl}
                    onChange={(e) => setGoogleFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/..."
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] focus:border-emerald-500 text-xs text-zinc-200 rounded outline-hidden text-left font-sans"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1 col-span-2">رابط جدول الردود المرفق (Google Sheet URL)</label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] focus:border-emerald-500 text-xs text-zinc-200 rounded outline-hidden text-left font-sans"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 mb-1 col-span-2">المجموعة الرسمية للطلاب (WhatsApp Group URL)</label>
                  <input
                    type="url"
                    value={whatsappGroupUrl}
                    onChange={(e) => setWhatsappGroupUrl(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] focus:border-emerald-500 text-xs text-zinc-200 rounded outline-hidden text-left font-sans"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* NEW: Operational Run Settings Section (Requirement 8) */}
            <div className="p-4 bg-zinc-950/40 border border-[#262626] rounded-xl space-y-4">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                إعدادات تشغيل الدبلوم وتدبير الحضور والأهلية (Operational Run Settings)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5">عدد محاضرات الدبلوم المخطط لها:</label>
                  <input
                    type="number"
                    value={numberOfSessionsPlanned}
                    onChange={(e) => setNumberOfSessionsPlanned(Number(e.target.value))}
                    min={1}
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 mb-1.5">نمط أيام الدراسة الأسبوعية:</label>
                    <select
                      value={presetId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setPresetId(pId);
                        if (pId !== 'custom') {
                          const preset = STUDY_DAYS_PRESETS.find(p => p.id === pId);
                          if (preset) {
                            setSelectedDays(preset.days);
                          }
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden cursor-pointer"
                    >
                      {STUDY_DAYS_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.labelEn} ({p.labelAr})
                        </option>
                      ))}
                      <option value="custom">أيام مخصصة (تحديد يدوي)...</option>
                    </select>
                  </div>

                  {presetId === 'custom' && (
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1.5">اختر الأيام المخصصة:</label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_WEEK_DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              selectedDays.includes(day)
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-[#0A0A0A] border-[#262626] text-zinc-500 hover:border-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDays.length > 0 && (
                    <p className="text-[10px] text-indigo-400 mt-1.5 font-sans">✔ محدد: {daysToString(selectedDays)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5">موعد توقيت المحاضرات:</label>
                  <input
                    type="text"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    placeholder="مثال: 08:30 مساءً"
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5">مقر / مكان التدريس:</label>
                  <input
                    type="text"
                    value={studyLocation}
                    onChange={(e) => setStudyLocation(e.target.value)}
                    placeholder="مثال: أونلاين عبر المنصة"
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden text-right"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5">نسبة المواظبة المطلوبة للتخرج والعمل (%):</label>
                  <input
                    type="number"
                    value={requiredAttendanceRateForm}
                    onChange={(e) => setRequiredAttendanceRateForm(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden text-center"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-400 mb-1.5">عدد الغيابات المسموح بها كأقصى حد:</label>
                  <input
                    type="number"
                    value={allowedAbsencesForm}
                    onChange={(e) => setAllowedAbsencesForm(Number(e.target.value))}
                    min={0}
                    className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-[#E2E8F0] rounded outline-hidden text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-900">
              <button
                type="submit"
                className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-lg"
              >
                {editingId ? 'تأكيد الحفظ والتعديلات' : 'تدشين الدبلوم رسمياً'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Database Filters Bar */}
      <div className="p-4 bg-[#0A0A0A] border border-[#262626] rounded-xl text-xs space-y-3.5 select-none">
        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400" />
          تصفية ومسح قاعدة البيانات:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">تصفية بنوع الدبلوم:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded font-sans cursor-pointer text-zinc-300"
            >
              <option value="">-- كُل الأنواع والمسارات --</option>
              {diplomaTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">اسم المحاضر:</label>
            <input
              type="text"
              value={filterInstructor}
              onChange={(e) => setFilterInstructor(e.target.value)}
              placeholder="اسم المحاضر للبحث..."
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded text-zinc-300"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">اسم المنتور:</label>
            <input
              type="text"
              value={filterMentor}
              onChange={(e) => setFilterMentor(e.target.value)}
              placeholder="المنتور المسؤول للبحث..."
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded text-zinc-300"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">حالة الدبلوم التدريبي:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-zinc-800 rounded cursor-pointer text-zinc-300"
            >
              <option value="">-- كُل الحالات التشغيلية --</option>
              <option value="Upcoming">قريباً / قادم غير نشط</option>
              <option value="Active">نشط ومستمر حالياً</option>
              <option value="Completed">مكتمل ومنتهي</option>
            </select>
          </div>
        </div>
      </div>

      {/* Diplomas database grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDiplomas.map((dip) => {
          let statusColor = 'text-blue-400 bg-blue-950/20 border-blue-900/40';
          let statusText = 'قريباً / قادم';
          if (dip.status === 'Active') {
            statusColor = 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40';
            statusText = 'نشط ومستمر';
          } else if (dip.status === 'Completed') {
            statusColor = 'text-zinc-400 bg-zinc-950/40 border-zinc-800';
            statusText = 'منتهي ومكتمل';
          }

          const matchedType = diplomaTypes.find((t) => t.id === dip.typeId);
          const studCount = getStudentCount(dip.id);

          return (
            <div
              key={dip.id}
              className="bg-[#0F0F0F]/60 border border-[#262626] rounded-xl p-4 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {statusText}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(dip)}
                      className="p-1 px-1.5 bg-zinc-900 text-[10px] rounded border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="مراجعة الإعدادات"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(dip.id, dip.name)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="حذف الدبلومة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#3B82F6] shrink-0" />
                    <h4 className="text-xs font-bold text-white leading-normal leading-relaxed">{dip.name}</h4>
                  </div>
                  {matchedType && (
                    <div className="text-[10px] font-bold text-indigo-400 font-sans tracking-wide">
                      تخصص: {matchedType.nameAr}
                    </div>
                  )}
                </div>

                {dip.description && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans line-clamp-2">{dip.description}</p>
                )}

                {/* Team Details */}
                <div className="text-[11px] space-y-1 text-zinc-400 pt-1 border-t border-zinc-900">
                  {dip.instructorName && (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">المحاضر:</span>
                      <span className="text-zinc-200 font-semibold">{dip.instructorName}</span>
                    </div>
                  )}
                  {dip.mentorName && (
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">المنتور:</span>
                      <span className="text-zinc-200 font-semibold">{dip.mentorName}</span>
                    </div>
                  )}
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] bg-zinc-950/30 p-2 rounded border border-zinc-900 font-sans select-none">
                  <div className="flex items-center gap-1 text-zinc-400">
                    <Users className="w-3.5 h-3.5 text-zinc-500" />
                    <span>الطلاب المقيدين:</span>
                  </div>
                  <span className="font-bold text-white font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{studCount}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between gap-2 text-[9px] text-zinc-500 font-mono">
                <span>بداية: {dip.startDate}</span>
                <span>نهاية: {dip.endDate}</span>
              </div>
            </div>
          );
        })}

        {filteredDiplomas.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 p-8 text-center bg-[#070707] border border-dashed border-[#1f1f1f] rounded-xl">
            <ShieldAlert className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <span className="text-xs text-zinc-400">لا توجد دبلومات مطابقة لفلاتر وقيم التصفية الموفرة.</span>
          </div>
        )}
      </div>
    </div>
  );
}
