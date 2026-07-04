import React, { useState } from 'react';
import { Session, Student, Diploma, AttendanceStatus, AttendanceRecord } from '../types';
import { parseSessionTimeTo24h, getSessionDurationHours, addHoursToTime } from '../services/business';
import {
  CalendarDays,
  Clock,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Megaphone,
  BookOpen,
  ChevronsUpDown,
  User,
  RefreshCw,
  FileSpreadsheet,
  Link2,
  Play,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SessionManagerProps {
  sessions: Session[];
  students: Student[];
  diplomas: Diploma[];
  onSaveSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
}

export default function SessionManager({
  sessions,
  students,
  diplomas,
  onSaveSession,
  onDeleteSession
}: SessionManagerProps) {
  const [selectedDiplomaId, setSelectedDiplomaId] = useState<string>(() => {
    return diplomas.length > 0 ? diplomas[0].id : '';
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [formError, setFormError] = useState('');

  // Attendance control dropdown
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Google Forms & Sheets Synchronization States
  const [syncingSessionId, setSyncingSessionId] = useState<string | null>(null);
  const [syncCsvData, setSyncCsvData] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLiveFetching, setIsLiveFetching] = useState(false);

  // One-click absentee follow-up states
  const [showAbsenteeModal, setShowAbsenteeModal] = useState<string | null>(null);
  const [followedUpMap, setFollowedUpMap] = useState<Record<string, boolean>>({});
  const [customMessageTemplate, setCustomMessageTemplate] = useState<string>(
    'السلام عليكم سعادة [ولي_الأمر]، نود إحاطتكم بغياب الطالب [اسم_الطالب] عن المحاضرة التعليمية لدبلوم [الدبلوم] بتاريخ [التاريخ]. نأمل حث الطالب على المواظبة ومراجعة التسجيل لتعويض ما فاته.'
  );

  // Compute sessions for current diploma
  const filteredSessions = sessions.filter((s) => s.diplomaId === selectedDiplomaId);

  // Compute enrolled students for current diploma
  const enrolledStudents = students.filter((st) => st.diplomaIds.includes(selectedDiplomaId));

  const handleStartAdd = () => {
    setEditingSessionId(null);
    setTitle('');
    
    const selectedDiploma = diplomas.find(d => d.id === selectedDiplomaId);
    const start24h = selectedDiploma ? parseSessionTimeTo24h(selectedDiploma.sessionTime) : '18:00';
    const durationHours = selectedDiploma ? getSessionDurationHours(selectedDiploma.studyDays) : 3;
    const end24h = addHoursToTime(start24h, durationHours);

    setInstructor(selectedDiploma?.instructorName || '');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime(start24h);
    setEndTime(end24h);
    setNotes('');
    setGoogleFormUrl('');
    setGoogleSheetUrl('');
    setFormError('');
    setShowAddForm(true);
  };

  const handleStartEdit = (s: Session) => {
    setEditingSessionId(s.id);
    setTitle(s.title);
    setInstructor(s.instructor);
    setDate(s.date);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setNotes(s.notes);
    setGoogleFormUrl(s.googleFormUrl || '');
    setGoogleSheetUrl(s.googleSheetUrl || '');
    setFormError('');
    setShowAddForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedDiplomaId) {
      setFormError('يرجى تحديد الدبلوم أولاً.');
      return;
    }
    if (!title.trim()) {
      setFormError('عنوان الجلسة مطلوب.');
      return;
    }

    // Initialize/Preserve attendance map
    let initialAttendance: Record<string, AttendanceRecord> = {};
    if (editingSessionId) {
      const existing = sessions.find((s) => s.id === editingSessionId);
      if (existing) {
        initialAttendance = { ...existing.attendance };
      }
    } else {
      // New session has unmarked attendance for all enrolled students
      enrolledStudents.forEach((student) => {
        initialAttendance[student.id] = {
          studentId: student.id,
          status: 'Unmarked',
          note: ''
        };
      });
    }

    const savedSession: Session = {
      id: editingSessionId || `ses-${Date.now()}`,
      diplomaId: selectedDiplomaId,
      title: title.trim(),
      instructor: instructor.trim() || 'معلم غير مسمى',
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || '09:00',
      endTime: endTime || '12:00',
      notes: notes.trim(),
      attendance: initialAttendance,
      googleFormUrl: googleFormUrl.trim(),
      googleSheetUrl: googleSheetUrl.trim()
    };

    onSaveSession(savedSession);
    setShowAddForm(false);
    setEditingSessionId(null);
    setGoogleFormUrl('');
    setGoogleSheetUrl('');
  };

  const handlePerformSync = (sessionId: string, rawCsv: string) => {
    const sessionToUpdate = sessions.find((s) => s.id === sessionId);
    if (!sessionToUpdate) return;

    setSyncStatusMsg(null);
    if (!rawCsv.trim()) {
      setSyncStatusMsg({ type: 'error', message: 'محتوى البيانات فارغ. يرجى المزامنة التلقائية أو لصق أسطر CSV أولاً.' });
      return;
    }

    const lines = rawCsv.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      setSyncStatusMsg({ type: 'error', message: 'تنسيق الملف غير صالح أو الأسطر فارغة.' });
      return;
    }

    // Read students enrolled in the diploma
    const currentEnrolled = students.filter((st) => st.diplomaIds.includes(sessionToUpdate.diplomaId));
    if (currentEnrolled.length === 0) {
      setSyncStatusMsg({ type: 'error', message: 'لم يسجل أي طالب في هذا الدبلوم بعد.' });
      return;
    }

    // Parse the lines and search for matches
    // Key-value map: clean name -> attendance status & note
    const attendanceMap: Record<string, { status: AttendanceStatus; note: string }> = {};

    // First line determines indices
    const headers = lines[0].split(/[,\t;]/).map(h => h.trim().replace(/^"|"$/g, ''));
    let nameIdx = -1;
    let statusIdx = -1;
    let noteIdx = -1;

    headers.forEach((h, i) => {
      const l = h.toLowerCase();
      if (l.includes('اسم') || l.includes('name') || l.includes('طالب') || l.includes('الاسم')) {
        nameIdx = i;
      } else if (l.includes('حضور') || l.includes('حالة') || l.includes('status') || l.includes('attendance')) {
        statusIdx = i;
      } else if (l.includes('ملاحظ') || l.includes('note') || l.includes('سبب')) {
        noteIdx = i;
      }
    });

    // Fallback indices if headers are not recognized in standard formatting
    if (nameIdx === -1) nameIdx = 0;
    if (statusIdx === -1) statusIdx = 1;

    // Loop through rows
    for (let rIdx = 1; rIdx < lines.length; rIdx++) {
      const row = lines[rIdx];
      // Split preserving quotes
      const cells: string[] = [];
      let inQuotes = false;
      let current = '';
      for (let charIdx = 0; charIdx < row.length; charIdx++) {
        const char = row[charIdx];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
          cells.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim().replace(/^"|"$/g, ''));

      const rawName = cells[nameIdx];
      if (!rawName) continue;

      const rawStatusStr = cells[statusIdx] || 'حاضر';
      const rawNote = cells[noteIdx] || '';

      // Map status
      let mappedStatus: AttendanceStatus = 'Present';
      let mappedNote = rawNote;

      const normStatus = rawStatusStr.toLowerCase();
      if (normStatus.includes('غائب') || normStatus.includes('absent') || normStatus.includes('لا يحضر') || normStatus.includes('غياب')) {
        mappedStatus = 'Absent';
      } else if (normStatus.includes('متأخر') || normStatus.includes('late')) {
        mappedStatus = 'Present';
        mappedNote = mappedNote ? `${mappedNote} (متأخر)` : 'متأخر';
      } else if (normStatus.includes('حاضر') || normStatus.includes('present') || normStatus.includes('حضور')) {
        mappedStatus = 'Present';
      }

      const cleanKey = rawName.trim().toLowerCase();
      attendanceMap[cleanKey] = {
        status: mappedStatus,
        note: mappedNote
      };
    }

    // Now update or fill attendance for ALL enrolled students
    const updatedAttendance = { ...sessionToUpdate.attendance };
    let syncedCount = 0;
    let absentMatchedCount = 0;

    currentEnrolled.forEach((student) => {
      // Find a matching parsed sheet row based on name containment
      const studentCleanName = student.name.trim().toLowerCase();
      
      // Look for key matching
      const matchingKey = Object.keys(attendanceMap).find((key) => {
        return key.includes(studentCleanName) || studentCleanName.includes(key);
      });

      if (matchingKey) {
        const matchData = attendanceMap[matchingKey];
        updatedAttendance[student.id] = {
          studentId: student.id,
          status: matchData.status,
          note: matchData.note
        };
        syncedCount++;
      } else {
        // Did not submit attendance sheet! Make them automatically Absent
        updatedAttendance[student.id] = {
          studentId: student.id,
          status: 'Absent',
          note: 'تغيب تلقائي (عدم تسليم استمارة نموذج الحضور جـوجـل)'
        };
        absentMatchedCount++;
      }
    });

    const finalSession: Session = {
      ...sessionToUpdate,
      attendance: updatedAttendance
    };

    onSaveSession(finalSession);
    setSyncStatusMsg({
      type: 'success',
      message: `تمت المزامنة بنظام رصد Google: مطابقة الحاضر والوارد: ${syncedCount} طلاب. الغياب التلقائي لعدم تسليم الاستمارة: ${absentMatchedCount} طلاب.`
    });
  };

  const handleFetchLiveSheet = async (sessionId: string, sheetUrl: string) => {
    if (!sheetUrl) {
      setSyncStatusMsg({ type: 'error', message: 'يرجى حفظ رابط Google Sheet أولاً في إعدادات الجلسة.' });
      return;
    }

    setSyncStatusMsg(null);
    setIsLiveFetching(true);

    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : null;

    if (!spreadsheetId) {
      setSyncStatusMsg({ type: 'error', message: 'الرابط الموفر لا يبدو أنه رابط Google Sheets صالح. يرجى التحقق منه.' });
      setIsLiveFetching(false);
      return;
    }

    // Attempt direct CSV download link (Google sheet must be shared with "anyone with the link")
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    try {
      const response = await fetch(exportCsvUrl);
      if (!response.ok) {
        throw new Error('CORS or permissions error');
      }
      const dataStr = await response.text();
      handlePerformSync(sessionId, dataStr);
    } catch (e) {
      console.warn('Direct fetch failed. This is expected if the browser CORS prevents client requests to external Google Sheets. Initiating fallback display.', e);
      setSyncStatusMsg({
        type: 'error',
        message: 'تعذر الاتصال المباشر بجداول جوجل بسبب قيود حماية المتصفح (CORS) أو لأن الملف خاص. يمكنك إما استخدام أداة "محاكاة المزامنة الذكية المدمجة لقائمة الطلاب" للتجربة الفورية، أو نسخ محتوى جدول جوجل ولصقه كـ CSV أدناه لتفريغه مباشرة!'
      });
    } finally {
      setIsLiveFetching(false);
    }
  };

  const handleTriggerSimulation = (sessionId: string) => {
    const sessionToUpdate = sessions.find((s) => s.id === sessionId);
    if (!sessionToUpdate) return;

    // Build a nice simulated CSV matching some students as Present, one as Late, and others omitted
    const currentEnrolled = students.filter((st) => st.diplomaIds.includes(sessionToUpdate.diplomaId));
    if (currentEnrolled.length === 0) {
      setSyncStatusMsg({ type: 'error', message: 'لا يمكن محاكاة المزامنة بدون وجود طلاب مسجلين بالدبلوم.' });
      return;
    }

    // Build CSV content
    let simulatedCsv = 'اسم الطالب,الحالة,ملاحظة\n';
    currentEnrolled.forEach((student, index) => {
      // Simulate 80% submission: index % 5 !== 0 are present, index % 4 === 0 is late, index % 5 === 0 is absent
      if (index % 5 === 0) {
        // Omitted to simulate "did not submit"
      } else if (index % 4 === 0) {
        simulatedCsv += `"${student.name}","متأخر","تأخر 15 دقيقة بسبب المواصلات"\n`;
      } else {
        simulatedCsv += `"${student.name}","حاضر","تسجيل ذكي للجلسة الصفية"\n`;
      }
    });

    setSyncCsvData(simulatedCsv);
    handlePerformSync(sessionId, simulatedCsv);
    setSyncStatusMsg({
      type: 'success',
      message: 'تم توليد وتطبيق بيانات محاكاة ذكية متكاملة بمطابقة حيوية للطلاب المسجلين بنجاح! تغيب المتخلفين تلقائياً.'
    });
  };

  // Toggle individual student attendance inside a session
  const handleToggleAttendance = (sessionId: string, studentId: string, status: AttendanceStatus) => {
    const sessionToUpdate = sessions.find((s) => s.id === sessionId);
    if (!sessionToUpdate) return;

    const currentRecord = sessionToUpdate.attendance[studentId] || {
      studentId,
      status: 'Unmarked',
      note: ''
    };

    const updatedSession: Session = {
      ...sessionToUpdate,
      attendance: {
        ...sessionToUpdate.attendance,
        [studentId]: {
          ...currentRecord,
          status
        }
      }
    };

    onSaveSession(updatedSession);
  };

  // Change individual student attendance note
  const handleUpdateStudentNote = (sessionId: string, studentId: string, noteText: string) => {
    const sessionToUpdate = sessions.find((s) => s.id === sessionId);
    if (!sessionToUpdate) return;

    const currentRecord = sessionToUpdate.attendance[studentId] || {
      studentId,
      status: 'Unmarked',
      note: ''
    };

    const updatedSession: Session = {
      ...sessionToUpdate,
      attendance: {
        ...sessionToUpdate.attendance,
        [studentId]: {
          ...currentRecord,
          note: noteText
        }
      }
    };

    onSaveSession(updatedSession);
  };

  const handleQuickAttendanceWhatsApp = (st: Student, status: AttendanceStatus, sessionDate: string, diplomaId: string) => {
    const diploma = diplomas.find(d => d.id === diplomaId);
    if (!diploma) return;

    let msg = '';
    if (status === 'Absent') {
      msg = `السلام عليكم يا ${st.name}، نود إحاطتك بغيابك عن المحاضرة التعليمية لدبلوم ${diploma.name} بتاريخ ${sessionDate}. نأمل منك المواظبة ومراجعة التسجيل لتعويض ما فاتك. بالتوفيق!`;
    } else if (status === 'Excused') {
      msg = `السلام عليكم يا ${st.name}، تم تسجيل غيابك بعذر عن المحاضرة لدبلوم ${diploma.name} بتاريخ ${sessionDate}. نتمنى لك السلامة والتوفيق!`;
    } else {
      msg = `السلام عليكم يا ${st.name}، نشكرك على مواظبتك وحضورك للمحاضرة لدبلوم ${diploma.name} بتاريخ ${sessionDate}. بالتوفيق والنجاح الدائم!`;
    }
    
    let cleanedPhone = st.phone.replace(/[\s\+\-]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '966' + cleanedPhone.substring(1);
    }
    const apiLink = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(msg)}`;
    window.open(apiLink, '_blank');
  };

  const handleDelete = (id: string, label: string) => {
    if (window.confirm(`هل أنت متأكد من حذف جلسة "${label}" نهائياً من سجلات الشؤون الأكاديمية؟ لا يمكن الاسترجاع.`)) {
      onDeleteSession(id);
      if (expandedSessionId === id) setExpandedSessionId(null);
    }
  };

  return (
    <div className="space-y-4 text-right" id="session-manager-module" dir="rtl">
      
      {/* Top Banner & Diploma Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#3B82F6]" />
            جدولة المحاضرات والتحضير الصفي اليومي
          </h3>
          <p className="text-xs text-zinc-400">إنشاء الجلسات وتفويض الأساتذة والتحضير الحاضر والمرئي للطلاب المسجلين بالبرنامج</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-sans select-none">اختر الدبلوم المستهدف:</span>
          <select
            value={selectedDiplomaId}
            onChange={(e) => {
              setSelectedDiplomaId(e.target.value);
              setShowAddForm(false);
              setEditingSessionId(null);
            }}
            className="px-3 py-1.5 bg-[#0A0A0A] text-xs text-white border border-[#262626] rounded outline-hidden cursor-pointer"
          >
            {diplomas.map((dip) => (
              <option key={dip.id} value={dip.id}>
                {dip.name}
              </option>
            ))}
          </select>

          {selectedDiplomaId && (
            <button
              onClick={handleStartAdd}
              className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة جلسة جديدة
            </button>
          )}
        </div>
      </div>

      {formError && (
        <div className="p-3 bg-red-95d/20 border border-red-500/20 text-red-200 text-xs rounded flex items-center gap-1.5 leading-normal">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Form Overlay/Slide to create or Edit Session */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-[#262626] rounded-xl space-y-4"
            onSubmit={handleSave}
            id="form-session-entry"
          >
            <div className="text-xs font-bold text-[#3B82F6] pb-2 border-b border-[#262626] uppercase">
              {editingSessionId ? 'تعديل بيانات الجلسة التدريسية' : 'تأسيس وجدولة جلسة جديدة'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">موضوع المحاضرة / عنوان الجلسة</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: مقدمة في بناء الدوال وتتبع الذاكرة"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">الأستاذ / المحاضر المسؤول</label>
                <input
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="مثال: د. عبد الله الخالدي"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">تاريخ الإلقاء</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">وقت البدء</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">وقت الانتهاء المتوقع</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Google Forms / Sheets URLs Integration */}
            <div className="p-4 bg-zinc-950/40 border border-[#262626] rounded-xl space-y-3">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <Check className="w-4 h-4 text-emerald-400" />
                تكامل الحضور التلقائي مع نماذج وجداول جوجل (Google Forms & Sheets Integration)
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">رابط نموذج الحضور (Google Form URL)</label>
                  <input
                    type="url"
                    value={googleFormUrl}
                    onChange={(e) => setGoogleFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-left font-sans"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">رابط جدول الردود المرفق (Google Sheet URL)</label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-left font-sans"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">أجندة المحاضرة وملاحظات المنهج</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب تفاصيل المادة التدريبية، التكاليف المطلوبة، أو تعليمات الشرح..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-none text-right placeholder-zinc-850"
              />
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {editingSessionId ? 'حفظ تعديلات الجلسة' : 'اعتماد المحاضرة وجدولتها'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingSessionId(null);
                }}
                className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 rounded text-xs cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Sessions Feed grid */}
      <div className="space-y-4" id="sessions-items-list">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center bg-[#0F0F0F] border border-[#262626] border-dashed rounded font-sans">
            <span className="text-zinc-500 text-xs text-center block leading-relaxed">
              لا توجد جلسات مجدولة مسبقاً لهذا الدبلوم. انقر على "إضافة جلسة جديدة" في الأعلى للبدء.
            </span>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;

            // Compute counts
            const attendanceRecords = Object.values(session.attendance);
            const present = attendanceRecords.filter((r) => r.status === 'Present').length;
            const absent = attendanceRecords.filter((r) => r.status === 'Absent').length;
            const unmarked = enrolledStudents.length - (present + absent);

            return (
              <div
                key={session.id}
                className={`bg-[#0F0F0F]/60 border rounded-xl overflow-hidden transition-all ${
                  isExpanded ? 'border-[#3B82F6] bg-[#0F0F0F]' : 'border-[#262626] hover:border-zinc-700'
                }`}
              >
                {/* Session Summary Card */}
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                  className="p-5 cursor-pointer select-none flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-white tracking-wide">{session.title}</h4>
                      <span className="text-[10px] bg-[#171717] border border-[#262626] text-zinc-400 px-2 py-0.5 rounded font-mono">
                        المعلم الحاضن: {session.instructor}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 font-sans">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
                        {session.date} | {session.startTime} - {session.endTime}
                      </span>
                      {session.notes && (
                        <span className="text-zinc-500 truncate max-w-sm">({session.notes})</span>
                      )}
                    </div>
                  </div>

                  {/* Presence quick stats indicator badges */}
                  <div className="flex items-center gap-2 bg-[#101010] p-1.5 rounded-lg border border-[#232323] overflow-hidden shrink-0">
                    <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-950/20 rounded">
                      حاضر: {present}
                    </span>
                    <span className="text-[10px] font-bold text-rose-400 px-2 py-0.5 bg-rose-950/20 rounded">
                      غائب: {absent}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 px-2 py-0.5 bg-zinc-900 rounded">
                      معلّق: {unmarked}
                    </span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                  </div>
                </div>

                {/* Session Actions line */}
                <div className="bg-[#0A0A0A]/60 px-5 py-2 border-t border-[#1F1F1F] flex items-center justify-between text-xs text-zinc-500 select-none">
                  <span>انقر لتوسيع ورقة التحضير وتعديل حضور الطلاب</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(session);
                      }}
                      className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                      title="تعديل تفاصيل الجلسة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session.id, session.title);
                      }}
                      className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer p-1"
                      title="مسح الجلسة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub-Panel: Detailed Attendance List (Expands seamlessly) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#0A0A0A]/30 border-t border-[#232323]"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#222] pb-3.5">
                          <div className="text-[10px] font-bold tracking-widest text-[#3B82F6] uppercase pr-2 font-sans select-none">
                            بيان رصد التحضير في المحاضرة:
                          </div>

                          {/* Quick links & Sync Trigger buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {session.googleFormUrl && (
                              <a
                                href={session.googleFormUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:border-[#3B82F6] text-zinc-300 hover:text-white rounded text-[10px] items-center gap-1 inline-flex transition-colors font-sans"
                              >
                                <Link2 className="w-3 h-3 text-[#3B82F6]" />
                                رابط نموذج الحضور (Form)
                              </a>
                            )}

                            {session.googleSheetUrl && (
                              <a
                                href={session.googleSheetUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-zinc-900 border border-zinc-850 hover:border-emerald-600 text-zinc-300 hover:text-white rounded text-[10px] items-center gap-1 inline-flex transition-colors font-sans"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-emerald-500" />
                                جدول ردود الحضور (Sheet)
                              </a>
                            )}

                            {session.googleSheetUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSyncingSessionId(syncingSessionId === session.id ? null : session.id);
                                  setSyncStatusMsg(null);
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold items-center gap-1 inline-flex transition-all cursor-pointer shadow-xs"
                                id={`sync-btn-${session.id}`}
                              >
                                <RefreshCw className={`w-3 h-3 ${isLiveFetching ? 'animate-spin' : ''}`} />
                                مزامنة الحضور من Google Sheets
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setShowAbsenteeModal(session.id);
                                setFollowedUpMap({});
                              }}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold items-center gap-1 inline-flex transition-all cursor-pointer shadow-xs"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              متابعة الغائبين (واتساب)
                            </button>
                          </div>
                        </div>

                        {/* Interactive Sync Module Panel */}
                        {syncingSessionId === session.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0c0c0c] border border-emerald-900/30 p-4 rounded-lg space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                لوحة التحكم بربط ومزامنة البيانات (Google Sheet Sync Panel)
                              </span>
                              <button
                                type="button"
                                onClick={() => setSyncingSessionId(null)}
                                className="text-zinc-500 hover:text-zinc-200 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Option 1: Direct Fetch */}
                              <div className="p-3 bg-[#111] border border-zinc-900 rounded space-y-2 flex flex-col justify-between">
                                <span className="font-bold text-white block">مزامنة تلقائية مباشرة</span>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                                  يقوم النظام بتحليل رابط جدول جوجل، واستدعاء أحدث الردود الصفية مباشرة ورصد حضور طلاب الدبلوم.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleFetchLiveSheet(session.id, session.googleSheetUrl || '')}
                                  disabled={isLiveFetching}
                                  className="w-full py-1.5 bg-emerald-750 hover:bg-emerald-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                                >
                                  {isLiveFetching ? 'جاري جلب البيانات...' : 'بدء الاتصال وجلب الحضور'}
                                </button>
                              </div>

                              {/* Option 2: Copy Paste CSV */}
                              <div className="p-3 bg-[#111] border border-zinc-900 rounded space-y-2 flex flex-col justify-between">
                                <span className="font-bold text-white block">تفريغ يدوي بالنسخ واللصق</span>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                                  بديل مرن في حال كانت جداولك خاصة. انسخ أعمدة الحضور من Excel/Sheets، والصق الأسطر هنا للرصد الفوري!
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const paste = prompt('انقر الصق أسطر الحضور المنسوخة من جدول جوجل (الاسم الأول واللقب، حالة الحضور):');
                                    if (paste) {
                                      handlePerformSync(session.id, paste);
                                    }
                                  }}
                                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold rounded cursor-pointer transition-colors"
                                >
                                  لصق أسطر الردود (CSV)
                                </button>
                              </div>

                              {/* Option 3: Mock Simulator */}
                              <div className="p-3 bg-[#111] border border-zinc-900 rounded space-y-2 flex flex-col justify-between">
                                <span className="font-bold text-white block text-amber-500">أداة محاكاة الحضور الذكي</span>
                                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                                  لا تمتلك جدول جوجل متصل حالاً؟ جرب المحاكاة لاختبار المطابقة الحية، وتطبيق غياب وحضور تلقائي لجميع الطلاب المسجلين!
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerSimulation(session.id)}
                                  className="w-full py-1.5 bg-amber-950/40 hover:bg-amber-900/40 text-amber-200 text-[10px] font-bold rounded border border-amber-900/30 cursor-pointer transition-colors"
                                >
                                  توليد وتجربة محاكاة الرصد الذكية
                                </button>
                              </div>
                            </div>

                            {syncStatusMsg && (
                              <div
                                className={`p-2.5 rounded text-[11px] leading-relaxed ${
                                  syncStatusMsg.type === 'success'
                                    ? 'bg-emerald-950/20 border border-emerald-500/30 text-emerald-200'
                                    : 'bg-rose-950/20 border border-rose-500/20 text-rose-200'
                                }`}
                              >
                                {syncStatusMsg.message}
                              </div>
                            )}
                          </motion.div>
                        )}

                        {enrolledStudents.length === 0 ? (
                          <div className="p-4 text-center text-xs text-zinc-500 font-sans">
                            لم يسجل أي طلاب في هذا الدبلوم بعد لتفويض التحضير.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {enrolledStudents.map((st) => {
                              const record: AttendanceRecord = session.attendance[st.id] || {
                                studentId: st.id,
                                status: 'Unmarked',
                                note: ''
                              };

                              return (
                                <div
                                  key={st.id}
                                  className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                                    record.status === 'Absent'
                                      ? 'bg-rose-950/10 border-rose-500/20'
                                      : record.status === 'Present'
                                      ? 'bg-emerald-950/10 border-emerald-500/10'
                                      : 'bg-[#121212] border-[#222]'
                                  }`}
                                >
                                  {/* Student Name */}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-zinc-150 block">{st.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAttendanceWhatsApp(st, record.status, session.date, session.diplomaId)}
                                        className="p-1 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer select-none"
                                        title="تواصل سريع بخصوص المحاضرة"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 block font-sans">الواتساب: {st.phone}</span>
                                  </div>

                                  {/* Right side controls */}
                                  <div className="flex flex-col sm:flex-row items-center gap-2">
                                    {/* Note input */}
                                    <input
                                      type="text"
                                      value={record.note}
                                      onChange={(e) => handleUpdateStudentNote(session.id, st.id, e.target.value)}
                                      placeholder="ملاحظات الحضور..."
                                      className="w-full sm:w-44 px-2.5 py-1 bg-[#0A0A0A] border border-[#232323] text-xs text-zinc-300 rounded focus:border-[#3B82F6] outline-hidden placeholder-zinc-850 text-right placeholder:text-zinc-800"
                                    />

                                    {/* Attendance status toggler */}
                                    <div className="flex items-center bg-[#070707] p-0.5 rounded border border-[#232323] w-full sm:w-auto overflow-hidden">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAttendance(session.id, st.id, 'Present')}
                                        className={`flex-1 sm:flex-initial px-3 py-1 rounded-sm text-[10px] font-bold transition-all cursor-pointer ${
                                          record.status === 'Present'
                                            ? 'bg-[#065F46] text-[#34D399]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        حاضر
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAttendance(session.id, st.id, 'Absent')}
                                        className={`flex-1 sm:flex-initial px-3 py-1 rounded-sm text-[10px] font-bold transition-all cursor-pointer ${
                                          record.status === 'Absent'
                                            ? 'bg-[#7F1D1D] text-[#F87171]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        غائب
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleAttendance(session.id, st.id, 'Unmarked')}
                                        className={`px-2 py-1 rounded-sm text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer`}
                                        title="إلغاء التحديد"
                                      >
                                        معلّق
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* One-Click Absentee Follow-up Modal */}
      {showAbsenteeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-right" dir="rtl">
            {/* Header */}
            <div className="p-4 border-b border-[#262626] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" />
                متابعة الطلاب الغائبين جماعياً - واتساب
              </h3>
              <button
                onClick={() => setShowAbsenteeModal(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Template customization */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-400">تعديل قالب الرسالة الموحدة:</label>
                <textarea
                  value={customMessageTemplate}
                  onChange={(e) => setCustomMessageTemplate(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-none font-sans"
                  placeholder="اكتب قالب الرسالة هنا..."
                />
                <div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>الرموز المتاحة:</span>
                  <span>`[اسم_الطالب]` اسم الطالب</span>
                  <span>`[ولي_الأمر]` اسم ولي الأمر</span>
                  <span>`[الدبلوم]` اسم الدبلومة</span>
                  <span>`[التاريخ]` تاريخ المحاضرة</span>
                </div>
              </div>

              {/* Absentees List */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-zinc-300">الطلاب الغائبون في هذه المحاضرة:</span>
                {(() => {
                  const currentSession = sessions.find(s => s.id === showAbsenteeModal);
                  if (!currentSession) return null;
                  const diploma = diplomas.find(d => d.id === currentSession.diplomaId);
                  const absentees = enrolledStudents.filter(st => {
                    const rec = currentSession.attendance[st.id];
                    return rec && rec.status === 'Absent';
                  });

                  if (absentees.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-zinc-500 bg-[#0A0A0A] border border-[#222] rounded">
                        لا يوجد طلاب مسجلين كغائبين في هذه الجلسة.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {absentees.map(st => {
                        const isSent = followedUpMap[st.id];
                        
                        // Construct customized message
                        let msg = customMessageTemplate
                          .replace(/\[اسم_الطالب\]/g, st.name)
                          .replace(/\[ولي_الأمر\]/g, st.name)
                          .replace(/\[الدبلوم\]/g, diploma?.name || '')
                          .replace(/\[التاريخ\]/g, currentSession.date);

                        let cleanedPhone = st.phone.replace(/[\s\+\-]/g, '');
                        if (cleanedPhone.startsWith('0')) {
                          cleanedPhone = '966' + cleanedPhone.substring(1);
                        }
                        const apiLink = `https://api.whatsapp.com/send?phone=${cleanedPhone}&text=${encodeURIComponent(msg)}`;

                        return (
                          <div key={st.id} className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                            isSent ? 'bg-emerald-955/10 border-emerald-500/20' : 'bg-[#0A0A0A] border-[#222]'
                          }`}>
                            <div className="text-right">
                              <span className="text-xs font-bold text-zinc-100 block">{st.name}</span>
                              <span className="text-[10px] text-zinc-500 block font-sans">الواتساب: {st.phone}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isSent && (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  تمت المتابعة
                                </span>
                              )}
                              <a
                                href={apiLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => {
                                  setFollowedUpMap(prev => ({ ...prev, [st.id]: true }));
                                }}
                                className={`px-3 py-1.5 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                                  isSent 
                                    ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-400' 
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                }`}
                              >
                                <MessageCircle className="w-3 h-3 text-white" />
                                إرسال واتساب
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#262626] bg-[#0A0A0A] flex justify-end">
              <button
                onClick={() => setShowAbsenteeModal(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
