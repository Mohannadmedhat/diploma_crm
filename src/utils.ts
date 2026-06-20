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
interface ReplacementParams {
  studentName: string;
  parentName: string;
  course: string;
  date: string;
}

export function parseTemplate(templateText: string, params: ReplacementParams): string {
  let text = templateText;
  
  // Clean substitution
  text = text.replace(/{studentName}/g, params.studentName || 'the student');
  text = text.replace(/{parentName}/g, params.parentName || 'Guardian');
  text = text.replace(/{course}/g, params.course || 'the registered course');
  text = text.replace(/{date}/g, formatHumanDate(params.date));
  
  return text;
}

// Generate the WhatsApp direct link API URL
export function formatWhatsAppLink(phone: string, text: string): string {
  // Strip non-numbers except the leading plus
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+') && cleanPhone.length > 0) {
    // If no country code sign, keep it, but note WhatsApp API likes them prefix-friendly
    // No-op for maximum manual control
  }
  
  const encodedText = encodeURIComponent(text);
  // Using api.whatsapp.com/send is universally supported and functions flawlessly inside wrappers/iframes
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}
