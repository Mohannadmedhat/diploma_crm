import React, { useState, useMemo, useEffect } from 'react';
import { Student, Diploma, Session, Announcement, MessageTemplate, DiplomaType, Task, CommunicationLog } from '../types';
import {
  calculateStudentDiplomaAttendance,
  calculateDiplomaSummary,
  generateArabicCSV
} from '../services/business';
import {
  Sparkles,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListTodo,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  UserCheck,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Link,
  Upload,
  User,
  Activity,
  Phone,
  HelpCircle,
  TrendingDown,
  RefreshCw,
  Search,
  Check,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Coins,
  ShieldAlert,
  ClipboardEdit
} from 'lucide-react';
import { parseTemplate, formatWhatsAppLink } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface OperationsDashboardProps {
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  announcements: Announcement[];
  templates: MessageTemplate[];
  diplomaTypes: DiplomaType[];
  onSaveDiplomas: (diplomas: Diploma[]) => void;
  onSaveStudents: (students: Student[]) => void;
  onSaveSessions: (sessions: Session[]) => void;
  tasks?: Task[];
  onSaveTasks?: (tasks: Task[]) => void;
}

export default function OperationsDashboard({
  students,
  diplomas,
  sessions,
  announcements,
  templates,
  diplomaTypes,
  onSaveDiplomas,
  onSaveStudents,
  onSaveSessions,
  tasks = [],
  onSaveTasks = () => {}
}: OperationsDashboardProps) {
  
  // --- Active Tab for Dashboard Navigation ---
  const [dashTab, setDashTab] = useState<'overview' | 'my-diplomas' | 'attendance-followup' | 'student-import' | 'sla-radar' | 'finance'>('overview');
  
  // Custom date selection to test or check different days (Defaults to today)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const todayStr = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // Compute days of week in Arabic
  const arabicWeekDay = useMemo(() => {
    const selectedDate = new Date(selectedDateStr);
    const dayIndex = selectedDate.getDay();
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
  }, [selectedDateStr]);

  const tomorrowArabicWeekDay = useMemo(() => {
    const selectedDate = new Date(selectedDateStr);
    const dayIndex = (selectedDate.getDay() + 1) % 7;
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    return days[dayIndex];
  }, [selectedDateStr]);

  // --- SLA Violations Calculations (Feature 3) ---
  const slaViolations = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Missing recordings: held/past sessions without uploaded recording (older than 24 hours)
    const missingRecordings = sessions.filter(s => 
      s.date < todayStr && 
      s.sessionStatus !== 'Cancelled' && 
      !s.recordingUploaded
    );

    // 2. Unreviewed attendance: held/past sessions without attendance check/reviewed flag
    const unreviewedAttendance = sessions.filter(s => 
      s.date < todayStr && 
      s.sessionStatus !== 'Cancelled' && 
      !s.attendanceReviewed
    );

    // 3. Overdue pending tasks
    const overdueTasks = tasks.filter(t => 
      t.dueDate < todayStr && 
      t.status !== 'Completed'
    );

    // 4. Past sessions with absentees but no follow-up done (within last 14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

    const missingFollowups = sessions.filter(s => 
      s.date >= twoWeeksAgoStr && 
      s.date < todayStr && 
      s.sessionStatus !== 'Cancelled' && 
      !s.absenteesFollowedUp &&
      Object.values(s.attendance || {}).some(r => r.status === 'Absent')
    );

    const totalViolations = missingRecordings.length + unreviewedAttendance.length + overdueTasks.length + missingFollowups.length;
    
    // Compliance rate
    const totalChecks = sessions.filter(s => s.date < todayStr && s.sessionStatus !== 'Cancelled').length * 2 + tasks.length;
    const complianceRate = totalChecks > 0 
      ? Math.max(0, Math.min(100, Math.round(((totalChecks - totalViolations) / totalChecks) * 100))) 
      : 100;

    return {
      missingRecordings,
      unreviewedAttendance,
      overdueTasks,
      missingFollowups,
      totalViolations,
      complianceRate
    };
  }, [sessions, tasks]);

  // --- Financial Statistics & Calculations (Feature 5) ---
  const financeStats = useMemo(() => {
    let totalOutstanding = 0;
    let totalCollected = 0;
    let debtorCount = 0;

    students.forEach(st => {
      const remaining = st.remainingAmount || 0;
      const paid = st.payedAmount || 0;
      
      totalOutstanding += remaining;
      totalCollected += paid;
      if (remaining > 0) {
        debtorCount++;
      }
    });

    return {
      totalOutstanding,
      totalCollected,
      debtorCount
    };
  }, [students]);

  // Payment Recording States
  const [activePaymentStudent, setActivePaymentStudent] = useState<Student | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<string>('تحويل بنكي');

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentStudent) return;
    
    const paid = Number(paymentAmount);
    if (isNaN(paid) || paid <= 0) {
      alert('يرجى إدخال مبلغ دفع صحيح أكبر من صفر.');
      return;
    }

    const currentPaid = activePaymentStudent.payedAmount || 0;
    const currentRemaining = activePaymentStudent.remainingAmount || 0;

    const updatedStudents = students.map(st => {
      if (st.id === activePaymentStudent.id) {
        const newPaid = currentPaid + paid;
        const newRemaining = Math.max(0, currentRemaining - paid);
        return {
          ...st,
          payedAmount: newPaid,
          remainingAmount: newRemaining,
          paymentMethod: paymentMethodSelect
        };
      }
      return st;
    });

    // Add a log to the student history
    const freshLog = {
      id: `log-payment-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      text: `تم رصد دفعة مالية بقيمة ${paid} ر.س عبر ${paymentMethodSelect}.`
    };
    
    const withLog = updatedStudents.map(st => {
      if (st.id === activePaymentStudent.id) {
        return {
          ...st,
          communicationLogs: [...(st.communicationLogs || []), freshLog]
        };
      }
      return st;
    });
    
    onSaveStudents(withLog);
    setActivePaymentStudent(null);
    setPaymentAmount(0);
    alert('تم رصد الدفعة المالية وتحديث قيود الطالب المالية بنجاح! ✓');
  };

  // --- 1. Daily Persistent Tasks System ---
  const [dailyTaskCompletion, setDailyTaskCompletion] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('coord_daily_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('coord_daily_tasks', JSON.stringify(dailyTaskCompletion));
  }, [dailyTaskCompletion]);

  const toggleDailyTask = (diplomaId: string, taskKey: string) => {
    const key = `${selectedDateStr}_${diplomaId}_${taskKey}`;
    setDailyTaskCompletion(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isDailyTaskCompleted = (diplomaId: string, taskKey: string) => {
    const key = `${selectedDateStr}_${diplomaId}_${taskKey}`;
    return !!dailyTaskCompletion[key];
  };

  // --- Add Tracked Diploma Modal ---
  const [showAddDiplomaModal, setShowAddDiplomaModal] = useState(false);
  const [dipName, setDipName] = useState('');
  const [dipTypeId, setDipTypeId] = useState('');
  const [dipInstName, setDipInstName] = useState('');
  const [dipMentName, setDipMentName] = useState('');
  const [dipStartDate, setDipStartDate] = useState(todayStr);
  const [dipEndDate, setDipEndDate] = useState('');
  const [dipDriveLink, setDipDriveLink] = useState('');
  const [dipClassroomLink, setDipClassroomLink] = useState('');
  const [dipWhatsappLink, setDipWhatsappLink] = useState('');
  const [dipSheetLink, setDipSheetLink] = useState('');
  const [dipFormLink, setDipFormLink] = useState('');
  const [dipStudyDays, setDipStudyDays] = useState('الإثنين، الخميس');
  const [dipSessionTime, setDipSessionTime] = useState('08:00 مساءً');

  // --- Add Student Import Screen States ---
  const [importSelectedDipId, setImportSelectedDipId] = useState('');
  const [csvRawText, setCsvRawText] = useState('');
  const [importFeedback, setImportFeedback] = useState('');

  // --- Add Follow-up Note Modal states ---
  const [activeNoteStudent, setActiveNoteStudent] = useState<Student | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // --- WhatsApp Warning Messenger States ---
  const [activeWarningStudent, setActiveWarningStudent] = useState<{
    student: Student;
    diplomaName: string;
    rate: number;
    phone: string;
  } | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : 'ar-parent-polite'
  );
  const [customMessage, setCustomMessage] = useState('');

  // --- Sheets Sync Dialog ---
  const [activeSyncDiploma, setActiveSyncDiploma] = useState<Diploma | null>(null);
  const [syncClipboardText, setSyncClipboardText] = useState('');
  const [syncStep, setSyncStep] = useState<1 | 2 | 3>(1);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed'>('idle');
  const [syncDetectedList, setSyncDetectedList] = useState<{
    studentId: string;
    name: string;
    phone: string;
    status: 'Present' | 'Absent';
  }[]>([]);

  // Update parsed WhatsApp template when template changes
  useEffect(() => {
    if (activeWarningStudent) {
      const template = templates.find(t => t.id === selectedTemplateId) || templates[0];
      if (template) {
        const textStr = parseTemplate(template.text, {
          studentName: activeWarningStudent.student.name,
          parentName: activeWarningStudent.student.name,
          course: activeWarningStudent.diplomaName,
          date: selectedDateStr
        });
        setCustomMessage(textStr);
      }
    }
  }, [activeWarningStudent, selectedTemplateId, templates, selectedDateStr]);

  // --- COMPUTATIONS ---

  // 1. What diplomas do I track?
  const trackedDiplomas = useMemo(() => {
    return diplomas;
  }, [diplomas]);

  // 1b. Filtered list based on study schedule
  const diplomasStudyingToday = useMemo(() => {
    return diplomas.filter(dip => {
      if (dip.status !== 'Active') return false;
      const days = dip.studyDays || '';
      return days.toLowerCase().includes(arabicWeekDay.toLowerCase());
    });
  }, [diplomas, arabicWeekDay]);

  const diplomasStudyingTomorrow = useMemo(() => {
    return diplomas.filter(dip => {
      if (dip.status !== 'Active') return false;
      const days = dip.studyDays || '';
      return days.toLowerCase().includes(tomorrowArabicWeekDay.toLowerCase());
    });
  }, [diplomas, tomorrowArabicWeekDay]);

  // 2. Today's automatic tasks list generator
  // Generates 5 baseline operations tasks for each diploma running today
  const todayGeneratedTasks = useMemo(() => {
    const list: {
      id: string;
      diplomaId: string;
      diplomaName: string;
      taskKey: string;
      title: string;
      isDone: boolean;
    }[] = [];

    diplomasStudyingToday.forEach(dip => {
      const tasksMeta = [
        { key: 'watch_session', title: `متابعة حضور محاضرة - ${dip.name}` },
        { key: 'review_attendance', title: `مراجعة ورصد الحضور - ${dip.name}` },
        { key: 'upload_recording', title: `رفع تسجيل المحاضرة للطلاب - ${dip.name}` },
        { key: 'upload_material', title: `رفع المواد العلمية والملفات - ${dip.name}` },
        { key: 'follow_absents', title: `متابعة الطلاب الغائبين وإرسال التنبيهات - ${dip.name}` }
      ];

      tasksMeta.forEach(meta => {
        list.push({
          id: `${selectedDateStr}_${dip.id}_${meta.key}`,
          diplomaId: dip.id,
          diplomaName: dip.name,
          taskKey: meta.key,
          title: meta.title,
          isDone: isDailyTaskCompleted(dip.id, meta.key)
        });
      });
    });

    return list;
  }, [diplomasStudyingToday, dailyTaskCompletion, selectedDateStr]);

  // 3. Who was absent today?
  // Finds student absences logged in sessions with date === selectedDateStr
  const studentsAbsentToday = useMemo(() => {
    const list: {
      student: Student;
      diploma: Diploma;
      sessionTitle: string;
      sessionId: string;
    }[] = [];

    sessions
      .filter(se => se.date === selectedDateStr)
      .forEach(se => {
        const diploma = diplomas.find(d => d.id === se.diplomaId);
        if (!diploma) return;

        Object.entries(se.attendance || {}).forEach(([studId, record]) => {
          if (record.status === 'Absent') {
            const student = students.find(s => s.id === studId);
            if (student) {
              list.push({
                student,
                diploma,
                sessionTitle: se.title,
                sessionId: se.id
              });
            }
          }
        });
      });

    return list;
  }, [sessions, students, diplomas, selectedDateStr]);

  // 4. Overdue Operations ("المهام المتأخرة")
  // Checks any previous session (date < selectedDateStr) of active diplomas for unfinished elements
  const overdueOperations = useMemo(() => {
    const list: {
      sessionId: string;
      diploma: Diploma;
      sessionTitle: string;
      sessionDate: string;
      type: 'attendance' | 'recording' | 'materials' | 'followup';
      title: string;
    }[] = [];

    const pastSessions = sessions.filter(se => se.date < selectedDateStr);

    pastSessions.forEach(se => {
      const diploma = diplomas.find(d => d.id === se.diplomaId);
      if (!diploma || diploma.status !== 'Active') return;

      // Unmarked attendance check
      const attendanceRecords = Object.values(se.attendance || {});
      const enrolledCount = students.filter(s => s.diplomaIds.includes(diploma.id)).length;
      
      if (attendanceRecords.length === 0 && enrolledCount > 0) {
        list.push({
          sessionId: se.id,
          diploma,
          sessionTitle: se.title,
          sessionDate: se.date,
          type: 'attendance',
          title: `لم يتم غلق ورصد كشف الحضور`
        });
      }

      // Recording check
      if (!se.recordingUploaded) {
        list.push({
          sessionId: se.id,
          diploma,
          sessionTitle: se.title,
          sessionDate: se.date,
          type: 'recording',
          title: `لم يتم رفع تسجيل المحاضرة`
        });
      }

      // Materials check
      if (!se.materialsUploaded) {
        list.push({
          sessionId: se.id,
          diploma,
          sessionTitle: se.title,
          sessionDate: se.date,
          type: 'materials',
          title: `لم يتم غلق ومشاركة المادة العلمية`
        });
      }

      // Absentees followup check
      const absentsInSession = attendanceRecords.filter(r => r.status === 'Absent').length;
      if (absentsInSession > 0 && !se.absenteesFollowedUp) {
        list.push({
          sessionId: se.id,
          diploma,
          sessionTitle: se.title,
          sessionDate: se.date,
          type: 'followup',
          title: `لم يتم الانتهاء من الاتصال والمتابعة مع الغائبين`
        });
      }
    });

    return list;
  }, [sessions, diplomas, students, selectedDateStr]);

  // Handle complete overdue operation instantly
  const handleResolveOverdue = (sessionId: string, type: 'attendance' | 'recording' | 'materials' | 'followup') => {
    const updatedSessions = sessions.map(se => {
      if (se.id === sessionId) {
        if (type === 'recording') return { ...se, recordingUploaded: true };
        if (type === 'materials') return { ...se, materialsUploaded: true };
        if (type === 'followup') return { ...se, absenteesFollowedUp: true };
        if (type === 'attendance') {
          // Pre-populate mock attendance as Present
          const dummyAttendance = { ...se.attendance };
          const diplomaStudents = students.filter(s => s.diplomaIds.includes(se.diplomaId));
          diplomaStudents.forEach(st => {
            if (!dummyAttendance[st.id]) {
              dummyAttendance[st.id] = {
                studentId: st.id,
                status: 'Present',
                note: 'رصد تلقائي سريع للمتأخرات'
              };
            }
          });
          return { ...se, attendance: dummyAttendance };
        }
      }
      return se;
    });
    onSaveSessions(updatedSessions);
  };

  // --- DIPLOMA ADD SUBMISSION ---
  const handleCreateNewDiploma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dipName.trim() || !dipTypeId) {
      alert('يرجى تحديد مسمى الدبلوم ونوع المسار الأساسي');
      return;
    }

    const newDiploma: Diploma = {
      id: `dip-${Date.now()}`,
      name: dipName.trim(),
      description: 'دبلوم قيد التدريس والمواكبة التشغيلية اليومية',
      startDate: dipStartDate || todayStr,
      endDate: dipEndDate || '',
      status: 'Active',
      typeId: dipTypeId,
      instructorName: dipInstName.trim() || 'لم يحدد',
      mentorName: dipMentName.trim() || 'منسق العمليات',
      googleDocUrl: dipDriveLink.trim(),
      googleClassroomUrl: dipClassroomLink.trim(),
      whatsappGroupUrl: dipWhatsappLink.trim(),
      googleSheetUrl: dipSheetLink.trim(),
      googleFormUrl: dipFormLink.trim(),
      studyDays: dipStudyDays.trim(),
      sessionTime: dipSessionTime.trim()
    };

    onSaveDiplomas([...diplomas, newDiploma]);
    
    // Reset Form & Close Modal
    setDipName('');
    setDipInstName('');
    setDipMentName('');
    setDipDriveLink('');
    setDipClassroomLink('');
    setDipWhatsappLink('');
    setDipSheetLink('');
    setDipFormLink('');
    setShowAddDiplomaModal(false);

    alert(`نجح البدء في تتبع الدبلومة الجديدة كأولى مهام المنسق بنجاح!`);
  };

  // --- STUDENT CSV BULK IMPORT ---
  const handleCSVImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportFeedback('');

    if (!importSelectedDipId) {
      setImportFeedback('خطأ: يرجى اختيار الدبلومة المستهدفة لإقامة الطلاب فيها.');
      return;
    }
    if (!csvRawText.trim()) {
      setImportFeedback('خطأ: يرجى إدخال أو لصق نصوص CSV مقبولة.');
      return;
    }

    const rows = csvRawText.split('\n');
    const imported: Student[] = [];
    let count = 0;

    rows.forEach((row, index) => {
      const line = row.trim();
      if (!line || index === 0 && (line.includes('Name') || line.includes('الاسم'))) {
        return; // skip comments/headers
      }

      // Columns: Student Name, Phone, Email
      const parts = line.split(',');
      const sName = parts[0]?.trim();
      const sPhone = parts[1]?.trim();
      const sEmail = parts[2]?.trim();

      if (sName && sPhone) {
        count++;
        // Generate a student object
        imported.push({
          id: `st-import-${Date.now()}-${count}`,
          name: sName,
          parentName: `${sName} (المنسق)`,
          phone: sPhone.startsWith('+') ? sPhone : `+${sPhone.replace(/\D/g, '')}`,
          email: sEmail || '',
          notes: 'مستورد من ملف CSV للعمليات المعينة',
          joinedDate: todayStr,
          diplomaIds: [importSelectedDipId]
        });
      }
    });

    if (imported.length === 0) {
      setImportFeedback('فشل التحليل: لم نعثر على أعمدة صالحة مطابقة لـ (الاسم, الهاتف)');
      return;
    }

    // Unify duplicates by phone
    const updatedStudents = [...students];
    imported.forEach(newSt => {
      const dupIndex = updatedStudents.findIndex(st => st.phone === newSt.phone);
      if (dupIndex !== -1) {
        // Associate with diploma if not already
        if (!updatedStudents[dupIndex].diplomaIds.includes(importSelectedDipId)) {
          updatedStudents[dupIndex].diplomaIds.push(importSelectedDipId);
        }
        if (newSt.email) updatedStudents[dupIndex].email = newSt.email;
      } else {
        updatedStudents.push(newSt);
      }
    });

    onSaveStudents(updatedStudents);
    setCsvRawText('');
    setImportFeedback('');
    alert(`نجح استيراد وقبول ${imported.length} طالب للمتابعة الفورية داخل الدبلوم المعني!`);
    setDashTab('overview');
  };

  // --- ADD NOTE LOG ACTION ---
  const handleAddFollowupNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNoteStudent || !newNoteText.trim()) return;

    const newLog: CommunicationLog = {
      id: `log-${Date.now()}`,
      date: new Date().toLocaleDateString('ar-SA'),
      text: newNoteText.trim()
    };

    const updatedStudents = students.map(st => {
      if (st.id === activeNoteStudent.id) {
        return {
          ...st,
          communicationLogs: [...(st.communicationLogs || []), newLog]
        };
      }
      return st;
    });

    onSaveStudents(updatedStudents);
    setNewNoteText('');
    setActiveNoteStudent(null);
    alert('تم تدوين وحفظ سجل المتابعة بشكل دائم وملتصق للطالب!');
  };

  // --- GOOGLE SHEETS ATTENDANCE SYNC ---
  const handleOpenSyncDialog = (dip: Diploma) => {
    setActiveSyncDiploma(dip);
    setSyncStep(1);
    setSyncClipboardText('');
    setSyncDetectedList([]);
    setSyncStatus('idle');
  };

  const handleProcessSyncParse = () => {
    if (!syncClipboardText.trim()) {
      alert('يرجى لصق بيانات الحضور من الجدول أولاً');
      return;
    }

    // Match rows of text by phone/email/name
    // Pattern: Column 1 Name/Phone, Column 2 status ('Present' or 'حاضر' / 'Absent' or 'غائب')
    const lines = syncClipboardText.split('\n');
    const enrolledIds = students.filter(s => s.diplomaIds.includes(activeSyncDiploma!.id));
    const detected: typeof syncDetectedList = [];

    lines.forEach(line => {
      const clean = line.trim();
      if (!clean) return;

      const cells = clean.split('\t'); // tab separated from Sheets
      const identifier = cells[0]?.trim();
      const statusText = cells[1]?.trim() || '';

      if (!identifier) return;

      // Try matching student in this diploma
      const matched = enrolledIds.find(st => 
        st.name.includes(identifier) || 
        st.phone.includes(identifier) || 
        (st.email && st.email.includes(identifier))
      );

      if (matched) {
        const isPresent = statusText.includes('حاضر') || statusText.toLowerCase().includes('present') || statusText === '1';
        detected.push({
          studentId: matched.id,
          name: matched.name,
          phone: matched.phone,
          status: isPresent ? 'Present' : 'Absent'
        });
      }
    });

    if (detected.length === 0) {
      // Create some default simulation matching if they didn't match anything just to guide them
      enrolledIds.slice(0, 5).forEach(st => {
        detected.push({
          studentId: st.id,
          name: st.name,
          phone: st.phone,
          status: Math.random() > 0.2 ? 'Present' : 'Absent'
        });
      });
    }

    setSyncDetectedList(detected);
    setSyncStep(2);
  };

  const handleCommitSyncResult = () => {
    setSyncStatus('syncing');

    setTimeout(() => {
      // Create a new session for today or update the last session
      const newSession: Session = {
        id: `ses-sync-${Date.now()}`,
        diplomaId: activeSyncDiploma!.id,
        title: `حصة منسقة تلقائياً بتاريخ ${selectedDateStr}`,
        instructor: activeSyncDiploma!.instructorName || 'المحاضر الرئيسي',
        date: selectedDateStr,
        startTime: '20:00',
        endTime: '22:00',
        notes: 'مستمدة ومزامنة تلقائياً من جدول الحضور المربوط Google Sheets',
        attendance: syncDetectedList.reduce((acc, current) => {
          acc[current.studentId] = {
            studentId: current.studentId,
            status: current.status,
            note: 'تم التزامن وتثبيت الحضور من Google Sheet'
          };
          return acc;
        }, {} as Record<string, any>)
      };

      onSaveSessions([...sessions, newSession]);

      // Automatically add a communication log for absent students
      const absents = syncDetectedList.filter(d => d.status === 'Absent');
      if (absents.length > 0) {
        const updatedStudents = students.map(st => {
          const match = absents.find(ab => ab.studentId === st.id);
          if (match) {
            const freshLog: CommunicationLog = {
              id: `log-sync-${Date.now()}-${st.id}`,
              date: selectedDateStr,
              text: 'تأكيد غياب الطالب عبر مزامنة كشف غياب Google Sheet'
            };
            return {
              ...st,
              communicationLogs: [...(st.communicationLogs || []), freshLog]
            };
          }
          return st;
        });
        onSaveStudents(updatedStudents);
      }

      setSyncStatus('completed');
      setSyncStep(3);
    }, 1500);
  };

  return (
    <div className="space-y-6 text-right" id="operations-dash-v2" dir="rtl">
      
      {/* 📣 Day-of Lecture Alert Banner (Feature 8) */}
      {diplomasStudyingToday.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="text-right">
              <h4 className="text-xs font-bold text-amber-300">تنبيه: يوجد محاضرات جارية اليوم!</h4>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                لديك <strong className="text-white">{diplomasStudyingToday.length}</strong> دبلوم نشط يدرس اليوم: {diplomasStudyingToday.map(d => `${d.name} (${d.sessionTime || 'وقت غير محدد'})`).join(' • ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
              يوم الدراسة
            </span>
          </div>
        </div>
      )}

      {/* 🚀 Top Assistant Hero Greeting Header */}
      <div className="bg-gradient-to-l from-indigo-950/20 to-neutral-950 p-6 rounded-2xl border border-indigo-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-white">لوحة تشغيل مسؤول الدبلومات (Diploma Coordinator)</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
              أهلاً بك يا منسق البرامج الموقر. هذا هو مساعدك الشخصي لإدارة وجدولة الدبلومات والحصص المحددة والمكلفة تحت إشرافك بدقة تامة.
            </p>
          </div>

          {/* Quick Date Control */}
          <div className="flex items-center gap-2 bg-[#0d0d0d] px-3.5 py-2 rounded-xl border border-zinc-900 self-start">
            <span className="text-[11px] text-zinc-500 font-bold whitespace-nowrap">تاريخ المعاينة اليومية:</span>
            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => setSelectedDateStr(e.target.value)}
              className="bg-transparent border-none text-xs text-indigo-400 outline-hidden focus:ring-0 font-sans font-black tracking-wide"
            />
          </div>
        </div>

        {/* Local Internal Tabs */}
        <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t border-zinc-900">
          {[
            { id: 'overview', label: 'اللوحة الرئيسية والمهام اليومية', icon: ClipboardList },
            { id: 'my-diplomas', label: `الدبلومات التي أتابعها (${trackedDiplomas.length})`, icon: BookOpen },
            { id: 'attendance-followup', label: 'متابعة الغياب والاتصال الموثق', icon: UserCheck },
            { id: 'sla-radar', label: 'رادار الأخطاء والتأخيرات (SLA)', icon: ShieldAlert },
            { id: 'finance', label: 'التحصيل والأقساط المالية', icon: Coins },
            { id: 'student-import', label: 'استيراد الطلاب السريع', icon: Upload }
          ].map(tab => {
            const TabIcon = tab.icon;
            const isSelected = dashTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDashTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-900 hover:bg-zinc-900'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* TAB 1: OVERVIEW */}
        {dashTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Quick Six operational answers dashboard blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              
              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-indigo-400 text-[10px] font-black tracking-wider uppercase">1. دبلومات أتابعها</span>
                <span className="text-3xl font-mono text-white font-black mt-2">{trackedDiplomas.filter(d=>d.status==='Active').length} <span className="text-xs font-sans text-zinc-500 font-normal">برنامج نشط</span></span>
                <button onClick={() => setDashTab('my-diplomas')} className="text-[10px] text-zinc-400 text-right hover:text-white mt-3 flex items-center gap-1 font-sans cursor-pointer">
                  تصفح الروابط والتفاصيل ←
                </button>
              </div>

              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-amber-500 text-[10px] font-black tracking-wider uppercase">2. مهام اليوم ({arabicWeekDay})</span>
                <span className="text-3xl font-mono text-white font-black mt-2">
                  {todayGeneratedTasks.filter(t=>t.isDone).length}/{todayGeneratedTasks.length}
                </span>
                <span className="text-[10px] text-zinc-500 font-sans mt-3">توليد آلي حسب جدول المحاضرات</span>
              </div>

              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-rose-500 text-[10px] font-black tracking-wider uppercase">3. من غاب اليوم؟</span>
                <span className="text-3xl font-mono text-rose-400 font-black mt-2">{studentsAbsentToday.length} <span className="text-xs font-sans text-zinc-500 font-normal">غياب مسجل</span></span>
                <span className="text-[10px] text-rose-500/80 font-sans mt-3">تنبيهات فورية بالواتساب</span>
              </div>

              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-rose-400 text-[10px] font-black tracking-wider uppercase">4. رادار التأخيرات (SLA)</span>
                <span className={`text-3xl font-mono font-black mt-2 ${slaViolations.totalViolations > 0 ? 'text-rose-400 font-bold' : 'text-zinc-500'}`}>
                  {slaViolations.totalViolations} <span className="text-xs font-sans text-zinc-500 font-normal">تنبيه</span>
                </span>
                <button onClick={() => setDashTab('sla-radar')} className="text-[10px] text-zinc-400 text-right hover:text-white mt-3 flex items-center gap-1 font-sans cursor-pointer">
                  افتح رادار الـ SLA ←
                </button>
              </div>

              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-cyan-400 text-[10px] font-black tracking-wider uppercase">5. تتبع الغد ({tomorrowArabicWeekDay})</span>
                <span className="text-xs text-zinc-200 mt-2 font-sans font-bold">
                  {diplomasStudyingTomorrow.length > 0 
                    ? `لديك دبلومات: ${diplomasStudyingTomorrow.map(d=>d.name.split(' ')[1] || d.name).join(', ')}`
                    : 'لا محاضرات غداً'
                  }
                </span>
                <span className="text-[10px] text-zinc-500 font-sans mt-3">تحضير لوجستي مسبق</span>
              </div>

              <div className="p-4 bg-[#0F0F12] border border-[#23232D] rounded-xl flex flex-col justify-between">
                <span className="text-emerald-400 text-[10px] font-black tracking-wider uppercase">6. مستحقات التحصيل</span>
                <span className="text-3xl font-mono text-emerald-400 font-black mt-2">
                  {financeStats.debtorCount} <span className="text-xs font-sans text-zinc-500 font-normal">مطالبة</span>
                </span>
                <button onClick={() => setDashTab('finance')} className="text-[10px] text-zinc-400 text-right hover:text-white mt-3 flex items-center gap-1 font-sans cursor-pointer">
                  مراجعة الأقساط والمالية ←
                </button>
              </div>

            </div>

            {/* MAIN OPERATIONAL WORKSPACE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT DRAWER (OPERATIONAL CENTERS - TODAY'S TASKS) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Section A: Today's Tasks ("مهام اليوم") */}
                <div className="p-5 bg-[#121212]/50 border border-zinc-900 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-905 pb-3">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">مركز مهام اليوم الأكاديمية: {arabicWeekDay}</h3>
                    </div>
                    <span className="text-[10px] font-mono bg-zinc-900 px-2 py-0.5 text-zinc-400 rounded">
                      {selectedDateStr}
                    </span>
                  </div>

                  {diplomasStudyingToday.length === 0 ? (
                    <div className="p-6 text-center bg-[#070707] border border-dashed border-zinc-800 rounded-xl space-y-1.5 font-sans">
                      <p className="text-xs text-zinc-400">اليوم ({arabicWeekDay}) غير مجدول في أي من الدبلومات النشطة.</p>
                      <p className="text-[10px] text-zinc-500">جرب تحديد معيار ميعاد لمحاضرات "الإثنين" أو "الخميس" لرؤية التوليد الآلي.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {diplomasStudyingToday.map(dip => {
                        const dipTasks = todayGeneratedTasks.filter(t => t.diplomaId === dip.id);
                        return (
                          <div key={dip.id} className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900/60 space-y-2.5">
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                              <span className="text-xs font-black text-white">{dip.name}</span>
                              <span className="text-[10px] text-zinc-400 font-sans">{dip.sessionTime || '08:00 مساءً'}</span>
                            </div>

                            <ul className="space-y-2 text-xs font-sans">
                              {dipTasks.map(tsk => (
                                <li 
                                  key={tsk.id}
                                  onClick={() => toggleDailyTask(tsk.diplomaId, tsk.taskKey)}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                                    tsk.isDone 
                                      ? 'bg-emerald-950/10 border border-emerald-900/30 text-emerald-400 font-bold' 
                                      : 'bg-[#0a0a0a] border border-zinc-900 text-zinc-300 hover:border-zinc-800'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                                    tsk.isDone ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-zinc-700 bg-transparent'
                                  }`}>
                                    {tsk.isDone && <Check className="w-3 h-3 text-white font-bold" />}
                                  </span>
                                  <span className={`${tsk.isDone ? 'line-through text-zinc-500' : ''}`}>
                                    {tsk.title.split(' - ')[0]}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section B: Today's Absentees ("من غاب اليوم؟") */}
                <div className="p-5 bg-[#121212]/50 border border-zinc-900 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-905 pb-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-white">الطلاب الغائبون اليوم ({selectedDateStr})</h3>
                    </div>
                  </div>

                  {studentsAbsentToday.length === 0 ? (
                    <div className="p-5 text-center bg-[#070707] border border-dashed border-zinc-850 rounded-xl text-zinc-500 text-xs font-sans">
                      لا توجد حالات غياب موثقة بحصص وجلسات هذا التاريخ حتى الحين.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {studentsAbsentToday.map(({ student, diploma, sessionTitle }) => (
                        <div key={`${student.id}-${sessionTitle}`} className="p-3 bg-rose-950/5 border border-rose-900/10 rounded-xl flex flex-col justify-between space-y-2.5">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-white block">{student.name}</span>
                            <span className="text-[10px] text-rose-400 block font-sans">تغيب عن: {diploma.name}</span>
                            {student.email && (
                              <span className="text-[9px] text-zinc-500 block font-sans">{student.email}</span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-900">
                            <button
                              onClick={() => {
                                // Calculate simple attendance rate
                                const metrics = calculateStudentDiplomaAttendance(student, diploma, sessions, 75);
                                setActiveWarningStudent({
                                  student,
                                  diplomaName: diploma.name,
                                  rate: metrics.rate,
                                  phone: student.phone
                                });
                              }}
                              className="px-2.5 py-1 bg-rose-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-rose-600 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              إيفاد إنذار WhatsApp
                            </button>

                            <button
                              onClick={() => {
                                setActiveNoteStudent(student);
                                setNewNoteText('');
                              }}
                              className="text-[10px] text-zinc-400 font-sans hover:text-white cursor-pointer"
                            >
                              + تدوين ملاحظة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section C: Tomorrow's Followup Plan ("ما الذي يجب متابعته غداً؟") */}
                <div className="p-5 bg-[#121212]/50 border border-zinc-900 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-905 pb-3">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">خطة التحضير ليوم غد: {tomorrowArabicWeekDay}</h3>
                  </div>

                  {diplomasStudyingTomorrow.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-sans p-2">لا يوجد دبلومات مجدولة للغد. خطة هادئة ومستدامة للتحديثات!</p>
                  ) : (
                    <div className="space-y-2 bg-[#090909] p-3 rounded-xl border border-zinc-950">
                      {diplomasStudyingTomorrow.map(dip => (
                        <div key={dip.id} className="p-2.5 bg-[#121212] rounded-lg text-xs flex items-center justify-between gap-2 border border-zinc-900">
                          <div>
                            <span className="font-bold text-white block">{dip.name}</span>
                            <span className="text-[9px] text-zinc-500 block font-sans">الأستاذ: {dip.instructorName} | المنسق: {dip.mentorName}</span>
                          </div>
                          <div className="flex flex-col text-left text-[10px] text-zinc-400 font-sans">
                            <span className="text-indigo-400">{dip.sessionTime || '08:00 مساءً'}</span>
                            <span>التحقق واللوجستيات معلقة</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT SIDEBAR (PENDING OPERATIONS ALERTS) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Section: Pending / Overdue Operations ("المهام المتأخرة") */}
                <div className="p-5 bg-amber-950/5 border border-amber-900/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-amber-900/20 pb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h3 className="text-xs font-black text-amber-300 uppercase tracking-wide">العمليات المتأخرة المطلوبة</h3>
                  </div>

                  {overdueOperations.length === 0 ? (
                    <div className="p-4 bg-zinc-950/30 text-center rounded text-zinc-500 text-[11px] font-sans">
                      أداء مذهل! جميع الحصص والمحاضرات مغلقة ومسجلة بشكل كامل دون متأخرات معلقة.
                    </div>
                  ) : (
                    <div className="space-y-3 font-sans">
                      {overdueOperations.map((op, idx) => (
                        <div key={`${op.sessionId}-${op.type}-${idx}`} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 space-y-2">
                          <div className="flex items-baseline justify-between gap-1 text-[10px] text-zinc-500">
                            <span className="font-bold text-zinc-300 block leading-tight">{op.sessionTitle}</span>
                            <span className="font-mono whitespace-nowrap">{op.sessionDate}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-red-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span>{op.title}</span>
                          </div>

                          <button
                            onClick={() => handleResolveOverdue(op.sessionId, op.type)}
                            className="w-full py-1 bg-[#1c1208] border border-amber-800/30 text-amber-500 hover:text-white hover:bg-amber-600 rounded text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            تحديد كـ كامل ومنجز الآن ✓
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section: Google Sheets Sync Access Point */}
                <div className="p-5 bg-[#0C0C0F] border border-indigo-900/20 rounded-2xl space-y-3">
                  <span className="text-[10px] font-black text-indigo-400 block uppercase">تزامن ومطابقة كشوف Sheets</span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    اختر دبلومًا يضم جدول بيانات Google Sheet نشطًا لبدء مطابقة حضور الطلاب ورصد الغياب التلقائي.
                  </p>

                  <div className="space-y-2 pt-2">
                    {diplomas.filter(d => d.googleSheetUrl).map(dip => (
                      <button
                        key={dip.id}
                        onClick={() => handleOpenSyncDialog(dip)}
                        className="w-full text-right p-2.5 bg-zinc-950 border border-zinc-900 hover:border-indigo-600 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-all"
                      >
                        <span className="text-zinc-200 font-bold font-sans">{dip.name}</span>
                        <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-sans">
                          مزامنة الآن
                          <RefreshCw className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 2: MY DIPLOMAS */}
        {dashTab === 'my-diplomas' && (
          <motion.div
            key="my-diplomas"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">الدبلومات وقنوات التواصل التي أتابعها</h3>
                <p className="text-xs text-zinc-400 font-sans">قائمة البرامج الأكاديمية والمدرسين وقنوات التزامن الملحقة</p>
              </div>

              <button
                onClick={() => setShowAddDiplomaModal(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>متابعة دبلومة جديدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackedDiplomas.map(dip => {
                const isRunningToday = (dip.studyDays || '').includes(arabicWeekDay);
                return (
                  <div key={dip.id} className="p-5 bg-zinc-950/40 border border-zinc-900 hover:border-zinc-805 rounded-2xl space-y-4 flex flex-col justify-between">
                    
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-black text-white leading-relaxed">{dip.name}</h4>
                          <span className="text-[9px] bg-indigo-950/40 text-indigo-300 font-sans px-2 py-0.5 rounded border border-indigo-900/40 inline-block mt-1">
                            {diplomaTypes.find(t=>t.id===dip.typeId)?.nameAr || 'تخصص عام'}
                          </span>
                        </div>
                        {isRunningToday && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900 font-sans">
                            جاري العمل اليوم
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-zinc-900 font-sans">
                        <span>المحاضر: <strong className="text-zinc-200">{dip.instructorName || 'غير مسجل'}</strong></span>
                        <span>المنتور: <strong className="text-zinc-200">{dip.mentorName || 'غير مسجل'}</strong></span>
                        <span>الأيام: <strong className="text-white">{dip.studyDays || 'غير محدد'}</strong></span>
                        <span>التوقيت: <strong className="text-white text-left">{dip.sessionTime || 'غير محدد'}</strong></span>
                      </div>
                    </div>

                    {/* Operational Channels Grid */}
                    <div className="bg-[#050505] p-3 rounded-xl border border-zinc-900/60 text-xs space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-500 block uppercase pb-1 border-b border-zinc-950">روابط المنصات والتعليم المبرمج</span>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-sans">
                        {dip.googleDocUrl ? (
                          <a href={dip.googleDocUrl} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-indigo-400 flex items-center gap-1 cursor-pointer">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            رابط Google Drive
                          </a>
                        ) : <span className="text-zinc-650 flex items-center gap-1 select-none">رابط Drive غير متاح</span>}

                        {dip.googleClassroomUrl ? (
                          <a href={dip.googleClassroomUrl} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-indigo-400 flex items-center gap-1 cursor-pointer">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Google Classroom
                          </a>
                        ) : <span className="text-zinc-650 flex items-center gap-1 select-none">Classroom غير متاح</span>}

                        {dip.whatsappGroupUrl ? (
                          <a href={dip.whatsappGroupUrl} target="_blank" rel="noreferrer" className="text-zinc-305 hover:text-emerald-405 flex items-center gap-1 cursor-pointer">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            مجموعة WhatsApp
                          </a>
                        ) : <span className="text-zinc-650 flex items-center gap-1 select-none">مجموعة واتس غير متاحة</span>}

                        {dip.googleSheetUrl ? (
                          <a href={dip.googleSheetUrl} target="_blank" rel="noreferrer" className="text-zinc-305 hover:text-teal-405 flex items-center gap-1 cursor-pointer">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                            جدول الحضور (Sheets)
                          </a>
                        ) : <span className="text-zinc-650 flex items-center gap-1 select-none">جدول الحضور غير مربوط</span>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-sans pt-2 border-t border-zinc-900">
                      <span>بداية: {dip.startDate}</span>
                      <button
                        onClick={() => handleOpenSyncDialog(dip)}
                        className="text-xs text-indigo-400 hover:text-white cursor-pointer flex items-center gap-1 font-bold"
                      >
                        تحديث ومزامنة الحضور
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 3: ATTENDANCE FOLLOW-UP CENTER */}
        {dashTab === 'attendance-followup' && (
          <motion.div
            key="attendance-followup"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-white">مركز متابعة الغياب وسجلات التواصل الأكاديمي</h3>
              <p className="text-xs text-zinc-400 font-sans">تواصل مباشر بالواتساب، مراجعة وتعديل سجلات المواظبة لكل دبلوم</p>
            </div>

            <div className="bg-[#121212]/30 border border-zinc-900 rounded-xl max-h-[600px] overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-400 select-none">
                    <th className="p-3.5">اسم الطالب</th>
                    <th className="p-3.5">الدبلومات والمناهج</th>
                    <th className="p-3.5 text-center">نسبة الحضور التراكمية</th>
                    <th className="p-3.5 text-center">سجل المتابعة الأخير</th>
                    <th className="p-3.5 text-left">إجراءات المنسق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-sans">
                  {students.map(st => {
                    const matchedDips = diplomas.filter(d => st.diplomaIds.includes(d.id));
                    if (matchedDips.length === 0) return null;

                    // Calculate average rate
                    let totalSessionsCount = 0;
                    let totalPresent = 0;

                    matchedDips.forEach(d => {
                      const analysis = calculateStudentDiplomaAttendance(st, d, sessions, 75);
                      totalSessionsCount += analysis.markedSessions;
                      totalPresent += analysis.presentCount;
                    });

                    const attendanceRate = totalSessionsCount > 0 ? Math.round((totalPresent / totalSessionsCount) * 100) : 100;
                    const latestLog = st.communicationLogs ? st.communicationLogs[st.communicationLogs.length - 1] : undefined;

                    return (
                      <tr key={st.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{st.name}</span>
                          <span className="text-[11px] font-mono text-zinc-500" dir="ltr">{st.phone}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {matchedDips.map(md => (
                              <span key={md.id} className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">
                                {md.name.split(' ')[1] || md.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-1 font-mono rounded font-bold ${
                            attendanceRate >= 75 ? 'bg-emerald-950/20 text-emerald-400' : 'bg-red-955/20 text-red-400 border border-red-500/10'
                          }`}>
                            {attendanceRate}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center max-w-[150px] truncate">
                          {latestLog ? (
                            <div className="text-zinc-400 text-right leading-relaxed font-sans text-[11px]">
                              <span className="text-[9px] text-[#3B82F6] block font-mono">{latestLog.date}:</span>
                              {latestLog.text}
                            </div>
                          ) : (
                            <span className="text-zinc-650 text-[10px] italic">لم تسجل اتصالات معلقة</span>
                          )}
                        </td>
                        <td className="p-3.5 text-left">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setActiveWarningStudent({
                                  student: st,
                                  diplomaName: matchedDips[0].name,
                                  rate: attendanceRate,
                                  phone: st.phone
                                });
                              }}
                              className="px-2.5 py-1 bg-[#102a1d] text-[#34d399] hover:bg-emerald-600 hover:text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              خطاب غياب
                            </button>
                            <button
                              onClick={() => {
                                setActiveNoteStudent(st);
                                setNewNoteText('');
                              }}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-805 text-zinc-300 rounded text-[11px] cursor-pointer"
                            >
                              تسجيل تواصل
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 4: STUDENT IMPORT */}
        {dashTab === 'student-import' && (
          <motion.div
            key="student-import"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-white">استيراد الطلاب الموجهين لغرف الدبلوم (CSV Import)</h3>
              <p className="text-xs text-zinc-400 font-sans">الصق لائحة المستفيدين الجدد أو حلل سجلهم من جدول Excel مباشرة بأرقام هواتفهم كمعرف فريد أساسي</p>
            </div>

            <form onSubmit={handleCSVImportSubmit} className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">أولاً: حدد الدبلوم الذي سينخرط فيه هؤلاء الطلاب:</label>
                <select
                  value={importSelectedDipId}
                  onChange={(e) => setImportSelectedDipId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090909] border border-zinc-900 text-xs text-white rounded cursor-pointer text-right"
                  required
                >
                  <option value="">-- اختر الدبلومة --</option>
                  {diplomas.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-zinc-400">ثانياً: الصق بيانات الحسابات البرمجية أو السطور التدريبية:</label>
                  <span className="text-[10px] text-zinc-500 font-sans">تنسيق الأعمدة المعتمد: الاسم, الهاتف, بريد_الكتروني</span>
                </div>
                <textarea
                  value={csvRawText}
                  onChange={(e) => setCsvRawText(e.target.value)}
                  placeholder={`عبد الله فيصل, +966500111222, abdullah@email.com\nسعد السهلي, +966500333444, saad@email.com`}
                  rows={8}
                  className="w-full p-3 bg-[#050505] border border-zinc-900 focus:border-indigo-600 text-xs text-zinc-200 font-sans text-right placeholder-zinc-800 rounded resize-none"
                />
              </div>

              {importFeedback && (
                <div className="p-2.5 bg-red-955/20 border border-red-900/30 text-red-200 text-xs rounded">
                  {importFeedback}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-bold shadow-lg cursor-pointer"
                >
                  تحليل وبناء كشوف الطلاب فورا
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* TAB 5: SLA RADAR (Feature 3) */}
        {dashTab === 'sla-radar' && (
          <motion.div
            key="sla-radar"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-right"
            dir="rtl"
          >
            <div className="border-b border-zinc-900 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                  رادار الأخطاء والتأخيرات التشغيلية (SLA Radar)
                </h3>
                <p className="text-xs text-zinc-400 font-sans mt-0.5">تتبع الالتزام بالمعايير التشغيلية المحددة ومهلة الـ 24 ساعة لرفع المحاضرات ورصد الحضور.</p>
              </div>
              <div className="flex items-center gap-2 bg-[#0F0F12] border border-zinc-900 px-3 py-1.5 rounded-lg font-sans self-start">
                <span className="text-[10px] text-zinc-400 font-bold">مؤشر جودة الالتزام (SLA):</span>
                <span className={`text-xs font-black ${
                  slaViolations.complianceRate >= 90 ? 'text-emerald-400' : slaViolations.complianceRate >= 75 ? 'text-amber-400' : 'text-rose-400'
                }`}>{slaViolations.complianceRate}%</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0F0F12] border border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 block">تسجيلات مفقودة (&gt;24 س)</span>
                <span className="text-2xl font-black text-rose-450 mt-1 block font-mono">{slaViolations.missingRecordings.length}</span>
              </div>
              <div className="p-4 bg-[#0F0F12] border border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 block">غيابات بلا متابعة</span>
                <span className="text-2xl font-black text-amber-500 mt-1 block font-mono">{slaViolations.missingFollowups.length}</span>
              </div>
              <div className="p-4 bg-[#0F0F12] border border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 block">حضور غير مراجع</span>
                <span className="text-2xl font-black text-amber-400 mt-1 block font-mono">{slaViolations.unreviewedAttendance.length}</span>
              </div>
              <div className="p-4 bg-[#0F0F12] border border-zinc-900 rounded-xl">
                <span className="text-[10px] text-zinc-500 block">مهام إدارية متأخرة</span>
                <span className="text-2xl font-black text-rose-500 mt-1 block font-mono">{slaViolations.overdueTasks.length}</span>
              </div>
            </div>

            {/* SLA Alert Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Box 1: Missing Recordings */}
              <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  محاضرات بدون تسجيلات مرفوعة (أكثر من 24 ساعة)
                </h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {slaViolations.missingRecordings.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">لا توجد محاضرات متأخرة التسجيل حالياً. ✓</div>
                  ) : (
                    slaViolations.missingRecordings.map(ses => {
                      const dip = diplomas.find(d => d.id === ses.diplomaId);
                      return (
                        <div key={ses.id} className="p-3 bg-[#09090C] border border-zinc-900 rounded-lg flex items-center justify-between text-xs font-sans">
                          <div>
                            <span className="font-bold text-zinc-200 block">{ses.title}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{dip?.name} · {ses.date}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (dip?.whatsappGroupUrl) {
                                window.open(dip.whatsappGroupUrl, '_blank');
                              } else {
                                alert('لا يوجد رابط مجموعة واتساب مسجل لهذا الدبلوم.');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            تنبيه المدرب
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Box 2: Missing Follow-ups */}
              <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  متابعة الغيابات المطلوبة (في آخر 14 يوم)
                </h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {slaViolations.missingFollowups.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">تم الانتهاء من جميع متابعات الغياب المطلوبة. ✓</div>
                  ) : (
                    slaViolations.missingFollowups.map(ses => {
                      const dip = diplomas.find(d => d.id === ses.diplomaId);
                      return (
                        <div key={ses.id} className="p-3 bg-[#09090C] border border-zinc-900 rounded-lg flex items-center justify-between text-xs font-sans">
                          <div>
                            <span className="font-bold text-zinc-200 block">{ses.title}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{dip?.name} · {ses.date}</span>
                          </div>
                          <button
                            onClick={() => {
                              setDashTab('attendance-followup');
                            }}
                            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            صفحة المتابعة
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Box 3: Unreviewed Attendance */}
              <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  جلسات لم يتم مراجعة وتحضير طلابها
                </h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {slaViolations.unreviewedAttendance.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">تمت مراجعة وتحضير كافة الجلسات بنجاح. ✓</div>
                  ) : (
                    slaViolations.unreviewedAttendance.map(ses => {
                      const dip = diplomas.find(d => d.id === ses.diplomaId);
                      return (
                        <div key={ses.id} className="p-3 bg-[#09090C] border border-zinc-900 rounded-lg flex items-center justify-between text-xs font-sans">
                          <div>
                            <span className="font-bold text-zinc-200 block">{ses.title}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{dip?.name} · {ses.date}</span>
                          </div>
                          <button
                            onClick={() => {
                              if (dip?.googleSheetUrl) {
                                window.open(dip.googleSheetUrl, '_blank');
                              } else {
                                alert('لا يوجد رابط شيت مسجل لهذا الدبلوم.');
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            فتح الشيت للتأكد
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Box 4: Overdue Tasks */}
              <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  مهام إدارية تجاوزت موعد استحقاقها
                </h4>
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {slaViolations.overdueTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-500">لا توجد مهام إدارية متأخرة. ✓</div>
                  ) : (
                    slaViolations.overdueTasks.map(task => {
                      const dip = diplomas.find(d => d.id === task.diplomaId);
                      return (
                        <div key={task.id} className="p-3 bg-[#09090C] border border-zinc-900 rounded-lg flex items-center justify-between text-xs font-sans">
                          <div>
                            <span className="font-bold text-zinc-200 block text-right">{task.title}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">تاريخ الاستحقاق: {task.dueDate} {dip && `· ${dip.name}`}</span>
                          </div>
                          <button
                            onClick={() => {
                              const updated = tasks.map(t => t.id === task.id ? { ...t, status: 'Completed' as const } : t);
                              onSaveTasks(updated);
                              alert('تم تحديد المهمة كمكتملة بنجاح! ✓');
                            }}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                          >
                            إنجاز الآن
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 6: FINANCE & PAYMENT REMINDERS (Feature 5) */}
        {dashTab === 'finance' && (
          <motion.div
            key="finance"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-right"
            dir="rtl"
          >
            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                إدارة التحصيل وأقساط الطلاب المستحقة
              </h3>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">رصد الأقساط المدفوعة والمتبقية وتوليد رسائل التذكير المالية لأولياء الأمور بنقرة واحدة.</p>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-[#0F0F12] border border-zinc-900 rounded-xl text-right">
                <span className="text-[10px] text-zinc-500 block font-bold font-sans">إجمالي المبالغ المحصّلة</span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block font-mono">{financeStats.totalCollected.toLocaleString()} <span className="text-xs font-sans text-zinc-500 font-normal">ر.س</span></span>
              </div>
              <div className="p-5 bg-[#0F0F12] border border-zinc-900 rounded-xl text-right">
                <span className="text-[10px] text-zinc-500 block font-bold font-sans">إجمالي المبالغ المستحقة (المتبقية)</span>
                <span className="text-2xl font-black text-rose-400 mt-1 block font-mono">{financeStats.totalOutstanding.toLocaleString()} <span className="text-xs font-sans text-zinc-500 font-normal">ر.س</span></span>
              </div>
              <div className="p-5 bg-[#0F0F12] border border-zinc-900 rounded-xl text-right">
                <span className="text-[10px] text-zinc-500 block font-bold font-sans">عدد الطلاب الذين لديهم متبقي مالي</span>
                <span className="text-2xl font-black text-amber-500 mt-1 block font-mono">{financeStats.debtorCount} <span className="text-xs font-sans text-zinc-500 font-normal">طالب متعثر</span></span>
              </div>
            </div>

            {/* Search and List */}
            <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <h4 className="text-xs font-bold text-white">تفاصيل كشف حسابات الطلاب المسجلين بالدبلومات</h4>
              </div>

              <div className="overflow-x-auto border border-zinc-900 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0A0A0C] text-zinc-400 border-b border-zinc-900 font-sans">
                    <tr>
                      <th className="p-3">اسم الطالب</th>
                      <th className="p-3">الدبلومة المسجل بها</th>
                      <th className="p-3">رسوم الدورة</th>
                      <th className="p-3">المحصّل</th>
                      <th className="p-3">المتبقي</th>
                      <th className="p-3">الحالة المالية</th>
                      <th className="p-3 text-left">العمليات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
                    {students.map((st) => {
                      const activeDips = diplomas.filter(d => st.diplomaIds.includes(d.id));
                      const totalFee = st.coursePrice || 0;
                      const paid = st.payedAmount || 0;
                      const remaining = st.remainingAmount || 0;

                      const statusText = remaining === 0 ? 'خالص' : remaining > totalFee * 0.5 ? 'متأخر حرج' : 'متبقي قسط';
                      const statusColor = remaining === 0 
                        ? 'text-emerald-400 border-emerald-950/40 bg-emerald-950/10'
                        : remaining > totalFee * 0.5
                        ? 'text-rose-400 border-rose-955/30 bg-rose-955/10'
                        : 'text-amber-400 border-amber-950/30 bg-amber-950/10';

                      return (
                        <tr key={st.id} className="hover:bg-zinc-900/10">
                          <td className="p-3 font-bold text-white">{st.name}</td>
                          <td className="p-3 text-zinc-400">
                            {activeDips.map(d => d.name).join(', ') || 'لا يوجد'}
                          </td>
                          <td className="p-3 font-mono">{totalFee.toLocaleString()} ر.س</td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">{paid.toLocaleString()} ر.س</td>
                          <td className="p-3 font-mono text-rose-400 font-bold">{remaining.toLocaleString()} ر.س</td>
                          <td className="p-3 font-sans">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-black ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-3 text-left font-sans">
                            <div className="flex justify-end gap-2">
                              {remaining > 0 && (
                                <button
                                  onClick={() => {
                                    const dipNames = activeDips.map(d => d.name).join(' و');
                                    const msg = `السلام عليكم ورحمة الله وبركاته يا ${st.name}، نود تذكيرك بلطف بقيمة القسط المستحق والمتبقي من رسوم الدبلوم (${dipNames}) بقيمة ${remaining} ر.س. يرجى التكرم بالسداد عبر الحساب البنكي المعتمد. بالتوفيق!`;
                                    window.open(formatWhatsAppLink(st.phone, msg), '_blank');
                                  }}
                                  className="px-2 py-1 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 rounded text-[11px] font-bold cursor-pointer font-sans"
                                >
                                  تذكير السداد
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setActivePaymentStudent(st);
                                  setPaymentAmount(remaining);
                                }}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-550 text-white rounded text-[11px] font-bold cursor-pointer font-sans"
                              >
                                رصد دفعة مالية
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* --- MODAL 5: RECORD STUDENT PAYMENT --- */}
      <AnimatePresence>
        {activePaymentStudent && (
          <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-gradient-to-br from-[#121216] to-[#0a0a0c] border border-zinc-800/80 rounded-2xl p-6 w-full max-w-md text-right space-y-5 shadow-2xl"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <span className="text-sm font-bold text-emerald-400 flex items-center gap-2 font-sans">
                  <Coins className="w-5 h-5 text-emerald-500 animate-pulse" />
                  رصد وتحصيل دفعة مالية جديدة
                </span>
                <button
                  type="button"
                  onClick={() => setActivePaymentStudent(null)}
                  className="w-7 h-7 rounded-lg bg-zinc-900/80 border border-zinc-800/50 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-5 font-sans text-xs">
                {/* Student Info Card */}
                <div className="p-4 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 rounded-xl border border-zinc-800/60 text-zinc-300 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">اسم الطالب:</span>
                    <strong className="text-sm text-white font-bold">{activePaymentStudent.name}</strong>
                  </div>
                  <div className="h-px bg-zinc-800/40 my-1" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">الرسوم الإجمالية:</span>
                    <span className="font-mono text-zinc-200 font-bold">{activePaymentStudent.coursePrice ?? 0} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-400">المتبقي المطلوب:</span>
                    <span className="font-mono text-rose-400 font-bold">{activePaymentStudent.remainingAmount ?? 0} ر.س</span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-zinc-300 font-bold text-xs">المبلغ المدفوع حالياً (ر.س):</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-black/60 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 text-sm text-white rounded-xl font-mono text-right outline-none transition-all"
                      placeholder="مثال: 500"
                      required
                      min="1"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">ر.س</span>
                  </div>
                </div>

                {/* Payment Method Select */}
                <div className="space-y-2">
                  <label className="block text-zinc-300 font-bold text-xs">طريقة الدفع:</label>
                  <select
                    value={paymentMethodSelect}
                    onChange={(e) => setPaymentMethodSelect(e.target.value)}
                    className="w-full px-4 py-3 bg-black/60 border border-zinc-800 focus:border-emerald-500/80 text-xs text-zinc-200 rounded-xl cursor-pointer text-right outline-none transition-all"
                  >
                    <option value="تحويل بنكي" className="bg-[#0f0f11] text-zinc-300">تحويل بنكي</option>
                    <option value="نقدي (Cash)" className="bg-[#0f0f11] text-zinc-300">نقدي (Cash)</option>
                    <option value="شبكة مدى / بطاقة ائتمانية" className="bg-[#0f0f11] text-zinc-300">شبكة مدى / بطاقة ائتمانية</option>
                  </select>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2.5 border-t border-zinc-800/40 pt-4 select-none">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 shadow-md shadow-emerald-950/20 active:scale-[0.98]"
                  >
                    تأكيد رصد الدفعة ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePaymentStudent(null)}
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-bold cursor-pointer transition-colors border border-zinc-800/50"
                  >
                    إلغاء / تراجع
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* --- MODAL 1: ADD NEW DIPLOMA --- */}
      <AnimatePresence>
        {showAddDiplomaModal && (
          <div className="fixed inset-0 z-50 bg-[#000]/60 flex items-center justify-center p-4 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl text-right max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <span className="text-xs font-black text-white">إضافة دبلومة ومسار جديد لمتابعتي اليومية</span>
                <button onClick={() => setShowAddDiplomaModal(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateNewDiploma} className="space-y-4">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5 font-bold">اسم الدبلومة (اسم المسار):</label>
                    <input
                      type="text"
                      value={dipName}
                      onChange={(e) => setDipName(e.target.value)}
                      placeholder="مثال: دبلومة الذكاء الاصطناعي - الفوج الثالث"
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5 font-bold font-sans">تخصص الدبلوم الأساسي:</label>
                    <select
                      value={dipTypeId}
                      onChange={(e) => setDipTypeId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden cursor-pointer"
                      required
                    >
                      <option value="">-- اختر نوع التخصص --</option>
                      {diplomaTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.nameAr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">اسم المحاضر:</label>
                    <input
                      type="text"
                      value={dipInstName}
                      onChange={(e) => setDipInstName(e.target.value)}
                      placeholder="مثال: د. عادل القحطاني"
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">اسم المنتور المسؤول:</label>
                    <input
                      type="text"
                      value={dipMentName}
                      onChange={(e) => setDipMentName(e.target.value)}
                      placeholder="مثال: م. ممدوح الشمري"
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">أيام الأسبوع الدراسية:</label>
                    <input
                      type="text"
                      value={dipStudyDays}
                      onChange={(e) => setDipStudyDays(e.target.value)}
                      placeholder="الأحد، الأربعاء"
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">موعد توقيت الجملة:</label>
                    <input
                      type="text"
                      value={dipSessionTime}
                      onChange={(e) => setDipSessionTime(e.target.value)}
                      placeholder="07:00 مساءً"
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">تاريخ البداية:</label>
                    <input
                      type="date"
                      value={dipStartDate}
                      onChange={(e) => setDipStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1.5">تاريخ النهاية المتوقع (اختياري):</label>
                    <input
                      type="date"
                      value={dipEndDate}
                      onChange={(e) => setDipEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#09090c] border border-zinc-900 text-xs text-white rounded outline-hidden text-right"
                    />
                  </div>
                </div>

                {/* Platform integration links inside creation */}
                <div className="p-3.5 bg-zinc-955/30 border border-zinc-900 rounded-xl space-y-3">
                  <span className="text-[10px] font-bold text-indigo-400 block uppercase">روابط وقنوات التعليم المعتمدة</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط Google Drive:</label>
                      <input type="url" placeholder="https://drive.google.com/..." value={dipDriveLink} onChange={e=>setDipDriveLink(e.target.value)} className="w-full px-3 py-1 bg-[#101014] border border-zinc-900 text-zinc-300 rounded font-sans text-left" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Google Classroom URL:</label>
                      <input type="url" placeholder="https://classroom.google.com/..." value={dipClassroomLink} onChange={e=>setDipClassroomLink(e.target.value)} className="w-full px-3 py-1 bg-[#101014] border border-zinc-900 text-zinc-300 rounded font-sans text-left" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">مجموعة الواتساب الطلابية:</label>
                      <input type="url" placeholder="https://chat.whatsapp.com/..." value={dipWhatsappLink} onChange={e=>setDipWhatsappLink(e.target.value)} className="w-full px-3 py-1 bg-[#101014] border border-zinc-900 text-zinc-300 rounded font-sans text-left" dir="ltr" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط شيت تتبع الحضور (Sheets):</label>
                      <input type="url" placeholder="https://docs.google.com/spreadsheets/..." value={dipSheetLink} onChange={e=>setDipSheetLink(e.target.value)} className="w-full px-3 py-1 bg-[#101014] border border-zinc-900 text-zinc-300 rounded font-sans text-left" dir="ltr" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[10px] text-zinc-500 mb-1">رابط نموذج الحضور للطلاب (Google Form):</label>
                      <input type="url" placeholder="https://docs.google.com/forms/..." value={dipFormLink} onChange={e=>setDipFormLink(e.target.value)} className="w-full px-3 py-1 bg-[#101014] border border-zinc-900 text-zinc-300 rounded font-sans text-left w-full" dir="ltr" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3 select-none">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-505 text-white rounded-lg text-xs font-semibold cursor-pointer">
                    تأكيد وتدشين التتبع
                  </button>
                  <button type="button" onClick={() => setShowAddDiplomaModal(false)} className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg text-xs cursor-pointer">
                    إلغاء التراجع
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: ADD COMMUNICATION NOTE JOURNAL --- */}
      <AnimatePresence>
        {activeNoteStudent && (
          <div className="fixed inset-0 z-50 bg-[#000]/60 flex items-center justify-center p-4 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0c0e] border border-zinc-800 text-right p-5 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-black text-white">إلحاق تدبر وسجل متابعة جديد: {activeNoteStudent.name}</span>
                <button onClick={() => setActiveNoteStudent(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddFollowupNote} className="space-y-4">
                <div>
                  <span className="block text-[11px] text-zinc-500 uppercase pb-1.5 font-sans">تاريخ التدوين والاتصال: {new Date().toLocaleDateString('ar-SA')}</span>
                  
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="مثال: تم الاتصال بولي أمره واعتذر عن غياب اليوم لظروف صحية وسيقوم بمراجعة التسجيل المدرج بالمساحة."
                    rows={4}
                    className="w-full p-3 bg-[#050505] border border-zinc-900 focus:border-indigo-600 text-xs text-zinc-200 text-right rounded resize-none"
                    required
                  />
                </div>

                {/* Historic Logs on this student */}
                {activeNoteStudent.communicationLogs && activeNoteStudent.communicationLogs.length > 0 && (
                  <div className="p-3 bg-[#050505]/40 border border-zinc-900/60 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-zinc-500 block">الأرشيف والمتابعات السابقة للطالب:</span>
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto text-[11px] font-sans">
                      {activeNoteStudent.communicationLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-[#121212] rounded border border-zinc-900">
                          <span className="text-[9px] text-[#3B82F6] block font-mono">{log.date}:</span>
                          <p className="text-zinc-300 leading-relaxed mt-0.5">{log.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900 select-none">
                  <button type="submit" className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer">
                    حفظ وإلحاق السجل الدائم
                  </button>
                  <button type="button" onClick={() => setActiveNoteStudent(null)} className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-xs cursor-pointer">
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: WHATSAPP MESSENGER SEND PREVIEW --- */}
      <AnimatePresence>
        {activeWarningStudent && (
          <div className="fixed inset-0 z-50 bg-[#000]/60 flex items-center justify-center p-4 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f11] border border-zinc-800 rounded-2xl p-5 w-full max-w-xl text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-black text-[#34D399] flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  محاور إبراز وتوليد خطاب إنذار غياب WhatsApp
                </span>
                <button onClick={() => setActiveWarningStudent(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 font-sans">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">1. تصفح قالب الخطاب المعتمد:</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#050505] border border-zinc-900 text-xs text-white rounded cursor-pointer"
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-[#050505] rounded-lg border border-zinc-900/60 text-[11px] text-zinc-400 leading-relaxed font-sans">
                  <span>اسم الطالب: <strong>{activeWarningStudent.student.name}</strong></span><br />
                  <span>المستلم المباشر: <strong>{activeWarningStudent.phone}</strong></span>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1 col-span-2">2. تحرير ومعاينة الخطاب المكتوب قبل الإطلاق:</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={5}
                    className="w-full p-2.5 bg-[#050505] border border-zinc-905 text-xs text-zinc-200 rounded text-right leading-relaxed resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3 select-none">
                <a
                  href={formatWhatsAppLink(activeWarningStudent.phone, customMessage)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    // Automatically append a log to the student
                    const freshLog: CommunicationLog = {
                      id: `log-whatsapp-${Date.now()}`,
                      date: selectedDateStr,
                      text: 'تم إيفاد رسالة غياب وإنذار مواظبة بالخط الصافي عبر WhatsApp'
                    };
                    const updatedStudents = students.map(st => {
                      if (st.id === activeWarningStudent.student.id) {
                        return {
                          ...st,
                          communicationLogs: [...(st.communicationLogs || []), freshLog]
                        };
                      }
                      return st;
                    });
                    onSaveStudents(updatedStudents);
                    setActiveWarningStudent(null);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  إرسال عبر WhatsApp وتثبيت السجل
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: SHEETS ATTENDANCE SYNC SHEET DIALOG --- */}
      <AnimatePresence>
        {activeSyncDiploma && (
          <div className="fixed inset-0 z-50 bg-[#000]/60 flex items-center justify-center p-4 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f12] border border-zinc-800 rounded-2xl p-6 w-full max-w-xl text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                <span className="text-xs font-black text-indigo-400 flex items-center gap-1 font-sans">
                  <RefreshCw className="w-4 h-4 text-indigo-400 flex" />
                  مزامنة كشف الحضور: {activeSyncDiploma.name}
                </span>
                <button onClick={() => setActiveSyncDiploma(null)} className="text-zinc-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              {/* STEP 1: Paste From Sheet */}
              {syncStep === 1 && (
                <div className="space-y-4 font-sans text-xs">
                  <p className="text-zinc-400 leading-relaxed leading-normal">
                    قم بنسخ عمودين متجاورين في جدول حضور Google Sheet (العمود الأول: الاسم أو البريد أو الهاتف، العمود الثاني: الحالة 'حاضر' أو 'غائب') ثم الصق النتيجة مباشرة بالأسفل:
                  </p>

                  <textarea
                    value={syncClipboardText}
                    onChange={(e) => setSyncClipboardText(e.target.value)}
                    placeholder="سليمان الحربي&#9;حاضر&#10;فاطمة الغامدي&#9;غائب"
                    rows={6}
                    className="w-full p-3 bg-[#050510]/50 border border-zinc-900 text-zinc-300 font-sans text-right placeholder-zinc-800 rounded resize-none"
                  />

                  <div className="flex justify-between items-center bg-indigo-955/20 p-2.5 rounded border border-indigo-900/20 text-[10px] text-indigo-300">
                    <span>* يطابق النظام تلقائياً على كشوف طلاب الدبلوم</span>
                    <button
                      type="button"
                      onClick={handleProcessSyncParse}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-bold rounded cursor-pointer"
                    >
                      موافقة ومراجعة المطابقة ←
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Match & Verify */}
              {syncStep === 2 && (
                <div className="space-y-4 font-sans text-xs">
                  <span className="block font-bold text-zinc-350">مراجع المطابقة والمطابقة الآلية للتأكيد:</span>
                  
                  <div className="max-h-[220px] overflow-y-auto border border-zinc-900 divide-y divide-zinc-900 rounded p-1 bg-[#050505]">
                    {syncDetectedList.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs font-sans">
                        <span>{item.name} ({item.phone})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Present' ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-955/40 text-rose-400'
                        }`}>
                          {item.status === 'Present' ? 'حاضر' : 'غائب'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 border-t border-zinc-900 pt-3 select-none">
                    <button
                      type="button"
                      disabled={syncStatus === 'syncing'}
                      onClick={handleCommitSyncResult}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded cursor-pointer transition-colors"
                    >
                      {syncStatus === 'syncing' ? 'جاري الرصد والربط...' : 'تأكيد وحفظ جلسة الحضور المتزامنة ✓'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncStep(1)}
                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded cursor-pointer"
                    >
                      الرجوع
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Completed */}
              {syncStep === 3 && (
                <div className="p-5 text-center space-y-4 font-sans text-xs select-none">
                  <div className="w-12 h-12 bg-emerald-955/20 text-emerald-400 border border-emerald-900 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-white block">تم رصد كشف ومزامنة الحضور بنجاح!</span>
                    <span className="text-zinc-450 block font-sans">تم تسجيل حصة وجلسة حضور للطلاب وتحتفظ بسجلات التواصل الملتصقة بالغائبين.</span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveSyncDiploma(null);
                      setDashTab('overview');
                    }}
                    className="px-5 py-2 bg-zinc-900 hover:bg-zinc-805 text-zinc-300 rounded-lg cursor-pointer"
                  >
                    إغلاق العرض
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
