import React, { useState, useEffect, useRef } from 'react';
import { Student, Diploma, Session, Task, AppConfig, Instructor, DiplomaType, ScheduledMessage } from '../types';
import { callGroqChatCompletion } from '../services/groq';
import { createScheduledMessage, parseScheduleTime, formatScheduledAt } from '../services/scheduler';
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Key, 
  HelpCircle, 
  Bot, 
  User, 
  RefreshCw, 
  AlertCircle, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  Calendar,
  Brain,
  History,
  Plus,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantProps {
  currentUser: string | null;
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  tasks: Task[];
  config: AppConfig | null;
  instructors: Instructor[];
  diplomaTypes: DiplomaType[];
  onNavigateToSettings: () => void;
  onSaveDiplomas: (data: Diploma[]) => void;
  onSaveStudents: (data: Student[]) => void;
  onSaveSessions: (data: Session[]) => void;
  onSaveTasks: (data: Task[]) => void;
  onSaveConfig: (data: AppConfig) => void;
  mode?: 'floating' | 'embedded';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
}

interface AIAction {
  type: 'CREATE_DIPLOMA' | 'CREATE_TASK' | 'GENERATE_SESSIONS' | 'UPDATE_ATTENDANCE' | 'GENERATE_CERTIFICATE' | 'SCHEDULE_MESSAGE';
  params: {
    name?: string;
    instructorName?: string;
    studyDays?: string;
    sessionTime?: string;
    startDate?: string;
    endDate?: string;
    title?: string;
    dueDate?: string;
    priority?: 'Low' | 'Medium' | 'High';
    notes?: string;
    diplomaId?: string;
    diplomaName?: string;
    numberOfSessions?: number;
    studentName?: string;
    sessionTitle?: string;
    sessionDate?: string;
    status?: 'Present' | 'Absent' | 'Excused';
    note?: string;
    studentNameForCert?: string;
    diplomaNameForCert?: string;
    dateForCert?: string;
    // Scheduling params
    scheduledAt?: string;        // ISO datetime or natural language
    messageType?: ScheduledMessage['messageType'];
    messageTemplate?: string;
    targetGroup?: ScheduledMessage['targetGroup'];
  };
  rawText: string;
}

export default function AIAssistant({
  currentUser,
  students,
  diplomas,
  sessions,
  tasks,
  config,
  instructors,
  diplomaTypes,
  onNavigateToSettings,
  onSaveDiplomas,
  onSaveStudents,
  onSaveSessions,
  onSaveTasks,
  onSaveConfig,
  mode = 'floating'
}: AIAssistantProps) {
  const [editedParams, setEditedParams] = useState<any>({});
  const [isOpen, setIsOpen] = useState(mode === 'embedded');

  useEffect(() => {
    if (mode === 'embedded') {
      setIsOpen(true);
    }
  }, [mode]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Actions State
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);

  // Certificate edit states
  const [editCertName, setEditCertName] = useState('');
  const [editCertDiploma, setEditCertDiploma] = useState('');
  const [editCertHours, setEditCertHours] = useState('');
  const [editCertDate, setEditCertDate] = useState('');

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const activeApiKey = config?.groqApiKey || (import.meta as any).env.VITE_GROQ_API_KEY || '';
  const hasApiKey = !!activeApiKey.trim();
  const activeModel = config?.groqModel || 'llama-3.3-70b-versatile';

  const SUGGESTED_PROMPTS = [
    'مين غيابه كتير وبيهدده الفصل؟',
    'مين عنده قسط متأخر ومش دافع؟',
    'لخص لي أهم المهام المعلقة والمطلوب منك فعله اليوم',
    'ضيف دبلوم هندسة الشبكات والمدرب م. أحمد الشمري ومواعيدها الأحد والأربعاء',
    'اعمل جلسة لدبلوم الأمن السيبراني السبت الجاي الساعة 6 مساءً',
    'اعمل شهادة تخرج لسلمى سمير في دبلوم الذكاء الاصطناعي بتاريخ اليوم'
  ];

  // Multi-session History States
  const [sessionsList, setSessionsList] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Helper: Get user-scoped storage key for sessions
  const getSessionsStorageKey = () => {
    return currentUser ? `crm_ai_chat_sessions_${currentUser}` : 'crm_ai_chat_sessions';
  };

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    window.addEventListener('TOGGLE_SAYED_AI', handleToggle);
    return () => {
      window.removeEventListener('TOGGLE_SAYED_AI', handleToggle);
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'ar-EG';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev ? prev + ' ' + transcript : transcript);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert('إملاء الصوت غير مدعوم في متصفحك الحالي. يرجى استخدام متصفح Google Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const createWelcomeMessage = (): ChatMessage => ({
    role: 'assistant',
    content: 'مرحباً بك! أنا مساعدك الذكي المرتبط بنظام الدبلومات. يمكنني مساعدتك في صياغة الرسائل، كتابة الإعلانات، تلخيص المهام، أو تحليل بيانات المنصة. كيف يمكنني مساعدتك اليوم؟',
    timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
  });

  const startNewSession = () => {
    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'محادثة جديدة',
      createdAt: new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      messages: [createWelcomeMessage()]
    };
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    setShowHistoryDrawer(false);
    setPendingAction(null);
    setError('');
  };

  // Load saved sessions on mount & ALWAYS open a clean NEW chat session
  useEffect(() => {
    const storageKey = getSessionsStorageKey();
    const saved = localStorage.getItem(storageKey);
    let loadedSessions: ChatSession[] = [];

    if (saved) {
      try {
        loadedSessions = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat sessions', e);
      }
    } else {
      // Migrate old single history format if present
      const oldKey = currentUser ? `crm_ai_chat_history_${currentUser}` : 'crm_ai_chat_history';
      const oldSaved = localStorage.getItem(oldKey);
      if (oldSaved) {
        try {
          const oldMsgs: ChatMessage[] = JSON.parse(oldSaved);
          if (oldMsgs.length > 1) {
            const firstUser = oldMsgs.find(m => m.role === 'user');
            const title = firstUser ? (firstUser.content.slice(0, 30) + '...') : 'المحادثة السابقة';
            loadedSessions = [{
              id: 'session_migrated_' + Date.now(),
              title,
              createdAt: 'سابقاً',
              messages: oldMsgs
            }];
            localStorage.setItem(storageKey, JSON.stringify(loadedSessions));
          }
        } catch (e) {}
      }
    }

    setSessionsList(loadedSessions);
    // Always start with a fresh new session when opening/entering the AI Assistant!
    startNewSession();
  }, [currentUser]);

  // Save active conversation into current session in sessionsList & LocalStorage
  const saveChatHistory = (msgs: ChatMessage[]) => {
    if (!currentSessionId) return;

    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (!firstUserMsg) return;

    const autoTitle = firstUserMsg.content.trim().slice(0, 35) + (firstUserMsg.content.length > 35 ? '...' : '');

    setSessionsList(prevSessions => {
      const existingIdx = prevSessions.findIndex(s => s.id === currentSessionId);
      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: existingIdx >= 0 && prevSessions[existingIdx].title !== 'محادثة جديدة' ? prevSessions[existingIdx].title : autoTitle,
        createdAt: existingIdx >= 0 ? prevSessions[existingIdx].createdAt : new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        messages: msgs
      };

      let newSessions: ChatSession[];
      if (existingIdx >= 0) {
        newSessions = [...prevSessions];
        newSessions[existingIdx] = updatedSession;
      } else {
        newSessions = [updatedSession, ...prevSessions];
      }

      localStorage.setItem(getSessionsStorageKey(), JSON.stringify(newSessions));
      return newSessions;
    });
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistoryDrawer(false);
    setPendingAction(null);
    setError('');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessionsList.filter(s => s.id !== sessionId);
    setSessionsList(updated);
    localStorage.setItem(getSessionsStorageKey(), JSON.stringify(updated));
    if (currentSessionId === sessionId) {
      startNewSession();
    }
  };

  const handleClearAllSessions = () => {
    if (window.confirm('هل تريد مسح جميع المحادثات المخزنة في السجل؟')) {
      setSessionsList([]);
      localStorage.removeItem(getSessionsStorageKey());
      startNewSession();
    }
  };

  const handleClearCurrentChat = () => {
    if (window.confirm('هل تريد مسح المحادثة الحالية؟')) {
      if (currentSessionId) {
        const updated = sessionsList.filter(s => s.id !== currentSessionId);
        setSessionsList(updated);
        localStorage.setItem(getSessionsStorageKey(), JSON.stringify(updated));
      }
      startNewSession();
    }
  };

  const buildSystemPrompt = (): string => {
    const activeDips = diplomas.filter(d => d.status === 'Active');
    const pendingTasks = tasks.filter(t => t.status !== 'Completed');
    const today = new Date().toISOString().split('T')[0];

    // ── 1. Compute at-risk students (absences > diploma.allowedAbsences) ──
    const atRiskStudents: { name: string; phone: string; diploma: string; absentCount: number; allowed: number }[] = [];
    activeDips.forEach(dip => {
      const allowed = dip.allowedAbsences ?? 3;
      const dipSessions = sessions.filter(s => s.diplomaId === dip.id);
      const dipStudents = students.filter(st => st.diplomaIds.includes(dip.id));
      dipStudents.forEach(st => {
        const absentCount = dipSessions.reduce((acc, s) => {
          const att = s.attendance?.[st.id];
          return acc + (att?.status === 'Absent' ? 1 : 0);
        }, 0);
        if (absentCount > allowed) {
          atRiskStudents.push({ name: st.name, phone: st.phone, diploma: dip.name, absentCount, allowed });
        }
      });
    });

    // ── 2. Compute students with overdue payments ──
    const overdueStudents = students
      .filter(st => (st.remainingAmount ?? 0) > 0)
      .map(st => ({
        name: st.name,
        phone: st.phone,
        remaining: st.remainingAmount ?? 0,
        paid: st.payedAmount ?? 0,
        total: st.coursePrice ?? 0,
        diploma: diplomas.find(d => st.diplomaIds.includes(d.id))?.name || 'غير محدد'
      }));

    // ── 3. Today's sessions ──
    const todaySessions = sessions.filter(s => s.date === today);

    const atRiskBlock = atRiskStudents.length > 0
      ? `\n⚠️ الطلاب المهددون بالغياب (${atRiskStudents.length} طالب):\n` +
        atRiskStudents.map(s => `  - ${s.name} | ${s.diploma} | غاب ${s.absentCount} مرة من أصل ${s.allowed} مسموح | ☎ ${s.phone}`).join('\n')
      : '\n✅ لا يوجد طلاب مهددون بالغياب حالياً.';

    const overdueBlock = overdueStudents.length > 0
      ? `\n💰 الطلاب ذوو الأقساط المتأخرة (${overdueStudents.length} طالب):\n` +
        overdueStudents.map(s => `  - ${s.name} | ${s.diploma} | متبقي ${s.remaining} جنيه من أصل ${s.total} | دفع ${s.paid} | ☎ ${s.phone}`).join('\n')
      : '\n✅ لا يوجد أقساط متأخرة حالياً.';

    const todayBlock = todaySessions.length > 0
      ? `\n📅 محاضرات اليوم (${today}):\n` +
        todaySessions.map(s => `  - ${s.title} | ${s.startTime || ''} | ${diplomas.find(d => d.id === s.diplomaId)?.name || ''}`).join('\n')
      : '\n📅 لا توجد محاضرات مجدولة لليوم.';

    const crmContext = `
[معلومات النظام التعليمي الحالي - تاريخ اليوم: ${today}]:
- عدد الدبلومات الكلي: ${diplomas.length}
- الدبلومات النشطة حالياً: ${activeDips.map(d => `${d.name} (أيام: ${d.studyDays || 'غير محدد'}، وقت: ${d.sessionTime || 'غير محدد'}، غياب مسموح: ${d.allowedAbsences ?? 3})`).join('، ')}
- عدد الطلاب الكلي المسجلين: ${students.length}
- تفصيل الطلاب بكل دبلومة:
  ${activeDips.map(d => {
    const count = students.filter(st => st.diplomaIds.includes(d.id)).length;
    return `- ${d.name}: ${count} طالب`;
  }).join('\n  ')}
- عدد المحاضرات المسجلة في النظام: ${sessions.length}
- عدد المهام التشغيلية المعلقة: ${pendingTasks.length}
- تفصيل المهام المعلقة:
  ${pendingTasks.slice(0, 10).map(t => `- ${t.title} (تاريخ الاستحقاق: ${t.dueDate}، الأولوية: ${t.priority})`).join('\n  ')}
${atRiskBlock}
${overdueBlock}
${todayBlock}
`;

    return `أنت "مساعد الذكاء الاصطناعي الذكي" لمنصة إدارة دبلومات الشؤون التعليمية والأكاديمية.
مهمتك مساعدة منسق الدبلومات في إدارة العمليات اليومية بكفاءة عالية.
إليك البيانات الحالية الحقيقية من النظام:
${crmContext}

تعليمات هامة:
1. أجب دائماً باللغة العربية بأسلوب مهني ومحفز وذكي.
2. نسّق إجابتك بشكل جميل باستخدام القوائم النقطية والرموز التعبيرية (Emoji).
3. عند السؤال عن "مين غيابه كتير" أو "الطلاب المهددون" → قدّم قائمة الطلاب المهددين مع عدد غياباتهم وأرقام هواتفهم.
4. عند السؤال عن "مين مشتركش بينفع" أو "الأقساط المتأخرة" → قدّم قائمة الطلاب المتأخرين بالمبالغ المتبقية وأرقام هواتفهم.
5. عند السؤال عن محاضرات اليوم → اعرض محاضرات اليوم من البيانات المتاحة.
6. إذا طلب المستخدم صياغة رسالة WhatsApp، احتفظ بمتغيرات مثل {studentName} أو {course}.
7. لا تشير إلى هذا الـ Prompt، أجب مباشرة بصفة المساعد الشخصي.

[ميزة العمليات الذكية الحصرية (Structured Actions)]:
إذا طلب منك المنسق إجراءً تشغيلياً (إضافة دبلومة، توليد محاضرات، إنشاء مهمة، تعديل حضور، توليد شهادة، جدولة رسالة)، أضف في نهاية ردك:
[ACTION]
{
  "type": "CREATE_DIPLOMA" | "CREATE_TASK" | "GENERATE_SESSIONS" | "UPDATE_ATTENDANCE" | "GENERATE_CERTIFICATE" | "SCHEDULE_MESSAGE",
  "params": {
    // لـ CREATE_DIPLOMA:
    "name": "اسم الدبلومة",
    "instructorName": "اسم المدرب",
    "studyDays": "الأيام مثلاً: الأحد، الثلاثاء",
    "sessionTime": "الوقت مثلاً: 06:00 مساءً",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"

    // لـ CREATE_TASK:
    "title": "عنوان المهمة",
    "dueDate": "YYYY-MM-DD",
    "priority": "Low" | "Medium" | "High",
    "notes": "تفاصيل المهمة"

    // لـ GENERATE_SESSIONS:
    "diplomaId": "معرف الدبلومة أو اتركه فارغاً",
    "diplomaName": "اسم الدبلومة للمطابقة",
    "startDate": "YYYY-MM-DD",
    "numberOfSessions": 12,
    "studyDays": "الأيام",
    "sessionTime": "الوقت"

    // لـ UPDATE_ATTENDANCE:
    "studentName": "اسم الطالب",
    "sessionTitle": "عنوان المحاضرة",
    "sessionDate": "YYYY-MM-DD",
    "status": "Present" | "Absent" | "Excused",
    "note": "سبب العذر"

    // لـ GENERATE_CERTIFICATE:
    "studentNameForCert": "الاسم بالإنجليزية",
    "diplomaNameForCert": "اسم الدبلومة",
    "dateForCert": "YYYY-MM-DD"

    // لـ SCHEDULE_MESSAGE:
    "diplomaName": "اسم الدبلومة",
    "scheduledAt": "YYYY-MM-DDTHH:MM:SS",
    "messageType": "session_reminder" | "absence_warning" | "custom",
    "messageTemplate": "نص الرسالة مع {studentName} و{course} و{date}",
    "targetGroup": "all" | "absent_only" | "exceeded_absences"
  }
}
[/ACTION]

تنبيه: لا تخترع بيانات، إذا لم تُحدَّد معلومات اسأل عنها أو اتركها فارغة. الـ JSON يجب أن يكون صحيحاً 100%.`;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    setError('');
    setPendingAction(null);

    if (!hasApiKey) {
      setError('يرجى تهيئة مفتاح Groq API في الإعدادات أولاً.');
      return;
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInputValue('');
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      
      const aiResponse = await callGroqChatCompletion(
        activeApiKey,
        activeModel,
        systemPrompt,
        textToSend.trim()
      );

      let displayResponse = aiResponse;
      let actionData: AIAction | null = null;

      // Extract Action command if any
      const actionRegex = /\[ACTION\]([\s\S]*?)\[\/ACTION\]/i;
      const match = aiResponse.match(actionRegex);
      if (match) {
        try {
          const jsonContent = match[1].trim();
          const parsed = JSON.parse(jsonContent);
          if (parsed && parsed.type && parsed.params) {
            actionData = {
              type: parsed.type,
              params: parsed.params,
              rawText: match[0]
            };
            displayResponse = aiResponse.replace(actionRegex, '').trim();
          }
        } catch (e) {
          console.error('Failed to parse AI action JSON:', e);
        }
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: displayResponse,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);

      if (actionData) {
        setPendingAction(actionData);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'حدث خطأ غير متوقع أثناء الاتصال بالذكاء الاصطناعي.');
    } finally {
      setLoading(false);
    }
  };

  const getDiplomaName = (id?: string) => {
    if (!id) return '';
    return diplomas.find(d => d.id === id)?.name || '';
  };

  const handleCancelAction = () => {
    const systemCancelMsg: ChatMessage = {
      role: 'assistant',
      content: '❌ تم إلغاء الإجراء بنجاح ولم يتم تعديل أي بيانات.',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    const finalMessages = [...messages, systemCancelMsg];
    setMessages(finalMessages);
    saveChatHistory(finalMessages);
    setPendingAction(null);
  };

  // Helper: translate Arabic diploma name to English and map hours for the certificate
  const getDiplomaEnglishNameAndHours = (diplomaNameAr: string) => {
    // If already English, return it
    if (/[a-zA-Z]/.test(diplomaNameAr)) {
      let hours = '150';
      const lower = diplomaNameAr.toLowerCase();
      if (lower.includes('cyber') || lower.includes('security')) hours = '150';
      else if (lower.includes('ai') || lower.includes('intelligence') || lower.includes('artificial')) hours = '170';
      else if (lower.includes('data') || lower.includes('analysis')) hours = '120';
      else if (lower.includes('full') || lower.includes('stack') || lower.includes('web') || lower.includes('dev')) hours = '180';
      else if (lower.includes('ui') || lower.includes('ux')) hours = '100';
      return { nameEn: diplomaNameAr, hours };
    }

    const nameLower = diplomaNameAr.trim().toLowerCase();
    
    // Find matching type
    const type = diplomaTypes.find(t => 
      t.nameAr.trim().toLowerCase().includes(nameLower) ||
      nameLower.includes(t.nameAr.trim().toLowerCase())
    );
    
    let nameEn = 'Specialized';
    let hours = '150';
    
    if (type) {
      const typeIdLower = type.id.toLowerCase();
      if (typeIdLower.includes('cyber') || typeIdLower.includes('أمن') || typeIdLower.includes('امن')) {
        nameEn = 'Cyber Security';
        hours = '150';
      } else if (typeIdLower.includes('ai') || typeIdLower.includes('ذكاء') || typeIdLower.includes('artificial')) {
        nameEn = 'AI';
        hours = '170';
      } else if (typeIdLower.includes('da') || typeIdLower.includes('data') || typeIdLower.includes('تحليل')) {
        nameEn = 'Data Analysis';
        hours = '120';
      } else if (typeIdLower.includes('dev') || typeIdLower.includes('fs') || typeIdLower.includes('web') || typeIdLower.includes('تطوير')) {
        nameEn = 'Full Stack Web Development';
        hours = '180';
      } else if (typeIdLower.includes('uiux') || typeIdLower.includes('واجهات') || typeIdLower.includes('تجربة')) {
        nameEn = 'UI/UX Design';
        hours = '100';
      } else {
        nameEn = type.nameEn.replace(' Diploma', '');
        hours = '150';
      }
    } else {
      // Fallback manual checks
      if (nameLower.includes('أمن') || nameLower.includes('امن') || nameLower.includes('cyber')) {
        nameEn = 'Cyber Security';
        hours = '150';
      } else if (nameLower.includes('ذكاء') || nameLower.includes('ai') || nameLower.includes('artificial')) {
        nameEn = 'AI';
        hours = '170';
      }
    }
    return { nameEn, hours };
  };

  useEffect(() => {
    if (pendingAction) {
      setEditedParams({ ...pendingAction.params });
      if (pendingAction.type === 'GENERATE_CERTIFICATE') {
        setEditCertName(pendingAction.params.studentNameForCert || '');
        const dipNameAr = pendingAction.params.diplomaNameForCert || '';
        const { nameEn, hours } = getDiplomaEnglishNameAndHours(dipNameAr);
        setEditCertDiploma(nameEn);
        setEditCertHours(hours);
        setEditCertDate(pendingAction.params.dateForCert || new Date().toISOString().split('T')[0]);
      }
    } else {
      setEditedParams({});
    }
  }, [pendingAction, diplomaTypes]);

  // Generate & print PDF using browser print engine - pure CSS/SVG certificate (no raster image, infinite quality)
  const handleDownloadCertificate = (studentName: string, diplomaNameEn: string, hours: string, dateStr: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة (Popups) لتحميل وطباعة الشهادة.');
      return;
    }

    // Format date beautifully if possible
    let formattedDate = dateStr;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        formattedDate = `${parseInt(parts[2])}/${parseInt(parts[1])}/${parts[0]}`;
      }
    } catch {
      formattedDate = dateStr;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Certificate - ${studentName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          body {
            background: #eaeaea;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Outfit', sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ── Certificate card ── */
          .cert {
            width: 297mm;
            height: 210mm;
            background: #edf1f8;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 40px rgba(0,0,0,.25);
          }

          /* ── Subtle radial highlight in the middle ── */
          .cert::before {
            content:'';
            position:absolute;
            inset:0;
            background: radial-gradient(ellipse 70% 60% at 45% 55%, #ffffff 0%, #dce4f0 100%);
            z-index:0;
          }

          /* ══════════════ SVG BACKGROUND SHAPES ══════════════ */
          .bg-svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
          }

          /* ── Content layer ── */
          .content {
            position: absolute;
            inset: 0;
            z-index: 10;
            padding: 9mm 13mm;
          }

          /* ── Logo ── */
          .logo {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 7mm;
          }
          .logo-icon {
            width: 32px;
            height: 26px;
          }
          .logo-text {
            font-size: 18px;
            font-weight: 700;
            color: #1a2f6e;
            letter-spacing: 2px;
          }

          /* ── Main heading ── */
          .cert-title {
            font-size: 54px;
            font-weight: 900;
            color: #1a2f6e;
            line-height: 1;
            margin-bottom: 3mm;
            letter-spacing: -1px;
          }

          .cert-subtitle {
            font-size: 13px;
            font-weight: 400;
            color: #333;
            margin-bottom: 6mm;
          }

          /* ── Student name ── */
          .student-name {
            font-size: 34px;
            font-weight: 800;
            color: #1a2f6e;
            margin-bottom: 4mm;
          }

          /* ── Diploma text ── */
          .diploma-text {
            font-size: 13px;
            font-weight: 600;
            color: #111;
            margin-bottom: 0;
          }

          /* ── Date block ── */
          .date-block {
            position: absolute;
            bottom: 13mm;
            left: 13mm;
          }
          .date-value {
            font-size: 13px;
            font-weight: 700;
            color: #1a2f6e;
            border-bottom: 2px solid #1a2f6e;
            padding-bottom: 2px;
            min-width: 28mm;
            text-align: center;
          }
          .date-label {
            font-size: 9px;
            font-weight: 600;
            color: #555;
            text-align: center;
            letter-spacing: 1px;
            margin-top: 2px;
          }

          /* ── Bottom-right stamp logo ── */
          .stamp-logo {
            position: absolute;
            bottom: 10mm;
            right: 68mm;
            text-align: center;
            border: 2px solid #1a2f6e;
            border-radius: 4px;
            padding: 4px 8px;
            line-height: 1.15;
          }
          .stamp-logo .sl-bracket {
            font-size: 15px;
            font-weight: 900;
            color: #1a2f6e;
            letter-spacing: 1px;
          }
          .stamp-logo .sl-name {
            font-size: 8px;
            font-weight: 700;
            color: #1a2f6e;
            letter-spacing: 1px;
            display: block;
          }
          .stamp-logo .sl-sub {
            font-size: 7px;
            color: #333;
            display: block;
            letter-spacing: .5px;
          }

          @media print {
            body { background: transparent; min-height: unset; }
            .cert { box-shadow: none; }
            @page { size: A4 landscape; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="cert">

          <!-- Radial bg handled by ::before -->

          <!-- ═══ SVG decorative shapes ═══ -->
          <svg class="bg-svg" viewBox="0 0 842 595" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <!-- ── Top-right cluster ── -->
            <polygon points="842,0 700,0 842,120" fill="#1a2f6e" opacity="1"/>
            <polygon points="842,0 760,0 842,70" fill="#2a3f8e" opacity="0.6"/>
            <!-- stacked outline squares top-right -->
            <rect x="650" y="10" width="90" height="90" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.35" transform="rotate(15,695,55)"/>
            <rect x="670" y="30" width="70" height="70" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.25" transform="rotate(15,705,65)"/>
            <rect x="690" y="50" width="50" height="50" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.2" transform="rotate(15,715,75)"/>
            <!-- big diamond top-right -->
            <polygon points="842,160 750,100 842,80" fill="#1a2f6e" opacity="0.85"/>
            <polygon points="842,220 760,150 842,150" fill="#2440a0" opacity="0.5"/>

            <!-- ── Bottom-right cluster ── -->
            <polygon points="842,595 680,595 842,440" fill="#1a2f6e" opacity="1"/>
            <polygon points="842,595 750,595 842,500" fill="#2a3f8e" opacity="0.6"/>
            <!-- stacked outline squares bottom-right -->
            <rect x="680" y="470" width="90" height="90" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.35" transform="rotate(-15,725,515)"/>
            <rect x="700" y="490" width="70" height="70" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.25" transform="rotate(-15,735,525)"/>
            <!-- extra mid-right shard -->
            <polygon points="842,380 790,300 842,295" fill="#1a2f6e" opacity="0.55"/>

            <!-- ── Top-left small corner ── -->
            <polygon points="0,0 0,70 60,0" fill="#1a2f6e" opacity="1"/>

            <!-- ── Bottom-left small corner ── -->
            <polygon points="0,595 0,510 80,595" fill="#1a2f6e" opacity="1"/>
          </svg>

          <!-- ═══ Certificate badge / seal (right-center) ═══ -->
          <svg style="position:absolute;top:28%;right:22%;z-index:12;width:100px;height:100px;" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <!-- Ribbon -->
            <rect x="42" y="72" width="7" height="22" fill="#b3a0e0" rx="2"/>
            <rect x="51" y="72" width="7" height="22" fill="#9b88cc" rx="2"/>
            <!-- Outer circle -->
            <circle cx="50" cy="48" r="28" fill="none" stroke="#1a2f6e" stroke-width="2.5"/>
            <circle cx="50" cy="48" r="23" fill="#f0f4ff" stroke="#1a2f6e" stroke-width="1.5"/>
            <!-- Stars -->
            <text x="50" y="36" text-anchor="middle" font-size="8" fill="#1a2f6e" font-family="serif">★ ★ ★</text>
            <text x="50" y="52" text-anchor="middle" font-size="7" font-weight="700" fill="#1a2f6e" font-family="Outfit,sans-serif">Achevment</text>
            <text x="50" y="62" text-anchor="middle" font-size="7" font-weight="700" fill="#1a2f6e" font-family="Outfit,sans-serif">Awarded</text>
            <text x="50" y="75" text-anchor="middle" font-size="8" fill="#1a2f6e" font-family="serif">★ ★</text>
          </svg>

          <!-- ═══ Main content ═══ -->
          <div class="content">
            <!-- Logo -->
            <div class="logo">
              <svg class="logo-icon" viewBox="0 0 38 30" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="5" height="30" fill="#1a2f6e"/>
                <rect x="8" y="0" width="5" height="30" fill="#1a2f6e"/>
                <rect x="15" y="8" width="23" height="5" fill="#4a90d9"/>
                <rect x="15" y="17" width="23" height="5" fill="#4a90d9"/>
              </svg>
              <span class="logo-text">INSTANT</span>
            </div>

            <!-- Certificate heading -->
            <div class="cert-title">Certificate</div>
            <div class="cert-subtitle">Of Completion this certificate is awarded to</div>

            <!-- Student name -->
            <div class="student-name">${studentName}</div>

            <!-- Diploma text -->
            <div class="diploma-text">Has Successfully Completed The ${diplomaNameEn} Diploma&nbsp;&nbsp;(${hours} Hours)</div>
          </div>

          <!-- Date block -->
          <div class="date-block">
            <div class="date-value">${formattedDate}</div>
            <div class="date-label">DATE</div>
          </div>

          <!-- Bottom-right stamp -->
          <div class="stamp-logo">
            <div class="sl-bracket">[i]NSTANT</div>
            <span class="sl-name">SOFTWARE SOLUTIONS</span>
            <span class="sl-sub">110700500016800 :س.ت</span>
          </div>

        </div>

        <script>
          document.fonts.ready.then(function() {
            window.print();
            setTimeout(function() { window.close(); }, 600);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  const generateSessionsList = (
    diplomaId: string,
    startDateStr: string,
    numberOfSessions: number,
    studyDaysStr: string,
    sessionTimeStr: string,
    instructorName: string
  ): Session[] => {
    const generated: Session[] = [];
    const daysMap: Record<string, number> = {
      'الأحد': 0, 'الاحد': 0,
      'الإثنين': 1, 'الاثنين': 1,
      'الثلاثاء': 2,
      'الأربعاء': 3, 'الاربعاء': 3,
      'الخميس': 4,
      'الجمعة': 5, 'الجمعه': 5,
      'السبت': 6
    };

    const studyDays = studyDaysStr
      .split(/[،,؛\s]+/)
      .map(d => d.trim())
      .filter(d => daysMap[d] !== undefined)
      .map(d => daysMap[d]);

    if (studyDays.length === 0) {
      studyDays.push(0); // Default to Sunday
    }

    let currentDate = new Date(startDateStr);
    if (isNaN(currentDate.getTime())) {
      currentDate = new Date();
    }

    let startTime = '18:00';
    let endTime = '21:00';
    if (sessionTimeStr) {
      const timeMatch = sessionTimeStr.match(/(\d+):?(\d*)/);
      if (timeMatch) {
        let hrs = parseInt(timeMatch[1]);
        const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        if (sessionTimeStr.includes('مساء') && hrs < 12) {
          hrs += 12;
        } else if (sessionTimeStr.includes('صباح') && hrs === 12) {
          hrs = 0;
        }
        const startHrsStr = hrs.toString().padStart(2, '0');
        const minsStr = mins.toString().padStart(2, '0');
        startTime = `${startHrsStr}:${minsStr}`;
        endTime = `${((hrs + 3) % 24).toString().padStart(2, '0')}:${minsStr}`;
      }
    }

    let sessionsCount = 0;
    while (sessionsCount < numberOfSessions) {
      const dayOfWeek = currentDate.getDay();
      if (studyDays.includes(dayOfWeek)) {
        sessionsCount++;
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const overlapping = sessions.some(s => s.instructor === instructorName && s.date === dateStr && s.startTime === startTime);
        const overlapNote = overlapping ? ' (⚠️ تداخل محتمل مع محاضرة أخرى لهذا المدرس في نفس اليوم)' : '';

        generated.push({
          id: `ses-gen-${Date.now()}-${sessionsCount}`,
          diplomaId,
          title: `المحاضرة رقم ${sessionsCount}`,
          instructor: instructorName || '',
          date: dateStr,
          startTime,
          endTime,
          notes: `تم إنشاؤها تلقائياً عبر صانع الجداول الذكي.${overlapNote}`,
          attendance: {},
          sessionStatus: 'Scheduled'
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return generated;
  };

  const handleConfirmAction = () => {
    if (!pendingAction) return;

    try {
      const { type } = pendingAction;
      const params = { ...pendingAction.params, ...editedParams };
      let confirmMessage = '';

      if (type === 'CREATE_DIPLOMA') {
        const matchingInst = instructors.find(i => i.name.trim().toLowerCase().includes((params.instructorName || '').trim().toLowerCase()));
        
        const newDip: Diploma = {
          id: `dip-${Date.now()}`,
          name: params.name || 'دبلومة جديدة بدون اسم',
          description: 'تم إنشاؤها تلقائياً عبر المساعد الذكي.',
          startDate: params.startDate || new Date().toISOString().split('T')[0],
          endDate: params.endDate || '',
          status: 'Active',
          studyDays: params.studyDays || '',
          sessionTime: params.sessionTime || '',
          instructorName: matchingInst ? matchingInst.name : params.instructorName || '',
          instructorId: matchingInst?.id || undefined
        };
        
        onSaveDiplomas([...diplomas, newDip]);
        confirmMessage = `✅ تمت إضافة دبلومة **"${newDip.name}"** بنجاح وتعيينها للمدرب: **${newDip.instructorName || 'غير محدد'}**!`;

      } else if (type === 'CREATE_TASK') {
        const newTask: Task = {
          id: `tsk-${Date.now()}`,
          title: params.title || 'مهمة جديدة',
          dueDate: params.dueDate || new Date().toISOString().split('T')[0],
          priority: params.priority || 'Medium',
          status: 'Pending',
          notes: params.notes || 'تم إنشاؤها تلقائياً عبر المساعد الذكي.',
          category: 'Other'
        };

        onSaveTasks([...tasks, newTask]);
        confirmMessage = `✅ تم بنجاح إنشاء المهمة التشغيلية: **"${newTask.title}"** وتعيين تاريخ استحقاقها في **${newTask.dueDate}**!`;

      } else if (type === 'GENERATE_SESSIONS') {
        let targetDip = diplomas.find(d => d.id === params.diplomaId);
        if (!targetDip && params.diplomaName) {
          targetDip = diplomas.find(d => d.name.trim().toLowerCase().includes(params.diplomaName!.trim().toLowerCase()));
        }

        if (!targetDip) {
          throw new Error('لم أتمكن من العثور على الدبلومة المطلوبة لجدولة المحاضرات. يرجى تحديد الاسم بدقة.');
        }

        const studyDays = params.studyDays || targetDip.studyDays || 'السبت، الثلاثاء';
        const sessionTime = params.sessionTime || targetDip.sessionTime || '06:00 مساءً';
        const instructor = targetDip.instructorName || '';

        const generated = generateSessionsList(
          targetDip.id,
          params.startDate || new Date().toISOString().split('T')[0],
          params.numberOfSessions || 12,
          studyDays,
          sessionTime,
          instructor
        );

        onSaveSessions([...sessions, ...generated]);
        confirmMessage = `✅ تم بنجاح توليد وجدولة **${generated.length}** محاضرة لدبلوم **"${targetDip.name}"** بدءاً من تاريخ **${params.startDate}**!`;

      } else if (type === 'UPDATE_ATTENDANCE') {
        const targetStudent = students.find(s => s.name.trim().toLowerCase().includes((params.studentName || '').trim().toLowerCase()));
        if (!targetStudent) {
          throw new Error(`لم يتم العثور على طالب باسم "${params.studentName}". يرجى مراجعة الاسم.`);
        }

        let targetSession: Session | undefined;
        if (params.sessionTitle) {
          targetSession = sessions.find(s => s.title.trim().toLowerCase().includes(params.sessionTitle!.trim().toLowerCase()));
        }
        if (!targetSession && params.sessionDate) {
          targetSession = sessions.find(s => s.date === params.sessionDate);
        }

        if (!targetSession) {
          throw new Error('لم يتم العثور على المحاضرة المطلوبة.');
        }

        const updatedSessions = sessions.map(s => {
          if (s.id === targetSession!.id) {
            return {
              ...s,
              attendance: {
                ...s.attendance,
                [targetStudent.id]: {
                  studentId: targetStudent.id,
                  status: params.status || 'Present',
                  note: params.note || ''
                }
              }
            };
          }
          return s;
        });

        onSaveSessions(updatedSessions);
        confirmMessage = `✅ تم بنجاح تعديل حضور الطالب **"${targetStudent.name}"** في محاضرة **"${targetSession.title}"** إلى: **${params.status === 'Present' ? 'حاضر ✅' : params.status === 'Absent' ? 'غائب ❌' : 'معذور ⚠️'}**!`;

      } else if (type === 'GENERATE_CERTIFICATE') {
        // Trigger print/download with edited details
        handleDownloadCertificate(
          editCertName,
          editCertDiploma,
          editCertHours,
          editCertDate
        );
        confirmMessage = `🎓 تم بنجاح توليد وتحميل شهادة إتمام دبلوم **"${editCertDiploma}"** للطالب **"${editCertName}"**!`;
      } else if (type === 'SCHEDULE_MESSAGE') {
        let targetDip = diplomas.find(d => d.name.trim().toLowerCase().includes((params.diplomaName || '').trim().toLowerCase()));
        if (!targetDip && params.diplomaId) {
          targetDip = diplomas.find(d => d.id === params.diplomaId);
        }

        if (!targetDip) {
          throw new Error('لم أتمكن من تحديد الدبلومة المطلوبة لجدولة الرسالة. يرجى كتابة اسم الدبلومة بوضوح في أمرك.');
        }

        let isoTime = params.scheduledAt || '';
        if (isoTime && !isNaN(Date.parse(isoTime))) {
          // Valid ISO string already
        } else if (isoTime) {
          const parsed = parseScheduleTime(isoTime);
          if (parsed) {
            isoTime = parsed;
          } else {
            // Fallback: 1 hour from now
            isoTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          }
        } else {
          isoTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        }

        const newSchedule = createScheduledMessage({
          diplomaId: targetDip.id,
          diplomaName: targetDip.name,
          messageType: params.messageType || 'session_reminder',
          messageTemplate: params.messageTemplate || 'السلام عليكم {studentName}، نذكركم بمحاضرة دبلوم {course} القادمة في موعدها المحدد. حضوركم واهتمامكم يسعدنا!',
          targetGroup: params.targetGroup || 'all',
          scheduledAt: isoTime,
          note: params.notes || `جدولة تلقائية لمراسلة طلاب دبلوم ${targetDip.name}`,
          createdBy: currentUser || 'AI Assistant'
        });

        const updatedConfig: AppConfig = {
          ...config,
          minAttendanceRate: config?.minAttendanceRate ?? 75,
          language: config?.language ?? 'ar',
          scheduledMessages: [...(config?.scheduledMessages || []), newSchedule]
        };

        onSaveConfig(updatedConfig);
        confirmMessage = `⏰ تم بنجاح جدولة إرسال تذكير دبلوم **"${targetDip.name}"** بتاريخ **${formatScheduledAt(isoTime)}**!`;
      }

      const systemSuccessMsg: ChatMessage = {
        role: 'assistant',
        content: confirmMessage,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...messages, systemSuccessMsg];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);

    } catch (e: any) {
      setError(e.message || 'فشل تنفيذ الإجراء.');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {mode === 'floating' && (
        <div className="fixed bottom-6 right-6 z-[9999] print:hidden select-none font-sans">
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 border border-indigo-400/20 relative group`}
            title="مساعد سيد الذكي"
          >
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <div className="relative">
                <Sparkles className="w-5 h-5 text-white group-hover:animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-550"></span>
                </span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Floating Expandable Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={mode === 'floating' ? { opacity: 0, y: 30, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={mode === 'floating' ? { opacity: 0, y: 30, scale: 0.95 } : undefined}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={
              mode === 'embedded'
                ? "w-full h-[75vh] bg-[#0A0A0D]/55 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden text-right font-sans relative"
                : "fixed bottom-24 right-6 z-[9999] w-[450px] h-[600px] bg-[#0A0A0D]/95 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md font-sans text-right select-none relative"
            }
            dir="rtl"
          >
            {/* Header of Chatbox */}
            <div className="p-4 bg-zinc-950/90 border-b border-zinc-900 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
                    مساعد سيد الذكي
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded-sm border border-indigo-900/20 font-mono font-bold">Groq AI</span>
                  </h3>
                  <p className="text-[9px] text-zinc-500 mt-1 leading-none">أتمتة العمليات والأكاديميات الذكية</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* New Chat Button */}
                <button
                  onClick={startNewSession}
                  className="px-2 py-1.5 rounded-md bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="بدء محادثة جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">محادثة جديدة</span>
                </button>

                {/* History Drawer Toggle Button */}
                <button
                  onClick={() => setShowHistoryDrawer(prev => !prev)}
                  className={`px-2 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-medium ${
                    showHistoryDrawer || sessionsList.length > 0
                      ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                  title="عرض سجل المحادثات السابقة المحفوظة"
                >
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">السجل ({sessionsList.length})</span>
                </button>

                {/* Delete/Clear current session button */}
                <button
                  onClick={handleClearCurrentChat}
                  className="p-1.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:bg-rose-950/40 hover:border-rose-800/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                  title="مسح هذه المحادثة الحالية"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {mode === 'floating' && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
                    title="تصغير"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* History Drawer Overlay */}
            <AnimatePresence>
              {showHistoryDrawer && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-x-0 top-[65px] bottom-0 z-50 bg-[#0A0A0D]/95 backdrop-blur-md flex flex-col p-4 text-right border-t border-zinc-800"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-400" />
                      <h4 className="text-xs font-bold text-white">سجل المحادثات المحفوظة</h4>
                      <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900/50 px-2 py-0.5 rounded-full font-mono font-bold">
                        {sessionsList.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {sessionsList.length > 0 && (
                        <button
                          onClick={handleClearAllSessions}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1 cursor-pointer font-medium bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded-md"
                        >
                          <Trash2 className="w-3 h-3" />
                          مسح جميع المحادثات
                        </button>
                      )}
                      <button
                        onClick={() => setShowHistoryDrawer(false)}
                        className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="py-2 shrink-0">
                    <button
                      onClick={startNewSession}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      بدء محادثة جديدة الآن
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 custom-scrollbar">
                    {sessionsList.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 text-xs">
                        لا توجد محادثات سابقة محفوظة في السجل حتى الآن.
                      </div>
                    ) : (
                      sessionsList.map(session => {
                        const isActive = session.id === currentSessionId;
                        return (
                          <div
                            key={session.id}
                            onClick={() => handleSelectSession(session)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                              isActive
                                ? 'bg-indigo-950/50 border-indigo-500/50 text-white shadow-sm'
                                : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/70 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'
                              }`}>
                                <MessageSquare className="w-4 h-4" />
                              </div>
                              <div className="truncate flex-1">
                                <h5 className="text-xs font-bold truncate leading-tight">{session.title}</h5>
                                <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-2">
                                  <span>{session.createdAt}</span>
                                  <span>•</span>
                                  <span>{session.messages.length} رسالة</span>
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/50 transition-all opacity-80 group-hover:opacity-100 shrink-0 cursor-pointer mr-2"
                              title="حذف هذه المحادثة من السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Warning Banner if API Key is missing */}
            {!hasApiKey && (
              <div className="p-3 bg-amber-955/20 border-b border-amber-900/30 space-y-2 shrink-0">
                <div className="flex items-start gap-2 text-[10px] text-amber-400 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    مفتاح API الخاص بـ Groq غير متصل بالبرنامج! يرجى إدخال مفتاح API الخاص بك مجاناً وحفظه في الإعدادات بشكل آمن لتفعيل المساعد الذكي.
                  </p>
                </div>
                <button
                  onClick={onNavigateToSettings}
                  className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer text-center"
                >
                  تهيئة وإدخال مفتاح API الآن ←
                </button>
              </div>
            )}

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-zinc-950/20">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isAI = msg.role === 'assistant';
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`flex gap-2.5 max-w-[88%] ${isAI ? 'self-start text-right' : 'self-end mr-auto text-right flex-row-reverse'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${
                        isAI 
                          ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      }`}>
                        {isAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-1">
                        <div className={`p-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                          isAI
                            ? 'bg-[#121216]/95 border border-[#1F1F27] text-zinc-200 rounded-tr-none'
                            : 'bg-indigo-650 text-white rounded-tl-none font-semibold'
                        }`}>
                          {msg.content}
                        </div>
                        <div className="text-[8px] text-zinc-655 font-mono px-1">
                          {msg.timestamp}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5 self-start text-right"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-950/30 border border-indigo-900/50 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-3 bg-[#121216] border border-[#1F1F27] rounded-xl rounded-tr-none flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                      <span className="text-[10px] text-zinc-550">جاري الصياغة...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Floating Prompt Chips / Suggestions */}
            {hasApiKey && !pendingAction && (
              <div className="px-3 py-2 bg-zinc-950/90 border-t border-zinc-900 shrink-0 space-y-1">
                <span className="text-[9px] text-zinc-500 font-bold block">⚡ عمليات سريعة:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: '🎓 توليد شهادة', template: 'اعمل شهادة تخرج للطالب [الاسم بالكامل] في دبلوم [الأمن السيبراني] بتاريخ اليوم' },
                    { label: '📅 جدولة تذكير', template: 'جدول رسالة تذكير بمحاضرة اليوم لدبلوم [الأدمن] الساعة 6 مساء بمحتوى: [السلام عليكم طلابنا...]' },
                    { label: '📝 تلخيص المهام', template: 'لخص لي مهام العمل الأسبوعية المعلقة والمستحقة قريباً' },
                    { label: '🗓️ جدول محاضرات', template: 'ولد لي جدول محاضرات دبلوم [الذكاء الاصطناعي] بدءاً من [تاريخ البدء] لعدد 12 محاضرة' }
                  ].map((chip, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInputValue(chip.template)}
                      className="px-2 py-1 bg-[#121216] border border-zinc-800 hover:border-indigo-500/50 hover:text-indigo-400 text-zinc-400 transition-all rounded-md text-[9px] cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Action Confirmation Card (Upgraded with Interactive Inline Inputs!) */}
            {pendingAction && (
              <div className="p-3 bg-[#13131D] border-t border-indigo-900/60 space-y-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-y-auto max-h-[220px]">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                  <div className="space-y-1 w-full text-right">
                    <span className="font-bold text-[11px] text-zinc-300">مراجعة وتعديل الإجراء المعلق:</span>
                    <div className="bg-zinc-950/90 p-2.5 rounded-xl border border-zinc-900 space-y-2 mt-1">
                      
                      {/* CREATE_DIPLOMA */}
                      {pendingAction.type === 'CREATE_DIPLOMA' && (
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="col-span-2">
                            <label className="text-zinc-500 font-bold">اسم الدبلومة:</label>
                            <input
                              type="text"
                              value={editedParams.name || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">المحاضر المسؤول:</label>
                            <input
                              type="text"
                              value={editedParams.instructorName || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, instructorName: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">أيام الدراسة:</label>
                            <input
                              type="text"
                              value={editedParams.studyDays || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, studyDays: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">وقت المحاضرة:</label>
                            <input
                              type="text"
                              value={editedParams.sessionTime || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, sessionTime: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">تاريخ البدء:</label>
                            <input
                              type="date"
                              value={editedParams.startDate || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                            />
                          </div>
                        </div>
                      )}

                      {/* CREATE_TASK */}
                      {pendingAction.type === 'CREATE_TASK' && (
                        <div className="space-y-1.5 text-[10px]">
                          <div>
                            <label className="text-zinc-500 font-bold">عنوان المهمة:</label>
                            <input
                              type="text"
                              value={editedParams.title || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, title: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-zinc-500 font-bold">تاريخ الاستحقاق:</label>
                              <input
                                type="date"
                                value={editedParams.dueDate || ''}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-500 font-bold">الأولوية:</label>
                              <select
                                value={editedParams.priority || 'Medium'}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, priority: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                              >
                                <option value="Low">منخفضة (Low)</option>
                                <option value="Medium">متوسطة (Medium)</option>
                                <option value="High">مرتفعة (High)</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">ملاحظات المهمة:</label>
                            <input
                              type="text"
                              value={editedParams.notes || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, notes: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* GENERATE_SESSIONS */}
                      {pendingAction.type === 'GENERATE_SESSIONS' && (
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="col-span-2">
                            <label className="text-zinc-500 font-bold">اسم الدبلومة:</label>
                            <input
                              type="text"
                              value={editedParams.diplomaName || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, diplomaName: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">تاريخ البدء:</label>
                            <input
                              type="date"
                              value={editedParams.startDate || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">عدد المحاضرات:</label>
                            <input
                              type="number"
                              min={1}
                              value={editedParams.numberOfSessions || 12}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, numberOfSessions: Number(e.target.value) }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">أيام الدراسة:</label>
                            <input
                              type="text"
                              value={editedParams.studyDays || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, studyDays: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-500 font-bold">توقيت البث:</label>
                            <input
                              type="text"
                              value={editedParams.sessionTime || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, sessionTime: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* UPDATE_ATTENDANCE */}
                      {pendingAction.type === 'UPDATE_ATTENDANCE' && (
                        <div className="space-y-1.5 text-[10px]">
                          <div>
                            <label className="text-zinc-500 font-bold">اسم الطالب:</label>
                            <input
                              type="text"
                              value={editedParams.studentName || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, studentName: e.target.value }))}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-zinc-500 font-bold">المحاضرة:</label>
                              <input
                                type="text"
                                value={editedParams.sessionTitle || editedParams.sessionDate || ''}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, sessionTitle: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-500 font-bold">الحالة:</label>
                              <select
                                value={editedParams.status || 'Present'}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                              >
                                <option value="Present">حاضر ✅</option>
                                <option value="Absent">غائب ❌</option>
                                <option value="Excused">معذور ⚠️</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GENERATE_CERTIFICATE */}
                      {pendingAction.type === 'GENERATE_CERTIFICATE' && (
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="col-span-2">
                            <label className="text-zinc-500 font-bold">الاسم الكامل (بالإنجليزية):</label>
                            <input
                              type="text"
                              value={editCertName}
                              onChange={(e) => setEditCertName(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-zinc-500 font-bold">الدبلومة (بالإنجليزية):</label>
                            <input
                              type="text"
                              value={editCertDiploma}
                              onChange={(e) => setEditCertDiploma(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-555 font-bold">الساعات التدريبية:</label>
                            <input
                              type="text"
                              value={editCertHours}
                              onChange={(e) => setEditCertHours(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-zinc-555 font-bold">التاريخ المطبوع:</label>
                            <input
                              type="text"
                              value={editCertDate}
                              onChange={(e) => setEditCertDate(e.target.value)}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                            />
                          </div>
                        </div>
                      )}

                      {/* SCHEDULE_MESSAGE */}
                      {pendingAction.type === 'SCHEDULE_MESSAGE' && (
                        <div className="space-y-1.5 text-[10px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-zinc-555 font-bold">اسم الدبلومة:</label>
                              <input
                                type="text"
                                value={editedParams.diplomaName || ''}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, diplomaName: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-555 font-bold">وقت الجدولة:</label>
                              <input
                                type="text"
                                value={editedParams.scheduledAt || ''}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, scheduledAt: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 text-right"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-zinc-555 font-bold">نوع الرسالة:</label>
                              <select
                                value={editedParams.messageType || 'session_reminder'}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, messageType: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                              >
                                <option value="session_reminder">تذكير بموعد محاضرة</option>
                                <option value="absence_warning">تحذير غياب</option>
                                <option value="custom">رسالة مخصصة</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-zinc-555 font-bold">المجموعة المستهدفة:</label>
                              <select
                                value={editedParams.targetGroup || 'all'}
                                onChange={(e) => setEditedParams(prev => ({ ...prev, targetGroup: e.target.value }))}
                                className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white mt-0.5 cursor-pointer text-right"
                              >
                                <option value="all">كل الطلاب</option>
                                <option value="absent_only">الطلاب الغائبين فقط</option>
                                <option value="exceeded_absences">المتجاوزين للغياب</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-zinc-555 font-bold">نص قالب الرسالة:</label>
                            <textarea
                              value={editedParams.messageTemplate || ''}
                              onChange={(e) => setEditedParams(prev => ({ ...prev, messageTemplate: e.target.value }))}
                              rows={2}
                              className="w-full bg-[#121216] border border-zinc-800 rounded px-2 py-1 text-[11px] text-white font-mono mt-0.5 resize-none text-right font-sans"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={handleCancelAction}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-355 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    إلغاء ❌
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-3.5 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                  >
                    {pendingAction.type === 'GENERATE_CERTIFICATE' ? 'تحميل الشهادة 🎓' : 'تأكيد الإجراء ✅'}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="px-3 py-1.5 bg-rose-955/20 border-t border-rose-900/30 text-rose-400 text-[10px] shrink-0 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Voice Wave Animation */}
            {isListening && (
              <div className="flex items-center justify-center gap-1.5 py-1 px-3 bg-rose-955/15 border-t border-rose-900/20 text-rose-400 text-[9px] font-bold animate-pulse">
                <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-4.5 bg-rose-500 rounded-full animate-bounce delay-200" />
                <span className="w-1.5 h-2.5 bg-rose-500 rounded-full animate-bounce delay-300" />
                <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce delay-400" />
                <span>جاري الاستماع لصوتك وتسجيل الإملاء...</span>
              </div>
            )}

            {/* Input Form Box */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-900 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTextareaSubmit(inputValue);
                }}
                className="flex items-center gap-2"
              >
                {hasApiKey && (
                  <button
                    type="button"
                    onClick={handleToggleListening}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center relative ${
                      isListening 
                        ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/20' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-355 hover:border-zinc-700'
                    }`}
                    title={isListening ? 'اضغط للإيقاف' : 'إملاء صوتي'}
                  >
                    {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isListening && (
                      <span className="absolute -inset-1 rounded-lg border border-rose-500/40 animate-ping pointer-events-none" />
                    )}
                  </button>
                )}

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={!hasApiKey || loading}
                  placeholder={hasApiKey ? (isListening ? "استمع لصوتك..." : "اسأل مساعد سيد...") : "يرجى تهيئة مفتاح API"}
                  className="flex-1 px-3 py-2 bg-[#08080A] border border-zinc-800 focus:border-indigo-650 text-xs text-zinc-150 rounded-lg outline-hidden text-right placeholder-zinc-800"
                />

                <button
                  type="submit"
                  disabled={!hasApiKey || loading || !inputValue.trim()}
                  className="p-2 bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-900 disabled:text-zinc-650 text-white rounded-lg cursor-pointer transition-colors shadow-md flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  function handleTextareaSubmit(text: string) {
    if (!text.trim()) return;
    handleSendMessage(text);
  }
}
