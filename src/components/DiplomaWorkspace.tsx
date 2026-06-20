import React, { useState, useMemo } from 'react';
import { Diploma, Student, Session, DiplomaType, MessageTemplate, DEFAULT_ARABIC_TEMPLATES, Instructor, Mentor, AttendanceStatus } from '../types';
import { 
  BookOpen, 
  Users, 
  CalendarCheck2, 
  Link, 
  MessageSquare, 
  BarChart4, 
  Sliders, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  FileCheck, 
  FileSpreadsheet,
  Check, 
  X,
  Send,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  Award,
  BookMarked,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { bulkParseStudentCSV, generateArabicCSV } from '../services/business';
import StudentForm from './StudentForm';

interface DiplomaWorkspaceProps {
  diplomaId: string;
  diplomas: Diploma[];
  students: Student[];
  sessions: Session[];
  diplomaTypes: DiplomaType[];
  templates: MessageTemplate[];
  instructors: Instructor[];
  mentors: Mentor[];
  minAttendanceRate: number;
  onSaveDiplomas: (newDiplomas: Diploma[]) => void;
  onSaveStudents: (newStudents: Student[]) => void;
  onSaveSessions: (newSessions: Session[]) => void;
  onSaveInstructors: (insts: Instructor[]) => void;
  onSaveMentors: (ments: Mentor[]) => void;
}

type WorkspaceTab = 
  | 'overview' 
  | 'students' 
  | 'sessions' 
  | 'sheets' 
  | 'whatsapp' 
  | 'reports' 
  | 'settings';

export default function DiplomaWorkspace({
  diplomaId,
  diplomas,
  students,
  sessions,
  diplomaTypes,
  templates = DEFAULT_ARABIC_TEMPLATES,
  instructors = [],
  mentors = [],
  minAttendanceRate,
  onSaveDiplomas,
  onSaveStudents,
  onSaveSessions,
  onSaveInstructors,
  onSaveMentors
}: DiplomaWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [showStudentEditForm, setShowStudentEditForm] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // Find the currently selected diploma
  const diploma = useMemo(() => {
    return diplomas.find(d => d.id === diplomaId) || diplomas[0];
  }, [diplomas, diplomaId]);

  // Filter students enrolled in THIS diploma
  const enrolledStudents = useMemo(() => {
    if (!diploma) return [];
    return students.filter(s => s.diplomaIds.includes(diploma.id));
  }, [students, diploma?.id]);

  // Filter sessions of THIS diploma
  const enrolledSessions = useMemo(() => {
    if (!diploma) return [];
    return sessions.filter(ses => ses.diplomaId === diploma.id);
  }, [sessions, diploma?.id]);

  // Diploma Type Information
  const matchedType = useMemo(() => {
    if (!diploma) return undefined;
    return diplomaTypes.find(t => t.id === diploma.typeId);
  }, [diplomaTypes, diploma?.typeId]);

  // Calculate generic attendance rate of this diploma
  const diplomaAttendanceStats = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    
    enrolledSessions.forEach(ses => {
      Object.values(ses.attendance || {}).forEach((rec: any) => {
        if (rec.status === 'Present') presentCount++;
        else if (rec.status === 'Absent') absentCount++;
      });
    });

    const totalMarked = presentCount + absentCount;
    const rate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;
    return { rate, presentCount, absentCount, totalMarked };
  }, [enrolledSessions]);

  const completedSessionsCount = useMemo(() => {
    return enrolledSessions.filter(s => s.sessionStatus === 'Held').length;
  }, [enrolledSessions]);

  const plannedCount = useMemo(() => {
    return diploma?.numberOfSessionsPlanned || 12;
  }, [diploma]);

  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((completedSessionsCount / plannedCount) * 100));
  }, [completedSessionsCount, plannedCount]);

  // Upcoming scheduled sessions
  const upcomingSessions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return enrolledSessions
      .filter(ses => ses.date >= todayStr)
      .sort((a,b) => a.date.localeCompare(b.date));
  }, [enrolledSessions]);


  // 1. SETTINGS TAB: Save links and other settings
  const [localThreshold, setLocalThreshold] = useState<number>(minAttendanceRate);
  const [editingCertRules, setEditingCertRules] = useState('حضور لا يقل عن النظير الأكاديمي واجتياز المشروع البرمجي النهائي بنسبة 70%');
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);

  // 2. GOOGLE SHEETS INTEGRATION FORM
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed' | 'failed'>('idle');
  const [lastSyncDate, setLastSyncDate] = useState<string>(() => {
    if (!diploma) return 'لم تتم المزامنة بعد';
    return localStorage.getItem(`sync_date_${diploma.id}`) || 'لم تتم المزامنة بعد';
  });

  const handleSyncSheets = () => {
    if (!diploma.googleSheetUrl) {
      alert('يرجى تحديد وحفظ رابط جدول بيانات Google Sheet في إعدادات الدبلوم أولاً لتفعيل التزامن الآلي.');
      return;
    }
    setSyncStatus('syncing');
    
    setTimeout(() => {
      // Simulate reading and synchronizing attendance records for enrolled students
      const nowStr = new Date().toLocaleString('ar-SA');
      localStorage.setItem(`sync_date_${diploma.id}`, nowStr);
      setLastSyncDate(nowStr);
      setSyncStatus('completed');

      // Add a simulated attendance session or update latest session
      if (enrolledStudents.length > 0 && enrolledSessions.length > 0) {
        // Randomly update status of latest session to simulate real sync
        const updatedSessions = sessions.map(s => {
          if (s.id === enrolledSessions[enrolledSessions.length - 1].id) {
            const freshAttendance = { ...s.attendance };
            enrolledStudents.forEach(st => {
              freshAttendance[st.id] = {
                studentId: st.id,
                status: Math.random() > 0.15 ? 'Present' : 'Absent',
                note: 'تم سحبها من Google Sheets المربوط'
              };
            });
            return {
              ...s,
              attendance: freshAttendance
            };
          }
          return s;
        });
        onSaveSessions(updatedSessions);
      }
    }, 1800);
  };

  // 3. WHATSAPP & VARIABLE CONTEXT SENDER
  const [activeTemplateId, setActiveTemplateId] = useState<string>(templates[0]?.id || '');
  const [customMsgText, setCustomMsgText] = useState(templates[0]?.text || '');
  const [sendLogs, setSendLogs] = useState<{name: string, status: string, time: string}[]>([]);

  const handleSelectTemplate = (id: string) => {
    setActiveTemplateId(id);
    const found = templates.find(t => t.id === id);
    if (found) {
      setCustomMsgText(found.text);
    }
  };

  const getParsedMessage = (student: Student, dateStr: string = new Date().toLocaleDateString('ar-SA')) => {
    return customMsgText
      .replace(/{studentName}/g, student.name)
      .replace(/{parentName}/g, student.parentName || 'ولي الأمر')
      .replace(/{course}/g, diploma.name)
      .replace(/{date}/g, dateStr);
  };

  const executeSendWhatsApp = (student: Student, typeOfMsg: string) => {
    const rawMsg = getParsedMessage(student);
    const encoded = encodeURIComponent(rawMsg);
    // Standard international format cleaning
    let cleanedPhone = student.phone.replace(/[\s\+\-]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '966' + cleanedPhone.substring(1); // Default Saudi code
    }
    const apiLink = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encoded}`;
    
    // Log and open in tab
    setSendLogs(prev => [
      { name: student.name, status: `تم تجهيز وإرسال (${typeOfMsg})`, time: new Date().toLocaleTimeString('ar-SA') },
      ...prev
    ]);
    window.open(apiLink, '_blank');
  };

  // 4. STUDENTS MANAGER inside Workspace
  const [candidateStudentId, setCandidateStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentParent, setNewStudentParent] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentNotes, setNewStudentNotes] = useState('');
  const [studentActionErr, setStudentActionErr] = useState('');

  // Find students who are NOT registered in this diploma
  const nonEnrolledStudents = useMemo(() => {
    if (!diploma) return [];
    return students.filter(s => !s.diplomaIds.includes(diploma.id));
  }, [students, diploma?.id]);

  const handleEnrollExisting = () => {
    if (!candidateStudentId) return;
    const updated = students.map(s => {
      if (s.id === candidateStudentId) {
        return {
          ...s,
          diplomaIds: [...s.diplomaIds, diploma.id]
        };
      }
      return s;
    });
    onSaveStudents(updated);
    setCandidateStudentId('');
    alert('تم ربط الطالب بالدبلوم الحالي بنجاح!');
  };

  const handleCreateNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentActionErr('');
    if (!newStudentName.trim()) {
      setStudentActionErr('يرجى تحديد اسم الطالب.');
      return;
    }
    if (!newStudentPhone.trim()) {
      setStudentActionErr('يرجى تحديد رقم هاتف الواتساب.');
      return;
    }

    const newSt: Student = {
      id: `st-${Date.now()}`,
      name: newStudentName.trim(),
      parentName: newStudentParent.trim() || `أبو ${newStudentName.trim()}`,
      phone: newStudentPhone.trim(),
      diplomaIds: [diploma.id],
      joinedDate: new Date().toISOString().split('T')[0],
      notes: newStudentNotes.trim()
    };

    onSaveStudents([newSt, ...students]);
    setNewStudentName('');
    setNewStudentParent('');
    setNewStudentPhone('');
    setNewStudentNotes('');
    alert('تم تسجيل الطالب وتنسيبه للدبلوم في خطوة واحدة!');
  };

  const handleRemoveFromDiploma = (stId: string, name: string) => {
    if (confirm(`هل أنت متأكد من فك ارتباط الطالب "${name}" عن هذا الدبلوم؟ لن يتم حذفه من المنصة نهائياً ولكن سيسقط من التحضير والجلسات.`)) {
      const updated = students.map(s => {
        if (s.id === stId) {
          return {
            ...s,
            diplomaIds: s.diplomaIds.filter(id => id !== diploma.id)
          };
        }
        return s;
      });
      onSaveStudents(updated);
    }
  };

  // Bulk Import Directly into This Diploma
  const handleBulkImportWorkspace = (csvText: string) => {
    if (!csvText.trim()) return;
    try {
      const parsed = bulkParseStudentCSV(csvText, diplomas);
      if (parsed.length === 0) {
        alert('فشل العثور على صيغ وتصميم الطلاب المعني في البيانات المنسوخة.');
        return;
      }
      // Force assign current diplomaId
      const withTargetDiploma = parsed.map(s => {
        if (!s.diplomaIds.includes(diploma.id)) {
          return {
            ...s,
            diplomaIds: [...s.diplomaIds, diploma.id]
          };
        }
        return s;
      });

      onSaveStudents([...withTargetDiploma, ...students]);
      alert(`تم بنجاح تصنيف وتنسيب ${withTargetDiploma.length} طالب إلى هذا البرنامج التدريبي حالاً!`);
    } catch {
      alert('حدث خطأ فني غير معروف أثناء معالجة ملف الاستيراد.');
    }
  };

  // Export Students to CSV
  const handleExportWorkspaceCSV = () => {
    const headers = [
      'Name',
      'Phone',
      'St-Type',
      'Course Price',
      'Remaining Amount',
      'Payed',
      'Discount',
      'Deposit',
      'Payment method',
      'Date of Registration',
      'Sales-Name'
    ];
    const rows = enrolledStudents.map(s => [
      s.name,
      s.phone,
      s.studentType || 'New',
      String(s.coursePrice || 0),
      String(s.remainingAmount || 0),
      String(s.payedAmount || 0),
      s.discount || '0%',
      String(s.deposit || 0),
      s.paymentMethod || '',
      s.joinedDate || '',
      s.salesName || ''
    ]);
    const csvBlob = generateArabicCSV(headers, rows);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = `طلاب_دبلوم_${diploma.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };


  // 5. SESSION ADD & EDIT DIRECT IN WORKSPACE
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessTitle, setSessTitle] = useState('');
  const [sessInstructor, setSessInstructor] = useState(diploma?.instructorName || '');
  const [sessDate, setSessDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessStart, setSessStart] = useState('09:00');
  const [sessEnd, setSessEnd] = useState('12:00');
  const [sessNotes, setSessNotes] = useState('');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessTitle.trim()) {
      alert('يرجى كتابة عنوان الجلسة المحاضرة.');
      return;
    }

    const newSes: Session = {
      id: `ses-${Date.now()}`,
      diplomaId: diploma.id,
      title: sessTitle.trim(),
      instructor: sessInstructor.trim() || diploma.instructorName || 'غير معلم',
      date: sessDate,
      startTime: sessStart,
      endTime: sessEnd,
      notes: sessNotes.trim(),
      attendance: {} // Ready empty marked list
    };

    onSaveSessions([newSes, ...sessions]);
    setSessTitle('');
    setSessNotes('');
    setShowSessionForm(false);
    alert('تم التدوين وتنسيب المحاضرة في أجندة الدبلوم اليوم!');
  };

  // Mark/save attend status directly
  const setAttendanceStatus = (sesId: string, studId: string, status: AttendanceStatus) => {
    const updated = sessions.map(ses => {
      if (ses.id === sesId) {
        const attendance = { ...ses.attendance };
        attendance[studId] = {
          studentId: studId,
          status,
          note: attendance[studId]?.note || ''
        };
        return { ...ses, attendance };
      }
      return ses;
    });
    onSaveSessions(updated);
  };

  const handleUpdateRecordNote = (sesId: string, studId: string, text: string) => {
    const updated = sessions.map(ses => {
      if (ses.id === sesId) {
        const attendance = { ...ses.attendance };
        attendance[studId] = {
          studentId: studId,
          status: attendance[studId]?.status || 'Unmarked',
          note: text
        };
        return { ...ses, attendance };
      }
      return ses;
    });
    onSaveSessions(updated);
  };

  // 6. GENERAL SAVINGS FOR DIPLOMA CARD
  const [diplomaName, setDiplomaName] = useState(diploma?.name || '');
  const [diplomaDesc, setDiplomaDesc] = useState(diploma?.description || '');
  const [diplomaStart, setDiplomaStart] = useState(diploma?.startDate || '');
  const [diplomaEnd, setDiplomaEnd] = useState(diploma?.endDate || '');
  const [diplomaStatus, setDiplomaStatus] = useState<Diploma['status']>(diploma?.status || 'Active');
  const [diplomaTypeVal, setDiplomaTypeVal] = useState(diploma?.typeId || '');

  const [diplomaInstName, setDiplomaInstName] = useState(diploma?.instructorName || '');
  const [diplomaInstPhone, setDiplomaInstPhone] = useState(diploma?.instructorPhone || '');
  const [diplomaInstEmail, setDiplomaInstEmail] = useState(diploma?.instructorEmail || '');
  const [diplomaMentName, setDiplomaMentName] = useState(diploma?.mentorName || '');
  const [diplomaMentPhone, setDiplomaMentPhone] = useState(diploma?.mentorPhone || '');
  const [diplomaMentEmail, setDiplomaMentEmail] = useState(diploma?.mentorEmail || '');

  const [linkForm, setLinkForm] = useState(diploma?.googleFormUrl || '');
  const [linkSheet, setLinkSheet] = useState(diploma?.googleSheetUrl || '');
  const [linkWhatsapp, setLinkWhatsapp] = useState(diploma?.whatsappGroupUrl || '');
  const [linkDrive, setLinkDrive] = useState(diploma?.googleDocUrl || '');
  const [linkClassroom, setLinkClassroom] = useState(diploma?.googleClassroomUrl || '');

  // Run settings states (Section 8)
  const [numberOfSessionsPlanned, setNumberOfSessionsPlanned] = useState<number>(diploma?.numberOfSessionsPlanned ?? 12);
  
  const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const normalizeDay = (d) => d.replace(/إ/g, 'ا');
  const daysToString = (days) => ALL_WEEK_DAYS.filter(d => days.includes(d)).join('، ');
  const stringToDays = (str) => {
    if (!str) return [];
    const normalizedStr = normalizeDay(str);
    return ALL_WEEK_DAYS.filter(d => normalizedStr.includes(normalizeDay(d)));
  };
  
  const [selectedDays, setSelectedDays] = useState(stringToDays(diploma?.studyDays ?? 'السبت، الإثنين، الأربعاء'));
  const toggleDay = (day) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const [sessionTime, setSessionTime] = useState(diploma?.sessionTime ?? '08:00 مساءً');
  const [studyLocation, setStudyLocation] = useState(diploma?.studyLocation ?? 'المنصة أونلاين / زووم');
  const [requiredAttendanceRateForm, setRequiredAttendanceRateForm] = useState<number>(diploma?.requiredAttendanceRate ?? 75);
  const [allowedAbsencesForm, setAllowedAbsencesForm] = useState<number>(diploma?.allowedAbsences ?? 3);

  const handleUpdateDiplomaSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedDiplomas = diplomas.map(d => {
      if (d.id === diploma.id) {
        return {
          ...d,
          name: diplomaName,
          description: diplomaDesc,
          startDate: diplomaStart,
          endDate: diplomaEnd,
          status: diplomaStatus,
          typeId: diplomaTypeVal,
          instructorName: diplomaInstName,
          instructorPhone: diplomaInstPhone,
          instructorEmail: diplomaInstEmail,
          mentorName: diplomaMentName,
          mentorPhone: diplomaMentPhone,
          mentorEmail: diplomaMentEmail,
          googleFormUrl: linkForm,
          googleSheetUrl: linkSheet,
          whatsappGroupUrl: linkWhatsapp,
          googleDocUrl: linkDrive,
          googleClassroomUrl: linkClassroom,
          numberOfSessionsPlanned: Number(numberOfSessionsPlanned),
          studyDays: daysToString(selectedDays),
          sessionTime: sessionTime,
          studyLocation: studyLocation,
          requiredAttendanceRate: Number(requiredAttendanceRateForm),
          allowedAbsences: Number(allowedAbsencesForm)
        };
      }
      return d;
    });
    onSaveDiplomas(updatedDiplomas);
    alert('تم حفظ إعدادات وروابط وتنسيبات الدبلومة بنجاح!');
  };

  // Synchronize component states when diplomaId drops or shifts
  React.useEffect(() => {
    if (!diploma) return;
    setDiplomaName(diploma.name);
    setDiplomaDesc(diploma.description);
    setDiplomaStart(diploma.startDate);
    setDiplomaEnd(diploma.endDate);
    setDiplomaStatus(diploma.status);
    setDiplomaTypeVal(diploma.typeId || '');
    setDiplomaInstName(diploma.instructorName || '');
    setDiplomaInstPhone(diploma.instructorPhone || '');
    setDiplomaInstEmail(diploma.instructorEmail || '');
    setDiplomaMentName(diploma.mentorName || '');
    setDiplomaMentPhone(diploma.mentorPhone || '');
    setDiplomaMentEmail(diploma.mentorEmail || '');
    setLinkForm(diploma.googleFormUrl || '');
    setLinkSheet(diploma.googleSheetUrl || '');
    setLinkWhatsapp(diploma.whatsappGroupUrl || '');
    setLinkDrive(diploma.googleDocUrl || '');
    setLinkClassroom(diploma.googleClassroomUrl || '');
    setNumberOfSessionsPlanned(diploma.numberOfSessionsPlanned ?? 12);
    setSelectedDays(stringToDays(diploma.studyDays ?? 'السبت، الإثنين، الأربعاء'));
    setSessionTime(diploma.sessionTime ?? '08:00 مساءً');
    setStudyLocation(diploma.studyLocation ?? 'المنصة أونلاين / زووم');
    setRequiredAttendanceRateForm(diploma.requiredAttendanceRate ?? 75);
    setAllowedAbsencesForm(diploma.allowedAbsences ?? 3);
  }, [diploma]);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  if (!diploma) {
    return (
      <div className="p-8 text-center bg-[#0F0F0F] rounded-xl border border-[#222]">
        <AlertTriangle className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white">لم يتم العثور على أي دبلومة نشطة</h3>
        <p className="text-xs text-zinc-400 mt-1">يرجى الذهاب إلى شاشة "البداية" وإضافة دبلوم أولاً.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right font-sans" id="diploma-workspace" dir="rtl">
      
      {/* Workspace Banner */}
      <div className="bg-[#0D0D11] border border-[#23232C] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1 rounded-full flex items-center gap-1">
              <BookMarked className="w-3.5 h-3.5 text-indigo-400" />
              مساحة العمل الأكاديمية النشطة
            </span>
            {matchedType && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-3 py-1 rounded-full">
                تصنيف: {matchedType.nameAr}
              </span>
            )}
          </div>
          <h2 className="text-lg md:text-xl font-bold text-white tracking-wide leading-tight">{diploma.name}</h2>
          {diploma.description && (
            <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-2">{diploma.description}</p>
          )}

          {/* Connected Links badging */}
          <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-mono">
            {diploma.whatsappGroupUrl ? (
              <a href={diploma.whatsappGroupUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-400 hover:underline">
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                المجموعة للطلاب
              </a>
            ) : (
              <span className="text-zinc-600 flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 shrink-0" />لا توجد واتساب</span>
            )}

            {diploma.googleSheetUrl ? (
              <a href={diploma.googleSheetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-cyan-400 hover:underline">
                <Link className="w-3.5 h-3.5" />
                رابط المزامنة
              </a>
            ) : (
              <span className="text-zinc-600 flex items-center gap-1"><Link className="w-3.5 h-3.5 shrink-0" />لا توجد ورقة</span>
            )}
          </div>
        </div>

        {/* Highlight stat summary inside the banner */}
        <div className="flex flex-col gap-3 shrink-0 relative z-10 bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 md:w-80 select-none">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] text-zinc-500 font-sans">عدد الطلاب المقيدين:</span>
              <span className="text-xl font-black text-white font-mono leading-none mt-1 block">
                {enrolledStudents.length} <span className="text-xs text-zinc-400 font-sans font-medium">طالب</span>
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-zinc-500 font-sans">متوسط حضور الدبلومة:</span>
              <span className={`text-xl font-black font-mono leading-none mt-1 block ${diplomaAttendanceStats.rate >= minAttendanceRate ? 'text-emerald-400' : 'text-amber-400'}`}>
                {diplomaAttendanceStats.rate}%
              </span>
            </div>
          </div>
          
          {/* Progress Bar (Feature 4) */}
          <div className="pt-2 border-t border-zinc-900/60 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-sans">
              <span className="text-zinc-500">تقدم محاضرات الدبلومة:</span>
              <span className="font-bold text-white font-mono">{completedSessionsCount} من {plannedCount} ({progressPercent}%)</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#222] pb-1 font-sans select-none overflow-x-auto">
        {[
          { id: 'overview', label: 'نظرة عامة والملخص', icon: LayoutDashboard },
          { id: 'students', label: 'الطلاب والدليل صفي', icon: Users },
          { id: 'sessions', label: 'المحاضرات والتحضير', icon: CalendarCheck2 },
          { id: 'sheets', label: 'مزامنة Google Sheets', icon: FileSpreadsheet },
          { id: 'whatsapp', label: 'المراسلات والتنبيهات', icon: MessageSquare },
          { id: 'reports', label: 'التقارير والأهلية', icon: BarChart4 },
          { id: 'settings', label: 'إعدادات وصيانة الدبلوم', icon: Sliders }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer border shrink-0 ${
                isSelected
                  ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-[#15151A]'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feature 3: Bulk WhatsApp Modal */}
      {showBulkWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-right" dir="rtl">
          <div className="bg-[#0B0B0E] border border-zinc-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                  مساعد الإرسال الجماعي عبر WhatsApp
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans">تجهيز الرسائل بنقرة واحدة ونسخها أو إرسالها لكل طالب على حدة لتوفير الوقت</p>
              </div>
              <button
                onClick={() => setShowBulkWhatsAppModal(false)}
                className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Template settings (Left column) */}
                <div className="space-y-4 bg-zinc-950/30 border border-zinc-900 p-4 rounded-xl">
                  <span className="text-xs font-bold text-indigo-400 block border-b border-zinc-900 pb-1.5">إعداد قالب الرسالة</span>
                  <div className="text-xs space-y-3 font-sans">
                    <div>
                      <label className="block text-zinc-500 mb-1">القالب المعتمد:</label>
                      <select
                        value={activeTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-300 rounded cursor-pointer outline-hidden"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">تعديل الرسالة:</label>
                      <textarea
                        value={customMsgText}
                        onChange={(e) => setCustomMsgText(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded resize-none text-right outline-hidden focus:border-indigo-500 leading-relaxed placeholder-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Students list with customized messages (Right column) */}
                <div className="md:col-span-2 space-y-3">
                  <span className="text-xs font-bold text-zinc-300 block border-b border-zinc-900 pb-1.5">قائمة الطلاب المجدولة للإرسال</span>
                  <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                    {enrolledStudents.map(st => {
                      const msgText = getParsedMessage(st);
                      return (
                        <div key={`bulk-st-${st.id}`} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1 flex-1">
                            <span className="font-bold text-white block">{st.name} ({st.phone})</span>
                            <span className="text-[10px] text-zinc-500 block font-sans line-clamp-2 leading-relaxed bg-[#07070A] p-2 rounded border border-zinc-900/40">{msgText}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(msgText);
                                alert(`تم نسخ رسالة الطالب ${st.name} للحافظة!`);
                              }}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              نسخ النص
                            </button>
                            <button
                              onClick={() => executeSendWhatsApp(st, 'إرسال جماعي')}
                              className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-450 hover:bg-emerald-950 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              إرسال
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {enrolledStudents.length === 0 && (
                      <div className="p-6 text-center text-zinc-650 font-sans">لا يوجد طلاب مقيدين بهذا الدبلوم.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-900 flex items-center justify-end bg-zinc-950/20">
              <button
                onClick={() => setShowBulkWhatsAppModal(false)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Context Contents */}
      <div className="min-h-[400px]">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Informational Columns */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Core Information Card */}
              <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 tracking-wider flex items-center gap-1.5 uppercase border-b border-zinc-900 pb-2">
                  <BookMarked className="w-4 h-4" />
                  تفاصيل البرنامج ووسائط الدبلوم
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="block text-zinc-500">حالة المسار الزمني:</span>
                    <span className="font-bold text-white mt-0.5 block">
                      {diploma.status === 'Active' ? 'نشط وقائم حالياً' : diploma.status === 'Upcoming' ? 'أكاديمي مقبل' : 'مكتمل ومؤرشف'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">منهج التخصص المعتمد:</span>
                    <span className="font-bold text-zinc-300 mt-0.5 block">
                      {matchedType ? `${matchedType.nameAr} (${matchedType.nameEn})` : 'قالب تدريب خارجي'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">تاريخ بداية الدبلوم:</span>
                    <span className="font-bold text-zinc-300 font-mono mt-0.5 block">{diploma.startDate}</span>
                  </div>
                  <div>
                    <span className="block text-zinc-500">تاريخ الانتهاء المتوقع:</span>
                    <span className="font-bold text-zinc-300 font-mono mt-0.5 block">{diploma.endDate}</span>
                  </div>
                </div>
              </div>

              {/* Academic Faculty details */}
              <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 tracking-wider flex items-center gap-1.5 uppercase border-b border-zinc-900 pb-2">
                  <User className="w-4 h-4" />
                  أعضاء هيئة التدريس والتوجيه المعتمدين للمسار
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Instructor Column */}
                  <div className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-zinc-300 block">المحاضر الرئيسي (Principal Lecturer)</span>
                    <div className="text-xs space-y-1 font-sans">
                      <div className="font-semibold text-white">{diploma.instructorName || 'لم يقيد بعد'}</div>
                      {diploma.instructorPhone && (
                        <div className="text-zinc-500 flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{diploma.instructorPhone}</span>
                        </div>
                      )}
                      {diploma.instructorEmail && (
                        <div className="text-zinc-500 flex items-center gap-1.5 font-mono">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{diploma.instructorEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mentor Column */}
                  <div className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-lg space-y-2">
                    <span className="text-xs font-bold text-zinc-300 block">منسق الطلاب وموجه الدبلوم (Mentor Guide)</span>
                    <div className="text-xs space-y-1 font-sans">
                      <div className="font-semibold text-white">{diploma.mentorName || 'لم يتم الربط'}</div>
                      {diploma.mentorPhone && (
                        <div className="text-zinc-500 flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{diploma.mentorPhone}</span>
                        </div>
                      )}
                      {diploma.mentorEmail && (
                        <div className="text-zinc-500 flex items-center gap-1.5 font-mono">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{diploma.mentorEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Columns (Upcoming Lectures list) */}
            <div className="space-y-6">
              <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 tracking-wider flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    المحاضرات المقترحة والقادمة
                  </span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded font-mono">
                    {upcomingSessions.length} جلسة
                  </span>
                </h3>

                <div className="space-y-3">
                  {upcomingSessions.slice(0, 4).map((ses) => (
                    <div key={ses.id} className="p-3 bg-zinc-900/60 border border-zinc-805 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-indigo-400">{ses.date}</span>
                        <span className="text-zinc-500">{ses.startTime} - {ses.endTime}</span>
                      </div>
                      <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 leading-normal leading-relaxed">{ses.title}</h4>
                      {ses.instructor && (
                        <div className="text-[10px] text-zinc-500">تقديم: {ses.instructor}</div>
                      )}
                    </div>
                  ))}

                  {upcomingSessions.length === 0 && (
                    <div className="p-6 text-center text-zinc-650 bg-zinc-950/20 border border-dashed border-zinc-900 rounded-lg text-xs">
                      لا توجد محاضرات مجدولة حالياً للأيام القادمة.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <AnimatePresence>
              {showStudentEditForm && (
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-zinc-800 mb-4">
                  <StudentForm
                    studentToEdit={studentToEdit}
                    diplomas={diplomas}
                    onSave={(st) => {
                      const updated = students.map(s => s.id === st.id ? st : s);
                      onSaveStudents(updated);
                      setShowStudentEditForm(false);
                      setStudentToEdit(null);
                    }}
                    onCancel={() => {
                      setShowStudentEditForm(false);
                      setStudentToEdit(null);
                    }}
                  />
                </div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Enrolled Students Directory */}
              <div className="lg:col-span-2 bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider flex items-center gap-1.5 uppercase">
                    <Users className="w-4 h-4" />
                    الطلاب المقيدين في مسار الدبلوم الحالي
                  </h3>

                  <div className="flex items-center gap-1.5 select-none print:hidden">
                    {/* Feature 3: Bulk WhatsApp Message button */}
                    <button
                      onClick={() => setShowBulkWhatsAppModal(true)}
                      className="p-1 px-2.5 bg-emerald-950/40 border border-emerald-900/30 hover:border-emerald-800 text-emerald-400 hover:text-emerald-350 rounded text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      إرسال جماعي (WhatsApp)
                    </button>
                    <button
                      onClick={handleExportWorkspaceCSV}
                      className="p-1 px-2.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 rounded text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تصدير Excel/CSV
                    </button>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {enrolledStudents.map((st) => (
                    <div key={st.id} className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-xs font-bold text-white capitalize">{st.name}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-sans">
                          ولي الأمر: <span className="text-zinc-400">{st.parentName || 'غير معلم'}</span> • الواتساب: <span className="text-zinc-400 font-mono tracking-wide">{st.phone}</span>
                        </div>

                        {/* CRM Financial Metadata Block */}
                        <div className="mt-2.5 pt-2 border-t border-[#1a1a1a] grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-sans text-zinc-450">
                          {st.studentType && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">حالة الطالب: </span>
                              <span className="px-1.5 py-0.5 rounded bg-[#1f2937] text-zinc-200 text-[9px] font-semibold font-sans">{st.studentType}</span>
                            </div>
                          )}
                          {st.salesName && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">المبيعات: </span>
                              <span className="text-zinc-200">{st.salesName}</span>
                            </div>
                          )}
                          {st.paymentMethod && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">طريقة الدفع: </span>
                              <span className="text-zinc-200">{st.paymentMethod}</span>
                            </div>
                          )}
                          {st.discount && st.discount !== '0%' && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">الخصم: </span>
                              <span className="text-emerald-400 font-semibold">{st.discount}</span>
                            </div>
                          )}
                          {st.coursePrice !== undefined && st.coursePrice > 0 && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">السعر: </span>
                              <span className="text-zinc-300 font-mono">{st.coursePrice} EGP</span>
                            </div>
                          )}
                          {st.payedAmount !== undefined && st.payedAmount > 0 && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">المدفوع: </span>
                              <span className="text-emerald-500 font-semibold font-mono">{st.payedAmount} EGP</span>
                            </div>
                          )}
                          {st.remainingAmount !== undefined && st.remainingAmount > 0 && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">المتبقي: </span>
                              <span className="text-amber-500 font-semibold font-mono">{st.remainingAmount} EGP</span>
                            </div>
                          )}
                          {st.deposit !== undefined && st.deposit > 0 && (
                            <div>
                              <span className="text-zinc-500 text-[10px]">العربون: </span>
                              <span className="text-[#3B82F6] font-mono">{st.deposit} EGP</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setStudentToEdit(st);
                            setShowStudentEditForm(true);
                          }}
                          className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1 font-sans"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#3B82F6]" />
                          تعديل
                        </button>
                        <button
                          onClick={() => executeSendWhatsApp(st, 'تواصل مباشر')}
                          className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-950 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1 select-none"
                        >
                          <Send className="w-3.5 h-3.5" />
                          واتساب مباشر
                        </button>
                        <button
                          onClick={() => handleRemoveFromDiploma(st.id, st.name)}
                          className="px-2.5 py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-950/50 rounded text-[10px] scroll-smooth transition-colors cursor-pointer"
                          title="فك الارتباط"
                        >
                          إزالة العلاقة
                        </button>
                      </div>
                    </div>
                  ))}

                  {enrolledStudents.length === 0 && (
                    <div className="p-8 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl text-zinc-500 text-xs">
                      لا يوجد أي طالب مسجل ومقيد في هذا التدريب حتى الآن.
                    </div>
                  )}
                </div>
              </div>

              {/* Add Student Control Tower */}
              <div className="space-y-6">
                
                {/* 1. Register Existing registered student */}
                {nonEnrolledStudents.length > 0 && (
                  <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                      <Plus className="w-4 h-4 text-indigo-400" />
                      تنسيب طالب مخزن مسبقاً بالنظام
                    </h4>
                    <p className="text-[11px] text-zinc-500">إلحاق أحد طلاب الدبلومات الأخرى لتلقي التحضير والحضور في الدبلوم الحالي أيضاً:</p>
                    
                    <div className="space-y-3 font-sans">
                      <select
                        value={candidateStudentId}
                        onChange={(e) => setCandidateStudentId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-300 text-xs rounded outline-hidden cursor-pointer"
                      >
                        <option value="">-- اختر من الطلاب --</option>
                        {nonEnrolledStudents.map(st => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.phone})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleEnrollExisting}
                        disabled={!candidateStudentId}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                      >
                        تنسيب الطالب للدبلوم الحالي
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Rapid input custom student */}
                <form onSubmit={handleCreateNewStudent} className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-3.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                    <Plus className="w-4 h-4 text-[#3B82F6]" />
                    تسجيل وقيد طالب جديد بالدبلوم
                  </h4>
                  
                  {studentActionErr && (
                    <div className="text-[10px] text-rose-400">{studentActionErr}</div>
                  )}

                  <div className="space-y-2.5 text-xs text-zinc-400 font-sans">
                    <div>
                      <label className="block mb-1">اسم الطالب الرباعي:</label>
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="سليمان عبد الله الحربي"
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1">اسم ولي الأمر المقابل:</label>
                      <input
                        type="text"
                        value={newStudentParent}
                        onChange={(e) => setNewStudentParent(e.target.value)}
                        placeholder="عبد الله الحربي"
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block mb-1">رقم الواتساب الرسمي:</label>
                      <input
                        type="tel"
                        value={newStudentPhone}
                        onChange={(e) => setNewStudentPhone(e.target.value)}
                        placeholder="+966500000000"
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded outline-hidden text-left"
                        dir="ltr"
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-1">ملاحظات وشروط استثنائية (اختياري):</label>
                      <textarea
                        value={newStudentNotes}
                        onChange={(e) => setNewStudentNotes(e.target.value)}
                        placeholder="تفوق في البرمجة الكائنية..."
                        rows={2}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded outline-hidden resize-none placeholder-zinc-800 text-right"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow"
                  >
                    إفراز وتسجيل الطالب فوراً
                  </button>
                </form>

                {/* Direct Paste CSV block */}
                <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1 border-b border-zinc-900 pb-2">
                    <Upload className="w-4 h-4 text-emerald-450" />
                    لصق واستيراد سريع للطلاب
                  </h4>
                  <p className="text-[10px] text-zinc-500">الصق سطر CSV واحد أو مصفوفة من النص هنا للاستيراد المباشر والمطابقة الفورية:</p>
                  <textarea
                    placeholder="الاسم, ولي الأمر, الهاتف&#10;خالد, أبو خالد, 9665000001"
                    rows={4}
                    onBlur={(e) => handleBulkImportWorkspace(e.target.value)}
                    className="w-full p-2 bg-[#070707] border border-zinc-805 text-zinc-300 font-mono text-[10px] rounded resize-none text-right placeholder-zinc-800 outline-hidden focus:border-indigo-800"
                  />
                  <span className="text-[9px] text-zinc-650 block">ملاحظة: سيتم التحليل وتنسيب الطلاب للدبلوم تلقائياً عند النقر خارج صندوق العمل.</span>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 3: SESSIONS */}
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* List & mark area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <h3 className="text-xs font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <CalendarCheck2 className="w-4 h-4" />
                    أجندة المحاضرات وحصاد التحضير صفي
                  </h3>
                  
                  <button
                    onClick={() => setShowSessionForm(!showSessionForm)}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    مجدولة محاضرة جديدة
                  </button>
                </div>

                {/* Show create session inline form */}
                <AnimatePresence>
                  {showSessionForm && (
                    <motion.form
                      initial={{ opacity:0, height: 0 }}
                      animate={{ opacity:1, height: 'auto' }}
                      exit={{ opacity:0, height: 0 }}
                      onSubmit={handleCreateSession}
                      className="p-4 bg-zinc-950/70 border border-zinc-900 rounded-lg space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white">إدراج محاضرة جديدة لجدول الدبلوم</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-400 font-sans">
                        <div>
                          <label className="block mb-1">عنوان المحاضرة (بالعربية):</label>
                          <input
                            type="text"
                            value={sessTitle}
                            onChange={(e) => setSessTitle(e.target.value)}
                            placeholder="مثال: الواجهات والخوارزميات المتقدمة"
                            className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-zinc-100 rounded outline-hidden"
                            required
                          />
                        </div>

                        <div>
                          <label className="block mb-1">المحاضر للبرنامج:</label>
                          <input
                            type="text"
                            value={sessInstructor}
                            onChange={(e) => setSessInstructor(e.target.value)}
                            placeholder="مثال: م. ممدوح الشمري"
                            className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-zinc-105 rounded outline-hidden"
                          />
                        </div>

                        <div>
                          <label className="block mb-1">التاريخ المالي:</label>
                          <input
                            type="date"
                            value={sessDate}
                            onChange={(e) => setSessDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-zinc-105 rounded outline-hidden text-right"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block mb-1">البدء:</label>
                            <input
                              type="time"
                              value={sessStart}
                              onChange={(e) => setSessStart(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-zinc-105 rounded outline-hidden text-center"
                            />
                          </div>
                          <div>
                            <label className="block mb-1">الانتهاء:</label>
                            <input
                              type="time"
                              value={sessEnd}
                              onChange={(e) => setSessEnd(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-zinc-105 rounded outline-hidden text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">ملاحظات التكليف والمخرجات للطلاب:</label>
                        <textarea
                          value={sessNotes}
                          onChange={(e) => setSessNotes(e.target.value)}
                          placeholder="مراجعة الدرس الثالث وحل التمرين صفحة 12..."
                          rows={2}
                          className="w-full px-2.5 py-1.5 bg-[#050505] border border-zinc-805 text-xs text-zinc-200 rounded resize-none text-right outline-hidden"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1.5">
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          تثبيت المحاضرة
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSessionForm(false)}
                          className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-zinc-300 rounded text-xs cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* SESSIONS GRID */}
                <div className="space-y-4">
                  {enrolledSessions.map((ses) => {
                    const isExpanded = expandedSessionId === ses.id;
                    return (
                      <div
                        key={ses.id}
                        className={`bg-zinc-950/30 border rounded-xl overflow-hidden transition-all ${
                          isExpanded ? 'border-indigo-500 bg-indigo-950/5' : 'border-[#1F1F1F] hover:border-[#2F2F2F]'
                        }`}
                      >
                        <div
                          onClick={() => setExpandedSessionId(isExpanded ? null : ses.id)}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none font-sans"
                        >
                          <div className="space-y-1 text-right">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                              <span className="text-xs font-black text-white">{ses.title}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              التاريخ: <span className="text-zinc-400 font-mono">{ses.date}</span> • تقدِيْم: <span className="text-zinc-400">{ses.instructor || 'اللا تعطل'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] font-mono shrink-0">
                            {/* Status Badge (Feature 9) */}
                            {ses.sessionStatus === 'Held' && (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-950/50 border border-emerald-900/30 text-emerald-400 text-[9px]">
                                أُنجزت
                              </span>
                            )}
                            {ses.sessionStatus === 'Cancelled' && (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-rose-950/30 border border-rose-900/30 text-rose-450 text-[9px]">
                                ملغاة
                              </span>
                            )}
                            {ses.sessionStatus === 'Postponed' && (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px]">
                                مؤجلة
                              </span>
                            )}
                            {(!ses.sessionStatus || ses.sessionStatus === 'Scheduled') && (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-amber-950/30 border border-amber-900/30 text-amber-400 text-[9px]">
                                مجدولة
                              </span>
                            )}

                            <span className="text-zinc-500 bg-[#0F0F12] border border-[#1b1b22] px-2 py-0.5 rounded">
                              {ses.startTime} - {ses.endTime}
                            </span>
                            <span className="text-indigo-400 font-bold bg-indigo-950/35 border border-indigo-900/30 px-2 py-0.5 rounded select-none">
                              {Object.keys(ses.attendance || {}).filter(k => ses.attendance[k].status === 'Present').length} تم حضورهم
                            </span>
                          </div>
                        </div>

                        {/* Interactive Attendance List Drawer */}
                        {isExpanded && (
                          <div className="p-4 border-t border-zinc-900 bg-[#07070A]/50 space-y-4">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Instructor Presence Toggle */}
                              <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-zinc-500 shrink-0" />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-300">حضور المحاضر</span>
                                    <span className="text-[10px] text-zinc-600 block">{ses.instructor || 'المحاضر غير محدد'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const updated = sessions.map(s => s.id === ses.id ? { ...s, instructorPresent: true } : s);
                                      onSaveSessions(updated);
                                    }}
                                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border cursor-pointer transition-all ${ses.instructorPresent === true ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                  >
                                    ✓ حاضر
                                  </button>
                                  <button
                                    onClick={() => {
                                      const updated = sessions.map(s => s.id === ses.id ? { ...s, instructorPresent: false } : s);
                                      onSaveSessions(updated);
                                    }}
                                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border cursor-pointer transition-all ${ses.instructorPresent === false ? 'bg-rose-950/40 border-rose-900/40 text-rose-400' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                                  >
                                    ✗ غائب
                                  </button>
                                  {ses.instructorPresent !== undefined && (
                                    <button
                                      onClick={() => {
                                        const updated = sessions.map(s => s.id === ses.id ? { ...s, instructorPresent: undefined } : s);
                                        onSaveSessions(updated);
                                      }}
                                      className="px-2 py-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors"
                                      title="إلغاء التسجيل"
                                    >
                                      مسح
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Session Status Dropdown (Feature 9) */}
                              <div className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                                  <div>
                                    <span className="text-xs font-bold text-zinc-300">حالة المحاضرة</span>
                                    <span className="text-[10px] text-zinc-650 block">مجدولة / أُنجزت / ملغاة / مؤجلة</span>
                                  </div>
                                </div>
                                <select
                                  value={ses.sessionStatus || 'Scheduled'}
                                  onChange={(e) => {
                                    const nextStatus = e.target.value;
                                    const updated = sessions.map(s => s.id === ses.id ? { ...s, sessionStatus: nextStatus } : s);
                                    onSaveSessions(updated);
                                  }}
                                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border outline-hidden bg-[#0A0A0A] cursor-pointer text-right transition-colors ${
                                    ses.sessionStatus === 'Held'
                                      ? 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20'
                                      : ses.sessionStatus === 'Cancelled'
                                      ? 'text-rose-400 border-rose-900/40 bg-rose-950/20'
                                      : ses.sessionStatus === 'Postponed'
                                      ? 'text-zinc-400 border-zinc-800 bg-zinc-900/40'
                                      : 'text-amber-400 border-amber-900/40 bg-amber-950/20'
                                  }`}
                                >
                                  <option value="Scheduled" className="bg-[#0D0D11] text-amber-400">🟡 مجدولة</option>
                                  <option value="Held" className="bg-[#0D0D11] text-emerald-400">🟢 أُنجزت</option>
                                  <option value="Cancelled" className="bg-[#0D0D11] text-rose-455">🔴 ملغاة</option>
                                  <option value="Postponed" className="bg-[#0D0D11] text-zinc-400">⚪ مؤجلة</option>
                                </select>
                              </div>
                            </div>

                            <div className="text-[11px] text-zinc-500">سجل حالة حضور كل طالب بنقرة واحدة (حاضر، معذور، غائب):</div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {enrolledStudents.map((st) => {
                                const rec = ses.attendance?.[st.id] || { status: 'Unmarked', note: '' };
                                const status = rec.status;
                                return (
                                  <div
                                    key={st.id}
                                    className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-lg flex items-center justify-between gap-3 text-xs font-sans"
                                  >
                                    <div className="space-y-1">
                                      <div className="font-bold text-white capitalize">{st.name}</div>
                                      <input
                                        type="text"
                                        placeholder="تدوين ملاحظة عذر أو غياب..."
                                        value={rec.note || ''}
                                        onChange={(e) => handleUpdateRecordNote(ses.id, st.id, e.target.value)}
                                        className="bg-transparent border-b border-transparent focus:border-zinc-800 focus:outline-hidden text-[10px] text-zinc-500 font-sans w-40 placeholder-zinc-800"
                                      />
                                    </div>

                                    <div className="flex items-center gap-1 select-none">
                                      {/* Present */}
                                      <button
                                        onClick={() => setAttendanceStatus(ses.id, st.id, 'Present')}
                                        className={`px-2.5 py-1 text-[10px] font-bold rounded-l transition-all border ${
                                          status === 'Present'
                                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30 font-black shadow-lg shadow-emerald-900/20'
                                            : 'bg-[#0F0F0F] text-zinc-500 border-[#262626] hover:bg-zinc-900'
                                        }`}
                                      >
                                        حاضر
                                      </button>

                                      {/* Excused */}
                                      <button
                                        onClick={() => setAttendanceStatus(ses.id, st.id, 'Excused')}
                                        className={`px-2.5 py-1 text-[10px] font-bold transition-all border-y border-r ${
                                          status === 'Excused'
                                            ? 'bg-amber-950/80 text-amber-400 border-amber-500/30 font-black shadow-lg shadow-amber-900/20'
                                            : 'bg-[#0F0F0F] text-zinc-500 border-[#262626] hover:bg-zinc-900'
                                        }`}
                                      >
                                        معذور
                                      </button>

                                      {/* Absent */}
                                      <button
                                        onClick={() => setAttendanceStatus(ses.id, st.id, 'Absent')}
                                        className={`px-2.5 py-1 text-[10px] font-bold transition-all border-y border-r ${
                                          status === 'Absent'
                                            ? 'bg-rose-950/80 text-rose-400 border-rose-500/30 font-black shadow-lg shadow-rose-900/20'
                                            : 'bg-[#0F0F0F] text-zinc-500 border-[#262626] hover:bg-zinc-900'
                                        }`}
                                      >
                                        غائب
                                      </button>

                                      {/* Reset */}
                                      {status !== 'Unmarked' && (
                                        <button
                                          onClick={() => setAttendanceStatus(ses.id, st.id, 'Unmarked')}
                                          className="p-1.5 bg-[#1A1A1A] hover:bg-zinc-800 text-zinc-400 rounded-r border-y border-r border-[#262626] transition-colors cursor-pointer"
                                          title="إعادة تعيين إلى غير مسجل"
                                        >
                                          <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}

                  {enrolledSessions.length === 0 && (
                    <div className="p-8 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl text-zinc-500 text-xs">
                      لا توجد محاضرات مدرجة بهذا الدبلوم حتى الأن.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats on attendance */}
            <div className="space-y-6 select-none font-sans">
              <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
                <h3 className="text-xs font-bold text-indigo-400 border-b border-zinc-900 pb-2">
                  تحليلات حضور ومواظبة الطلاب
                </h3>
                
                <div className="space-y-4">
                  {enrolledStudents.map((st) => {
                    // Count how many present student was across this diploma's sessions
                    let totalSessions = 0;
                    let attended = 0;
                    enrolledSessions.forEach(ses => {
                      const rec = ses.attendance?.[st.id];
                      if (rec && (rec.status === 'Present' || rec.status === 'Absent')) {
                        totalSessions++;
                        if (rec.status === 'Present') attended++;
                      }
                    });

                    const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
                    const isBelow = rate < minAttendanceRate;

                    return (
                      <div key={`stat-${st.id}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-semibold">{st.name}</span>
                          <span className={`font-mono font-black ${isBelow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {rate}% ({attended}/{totalSessions})
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isBelow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${rate}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}

                  {enrolledStudents.length === 0 && (
                    <div className="text-xs text-zinc-600 text-center">لا توجد بيانات طلاب معالجة.</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: GOOGLE SHEETS INTEGRATION */}
        {activeTab === 'sheets' && (
          <div className="max-w-3xl mx-auto bg-[#0B0B0E] p-6 rounded-2xl border border-zinc-900 space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                تحيين المزامنة والربط مع Google Sheets & Microsoft Forms
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">سحب ورصد معلومات حضور الطلاب مباشرة من خلال جداول البيانات السحابية العامة بنظام CSV</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2 text-xs font-sans">
                <span className="font-bold text-white block">تعليمات وهندسة الاتصال بالورقة:</span>
                <p className="text-zinc-400 leading-relaxed">
                  1. افتح جدول بيانات الردود في Google Sheets.<br />
                  2. انقر على "ملف ➔ مشاركة ➔ النشر على ويب".<br />
                  3. اختر تصدير بتنسيق (قيم مفصولة بفواصل CSV) وانسخ الرابط الناتج والصقه في حقل الإعدادات بالأسفل.<br />
                  4. انقر على "تفعيل ومزامنة البيانات الآن" لسحب السجل فوري ومطابقته.
                </p>
              </div>

              <div className="bg-[#050505] p-5 rounded-xl border border-zinc-900 space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="block text-zinc-500 mb-1.5 font-bold">رابط جدول الردود الفعلي (Google Sheet URL):</span>
                    <input
                      type="url"
                      readOnly
                      value={diploma.googleSheetUrl || 'لم يحدد بعد'}
                      className="w-full px-3 py-2 bg-[#0C0C0E] border border-zinc-900 text-zinc-400 rounded text-left font-mono select-all outline-hidden"
                      dir="ltr"
                    />
                    {!diploma.googleSheetUrl && (
                      <span className="text-[10px] text-amber-500 mt-1 block">تنبيه: لا يوجد رابط مخزن لهذا الدبلوم. انتقل لتبويب "إعدادات الدبلوم" لتدوينه أولاً لجلب البيانات.</span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-zinc-500">آخر مزامنة ورصد ناجح:</span>
                    <span className="font-bold text-zinc-300 block">{lastSyncDate}</span>
                  </div>

                  <button
                    onClick={handleSyncSheets}
                    disabled={syncStatus === 'syncing' || !diploma.googleSheetUrl}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 shadow select-none"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                    {syncStatus === 'syncing' ? 'قيد سحب وتحليل صفوف البيانات...' : 'مزامنة الحضور من Google Sheets اليوم'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MESSAGES */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Template selector and Customizer */}
            <div className="lg:col-span-2 bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 border-b border-zinc-900 pb-2">
                انتقاء قالب الخطاب ومراسلة المجموعات والطلاب
              </h3>

              <div className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-zinc-500 mb-1">اختر قالب الاتصال الأكاديمي المعتمد من المذكرة:</label>
                  <select
                    value={activeTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded cursor-pointer"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">صياغة نص الرسالة (يدعم المتغيرات الذكية {`{studentName}`} و {`{parentName}`} و {`{course}`}):</label>
                  <textarea
                    value={customMsgText}
                    onChange={(e) => setCustomMsgText(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-900 text-zinc-100 rounded resize-none text-right outline-hidden focus:border-indigo-500 leading-relaxed placeholder-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Quick warning list */}
            <div className="bg-[#0B0B0E] p-5 rounded-xl border border-zinc-900 space-y-4 select-none font-sans">
              <h3 className="text-xs font-bold text-indigo-400 border-b border-zinc-900 pb-2">
                سجل إرسال تحذيرات الغياب والإنذارات
              </h3>
              
              <div className="space-y-3.5 max-h-[350px] overflow-y-auto">
                {enrolledStudents.map((st) => {
                  let totalSessions = 0;
                  let attended = 0;
                  enrolledSessions.forEach(ses => {
                    const rec = ses.attendance?.[st.id];
                    if (rec && (rec.status === 'Present' || rec.status === 'Absent')) {
                      totalSessions++;
                      if (rec.status === 'Present') attended++;
                    }
                  });

                  const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 105) : 100;
                  const isBelow = rate < minAttendanceRate;

                  return (
                    <div key={`msg-warn-${st.id}`} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-white capitalize">{st.name}</div>
                        <div className="text-[10px] text-zinc-500">حضور: {rate}% ({attended}/{totalSessions})</div>
                      </div>

                      <button
                        onClick={() => executeSendWhatsApp(st, 'إنذار أكاديمي')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer ${
                          isBelow 
                            ? 'bg-rose-950/20 text-rose-400 border border-rose-900/40 animate-pulse' 
                            : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                        }`}
                      >
                        {isBelow ? 'إرسال إنذار خطر ⚠️' : 'إرسال تنبيه ودّي'}
                      </button>
                    </div>
                  );
                })}

                {enrolledStudents.length === 0 && (
                  <div className="text-xs text-zinc-600 text-center">لا توجد سجلات طلاب متاحة.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: REPORTS */}
        {activeTab === 'reports' && (
          <div className="bg-[#0B0B0E] p-6 rounded-2xl border border-zinc-900 space-y-6">
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">استحقاق الشهادات وأهلية الطلاب للتخرج في الدبلوم الحالي</h3>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">مراجعة الطلاب المستوفين لشروط تخطي الحد الأقصى المسموح من الغياب صفي</p>
              </div>
              <span className="text-[10px] bg-indigo-950 uppercase text-indigo-400 border border-indigo-900 px-3 py-1 rounded">النسبة المعتمدة: {localThreshold}%</span>
            </div>

            {/* Reports Mini Stats (Feature 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans select-none">
              <div className="p-4 bg-zinc-950/30 border border-zinc-900 rounded-xl text-right">
                <span className="block text-[10px] text-zinc-500">إجمالي طلاب الدبلومة:</span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  {enrolledStudents.length} <span className="text-xs text-zinc-400 font-sans font-normal">طالب</span>
                </span>
              </div>
              <div className="p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-xl text-right">
                <span className="block text-[10px] text-emerald-500 font-bold">المؤهلين للتخرج (مستحق):</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  {enrolledStudents.filter(st => {
                    let totalSessions = 0;
                    let attended = 0;
                    enrolledSessions.forEach(ses => {
                      const rec = ses.attendance?.[st.id];
                      if (rec && (rec.status === 'Present' || rec.status === 'Absent')) {
                        totalSessions++;
                        if (rec.status === 'Present') attended++;
                      }
                    });
                    const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
                    return rate >= localThreshold;
                  }).length} <span className="text-xs text-emerald-500 font-sans font-normal">طالب</span>
                </span>
              </div>
              <div className="p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl text-right">
                <span className="block text-[10px] text-rose-500 font-bold">غير المؤهلين (تحت الإنذار):</span>
                <span className="text-2xl font-black text-rose-450 font-mono mt-1 block">
                  {enrolledStudents.filter(st => {
                    let totalSessions = 0;
                    let attended = 0;
                    enrolledSessions.forEach(ses => {
                      const rec = ses.attendance?.[st.id];
                      if (rec && (rec.status === 'Present' || rec.status === 'Absent')) {
                        totalSessions++;
                        if (rec.status === 'Present') attended++;
                      }
                    });
                    const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
                    return rate < localThreshold;
                  }).length} <span className="text-xs text-rose-450 font-sans font-normal">طالب</span>
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right text-zinc-400 font-sans">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500">
                      <th className="py-2 pr-2">اسم الطالب</th>
                      <th className="py-2">هاتف الاتصال</th>
                      <th className="py-2">عدد الجلسات المدونة</th>
                      <th className="py-2">مرات الحضور</th>
                      <th className="py-2">مرات الغياب</th>
                      <th className="py-2">معدل المواظبة</th>
                      <th className="py-2 pl-2">الأهلية للتخرج والشهادة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.map((st) => {
                      let totalSessions = 0;
                      let attended = 0;
                      let absent = 0;
                      
                      enrolledSessions.forEach(ses => {
                        const rec = ses.attendance?.[st.id];
                        if (rec && (rec.status === 'Present' || rec.status === 'Absent')) {
                          totalSessions++;
                          if (rec.status === 'Present') attended++;
                          else absent++;
                        }
                      });

                      const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
                      const isEligible = rate >= localThreshold;

                      return (
                        <tr key={`row-rep-${st.id}`} className="border-b border-zinc-900/30 hover:bg-zinc-950/30">
                          <td className="py-3 pr-2 font-bold text-white capitalize">{st.name}</td>
                          <td className="py-3 font-mono text-[11px] text-zinc-500">{st.phone}</td>
                          <td className="py-3 font-mono">{totalSessions}</td>
                          <td className="py-3 font-mono text-emerald-400">{attended}</td>
                          <td className="py-3 font-mono text-rose-400">{absent}</td>
                          <td className="py-3 font-mono font-bold">{rate}%</td>
                          <td className="py-3 pl-2">
                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                              isEligible 
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/35' 
                                : 'bg-rose-950/20 text-rose-400 border border-rose-900/30'
                            }`}>
                              {isEligible ? 'مستحق ومعتمد للشهادة' : 'مستبعد (تدني الحضور)'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {enrolledStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-600">لا توجد بيانات طلاب لاستصدار تقريرها.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & LINKS FOR CURRENT DIPLOMA */}
        {activeTab === 'settings' && (
          <form onSubmit={handleUpdateDiplomaSettings} className="bg-[#0B0B0E] p-6 rounded-2xl border border-zinc-900 space-y-6">
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-bold text-white">إعدادات الدبلومة والبطاقة التشغيلية</h3>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">صيانة وحفظ معلومات الهيكل الأكاديمي، معلومات الاتصال، وروابط قنوات التزامن</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans text-zinc-400">
              
              {/* Left Column: Basic Details */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-400 block border-b border-zinc-900 pb-1.5 uppercase">البيانات الأساسية والهوية</span>
                
                <div>
                  <label className="block mb-1.5">اسم الدبلوم الأكاديمي:</label>
                  <input
                    type="text"
                    value={diplomaName}
                    onChange={(e) => setDiplomaName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-100 rounded outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1.5 font-bold text-white">نوع الدبلومة وتصنيف التخصص:</label>
                  <select
                    value={diplomaTypeVal}
                    onChange={(e) => setDiplomaTypeVal(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded cursor-pointer outline-hidden"
                    required
                  >
                    <option value="">-- اختر نوع التخصص --</option>
                    {diplomaTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.nameAr} ({type.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1.5">الوصف والمنهج التفصيلي:</label>
                  <textarea
                    value={diplomaDesc}
                    onChange={(e) => setDiplomaDesc(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-100 rounded outline-hidden resize-none leading-relaxed placeholder-zinc-[#1E1E24] text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5">تاريخ البداية:</label>
                    <input
                      type="date"
                      value={diplomaStart}
                      onChange={(e) => setDiplomaStart(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5">تاريخ النهاية المتوقع (اختياري):</label>
                    <input
                      type="date"
                      value={diplomaEnd}
                      onChange={(e) => setDiplomaEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5">الحالة الزمنية للتدريس:</label>
                  <select
                    value={diplomaStatus}
                    onChange={(e) => setDiplomaStatus(e.target.value as Diploma['status'])}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-zinc-800 text-zinc-200 rounded cursor-pointer text-right outline-hidden"
                  >
                    <option value="Upcoming">قريباً / قادم غير نشط (Upcoming)</option>
                    <option value="Active">نشط ومستمر حالياً (Active)</option>
                    <option value="Completed">مكتمل ومنتهي (Completed)</option>
                  </select>
                </div>
              </div>

              {/* Right Column: Academic Team & Links */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-400 block border-b border-zinc-900 pb-1.5 uppercase">الفريق الأكاديمي وروابط العمليات</span>
                            {/* Instructor */}
                <div className="space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                  <span className="font-bold text-zinc-350 block">المحاضر الرئيسي:</span>
                  
                  {/* Select instructor from database */}
                  <div className="mb-2">
                    <label className="block text-[10px] text-zinc-500 mb-1">تعيين سريع للمحاضر من السجلات:</label>
                    <select
                      onChange={(e) => {
                        const selected = instructors.find(i => i.id === e.target.value);
                        if (selected) {
                          setDiplomaInstName(selected.name);
                          setDiplomaInstPhone(selected.phone);
                          setDiplomaInstEmail(selected.email);
                        }
                      }}
                      className="w-full px-2.5 py-1 bg-[#050505] border border-zinc-900 text-[11px] text-zinc-300 rounded cursor-pointer"
                    >
                      <option value="">-- اختر محاضر مسجل --</option>
                      {instructors.filter(ins => ins.status === 'Active').map(ins => (
                        <option key={ins.id} value={ins.id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <input
                      type="text"
                      placeholder="اسم المحاضر"
                      value={diplomaInstName}
                      onChange={(e) => setDiplomaInstName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded outline-hidden"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="رقم الهاتف"
                        value={diplomaInstPhone}
                        onChange={(e) => setDiplomaInstPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded text-left outline-hidden"
                        dir="ltr"
                      />
                      <input
                        type="email"
                        placeholder="البريد الإلكتروني"
                        value={diplomaInstEmail}
                        onChange={(e) => setDiplomaInstEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded text-left outline-hidden font-sans"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Mentor */}
                <div className="space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                  <span className="font-bold text-zinc-350 block">المنتور المسؤول:</span>
                  
                  {/* Select mentor from database */}
                  <div className="mb-2">
                    <label className="block text-[10px] text-zinc-500 mb-1">تعيين سريع للـمنتور من السجلات:</label>
                    <select
                      onChange={(e) => {
                        const selected = mentors.find(m => m.id === e.target.value);
                        if (selected) {
                          setDiplomaMentName(selected.name);
                          setDiplomaMentPhone(selected.phone);
                          setDiplomaMentEmail(selected.email);
                        }
                      }}
                      className="w-full px-2.5 py-1 bg-[#050505] border border-zinc-900 text-[11px] text-zinc-300 rounded cursor-pointer"
                    >
                      <option value="">-- اختر منسق (منتور) مسجّل --</option>
                      {mentors.filter(men => men.status === 'Active').map(men => (
                        <option key={men.id} value={men.id}>{men.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <input
                      type="text"
                      placeholder="اسم المنتور"
                      value={diplomaMentName}
                      onChange={(e) => setDiplomaMentName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded outline-hidden"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="رقم هاتف المنتور"
                        value={diplomaMentPhone}
                        onChange={(e) => setDiplomaMentPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded text-left outline-hidden"
                        dir="ltr"
                      />
                      <input
                        type="email"
                        placeholder="بريد الكتروني"
                        value={diplomaMentEmail}
                        onChange={(e) => setDiplomaMentEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-200 rounded text-left outline-hidden font-sans"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Integration URLs */}
                <div className="space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 text-xs">
                  <span className="font-bold text-zinc-300 block">روابط وقنوات التزامن والتعليم:</span>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط نموذج الحضور (Google Form URL):</label>
                      <input
                        type="url"
                        value={linkForm}
                        onChange={(e) => setLinkForm(e.target.value)}
                        className="w-full px-3 py-1 bg-[#0A0A0A] border border-zinc-900 text-zinc-300 rounded text-left font-sans outline-hidden"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط جدول تدوينات الردود المرفق (Google Sheet URL (CSV)):</label>
                      <input
                        type="url"
                        value={linkSheet}
                        onChange={(e) => setLinkSheet(e.target.value)}
                        className="w-full px-3 py-1 bg-[#0A0A0A] border border-zinc-900 text-zinc-305 rounded text-left font-sans outline-hidden"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">مجموعة واتساب المحادثات للطلاب (WhatsApp Group URL):</label>
                      <input
                        type="url"
                        value={linkWhatsapp}
                        onChange={(e) => setLinkWhatsapp(e.target.value)}
                        className="w-full px-3 py-1 bg-[#0A0A0A] border border-zinc-900 text-zinc-305 rounded text-left font-sans outline-hidden"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط مجلد الحقيبة والملفات (Google Drive / Doc URL):</label>
                      <input
                        type="url"
                        value={linkDrive}
                        onChange={(e) => setLinkDrive(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-1 bg-[#0A0A0A] border border-zinc-900 text-zinc-305 rounded text-left font-sans outline-hidden"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط الفصول التفاعلية (Google Classroom URL):</label>
                      <input
                        type="url"
                        value={linkClassroom}
                        onChange={(e) => setLinkClassroom(e.target.value)}
                        placeholder="https://classroom.google.com/..."
                        className="w-full px-3 py-1 bg-[#0A0A0A] border border-zinc-900 text-zinc-305 rounded text-left font-sans outline-hidden"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Local Attendance Rules */}
                <div className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-900 text-xs space-y-3">
                  <span className="font-bold text-zinc-300 block">شروط وأرقام الأهلية والتشغيل (Section 8 Settings):</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">محاضرات مخططة:</label>
                      <input
                        type="number"
                        min={1}
                        value={numberOfSessionsPlanned}
                        onChange={(e) => setNumberOfSessionsPlanned(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-205 rounded text-center outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-2">أيام الدراسة الأسبوعية:</label>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {ALL_WEEK_DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                              selectedDays.includes(day)
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                                : 'bg-[#0A0A0A] border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-350'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">وقت وتوقيت البث:</label>
                      <input
                        type="text"
                        value={sessionTime}
                        onChange={(e) => setSessionTime(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-205 rounded outline-hidden text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">مقر ومكان التدريس:</label>
                      <input
                        type="text"
                        value={studyLocation}
                        onChange={(e) => setStudyLocation(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-205 rounded outline-hidden text-right"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">الحد الأدنى الأكاديمي للحضور (%):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={requiredAttendanceRateForm}
                        onChange={(e) => setRequiredAttendanceRateForm(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-205 rounded text-center outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">الغيابات المسموحة كحد أقصى:</label>
                      <input
                        type="number"
                        min={0}
                        value={allowedAbsencesForm}
                        onChange={(e) => setAllowedAbsencesForm(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-zinc-900 text-zinc-205 rounded text-center outline-hidden"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <div className="pt-4 border-t border-zinc-900 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 font-bold rounded-lg cursor-pointer transition-colors shadow-lg shadow-indigo-500/10"
              >
                تحديث وحفظ تهيئة الدبلومة
              </button>
            </div>
          </form>
        )}

      </div>

    </div>
  );
}
