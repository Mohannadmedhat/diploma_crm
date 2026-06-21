import {
  Diploma,
  DiplomaTemplate,
  DiplomaType,
  Instructor,
  Mentor,
  Student,
  Session,
  Announcement,
  Task,
  MessageTemplate,
  AppConfig,
  DEFAULT_CONFIG,
  DEFAULT_ARABIC_TEMPLATES,
  DEFAULT_DIPLOMA_TEMPLATES,
  DEFAULT_DIPLOMA_TYPES,
  DEFAULT_INSTRUCTORS,
  DEFAULT_MENTORS,
  DUMMY_DIPLOMAS,
  DUMMY_STUDENTS,
  DUMMY_SESSIONS,
  DUMMY_ANNOUNCEMENTS,
  DUMMY_TASKS
} from '../types';

// ============================================================
// AUTH STATE (session user username stored locally)
// ============================================================
const KEY_CURRENT_USER = 'diploma_current_user';

export function getCurrentUser(): string | null {
  return localStorage.getItem(KEY_CURRENT_USER);
}

export function setCurrentUser(username: string | null): void {
  if (username) {
    localStorage.setItem(KEY_CURRENT_USER, username);
  } else {
    localStorage.removeItem(KEY_CURRENT_USER);
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

// ============================================================
// IMPERSONATION STATE (For Admin editing user data)
// ============================================================
let impersonatedUser: string | null = null;

export function setImpersonatedUser(username: string | null): void {
  impersonatedUser = username;
}

export function getImpersonatedUser(): string | null {
  return impersonatedUser;
}

export function getEffectiveUser(): string | null {
  return impersonatedUser || getCurrentUser();
}

// ============================================================
// KEY GENERATORS
// Per-user prefix for personal data
// Shared prefix for data shared across all users
// ============================================================

/** Personal data — prefixed by logged-in username or impersonated user */
const getUserPrefix = () => {
  const effectiveUser = getEffectiveUser();
  return effectiveUser ? `user_${effectiveUser}_` : 'diploma_mgmt_';
};

/** Shared data — fixed prefix, same for everyone */
const SHARED_PREFIX = 'shared_';

// --- Personal data keys (per user) ---
const KEY_DIPLOMAS         = () => `${getUserPrefix()}diplomas`;
const KEY_STUDENTS         = () => `${getUserPrefix()}students`;
const KEY_SESSIONS         = () => `${getUserPrefix()}sessions`;
const KEY_ANNOUNCEMENTS    = () => `${getUserPrefix()}announcements`;
const KEY_TASKS            = () => `${getUserPrefix()}tasks`;
const KEY_CONFIG           = () => `${getUserPrefix()}config`;

// --- Shared data keys (same for all users) ---
const KEY_INSTRUCTORS         = () => `${SHARED_PREFIX}instructors`;
const KEY_MENTORS             = () => `${SHARED_PREFIX}mentors`;
const KEY_TEMPLATES_DIPLOMA   = () => `${SHARED_PREFIX}diploma_templates`;
const KEY_DIPLOMA_TYPES       = () => `${SHARED_PREFIX}diploma_types`;
const KEY_TEMPLATES           = () => `${SHARED_PREFIX}msg_templates`;

// ============================================================
// INSTRUCTORS (Shared)
// ============================================================

export function mergeDefaultInstructors(currentList: Instructor[]): { merged: Instructor[]; wasUpdated: boolean } {
  let wasUpdated = false;
  const list = [...currentList];
  const existingNames = new Set(list.map(inst => inst.name.trim().toLowerCase()));

  DEFAULT_INSTRUCTORS.forEach(defaultInst => {
    const cleanName = defaultInst.name.trim().toLowerCase();
    if (!existingNames.has(cleanName)) {
      list.push(defaultInst);
      existingNames.add(cleanName);
      wasUpdated = true;
    }
  });

  return { merged: list, wasUpdated };
}

export function loadInstructors(): Instructor[] {
  try {
    const raw = localStorage.getItem(KEY_INSTRUCTORS());
    if (!raw) {
      saveInstructors(DEFAULT_INSTRUCTORS);
      return DEFAULT_INSTRUCTORS;
    }
    const parsed = JSON.parse(raw) as Instructor[];
    const { merged, wasUpdated } = mergeDefaultInstructors(parsed);
    if (wasUpdated) {
      saveInstructors(merged);
    }
    return merged;
  } catch (e) {
    console.error('Error loading instructors', e);
    return DEFAULT_INSTRUCTORS;
  }
}

export function saveInstructors(data: Instructor[]): void {
  try {
    localStorage.setItem(KEY_INSTRUCTORS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving instructors', e);
  }
}

// ============================================================
// MENTORS (Shared)
// ============================================================

export function loadMentors(): Mentor[] {
  try {
    const raw = localStorage.getItem(KEY_MENTORS());
    if (!raw) {
      saveMentors(DEFAULT_MENTORS);
      return DEFAULT_MENTORS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading mentors', e);
    return DEFAULT_MENTORS;
  }
}

export function saveMentors(data: Mentor[]): void {
  try {
    localStorage.setItem(KEY_MENTORS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving mentors', e);
  }
}

// ============================================================
// DIPLOMA TEMPLATES (Shared)
// ============================================================

export function loadDiplomaTemplates(): DiplomaTemplate[] {
  try {
    const raw = localStorage.getItem(KEY_TEMPLATES_DIPLOMA());
    if (!raw) {
      saveDiplomaTemplates(DEFAULT_DIPLOMA_TEMPLATES);
      return DEFAULT_DIPLOMA_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading diploma templates', e);
    return DEFAULT_DIPLOMA_TEMPLATES;
  }
}

export function saveDiplomaTemplates(data: DiplomaTemplate[]): void {
  try {
    localStorage.setItem(KEY_TEMPLATES_DIPLOMA(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving diploma templates', e);
  }
}

// ============================================================
// DIPLOMA TYPES (Shared)
// ============================================================

export function loadDiplomaTypes(): DiplomaType[] {
  try {
    const raw = localStorage.getItem(KEY_DIPLOMA_TYPES());
    if (!raw) {
      saveDiplomaTypes(DEFAULT_DIPLOMA_TYPES);
      return DEFAULT_DIPLOMA_TYPES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading diploma types', e);
    return DEFAULT_DIPLOMA_TYPES;
  }
}

export function saveDiplomaTypes(data: DiplomaType[]): void {
  try {
    localStorage.setItem(KEY_DIPLOMA_TYPES(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving diploma types', e);
  }
}

// ============================================================
// MESSAGE TEMPLATES (Shared)
// ============================================================

export function loadTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(KEY_TEMPLATES());
    if (!raw) {
      saveTemplates(DEFAULT_ARABIC_TEMPLATES);
      return DEFAULT_ARABIC_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading templates', e);
    return DEFAULT_ARABIC_TEMPLATES;
  }
}

export function saveTemplates(data: MessageTemplate[]): void {
  try {
    localStorage.setItem(KEY_TEMPLATES(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving templates', e);
  }
}

// ============================================================
// DIPLOMAS (Personal)
// ============================================================

export function loadDiplomas(): Diploma[] {
  try {
    const raw = localStorage.getItem(KEY_DIPLOMAS());
    if (!raw) {
      saveDiplomas(DUMMY_DIPLOMAS);
      return DUMMY_DIPLOMAS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading diplomas', e);
    return DUMMY_DIPLOMAS;
  }
}

export function saveDiplomas(data: Diploma[]): void {
  try {
    localStorage.setItem(KEY_DIPLOMAS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving diplomas', e);
  }
}

// ============================================================
// STUDENTS (Personal)
// ============================================================

export function loadStudents(): Student[] {
  try {
    const raw = localStorage.getItem(KEY_STUDENTS());
    if (!raw) {
      saveStudents(DUMMY_STUDENTS);
      return DUMMY_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading students', e);
    return DUMMY_STUDENTS;
  }
}

export function saveStudents(data: Student[]): void {
  try {
    localStorage.setItem(KEY_STUDENTS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving students', e);
  }
}

// ============================================================
// SESSIONS (Personal)
// ============================================================

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(KEY_SESSIONS());
    if (!raw) {
      saveSessions(DUMMY_SESSIONS);
      return DUMMY_SESSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading sessions', e);
    return DUMMY_SESSIONS;
  }
}

export function saveSessions(data: Session[]): void {
  try {
    localStorage.setItem(KEY_SESSIONS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving sessions', e);
  }
}

// ============================================================
// ANNOUNCEMENTS (Personal)
// ============================================================

export function loadAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(KEY_ANNOUNCEMENTS());
    if (!raw) {
      saveAnnouncements(DUMMY_ANNOUNCEMENTS);
      return DUMMY_ANNOUNCEMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading announcements', e);
    return DUMMY_ANNOUNCEMENTS;
  }
}

export function saveAnnouncements(data: Announcement[]): void {
  try {
    localStorage.setItem(KEY_ANNOUNCEMENTS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving announcements', e);
  }
}

// ============================================================
// TASKS (Personal)
// ============================================================

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(KEY_TASKS());
    if (!raw) {
      saveTasks(DUMMY_TASKS);
      return DUMMY_TASKS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading tasks', e);
    return DUMMY_TASKS;
  }
}

export function saveTasks(data: Task[]): void {
  try {
    localStorage.setItem(KEY_TASKS(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving tasks', e);
  }
}

// ============================================================
// CONFIG (Personal)
// ============================================================

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY_CONFIG());
    if (!raw) {
      saveConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading config', e);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(data: AppConfig): void {
  try {
    localStorage.setItem(KEY_CONFIG(), JSON.stringify(data));
  } catch (e) {
    console.error('Error saving config', e);
  }
}

// ============================================================
// BACKUP / RESTORE
// Backup covers only the logged-in user's personal data
// ============================================================

export interface BackupData {
  diplomas: Diploma[];
  diplomaTemplates?: DiplomaTemplate[];
  diplomaTypes?: DiplomaType[];
  instructors?: Instructor[];
  mentors?: Mentor[];
  students: Student[];
  sessions: Session[];
  announcements: Announcement[];
  tasks: Task[];
  templates: MessageTemplate[];
  config: AppConfig;
  backupDate: string;
}

export function generateBackupJSON(): string {
  const payload: BackupData = {
    diplomas: loadDiplomas(),
    students: loadStudents(),
    sessions: loadSessions(),
    announcements: loadAnnouncements(),
    tasks: loadTasks(),
    config: loadConfig(),
    // Include shared data for completeness in backup
    diplomaTemplates: loadDiplomaTemplates(),
    diplomaTypes: loadDiplomaTypes(),
    instructors: loadInstructors(),
    mentors: loadMentors(),
    templates: loadTemplates(),
    backupDate: new Date().toISOString()
  };
  return JSON.stringify(payload, null, 2);
}

export function restoreBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr) as Partial<BackupData>;
    if (!parsed) return false;

    if (parsed.diplomas && Array.isArray(parsed.diplomas)) {
      saveDiplomas(parsed.diplomas);
    }
    if (parsed.diplomaTemplates && Array.isArray(parsed.diplomaTemplates)) {
      saveDiplomaTemplates(parsed.diplomaTemplates);
    }
    if (parsed.diplomaTypes && Array.isArray(parsed.diplomaTypes)) {
      saveDiplomaTypes(parsed.diplomaTypes);
    }
    if (parsed.instructors && Array.isArray(parsed.instructors)) {
      saveInstructors(parsed.instructors);
    }
    if (parsed.mentors && Array.isArray(parsed.mentors)) {
      saveMentors(parsed.mentors);
    }
    if (parsed.students && Array.isArray(parsed.students)) {
      saveStudents(parsed.students);
    }
    if (parsed.sessions && Array.isArray(parsed.sessions)) {
      saveSessions(parsed.sessions);
    }
    if (parsed.announcements && Array.isArray(parsed.announcements)) {
      saveAnnouncements(parsed.announcements);
    }
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      saveTasks(parsed.tasks);
    }
    if (parsed.templates && Array.isArray(parsed.templates)) {
      saveTemplates(parsed.templates);
    }
    if (parsed.config && typeof parsed.config === 'object') {
      saveConfig(parsed.config as AppConfig);
    }
    return true;
  } catch (e) {
    console.error('Failed to parse or restore JSON backup file', e);
    return false;
  }
}

// ============================================================
// HELPER: Clear only this user's personal data from localStorage
// (does NOT clear shared data)
// ============================================================
export function clearPersonalData(): void {
  const prefix = getUserPrefix();
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
