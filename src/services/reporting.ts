import { Student, Diploma, Session } from '../types';
import { calculateStudentDiplomaAttendance, calculateDiplomaSummary, StudentDiplomaMetrics, DiplomaAttendanceSummary } from './business';
import { generateArabicCSV } from './business';

export interface ReportingBundle {
  attendanceReport: StudentDiplomaMetrics[];
  summaryReport: DiplomaAttendanceSummary[];
}

export function compileReportingBundle(
  students: Student[],
  diplomas: Diploma[],
  sessions: Session[],
  minAttendanceRate: number = 75
): ReportingBundle {
  const attendanceReport: StudentDiplomaMetrics[] = [];
  const summaryReport: DiplomaAttendanceSummary[] = [];

  // 1. Compiled Student Diploma attendance
  students.forEach((student) => {
    student.diplomaIds.forEach((dipId) => {
      const diploma = diplomas.find((d) => d.id === dipId);
      if (diploma) {
        const metrics = calculateStudentDiplomaAttendance(student, diploma, sessions, minAttendanceRate);
        attendanceReport.push(metrics);
      }
    });
  });

  // 2. Compiled Diploma summary reports
  diplomas.forEach((diploma) => {
    const summary = calculateDiplomaSummary(diploma, students, sessions, minAttendanceRate);
    summaryReport.push(summary);
  });

  return {
    attendanceReport,
    summaryReport
  };
}

/**
 * Downloads the attendance report as a flawless Arabic-supported Excel-compatible CSV.
 */
export function downloadAttendanceReportCSV(
  students: Student[],
  diplomas: Diploma[],
  sessions: Session[],
  minAttendanceRate: number = 75
): Blob {
  const bundle = compileReportingBundle(students, diplomas, sessions, minAttendanceRate);
  
  const headers = [
    'اسم الطالب',
    'اسم الدبلوم',
    'إجمالي المحاضرات',
    'المحاضرات المقيمة',
    'أيام الحضور',
    'أيام الغياب',
    'نسبة الحضور',
    'حالة الخطورة',
    'الأهلية للشهادة'
  ];

  const rows = bundle.attendanceReport.map((m) => [
    m.studentName,
    m.diplomaName,
    m.totalSessions.toString(),
    m.markedSessions.toString(),
    m.presentCount.toString(),
    m.absentCount.toString(),
    `${m.rate}%`,
    m.isAtRisk ? 'تحت الخطورة (دون الحد المقبول)' : 'آمن',
    m.isEligible ? 'مؤهل لاستلام الشهادة' : 'غير مؤهل (غياب متكرر)'
  ]);

  return generateArabicCSV(headers, rows);
}

/**
 * Downloads the Diploma Summary report as Arabic CSV.
 */
export function downloadDiplomaSummaryReportCSV(
  students: Student[],
  diplomas: Diploma[],
  sessions: Session[],
  minAttendanceRate: number = 75
): Blob {
  const bundle = compileReportingBundle(students, diplomas, sessions, minAttendanceRate);
  
  const headers = [
    'اسم الدبلوم',
    'عدد الطلاب المسجلين',
    'إجمالي عدد الجلسات',
    'معدل الحضور العام',
    'الطلاب تحت الخطورة',
    'الطلاب المؤهلين للشهادة'
  ];

  const rows = bundle.summaryReport.map((s) => [
    s.diplomaName,
    s.totalStudentsCount.toString(),
    s.totalSessionsCount.toString(),
    `${s.overallAttendanceRate}%`,
    s.atRiskStudentsCount.toString(),
    s.eligibleStudentsCount.toString()
  ]);

  return generateArabicCSV(headers, rows);
}
