import React, { useState, useEffect } from 'react';
import {
  Student,
  Diploma,
  Session,
  Announcement,
  Task,
  MessageTemplate,
  AppConfig,
  DiplomaType,
  Instructor,
  Mentor,
  DEFAULT_DIPLOMA_TYPES
} from './types';

// Services
import {
  loadDiplomas,
  saveDiplomas,
  loadStudents,
  saveStudents,
  loadSessions,
  saveSessions,
  loadAnnouncements,
  saveAnnouncements,
  loadTasks,
  saveTasks,
  loadTemplates,
  saveTemplates,
  loadConfig,
  saveConfig,
  loadDiplomaTypes,
  saveDiplomaTypes,
  loadInstructors,
  saveInstructors,
  mergeDefaultInstructors,
  loadMentors,
  saveMentors,
  getCurrentUser,
  setCurrentUser as setStorageCurrentUser,
  logoutUser,
  clearPersonalData,
  setImpersonatedUser as setStorageImpersonatedUser
} from './services/storage';

// Component Modules — loaded lazily for better performance
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';

const OperationsDashboard = React.lazy(() => import('./components/OperationsDashboard'));
const DiplomaManager = React.lazy(() => import('./components/DiplomaManager'));
const DiplomaTypesManager = React.lazy(() => import('./components/DiplomaTypesManager'));
const InstructorsManager = React.lazy(() => import('./components/InstructorsManager'));
const MentorsManager = React.lazy(() => import('./components/MentorsManager'));
const DiplomaWorkspace = React.lazy(() => import('./components/DiplomaWorkspace'));
const WeeklyOpsBoard = React.lazy(() => import('./components/WeeklyOpsBoard'));
const TemplateManager = React.lazy(() => import('./components/TemplateManager'));
const DataBackupRestore = React.lazy(() => import('./components/DataBackupRestore'));
const WhatsAppAutomation = React.lazy(() => import('./components/WhatsAppAutomation'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
const QuickNotes = React.lazy(() => import('./components/QuickNotes'));

import { testGroqConnection } from './services/groq';
import {
  parseSessionTimeTo24h,
  getSessionDurationHours,
  addHoursToTime
} from './services/business';
import {
  isCloudConfigured,
  downloadCloudData,
  uploadCloudData,
  downloadSharedData,
  uploadSharedData,
  signOutCloud,
  setImpersonatedUserId as setSupabaseImpersonatedUserId
} from './services/supabase';

import {
  Sparkles,
  BookOpen,
  CalendarCheck2,
  ClipboardList,
  Sliders,
  GraduationCap,
  FolderSync,
  MessageSquare,
  Activity,
  Cloud,
  CloudOff,
  RefreshCw,
  Database,
  Shield,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type MainTab =
  | 'dashboard'
  | 'workspace'
  | 'whatsapp'
  | 'diplomas'
  | 'tasks'
  | 'settings'
  | 'ai-assistant';

// Admin username — only this user sees the Admin Panel button
const ADMIN_USERNAME = 'mohannad';

function getStudyDaysNumbers(studyDays?: string): number[] {
  if (!studyDays) return [];
  return studyDays.split(/[،,\s]+/)
    .map(d => {
      const day = d.trim();
      if (day.includes('أحد') || day.includes('الاحد')) return 0;
      if (day.includes('اثنين') || day.includes('الاثنين')) return 1;
      if (day.includes('ثلاثاء') || day.includes('الثلاثاء')) return 2;
      if (day.includes('أربعاء') || day.includes('الاربعاء')) return 3;
      if (day.includes('خميس') || day.includes('الخميس')) return 4;
      if (day.includes('جمعة') || day.includes('الجمعة')) return 5;
      if (day.includes('سبت') || day.includes('السبت')) return 6;
      return -1;
    })
    .filter(n => n !== -1);
}

function findNearestStudyDay(startDateStr: string, studyDaysNumbers: number[]): string {
  if (studyDaysNumbers.length === 0) return startDateStr;
  const d = new Date(startDateStr);
  for (let i = 0; i < 14; i++) {
    const checkDate = new Date(d);
    checkDate.setDate(d.getDate() + i);
    if (studyDaysNumbers.includes(checkDate.getDay())) {
      return checkDate.toISOString().split('T')[0];
    }
  }
  return startDateStr;
}

function generateSessionsForDiploma(
  diploma: Diploma,
  existingSessions: Session[]
): Session[] {
  if (!diploma.startDate || !diploma.endDate || !diploma.studyDays) {
    return existingSessions;
  }

  const start = new Date(diploma.startDate);
  const end = new Date(diploma.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return existingSessions;
  }

  const studyDaysNumbers = getStudyDaysNumbers(diploma.studyDays);
  if (studyDaysNumbers.length === 0) return existingSessions;

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter out sessions that belong to other diplomas
  const otherSessions = existingSessions.filter(s => s.diplomaId !== diploma.id);
  
  // Existing sessions of this diploma
  const thisDiplomaSessions = existingSessions.filter(s => s.diplomaId === diploma.id);
  
  // Preserved sessions (held, cancelled, postponed, or in the past)
  const preservedSessions = thisDiplomaSessions.filter(s => 
    s.date < todayStr || s.sessionStatus === 'Held' || s.sessionStatus === 'Cancelled' || s.sessionStatus === 'Postponed'
  );

  // Generate all study dates between start and end
  const generatedDates: string[] = [];
  let curr = new Date(start);
  while (curr <= end) {
    if (studyDaysNumbers.includes(curr.getDay())) {
      generatedDates.push(curr.toISOString().split('T')[0]);
    }
    curr.setDate(curr.getDate() + 1);
  }

  // Parse time
  const start24h = parseSessionTimeTo24h(diploma.sessionTime);
  const durationHours = getSessionDurationHours(diploma.studyDays);
  const end24h = addHoursToTime(start24h, durationHours);

  // Re-build the sessions list for this diploma
  const newSessions: Session[] = [];
  
  generatedDates.forEach((dateStr, index) => {
    // Check if we have a preserved session on this date
    const existing = preservedSessions.find(s => s.date === dateStr);
    if (existing) {
      newSessions.push(existing);
    } else {
      // Create a new scheduled session
      newSessions.push({
        id: `ses-gen-${diploma.id}-${dateStr}`,
        diplomaId: diploma.id,
        title: `المحاضرة رقم ${index + 1}`,
        instructor: diploma.instructorName || 'غير محدد',
        date: dateStr,
        startTime: start24h,
        endTime: end24h,
        notes: 'مجدولة تلقائياً بناءً على تاريخ نهاية الدبلومة',
        attendance: {},
        sessionStatus: 'Scheduled'
      });
    }
  });

  // Keep preserved sessions that might not fall on the new study days
  preservedSessions.forEach(ps => {
    if (!newSessions.some(ns => ns.id === ps.id)) {
      newSessions.push(ps);
    }
  });

  // Sort by date and correct lecture titles sequentially
  newSessions.sort((a, b) => a.date.localeCompare(b.date));
  newSessions.forEach((s, idx) => {
    if (s.title.startsWith('المحاضرة رقم')) {
      s.title = `المحاضرة رقم ${idx + 1}`;
    }
  });

  return [...otherSessions, ...newSessions];
}

export default function App() {
  // --- Global Application States ---
  const [currentUser, setCurrentUser] = useState<string | null>(getCurrentUser());
  const [diplomas, setDiplomas] = useState<Diploma[]>([]);
  const [diplomaTypes, setDiplomaTypes] = useState<DiplomaType[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Active trigger for scheduled messages
  const [activeAutoTriggerSchedule, setActiveAutoTriggerSchedule] = useState<{
    diplomaId: string;
    messageType: 'session_reminder' | 'absence_warning' | 'custom';
    messageTemplate: string;
    targetGroup: 'all' | 'absent_only' | 'exceeded_absences';
    scheduleId: string;
  } | null>(null);

  // Selector for active workspace/tab
  const [selectedDiplomaId, setSelectedDiplomaId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MainTab>('workspace');
  const [directoryTab, setDirectoryTab] = useState<'instructors' | 'mentors'>('instructors');

  // Trigger app state reload on backup successfully restored
  const [reloadKey, setReloadKey] = useState(0);

  // Cloud Sync Status Indicator
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'local' | 'offline'>(
    isCloudConfigured ? (navigator.onLine ? 'synced' : 'offline') : 'local'
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Admin panel visibility
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Impersonation state
  const [impersonatedUser, setImpersonatedUserState] = useState<string | null>(null);

  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark';
  });

  // Groq AI State Variables
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempModel, setTempModel] = useState('llama-3.3-70b-versatile');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');
  const [aiError, setAiError] = useState('');

  // Sync temp states with config when it loads
  useEffect(() => {
    if (config) {
      setTempApiKey(config.groqApiKey || '');
      setTempModel(config.groqModel || 'llama-3.3-70b-versatile');
    }
  }, [config]);

  const handleSaveAISettings = () => {
    if (!config) return;
    setAiError('');
    setAiSuccess('');
    const newConfig: AppConfig = {
      ...config,
      groqApiKey: tempApiKey.trim() || undefined,
      groqModel: tempModel
    };
    setConfig(newConfig);
    saveConfig(newConfig);
    syncPersonalToCloud({ config: newConfig });
    setAiSuccess('تم حفظ إعدادات الذكاء الاصطناعي بنجاح!');
  };

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    syncPersonalToCloud({ config: newConfig });
  };

  // Background Scheduler Loop
  useEffect(() => {
    if (!config?.scheduledMessages || config.scheduledMessages.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const due = config.scheduledMessages?.find(s => {
        if (s.status !== 'pending') return false;
        const scheduledTime = new Date(s.scheduledAt);
        const diffMs = now.getTime() - scheduledTime.getTime();
        // Trigger if scheduled time is reached or up to 30 minutes past (to avoid missing it)
        return diffMs >= 0 && diffMs < 30 * 60 * 1000;
      });

      if (due) {
        console.log('[Scheduler] Found due schedule:', due);
        setActiveAutoTriggerSchedule({
          diplomaId: due.diplomaId,
          messageType: due.messageType,
          messageTemplate: due.messageTemplate,
          targetGroup: due.targetGroup,
          scheduleId: due.id
        });
        setActiveTab('whatsapp');
      }
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [config?.scheduledMessages]);

  // Sync scheduled messages to the Chrome extension background worker
  useEffect(() => {
    if (config?.scheduledMessages) {
      window.postMessage({
        type: 'SAYED_UPDATE_SCHEDULES',
        schedules: config.scheduledMessages
      }, '*');
    }
  }, [config?.scheduledMessages]);

  const handleTestAIConnection = async () => {
    if (!tempApiKey.trim()) return;
    setAiError('');
    setAiSuccess('');
    setTestingAI(true);
    try {
      const ok = await testGroqConnection(tempApiKey.trim(), tempModel);
      if (ok) {
        setAiSuccess('تم الاتصال بـ Groq API بنجاح! المفتاح يعمل بشكل ممتاز.');
      } else {
        setAiError('فشل الاتصال: لم يستجب الموديل بشكل صحيح.');
      }
    } catch (e: any) {
      setAiError(e.message || 'فشل الاتصال: يرجى التحقق من المفتاح وصلاحية الإنترنت.');
    } finally {
      setTestingAI(false);
    }
  };

  useEffect(() => {
    const root = window.document.body;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  // Is current user the admin?
  const isAdmin = currentUser?.toLowerCase() === ADMIN_USERNAME;

  const handleStartImpersonation = (targetUsername: string, targetUserId: string) => {
    setStorageImpersonatedUser(targetUsername);
    setSupabaseImpersonatedUserId(targetUserId);
    setImpersonatedUserState(targetUsername);
    setReloadKey((prev) => prev + 1);
    setActiveTab('workspace');
  };

  const handleStopImpersonation = () => {
    setStorageImpersonatedUser(null);
    setSupabaseImpersonatedUserId(null);
    setImpersonatedUserState(null);
    setReloadKey((prev) => prev + 1);
  };

  // --- Initial Mount State Loading ---
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      // 1. Load local cache first (personal data) — instant UI
      const loadedDips = loadDiplomas();
      const activeDipIds = new Set(loadedDips.map(d => d.id));

      const loadedStudents = loadStudents().map(st => ({
        ...st,
        diplomaIds: (st.diplomaIds || []).filter(id => activeDipIds.has(id))
      }));
      const loadedSessions = loadSessions().filter(s => activeDipIds.has(s.diplomaId));
      const loadedTasks = loadTasks().filter(t => !t.diplomaId || activeDipIds.has(t.diplomaId));

      setDiplomas(loadedDips);
      setStudents(loadedStudents);
      setSessions(loadedSessions);
      setAnnouncements(loadAnnouncements());
      setTasks(loadedTasks);
      setConfig(loadConfig());

      // Save back cleaned data
      saveStudents(loadedStudents);
      saveSessions(loadedSessions);
      saveTasks(loadedTasks);

      // Load shared data from local cache
      setDiplomaTypes(loadDiplomaTypes());
      setInstructors(loadInstructors());
      setMentors(loadMentors());
      setTemplates(loadTemplates());

      if (loadedDips.length > 0) {
        setSelectedDiplomaId(loadedDips[0].id);
      }

      // 2. If cloud configured, fetch both user data + shared data in parallel
      if (isCloudConfigured) {
        setSyncStatus('saving');
        try {
          const [cloudData, sharedData] = await Promise.all([
            downloadCloudData(),
            downloadSharedData()
          ]);

          // --- Personal data from cloud ---
          if (cloudData) {
            const cloudDips = cloudData.diplomas || [];
            const cloudActiveDipIds = new Set(cloudDips.map(d => d.id));

            const cloudStudents = (cloudData.students || []).map(st => ({
              ...st,
              diplomaIds: (st.diplomaIds || []).filter(id => cloudActiveDipIds.has(id))
            }));
            const cloudSessions = (cloudData.sessions || []).filter(s => cloudActiveDipIds.has(s.diplomaId));
            const cloudTasks = (cloudData.tasks || []).filter(t => !t.diplomaId || cloudActiveDipIds.has(t.diplomaId));

            setDiplomas(cloudDips);
            setStudents(cloudStudents);
            setSessions(cloudSessions);
            setAnnouncements(cloudData.announcements || []);
            setTasks(cloudTasks);
            setConfig(cloudData.config || null);

            // Cache locally
            saveDiplomas(cloudDips);
            saveStudents(cloudStudents);
            saveSessions(cloudSessions);
            saveAnnouncements(cloudData.announcements || []);
            saveTasks(cloudTasks);
            if (cloudData.config) saveConfig(cloudData.config);

            if (cloudDips.length > 0) {
              setSelectedDiplomaId(cloudDips[0].id);
            }
          } else {
            // First time: upload current local/demo data to cloud
            const personalPayload = {
              username: currentUser,
              diplomas: loadedDips,
              students: loadedStudents,
              sessions: loadedSessions,
              announcements: loadAnnouncements(),
              tasks: loadedTasks,
              config: loadConfig(),
              backupDate: new Date().toISOString()
            };
            await uploadCloudData(personalPayload);
          }

          // --- Shared data from cloud ---
          if (sharedData) {
            const cloudInstructors = sharedData.instructors || [];
            const { merged: mergedInstructors, wasUpdated: instructorsUpdated } = mergeDefaultInstructors(cloudInstructors);

            // Auto-migrate: if Supabase has old diploma type IDs, reset to new defaults
            const REMOVED_DTYPE_IDS_APP = new Set(['dtype-ds', 'dtype-cyber', 'dtype-dev', 'dtype-mobile', 'dtype-cloud', 'dtype-pm', 'dtype-marketing']);
            const cloudTypes: DiplomaType[] = sharedData.diplomaTypes || [];
            const isStaleCloud = cloudTypes.length === 0 || cloudTypes.some((t: DiplomaType) => REMOVED_DTYPE_IDS_APP.has(t.id));
            const resolvedTypes = isStaleCloud ? DEFAULT_DIPLOMA_TYPES : cloudTypes;

            setDiplomaTypes(resolvedTypes);
            setInstructors(mergedInstructors);
            setMentors(sharedData.mentors || loadMentors());
            setTemplates(sharedData.templates || loadTemplates());

            // Cache locally
            saveDiplomaTypes(resolvedTypes);
            saveInstructors(mergedInstructors);
            if (sharedData.mentors) saveMentors(sharedData.mentors);
            if (sharedData.templates) saveTemplates(sharedData.templates);

            if (instructorsUpdated) {
              const updatedPayload = {
                ...sharedData,
                instructors: mergedInstructors,
                updatedAt: new Date().toISOString()
              };
              await uploadSharedData(updatedPayload);
            }
          } else {
            // First time: upload current shared data to cloud
            const sharedPayload = {
              diplomaTypes: loadDiplomaTypes(),
              instructors: loadInstructors(),
              mentors: loadMentors(),
              templates: loadTemplates(),
              updatedAt: new Date().toISOString()
            };
            await uploadSharedData(sharedPayload);
          }

          setSyncStatus('synced');
        } catch (e) {
          console.error(e);
          setSyncStatus('error');
        }
      }
    };

    loadData();
  }, [reloadKey, currentUser]);

  const handleLoginSuccess = (username: string) => {
    setStorageCurrentUser(username);
    setCurrentUser(username);
    setReloadKey((prev) => prev + 1);
    setActiveTab('workspace');
  };

  const handleLogout = async () => {
    if (isCloudConfigured) {
      await signOutCloud();
    }
    logoutUser();
    setCurrentUser(null);
    setDiplomas([]);
    setDiplomaTypes([]);
    setInstructors([]);
    setMentors([]);
    setStudents([]);
    setSessions([]);
    setAnnouncements([]);
    setTasks([]);
    setTemplates([]);
    setConfig(null);
    setSelectedDiplomaId('');
    setShowAdminPanel(false);
  };

  // --- Cloud sync helpers ---

  /** Sync personal data to cloud */
  const syncPersonalToCloud = async (updates?: {
    diplomas?: Diploma[];
    students?: Student[];
    sessions?: Session[];
    announcements?: Announcement[];
    tasks?: Task[];
    config?: AppConfig | null;
  }) => {
    if (!isCloudConfigured) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      localStorage.setItem('unsynced_personal', 'true');
      return;
    }
    setSyncStatus('saving');
    try {
      const payload = {
        username: currentUser,
        diplomas: updates?.diplomas ?? diplomas,
        students: updates?.students ?? students,
        sessions: updates?.sessions ?? sessions,
        announcements: updates?.announcements ?? announcements,
        tasks: updates?.tasks ?? tasks,
        config: updates?.config !== undefined ? updates.config : config,
        backupDate: new Date().toISOString()
      };
      const ok = await uploadCloudData(payload);
      if (ok) {
        setSyncStatus('synced');
        localStorage.removeItem('unsynced_personal');
      } else {
        setSyncStatus('error');
        localStorage.setItem('unsynced_personal', 'true');
      }
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      localStorage.setItem('unsynced_personal', 'true');
    }
  };

  /** Sync shared data to cloud */
  const syncSharedToCloud = async (updates?: {
    diplomaTypes?: DiplomaType[];
    instructors?: Instructor[];
    mentors?: Mentor[];
    templates?: MessageTemplate[];
  }) => {
    if (!isCloudConfigured) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      localStorage.setItem('unsynced_shared', 'true');
      return;
    }
    setSyncStatus('saving');
    try {
      const payload = {
        diplomaTypes: updates?.diplomaTypes ?? diplomaTypes,
        instructors: updates?.instructors ?? instructors,
        mentors: updates?.mentors ?? mentors,
        templates: updates?.templates ?? templates,
        updatedAt: new Date().toISOString()
      };
      const ok = await uploadSharedData(payload);
      if (ok) {
        setSyncStatus('synced');
        localStorage.removeItem('unsynced_shared');
      } else {
        setSyncStatus('error');
        localStorage.setItem('unsynced_shared', 'true');
      }
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
      localStorage.setItem('unsynced_shared', 'true');
    }
  };

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const hasUnsyncedPersonal = localStorage.getItem('unsynced_personal') === 'true';
      const hasUnsyncedShared = localStorage.getItem('unsynced_shared') === 'true';
      
      if (hasUnsyncedPersonal || hasUnsyncedShared) {
        setSyncStatus('saving');
        try {
          if (hasUnsyncedPersonal) {
            await syncPersonalToCloud();
          }
          if (hasUnsyncedShared) {
            await syncSharedToCloud();
          }
        } catch (e) {
          console.error('Error auto-syncing on restore connection', e);
        }
      } else {
        setSyncStatus('synced');
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (isCloudConfigured) {
        setSyncStatus('offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [diplomas, students, sessions, announcements, tasks, config, diplomaTypes, instructors, mentors, templates]);

  // Adjust selected diploma if somehow it goes invalid
  useEffect(() => {
    if (diplomas.length > 0 && (!selectedDiplomaId || !diplomas.some((d) => d.id === selectedDiplomaId))) {
      setSelectedDiplomaId(diplomas[0].id);
    }
  }, [diplomas, selectedDiplomaId]);

  // --- State Save Handlers (Personal) ---
  const handleSaveDiplomas = (newDiplomas: Diploma[]) => {
    // Detect which diploma IDs were removed
    const newIds = new Set(newDiplomas.map((d) => d.id));
    const removedIds = diplomas.map((d) => d.id).filter((id) => !newIds.has(id));

    // Also detect which diplomas had their studyDays/schedule changed
    let sessionsUpdated = false;
    let tasksUpdated = false;
    let updatedSessions = [...sessions];
    let updatedTasks = [...tasks];
    const todayStr = new Date().toISOString().split('T')[0];

    newDiplomas.forEach((newDip) => {
      const oldDip = diplomas.find((d) => d.id === newDip.id);
      
      const isNew = !oldDip;
      const isScheduleChanged = oldDip && (
        oldDip.startDate !== newDip.startDate ||
        oldDip.endDate !== newDip.endDate ||
        oldDip.studyDays !== newDip.studyDays ||
        oldDip.sessionTime !== newDip.sessionTime ||
        oldDip.instructorName !== newDip.instructorName
      );

      if (isNew || isScheduleChanged) {
        if (newDip.startDate && newDip.endDate && newDip.studyDays) {
          const generated = generateSessionsForDiploma(newDip, updatedSessions);
          updatedSessions = generated;
          sessionsUpdated = true;
        }

        // Also shift future tasks if study days changed
        if (oldDip && oldDip.studyDays !== newDip.studyDays) {
          const newDaysNumbers = getStudyDaysNumbers(newDip.studyDays);
          if (newDaysNumbers.length > 0) {
            updatedTasks = updatedTasks.map((t) => {
              if (t.diplomaId === newDip.id && t.dueDate >= todayStr && t.status !== 'Completed') {
                const newDate = findNearestStudyDay(t.dueDate, newDaysNumbers);
                if (newDate !== t.dueDate) {
                  tasksUpdated = true;
                  return { ...t, dueDate: newDate };
                }
              }
              return t;
            });
          }
        }
      }
    });

    setDiplomas(newDiplomas);
    saveDiplomas(newDiplomas);
    syncPersonalToCloud({ diplomas: newDiplomas });

    // Clean up student enrollment references for removed diplomas
    const cleanedStudents = students.map((st) => {
      const filtered = (st.diplomaIds || []).filter((id) => !removedIds.includes(id));
      if (filtered.length !== (st.diplomaIds || []).length) {
        return { ...st, diplomaIds: filtered };
      }
      return st;
    });
    const studentsChanged = cleanedStudents.some((st, idx) => st !== students[idx]);
    if (studentsChanged) {
      setStudents(cleanedStudents);
      saveStudents(cleanedStudents);
      syncPersonalToCloud({ students: cleanedStudents });
    }

    // Cascade delete: remove sessions & tasks linked to removed diplomas
    if (removedIds.length > 0) {
      const cleanedSessions = updatedSessions.filter((s) => !removedIds.includes(s.diplomaId));
      setSessions(cleanedSessions);
      saveSessions(cleanedSessions);
      syncPersonalToCloud({ sessions: cleanedSessions });

      const cleanedTasks = updatedTasks.filter((t) => !t.diplomaId || !removedIds.includes(t.diplomaId));
      setTasks(cleanedTasks);
      saveTasks(cleanedTasks);
      syncPersonalToCloud({ tasks: cleanedTasks });
    } else {
      if (sessionsUpdated) {
        setSessions(updatedSessions);
        saveSessions(updatedSessions);
        syncPersonalToCloud({ sessions: updatedSessions });
      }
      if (tasksUpdated) {
        setTasks(updatedTasks);
        saveTasks(updatedTasks);
        syncPersonalToCloud({ tasks: updatedTasks });
      }
    }
  };


  const handleSaveStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    saveStudents(newStudents);
    syncPersonalToCloud({ students: newStudents });
  };

  const handleSaveSessions = (newSessions: Session[]) => {
    setSessions(newSessions);
    saveSessions(newSessions);
    syncPersonalToCloud({ sessions: newSessions });
  };

  const handleSaveAnnouncements = (newAnnouncements: Announcement[]) => {
    setAnnouncements(newAnnouncements);
    saveAnnouncements(newAnnouncements);
    syncPersonalToCloud({ announcements: newAnnouncements });
  };

  const handleSaveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    saveTasks(newTasks);
    syncPersonalToCloud({ tasks: newTasks });
  };

  // --- State Save Handlers (Shared) ---
  const handleSaveDiplomaTypes = (newTypes: DiplomaType[]) => {
    setDiplomaTypes(newTypes);
    saveDiplomaTypes(newTypes);
    syncSharedToCloud({ diplomaTypes: newTypes });
  };

  const handleSaveInstructors = (newInsts: Instructor[]) => {
    setInstructors(newInsts);
    saveInstructors(newInsts);
    syncSharedToCloud({ instructors: newInsts });
  };

  const handleSaveMentors = (newMents: Mentor[]) => {
    setMentors(newMents);
    saveMentors(newMents);
    syncSharedToCloud({ mentors: newMents });
  };

  const handleSaveTemplates = (newTemplates: MessageTemplate[]) => {
    setTemplates(newTemplates);
    saveTemplates(newTemplates);
    syncSharedToCloud({ templates: newTemplates });
  };

  const handleRestoreReload = () => {
    setReloadKey((prev) => prev + 1);
    setActiveTab('workspace');
  };

  // Reset: clears only the current user's personal data
  const handleSystemReset = async () => {
    if (window.confirm('🚨 تصفير بيانات حسابك الشخصي:\nهل تريد حذف دبلوماتك وطلابك ومهامك الخاصة واسترجاع البيانات الافتراضية؟ لا يمكن التعافي.')) {
      // Clear personal local cache
      clearPersonalData();

      if (isCloudConfigured) {
        setSyncStatus('saving');
        await uploadCloudData({
          username: currentUser,
          diplomas: [],
          students: [],
          sessions: [],
          announcements: [],
          tasks: [],
          config: null,
          backupDate: new Date().toISOString()
        });
        setSyncStatus('synced');
      }
      handleRestoreReload();
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className="min-h-screen bg-[#070707] text-[#D4D4D4] flex flex-col antialiased selection:bg-[#3B82F6]/30 selection:text-white"
      dir="rtl"
      id="app-root-diploma-ops"
    >
      {/* Admin Panel Modal */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            onImpersonate={handleStartImpersonation}
          />
        )}
      </AnimatePresence>

      {/* Impersonation Warning Banner */}
      {impersonatedUser && (
        <div className="bg-amber-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-3 shadow-md select-none sticky top-0 z-50">
          <span>⚠️ أنت تتصفح وتعدل الآن بصفتك المستخدم: <span className="uppercase text-black underline font-black">{impersonatedUser}</span> (تحكم كامل بصفة الأدمن)</span>
          <button
            onClick={handleStopImpersonation}
            className="px-3 py-1 bg-black text-white hover:bg-zinc-800 transition-colors rounded text-[10px] font-bold cursor-pointer"
          >
            العودة لحسابي (الأدمن)
          </button>
        </div>
      )}

      {/* Upper Navigation Premium Header Bar */}
      <header className="bg-[#121212]/80 border-b border-[#1F1F1F] sticky top-0 z-50 backdrop-blur-md select-none print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
              <img src="/logo.png" className="w-full h-full object-contain p-0.5" alt="SAYED Logo" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5 leading-relaxed">
                سيد | SAYED CRM
                <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-sm border border-indigo-900/30 uppercase font-mono font-black animate-pulse">Workspace 2.0</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">لوحة ذكية لتعقب المواظبة اليومية والتحذيرات التلقائية عبر WhatsApp</p>
            </div>
          </div>

          {/* Persistent Diploma Selector */}
          {diplomas.length > 0 && (
            <div className="flex items-center gap-2 bg-[#171717] border border-[#262626] hover:border-zinc-700 transition-all rounded-lg px-3.5 py-2.5 focus-within:border-[#3B82F6] shadow-sm font-sans" id="header-diploma-selector">
              <span className="text-[11px] font-black text-indigo-400 shrink-0 select-none">الدبلومة الحالية:</span>
              <select
                value={selectedDiplomaId}
                onChange={(e) => {
                  setSelectedDiplomaId(e.target.value);
                  setActiveTab('workspace');
                }}
                className="bg-transparent text-xs text-white outline-hidden cursor-pointer font-bold w-48 sm:w-64 max-w-xs focus:ring-0"
              >
                {diplomas.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#121212] text-white">
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Info & Controls */}
          <div className="flex items-center gap-3 text-xs font-sans">

            {/* Cloud Sync Status */}
            {!isOnline && isCloudConfigured && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-800/10 border border-zinc-700/20 px-2.5 py-1.5 rounded-lg select-none">
                <CloudOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>وضع عدم الاتصال (أوفلاين)</span>
              </div>
            )}
            {isOnline && syncStatus === 'synced' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg select-none">
                <Cloud className="w-3.5 h-3.5" />
                <span>متزامن سحابياً</span>
              </div>
            )}
            {syncStatus === 'saving' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg select-none">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري المزامنة...</span>
              </div>
            )}
            {isOnline && syncStatus === 'error' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg select-none animate-pulse">
                <CloudOff className="w-3.5 h-3.5" />
                <span>فشل المزامنة</span>
              </div>
            )}
            {syncStatus === 'local' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg select-none">
                <Database className="w-3.5 h-3.5" />
                <span>وضع محلي</span>
              </div>
            )}

            {/* Unsynced Changes Retry button */}
            {isOnline && (localStorage.getItem('unsynced_personal') === 'true' || localStorage.getItem('unsynced_shared') === 'true') && syncStatus !== 'saving' && (
              <button
                onClick={() => {
                  syncPersonalToCloud();
                  syncSharedToCloud();
                }}
                className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg select-none hover:bg-amber-500/20 cursor-pointer animate-pulse font-bold"
                title="توجد تعديلات محلية غير مرفوعة. اضغط للمزامنة اليدوية فوراً"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>رفع المعلق</span>
              </button>
            )}

            {/* Current User Display */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-zinc-500">المستخدم الحالي:</span>
              <span className="font-bold text-indigo-400 uppercase">{currentUser}</span>
            </div>

            {/* Admin Panel Button — visible to admin only */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="px-3.5 py-2.5 bg-amber-600/10 border border-amber-500/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-md select-none flex items-center gap-1.5"
                title="لوحة تحكم الأدمن"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">الأدمن</span>
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
              className="px-3 py-2.5 bg-zinc-800/10 border border-zinc-700/20 hover:bg-zinc-700/20 text-zinc-400 hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-md select-none flex items-center justify-center"
              title={theme === 'dark' ? 'تفعيل الوضع المضيء (Light Mode)' : 'تفعيل الوضع الداكن (Dark Mode)'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3.5 py-2.5 bg-rose-600/10 border border-rose-500/20 hover:bg-rose-600 text-[#f87171] hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-md select-none"
            >
              تسجيل الخروج
            </button>
          </div>

        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Navigation Sidebar Drawer */}
        <aside className="lg:col-span-3 space-y-3 select-none print:hidden">
          <div className="bg-[#121212]/50 border border-[#1F1F1F] rounded-xl p-4 space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase block pr-2 mb-2">أقسام وموديولات المنصة</span>

            {[
              { id: 'workspace', label: 'مساحة عمل الدبلومة الحالية', icon: GraduationCap },
              { id: 'whatsapp', label: 'أتمتة ومراسلات الواتساب', icon: MessageSquare },
              { id: 'dashboard', label: 'العمليات واللوحة الرئيسية', icon: Activity },
              { id: 'ai-assistant', label: 'مساعد الذكاء الاصطناعي', icon: Sparkles },
              { id: 'diplomas', label: 'إدارة وتصنيف الدبلومات', icon: BookOpen },
              { id: 'tasks', label: 'لوحة العمليات الأسبوعية', icon: ClipboardList },
              { id: 'settings', label: 'صيانة وقوالب النظام', icon: Sliders }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as MainTab)}
                  className={`w-full text-right px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#1C1C1C]'
                  }`}
                  id={`side-nav-btn-${tab.id}`}
                >
                  <TabIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick instructions widget */}
          <div className="p-4 bg-[#111]/35 border border-[#222] rounded-xl text-[11px] text-zinc-500 leading-relaxed space-y-1 bg-neutral-950 font-sans">
            <span className="font-bold text-zinc-400 block pb-1 border-b border-[#222]">ℹ️ دليل العمل السريع:</span>
            <p className="pt-1">1. اختر دبلومًا نشطًا من <strong>"الدبلومة الحالية"</strong> بالأعلى لفتح مركز التحكم.</p>
            <p>2. استخدم موديول <strong>"المحاضرات صفي"</strong> و<strong>"الطلاب"</strong> داخل مساحة عملك لإدارة الحضور والمراسلات.</p>
          </div>
        </aside>

        {/* Content Workspace Area */}
        <section className="lg:col-span-9 bg-[#121212]/30 border border-[#1F1F1F] rounded-2xl p-6 shadow-xl relative min-h-[500px] flex flex-col justify-between">

          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.12 }}
              >
                <React.Suspense fallback={
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-500">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs font-sans">جارٍ تحميل الصفحة...</span>
                  </div>
                }>

                {activeTab === 'workspace' && (
                  <DiplomaWorkspace
                    diplomaId={selectedDiplomaId}
                    diplomas={diplomas}
                    students={students}
                    sessions={sessions}
                    diplomaTypes={diplomaTypes}
                    templates={templates}
                    instructors={instructors}
                    mentors={mentors}
                    minAttendanceRate={config?.minAttendanceRate || 75}
                    onSaveDiplomas={handleSaveDiplomas}
                    onSaveStudents={handleSaveStudents}
                    onSaveSessions={handleSaveSessions}
                    onSaveInstructors={handleSaveInstructors}
                    onSaveMentors={handleSaveMentors}
                    tasks={tasks}
                  />
                )}

                {activeTab === 'whatsapp' && (
                  <WhatsAppAutomation
                    students={students}
                    sessions={sessions}
                    diplomas={diplomas}
                    templates={templates}
                    config={config}
                    onSaveConfig={handleSaveConfig}
                    autoTriggerOptions={activeAutoTriggerSchedule}
                    onClearAutoTrigger={() => setActiveAutoTriggerSchedule(null)}
                  />
                )}

                {activeTab === 'dashboard' && (
                  <OperationsDashboard
                    students={students}
                    diplomas={diplomas}
                    sessions={sessions}
                    announcements={announcements}
                    templates={templates}
                    diplomaTypes={diplomaTypes}
                    onSaveDiplomas={handleSaveDiplomas}
                    onSaveStudents={handleSaveStudents}
                    onSaveSessions={handleSaveSessions}
                    tasks={tasks}
                    onSaveTasks={handleSaveTasks}
                  />
                )}

                {activeTab === 'diplomas' && (
                  <div className="space-y-8">
                    <DiplomaManager
                      diplomas={diplomas}
                      templates={templates}
                      diplomaTypes={diplomaTypes}
                      students={students}
                      instructors={instructors}
                      mentors={mentors}
                      onSaveDiplomas={handleSaveDiplomas}
                      onSaveInstructors={handleSaveInstructors}
                      onSaveMentors={handleSaveMentors}
                    />

                    <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-2xl shadow">
                      <DiplomaTypesManager
                        types={diplomaTypes}
                        onSaveTypes={handleSaveDiplomaTypes}
                        isAdmin={isAdmin}
                      />
                    </div>

                    {/* Unified Lecturers & Mentors Directory Card */}
                    <div className="bg-[#121212]/50 border border-[#1F1F1F] p-6 rounded-2xl shadow-xl space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-4">
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-500" />
                            دليل الأكاديميين والمتابعين (Faculty & Mentors Directory)
                          </h4>
                          <span className="text-[10px] text-zinc-550 block font-sans mt-0.5">
                            تنظيم وإدارة السادة أعضاء هيئة التدريس والمنسقين المسؤولين عن المتابعة الأكاديمية والتقنية.
                          </span>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-[#0A0A0A] p-1 rounded-lg border border-zinc-900 self-start md:self-center font-sans">
                          <button
                            onClick={() => setDirectoryTab('instructors')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              directoryTab === 'instructors'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            👨‍🏫 المحاضرون الأكاديميون ({instructors.length})
                          </button>
                          <button
                            onClick={() => setDirectoryTab('mentors')}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              directoryTab === 'mentors'
                                ? 'bg-teal-600 text-white shadow-md'
                                : 'text-zinc-500 hover:text-zinc-200'
                            }`}
                          >
                            👥 المنسقون والمنتورز ({mentors.length})
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        {directoryTab === 'instructors' ? (
                          <InstructorsManager
                            instructors={instructors}
                            onSaveInstructors={handleSaveInstructors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                            sessions={sessions}
                          />
                        ) : (
                          <MentorsManager
                            mentors={mentors}
                            onSaveMentors={handleSaveMentors}
                            isAdmin={isAdmin}
                            diplomas={diplomas}
                            sessions={sessions}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}



                {activeTab === 'tasks' && (
                  <WeeklyOpsBoard
                    diplomas={diplomas}
                    sessions={sessions}
                    tasks={tasks}
                    onSaveSessions={handleSaveSessions}
                    onSaveTasks={handleSaveTasks}
                  />
                )}

                                {activeTab === 'ai-assistant' && (
                  <AIAssistant
                    mode="embedded"
                    currentUser={currentUser}
                    students={students}
                    diplomas={diplomas}
                    sessions={sessions}
                    tasks={tasks}
                    config={config}
                    instructors={instructors}
                    diplomaTypes={diplomaTypes}
                    onNavigateToSettings={() => setActiveTab('settings')}
                    onSaveDiplomas={handleSaveDiplomas}
                    onSaveStudents={handleSaveStudents}
                    onSaveSessions={handleSaveSessions}
                    onSaveTasks={handleSaveTasks}
                    onSaveConfig={handleSaveConfig}
                  />
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-xl">
                      <TemplateManager
                        templates={templates}
                        onSaveTemplates={handleSaveTemplates}
                        isAdmin={isAdmin}
                      />
                    </div>

                    <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-xl">
                      <DataBackupRestore onSuccessRestore={handleRestoreReload} />
                    </div>

                    {/* GROQ AI SETTINGS CARD */}
                    <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-xl text-right" dir="rtl">
                      <div className="text-xs font-bold text-indigo-400 border-b border-[#1F1F1F] pb-2 flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>إعدادات الذكاء الاصطناعي (Groq AI)</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">مفتاح API الخاص بـ Groq (Groq API Key)</label>
                          <div className="flex gap-2">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={tempApiKey}
                              onChange={(e) => setTempApiKey(e.target.value)}
                              placeholder="gsk_..."
                              className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="px-3 py-2 bg-[#1C1C1C] border border-[#262626] text-xs text-zinc-350 rounded-lg hover:text-white cursor-pointer"
                            >
                              {showApiKey ? 'إخفاء' : 'إظهار'}
                            </button>
                          </div>
                          <span className="text-[9px] text-zinc-550 block mt-1 leading-relaxed">
                            يمكنك الحصول على مفتاح API مجاني تماماً من منصة Groq Cloud لتشغيل المساعد الذكي وصائغ الرسائل.
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">موديل الذكاء الاصطناعي المفضل (Groq Model)</label>
                          <select
                            value={tempModel}
                            onChange={(e) => setTempModel(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right cursor-pointer"
                          >
                            <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended for Arabic)</option>
                            <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast & Light)</option>
                            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                          </select>
                        </div>

                        {aiError && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{aiError}</span>
                          </div>
                        )}

                        {aiSuccess && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 text-xs rounded flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-450 shrink-0" />
                            <span>{aiSuccess}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1F1F1F]">
                          <button
                            type="button"
                            onClick={handleTestAIConnection}
                            disabled={testingAI || !tempApiKey.trim()}
                            className="px-4 py-2 bg-[#1C1C1C] border border-[#262626] hover:border-zinc-500 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {testingAI ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>جاري الاختبار...</span>
                              </>
                            ) : (
                              <span>اختبار الاتصال ⚡</span>
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleSaveAISettings}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black cursor-pointer transition-colors shadow-md"
                          >
                            حفظ إعدادات الذكاء الاصطناعي
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Shared data info banner */}
                    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 text-xs text-indigo-300 leading-relaxed font-sans">
                      <span className="font-bold text-indigo-400 block mb-1">ℹ️ البيانات المشتركة بين المستخدمين:</span>
                      <p>أنواع الدبلومات · المحاضرون · المنتورون · قوالب الرسائل — هذه البيانات مشتركة بين كل المستخدمين. أي تعديل فيها يظهر للجميع عند تحديث الصفحة.</p>
                    </div>

                    {/* Reset safety triggers — clears personal data only */}
                    <div className="bg-rose-955/10 border border-rose-900/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="space-y-0.5 text-right font-sans">
                        <span className="text-xs font-bold text-rose-300 block">منطقة الخطر: إعادة تصفير بياناتك الشخصية</span>
                        <span className="text-[10px] text-rose-400 block leading-relaxed">سيمسح دبلوماتك وطلابك ومحاضراتك ومهامك — دون المساس بالبيانات المشتركة.</span>
                      </div>
                      <button
                        onClick={handleSystemReset}
                        className="px-4 py-2 bg-[#7F1D1D] hover:bg-red-700 text-rose-100 rounded text-xs font-semibold cursor-pointer transition-colors shrink-0"
                      >
                        مسح بياناتي الشخصية
                      </button>
                    </div>
                  </div>
                )}
                </React.Suspense>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-4 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-zinc-500 select-none print:hidden font-sans">
            <span>تم التطوير والبرمجة بواسطة م. مهند مدحت 🚀</span>
            <span>منصة العمليات الأكاديمية وإشعارات WhatsApp الذكية</span>
          </footer>

        </section>

      </main>

      {/* Floating Quick Switch Button */}
      {diplomas.length > 1 && (
        <div className="fixed bottom-6 left-6 z-50 print:hidden select-none font-sans">
          <button
            onClick={() => {
              const idx = diplomas.findIndex((d) => d.id === selectedDiplomaId);
              const nextIdx = (idx + 1) % diplomas.length;
              setSelectedDiplomaId(diplomas[nextIdx].id);
            }}
            className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-505 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-full shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/20"
            title="مبدل الدبلومات السريع"
          >
            <Activity className="w-4 h-4 text-white" />
            <span className="text-[11px] font-bold">تبديل دبلومة سريع</span>
          </button>
        </div>
      )}

      {/* Quick Notes Floating Panel */}
      <React.Suspense fallback={null}>
        <QuickNotes
          currentDiplomaId={selectedDiplomaId || undefined}
          currentDiplomaName={diplomas.find(d => d.id === selectedDiplomaId)?.name}
        />
      </React.Suspense>

      {/* Global Floating AI Copilot Assistant */}
      {activeTab !== 'ai-assistant' && (
        <React.Suspense fallback={null}>
          <AIAssistant
            mode="floating"
            currentUser={currentUser}
            students={students}
            diplomas={diplomas}
            sessions={sessions}
            tasks={tasks}
            config={config}
            instructors={instructors}
            diplomaTypes={diplomaTypes}
            onNavigateToSettings={() => {
              setActiveTab('settings');
              window.dispatchEvent(new CustomEvent('TOGGLE_SAYED_AI'));
            }}
            onSaveDiplomas={handleSaveDiplomas}
            onSaveStudents={handleSaveStudents}
            onSaveSessions={handleSaveSessions}
            onSaveTasks={handleSaveTasks}
            onSaveConfig={handleSaveConfig}
          />
        </React.Suspense>
      )}

    </div>
  );
}
