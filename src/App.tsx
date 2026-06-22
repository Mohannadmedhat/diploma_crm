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
  Mentor
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

// Component Modules
import OperationsDashboard from './components/OperationsDashboard';
import DiplomaManager from './components/DiplomaManager';
import DiplomaTypesManager from './components/DiplomaTypesManager';
import InstructorsManager from './components/InstructorsManager';
import MentorsManager from './components/MentorsManager';
import DiplomaWorkspace from './components/DiplomaWorkspace';

import WeeklyOpsBoard from './components/WeeklyOpsBoard';
import TemplateManager from './components/TemplateManager';
import DataBackupRestore from './components/DataBackupRestore';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import WhatsAppAutomation from './components/WhatsAppAutomation';
import AIAssistant from './components/AIAssistant';
import { testGroqConnection } from './services/groq';
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
  CheckCircle2
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

  // Selector for active workspace/tab
  const [selectedDiplomaId, setSelectedDiplomaId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MainTab>('workspace');

  // Trigger app state reload on backup successfully restored
  const [reloadKey, setReloadKey] = useState(0);

  // Cloud Sync Status Indicator
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error' | 'local'>(
    isCloudConfigured ? 'synced' : 'local'
  );

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
      setDiplomas(loadedDips);
      setStudents(loadStudents());
      setSessions(loadSessions());
      setAnnouncements(loadAnnouncements());
      setTasks(loadTasks());
      setConfig(loadConfig());

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
            setDiplomas(cloudData.diplomas || []);
            setStudents(cloudData.students || []);
            setSessions(cloudData.sessions || []);
            setAnnouncements(cloudData.announcements || []);
            setTasks(cloudData.tasks || []);
            setConfig(cloudData.config || null);

            // Cache locally
            saveDiplomas(cloudData.diplomas || []);
            saveStudents(cloudData.students || []);
            saveSessions(cloudData.sessions || []);
            saveAnnouncements(cloudData.announcements || []);
            saveTasks(cloudData.tasks || []);
            if (cloudData.config) saveConfig(cloudData.config);

            if (cloudData.diplomas?.length > 0) {
              setSelectedDiplomaId(cloudData.diplomas[0].id);
            }
          } else {
            // First time: upload current local/demo data to cloud
            const personalPayload = {
              username: currentUser,
              diplomas: loadedDips,
              students: loadStudents(),
              sessions: loadSessions(),
              announcements: loadAnnouncements(),
              tasks: loadTasks(),
              config: loadConfig(),
              backupDate: new Date().toISOString()
            };
            await uploadCloudData(personalPayload);
          }

          // --- Shared data from cloud ---
          if (sharedData) {
            const cloudInstructors = sharedData.instructors || [];
            const { merged: mergedInstructors, wasUpdated: instructorsUpdated } = mergeDefaultInstructors(cloudInstructors);

            setDiplomaTypes(sharedData.diplomaTypes || loadDiplomaTypes());
            setInstructors(mergedInstructors);
            setMentors(sharedData.mentors || loadMentors());
            setTemplates(sharedData.templates || loadTemplates());

            // Cache locally
            if (sharedData.diplomaTypes) saveDiplomaTypes(sharedData.diplomaTypes);
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
      setSyncStatus(ok ? 'synced' : 'error');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
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
      setSyncStatus(ok ? 'synced' : 'error');
    } catch (e) {
      console.error(e);
      setSyncStatus('error');
    }
  };

  // Adjust selected diploma if somehow it goes invalid
  useEffect(() => {
    if (diplomas.length > 0 && (!selectedDiplomaId || !diplomas.some((d) => d.id === selectedDiplomaId))) {
      setSelectedDiplomaId(diplomas[0].id);
    }
  }, [diplomas, selectedDiplomaId]);

  // --- State Save Handlers (Personal) ---
  const handleSaveDiplomas = (newDiplomas: Diploma[]) => {
    setDiplomas(newDiplomas);
    saveDiplomas(newDiplomas);
    syncPersonalToCloud({ diplomas: newDiplomas });
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-cyan-500 flex items-center justify-center shadow-lg shadow-[#3B82F6]/10 shrink-0">
              <GraduationCap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5 leading-relaxed">
                منصة دبلومات الشؤون التعليمية والأكاديمية
                <span className="text-[10px] bg-blue-955 text-[#3B82F6] px-2 py-0.5 rounded-sm border border-blue-900/30 uppercase font-mono font-black">Workspace 2.0</span>
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
            {syncStatus === 'synced' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg select-none">
                <Cloud className="w-3.5 h-3.5" />
                <span>متزامن سحابياً</span>
              </div>
            )}
            {syncStatus === 'saving' && (
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-lg select-none">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </div>
            )}
            {syncStatus === 'error' && (
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
                {/* 1. DIPLOMA WORKSPACE */}
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
                  />
                )}

                {activeTab === 'whatsapp' && (
                  <WhatsAppAutomation
                    students={students}
                    sessions={sessions}
                    diplomas={diplomas}
                    templates={templates}
                    config={config}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-2xl shadow">
                        <InstructorsManager
                          instructors={instructors}
                          onSaveInstructors={handleSaveInstructors}
                          isAdmin={isAdmin}
                        />
                      </div>
                      <div className="bg-[#121212]/50 border border-[#1F1F1F] p-5 rounded-2xl shadow">
                        <MentorsManager
                          mentors={mentors}
                          onSaveMentors={handleSaveMentors}
                          isAdmin={isAdmin}
                        />
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
                    students={students}
                    diplomas={diplomas}
                    sessions={sessions}
                    tasks={tasks}
                    config={config}
                    onNavigateToSettings={() => setActiveTab('settings')}
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
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <footer className="mt-8 pt-4 border-t border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-zinc-500 select-none print:hidden font-sans">
            <span>حقوق التعمير والترميز محفوظة للمؤسسة التعليمية © {new Date().getFullYear()}</span>
            <span>النسخة الحالية جاهزة للترقية وربط واجهة تطبيقات API الخلفية</span>
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

    </div>
  );
}
