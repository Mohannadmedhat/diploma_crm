import { Student, Diploma, Session, AttendanceStatus } from '../types';

/**
 * Interface to display detailed attendance metrics per student in a diploma
 */
export interface StudentDiplomaMetrics {
  studentId: string;
  studentName: string;
  diplomaId: string;
  diplomaName: string;
  totalSessions: number; // total sessions created for this diploma
  markedSessions: number; // sessions with registered status (Present or Absent) for this student
  presentCount: number;
  absentCount: number;
  unmarkedCount: number;
  rate: number; // attendance rate percentage
  isAtRisk: boolean; // rate < minAttendanceRate
  isEligible: boolean; // rate >= minAttendanceRate
}

/**
 * Calculates attendance metrics for a specific student in a specific diploma
 */
export function calculateStudentDiplomaAttendance(
  student: Student,
  diploma: Diploma,
  sessions: Session[],
  minAttendanceRate: number = 75
): StudentDiplomaMetrics {
  const diplomaSessions = sessions.filter((s) => s.diplomaId === diploma.id);
  const totalSessions = diplomaSessions.length;

  let presentCount = 0;
  let absentCount = 0;
  let unmarkedCount = 0;

  diplomaSessions.forEach((session) => {
    const record = session.attendance[student.id];
    if (record) {
      if (record.status === 'Present') {
        presentCount++;
      } else if (record.status === 'Absent') {
        absentCount++;
      } else {
        unmarkedCount++;
      }
    } else {
      unmarkedCount++;
    }
  });

  const markedSessions = presentCount + absentCount;
  // If no sessions have been logged/marked, they start at 100% attendance rate
  const rate = markedSessions > 0 ? Math.round((presentCount / markedSessions) * 100) : 100;
  const isAtRisk = rate < minAttendanceRate;
  const isEligible = rate >= minAttendanceRate;

  return {
    studentId: student.id,
    studentName: student.name,
    diplomaId: diploma.id,
    diplomaName: diploma.name,
    totalSessions,
    markedSessions,
    presentCount,
    absentCount,
    unmarkedCount,
    rate,
    isAtRisk,
    isEligible
  };
}

/**
 * Calculates overall metrics for all students enrolled in a diploma
 */
export interface DiplomaAttendanceSummary {
  diplomaId: string;
  diplomaName: string;
  totalStudentsCount: number;
  totalSessionsCount: number;
  presentRecordsCount: number;
  absentRecordsCount: number;
  overallAttendanceRate: number;
  atRiskStudentsCount: number;
  eligibleStudentsCount: number;
}

export function calculateDiplomaSummary(
  diploma: Diploma,
  students: Student[],
  sessions: Session[],
  minAttendanceRate: number = 75
): DiplomaAttendanceSummary {
  const enrolledStudents = students.filter((s) => s.diplomaIds.includes(diploma.id));
  const diplomaSessions = sessions.filter((s) => s.diplomaId === diploma.id);

  let presentRecordsCount = 0;
  let absentRecordsCount = 0;
  let atRiskStudentsCount = 0;
  let eligibleStudentsCount = 0;

  enrolledStudents.forEach((student) => {
    const metrics = calculateStudentDiplomaAttendance(student, diploma, sessions, minAttendanceRate);
    presentRecordsCount += metrics.presentCount;
    absentRecordsCount += metrics.absentCount;

    if (metrics.isAtRisk) {
      atRiskStudentsCount++;
    } else {
      eligibleStudentsCount++;
    }
  });

  const totalRecords = presentRecordsCount + absentRecordsCount;
  const overallAttendanceRate = totalRecords > 0 ? Math.round((presentRecordsCount / totalRecords) * 100) : 100;

  return {
    diplomaId: diploma.id,
    diplomaName: diploma.name,
    totalStudentsCount: enrolledStudents.length,
    totalSessionsCount: diplomaSessions.length,
    presentRecordsCount,
    absentRecordsCount,
    overallAttendanceRate,
    atRiskStudentsCount,
    eligibleStudentsCount
  };
}

/**
 * Evaluates performance metrics and fetches risk markers for all students in the database
 */
export interface SystemRiskSummary {
  atRiskStudents: {
    student: Student;
    diploma: Diploma;
    rate: number;
  }[];
  totalEnrolled: number;
}

export function detectAtRiskStudents(
  students: Student[],
  diplomas: Diploma[],
  sessions: Session[],
  minAttendanceRate: number = 75
): SystemRiskSummary {
  const atRiskStudents: SystemRiskSummary['atRiskStudents'] = [];

  students.forEach((student) => {
    student.diplomaIds.forEach((dipId) => {
      const diploma = diplomas.find((d) => d.id === dipId);
      if (diploma) {
        const metrics = calculateStudentDiplomaAttendance(student, diploma, sessions, minAttendanceRate);
        if (metrics.isAtRisk && metrics.markedSessions > 0) {
          atRiskStudents.push({
            student,
            diploma,
            rate: metrics.rate
          });
        }
      }
    });
  });

  return {
    atRiskStudents,
    totalEnrolled: students.length
  };
}

/**
 * Bulk Import of Students from simple CSV string.
 * Supports comma, semicolon or tab delimiters.
 * Standard Arabic headers are mapped.
 */
export function bulkParseStudentCSV(csvContent: string, existingDiplomas: Diploma[]): Student[] {
  const lines = csvContent.split(/\r?\n/);
  const result: Student[] = [];

  if (lines.length <= 1) return [];

  // Parse headers to see indices
  const headers = lines[0].split(/[,\t;]/).map((h) => h.trim().replace(/^"|"$/g, ''));

  // Mapping maps
  let nameIdx = -1;
  let parentIdx = -1;
  let phoneIdx = -1;
  let dateIdx = -1;
  let notesIdx = -1;
  let diplomasIdx = -1;
  let typeIdx = -1;
  let priceIdx = -1;
  let remainingIdx = -1;
  let payedIdx = -1;
  let discountIdx = -1;
  let depositIdx = -1;
  let methodIdx = -1;
  let salesIdx = -1;

  headers.forEach((h, i) => {
    const l = h.toLowerCase().trim();
    if (l === 'name' || l === 'الاسم' || l === 'اسم الطالب' || l.includes('name') || l.includes('اسم')) {
      if (l.includes('ولي') || l.includes('parent') || l.includes('guardian')) {
        parentIdx = i;
      } else {
        nameIdx = i;
      }
    } else if (l === 'phone' || l.includes('هاتف') || l.includes('جوال') || l.includes('phone') || l.includes('whatsapp') || l.includes('واتساب')) {
      phoneIdx = i;
    } else if (l === 'st-type' || l.includes('نوع') || l.includes('حالة') || l.includes('type')) {
      typeIdx = i;
    } else if (l === 'course price' || l.includes('سعر') || l.includes('price')) {
      priceIdx = i;
    } else if (l === 'remaining amount' || l.includes('متبقي') || l.includes('remaining')) {
      remainingIdx = i;
    } else if (l === 'payed' || l.includes('مدفوع') || l.includes('payed') || l.includes('paid')) {
      payedIdx = i;
    } else if (l === 'discount' || l.includes('خصم') || l.includes('discount')) {
      discountIdx = i;
    } else if (l === 'deposit' || l.includes('عربون') || l.includes('جدية') || l.includes('deposit')) {
      depositIdx = i;
    } else if (l === 'payment method' || l.includes('طريقة') || l.includes('method')) {
      methodIdx = i;
    } else if (l === 'date of registration' || l.includes('تاريخ') || l.includes('date') || l.includes('registration')) {
      dateIdx = i;
    } else if (l === 'sales-name' || l.includes('مبيعات') || l.includes('sales')) {
      salesIdx = i;
    } else if (l === 'notes' || l.includes('ملاحظ') || l.includes('note')) {
      notesIdx = i;
    } else if (l === 'diploma' || l.includes('دبلوم') || l.includes('course') || l.includes('برنامج') || l.includes('diplomas')) {
      diplomasIdx = i;
    }
  });

  // Fallbacks if not recognized
  if (nameIdx === -1) nameIdx = 0;
  if (phoneIdx === -1) phoneIdx = 1;

  const cleanNum = (val?: string) => {
    if (!val) return 0;
    return Number(val.replace(/[^\d\.]/g, '')) || 0;
  };

  for (let idx = 1; idx < lines.length; idx++) {
    const line = lines[idx].trim();
    if (!line) continue;

    // Split line on same delimiters, preserving quotes
    const cells: string[] = [];
    let inQuotes = false;
    let currentCell = '';

    for (let cIdx = 0; cIdx < line.length; cIdx++) {
      const char = line[cIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        cells.push(currentCell.trim().replace(/^"|"$/g, ''));
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim().replace(/^"|"$/g, ''));

    if (cells.length === 0 || !cells[nameIdx]) continue;

    const name = cells[nameIdx];
    const parentName = parentIdx !== -1 ? cells[parentIdx] : `أبو ${name}`;
    let rawPhone = cells[phoneIdx] || '';
    if (rawPhone && !rawPhone.startsWith('+')) {
      rawPhone = '+' + rawPhone.replace(/\D/g, '');
    }

    const joinedDate = cells[dateIdx] || new Date().toISOString().split('T')[0];
    const notes = cells[notesIdx] || '';
    const studentType = typeIdx !== -1 ? cells[typeIdx] : 'New';
    const coursePrice = priceIdx !== -1 ? cleanNum(cells[priceIdx]) : 0;
    const remainingAmount = remainingIdx !== -1 ? cleanNum(cells[remainingIdx]) : 0;
    const payedAmount = payedIdx !== -1 ? cleanNum(cells[payedIdx]) : 0;
    const discount = discountIdx !== -1 ? cells[discountIdx] : '0%';
    const deposit = depositIdx !== -1 ? cleanNum(cells[depositIdx]) : 0;
    const paymentMethod = methodIdx !== -1 ? cells[methodIdx] : '';
    const salesName = salesIdx !== -1 ? cells[salesIdx] : '';

    // Parse diplomas names. If a comma separated cell lists diploma names, associate them.
    const diplomaNamesStr = cells[diplomasIdx] || '';
    const diplomaIds: string[] = [];

    if (diplomaNamesStr) {
      const names = diplomaNamesStr.split(/[|&\-]/).map((n) => n.trim().toLowerCase());
      names.forEach((name) => {
        const found = existingDiplomas.find(
          (d) => d.name.toLowerCase().includes(name) || name.includes(d.name.toLowerCase())
        );
        if (found) {
          diplomaIds.push(found.id);
        }
      });
    }

    // Default to at least the first diploma if none mapped
    if (diplomaIds.length === 0 && existingDiplomas.length > 0) {
      diplomaIds.push(existingDiplomas[0].id);
    }

    result.push({
      id: `st-csv-${Date.now()}-${idx}-${Math.floor(Math.random() * 100)}`,
      name,
      parentName,
      phone: rawPhone,
      diplomaIds,
      joinedDate,
      notes,
      studentType,
      coursePrice,
      remainingAmount,
      payedAmount,
      discount,
      deposit,
      paymentMethod,
      salesName
    });
  }

  return result;
}

/**
 * Formats data lists into Arabic CSV containing standard UTF-8 BOM byte sequence.
 */
export function generateArabicCSV(headers: string[], rows: string[][]): Blob {
  const content = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\r\n');

  // Prepend the UTF-8 Byte Order Mark (\uFEFF) to make Excel load Arabic perfectly
  return new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], {
    type: 'text/csv;charset=utf-8;'
  });
}

export interface StudyDaysPreset {
  id: string;
  labelEn: string;
  labelAr: string;
  value: string;
  days: string[];
  isSingleDay: boolean;
}

export const STUDY_DAYS_PRESETS: StudyDaysPreset[] = [
  { id: 'sat', labelEn: 'Saturday', labelAr: 'السبت', value: 'السبت', days: ['السبت'], isSingleDay: true },
  { id: 'fri', labelEn: 'Friday', labelAr: 'الجمعة', value: 'الجمعة', days: ['الجمعة'], isSingleDay: true },
  { id: 'sat-tue', labelEn: 'Saturday - Tuesday', labelAr: 'السبت - الثلاثاء', value: 'السبت - الثلاثاء', days: ['السبت', 'الثلاثاء'], isSingleDay: false },
  { id: 'sun-wed', labelEn: 'Sunday - Wednesday', labelAr: 'الأحد - الأربعاء', value: 'الأحد - الأربعاء', days: ['الأحد', 'الأربعاء'], isSingleDay: false },
  { id: 'mon-thu', labelEn: 'Monday - Thursday', labelAr: 'الاثنين - الخميس', value: 'الاثنين - الخميس', days: ['الاثنين', 'الخميس'], isSingleDay: false },
  { id: 'fri-tue', labelEn: 'Friday - Tuesday', labelAr: 'الجمعة - الثلاثاء', value: 'الجمعة - الثلاثاء', days: ['الجمعة', 'الثلاثاء'], isSingleDay: false },
  { id: 'sat-wed', labelEn: 'Saturday - Wednesday', labelAr: 'السبت - الأربعاء', value: 'السبت - الأربعاء', days: ['السبت', 'الأربعاء'], isSingleDay: false },
  { id: 'tue-wed', labelEn: 'Tuesday - Wednesday', labelAr: 'الثلاثاء - الأربعاء', value: 'الثلاثاء - الأربعاء', days: ['الثلاثاء', 'الأربعاء'], isSingleDay: false },
  { id: 'tue-thu', labelEn: 'Tuesday - Thursday', labelAr: 'الثلاثاء - الخميس', value: 'الثلاثاء - الخميس', days: ['الثلاثاء', 'الخميس'], isSingleDay: false },
  { id: 'sun-tue', labelEn: 'Sunday - Tuesday', labelAr: 'الأحد - الثلاثاء', value: 'الأحد - الثلاثاء', days: ['الأحد', 'الثلاثاء'], isSingleDay: false },
  { id: 'sat-mon', labelEn: 'Saturday - Monday', labelAr: 'السبت - الاثنين', value: 'السبت - الاثنين', days: ['السبت', 'الاثنين'], isSingleDay: false },
  { id: 'fri-mon', labelEn: 'Friday - Monday', labelAr: 'الجمعة - الاثنين', value: 'الجمعة - الاثنين', days: ['الجمعة', 'الاثنين'], isSingleDay: false }
];

export function isSingleDayCourse(studyDays: string | undefined): boolean {
  if (!studyDays) return false;
  const clean = studyDays.trim();
  if (clean === 'السبت' || clean === 'الجمعة' || clean === 'Saturday' || clean === 'Friday') {
    return true;
  }
  const ALL_WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'الإثنين', 'الاربعاء'];
  let dayCount = 0;
  ALL_WEEK_DAYS.forEach(day => {
    const normClean = clean.replace(/إ/g, 'ا');
    const normDay = day.replace(/إ/g, 'ا');
    if (normClean.includes(normDay)) {
      dayCount++;
    }
  });
  if (dayCount > 0) return dayCount === 1;

  const ENGLISH_WEEK_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  let engDayCount = 0;
  ENGLISH_WEEK_DAYS.forEach(day => {
    if (clean.toLowerCase().includes(day)) {
      engDayCount++;
    }
  });
  return engDayCount === 1;
}

export function parseSessionTimeTo24h(timeStr: string | undefined): string {
  if (!timeStr) return '18:00';
  const arToEn: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let normalized = timeStr.replace(/[٠-٩]/g, (d) => arToEn[d] || d).trim().toLowerCase();
  const match = normalized.match(/(\d{1,2})\s*:\s*(\d{2})/);
  if (!match) {
    const singleHourMatch = normalized.match(/^(\d{1,2})$/);
    if (singleHourMatch) {
      let hour = parseInt(singleHourMatch[1], 10);
      const isPm = normalized.includes('مساء') || normalized.includes('pm') || normalized.includes('م');
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;
      return `${String(hour).padStart(2, '0')}:00`;
    }
    return '18:00';
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const isPm = normalized.includes('مساء') || normalized.includes('pm') || normalized.includes('م');
  const isAm = normalized.includes('صباح') || normalized.includes('am') || normalized.includes('ص');
  if (isPm && hour < 12) {
    hour += 12;
  } else if (isAm && hour === 12) {
    hour = 0;
  }
  hour = Math.min(23, Math.max(0, hour));
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

export function getSessionDurationHours(studyDays: string | undefined): number {
  return isSingleDayCourse(studyDays) ? 6 : 3;
}

export function addHoursToTime(timeStr: string, hoursToAdd: number): string {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = mStr || '00';
  h = (h + hoursToAdd) % 24;
  return `${String(h).padStart(2, '0')}:${m}`;
}
