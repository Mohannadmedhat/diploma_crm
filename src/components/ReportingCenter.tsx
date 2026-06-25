import React, { useState, useMemo } from 'react';
import { Student, Diploma, Session, Task } from '../types';
import {
  calculateStudentDiplomaAttendance,
  calculateDiplomaSummary,
  generateArabicCSV
} from '../services/business';
import {
  FileText,
  Download,
  Printer,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  Award,
  Filter,
  BarChart4,
  AlertTriangle,
  Copy,
  ClipboardCheck,
  TrendingDown,
  CheckSquare
} from 'lucide-react';

interface ReportingCenterProps {
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  tasks?: Task[];
  initialDiplomaId?: string;
}

type ReportTab = 'attendance' | 'eligibility' | 'summary' | 'weekly';

export default function ReportingCenter({ students, diplomas, sessions, tasks = [], initialDiplomaId }: ReportingCenterProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [selectedDiplomaId, setSelectedDiplomaId] = useState<string>(() => {
    return initialDiplomaId || (diplomas.length > 0 ? diplomas[0].id : '');
  });

  
  // Custom threshold for certification calculation (Requirement 7)
  const [eligibilityThreshold, setEligibilityThreshold] = useState<number>(75);

  const selectedDiploma = useMemo(() => {
    return diplomas.find((d) => d.id === selectedDiplomaId);
  }, [diplomas, selectedDiplomaId]);

  // Compute Students registered in current diploma
  const enrolledStudents = useMemo(() => {
    if (!selectedDiplomaId) return [];
    return students.filter((st) => st.diplomaIds.includes(selectedDiplomaId));
  }, [students, selectedDiplomaId]);

  // Compute active sessions for currently selected diploma
  const diplomaSessions = useMemo(() => {
    if (!selectedDiplomaId) return [];
    return sessions.filter((s) => s.diplomaId === selectedDiplomaId);
  }, [sessions, selectedDiplomaId]);

  // Compute reporting records for Tab 1 (Attendance) & Tab 2 (Eligibility)
  const reportData = useMemo(() => {
    if (!selectedDiploma) return [];

    return enrolledStudents.map((student) => {
      const stats = calculateStudentDiplomaAttendance(
        student,
        selectedDiploma,
        sessions,
        eligibilityThreshold
      );
      return {
        student,
        stats
      };
    });
  }, [enrolledStudents, selectedDiploma, sessions, eligibilityThreshold]);

  // Compute Tab 3 (Diploma Summary Report)
  const summaryReportData = useMemo(() => {
    if (!selectedDiploma) return null;
    return calculateDiplomaSummary(selectedDiploma, students, sessions);
  }, [selectedDiploma, students, sessions]);

  // --- Weekly Report State & Logic (Feature 10) ---
  const [weeklyDiplomaId, setWeeklyDiplomaId] = useState<string>(() => {
    return initialDiplomaId || (diplomas.length > 0 ? diplomas[0].id : '');
  });
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [weekEnd, setWeekEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [copiedReport, setCopiedReport] = useState(false);

  const weeklyData = useMemo(() => {
    const diploma = diplomas.find(d => d.id === weeklyDiplomaId);
    if (!diploma) return null;

    // Sessions in the selected date range for the selected diploma
    const weekSessions = sessions.filter(s =>
      s.diplomaId === weeklyDiplomaId &&
      s.date >= weekStart &&
      s.date <= weekEnd
    );

    // Enrolled students
    const enrolled = students.filter(st => st.diplomaIds.includes(weeklyDiplomaId));

    // Per-session stats
    const sessionStats = weekSessions.map(ses => {
      const records = Object.values(ses.attendance || {});
      const present = records.filter(r => r.status === 'Present').length;
      const absent = records.filter(r => r.status === 'Absent').length;
      const total = present + absent;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return { ses, present, absent, total, rate };
    });

    // Average attendance this week
    const avgRate = sessionStats.length > 0
      ? Math.round(sessionStats.reduce((acc, s) => acc + s.rate, 0) / sessionStats.length)
      : 0;

    // Students with >= 2 absences this week
    const atRiskStudents = enrolled.filter(st => {
      const absCount = weekSessions.filter(ses => {
        const rec = ses.attendance?.[st.id];
        return rec && rec.status === 'Absent';
      }).length;
      return absCount >= 2;
    });

    // Financial quick summary
    const totalPaid = enrolled.reduce((acc, st) => acc + (st.payedAmount || 0), 0);
    const totalRemaining = enrolled.reduce((acc, st) => acc + (st.remainingAmount || 0), 0);

    // Tasks this week
    const completedTasks = tasks.filter(t =>
      t.status === 'Completed' &&
      t.dueDate >= weekStart &&
      t.dueDate <= weekEnd &&
      (!t.diplomaId || t.diplomaId === weeklyDiplomaId)
    );
    const overdueTasks = tasks.filter(t =>
      t.status !== 'Completed' &&
      t.dueDate < weekEnd &&
      (!t.diplomaId || t.diplomaId === weeklyDiplomaId)
    );

    return {
      diploma,
      weekSessions,
      sessionStats,
      enrolled,
      avgRate,
      atRiskStudents,
      totalPaid,
      totalRemaining,
      completedTasks,
      overdueTasks
    };
  }, [weeklyDiplomaId, weekStart, weekEnd, diplomas, sessions, students, tasks]);

  const handleCopyWeeklyReport = () => {
    if (!weeklyData) return;
    const { diploma, weekSessions, sessionStats, enrolled, avgRate, atRiskStudents, completedTasks, overdueTasks, totalPaid, totalRemaining } = weeklyData;

    const lines = [
      `📊 *تقرير العمليات الأسبوعي*`,
      `🎓 *الدبلومة:* ${diploma.name}`,
      `📅 *الفترة:* من ${weekStart} إلى ${weekEnd}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 *ملخص المحاضرات*`,
      `• عدد المحاضرات: ${weekSessions.length}`,
      `• متوسط الحضور: ${avgRate}%`,
      ...sessionStats.map(s => `  • ${s.ses.date} — ${s.ses.title}: حضر ${s.present} / غاب ${s.absent}`),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 *ملخص الطلاب*`,
      `• إجمالي الطلاب المسجلين: ${enrolled.length}`,
      `• طلاب تحت الخطر (غابوا مرتين+): ${atRiskStudents.length}`,
      ...(atRiskStudents.length > 0 ? atRiskStudents.map(st => `  ⚠️ ${st.name}`) : ['  لا يوجد']),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 *الملخص المالي*`,
      `• إجمالي المحصّل: ${totalPaid.toLocaleString()} ر.س`,
      `• إجمالي المتبقي: ${totalRemaining.toLocaleString()} ر.س`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 *المهام الإدارية*`,
      `• منجزة هذا الأسبوع: ${completedTasks.length}`,
      `• متأخرة وعاجلة: ${overdueTasks.length}`,
      ...(overdueTasks.length > 0 ? overdueTasks.map(t => `  ❗ ${t.title}`) : ['  لا توجد مهام متأخرة']),
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 صادر من: منصة دبلومات الشؤون التعليمية`
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 3000);
    });
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  // EXPORT HANDLERS
  const handleExportExcel = () => {
    if (!selectedDiploma) return;

    let headers: string[] = [];
    let rows: any[][] = [];
    let reportName = '';

    if (activeTab === 'attendance') {
      reportName = `تقرير_الحضور_والغياب_${selectedDiploma.name}`;
      headers = [
        'اسم الطالب',
        'اسم ولي الأمر',
        'رقم هاتف الواتساب',
        'إجمالي الجلسات المسجلة',
        'عدد المحاضرات التي تم تحضيره فيها',
        'مرات الحضور الفعلي',
        'مرات الغياب المؤكد',
        'نسبة الحضور المئوية'
      ];
      rows = reportData.map(({ student, stats }) => [
        student.name,
        student.parentName,
        student.phone,
        stats.totalSessions,
        stats.markedSessions,
        stats.present,
        stats.absent,
        `${stats.rate}%`
      ]);
    } else if (activeTab === 'eligibility') {
      reportName = `تقرير_استحقاق_الشهادات_${selectedDiploma.name}`;
      headers = [
        'اسم الطالب',
        'رقم هاتف الواتساب',
        'نسبة الحضور المحققة',
        'الحد الأدنى للاستحقاق المقرر',
        'الأهلية لنيل الشهادة',
        'حالة الخطر'
      ];
      rows = reportData.map(({ student, stats }) => [
        student.name,
        student.phone,
        `${stats.rate}%`,
        `${eligibilityThreshold}%`,
        stats.isEligible ? 'مؤهل (Eligible)' : 'غير مستحق (Not Eligible)',
        stats.isAtRisk ? 'مؤشر خطر بالغياب' : 'مستقر'
      ]);
    } else if (activeTab === 'summary') {
      reportName = `تقرير_ملخص_العمليات_${selectedDiploma.name}`;
      headers = ['ركن المؤشر الاستراتيجي', 'القيمة المحسوبة المعتمدة'];
      if (summaryReportData) {
        rows = [
          ['البرنامج الأكاديمي المعتمد', selectedDiploma.name],
          ['تاريخ البدء', selectedDiploma.startDate],
          ['تاريخ الانتهاء التقديري', selectedDiploma.endDate],
          ['الحالة التشغيلية', selectedDiploma.status],
          ['إجمالي عدد المسجلين بالدبلوم', `${summaryReportData.totalStudents} طالب`],
          ['إجمالي المحاضرات والدروس المجدولة والمنقضية', `${summaryReportData.totalSessions} محاضرة`],
          ['متوسط نسبة الحضور التراكمية للمجموعة', `${summaryReportData.averageAttendanceRate}%`],
          ['مجموع عدد المحاضرات التي تم تحضيرها صفيًا بشكل كامل', `${summaryReportData.completedSessions} محاضرة`]
        ];
      }
    }

    const csvBlob = generateArabicCSV(headers, rows);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = `${reportName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 text-right" id="reporting-center-component" dir="rtl">
      
      {/* Top Banner Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#262626] pb-4 select-none print:hidden">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart4 className="w-5 h-5 text-[#3B82F6]" />
            مركز التقارير المعتمدة وإحصاءات الشهادات
          </h3>
          <p className="text-xs text-zinc-400">تحليل معايير الأثر التدريبي وتصدير المستخرجات الرسمية وحساب أهلية الخريجين</p>
        </div>

        {/* Global Select Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#0F0F0F] px-2.5 py-1.5 rounded border border-[#232323]">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-400 font-sans">تحديد الدبلوم المراد تحليل بياناته:</span>
            <select
              value={selectedDiplomaId}
              onChange={(e) => setSelectedDiplomaId(e.target.value)}
              className="bg-transparent text-xs text-white border-0 focus:ring-0 outline-hidden cursor-pointer"
            >
              {diplomas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs list selector */}
      <div className="flex border-b border-[#1F1F1F] text-xs font-semibold tracking-wide select-none print:hidden">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 relative transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          بيان الحضور والغياب للطلاب
        </button>
        <button
          onClick={() => setActiveTab('eligibility')}
          className={`px-4 py-2 relative transition-all cursor-pointer ${
            activeTab === 'eligibility'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          أهلية استحقاق الشهادة الأكاديمية
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 relative transition-all cursor-pointer ${
            activeTab === 'summary'
              ? 'text-[#3B82F6] border-b-2 border-[#3B82F6]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ملخص تقرير الدبلوم الإحصائي
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 relative transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'weekly'
              ? 'text-amber-400 border-b-2 border-amber-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <BarChart4 className="w-3.5 h-3.5" />
          التقرير العملياتي الأسبوعي
        </button>
      </div>

      {/* Threshold config display (specific to Eligibility criteria setup) */}
      {activeTab === 'eligibility' && (
        <div className="p-4 bg-[#111] border border-[#232323] rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none print:hidden">
          <div className="space-y-0.5 font-sans">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              إعدادات حساب أهلية نيل شهادات دبلومات القبول
            </span>
            <p className="text-[10px] text-zinc-500">يقوم محرك التوثيق باحتساب الطلاب المؤهلين والذين حققوا نسبة أعلى من هذا الحد تلقائياً</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-sans">الحد الأدنى للحضور (%):</span>
            <input
              type="number"
              min={1}
              max={100}
              value={eligibilityThreshold}
              onChange={(e) => setEligibilityThreshold(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-20 px-2 py-1 bg-[#050505] border border-zinc-850 hover:border-zinc-700 text-xs text-center text-[#3B82F6] font-mono rounded font-black focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Main Print Out Container */}
      <div className="bg-[#121212]/30 border border-[#232323] rounded-xl p-5" id="printable-report-body">
        
        {/* Printable Letterhead styling (visible on print only) */}
        <div className="hidden print:flex flex-col items-center justify-center text-center pb-6 border-b-2 border-zinc-300 mb-6 font-sans">
          <h1 className="text-lg font-black text-black">منصة دبلومات الشؤون التعليمية والأكاديمية المعتمدة</h1>
          <h2 className="text-sm font-bold text-zinc-700 mt-1">تقرير رسمي صادر ببيانات الحضور والاستحقاقات الدراسية</h2>
          <div className="flex justify-center gap-6 mt-3 text-[10px] text-zinc-650 font-mono">
            <span>تاريخ الإصدار والطباعة: {new Date().toISOString().replace('T', ' ').substring(0, 16)}</span>
            <span>الدبلوم المحلل: {selectedDiploma?.name}</span>
          </div>
        </div>

        {/* Tab 1 Content: Attendance Detail Grid */}
        {activeTab === 'attendance' && selectedDiploma && (
          <div className="space-y-4">
            <div className="flex justify-between items-center select-none print:hidden">
              <span className="text-xs font-bold text-[#E5E5E5] font-sans">تفصيل الحضور والمشاركات ({reportData.length} طالب):</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#232323] text-zinc-400 text-[11px] select-none font-sans">
                    <th className="p-3">اسم الطالب كاملاً</th>
                    <th className="p-3">اسم ولي الأمر</th>
                    <th className="p-3">هاتف الـ WhatsApp</th>
                    <th className="p-3 text-center">المحاضرات الكلية</th>
                    <th className="p-3 text-center text-emerald-400">حاضر</th>
                    <th className="p-3 text-center text-rose-450">غائب</th>
                    <th className="p-3 text-center">المجموع المرصود</th>
                    <th className="p-3 text-left">معدل الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D1D1D] font-sans">
                  {reportData.map(({ student, stats }) => (
                    <tr key={student.id} className="hover:bg-zinc-900/10">
                      <td className="p-3 font-semibold text-zinc-150">{student.name}</td>
                      <td className="p-3 text-zinc-400">{student.parentName}</td>
                      <td className="p-3 text-zinc-400 font-mono" dir="ltr">{student.phone}</td>
                      <td className="p-3 text-center text-zinc-400 font-mono">{stats.totalSessions}</td>
                      <td className="p-3 text-center text-emerald-400 font-mono font-bold">{stats.present}</td>
                      <td className="p-3 text-center text-rose-400 font-mono font-bold">{stats.absent}</td>
                      <td className="p-3 text-center text-zinc-500 font-mono">{stats.markedSessions}</td>
                      <td className="p-3 text-left font-mono font-black text-[#3B82F6]">
                        {stats.rate}%
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">لا يوجد طلاب منتسبين لهذا الدبلوم حالياً لاستعراض الأرشيف.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2 Content: Certificate Eligibility Grade Card */}
        {activeTab === 'eligibility' && selectedDiploma && (
          <div className="space-y-4">
            <div className="flex justify-between items-center select-none print:hidden">
              <span className="text-xs font-bold text-[#E5E5E5] font-sans">ركن أهلية استخراج الشهادات والتكريمات:</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#232323] text-zinc-400 text-[11px] select-none text-right font-sans">
                    <th className="p-3">اسم الطالب الكريم</th>
                    <th className="p-3 text-right">رقم هاتف الأب / الطالب</th>
                    <th className="p-3 text-center">معدل الحضور التراكمي</th>
                    <th className="p-3 text-center">الحد الأدنى المطلوب</th>
                    <th className="p-3 text-center">قرار الأهلية ونيل الشهادة</th>
                    <th className="p-3 text-left">مستوى استغناء الفلو</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D1D1D] font-sans">
                  {reportData.map(({ student, stats }) => (
                    <tr key={student.id} className="hover:bg-zinc-900/10">
                      <td className="p-3 font-semibold text-zinc-150">{student.name}</td>
                      <td className="p-3 text-zinc-400 font-mono" dir="ltr">{student.phone}</td>
                      <td className="p-3 text-center font-mono font-black text-white">{stats.rate}%</td>
                      <td className="p-3 text-center text-zinc-500 font-mono">{eligibilityThreshold}%</td>
                      <td className="p-3 text-center">
                        {stats.isEligible ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-450 shrink-0" />
                            مستحق ومؤهل للشهادة
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-450 bg-rose-955/20 border border-rose-900/30 px-2 py-0.5 rounded-full select-none inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            غير مستوف للشروط
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-left">
                        {stats.isAtRisk ? (
                          <span className="text-[9px] font-bold text-orange-400 bg-orange-955/20 px-2 py-0.5 rounded inline-flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            إنذار بالفصل
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-500">حالة مستقرة</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">لا يوجد بيانات للرصد والتقييم.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Diploma Summary Statistics Booklet */}
        {activeTab === 'summary' && selectedDiploma && (
          <div className="space-y-6">
            <div className="flex justify-between items-center select-none print:hidden">
              <span className="text-xs font-bold text-[#E5E5E5] font-sans">ملخص التقرير الاستراتيجي المجمّع:</span>
            </div>

            {summaryReportData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Metric list */}
                <div className="space-y-3 font-sans">
                  {[
                    { label: 'البرنامج الدبلوم المستهدف بنشاط التقارير', val: selectedDiploma.name },
                    { label: 'مدى تاريخ الانعقاد التأسيسي', val: `من ${selectedDiploma.startDate} إلى ${selectedDiploma.endDate}` },
                    { label: 'الحالة الإستاتيكية للمسار', val: selectedDiploma.status === 'Active' ? 'مستمر ونشط حالياً' : 'مكتمل / قادم' },
                    { label: 'إجمالي منتسبي المجموعة المقيدين', val: `${summaryReportData.totalStudents} طالب مسجل بالتوجيه` },
                    { label: 'مجموع الحصص والمحاضرات المفعلة صفيًا', val: `${summaryReportData.totalSessions} درس وجلسة` }
                  ].map((field, i) => (
                    <div key={i} className="p-3 bg-[#0A0A0A] border border-[#1E1E1E] rounded-lg flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-semibold">{field.label}</span>
                      <span className="text-white font-bold">{field.val}</span>
                    </div>
                  ))}
                </div>

                {/* Performance overview circular visualization and stats */}
                <div className="bg-[#0A0A0A]/50 border border-[#232323] p-5 rounded-xl flex flex-col justify-center items-center text-center space-y-4">
                  <div className="relative flex items-center justify-center">
                    {/* Visual Rate */}
                    <div className="w-28 h-28 rounded-full border-4 border-zinc-800 flex flex-col justify-center items-center">
                      <span className="text-2xl font-mono font-black text-[#3B82F6]">{summaryReportData.averageAttendanceRate}%</span>
                      <span className="text-[9px] text-zinc-500 font-sans mt-0.5">متوسط الحضور</span>
                    </div>
                  </div>
                  <div className="space-y-1 font-sans">
                    <p className="text-xs text-zinc-300 font-semibold">معدل الانعقاد والتحضير الصفي متميز</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      يمثل هذا المؤشر نسبة تجاوب وحضور الطلاب المقيدين في كافة المحاضرات التي تم تحضيرها {summaryReportData.completedSessions} من أصل {summaryReportData.totalSessions}.
                    </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">لا تتوفر إحصائيات كافية لتوليد ملخص المنعقدات.</div>
            )}
          </div>
        )}

      </div>

      {/* Exporter Controls Buttons (hidden on weekly tab) */}
      {activeTab !== 'weekly' && (
        <div className="flex items-center justify-start gap-3 select-none print:hidden">
          {selectedDiploma && (
            <>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-[#065F46] hover:bg-emerald-600 text-emerald-100 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                id="btn-export-excel-reporting-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير هذا التقرير إلى Excel (CSV)</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-250 hover:text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                id="btn-print-pdf-reporting-center"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة المستخرج وحفظ كـ PDF رسمي</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Tab 4: Weekly Operations Report */}
      {activeTab === 'weekly' && (
        <div className="space-y-5" dir="rtl">
          {/* Controls */}
          <div className="flex flex-wrap items-end gap-4 p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl print:hidden">
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">الدبلومة:</label>
              <select
                value={weeklyDiplomaId}
                onChange={e => setWeeklyDiplomaId(e.target.value)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-white rounded outline-hidden cursor-pointer"
              >
                {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">من تاريخ:</label>
              <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-white rounded outline-hidden cursor-pointer" />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">إلى تاريخ:</label>
              <input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)}
                className="px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] text-xs text-white rounded outline-hidden cursor-pointer" />
            </div>
            <div className="flex gap-2 mr-auto">
              <button
                onClick={handleCopyWeeklyReport}
                className={`px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  copiedReport
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {copiedReport ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReport ? 'تم النسخ!' : 'نسخ للنشر (واتساب/تليجرام)'}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-[#171717] hover:bg-[#262626] border border-[#262626] text-zinc-300 hover:text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة
              </button>
            </div>
          </div>

          {weeklyData ? (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl text-right">
                  <span className="block text-[10px] text-zinc-500">محاضرات هذا الأسبوع</span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">{weeklyData.weekSessions.length}</span>
                </div>
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl text-right">
                  <span className="block text-[10px] text-zinc-500">متوسط الحضور</span>
                  <span className={`text-2xl font-black font-mono mt-1 block ${
                    weeklyData.avgRate >= 75 ? 'text-emerald-400' : weeklyData.avgRate >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{weeklyData.avgRate}%</span>
                </div>
                <div className="p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl text-right">
                  <span className="block text-[10px] text-rose-400">طلاب تحت الخطر</span>
                  <span className="text-2xl font-black text-rose-400 font-mono mt-1 block">{weeklyData.atRiskStudents.length}</span>
                </div>
                <div className="p-4 bg-amber-950/10 border border-amber-900/20 rounded-xl text-right">
                  <span className="block text-[10px] text-amber-400">مهام متأخرة</span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">{weeklyData.overdueTasks.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sessions detail */}
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#3B82F6]" />
                    تفاصيل المحاضرات
                  </h4>
                  {weeklyData.sessionStats.length === 0 ? (
                    <p className="text-xs text-zinc-500">لا توجد محاضرات في هذه الفترة</p>
                  ) : (
                    weeklyData.sessionStats.map(({ ses, present, absent, rate }) => (
                      <div key={ses.id} className="flex items-center justify-between border-b border-[#1A1A1A] pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="text-xs font-semibold text-zinc-200 block">{ses.title}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{ses.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-emerald-400 font-bold">✓{present}</span>
                          <span className="text-rose-400 font-bold">✗{absent}</span>
                          <span className={`font-black font-mono ${
                            rate >= 75 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-rose-400'
                          }`}>{rate}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* At-risk students */}
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    الطلاب الأكثر غياباً (خطر)
                  </h4>
                  {weeklyData.atRiskStudents.length === 0 ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-950/10 border border-emerald-900/20 rounded text-xs text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      جميع الطلاب بوضع جيد هذا الأسبوع
                    </div>
                  ) : (
                    weeklyData.atRiskStudents.map(st => (
                      <div key={st.id} className="flex items-center justify-between p-2 bg-rose-950/10 border border-rose-900/20 rounded">
                        <span className="text-xs font-semibold text-rose-200">{st.name}</span>
                        <a
                          href={`https://api.whatsapp.com/send?phone=${st.phone.replace(/[\s\+\-]/g,'').replace(/^0/,'966')}&text=${encodeURIComponent(`السلام عليكم ${st.parentName}، نود إحاطتكم بتكرار غياب الطالب ${st.name} هذا الأسبوع. نرجو المتابعة معه وحثه على الحضور.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded flex items-center gap-1"
                        >
                          واتساب
                        </a>
                      </div>
                    ))
                  )}
                </div>

                {/* Financial summary */}
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    الملخص المالي
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-950/10 border border-emerald-900/20 rounded text-right">
                      <span className="text-[10px] text-emerald-400 block">إجمالي المحصّل</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">{weeklyData.totalPaid.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-500"> ر.س</span>
                    </div>
                    <div className="p-3 bg-rose-950/10 border border-rose-900/20 rounded text-right">
                      <span className="text-[10px] text-rose-400 block">إجمالي المتبقي</span>
                      <span className="text-sm font-black text-rose-400 font-mono">{weeklyData.totalRemaining.toLocaleString()}</span>
                      <span className="text-[9px] text-zinc-500"> ر.س</span>
                    </div>
                  </div>
                </div>

                {/* Tasks summary */}
                <div className="p-4 bg-[#0F0F0F] border border-[#232323] rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                    المهام الإدارية
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="p-2 bg-emerald-950/10 border border-emerald-900/20 rounded text-center">
                      <span className="text-lg font-black text-emerald-400">{weeklyData.completedTasks.length}</span>
                      <span className="block text-[10px] text-zinc-500">منجزة</span>
                    </div>
                    <div className="p-2 bg-rose-950/10 border border-rose-900/20 rounded text-center">
                      <span className="text-lg font-black text-rose-400">{weeklyData.overdueTasks.length}</span>
                      <span className="block text-[10px] text-zinc-500">متأخرة</span>
                    </div>
                  </div>
                  {weeklyData.overdueTasks.slice(0, 4).map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-[10px] text-rose-300">
                      <span className="text-rose-500">❗</span>
                      <span className="truncate">{t.title}</span>
                      <span className="text-zinc-600 shrink-0 font-mono">{t.dueDate}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-xs">
              لا توجد دبلومات متاحة لعرض التقرير.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
