import React, { useState, useMemo } from 'react';
import { Diploma, Session, Task, TaskCategory } from '../types';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  ClipboardCheck,
  UserCheck,
  Trash2,
  Edit3,
  X,
  Save,
  GraduationCap,
  Sparkles,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseSessionTimeTo24h, getSessionDurationHours, addHoursToTime } from '../services/business';

interface WeeklyOpsBoardProps {
  diplomas: Diploma[];
  sessions: Session[];
  tasks: Task[];
  onSaveSessions: (sessions: Session[]) => void;
  onSaveTasks: (tasks: Task[]) => void;
}

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const ARABIC_DAY_MAP: Record<string, number> = {
  'الأحد': 0, 'الاحد': 0,
  'الاثنين': 1, 'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3, 'الاربعاء': 3,
  'الخميس': 4,
  'الجمعة': 5,
  'السبت': 6
};

export const CATEGORY_MAP: Record<TaskCategory, { label: string; badgeClass: string; borderClass: string; colorDotClass: string }> = {
  Academic: {
    label: 'أكاديمي',
    badgeClass: 'bg-violet-950/30 border-violet-900/30 text-violet-400',
    borderClass: 'border-violet-500/30 bg-violet-950/5 shadow-sm shadow-violet-500/5',
    colorDotClass: 'bg-violet-500',
  },
  Logistics: {
    label: 'لوجستيات',
    badgeClass: 'bg-cyan-950/30 border-cyan-900/30 text-cyan-400',
    borderClass: 'border-cyan-500/30 bg-cyan-950/5 shadow-sm shadow-cyan-500/5',
    colorDotClass: 'bg-cyan-500',
  },
  Communication: {
    label: 'تواصل',
    badgeClass: 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400',
    borderClass: 'border-emerald-500/30 bg-emerald-950/5 shadow-sm shadow-emerald-500/5',
    colorDotClass: 'bg-emerald-500',
  },
  Financial: {
    label: 'مالي',
    badgeClass: 'bg-amber-950/30 border-amber-900/30 text-amber-400',
    borderClass: 'border-amber-500/30 bg-amber-950/5 shadow-sm shadow-amber-500/5',
    colorDotClass: 'bg-amber-500',
  },
  Other: {
    label: 'عام',
    badgeClass: 'bg-slate-950/30 border-slate-900/30 text-slate-400',
    borderClass: 'border-slate-500/30 bg-slate-950/5 shadow-sm shadow-slate-500/5',
    colorDotClass: 'bg-slate-500',
  },
};

function getStudyDaysNumbers(studyDays?: string): number[] {
  if (!studyDays) return [];
  return studyDays.split(/[،,\s]+/)
    .map(d => {
      const trimmed = d.trim();
      const clean = trimmed.startsWith('و') ? trimmed.substring(1).trim() : trimmed;
      return ARABIC_DAY_MAP[clean];
    })
    .filter(n => n !== undefined);
}

// Returns the Saturday (start of Arabic week) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  // Saturday = 6, we want Saturday as start
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = (day >= 6) ? 0 : day + 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Returns array of 7 days (Sat to Fri) for a week starting from weekStart
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export default function WeeklyOpsBoard({
  diplomas,
  sessions,
  tasks,
  onSaveSessions,
  onSaveTasks,
}: WeeklyOpsBoardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [refDate, setRefDate] = useState(() => today);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedGridDate, setSelectedGridDate] = useState<Date>(() => today);
  
  const weekStart = useMemo(() => getWeekStart(refDate), [refDate]);
  const [showAddTask, setShowAddTask] = useState<string | null>(null); // date string for which day
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('Medium');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Other');
  const [newTaskDiplomaId, setNewTaskDiplomaId] = useState<string>('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskDate, setEditingTaskDate] = useState('');

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const CALENDAR_HEADERS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  const monthGridDays = useMemo(() => {
    const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const startOfGrid = getWeekStart(firstDay);
    const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    const endOfGrid = addDays(getWeekStart(lastDay), 6);
    
    const days = [];
    let curr = new Date(startOfGrid);
    while (curr <= endOfGrid) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [refDate]);

  const goToPrevWeek = () => setRefDate(d => addDays(d, -7));
  const goToNextWeek = () => setRefDate(d => addDays(d, 7));
  
  const goToPrevMonth = () => setRefDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setRefDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  
  const goToCurrentPeriod = () => {
    setRefDate(today);
    setSelectedGridDate(today);
  };

  const isCurrentPeriod = viewMode === 'week' 
    ? formatDateStr(weekStart) === formatDateStr(getWeekStart(today))
    : refDate.getMonth() === today.getMonth() && refDate.getFullYear() === today.getFullYear();

  // For each day, find sessions that happened the day BEFORE (i.e., post-session tasks appear next day)
  const getPostSessionTasksForDay = (day: Date): Session[] => {
    const prev = addDays(day, -1);
    const prevStr = formatDateStr(prev);
    return sessions.filter(s => s.date === prevStr);
  };

  // Find active diplomas that have a study day on the day BEFORE, but don't have a session recorded for it yet
  const getPlaceholdersForDay = (day: Date): Diploma[] => {
    const prev = addDays(day, -1);
    const prevDayOfWeek = prev.getDay();
    const prevStr = formatDateStr(prev);

    return diplomas.filter(d => {
      if (d.status !== 'Active') return false;
      const studyDaysNumbers = getStudyDaysNumbers(d.studyDays);
      if (!studyDaysNumbers.includes(prevDayOfWeek)) return false;

      // Check if session already exists for this diploma on this date
      const sessionExists = sessions.some(s => s.diplomaId === d.id && s.date === prevStr);
      return !sessionExists;
    });
  };

  // Quick create a session for a placeholder
  const handleQuickCreateSession = (diploma: Diploma, date: Date) => {
    const dateStr = formatDateStr(date);
    const diplomaSessionsCount = sessions.filter(s => s.diplomaId === diploma.id).length;
    
    const start24h = parseSessionTimeTo24h(diploma.sessionTime);
    const durationHours = getSessionDurationHours(diploma.studyDays);
    const end24h = addHoursToTime(start24h, durationHours);

    const newSession: Session = {
      id: `ses-${Date.now()}`,
      diplomaId: diploma.id,
      title: `المحاضرة رقم ${diplomaSessionsCount + 1}`,
      instructor: diploma.instructorName || 'غير معلم',
      date: dateStr,
      startTime: start24h,
      endTime: end24h,
      notes: 'تم إنشاؤها تلقائياً للمتابعة التشغيلية الأسبوعية',
      attendance: {}
    };

    onSaveSessions([newSession, ...sessions]);
  };

  // Manual tasks for a specific day
  const getManualTasksForDay = (dayStr: string): Task[] => {
    return tasks.filter(t => t.dueDate === dayStr);
  };

  // Toggle session flags
  const toggleSessionFlag = (sessionId: string, flag: 'recordingUploaded' | 'attendanceReviewed' | 'instructorPresent') => {
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, [flag]: !s[flag] };
      }
      return s;
    });
    onSaveSessions(updated);
  };

  // Add manual task
  const handleAddTask = (dayStr: string) => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: dayStr,
      priority: newTaskPriority,
      status: 'Pending',
      notes: '',
      category: newTaskCategory,
      diplomaId: newTaskDiplomaId || undefined
    };
    onSaveTasks([newTask, ...tasks]);
    setNewTaskTitle('');
    setNewTaskPriority('Medium');
    setNewTaskCategory('Other');
    setNewTaskDiplomaId('');
    setShowAddTask(null);
  };

  // Postpone task to the next study day of its linked diploma (or first active diploma if unlinked)
  const handlePostponeTaskToNextStudyDay = (task: Task) => {
    let targetDiploma = task.diplomaId ? diplomas.find(d => d.id === task.diplomaId) : null;
    if (!targetDiploma) {
      targetDiploma = diplomas.find(d => d.status === 'Active' && d.studyDays);
    }

    const currentDueDate = new Date(task.dueDate);
    let nextDate = new Date(currentDueDate);
    let found = false;
    const studyDaysNumbers = targetDiploma ? getStudyDaysNumbers(targetDiploma.studyDays) : [];

    if (studyDaysNumbers.length > 0) {
      for (let i = 1; i <= 7; i++) {
        const checkDate = addDays(currentDueDate, i);
        if (studyDaysNumbers.includes(checkDate.getDay())) {
          nextDate = checkDate;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      nextDate = addDays(currentDueDate, 1);
    }

    const nextDateStr = formatDateStr(nextDate);
    const updated = tasks.map(t => t.id === task.id ? { ...t, dueDate: nextDateStr } : t);
    onSaveTasks(updated);
  };

  // Toggle task status
  const toggleTask = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } as Task;
      }
      return t;
    });
    onSaveTasks(updated);
  };

  // Delete task
  const deleteTask = (taskId: string) => {
    onSaveTasks(tasks.filter(t => t.id !== taskId));
  };

  // Edit task date (move to another day)
  const handleSaveTaskDate = (taskId: string) => {
    if (!editingTaskDate) return;
    const updated = tasks.map(t => t.id === taskId ? { ...t, dueDate: editingTaskDate } : t);
    onSaveTasks(updated);
    setEditingTaskId(null);
    setEditingTaskDate('');
  };

  // Find diploma name
  const getDiplomaName = (diplomaId: string) => {
    return diplomas.find(d => d.id === diplomaId)?.name || 'دبلومة';
  };

  // Week range label
  const weekLabel = `${weekDays[0].getDate()} ${ARABIC_MONTHS[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${ARABIC_MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  const renderDayCard = (day: Date) => {

          const dayStr = formatDateStr(day);
          const jsDay = day.getDay(); // 0=Sun,...6=Sat
          const arabicDayName = ARABIC_DAYS[jsDay];
          const isToday = dayStr === formatDateStr(today);
          const isPast = day < today;

          const postSessionItems = getPostSessionTasksForDay(day);
          const placeholders = getPlaceholdersForDay(day);
          const manualTasks = getManualTasksForDay(dayStr);
          const hasContent = postSessionItems.length > 0 || placeholders.length > 0 || manualTasks.length > 0;

          return (
            <motion.div
              key={dayStr}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={`rounded-xl border transition-all ${
                isToday
                  ? 'border-indigo-500/40 bg-indigo-950/10 shadow-lg shadow-indigo-500/5'
                  : 'border-[#1F1F1F] bg-[#0D0D0D]/50 hover:border-[#2A2A2A]'
              }`}
            >
              {/* Day Header */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl ${isToday ? 'border-b border-indigo-500/20' : 'border-b border-[#1A1A1A]'}`}>
                <div className="flex items-center gap-3">
                  {/* Day name + date */}
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                    <span className={`text-sm font-bold ${isToday ? 'text-indigo-300' : isPast ? 'text-zinc-500' : 'text-zinc-200'}`}>
                      {arabicDayName}
                    </span>
                    <span className={`text-xs font-mono ${isToday ? 'text-indigo-400' : 'text-zinc-600'}`}>
                      {day.getDate()} {ARABIC_MONTHS[day.getMonth()]}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">
                        اليوم
                      </span>
                    )}
                  </div>

                  {/* Stats badges */}
                  {hasContent && (
                    <div className="flex items-center gap-1.5">
                      {postSessionItems.length > 0 && (
                        <span className="text-[10px] bg-amber-950/30 border border-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                          {postSessionItems.length} محاضرة لمتابعتها
                        </span>
                      )}
                      {placeholders.length > 0 && (
                        <span className="text-[10px] bg-indigo-950/30 border border-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded-full font-mono">
                          {placeholders.length} مجدولة تلقائياً
                        </span>
                      )}
                      {manualTasks.length > 0 && (
                        <span className="text-[10px] bg-blue-950/30 border border-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                          {manualTasks.filter(t => t.status !== 'Completed').length}/{manualTasks.length} مهمة
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Add task button */}
                <button
                  onClick={() => {
                    setShowAddTask(showAddTask === dayStr ? null : dayStr);
                    setNewTaskTitle('');
                  }}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-indigo-950/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  مهمة يدوية
                </button>
              </div>

              {/* Day Content */}
              <div className="px-4 py-3 space-y-3">

                {/* Add Task Form */}
                <AnimatePresence>
                  {showAddTask === dayStr && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-[#0A0A10] border border-indigo-900/30 rounded-lg p-3 space-y-2.5"
                    >
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="أدخل عنوان المهمة..."
                        className="w-full px-3 py-2 bg-[#060608] border border-[#2A2A2A] focus:border-indigo-500/50 text-xs text-zinc-100 rounded-lg outline-none text-right placeholder-zinc-700"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask(dayStr)}
                        autoFocus
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={newTaskCategory}
                          onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                          className="px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[11px] text-zinc-300 rounded-lg outline-none cursor-pointer text-right"
                        >
                          {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                            <option key={key} value={key}>تصنيف: {val.label}</option>
                          ))}
                        </select>
                        <select
                          value={newTaskDiplomaId}
                          onChange={(e) => setNewTaskDiplomaId(e.target.value)}
                          className="px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[11px] text-zinc-300 rounded-lg outline-none cursor-pointer text-right"
                        >
                          <option value="">ربط بدبلومة: عام</option>
                          {diplomas.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={newTaskPriority}
                          onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                          className="flex-1 px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] text-[11px] text-zinc-300 rounded-lg outline-none cursor-pointer text-right"
                        >
                          <option value="Low">أولوية منخفضة</option>
                          <option value="Medium">أولوية متوسطة</option>
                          <option value="High">أولوية عالية</option>
                        </select>
                        <button
                          onClick={() => handleAddTask(dayStr)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          إضافة
                        </button>
                        <button
                          onClick={() => {
                            setShowAddTask(null);
                            setNewTaskCategory('Other');
                            setNewTaskDiplomaId('');
                          }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Auto-generated placeholder reminders for active diplomas' study days (session not created yet) */}
                {placeholders.length > 0 && (
                  <div className="space-y-2">
                    {placeholders.map((dip) => (
                      <div
                        key={`placeholder-${dip.id}`}
                        className="border border-dashed border-indigo-900/40 bg-indigo-950/5 rounded-xl overflow-hidden p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="text-right">
                            <span className="text-xs font-bold text-zinc-200 block font-sans">
                              جلسة مجدولة تلقائياً: {dip.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5 font-sans">
                              أيام الدراسة: {dip.studyDays || 'غير محدد'} {dip.sessionTime && `(${dip.sessionTime})`} · يرجى إنشاء المحاضرة لمتابعة مهامها.
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleQuickCreateSession(dip, addDays(day, -1))}
                          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-center font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          إنشاء الجلسة والمتابعة
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-generated tasks from previous day's sessions */}
                {postSessionItems.length > 0 && (
                  <div className="space-y-2">
                    {postSessionItems.map((ses) => {
                      const diplName = getDiplomaName(ses.diplomaId);
                      const allDone = ses.recordingUploaded && ses.attendanceReviewed && ses.instructorPresent !== undefined;
                      const doneCount = [ses.recordingUploaded, ses.attendanceReviewed, ses.instructorPresent === true].filter(Boolean).length;

                      return (
                        <div
                          key={ses.id}
                          className={`border rounded-xl overflow-hidden transition-all ${
                            doneCount === 3
                              ? 'border-emerald-900/30 bg-emerald-950/5'
                              : 'border-amber-900/20 bg-amber-950/5'
                          }`}
                        >
                          {/* Session Header */}
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1A1A1A]">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <div>
                                <span className="text-[11px] font-bold text-zinc-200">{ses.title}</span>
                                <span className="text-[10px] text-zinc-500 mr-2">· {diplName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                doneCount === 3
                                  ? 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20'
                                  : 'text-amber-400 border-amber-900/30 bg-amber-950/10'
                              }`}>
                                {doneCount}/3 مكتملة
                              </span>
                            </div>
                          </div>

                          {/* 3 Task Checkboxes */}
                          <div className="px-3 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Task 1: Upload Recording */}
                            <button
                              onClick={() => toggleSessionFlag(ses.id, 'recordingUploaded')}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer text-right ${
                                ses.recordingUploaded
                                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
                                  : 'bg-[#0A0A0A] border-[#252525] text-zinc-400 hover:border-zinc-600'
                              }`}
                            >
                              {ses.recordingUploaded
                                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                : <UploadCloud className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                              }
                              رفع التسجيل على الدرايف
                            </button>

                            {/* Task 2: Review Attendance */}
                            <button
                              onClick={() => toggleSessionFlag(ses.id, 'attendanceReviewed')}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer text-right ${
                                ses.attendanceReviewed
                                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
                                  : 'bg-[#0A0A0A] border-[#252525] text-zinc-400 hover:border-zinc-600'
                              }`}
                            >
                              {ses.attendanceReviewed
                                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                : <ClipboardCheck className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                              }
                              مراجعة حضور الطلاب
                            </button>

                            {/* Task 3: Instructor Present */}
                            <button
                              onClick={() => toggleSessionFlag(ses.id, 'instructorPresent')}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer text-right ${
                                ses.instructorPresent
                                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400'
                                  : ses.instructorPresent === false
                                  ? 'bg-rose-950/20 border-rose-900/30 text-rose-400'
                                  : 'bg-[#0A0A0A] border-[#252525] text-zinc-400 hover:border-zinc-600'
                              }`}
                            >
                              {ses.instructorPresent
                                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                : <UserCheck className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                              }
                              تأكيد حضور المحاضر
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Manual Tasks */}
                {manualTasks.length > 0 && (
                  <div className="space-y-1.5">
                    {manualTasks.map((task) => {
                      const isDone = task.status === 'Completed';
                      const catInfo = CATEGORY_MAP[task.category || 'Other'];
                      
                      const priorityColor = task.priority === 'High'
                        ? 'bg-rose-950/20 border-rose-900/30 text-rose-400'
                        : task.priority === 'Medium'
                        ? 'bg-amber-950/20 border-amber-900/30 text-amber-400'
                        : 'bg-blue-950/20 border-blue-900/30 text-blue-400';

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all group ${
                            isDone
                              ? 'bg-zinc-950/10 border-[#1A1A1A]'
                              : `${catInfo.borderClass}`
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="shrink-0 cursor-pointer"
                          >
                            {isDone
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
                            }
                          </button>

                          {/* Task title */}
                          <span className={`flex-1 text-xs ${isDone ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                            {task.title}
                          </span>

                          {/* Diploma Link Badge */}
                          {task.diplomaId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 bg-indigo-950/30 border-indigo-900/30 text-indigo-400 truncate max-w-[120px]" title={getDiplomaName(task.diplomaId)}>
                              {getDiplomaName(task.diplomaId)}
                            </span>
                          )}

                          {/* Category Badge */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${catInfo.badgeClass}`}>
                            {catInfo.label}
                          </span>

                          {/* Priority badge */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${priorityColor}`}>
                            {task.priority === 'High' ? 'عاجل' : task.priority === 'Medium' ? 'هام' : 'عادي'}
                          </span>

                          {/* Actions (visible on hover) */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {!isDone && (
                              <button
                                onClick={() => handlePostponeTaskToNextStudyDay(task)}
                                className="p-1 text-zinc-600 hover:text-indigo-400 cursor-pointer transition-colors"
                                title="تأجيل للمحاضرة القادمة"
                              >
                                <Sparkles className="w-3 h-3" />
                              </button>
                            )}
                            {editingTaskId === task.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={editingTaskDate}
                                  onChange={(e) => setEditingTaskDate(e.target.value)}
                                  className="px-2 py-0.5 bg-[#080808] border border-indigo-900/40 text-[10px] text-zinc-200 rounded outline-none cursor-pointer"
                                />
                                <button
                                  onClick={() => handleSaveTaskDate(task.id)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300 cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => { setEditingTaskId(null); setEditingTaskDate(''); }}
                                  className="p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingTaskId(task.id); setEditingTaskDate(task.dueDate); }}
                                className="p-1 text-zinc-600 hover:text-indigo-400 cursor-pointer transition-colors"
                                title="تغيير اليوم"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-zinc-600 hover:text-rose-400 cursor-pointer transition-colors"
                              title="حذف المهمة"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty State */}
                {!hasContent && showAddTask !== dayStr && (
                  <div className="flex items-center gap-2 py-1.5 px-1">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                    <span className="text-[11px] text-zinc-700 italic">
                      {isPast ? 'لا توجد مهام مسجلة لهذا اليوم.' : 'يوم خالٍ من المهام 😎'}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          );

  };

  return (
    <div className="space-y-5 text-right font-sans" dir="rtl" id="weekly-ops-board">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            لوحة العمليات الأسبوعية والتقويم
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-sans font-medium">مهامك التشغيلية اليومية ومتابعة المحاضرات بشكل أسبوعي أو شهري</p>
        </div>

        {/* Toggle and Navigator Row */}
        <div className="flex flex-wrap items-center gap-3 select-none">
          {/* View Mode Toggle */}
          <div className="flex bg-[#111] border border-[#262626] rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              أسبوعي
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              شهري
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'week' ? goToPrevWeek : goToPrevMonth}
              className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="px-4 py-1.5 bg-[#111] border border-[#262626] rounded-lg text-[11px] font-mono text-zinc-300 min-w-[210px] text-center">
              {viewMode === 'week' 
                ? weekLabel 
                : `${ARABIC_MONTHS[refDate.getMonth()]} ${refDate.getFullYear()}`
              }
            </div>

            <button
              onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth}
              className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-zinc-600 text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isCurrentPeriod && (
              <button
                onClick={goToCurrentPeriod}
                className="px-3 py-1.5 text-[11px] font-bold bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 rounded-lg cursor-pointer transition-all"
              >
                {viewMode === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main View Selection (Feature 5) */}
      {viewMode === 'week' ? (
        <div className="space-y-3">
          {weekDays.map(renderDayCard)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendar Day-of-week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-zinc-500 mb-1 font-sans select-none">
            {CALENDAR_HEADERS.map(h => (
              <div key={h} className="py-1 bg-zinc-950/20 rounded border border-zinc-900/30 text-[10px]">
                {h}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 font-sans">
            {monthGridDays.map((day) => {
              const dayStr = formatDateStr(day);
              const isToday = dayStr === formatDateStr(today);
              const isCurrentMonth = day.getMonth() === refDate.getMonth();
              const isSelected = formatDateStr(day) === formatDateStr(selectedGridDate);
              
              const postSessionItems = getPostSessionTasksForDay(day);
              const placeholders = getPlaceholdersForDay(day);
              const manualTasks = getManualTasksForDay(dayStr);
              const totalItems = postSessionItems.length + placeholders.length + manualTasks.length;
              
              const todayStr = formatDateStr(today);
              const hasOverduePending = tasks.some(t => t.status !== 'Completed' && t.dueDate === dayStr && t.dueDate < todayStr);

              const calendarItems = [
                ...postSessionItems.map(s => {
                  const doneCount = [s.recordingUploaded, s.attendanceReviewed, s.instructorPresent === true].filter(Boolean).length;
                  return {
                    type: 'session' as const,
                    id: s.id,
                    title: s.title,
                    isCompleted: doneCount === 3,
                  };
                }),
                ...placeholders.map(p => ({
                  type: 'placeholder' as const,
                  id: p.id,
                  title: `محاضرة: ${p.name}`,
                })),
                ...manualTasks.map(t => ({
                  type: 'task' as const,
                  id: t.id,
                  title: t.title,
                  category: t.category || 'Other',
                  isCompleted: t.status === 'Completed',
                })),
              ];

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => setSelectedGridDate(day)}
                  className={`p-2 rounded-xl border flex flex-col justify-between items-end transition-all relative group cursor-pointer text-right min-h-[50px] sm:min-h-[105px] aspect-square sm:aspect-auto ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30 text-white shadow-[0_0_15px_rgba(99,102,241,0.35)]'
                      : isToday
                      ? 'border-indigo-500/60 bg-indigo-950/15 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.2)] animate-pulse'
                      : isCurrentMonth
                      ? 'border-zinc-900 bg-zinc-950/30 text-zinc-300 hover:border-zinc-800'
                      : 'border-zinc-900/40 bg-zinc-950/5 text-zinc-650'
                  }`}
                >
                  <span className="flex items-center gap-1 w-full justify-between flex-row-reverse">
                    <span className={`text-[10px] font-mono font-bold ${
                      isSelected ? 'text-indigo-400' : isToday ? 'text-indigo-400' : isCurrentMonth ? 'text-zinc-400 font-black' : 'text-zinc-700'
                    }`}>
                      {day.getDate()}
                    </span>
                    {hasOverduePending && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)] shrink-0" title="مهام متأخرة معلقة!" />
                    )}
                  </span>
                  
                  {/* Indicators - Mobile Only */}
                  {totalItems > 0 && (
                    <div className="flex flex-wrap gap-1 justify-start w-full mt-1 sm:hidden">
                      {postSessionItems.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                      {placeholders.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                      {manualTasks.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  )}

                  {/* Desktop Item Titles */}
                  {calendarItems.length > 0 && (
                    <div className="hidden sm:flex flex-col gap-1 w-full mt-1.5 text-[9px] text-right overflow-hidden select-none">
                      {calendarItems.slice(0, 2).map((item, idx) => {
                        if (item.type === 'session') {
                          return (
                            <div
                              key={item.id}
                              className={`px-1 py-0.5 rounded border text-center truncate ${
                                item.isCompleted
                                  ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.2)]'
                                  : 'border-amber-500/40 bg-amber-950/20 text-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.2)]'
                              }`}
                            >
                              {item.title}
                            </div>
                          );
                        } else if (item.type === 'placeholder') {
                          return (
                            <div
                              key={item.id}
                              className="px-1 py-0.5 rounded border border-orange-500/40 bg-orange-950/20 text-orange-400 text-center truncate shadow-[0_0_4px_rgba(249,115,22,0.2)]"
                            >
                              {item.title}
                            </div>
                          );
                        } else {
                          const catStyle = CATEGORY_MAP[item.category];
                          return (
                            <div
                              key={item.id}
                              className={`px-1 py-0.5 rounded border text-center truncate ${
                                item.isCompleted
                                  ? 'border-zinc-800 bg-zinc-900/30 text-zinc-500 line-through'
                                  : `${catStyle.badgeClass} shadow-[0_0_4px_rgba(0,0,0,0.1)]`
                              }`}
                            >
                              {item.title}
                            </div>
                          );
                        }
                      })}
                      {calendarItems.length > 2 && (
                        <div className="text-[8px] text-zinc-500 font-bold text-center mt-0.5">
                          +{calendarItems.length - 2} إضافي
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day operational drawer */}
          <div className="mt-6 border-t border-zinc-900 pt-5 space-y-4">
            <div className="flex items-center justify-between font-sans px-1 text-right" dir="rtl">
              <h3 className="text-xs font-bold text-indigo-400">العمليات والمهام لليوم المحدد:</h3>
              <span className="text-[10px] text-zinc-500 font-bold bg-zinc-950/60 border border-zinc-900 px-3 py-1 rounded-lg">
                {selectedGridDate.getDate()} {ARABIC_MONTHS[selectedGridDate.getMonth()]} {selectedGridDate.getFullYear()}
              </span>
            </div>
            {renderDayCard(selectedGridDate)}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[#1A1A1A] text-[11px] text-zinc-500 select-none">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          {tasks.filter(t => t.status === 'Completed').length} مهمة مكتملة ${viewMode === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          {tasks.filter(t => t.status !== 'Completed').length} مهمة معلقة
        </span>
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          {sessions.length} محاضرة في النظام
        </span>
      </div>

    </div>
  );
}
