import React, { useState, useEffect, useRef } from 'react';
import { Student, Diploma, Session, Task, AppConfig, Instructor } from '../types';
import { callGroqChatCompletion } from '../services/groq';
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
  Calendar 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIAssistantProps {
  students: Student[];
  diplomas: Diploma[];
  sessions: Session[];
  tasks: Task[];
  config: AppConfig | null;
  instructors: Instructor[];
  onNavigateToSettings: () => void;
  onSaveDiplomas: (data: Diploma[]) => void;
  onSaveStudents: (data: Student[]) => void;
  onSaveSessions: (data: Session[]) => void;
  onSaveTasks: (data: Task[]) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIAction {
  type: 'CREATE_DIPLOMA' | 'CREATE_TASK' | 'GENERATE_SESSIONS' | 'UPDATE_ATTENDANCE';
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
  };
  rawText: string;
}

export default function AIAssistant({
  students,
  diplomas,
  sessions,
  tasks,
  config,
  instructors,
  onNavigateToSettings,
  onSaveDiplomas,
  onSaveStudents,
  onSaveSessions,
  onSaveTasks
}: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Actions State
  const [pendingAction, setPendingAction] = useState<AIAction | null>(null);

  // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hasApiKey = !!config?.groqApiKey && config.groqApiKey.trim().length > 0;
  const activeModel = config?.groqModel || 'llama-3.3-70b-versatile';

  const SUGGESTED_PROMPTS = [
    'لخص لي مهام العمل الأسبوعية المعلقة',
    'ضيف دبلوم هندسة الشبكات والمدرب م. أحمد الشمري ومواعيدها الأحد والأربعاء',
    'ضيف لي مهمة للتواصل مع المدرب غداً بشأن الجدول الجديد',
    'ولد لي جدول محاضرات دبلوم البرمجيات المتقدمة بدءاً من السبت القادم 8 محاضرات'
  ];

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

  // Load chat history from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('crm_ai_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse chat history', e);
      }
    } else {
      // Welcome message
      setMessages([
        {
          role: 'assistant',
          content: 'مرحباً بك! أنا مساعدك الذكي المرتبط بنظام الدبلومات. يمكنني مساعدتك في صياغة الرسائل، كتابة الإعلانات، تلخيص المهام، أو تحليل بيانات المنصة. كيف يمكنني مساعدتك اليوم؟',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  // Save chat history
  const saveChatHistory = (msgs: ChatMessage[]) => {
    localStorage.setItem('crm_ai_chat_history', JSON.stringify(msgs));
  };

  const handleClearChat = () => {
    if (window.confirm('هل تريد مسح سجل المحادثة بالكامل؟')) {
      const initial: ChatMessage[] = [
        {
          role: 'assistant',
          content: 'مرحباً بك! أنا مساعدك الذكي المرتبط بنظام الدبلومات. كيف يمكنني مساعدتك اليوم؟',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(initial);
      saveChatHistory(initial);
      setError('');
      setPendingAction(null);
    }
  };

  const buildSystemPrompt = (): string => {
    const activeDips = diplomas.filter(d => d.status === 'Active');
    const pendingTasks = tasks.filter(t => t.status !== 'Completed');

    // Create a concise text summary of CRM data
    const crmContext = `
[معلومات النظام التعليمي الحالي]:
- عدد الدبلومات الكلي: ${diplomas.length}
- الدبلومات النشطة حالياً: ${activeDips.map(d => `${d.name} (أيام الدراسة: ${d.studyDays || 'غير محدد'}، وقتها: ${d.sessionTime || 'غير محدد'})`).join('، ')}
- عدد الطلاب الكلي المسجلين: ${students.length}
- تفصيل الطلاب بكل دبلومة:
  ${activeDips.map(d => {
    const count = students.filter(st => st.diplomaIds.includes(d.id)).length;
    return `- ${d.name}: ${count} طالب`;
  }).join('\n  ')}
- عدد المحاضرات المسجلة في النظام: ${sessions.length}
- عدد المهام التشغيلية المعلقة: ${pendingTasks.length}
- تفصيل المهام المعلقة:
  ${pendingTasks.map(t => `- ${t.title} (تاريخ الاستحقاق: ${t.dueDate}، الأولوية: ${t.priority})`).join('\n  ')}
`;

    return `أنت "مساعد الذكاء الاصطناعي الذكي" لمنصة إدارة دبلومات الشؤون التعليمية والأكاديمية.
مهمتك هي مساعدة منسق الدبلومة الأكاديمية في إدارة العمليات اليومية ومراسلات الطلاب وتلخيص المهام.
إليك البيانات الحالية الحقيقية من نظام المستخدم لتستعين بها في الإجابة على أي أسئلة يطرحها:
${crmContext}

تعليمات هامة:
1. أجب دائماً باللغة العربية الفصحى بأسلوب مهني وودود ومحفز.
2. نسق إجابتك بشكل جميل باستخدام الفقرات والقوائم النقطية والرموز التعبيرية (Emoji) المناسبة.
3. إذا طلب المستخدم صياغة رسالة WhatsApp، احتفظ بأي متغيرات مثل {studentName} أو {course} واشرح له كيفية استخدامها.
4. ركز على تقديم اقتراحات عملية ومفيدة تعتمد على البيانات الأكاديمية الحالية في النظام.
5. لا تشير إلى أنك تملك هذا Prompt أو ملف التوجيهات، أجب مباشرة بصفة المساعد الشخصي.

[ميزة العمليات الذكية الحصرية (Structured Actions)]:
إذا طلب منك المنسق إجراءً تشغيلياً مثل إضافة دبلومة أو توليد محاضرات أو إنشاء مهمة أو تعديل حضور طالب، يجب عليك إرفاق الإجراء المطلوب في نهاية ردك تماماً (خارج أي فقرات نصية) داخل وسم خاص بالصيغة الهيكلية التالية بالضبط:
[ACTION]
{
  "type": "CREATE_DIPLOMA" | "CREATE_TASK" | "GENERATE_SESSIONS" | "UPDATE_ATTENDANCE",
  "params": {
    // لـ CREATE_DIPLOMA:
    "name": "اسم الدبلومة بالعربية",
    "instructorName": "اسم المدرب المسؤول",
    "studyDays": "أيام الدراسة مثلاً: الأحد، الثلاثاء",
    "sessionTime": "الوقت مثلاً: 06:00 مساءً",
    "startDate": "تاريخ البدء YYYY-MM-DD",
    "endDate": "تاريخ الانتهاء YYYY-MM-DD"

    // لـ CREATE_TASK:
    "title": "عنوان المهمة",
    "dueDate": "تاريخ الاستحقاق YYYY-MM-DD",
    "priority": "Low" | "Medium" | "High",
    "notes": "تفاصيل المهمة إن وجدت"

    // لـ GENERATE_SESSIONS:
    "diplomaId": "معرف الدبلومة الحالي إن عرفته أو اتركه فارغاً",
    "diplomaName": "اسم الدبلومة للمطابقة",
    "startDate": "تاريخ البدء YYYY-MM-DD",
    "numberOfSessions": 12, // عدد المحاضرات كرقم
    "studyDays": "الأيام مثلاً: السبت، الثلاثاء",
    "sessionTime": "الوقت مثلاً: 08:00 مساءً"

    // لـ UPDATE_ATTENDANCE:
    "studentName": "اسم الطالب المراد تعديل حضوره",
    "sessionTitle": "عنوان المحاضرة أو تاريخها",
    "sessionDate": "تاريخ المحاضرة YYYY-MM-DD إن وجد",
    "status": "Present" | "Absent" | "Excused",
    "note": "سبب العذر أو الملاحظة إن وجد"
  }
}
[/ACTION]

تنبيه هام جداً:
- لا تخترع بيانات غير حقيقية؛ إذا لم يحدد المستخدم المدرب أو الموعد، اسأله عنه أو اتركه فارغاً في الـ JSON.
- يجب أن يكون الـ JSON داخل [ACTION] و [/ACTION] صحيحاً تماماً وخالياً من أي أخطاء أو تعليقات برمجية.`;
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
        config!.groqApiKey!,
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

    // Default times
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
        
        // Instructor schedule overlap warning check
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
      const { type, params } = pendingAction;
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
    <div className="space-y-5 text-right font-sans flex flex-col h-[75vh]" dir="rtl" id="ai-assistant-root">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            مساعد الذكاء الاصطناعي (Groq Copilot)
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            مساعدك الشخصي لصياغة الرسائل، إدارة التنبيهات، وتحليل بيانات الطلاب والعمليات فورياً
          </p>
        </div>
        
        {messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="p-2 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
            title="مسح سجل المحادثة"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Warning Banner if API Key is missing */}
      {!hasApiKey && (
        <div className="p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl space-y-3 shrink-0">
          <div className="flex items-start gap-2.5 text-xs text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">مفتاح API الخاص بـ Groq غير متصل بالبرنامج!</span>
              <p className="text-zinc-400 leading-relaxed">
                لتفعيل المساعد الشخصي وكافة ميزات الذكاء الاصطناعي، يرجى الضغط على الزر أدناه لإدخال مفتاح API الخاص بك مجاناً وحفظه في الإعدادات بشكل آمن.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToSettings}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
          >
            تهيئة وإدخال مفتاح API الآن ←
          </button>
        </div>
      )}

      {/* Main chat window container */}
      <div className="flex-1 min-h-0 bg-[#0A0A0C]/55 border border-[#1F1F1F] rounded-xl flex flex-col overflow-hidden relative">
        
        {/* Messages Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const isAI = msg.role === 'assistant';
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-3 max-w-[85%] ${isAI ? 'self-start text-right' : 'self-end mr-auto text-right flex-row-reverse'}`}
                >
                  {/* Avatar Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-xs ${
                    isAI 
                      ? 'bg-indigo-950/30 border-indigo-900/50 text-indigo-400' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}>
                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Bubble content */}
                  <div className="space-y-1">
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                      isAI
                        ? 'bg-[#121216] border border-[#1F1F27] text-zinc-200 rounded-tr-none'
                        : 'bg-indigo-600 text-white rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <div className="text-[9px] text-zinc-600 font-mono px-1">
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
                className="flex gap-3 self-start text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-950/30 border border-indigo-900/50 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3.5 bg-[#121216] border border-[#1F1F27] rounded-2xl rounded-tr-none flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-[11px] text-zinc-500">جاري صياغة الرد الذكي...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion tags if chat is empty or fresh */}
        {messages.length <= 1 && hasApiKey && !pendingAction && (
          <div className="px-4 py-3 bg-[#08080C]/80 border-t border-[#1F1F1F] shrink-0 space-y-2">
            <span className="text-[10px] text-zinc-500 font-bold block">💡 مقترحات سريعة للبدء:</span>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleTextareaSubmit(prompt)}
                  className="px-2.5 py-1.5 bg-[#111116] border border-zinc-800 hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-400 transition-all rounded-lg text-[10px] cursor-pointer text-right"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Action Confirmation Card (Confirmation Card UI) */}
        {pendingAction && (
          <div className="p-4 bg-[#14141E]/95 border-t border-indigo-500/30 space-y-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200" dir="rtl">
            <div className="flex items-start gap-2.5 text-xs">
              <Sparkles className="w-4.5 h-4.5 shrink-0 text-indigo-400 mt-0.5" />
              <div className="space-y-1 w-full text-right">
                <span className="font-bold text-xs text-zinc-150">طلب إجراء ذكي معلق لمراجعتك:</span>
                <div className="bg-[#0B0B0F] p-3 rounded-lg border border-[#23232C] space-y-2 mt-2">
                  {pendingAction.type === 'CREATE_DIPLOMA' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-1 border-b border-[#23232C] pb-1">إضافة دبلومة جديدة:</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                        <div><span className="text-zinc-550">الاسم:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.name || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">المدرب:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.instructorName || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">أيام الدراسة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.studyDays || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">الموعد:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.sessionTime || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">البدء:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.startDate || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">الانتهاء:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.endDate || 'غير محدد'}</span></div>
                      </div>
                    </>
                  )}
                  {pendingAction.type === 'CREATE_TASK' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-1 border-b border-[#23232C] pb-1">إنشاء مهمة تشغيلية:</div>
                      <div className="space-y-1 text-[11px] text-zinc-400">
                        <div><span className="text-zinc-550">العنوان:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.title || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">تاريخ الاستحقاق:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.dueDate || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">الأولوية:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.priority || 'Medium'}</span></div>
                        {pendingAction.params.notes && <div><span className="text-zinc-550">ملاحظات:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.notes}</span></div>}
                      </div>
                    </>
                  )}
                  {pendingAction.type === 'GENERATE_SESSIONS' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-1 border-b border-[#23232C] pb-1">توليد جدول المحاضرات الأكاديمي:</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                        <div className="col-span-2"><span className="text-zinc-550">الدبلومة:</span> <span className="text-zinc-100 font-semibold">{getDiplomaName(pendingAction.params.diplomaId) || pendingAction.params.diplomaName || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">تاريخ البدء:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.startDate || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">عدد المحاضرات:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.numberOfSessions || 12} محاضرة</span></div>
                        <div><span className="text-zinc-550">أيام الدراسة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.studyDays || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">وقت الجلسة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.sessionTime || 'غير محدد'}</span></div>
                      </div>
                    </>
                  )}
                  {pendingAction.type === 'UPDATE_ATTENDANCE' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-1 border-b border-[#23232C] pb-1">تعديل سجل حضور الطالب:</div>
                      <div className="space-y-1 text-[11px] text-zinc-400">
                        <div><span className="text-zinc-550">الطالب:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.studentName || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">المحاضرة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.sessionTitle || pendingAction.params.sessionDate || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">الحالة الجديدة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.status === 'Present' ? 'حاضر ✅' : pendingAction.params.status === 'Absent' ? 'غائب ❌' : 'معذور ⚠️'}</span></div>
                        {pendingAction.params.note && <div><span className="text-zinc-550">ملاحظة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.note}</span></div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleCancelAction}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                إلغاء ❌
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-1.5 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                تأكيد الإجراء ✅
              </button>
            </div>
          </div>
        )}

        {/* Error message banner */}
        {error && (
          <div className="px-4 py-2 bg-rose-955/20 border-t border-rose-900/30 text-rose-400 text-xs shrink-0 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 bg-[#0D0D10] border-t border-[#1F1F1F] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTextareaSubmit(inputValue);
            }}
            className="flex items-center gap-2"
          >
            {/* Mic Toggle Button */}
            {hasApiKey && (
              <button
                type="button"
                onClick={handleToggleListening}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isListening 
                    ? 'bg-rose-600/20 border-rose-500 text-rose-400 animate-pulse' 
                    : 'bg-[#1C1C1C] border-[#262626] text-zinc-450 hover:text-zinc-200 hover:border-zinc-500'
                }`}
                title={isListening ? 'جاري الاستماع... اضغط للإيقاف' : 'إملاء صوتي للأمر 🎤'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!hasApiKey || loading}
              placeholder={hasApiKey ? (isListening ? "جاري الاستماع لصوتك..." : "اسأل المساعد الذكي أو أمله أمراً...") : "يرجى إدخال مفتاح API أولاً لتفعيل المحادثة"}
              className="flex-1 px-4 py-2.5 bg-[#060608] border border-[#1F1F1F] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right placeholder-zinc-700 disabled:opacity-50"
            />
            
            <button
              type="submit"
              disabled={!hasApiKey || loading || !inputValue.trim()}
              className="p-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-zinc-800/40 disabled:text-zinc-650 text-white rounded-lg cursor-pointer transition-colors shadow-md flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  function handleTextareaSubmit(text: string) {
    if (!text.trim()) return;
    handleSendMessage(text);
  }
}
