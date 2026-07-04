import { Student, Session, MessageTemplate, DEFAULT_ARABIC_TEMPLATES, DUMMY_STUDENTS } from './types';

// Local Storage Keys
const KEY_STUDENTS = 'diploma_ops_students';
const KEY_SESSIONS = 'diploma_ops_sessions';
const KEY_TEMPLATES = 'diploma_ops_templates';

// Load Students from Local Storage, fallback to DUMMY_STUDENTS
export function loadStudents(): Student[] {
  try {
    const raw = localStorage.getItem(KEY_STUDENTS);
    if (!raw) {
      localStorage.setItem(KEY_STUDENTS, JSON.stringify(DUMMY_STUDENTS));
      return DUMMY_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load students', e);
    return DUMMY_STUDENTS;
  }
}

// Save Students to Local Storage
export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(KEY_STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save students', e);
  }
}

// Load Attendance Sessions from Local Storage
export function loadSessions(): Record<string, any> {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS);
    if (!raw) {
      // Create a default session for today so the database isn't blank
      const today = new Date().toISOString().split('T')[0];
      const initialSession: Record<string, any> = {
        [today]: {
          date: today,
          records: {
            'st-1': { studentId: 'st-1', status: 'Present', note: 'Arrived on time. Finished async task.' },
            'st-2': { studentId: 'st-2', status: 'Absent', note: 'Emailed admin about wisdom tooth removal.' },
            'st-3': { studentId: 'st-3', status: 'Present', note: 'Engaged, presented prototype deck.' },
            'st-4': { studentId: 'st-4', status: 'Unmarked', note: '' }
          }
        }
      };
      localStorage.setItem(KEY_SESSIONS, JSON.stringify(initialSession));
      return initialSession;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load sessions', e);
    return {};
  }
}

// Save Attendance Sessions
export function saveSessions(sessions: Record<string, any>): void {
  try {
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions', e);
  }
}

// Load Message Templates
export function loadTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(KEY_TEMPLATES);
    if (!raw) {
      localStorage.setItem(KEY_TEMPLATES, JSON.stringify(DEFAULT_ARABIC_TEMPLATES));
      return DEFAULT_ARABIC_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load templates', e);
    return DEFAULT_ARABIC_TEMPLATES;
  }
}

// Save Message Templates
export function saveTemplates(templates: MessageTemplate[]): void {
  try {
    localStorage.setItem(KEY_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates', e);
  }
}

// Helper to format date cleanly
export function formatHumanDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Replace placeholders in a message template
export interface ReplacementParams {
  studentName: string;
  parentName: string;
  course: string;
  date: string;
  time?: string;
  absenceCount?: number;
}

export function parseTemplate(templateText: string, params: ReplacementParams): string {
  let text = templateText;
  const formattedDate = params.date ? formatHumanDate(params.date) : '';
  
  // English keys
  text = text.replace(/{studentName}/g, params.studentName || '');
  text = text.replace(/{parentName}/g, params.parentName || '');
  text = text.replace(/{course}/g, params.course || '');
  text = text.replace(/{date}/g, formattedDate);
  
  // Arabic keys (from approved plan)
  text = text.replace(/{اسم_الطالب}/g, params.studentName || '');
  text = text.replace(/{اسم}/g, params.studentName || '');
  text = text.replace(/{اسم_الدبلومة}/g, params.course || '');
  text = text.replace(/{دبلومة}/g, params.course || '');
  text = text.replace(/{تاريخ_المحاضرة}/g, formattedDate);
  text = text.replace(/{تاريخ}/g, formattedDate);
  text = text.replace(/{وقت_المحاضرة}/g, params.time || '');
  text = text.replace(/{الوقت}/g, params.time || '');
  text = text.replace(/{عدد_الغياب}/g, String(params.absenceCount ?? 0));
  
  return text;
}

// Format local Egypt/Saudi phone numbers into valid international formats for WhatsApp
export function formatInternationalPhone(phone: string): string {
  // Strip all non-digits
  let digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  // Handle Egyptian numbers: 
  // starts with 01 (length 11) or 1 (length 10)
  if (digits.startsWith('01') && digits.length === 11) {
    return '20' + digits.substring(1);
  }
  if ((digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15')) && digits.length === 10) {
    return '20' + digits;
  }

  // Handle Saudi numbers:
  // starts with 05 (length 10) or 5 (length 9)
  if (digits.startsWith('05') && digits.length === 10) {
    return '966' + digits.substring(1);
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return '966' + digits;
  }

  return digits;
}

// Generate the WhatsApp direct link API URL
export function formatWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = formatInternationalPhone(phone);
  const encodedText = encodeURIComponent(text);
  // Using api.whatsapp.com/send is universally supported and functions flawlessly inside wrappers/iframes
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}
