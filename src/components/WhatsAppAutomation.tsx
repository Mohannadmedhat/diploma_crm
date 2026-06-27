import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, Session, Diploma, MessageTemplate, AppConfig } from '../types';
import { improveWhatsAppMessage } from '../services/groq';
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
  Search,
  Check,
  X,
  Users,
  Play,
  Pause,
  SkipForward,
  Sparkles,
  Plus,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatsAppAutomationProps {
  students: Student[];
  sessions: Session[];
  diplomas: Diploma[];
  templates: MessageTemplate[];
  config: AppConfig | null;
}

interface QueueItem {
  student: Student;
  message: string;
  phone: string;
  status: 'pending' | 'opening' | 'success' | 'skipped';
}

export default function WhatsAppAutomation({
  students,
  sessions,
  diplomas,
  templates,
  config
}: WhatsAppAutomationProps) {
  // Tabs: 'absence' | 'class-reminder' | 'custom-message' | 'broadcaster'
  const [activeTab, setActiveTab] = useState<'absence' | 'class-reminder' | 'custom-message' | 'broadcaster'>('absence');

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiplomaId, setSelectedDiplomaId] = useState(diplomas[0]?.id || '');

  // 1️⃣ ABSENCE STATE
  const [selectedAbsenceSessionId, setSelectedAbsenceSessionId] = useState('');
  const [absenceTemplateId, setAbsenceTemplateId] = useState(templates[0]?.id || '');
  const [absenceCustomText, setAbsenceCustomText] = useState('');
  const [selectedAbsenceStudents, setSelectedAbsenceStudents] = useState<Record<string, boolean>>({});

  // 2️⃣ CLASS REMINDER STATE
  const [reminderTemplateText, setReminderTemplateText] = useState(
    'السلام عليكم {اسم_الطالب} 👋 نذكركم بمحاضرة دبلومة {اسم_الدبلومة} القادمة يوم {تاريخ_المحاضرة} الساعة {وقت_المحاضرة} ⏰. حضوركم واهتمامكم يسعدنا!'
  );
  const [selectedReminderSessionId, setSelectedReminderSessionId] = useState('');
  const [selectedReminderStudents, setSelectedReminderStudents] = useState<Record<string, boolean>>({});

  // 3️⃣ CUSTOM MESSAGE STATE
  const [customMessageText, setCustomMessageText] = useState(
    'السلام عليكم {اسم_الطالب}، نود إعلامكم بخصوص دبلومة {اسم_الدبلومة} أن...'
  );
  const [selectedCustomStudents, setSelectedCustomStudents] = useState<Record<string, boolean>>({});

  // Cursor position tracker for Custom Message text area
  const customTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  // 4️⃣ BROADCASTER STATE
  const [broadcastMessageText, setBroadcastMessageText] = useState(
    'السلام عليكم وأهلاً بكم جميعاً 👋\nنود إحاطتكم بخصوص دبلومة {اسم_الدبلومة} بأن...'
  );
  const [selectedBroadcastDiplomas, setSelectedBroadcastDiplomas] = useState<Record<string, boolean>>({});
  const [copiedBroadcasts, setCopiedBroadcasts] = useState<Record<string, boolean>>({});
  const [sentBroadcasts, setSentBroadcasts] = useState<Record<string, boolean>>({});
  const [polishingBroadcast, setPolishingBroadcast] = useState(false);
  const broadcastTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [broadcastSelectionStart, setBroadcastSelectionStart] = useState<number | null>(null);

  useEffect(() => {
    if (diplomas.length > 0 && Object.keys(selectedBroadcastDiplomas).length === 0) {
      const initial: Record<string, boolean> = {};
      diplomas.forEach(d => {
        if (d.status === 'Active' || d.status === 'Upcoming') {
          initial[d.id] = true;
        }
      });
      setSelectedBroadcastDiplomas(initial);
    }
  }, [diplomas]);

  // --- QUEUE MODAL STATES ---
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isQueueActive, setIsQueueActive] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [showExtensionInstructions, setShowExtensionInstructions] = useState(false);
  const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Groq AI states
  const [polishingAbsence, setPolishingAbsence] = useState(false);
  const [polishingCustom, setPolishingCustom] = useState(false);

  const handlePolishMessage = async (type: 'absence' | 'custom' | 'broadcaster', tone: 'friendly' | 'warning' | 'formal') => {
    const activeApiKey = config?.groqApiKey || (import.meta as any).env.VITE_GROQ_API_KEY || '';
    if (!activeApiKey) {
      alert('الرجاء تهيئة مفتاح Groq API في الإعدادات أولاً لتفعيل تحسين الرسائل بالذكاء الاصطناعي.');
      return;
    }
    
    let currentText = '';
    if (type === 'absence') currentText = absenceCustomText;
    else if (type === 'custom') currentText = customMessageText;
    else currentText = broadcastMessageText;

    if (!currentText.trim()) return;

    if (type === 'absence') setPolishingAbsence(true);
    else if (type === 'custom') setPolishingCustom(true);
    else setPolishingBroadcast(true);

    try {
      const improved = await improveWhatsAppMessage(
        activeApiKey,
        config?.groqModel || 'llama-3.3-70b-versatile',
        currentText,
        tone
      );
      if (type === 'absence') {
        setAbsenceCustomText(improved);
      } else if (type === 'custom') {
        setCustomMessageText(improved);
      } else {
        setBroadcastMessageText(improved);
      }
    } catch (e: any) {
      alert(`فشل تحسين الصياغة: ${e.message}`);
    } finally {
      setPolishingAbsence(false);
      setPolishingCustom(false);
      setPolishingBroadcast(false);
    }
  };

  // Workflow states
  const [sendMode, setSendMode] = useState<'new-tab' | 'same-tab'>(() => {
    return (localStorage.getItem('whatsapp_send_mode') as any) || 'new-tab';
  });
  useEffect(() => {
    localStorage.setItem('whatsapp_send_mode', sendMode);
  }, [sendMode]);

  const [copied, setCopied] = useState(false);
  const [sentLogs, setSentLogs] = useState<Record<string, 'success' | 'skipped'>>({});
  
  const [delaySeconds, setDelaySeconds] = useState<number>(() => {
    return Number(localStorage.getItem('whatsapp_delay_seconds')) || 10;
  });
  useEffect(() => {
    localStorage.setItem('whatsapp_delay_seconds', String(delaySeconds));
  }, [delaySeconds]);

  const [whatsappPlatform, setWhatsappPlatform] = useState<'desktop' | 'web' | 'standard'>(() => {
    return (localStorage.getItem('whatsapp_platform') as any) || 'standard';
  });
  useEffect(() => {
    localStorage.setItem('whatsapp_platform', whatsappPlatform);
  }, [whatsappPlatform]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [popupBlockerTriggered, setPopupBlockerTriggered] = useState(false);

  // Latest refs to avoid stale closures in setTimeout/setInterval callbacks
  const queueIndexRef = useRef(queueIndex);
  queueIndexRef.current = queueIndex;

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const isAutoSendingRef = useRef(isAutoSending);
  isAutoSendingRef.current = isAutoSending;

  // Stores reference to the opened WhatsApp window so we can navigate it
  // without popup blocker (navigating existing window = always allowed)
  const whatsappWindowRef = useRef<Window | null>(null);

  // Sync selected diploma ID when it changes
  useEffect(() => {
    if (diplomas.length > 0 && !selectedDiplomaId) {
      setSelectedDiplomaId(diplomas[0].id);
    }
  }, [diplomas, selectedDiplomaId]);

  // ==========================================
  // DATA FILTERING & COMPUTATIONS
  // ==========================================

  // Sessions that have at least one Absent student
  const sessionsWithAbsences = useMemo(() => {
    return sessions
      .filter((session) => {
        return Object.values(session.attendance || {}).some((record) => record.status === 'Absent');
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  }, [sessions]);

  // Set default absence session
  useEffect(() => {
    if (sessionsWithAbsences.length > 0 && !selectedAbsenceSessionId) {
      setSelectedAbsenceSessionId(sessionsWithAbsences[0].id);
    }
  }, [sessionsWithAbsences, selectedAbsenceSessionId]);

  // Students who were absent in the selected session
  const absentStudents = useMemo(() => {
    if (!selectedAbsenceSessionId) return [];
    const targetSession = sessions.find((s) => s.id === selectedAbsenceSessionId);
    if (!targetSession) return [];

    return students.filter((st) => {
      const record = targetSession.attendance?.[st.id];
      return record && record.status === 'Absent';
    });
  }, [selectedAbsenceSessionId, sessions, students]);

  // Set all absent students to checked when session changes
  useEffect(() => {
    const nextChecked: Record<string, boolean> = {};
    absentStudents.forEach((st) => {
      nextChecked[st.id] = true;
    });
    setSelectedAbsenceStudents(nextChecked);
  }, [absentStudents]);

  // Selected absence template text pre-fill
  useEffect(() => {
    const selectedTpl = templates.find((t) => t.id === absenceTemplateId) || templates[0];
    if (selectedTpl) {
      setAbsenceCustomText(selectedTpl.text);
    }
  }, [absenceTemplateId, templates]);

  // Upcoming scheduled sessions of the selected diploma
  const upcomingSessions = useMemo(() => {
    if (!selectedDiplomaId) return [];
    const todayStr = new Date().toISOString().split('T')[0];
    return sessions
      .filter((s) => s.diplomaId === selectedDiplomaId && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date)); // Chronological order
  }, [selectedDiplomaId, sessions]);

  // Set default upcoming session
  useEffect(() => {
    if (upcomingSessions.length > 0) {
      setSelectedReminderSessionId(upcomingSessions[0].id);
    } else {
      setSelectedReminderSessionId('');
    }
  }, [upcomingSessions]);

  // Enrolled students in the selected diploma
  const enrolledStudents = useMemo(() => {
    if (!selectedDiplomaId) return [];
    return students.filter((st) => st.diplomaIds.includes(selectedDiplomaId));
  }, [selectedDiplomaId, students]);

  // Set all enrolled students to checked when diploma changes (for reminder tab)
  useEffect(() => {
    const nextChecked: Record<string, boolean> = {};
    enrolledStudents.forEach((st) => {
      nextChecked[st.id] = true;
    });
    setSelectedReminderStudents(nextChecked);
  }, [enrolledStudents]);

  // Set all custom students list when active tab changes or query matches
  const customFilteredStudents = useMemo(() => {
    let list = enrolledStudents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(st => st.name.toLowerCase().includes(q) || st.phone.includes(q));
    }
    return list;
  }, [enrolledStudents, searchQuery]);

  // Initialize checked custom students
  useEffect(() => {
    const nextChecked: Record<string, boolean> = {};
    customFilteredStudents.forEach((st) => {
      nextChecked[st.id] = true;
    });
    setSelectedCustomStudents(nextChecked);
  }, [customFilteredStudents]);

  // Calculate absence counts for students in this diploma
  const studentAbsencesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!selectedDiplomaId) return map;

    enrolledStudents.forEach((st) => {
      let count = 0;
      sessions.forEach((ses) => {
        if (ses.diplomaId === selectedDiplomaId) {
          const rec = ses.attendance?.[st.id];
          if (rec && rec.status === 'Absent') {
            count++;
          }
        }
      });
      map[st.id] = count;
    });
    return map;
  }, [enrolledStudents, sessions, selectedDiplomaId]);

  // Helper: compile individual message
  const compileMessage = (templateText: string, student: Student, diploma?: Diploma, session?: Session) => {
    const absenceCount = studentAbsencesCountMap[student.id] || 0;
    
    // Extrapolate date/time
    const dateStr = session ? session.date : (upcomingSessions[0]?.date || new Date().toISOString().split('T')[0]);
    const timeStr = session ? `${session.startTime} - ${session.endTime}` : (upcomingSessions[0] ? `${upcomingSessions[0].startTime} - ${upcomingSessions[0].endTime}` : '');

    return parseTemplate(templateText, {
      studentName: student.name,
      parentName: student.parentName || 'ولي الأمر',
      course: diploma?.name || 'الدبلومة الأكاديمية',
      date: dateStr,
      time: timeStr,
      absenceCount: absenceCount
    });
  };

  // Clickable badge variable injection
  const insertVariable = (tag: string) => {
    const textArea = customTextAreaRef.current;
    if (!textArea) return;

    const start = selectionStart !== null ? selectionStart : textArea.selectionStart;
    const end = textArea.selectionEnd;
    const currentText = customMessageText;

    const before = currentText.substring(0, start);
    const after = currentText.substring(end);

    const newText = before + tag + after;
    setCustomMessageText(newText);
    
    // Focus back and set cursor position
    setTimeout(() => {
      textArea.focus();
      const nextPos = start + tag.length;
      textArea.setSelectionRange(nextPos, nextPos);
      setSelectionStart(nextPos);
    }, 50);
  };

  // Track selection start in custom message textarea
  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.currentTarget.selectionStart);
  };

  // ==========================================
  // BULK SENDING QUEUE WORKFLOW
  // ==========================================

  const startBulkSend = (type: 'absence' | 'reminder' | 'custom') => {
    let list: Student[] = [];
    let templateText = '';
    let diplomaObj = diplomas.find(d => d.id === selectedDiplomaId);
    let sessionObj: Session | undefined = undefined;

    if (type === 'absence') {
      list = absentStudents.filter(st => selectedAbsenceStudents[st.id]);
      templateText = absenceCustomText;
      sessionObj = sessions.find(s => s.id === selectedAbsenceSessionId);
      if (sessionObj) {
        diplomaObj = diplomas.find(d => d.id === sessionObj?.diplomaId);
      }
    } else if (type === 'reminder') {
      list = enrolledStudents.filter(st => selectedReminderStudents[st.id]);
      templateText = reminderTemplateText;
      sessionObj = sessions.find(s => s.id === selectedReminderSessionId);
    } else {
      list = customFilteredStudents.filter(st => selectedCustomStudents[st.id]);
      templateText = customMessageText;
    }

    if (list.length === 0) {
      alert('الرجاء اختيار طالب واحد على الأقل لإرسال الرسائل.');
      return;
    }

    // Build the queue
    const queueItems: QueueItem[] = list.map(student => {
      const finalMsg = compileMessage(templateText, student, diplomaObj, sessionObj);
      return {
        student,
        message: finalMsg,
        phone: student.phone,
        status: 'pending'
      };
    });

    setQueue(queueItems);
    setQueueIndex(0);
    setCopied(false);
    setIsQueueActive(true);
    setIsAutoSending(false); // Let the user control the start or start manually
  };

  const getWhatsAppLink = (phone: string, text: string) => {
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    const encodedText = encodeURIComponent(text);
    
    if (whatsappPlatform === 'desktop') {
      return `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    } else if (whatsappPlatform === 'web') {
      return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    } else {
      return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }
  };

  const openWhatsAppLink = (item: QueueItem): boolean => {
    let cleanPhone = item.phone.replace(/[^\d+]/g, '');
    const encodedText = encodeURIComponent(item.message);
    
    let url = '';
    if (whatsappPlatform === 'web') {
      url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      if (isAutoSending) {
        url += '&automate=1';
      }
    } else {
      // Both 'standard' and 'desktop' will use the api.whatsapp.com link for bulk dispatch
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    }

    if (whatsappPlatform === 'web') {
      if (isAutoSending) {
        // For auto-sending via extension: open in new tab since extension will close it
        const newWin = window.open(url, '_blank');
        whatsappWindowRef.current = newWin;
        if (!newWin) {
          setPopupBlockerTriggered(true);
          return false;
        }
        setPopupBlockerTriggered(false);
        return true;
      }

      // For WhatsApp Web manual sending: Reuse the same window reference
      if (whatsappWindowRef.current && !whatsappWindowRef.current.closed) {
        whatsappWindowRef.current.location.href = url;
        try { whatsappWindowRef.current.focus(); } catch (_) {}
        return true;
      } else {
        const newWin = window.open(url, 'whatsapp_auto_dispatch');
        whatsappWindowRef.current = newWin;
        if (!newWin) {
          setPopupBlockerTriggered(true);
          return false;
        }
        setPopupBlockerTriggered(false);
        return true;
      }
    } else {
      // For Desktop/Standard: Close previous window to avoid clutter, and open a new tab.
      if (whatsappWindowRef.current && !whatsappWindowRef.current.closed) {
        try { whatsappWindowRef.current.close(); } catch (_) {}
      }
      
      const newWin = window.open(
        url, 
        '_blank', 
        whatsappPlatform === 'desktop' ? 'width=450,height=300' : undefined
      );
      
      whatsappWindowRef.current = newWin;
      
      if (!newWin) {
        setPopupBlockerTriggered(true);
        return false;
      }
      setPopupBlockerTriggered(false);
      return true;
    }
  };

  const scheduleNextAutoSend = (nextIdx: number) => {
    console.log('[DEBUG] scheduleNextAutoSend called with nextIdx:', nextIdx);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(delaySeconds);
    let currentCountdown = delaySeconds;
    countdownTimerRef.current = setInterval(() => {
      currentCountdown -= 1;
      setCountdown(currentCountdown);
      if (currentCountdown <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        setCountdown(null);
        console.log('[DEBUG] Countdown finished. Invoking processCurrentQueueItem. queueIndexRef.current is:', queueIndexRef.current);
        processCurrentQueueItem();
      }
    }, 1000);
  };

  const processCurrentQueueItem = () => {
    const currentIndex = queueIndexRef.current;
    const currentQueue = queueRef.current;
    console.log('[DEBUG] processCurrentQueueItem executing. currentIndex:', currentIndex, 'queue length:', currentQueue?.length, 'student:', currentQueue?.[currentIndex]?.student?.name);

    if (currentIndex >= currentQueue.length) {
      console.log('[DEBUG] currentIndex out of bounds, stopping.');
      setIsAutoSending(false);
      setCountdown(null);
      return;
    }

    // Update status to opening
    setQueue(prev => prev.map((item, idx) => {
      if (idx === currentIndex) {
        return { ...item, status: 'opening' };
      }
      return item;
    }));

    // Trigger open
    const currentItem = currentQueue[currentIndex];
    const opened = openWhatsAppLink(currentItem);
    
    if (!opened) {
      setIsAutoSending(false);
      setCountdown(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    // Save status in logs
    setSentLogs(prev => ({
      ...prev,
      [currentItem.student.id]: 'success'
    }));

    // If using WhatsApp Web and Auto-Sending (Extension mode)
    if (whatsappPlatform === 'web' && isAutoSending) {
      console.log('[DEBUG] Chrome Extension Auto-send mode active. Monitoring tab closure...');
      let elapsedSeconds = 0;
      const maxWaitSeconds = 25; // fail-safe timeout

      const checkClosed = setInterval(() => {
        elapsedSeconds += 0.5;
        
        if (!isAutoSendingRef.current) {
          clearInterval(checkClosed);
          return;
        }

        const isClosed = !whatsappWindowRef.current || whatsappWindowRef.current.closed;
        
        if (isClosed || elapsedSeconds >= maxWaitSeconds) {
          clearInterval(checkClosed);
          
          if (elapsedSeconds >= maxWaitSeconds) {
            console.log('[DEBUG] Tab closing timed out. Advancing anyway.');
            try { whatsappWindowRef.current?.close(); } catch (_) {}
          } else {
            console.log('[DEBUG] Tab closed. Advancing queue...');
          }

          // Mark current item as success
          setQueue(prev => prev.map((item, idx) => {
            if (idx === currentIndex) {
              return { ...item, status: 'success' };
            }
            return item;
          }));

          const nextIdx = currentIndex + 1;
          setQueueIndex(nextIdx);

          if (nextIdx < currentQueue.length && isAutoSendingRef.current) {
            // Wait 1.5 seconds for safety before next dispatch
            autoSendTimerRef.current = setTimeout(() => {
              processCurrentQueueItem();
            }, 1500);
          } else {
            setIsAutoSending(false);
            setCountdown(null);
          }
        }
      }, 500);

      return;
    }

    // Default Fallback Mode (Manual / Standard / Desktop or non-web Auto-Send)
    setTimeout(() => {
      console.log('[DEBUG] setTimeout firing for currentIndex:', currentIndex);
      setQueue(prev => prev.map((item, idx) => {
        if (idx === currentIndex) {
          return { ...item, status: 'success' };
        }
        return item;
      }));

      // Go to next item
      const nextIdx = currentIndex + 1;
      console.log('[DEBUG] Advancing queue. nextIdx:', nextIdx, 'isAutoSendingRef.current:', isAutoSendingRef.current);
      setQueueIndex(nextIdx);

      if (nextIdx < currentQueue.length && isAutoSendingRef.current) {
        scheduleNextAutoSend(nextIdx);
      } else if (nextIdx >= currentQueue.length) {
        console.log('[DEBUG] Queue fully processed.');
        setIsAutoSending(false);
        setCountdown(null);
        setTimeout(() => {
          if (whatsappWindowRef.current && !whatsappWindowRef.current.closed) {
            try { whatsappWindowRef.current.close(); } catch (_) {}
            whatsappWindowRef.current = null;
          }
        }, 3000);
      }
    }, 600);
  };

  // Toggle Auto-Send Timer
  useEffect(() => {
    if (isAutoSending) {
      processCurrentQueueItem();
    } else {
      setCountdown(null);
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }
    return () => {
      if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isAutoSending]);

  const handleSkipCurrent = () => {
    const currentItem = queue[queueIndex];
    if (currentItem) {
      setSentLogs(prev => ({
        ...prev,
        [currentItem.student.id]: 'skipped'
      }));
    }

    setQueue(prev => prev.map((item, idx) => {
      if (idx === queueIndex) {
        return { ...item, status: 'skipped' };
      }
      return item;
    }));
    const nextIdx = queueIndex + 1;
    setQueueIndex(nextIdx);
    if (nextIdx < queue.length && isAutoSending) {
      scheduleNextAutoSend(nextIdx);
    } else {
      setIsAutoSending(false);
      setCountdown(null);
    }
  };

  const closeQueueModal = () => {
    setIsAutoSending(false);
    setIsQueueActive(false);
    setCountdown(null);
    if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    // Close any remaining opened window
    if (whatsappWindowRef.current && !whatsappWindowRef.current.closed) {
      try { whatsappWindowRef.current.close(); } catch (_) {}
    }
    whatsappWindowRef.current = null; // Reset so next session opens a fresh window
    setPopupBlockerTriggered(false);
  };

  return (
    <div className="space-y-6 text-right select-text relative" id="whatsapp-automation-control-center" dir="rtl">
      
      {/* Upper Module Banner */}
      <div className="bg-gradient-to-l from-emerald-950/20 via-zinc-950 to-zinc-950 p-5 rounded-2xl border border-zinc-900 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            أتمتة مراسلات الواتساب الذكية (WhatsApp Dispatcher)
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            أداة تسريع التواصل مع أولياء الأمور وتذكير الطلاب بالغياب أو الحضور بضغطة زر واحدة. تدعم الإرسال التلقائي واليدوي المتسلسل.
          </p>
        </div>

        {/* Global Diploma Select Switch */}
        <div className="flex items-center gap-2 bg-[#101010] border border-zinc-800 rounded-lg px-3 py-1.5 shrink-0 self-start md:self-center font-sans">
          <span className="text-[11px] font-bold text-zinc-400">الدبلومة المستهدفة:</span>
          <select
            value={selectedDiplomaId}
            onChange={(e) => setSelectedDiplomaId(e.target.value)}
            className="bg-transparent text-xs text-indigo-400 font-black cursor-pointer focus:ring-0 outline-hidden"
          >
            {diplomas.map(d => (
              <option key={d.id} value={d.id} className="bg-neutral-950 text-white">{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tabs Selection Row */}
      <div className="flex border-b border-zinc-900 select-none overflow-x-auto gap-2 pb-px font-sans">
        {[
          { id: 'absence', label: 'متابعة الغائبين (Absence Tracking)', icon: Search, color: 'text-rose-500 bg-rose-500/5' },
          { id: 'class-reminder', label: 'تذكير المحاضرة (Class Reminder)', icon: Clock, color: 'text-indigo-400 bg-indigo-500/5' },
          { id: 'custom-message', label: 'رسالة خاصة (Custom Message)', icon: FileText, color: 'text-emerald-400 bg-emerald-500/5' },
          { id: 'broadcaster', label: 'مرسل التعميمات الموحد (Unified Broadcaster)', icon: Users, color: 'text-amber-400 bg-amber-500/5' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`px-4 py-3 cursor-pointer border-b-2 transition-all text-xs font-bold shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'border-emerald-500 text-emerald-400 ' + tab.color
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Screen Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ==========================================
            TAB 1: ABSENCE TRACKING
            ========================================== */}
        {activeTab === 'absence' && (
          <>
            {/* Left controller: choose session & template */}
            <div className="lg:col-span-5 bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-5 h-fit">
              <div className="border-b border-zinc-900 pb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  رصد ومراسلة الغائبين
                </span>
                <span className="text-[10px] text-zinc-550 block mt-1 font-sans">
                  اختر الجلسة لرؤية الطلاب الذين تغيبوا عنها وتجهيز خطابات أولياء الأمور تلقائياً.
                </span>
              </div>

              {/* Session Picker */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">المحاضرة / الجلسة المرصودة:</label>
                <select
                  value={selectedAbsenceSessionId}
                  onChange={(e) => setSelectedAbsenceSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#07070A] border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
                >
                  {sessionsWithAbsences.length === 0 ? (
                    <option value="">-- لا توجد محاضرات بها غيابات مسجلة --</option>
                  ) : (
                    sessionsWithAbsences.map(ses => (
                      <option key={ses.id} value={ses.id}>
                        {ses.title} ({ses.date})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Template Picker */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">قالب رسالة الغياب المقترح:</label>
                <select
                  value={absenceTemplateId}
                  onChange={(e) => setAbsenceTemplateId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#07070A] border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
                >
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>

              {/* Custom message text box editor */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">نص قالب الخطاب الودي الحالي:</label>
                <textarea
                  value={absenceCustomText}
                  onChange={(e) => setAbsenceCustomText(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-[#07070A] border border-zinc-850 text-xs text-zinc-300 rounded-lg outline-hidden focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="اكتب قالب رسالة الغياب هنا..."
                />
                {config?.groqApiKey && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 justify-start">
                    <span className="text-[10px] text-zinc-550 font-bold shrink-0 self-center">تحسين الصياغة بالذكاء الاصطناعي (Groq AI):</span>
                    <button
                      type="button"
                      onClick={() => handlePolishMessage('absence', 'friendly')}
                      disabled={polishingAbsence}
                      className="px-2 py-1 bg-indigo-950/20 border border-indigo-900/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-[10px] rounded cursor-pointer disabled:opacity-50"
                    >
                      {polishingAbsence ? 'جاري التحسين...' : 'أسلوب ودّي ✨'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePolishMessage('absence', 'warning')}
                      disabled={polishingAbsence}
                      className="px-2 py-1 bg-rose-955/20 border border-rose-900/30 text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-[10px] rounded cursor-pointer disabled:opacity-50"
                    >
                      أسلوب تحذيري ⚠️
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePolishMessage('absence', 'formal')}
                      disabled={polishingAbsence}
                      className="px-2 py-1 bg-slate-950/20 border border-slate-900/30 text-slate-400 hover:bg-slate-600 hover:text-white transition-all text-[10px] rounded cursor-pointer disabled:opacity-50"
                    >
                      أسلوب رسمي 💼
                    </button>
                  </div>
                )}
                <span className="text-[9px] text-zinc-500 leading-relaxed block">
                  يمكنك استخدام المتغيرات مثل `{`{اسم_الطالب}`}` و `{`{اسم_الدبلومة}`}` و `{`{تاريخ_المحاضرة}`}` و `{`{عدد_الغياب}`}` ليتم استبدالها آلياً لكل طالب.
                </span>
              </div>
            </div>

            {/* Right List: Absent students with preview */}
            <div className="lg:col-span-7 bg-[#0B0B0E] border border-zinc-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-zinc-200">الطلاب الغائبون في المحاضرة المحددة</h3>
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    عدد الطلاب: {absentStudents.length} طلاب غائبين
                  </span>
                </div>

                {absentStudents.length > 0 && (
                  <button
                    onClick={() => startBulkSend('absence')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:text-white text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:shadow-emerald-600/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                    فتح واتساب للغائبين المحددين ({Object.values(selectedAbsenceStudents).filter(Boolean).length})
                  </button>
                )}
              </div>

              {/* Selection controller */}
              {absentStudents.length > 0 && (
                <div className="flex items-center gap-3 text-[10px] text-zinc-450 font-sans select-none border-b border-zinc-950 pb-2">
                  <button
                    onClick={() => {
                      const checked: Record<string, boolean> = {};
                      absentStudents.forEach(s => checked[s.id] = true);
                      setSelectedAbsenceStudents(checked);
                    }}
                    className="hover:text-indigo-400 cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setSelectedAbsenceStudents({})}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {absentStudents.map((st) => {
                  const isChecked = !!selectedAbsenceStudents[st.id];
                  const parsedMsg = compileMessage(
                    absenceCustomText,
                    st,
                    diplomas.find(d => d.id === selectedDiplomaId),
                    sessions.find(s => s.id === selectedAbsenceSessionId)
                  );
                  return (
                    <div
                      key={`abs-st-${st.id}`}
                      className={`p-3 bg-[#07070A] border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                        isChecked ? 'border-zinc-800' : 'border-zinc-950 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedAbsenceStudents(prev => ({
                              ...prev,
                              [st.id]: e.target.checked
                            }));
                          }}
                          className="mt-1 w-3.5 h-3.5 text-emerald-500 rounded border-zinc-800 bg-[#07070A] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5 flex-1 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{st.name}</span>
                            <span className="text-[9px] bg-rose-955 text-rose-400 border border-rose-900/30 px-2 py-0.5 rounded">
                              غائب 🔴
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              الهاتف: {st.phone}
                            </span>
                            {sentLogs[st.id] && (
                              <span className={`text-[9px] px-2 py-0.5 rounded border ${
                                sentLogs[st.id] === 'success'
                                  ? 'bg-emerald-955 text-emerald-450 border-emerald-900/30'
                                  : 'bg-amber-955 text-amber-500 border-amber-900/30'
                              }`}>
                                {sentLogs[st.id] === 'success' ? 'تم الفتح بنجاح ✅' : 'تم التخطي ⏩'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 bg-neutral-950 p-2 border border-zinc-900/40 rounded leading-relaxed">
                            {parsedMsg}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const url = getWhatsAppLink(st.phone, parsedMsg);
                          const a = document.createElement('a');
                          a.href = url;
                          if (whatsappPlatform !== 'desktop') a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-2 bg-zinc-900 hover:bg-emerald-950/20 border border-zinc-800 hover:border-emerald-900/30 text-zinc-300 hover:text-emerald-400 transition-colors rounded-lg text-[10px] font-bold cursor-pointer shrink-0 self-end sm:self-center flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        إرسال مفرد
                      </button>
                    </div>
                  );
                })}

                {absentStudents.length === 0 && (
                  <div className="p-12 text-center text-zinc-650 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-xl font-sans text-xs">
                    لم يتم العثور على طلاب غائبين في الجلسة المحددة، أو لا توجد جلسات بها غيابات مرصودة حالياً.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            TAB 2: CLASS REMINDER
            ========================================== */}
        {activeTab === 'class-reminder' && (
          <>
            {/* Left side: upcoming session selection and message text */}
            <div className="lg:col-span-5 bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-5 h-fit">
              <div className="border-b border-zinc-900 pb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                  جدولة تذكيرات المحاضرات القادمة
                </span>
                <span className="text-[10px] text-zinc-550 block mt-1 font-sans">
                  إرسال تذكير للطلاب بالموعد والوقت المخطط للمحاضرات المستقبلية.
                </span>
              </div>

              {/* Upcoming Session Selector */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">المحاضرة القادمة المرتقبة:</label>
                <select
                  value={selectedReminderSessionId}
                  onChange={(e) => setSelectedReminderSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#07070A] border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-hidden cursor-pointer"
                >
                  {upcomingSessions.length === 0 ? (
                    <option value="">-- لا توجد محاضرات قادمة مجدولة --</option>
                  ) : (
                    upcomingSessions.map(ses => (
                      <option key={ses.id} value={ses.id}>
                        {ses.title} ({ses.date})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Custom message text box editor */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">قالب التذكير الذكي للمحاضرة:</label>
                <textarea
                  value={reminderTemplateText}
                  onChange={(e) => setReminderTemplateText(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-[#07070A] border border-zinc-850 text-xs text-zinc-300 rounded-lg outline-hidden focus:border-indigo-500 leading-relaxed"
                  placeholder="اكتب قالب التذكير هنا..."
                />
                <span className="text-[9px] text-zinc-500 leading-relaxed block">
                  يدعم المتغيرات: `{`{اسم_الطالب}`}`، `{`{اسم_الدبلومة}`}`، `{`{تاريخ_المحاضرة}`}`، `{`{وقت_المحاضرة}`}`.
                </span>
              </div>
            </div>

            {/* Right side: Enrolled students list */}
            <div className="lg:col-span-7 bg-[#0B0B0E] border border-zinc-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold text-zinc-200">الطلاب المسجلين بالدبلومة</h3>
                  <span className="text-[10px] text-zinc-500 font-sans block">
                    سيتم إرسال تذكير باللقاء القادم إلى {enrolledStudents.length} طلاب مسجلين.
                  </span>
                </div>

                {enrolledStudents.length > 0 && (
                  <button
                    onClick={() => startBulkSend('reminder')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:text-white text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:shadow-emerald-600/10"
                  >
                    <Send className="w-3.5 h-3.5" />
                    إرسال التذكيرات للمحددين ({Object.values(selectedReminderStudents).filter(Boolean).length})
                  </button>
                )}
              </div>

              {/* Selection togglers */}
              {enrolledStudents.length > 0 && (
                <div className="flex items-center gap-3 text-[10px] text-zinc-450 font-sans select-none border-b border-zinc-950 pb-2">
                  <button
                    onClick={() => {
                      const checked: Record<string, boolean> = {};
                      enrolledStudents.forEach(s => checked[s.id] = true);
                      setSelectedReminderStudents(checked);
                    }}
                    className="hover:text-indigo-400 cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setSelectedReminderStudents({})}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {enrolledStudents.map((st) => {
                  const isChecked = !!selectedReminderStudents[st.id];
                  const parsedMsg = compileMessage(
                    reminderTemplateText,
                    st,
                    diplomas.find(d => d.id === selectedDiplomaId),
                    sessions.find(s => s.id === selectedReminderSessionId)
                  );
                  return (
                    <div
                      key={`rem-st-${st.id}`}
                      className={`p-3 bg-[#07070A] border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                        isChecked ? 'border-zinc-800' : 'border-zinc-950 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedReminderStudents(prev => ({
                              ...prev,
                              [st.id]: e.target.checked
                            }));
                          }}
                          className="mt-1 w-3.5 h-3.5 text-emerald-500 rounded border-zinc-800 bg-[#07070A] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5 flex-1 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{st.name}</span>
                            <span className="text-[9px] text-zinc-555 font-mono">
                              هاتف: {st.phone}
                            </span>
                            {sentLogs[st.id] && (
                              <span className={`text-[9px] px-2 py-0.5 rounded border ${
                                sentLogs[st.id] === 'success'
                                  ? 'bg-emerald-955 text-emerald-450 border-emerald-900/30'
                                  : 'bg-amber-955 text-amber-500 border-amber-900/30'
                              }`}>
                                {sentLogs[st.id] === 'success' ? 'تم الفتح بنجاح ✅' : 'تم التخطي ⏩'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 bg-neutral-950 p-2 border border-zinc-900/40 rounded leading-relaxed">
                            {parsedMsg}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const url = getWhatsAppLink(st.phone, parsedMsg);
                          const a = document.createElement('a');
                          a.href = url;
                          if (whatsappPlatform !== 'desktop') a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-2 bg-zinc-900 hover:bg-emerald-955/20 border border-zinc-800 hover:border-emerald-900/30 text-zinc-300 hover:text-emerald-400 transition-colors rounded-lg text-[10px] font-bold cursor-pointer shrink-0 self-end sm:self-center flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        إرسال مفرد
                      </button>
                    </div>
                  );
                })}

                {enrolledStudents.length === 0 && (
                  <div className="p-12 text-center text-zinc-650 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-xl font-sans text-xs">
                    لا يوجد طلاب مسجلون بهذه الدبلومة لإشعارهم.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            TAB 3: CUSTOM MESSAGES
            ========================================== */}
        {activeTab === 'custom-message' && (
          <>
            {/* Left side: Custom Message Text Area with smart variables */}
            <div className="lg:col-span-5 bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 space-y-5 h-fit">
              <div className="border-b border-zinc-900 pb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  مراسلة خاصة مخصّصة للطلاب
                </span>
                <span className="text-[10px] text-zinc-550 block mt-1 font-sans">
                  اكتب رسالتك الخاصة للطلاب المحددّين. اضغط على المتغيرات الذكية بالأسفل لإضافتها في الرسالة.
                </span>
              </div>

              {/* Textarea for typing */}
              <div className="space-y-2 font-sans">
                <label className="block text-xs text-zinc-400 font-semibold">نص الرسالة الخاصة:</label>
                <textarea
                  ref={customTextAreaRef}
                  value={customMessageText}
                  onChange={(e) => setCustomMessageText(e.target.value)}
                  onSelect={handleTextareaSelect}
                  rows={8}
                  className="w-full p-3 bg-[#07070A] border border-zinc-850 text-xs text-zinc-300 rounded-lg outline-hidden focus:border-emerald-500 leading-relaxed"
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>

              {/* Interactive Smart Tags */}
              <div className="space-y-2 font-sans">
                <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider">اضغط لإضافة متغير ذكي:</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { tag: '{اسم_الطالب}', label: 'اسم الطالب 👤' },
                    { tag: '{اسم_الدبلومة}', label: 'اسم الدبلوم 📘' },
                    { tag: '{تاريخ_المحاضرة}', label: 'تاريخ المحاضرة 📅' },
                    { tag: '{وقت_المحاضرة}', label: 'وقت المحاضرة ⏰' },
                    { tag: '{عدد_الغياب}', label: 'عدد الغيابات 🔴' }
                  ].map(v => (
                    <button
                      key={v.tag}
                      onClick={() => insertVariable(v.tag)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-[#1a1a24] border border-zinc-800 hover:border-indigo-900/40 text-indigo-300 hover:text-indigo-250 transition-all rounded text-[10px] font-bold cursor-pointer font-sans"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right list: Checkbox selection of students */}
            <div className="lg:col-span-7 bg-[#0B0B0E] border border-zinc-900 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-900 pb-3">
                <div className="space-y-1 w-full max-w-xs relative font-sans">
                  {/* Search box */}
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن طالب بالاسم أو الهاتف..."
                    className="w-full pl-3 pr-8 py-1.5 bg-[#07070A] border border-zinc-850 text-xs text-zinc-300 rounded-lg outline-hidden focus:border-zinc-700"
                  />
                </div>

                {customFilteredStudents.length > 0 && (
                  <button
                    onClick={() => startBulkSend('custom')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:text-white text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:shadow-emerald-600/10 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    إرسال الرسالة الخاصة للمحددين ({Object.values(selectedCustomStudents).filter(Boolean).length})
                  </button>
                )}
              </div>

              {/* Selection actions */}
              {customFilteredStudents.length > 0 && (
                <div className="flex items-center gap-3 text-[10px] text-zinc-450 font-sans select-none border-b border-zinc-950 pb-2">
                  <button
                    onClick={() => {
                      const checked: Record<string, boolean> = {};
                      customFilteredStudents.forEach(s => checked[s.id] = true);
                      setSelectedCustomStudents(checked);
                    }}
                    className="hover:text-indigo-400 cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setSelectedCustomStudents({})}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              )}

              {/* Student list */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {customFilteredStudents.map((st) => {
                  const isChecked = !!selectedCustomStudents[st.id];
                  const parsedMsg = compileMessage(
                    customMessageText,
                    st,
                    diplomas.find(d => d.id === selectedDiplomaId)
                  );
                  return (
                    <div
                      key={`cust-st-${st.id}`}
                      className={`p-3 bg-[#07070A] border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                        isChecked ? 'border-zinc-800' : 'border-zinc-950 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedCustomStudents(prev => ({
                              ...prev,
                              [st.id]: e.target.checked
                            }));
                          }}
                          className="mt-1 w-3.5 h-3.5 text-emerald-500 rounded border-zinc-800 bg-[#07070A] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                        />
                        <div className="space-y-1.5 flex-1 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{st.name}</span>
                            <span className="text-[9px] text-zinc-555 font-mono">
                              هاتف: {st.phone}
                            </span>
                            {sentLogs[st.id] && (
                              <span className={`text-[9px] px-2 py-0.5 rounded border ${
                                sentLogs[st.id] === 'success'
                                  ? 'bg-emerald-955 text-emerald-450 border-emerald-900/30'
                                  : 'bg-amber-955 text-amber-500 border-amber-900/30'
                              }`}>
                                {sentLogs[st.id] === 'success' ? 'تم الفتح بنجاح ✅' : 'تم التخطي ⏩'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 bg-neutral-950 p-2 border border-zinc-900/40 rounded leading-relaxed">
                            {parsedMsg}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const url = getWhatsAppLink(st.phone, parsedMsg);
                          const a = document.createElement('a');
                          a.href = url;
                          if (whatsappPlatform !== 'desktop') a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                        className="px-3 py-2 bg-zinc-900 hover:bg-emerald-955/20 border border-zinc-800 hover:border-emerald-900/30 text-zinc-300 hover:text-emerald-400 transition-colors rounded-lg text-[10px] font-bold cursor-pointer shrink-0 self-end sm:self-center flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        إرسال مفرد
                      </button>
                    </div>
                  );
                })}

                {customFilteredStudents.length === 0 && (
                  <div className="p-12 text-center text-zinc-650 bg-neutral-950/20 border border-dashed border-zinc-900 rounded-xl font-sans text-xs">
                    لا يوجد طلاب يطابقون شروط البحث أو مسجلين بهذه الدبلومة.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==========================================
            TAB 4: UNIFIED BROADCASTER
            ========================================== */}
        {activeTab === 'broadcaster' && (
          <div className="lg:col-span-12 space-y-6 animate-fadeIn" dir="rtl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Right Column: Writing & Selecting target groups */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Message Editor Card */}
                <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-amber-400" />
                      <h3 className="text-xs font-bold text-white">صياغة التعميم الموحد</h3>
                    </div>
                    
                    {/* AI Polishing Buttons */}
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="text-[10px] text-zinc-500 ml-1">تحسين الذكاء الاصطناعي:</span>
                      <button
                        disabled={polishingBroadcast}
                        onClick={() => handlePolishMessage('broadcaster', 'friendly')}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        {polishingBroadcast ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                        ودي
                      </button>
                      <button
                        disabled={polishingBroadcast}
                        onClick={() => handlePolishMessage('broadcaster', 'formal')}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        رسمي
                      </button>
                      <button
                        disabled={polishingBroadcast}
                        onClick={() => handlePolishMessage('broadcaster', 'warning')}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        تنبيه
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] text-zinc-400 font-sans font-bold">نص التعميم:</label>
                    <textarea
                      ref={broadcastTextAreaRef}
                      value={broadcastMessageText}
                      onChange={(e) => setBroadcastMessageText(e.target.value)}
                      onSelect={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        setBroadcastSelectionStart(target.selectionStart);
                      }}
                      className="w-full h-44 px-3 py-2 bg-black border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-xs text-white rounded-xl outline-none resize-y font-sans leading-relaxed text-right"
                      placeholder="اكتب رسالة التعميم هنا..."
                    />
                  </div>

                  {/* Variable Injection Chips */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-zinc-500 font-sans font-bold">انقر لإدراج متغيرات مخصصة لكل دبلومة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { token: '{اسم_الدبلومة}', label: '🎓 اسم الدبلوم' },
                        { token: '{رابط_المجموعة}', label: '🔗 رابط مجموعة الواتساب' },
                        { token: '{اسم_المدرب}', label: '👨‍🏫 اسم المدرب' },
                        { token: '{وقت_المحاضرة}', label: '⏰ وقت المحاضرة' }
                      ].map((item) => (
                        <button
                          key={item.token}
                          type="button"
                          onClick={() => {
                            const txtArea = broadcastTextAreaRef.current;
                            if (txtArea) {
                              const pos = broadcastSelectionStart !== null ? broadcastSelectionStart : broadcastMessageText.length;
                              const before = broadcastMessageText.substring(0, pos);
                              const after = broadcastMessageText.substring(pos);
                              const newText = before + item.token + after;
                              setBroadcastMessageText(newText);
                              // Refocus
                              setTimeout(() => {
                                txtArea.focus();
                                const newPos = pos + item.token.length;
                                txtArea.setSelectionRange(newPos, newPos);
                                setBroadcastSelectionStart(newPos);
                              }, 50);
                            } else {
                              setBroadcastMessageText(prev => prev + item.token);
                            }
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[10px] font-semibold rounded-lg transition-all cursor-pointer font-sans"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Target Groups Selector Card */}
                <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      <h3 className="text-xs font-bold text-white">المجموعات والجروبات المستهدفة</h3>
                    </div>
                    <div className="flex items-center gap-2 font-sans">
                      <button
                        onClick={() => {
                          const initial: Record<string, boolean> = {};
                          diplomas.forEach(d => {
                            if (d.status === 'Active' || d.status === 'Upcoming') {
                              initial[d.id] = true;
                            }
                          });
                          setSelectedBroadcastDiplomas(initial);
                        }}
                        className="text-[10px] text-amber-400 hover:underline cursor-pointer font-bold"
                      >
                        تحديد النشطة
                      </button>
                      <span className="text-zinc-700">|</span>
                      <button
                        onClick={() => setSelectedBroadcastDiplomas({})}
                        className="text-[10px] text-zinc-500 hover:underline cursor-pointer font-bold"
                      >
                        إلغاء الكل
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {diplomas.map((d) => {
                      const isSelected = !!selectedBroadcastDiplomas[d.id];
                      const totalSt = students.filter(s => s.diplomaIds.includes(d.id)).length;
                      
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            setSelectedBroadcastDiplomas(prev => ({
                              ...prev,
                              [d.id]: !prev[d.id]
                            }));
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-500/30 bg-amber-955/5'
                              : 'border-zinc-900 bg-zinc-950/20 hover:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by div onClick
                              className="w-3.5 h-3.5 rounded border-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 bg-black cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-zinc-200 block text-right">{d.name}</span>
                              <span className="text-[10px] text-zinc-500 font-sans block mt-0.5 text-right">
                                {d.whatsappGroupUrl ? '🔗 الرابط متاح' : '⚠️ لا يوجد رابط مجموعة'} · عدد الطلاب: {totalSt}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border font-sans ${
                            d.status === 'Active'
                              ? 'text-emerald-400 border-emerald-950/40 bg-emerald-950/10'
                              : d.status === 'Upcoming'
                              ? 'text-amber-400 border-amber-950/30 bg-amber-950/10'
                              : 'text-zinc-500 border-zinc-800/40 bg-zinc-900/10'
                          }`}>
                            {d.status === 'Active' ? 'نشط' : d.status === 'Upcoming' ? 'قادم' : 'مكتمل'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Left Column: Action Pipeline & Customized Message Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-400" />
                      خطوات الإرسال المخصصة
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-sans font-bold">
                      المجموعات المحددة: {Object.values(selectedBroadcastDiplomas).filter(Boolean).length}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans text-right">
                    يتيح لك البث كتابة رسالة موحدة وتكييفها لكل مجموعة تلقائياً. انسخ النص المناسب ثم افتح رابط المجموعة للصقه فوراً.
                  </p>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {diplomas
                      .filter(d => !!selectedBroadcastDiplomas[d.id])
                      .map((d) => {
                        const isCopied = !!copiedBroadcasts[d.id];
                        const isSent = !!sentBroadcasts[d.id];
                        
                        // Local replace helper
                        const customMsg = broadcastMessageText
                          .replace(/{اسم_الدبلومة}/g, d.name || '')
                          .replace(/{رابط_المجموعة}/g, d.whatsappGroupUrl || 'لا يوجد رابط')
                          .replace(/{اسم_المدرب}/g, d.instructorName || 'غير محدد')
                          .replace(/{وقت_المحاضرة}/g, d.sessionTime || 'غير محدد');

                        return (
                          <div
                            key={d.id}
                            className={`p-4 rounded-xl border space-y-3 transition-all ${
                              isSent
                                ? 'border-emerald-900/40 bg-emerald-950/5'
                                : 'border-zinc-900 bg-zinc-950/40'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2">
                              <div>
                                <span className="text-xs font-black text-zinc-200 block text-right">{d.name}</span>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-sans ${
                                isSent
                                  ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-900/40'
                                  : 'text-zinc-500 bg-zinc-900/30 border border-zinc-800'
                              }`}>
                                {isSent ? '✓ تم الفتح' : 'انتظار'}
                              </span>
                            </div>

                            {/* Message Preview */}
                            <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-900 text-[10px] text-zinc-300 font-sans whitespace-pre-wrap leading-relaxed text-right">
                              {customMsg}
                            </div>

                            {/* Actions Row */}
                            <div className="flex items-center gap-2 pt-1 font-sans">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(customMsg).then(() => {
                                    setCopiedBroadcasts(prev => ({ ...prev, [d.id]: true }));
                                    setTimeout(() => {
                                      setCopiedBroadcasts(prev => ({ ...prev, [d.id]: false }));
                                    }, 2000);
                                  });
                                }}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                                }`}
                              >
                                <Check className={`w-3 h-3 ${isCopied ? 'block' : 'hidden'}`} />
                                {isCopied ? 'تم النسخ!' : 'نسخ النص'}
                              </button>

                              <button
                                onClick={() => {
                                  setSentBroadcasts(prev => ({ ...prev, [d.id]: true }));
                                  if (d.whatsappGroupUrl) {
                                    window.open(d.whatsappGroupUrl, '_blank');
                                  } else {
                                    // Fallback to main WhatsApp Web
                                    window.open('https://web.whatsapp.com/', '_blank');
                                  }
                                }}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                فتح المجموعة
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {Object.values(selectedBroadcastDiplomas).filter(Boolean).length === 0 && (
                      <div className="p-8 text-center text-zinc-600 text-xs font-sans">
                        يرجى تحديد مجموعة واحدة على الأقل من القائمة لبدء الإرسال.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ==========================================
          MODAL: BULK DISPATCH QUEUE SYSTEM
          ========================================== */}
      <AnimatePresence>
        {isQueueActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs text-right" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.85)]"
            >
              
              {/* Header */}
              <div className="p-5 border-b border-zinc-900 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-emerald-450 ${isAutoSending ? 'animate-spin' : ''}`} />
                    مُعالج الإرسال الجماعي النشط
                  </h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">
                    يتم تحضير وفتح محادثات الطلاب متتالياً. يرجى تفعيل السماح بالنوافذ المنبثقة (Popups).
                  </p>
                </div>
                <button
                  onClick={closeQueueModal}
                  className="p-1 text-zinc-500 hover:text-zinc-350 hover:bg-zinc-900 rounded transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Panel */}
              <div className="p-6 space-y-6 font-sans">
                
                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                    <span className="block text-[10px] text-zinc-500">تم الفتح بنجاح:</span>
                    <span className="text-lg font-black text-emerald-400 font-mono block mt-0.5">
                      {queue.filter(q => q.status === 'success').length} / {queue.length}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                    <span className="block text-[10px] text-zinc-500">مستبعد (تخطي):</span>
                    <span className="text-lg font-black text-amber-500 font-mono block mt-0.5">
                      {queue.filter(q => q.status === 'skipped').length}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                    <span className="block text-[10px] text-zinc-500">متبقي بالصف:</span>
                    <span className="text-lg font-black text-indigo-400 font-mono block mt-0.5">
                      {queue.filter(q => q.status === 'pending').length}
                    </span>
                  </div>
                </div>

                {/* Current Student Preview Card */}
                {queueIndex < queue.length ? (
                  <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
                    
                    {/* Student Business Card Header */}
                    <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">تحضير مراسلة: {queue[queueIndex].student.name}</span>
                          <span className="text-[9px] text-zinc-500 block mt-0.5 font-sans">الجلسة المرصودة النشطة</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">{queue[queueIndex].phone}</span>
                    </div>

                    {/* Popup Blocker Alert */}
                    {popupBlockerTriggered && (
                      <div className="p-3.5 bg-rose-955/35 border border-rose-900/40 rounded-xl text-center text-xs text-rose-400 font-bold font-sans animate-pulse flex flex-col items-center justify-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        <span>🚨 <strong>تم حظر فتح النوافذ المنبثقة!</strong> يرجى الضغط على أيقونة الحظر في شريط عنوان المتصفح بالأعلى واختيار "السماح دائماً بالنوافذ المنبثقة من هذا الموقع" ثم إعادة تفعيل المراسلة المستمرة.</span>
                      </div>
                    )}

                    {/* Countdown Progress Indicator */}
                    {countdown !== null && (
                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-center text-xs text-indigo-400 font-bold font-sans animate-pulse flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>سيتم فتح شات الطالب التالي تلقائياً خلال {countdown} ثوانٍ...</span>
                      </div>
                    )}

                    {/* WhatsApp Chat Bubble style editable text area */}
                    <div className="space-y-1">
                      <label className="block text-[10px] text-zinc-555 font-bold uppercase tracking-wider">مراجعة وتعديل نص الرسالة للمستلم:</label>
                      <div className="relative">
                        <textarea
                          value={queue[queueIndex]?.message || ''}
                          onChange={(e) => {
                            const newMsg = e.target.value;
                            setQueue(prev => prev.map((item, idx) => idx === queueIndex ? { ...item, message: newMsg } : item));
                          }}
                          rows={4}
                          className="w-full p-3 bg-[#0d3c2e]/60 focus:bg-[#0d3c2e]/80 border border-emerald-900/30 focus:border-emerald-800/40 text-emerald-100 rounded-xl text-[11px] leading-relaxed resize-none font-sans text-right outline-none transition-all"
                          placeholder="اكتب رسالتك المخصصة للطالب هنا..."
                        />
                        {/* WhatsApp Bubble Indicator ذيل الفقاعة */}
                        <div className="absolute top-3 -left-1.5 w-3 h-3 bg-[#0d3c2e]/60 border-l border-b border-emerald-900/30 rotate-45 hidden sm:block" />
                      </div>
                    </div>

                    {/* Controller Triggers */}
                    <div className="flex flex-col gap-4 pt-1 border-t border-zinc-900/50">
                      
                      {/* Top Row: Auto Send Switch, Delay & Platform Selector */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950/50 p-3 rounded-xl border border-zinc-900 font-sans">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAutoSending}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  // Pre-emptively open the helper window on user gesture to avoid popup blocker!
                                  if (!whatsappWindowRef.current || whatsappWindowRef.current.closed) {
                                    const currentItem = queue[queueIndex];
                                    if (currentItem) {
                                      let cleanPhone = currentItem.phone.replace(/[^\d+]/g, '');
                                      const encodedText = encodeURIComponent(currentItem.message);
                                      let url = '';
                                      if (whatsappPlatform === 'web') {
                                        url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
                                      } else {
                                        url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
                                      }
                                      
                                      const newWin = window.open(
                                        url, 
                                        'whatsapp_auto_dispatch', 
                                        whatsappPlatform === 'desktop' ? 'width=450,height=300' : undefined
                                      );
                                      whatsappWindowRef.current = newWin;
                                    }
                                  }
                                }
                                setIsAutoSending(checked);
                              }}
                              className="w-3.5 h-3.5 text-emerald-500 rounded border-zinc-800 bg-[#07070A] focus:ring-0 cursor-pointer"
                            />
                            <span>تشغيل الإرسال التلقائي المستمر</span>
                          </label>
                          <span className="text-zinc-850">|</span>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <span>الفاصل:</span>
                            <select
                              value={delaySeconds}
                              onChange={(e) => setDelaySeconds(Number(e.target.value))}
                              disabled={isAutoSending}
                              className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-indigo-400 font-bold cursor-pointer outline-none focus:ring-0"
                            >
                              <option value={3}>3 ثوانٍ</option>
                              <option value={5}>5 ثوانٍ</option>
                              <option value={10}>10 ثوانٍ</option>
                              <option value={15}>15 ثانية</option>
                            </select>
                          </div>
                          <span className="text-zinc-850">|</span>
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <span>المنصة:</span>
                            <select
                              value={whatsappPlatform}
                              onChange={(e) => setWhatsappPlatform(e.target.value as any)}
                              className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-bold cursor-pointer outline-none focus:ring-0"
                            >
                              <option value="standard">الرابط القياسي (ويب/تطبيق)</option>
                              <option value="desktop">تطبيق الكمبيوتر (Desktop App) 💻</option>
                              <option value="web">واتساب ويب (WhatsApp Web) 🌐</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-[10px] text-zinc-500">طريقة فتح الرابط:</span>
                          {whatsappPlatform === 'desktop' ? (
                            <span className="text-[10px] text-zinc-500 italic">يفتح تلقائياً في تطبيق الكمبيوتر المباشر</span>
                          ) : (
                            <>
                              <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer select-none text-[10px]">
                                <input
                                  type="radio"
                                  name="sendMode"
                                  checked={sendMode === 'new-tab'}
                                  onChange={() => setSendMode('new-tab')}
                                  className="text-emerald-500 bg-[#07070A] border-zinc-800 focus:ring-0"
                                />
                                <span>علامات تبويب متعددة</span>
                              </label>
                              <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer select-none text-[10px]">
                                <input
                                  type="radio"
                                  name="sendMode"
                                  checked={sendMode === 'same-tab'}
                                  onChange={() => setSendMode('same-tab')}
                                  className="text-emerald-500 bg-[#07070A] border-zinc-800 focus:ring-0"
                                />
                                <span>تبويب موحد 🔄</span>
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 font-sans">
                        <button
                          onClick={() => {
                            if (queue[queueIndex]) {
                              navigator.clipboard.writeText(queue[queueIndex].message);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-350 hover:text-zinc-250 border border-zinc-850 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                              <span className="text-emerald-400 font-bold font-sans">تم النسخ بنجاح!</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5 text-indigo-400" />
                              <span>نسخ نص الرسالة 📋</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={handleSkipCurrent}
                            className="flex-1 sm:flex-none px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                            تخطي
                          </button>
                          
                          <button
                            onClick={() => {
                              // Pre-emptively open helper window on user gesture if not open yet
                              if (!whatsappWindowRef.current || whatsappWindowRef.current.closed) {
                                const currentItem = queue[queueIndex];
                                if (currentItem) {
                                  let cleanPhone = currentItem.phone.replace(/[^\d+]/g, '');
                                  const encodedText = encodeURIComponent(currentItem.message);
                                  let url = '';
                                  if (whatsappPlatform === 'web') {
                                    url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
                                  } else {
                                    url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
                                  }
                                  
                                  const newWin = window.open(
                                    url, 
                                    'whatsapp_auto_dispatch', 
                                    whatsappPlatform === 'desktop' ? 'width=450,height=300' : undefined
                                  );
                                  whatsappWindowRef.current = newWin;
                                }
                              }
                              processCurrentQueueItem();
                            }}
                            className="relative flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/20 hover:shadow-emerald-550/40 flex items-center justify-center gap-1.5 overflow-hidden"
                          >
                            {isAutoSending && (
                              <span className="absolute left-2 top-2.5 w-2 h-2 rounded-full bg-white animate-ping" />
                            )}
                            <Send className="w-3.5 h-3.5" />
                            افتح شات الطالب 📱
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Popup Blocker Notice */}
                    <div className="p-3 bg-amber-955/20 border border-amber-900/30 rounded-lg text-[10px] text-amber-400 leading-relaxed font-sans text-right">
                      ⚠️ <strong>ملاحظة للمتصفح:</strong> إذا توقف النظام عن فتح التابات تلقائياً، قم بالسماح بالنوافذ المنبثقة (Popups) من إعدادات المتصفح، أو استمر بالضغط على زر <strong>"افتح شات الطالب"</strong> الأخضر بشكل متتالي لمتابعة الإرسال بسرعة وسلاسة.
                    </div>

                    {/* Chrome Extension Instructions (Feature: Auto-Click & Auto-Close) */}
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 text-right">
                      <button
                        type="button"
                        onClick={() => setShowExtensionInstructions(!showExtensionInstructions)}
                        className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer font-sans"
                      >
                        ⚙️ {showExtensionInstructions ? 'إخفاء تعليمات التثبيت التلقائي ✕' : 'اضغط هنا لتفعيل المراسلة الآلية بالخلفية مجاناً (إضافة كروم) 🔗'}
                      </button>
                      
                      {showExtensionInstructions && (
                        <div className="text-[10px] text-zinc-400 leading-relaxed space-y-2 font-sans pt-1.5 border-t border-zinc-900/60">
                          <p className="text-white font-bold">خطوات تشغيل الإرسال الآلي بدون مجهود وبشكل مجاني تماماً:</p>
                          <ol className="list-decimal list-inside space-y-1 text-zinc-450 mr-1.5">
                            <li>افتح مجلد المشروع واذهب للمجلد المسمى <code className="text-indigo-350 font-mono bg-zinc-900/60 px-1 py-0.5 rounded">whatsapp-extension</code>.</li>
                            <li>افتح متصفح جوجل كروم واذهب للرابط التالي: <code className="text-emerald-400 font-mono bg-zinc-900/60 px-1.5 py-0.5 rounded select-all">chrome://extensions</code>.</li>
                            <li>قم بتفعيل خيار **"وضع مطور البرامج (Developer Mode)"** في أعلى يسار الصفحة.</li>
                            <li>اضغط على زر **"تحميل حزمة غير مغلفة (Load Unpacked)"** واختر مجلد <code className="text-indigo-350 font-mono bg-zinc-900/60 px-1 py-0.5 rounded">whatsapp-extension</code>.</li>
                            <li>الآن، اضبط خيار المنصة بالأسفل على **"واتساب ويب (WhatsApp Web) 🌐"** وقم بتشغيل خيار **"الإرسال التلقائي"**، وسيقوم النظام بالإرسال وإغلاق التبويبات تلقائياً بالخلفية دون تدخل منك!</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-emerald-950/10 border border-emerald-900/20 rounded-xl space-y-2">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h4 className="text-xs font-bold text-white">اكتمل إرسال جميع الرسائل بنجاح!</h4>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      تم المرور على جميع الطلاب وتوجيههم لغرف الواتساب الخاصة بهم.
                    </p>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-900 flex items-center justify-end bg-zinc-950/25">
                <button
                  onClick={closeQueueModal}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  إغلاق نافذة العمليات
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
