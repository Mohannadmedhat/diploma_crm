import React, { useState, useMemo } from 'react';
import { Student, Session, Diploma, MessageTemplate } from '../types';
import { parseTemplate, formatWhatsAppLink } from '../utils';
import { calculateStudentDiplomaAttendance } from '../services/business';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  Send,
  User,
  BookOpen,
  Calendar,
  ExternalLink,
  HelpCircle,
  FileText,
  CheckCircle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppAutomationProps {
  students: Student[];
  sessions: Session[];
  diplomas: Diploma[];
  templates: MessageTemplate[];
}

export default function WhatsAppAutomation({
  students,
  sessions,
  diplomas,
  templates
}: WhatsAppAutomationProps) {
  const [activeSubTab, setActiveSubTab] = useState<'absence' | 'low-attendance' | 'upcoming'>('absence');

  // Search filter inside search boxes
  const [searchQuery, setSearchQuery] = useState('');

  // 1. ABSENCE REMINDERS STATES
  const [selectedAbsenceSessionId, setSelectedAbsenceSessionId] = useState('');
  const [selectedAbsenceStudentId, setSelectedAbsenceStudentId] = useState('');
  const [absenceTemplateId, setAbsenceTemplateId] = useState(templates[0]?.id || '');
  const [absenceCustomText, setAbsenceCustomText] = useState('');

  // 2. LOW ATTENDANCE STATES
  const [selectedLowStudId, setSelectedLowStudId] = useState('');
  const [selectedLowDipId, setSelectedLowDipId] = useState('');
  const [lowTemplateId, setLowTemplateId] = useState(
    templates.find((t) => t.id === 'ar-risk-alert')?.id || templates[2]?.id || ''
  );
  const [lowCustomText, setLowCustomText] = useState('');

  // 3. UPCOMING SESSION STATES
  const [selectedUpcomingSessionId, setSelectedUpcomingSessionId] = useState('');
  const [selectedUpcomingStudentId, setSelectedUpcomingStudentId] = useState('');
  const [upcomingCustomText, setUpcomingCustomText] = useState('');

  // Past Sessions with registered Absences
  const pastSessionsWithAbsence = useMemo(() => {
    return sessions.filter((session) => {
      return Object.values(session.attendance).some((record) => record.status === 'Absent');
    });
  }, [sessions]);

  // Set initial absence session on load
  React.useEffect(() => {
    if (pastSessionsWithAbsence.length > 0 && !selectedAbsenceSessionId) {
      setSelectedAbsenceSessionId(pastSessionsWithAbsence[0].id);
    }
  }, [pastSessionsWithAbsence, selectedAbsenceSessionId]);

  // Students who were absent in selected session
  const absentStudentsInSelectedSession = useMemo(() => {
    if (!selectedAbsenceSessionId) return [];
    const target = sessions.find((s) => s.id === selectedAbsenceSessionId);
    if (!target) return [];

    return students.filter((st) => {
      const record = target.attendance[st.id];
      return record && record.status === 'Absent';
    });
  }, [selectedAbsenceSessionId, sessions, students]);

  // Reset student selection when session changes
  React.useEffect(() => {
    if (absentStudentsInSelectedSession.length > 0) {
      setSelectedAbsenceStudentId(absentStudentsInSelectedSession[0].id);
    } else {
      setSelectedAbsenceStudentId('');
    }
  }, [absentStudentsInSelectedSession]);

  // Compile parsed text for Absence Reminders
  const computedAbsenceMessage = useMemo(() => {
    if (!selectedAbsenceSessionId || !selectedAbsenceStudentId) return '';
    const session = sessions.find((s) => s.id === selectedAbsenceSessionId);
    const student = students.find((st) => st.id === selectedAbsenceStudentId);
    const tpl = templates.find((t) => t.id === absenceTemplateId) || templates[0];
    const diploma = diplomas.find((d) => d.id === session?.diplomaId);

    if (!session || !student || !tpl) return '';

    return parseTemplate(tpl.text, {
      studentName: student.name,
      parentName: student.parentName,
      course: diploma?.name || 'برنامجنا الأكاديمي',
      date: session.date
    });
  }, [selectedAbsenceSessionId, selectedAbsenceStudentId, absenceTemplateId, sessions, students, templates, diplomas]);

  React.useEffect(() => {
    if (computedAbsenceMessage) {
      setAbsenceCustomText(computedAbsenceMessage);
    }
  }, [computedAbsenceMessage]);

  // 2. LOW ATTENDANCE RESOLVER
  // Students at risk (attendance < 75%)
  const atRiskStudentsList = useMemo(() => {
    const list: { student: Student; diploma: Diploma; rate: number }[] = [];

    students.forEach((st) => {
      st.diplomaIds.forEach((dipId) => {
        const diploma = diplomas.find((d) => d.id === dipId);
        if (diploma) {
          const metrics = calculateStudentDiplomaAttendance(st, diploma, sessions);
          if (metrics.isAtRisk && metrics.markedSessions > 0) {
            list.push({
              student: st,
              diploma,
              rate: metrics.rate
            });
          }
        }
      });
    });

    return list;
  }, [students, diplomas, sessions]);

  // Set initial selections for risk warning
  React.useEffect(() => {
    if (atRiskStudentsList.length > 0 && !selectedLowStudId) {
      setSelectedLowStudId(atRiskStudentsList[0].student.id);
      setSelectedLowDipId(atRiskStudentsList[0].diploma.id);
    }
  }, [atRiskStudentsList, selectedLowStudId]);

  // Compile low attendance warn message
  const computedLowMessage = useMemo(() => {
    if (!selectedLowStudId || !selectedLowDipId) return '';
    const student = students.find((st) => st.id === selectedLowStudId);
    const diploma = diplomas.find((d) => d.id === selectedLowDipId);
    const tpl = templates.find((t) => t.id === lowTemplateId) || templates[3] || templates[2];

    if (!student || !diploma || !tpl) return '';

    return parseTemplate(tpl.text, {
      studentName: student.name,
      parentName: student.parentName,
      course: diploma.name,
      date: new Date().toISOString().split('T')[0]
    });
  }, [selectedLowStudId, selectedLowDipId, lowTemplateId, students, diplomas, templates]);

  React.useEffect(() => {
    if (computedLowMessage) {
      setLowCustomText(computedLowMessage);
    }
  }, [computedLowMessage]);

  // 3. UPCOMING SESSIONS REMINDER
  // Sessions with dates >= today (or upcoming list)
  const upcomingSessionsList = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions.filter((s) => s.date >= today);
  }, [sessions]);

  React.useEffect(() => {
    if (upcomingSessionsList.length > 0 && !selectedUpcomingSessionId) {
      setSelectedUpcomingSessionId(upcomingSessionsList[0].id);
    }
  }, [upcomingSessionsList, selectedUpcomingSessionId]);

  // Selected upcoming session students
  const enrolledStudentsInUpcoming = useMemo(() => {
    if (!selectedUpcomingSessionId) return [];
    const ses = sessions.find((s) => s.id === selectedUpcomingSessionId);
    if (!ses) return [];

    return students.filter((st) => st.diplomaIds.includes(ses.diplomaId));
  }, [selectedUpcomingSessionId, sessions, students]);

  React.useEffect(() => {
    if (enrolledStudentsInUpcoming.length > 0) {
      setSelectedUpcomingStudentId(enrolledStudentsInUpcoming[0].id);
    } else {
      setSelectedUpcomingStudentId('');
    }
  }, [enrolledStudentsInUpcoming]);

  // Compile Reminder text
  const computedUpcomingMessage = useMemo(() => {
    if (!selectedUpcomingSessionId || !selectedUpcomingStudentId) return '';
    const session = sessions.find((s) => s.id === selectedUpcomingSessionId);
    const student = students.find((st) => st.id === selectedUpcomingStudentId);
    const diploma = diplomas.find((d) => d.id === session?.diplomaId);

    if (!session || !student || !diploma) return '';

    return `السلام عليكم سعادة ${student.parentName}، نود تذكيركم بموعد المحاضرة القادمة المسندة للطالب ${student.name} في مسار: ${diploma.name}.
الموضوع: "${session.title}"
المحاضر: ${session.instructor}
التاريخ: ${session.date}
الوقت: من الساعة ${session.startTime} حتى الساعة ${session.endTime}
شاكرين ومقدرين اهتمامكم بحضور الطالب والمواظبة على الساعات التدريسية الأكاديمية!`;
  }, [selectedUpcomingSessionId, selectedUpcomingStudentId, sessions, students, diplomas]);

  React.useEffect(() => {
    if (computedUpcomingMessage) {
      setUpcomingCustomText(computedUpcomingMessage);
    }
  }, [computedUpcomingMessage]);

  return (
    <div className="space-y-4 text-right" id="whatsapp-automation-module" dir="rtl">
      
      {/* Module Title Banner */}
      <div className="border-b border-[#262626] pb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          منظومة الأتمتة المتقدمة ومراسلات واتساب الأكاديمية (WhatsApp Automation Tools)
        </h3>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          صياغة وإطلاق التنبيهات وإشعارات حضور ومواظبة الطلاب لغرف الواتساب الخاصة بأولياء الأمور
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1F1F1F] text-xs font-semibold gap-2 select-none overflow-x-auto pb-px">
        <button
          onClick={() => {
            setActiveSubTab('absence');
            setSearchQuery('');
          }}
          className={`px-4 py-2.5 cursor-pointer border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'absence'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-rose-500" />
          تذكيرات غياب الجلسات الفائتة
        </button>

        <button
          onClick={() => {
            setActiveSubTab('low-attendance');
            setSearchQuery('');
          }}
          className={`px-4 py-2.5 cursor-pointer border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'low-attendance'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          تنبيهات تدني نسبة الحضور (دون 75%)
        </button>

        <button
          onClick={() => {
            setActiveSubTab('upcoming');
            setSearchQuery('');
          }}
          className={`px-4 py-2.5 cursor-pointer border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'upcoming'
              ? 'border-emerald-500 text-emerald-400 bg-emerald-950/5'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          إشعارات وتذكيرات اللقاءات القادمة
        </button>
      </div>

      {/* Main Container Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1.5Packed font-sans">
        
        {/* Left Control Panel Form (Width: 5 Cols) */}
        <div className="lg:col-span-5 bg-[#0F0F0F] border border-[#232323] rounded-xl p-5 space-y-4 h-fit">
          
          {/* TAB 1: ABSENCE REMINDERS CONTROL */}
          {activeSubTab === 'absence' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  رصد غيابات المحاضرات المسجلة
                </h4>
                <p className="text-[11px] text-zinc-400 font-sans">
                  فرز وتتبع الطلاب الذين غابوا عن أي محاضرة وإشعار ذويهم فوراً.
                </p>
              </div>

              {/* Select Session */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">اختر الجلسة المستهدفة بالغياب:</label>
                <select
                  value={selectedAbsenceSessionId}
                  onChange={(e) => setSelectedAbsenceSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                >
                  {pastSessionsWithAbsence.length === 0 ? (
                    <option value="">-- لا توجد جلسات بها غيابات مرصودة --</option>
                  ) : (
                    pastSessionsWithAbsence.map((ses) => (
                      <option key={ses.id} value={ses.id}>
                        {ses.title} ({ses.date})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Select Student of that session */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">اختر الطالب المتغيب عن هذا اللقاء:</label>
                <select
                  value={selectedAbsenceStudentId}
                  onChange={(e) => setSelectedAbsenceStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                  disabled={absentStudentsInSelectedSession.length === 0}
                >
                  {absentStudentsInSelectedSession.length === 0 ? (
                    <option value="">-- لا يوجد طلاب متغيبين في هذه الجلسة --</option>
                  ) : (
                    absentStudentsInSelectedSession.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (ولي الأمر: {st.parentName})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Choose message template */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">تحديد قالب الخطاب الودي لـ WhatsApp:</label>
                <select
                  value={absenceTemplateId}
                  onChange={(e) => setAbsenceTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                >
                  {templates.slice(0, 3).map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 2: LOW ATTENDANCE CONTROL */}
          {activeSubTab === 'low-attendance' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  رصد الطلاب مهددي المسار (دون 75%)
                </h4>
                <p className="text-[11px] text-zinc-400 font-sans">
                  الطلاب الذين تقل نسبة حضورهم الفعلي عن خط الأمان المعتمد.
                </p>
              </div>

              {/* List of at risk students */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">اختر الطالب في منطقة الخطر:</label>
                <select
                  value={`${selectedLowStudId}|${selectedLowDipId}`}
                  onChange={(e) => {
                    const [stId, dipId] = e.target.value.split('|');
                    setSelectedLowStudId(stId);
                    setSelectedLowDipId(dipId);
                  }}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                >
                  {atRiskStudentsList.length === 0 ? (
                    <option value="">-- لا يوجد طلاب مؤهلين للمخاطر حالياً (الكل آمن 👍) --</option>
                  ) : (
                    atRiskStudentsList.map((item) => (
                      <option key={`${item.student.id}-${item.diploma.id}`} value={`${item.student.id}|${item.diploma.id}`}>
                        {item.student.name} ({item.diploma.name}) - نسبة: {item.rate}%
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Filter warning template */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">قالب الإنذار الأكاديمي الحرج مسبقاً:</label>
                <select
                  value={lowTemplateId}
                  onChange={(e) => setLowTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                >
                  {templates.slice(2, 5).map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: UPCOMING SESSIONS REMINDERS */}
          {activeSubTab === 'upcoming' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  إرسال تذكيرات الجلسات المجدولة القادمة
                </h4>
                <p className="text-[11px] text-zinc-400 font-sans">
                  توجيه تذكير ذكي وتفصيلي بالموعد، وموضوع الإلقاء، والمحاضر المسؤول.
                </p>
              </div>

              {/* Upcoming sessions */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">اختر الجلسة القادمة:</label>
                <select
                  value={selectedUpcomingSessionId}
                  onChange={(e) => setSelectedUpcomingSessionId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                >
                  {upcomingSessionsList.length === 0 ? (
                    <option value="">-- لا توجد جلسات مستقبلية مضافة حالياً --</option>
                  ) : (
                    upcomingSessionsList.map((ses) => (
                      <option key={ses.id} value={ses.id}>
                        {ses.title} ({ses.date})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Student picker enrolled in that tomorrow session */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1.5">اختر الطالب المستحق للإبلاغ:</label>
                <select
                  value={selectedUpcomingStudentId}
                  onChange={(e) => setSelectedUpcomingStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs text-zinc-200 rounded outline-hidden cursor-pointer"
                  disabled={enrolledStudentsInUpcoming.length === 0}
                >
                  {enrolledStudentsInUpcoming.length === 0 ? (
                    <option value="">-- لا يوجد طلاب مسجلون بالبرنامج لموازاة هذا اللقاء --</option>
                  ) : (
                    enrolledStudentsInUpcoming.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (رقم الهاتف: {st.phone})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Output Console (Width: 7 Cols) */}
        <div className="lg:col-span-7 bg-[#0F0F0F] border border-[#232323] rounded-xl p-5 flex flex-col justify-between space-y-4">
          
          <div className="space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block font-mono bg-emerald-950/25 border border-emerald-900/30 px-3 py-1.5 rounded h-fit">
                معاينة الخطاب التدريجي التلقائي وتفريغ المتغيرات:
              </span>

              {/* Preview Content Area */}
              <div className="space-y-3">
                <textarea
                  value={
                    activeSubTab === 'absence'
                      ? absenceCustomText
                      : activeSubTab === 'low-attendance'
                      ? lowCustomText
                      : upcomingCustomText
                  }
                  onChange={(e) => {
                    if (activeSubTab === 'absence') setAbsenceCustomText(e.target.value);
                    else if (activeSubTab === 'low-attendance') setLowCustomText(e.target.value);
                    else setUpcomingCustomText(e.target.value);
                  }}
                  rows={8}
                  className="w-full p-4 bg-[#0A0A0A] border border-[#1f1f1f] text-xs font-sans text-zinc-100 rounded-lg outline-hidden focus:border-emerald-500 leading-relaxed text-right resize-none placeholder-zinc-850"
                  placeholder="اختر طالباً وجلسة في القائمة الجانبية لتفريغ وإنشاء المحتوى تلقائياً هنا في لوحة المعاينة..."
                />
              </div>
            </div>

            {/* Recipient Details & Dispatch Actions */}
            <div className="border-t border-[#1F1F1F] pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
              
              <div className="text-[11px] text-zinc-400 space-y-0.5 font-sans">
                {activeSubTab === 'absence' && selectedAbsenceStudentId && (
                  <>
                    <span className="block">المستفيد: <strong className="text-zinc-200">{students.find(s => s.id === selectedAbsenceStudentId)?.name}</strong></span>
                    <span className="block">هاتف الواتساب: <strong className="text-zinc-300 font-mono">{students.find(s => s.id === selectedAbsenceStudentId)?.phone}</strong></span>
                  </>
                )}

                {activeSubTab === 'low-attendance' && selectedLowStudId && (
                  <>
                    <span className="block">المستفيد: <strong className="text-zinc-200">{students.find(s => s.id === selectedLowStudId)?.name}</strong></span>
                    <span className="block">هاتف الواتساب: <strong className="text-zinc-300 font-mono">{students.find(s => s.id === selectedLowStudId)?.phone}</strong></span>
                  </>
                )}

                {activeSubTab === 'upcoming' && selectedUpcomingStudentId && (
                  <>
                    <span className="block">المستفيد: <strong className="text-zinc-200">{students.find(s => s.id === selectedUpcomingStudentId)?.name}</strong></span>
                    <span className="block">هاتف الواتساب: <strong className="text-zinc-300 font-mono">{students.find(s => s.id === selectedUpcomingStudentId)?.phone}</strong></span>
                  </>
                )}
              </div>

              {/* Launcher anchor */}
              <div>
                {((activeSubTab === 'absence' && selectedAbsenceStudentId) ||
                  (activeSubTab === 'low-attendance' && selectedLowStudId) ||
                  (activeSubTab === 'upcoming' && selectedUpcomingStudentId)) ? (
                    <a
                      href={formatWhatsAppLink(
                        activeSubTab === 'absence'
                          ? students.find(s => s.id === selectedAbsenceStudentId)?.phone || ''
                          : activeSubTab === 'low-attendance'
                          ? students.find(s => s.id === selectedLowStudId)?.phone || ''
                          : students.find(s => s.id === selectedUpcomingStudentId)?.phone || '',
                        activeSubTab === 'absence'
                          ? absenceCustomText
                          : activeSubTab === 'low-attendance'
                          ? lowCustomText
                          : upcomingCustomText
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:text-white text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shrink-0 shadow-lg active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      إرسال وتوجيه عبر WhatsApp Web/App
                      <ExternalLink className="w-3 h-3 text-emerald-250" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-2 bg-zinc-800 text-zinc-500 text-xs font-bold rounded-lg cursor-not-allowed"
                    >
                      الرجاء ملء المتغيرات للتصدير
                    </button>
                  )}
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
