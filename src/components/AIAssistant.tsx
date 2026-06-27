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
  Calendar 
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
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  onSaveConfig
}: AIAssistantProps) {
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
    'لخص لي مهام العمل الأسبوعية المعلقة',
    'ضيف دبلوم هندسة الشبكات والمدرب م. أحمد الشمري ومواعيدها الأحد والأربعاء',
    'ولد لي جدول محاضرات دبلوم البرمجيات المتقدمة بدءاً من السبت القادم 8 محاضرات',
    'اعمل شهادة تخرج للطالبة سلمى سمير محمد في دبلوم الأمن السيبراني بتاريخ اليوم'
  ];

  // Helper: Get user specific localstorage key
  const getStorageKey = () => {
    return currentUser ? `crm_ai_chat_history_${currentUser}` : 'crm_ai_chat_history';
  };

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

  // Load chat history from localstorage (scoped per user)
  useEffect(() => {
    const storageKey = getStorageKey();
    const saved = localStorage.getItem(storageKey);
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
  }, [currentUser]);

  // Save chat history (scoped per user)
  const saveChatHistory = (msgs: ChatMessage[]) => {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(msgs));
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
مهمتك هي مساعدة منسق الدبلومة الأكاديمية في إدارة العمليات اليومية ومراسلات الطلاب وتلخيص المهام وتوليد الشهادات.
إليك البيانات الحالية الحقيقية من نظام المستخدم لتستعين بها في الإجابة على أي أسئلة يطرحها:
${crmContext}

تعليمات هامة:
1. أجب دائماً باللغة العربية الفصحى بأسلوب مهني وودود ومحفز.
2. نسق إجابتك بشكل جميل باستخدام الفقرات والقوائم النقطية والرموز التعبيرية (Emoji) المناسبة.
3. إذا طلب المستخدم صياغة رسالة WhatsApp، احتفظ بأي متغيرات مثل {studentName} أو {course} واشرح له كيفية استخدامها.
4. ركز على تقديم اقتراحات عملية ومفيدة تعتمد على البيانات الأكاديمية الحالية في النظام.
5. لا تشير إلى أنك تملك هذا Prompt أو ملف التوجيهات، أجب مباشرة بصفة المساعد الشخصي.

[ميزة العمليات الذكية الحصرية (Structured Actions)]:
إذا طلب منك المنسق إجراءً تشغيلياً مثل إضافة دبلومة، أو توليد محاضرات، أو إنشاء مهمة، أو تعديل حضور طالب، أو توليد شهادة، أو جدولة رسالة/تذكير واتساب، يجب عليك إرفاق الإجراء المطلوب في نهاية ردك تماماً (خارج أي فقرات نصية) داخل وسم خاص بالصيغة الهيكلية التالية بالضبط:
[ACTION]
{
  "type": "CREATE_DIPLOMA" | "CREATE_TASK" | "GENERATE_SESSIONS" | "UPDATE_ATTENDANCE" | "GENERATE_CERTIFICATE" | "SCHEDULE_MESSAGE",
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

    // لـ GENERATE_CERTIFICATE:
    "studentNameForCert": "الاسم الكامل للطالب باللغة الإنجليزية حصراً (حتى لو كتبه المستخدم بالعربية، قم بترجمته/تهجئته بالإنجليزية، مثل: 'مهند مدحت فتوح' -> 'Mohand Medhat Fatouh')",
    "diplomaNameForCert": "اسم الدبلومة (مثل: الأمن السيبراني أو الذكاء الاصطناعي)",
    "dateForCert": "التاريخ المطبوع على الشهادة YYYY-MM-DD"

    // لـ SCHEDULE_MESSAGE:
    "diplomaName": "اسم الدبلومة المستهدفة بدقة لربط التذكير",
    "scheduledAt": "موعد الإرسال بصيغة YYYY-MM-DDTHH:MM:SS أو بصيغة نصية طبيعية مثل 'الساعة 6 مساء' أو 'بعد ساعتين'",
    "messageType": "session_reminder" | "absence_warning" | "custom",
    "messageTemplate": "نص الرسالة أو قالب الإرسال. استخدم {studentName} لاسم الطالب و {course} لاسم الدبلومة و {date} للتاريخ.",
    "targetGroup": "all" | "absent_only" | "exceeded_absences"
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
    if (pendingAction && pendingAction.type === 'GENERATE_CERTIFICATE') {
      setEditCertName(pendingAction.params.studentNameForCert || '');
      
      const dipNameAr = pendingAction.params.diplomaNameForCert || '';
      const { nameEn, hours } = getDiplomaEnglishNameAndHours(dipNameAr);
      setEditCertDiploma(nameEn);
      setEditCertHours(hours);
      
      setEditCertDate(pendingAction.params.dateForCert || new Date().toISOString().split('T')[0]);
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
                  {pendingAction.type === 'GENERATE_CERTIFICATE' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-2 border-b border-[#23232C] pb-1">توليد شهادة التخرج للطلاب (يمكنك تعديل البيانات أدناه):</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] text-zinc-400">
                        <div className="col-span-2">
                          <label className="text-zinc-550 text-[10px] block font-bold">الاسم بالإنجليزية:</label>
                          <input
                            type="text"
                            value={editCertName}
                            onChange={(e) => setEditCertName(e.target.value)}
                            className="w-full bg-[#121216] border border-[#23232C] rounded-lg px-3 py-1.5 text-xs text-white outline-hidden focus:border-indigo-500 font-bold mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-zinc-550 text-[10px] block font-bold">اسم الدبلومة (بالإنجليزية):</label>
                          <input
                            type="text"
                            value={editCertDiploma}
                            onChange={(e) => setEditCertDiploma(e.target.value)}
                            className="w-full bg-[#121216] border border-[#23232C] rounded-lg px-3 py-1.5 text-xs text-white outline-hidden focus:border-indigo-500 font-semibold mt-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-zinc-550 text-[10px] block font-bold">عدد الساعات:</label>
                          <input
                            type="text"
                            value={editCertHours}
                            onChange={(e) => setEditCertHours(e.target.value)}
                            className="w-full bg-[#121216] border border-[#23232C] rounded-lg px-3 py-1.5 text-xs text-white outline-hidden focus:border-indigo-500 font-semibold mt-1"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-zinc-550 text-[10px] block font-bold">تاريخ الإصدار:</label>
                          <input
                            type="text"
                            value={editCertDate}
                            onChange={(e) => setEditCertDate(e.target.value)}
                            className="w-full bg-[#121216] border border-[#23232C] rounded-lg px-3 py-1.5 text-xs text-white outline-hidden focus:border-indigo-500 font-semibold mt-1"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {pendingAction.type === 'SCHEDULE_MESSAGE' && (
                    <>
                      <div className="text-xs text-zinc-300 font-bold mb-1 border-b border-[#23232C] pb-1">جدولة رسالة تذكير تلقائية:</div>
                      <div className="space-y-1 text-[11px] text-zinc-400">
                        <div><span className="text-zinc-550">الدبلومة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.diplomaName || 'غير محدد'}</span></div>
                        <div><span className="text-zinc-550">وقت الإرسال المجدول:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.scheduledAt ? (isNaN(Date.parse(pendingAction.params.scheduledAt)) ? pendingAction.params.scheduledAt : formatScheduledAt(pendingAction.params.scheduledAt)) : 'بعد ساعة (افتراضي)'}</span></div>
                        <div><span className="text-zinc-550">فئة الطلاب:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.targetGroup === 'absent_only' ? 'الطلاب الغائبين فقط' : pendingAction.params.targetGroup === 'exceeded_absences' ? 'الطلاب المتجاوزين نسب الغياب' : 'كل الطلاب'}</span></div>
                        <div><span className="text-zinc-550">نوع الرسالة:</span> <span className="text-zinc-100 font-semibold">{pendingAction.params.messageType === 'absence_warning' ? 'تحذير غياب' : pendingAction.params.messageType === 'custom' ? 'رسالة مخصصة' : 'تذكير بموعد محاضرة'}</span></div>
                        {pendingAction.params.messageTemplate && <div className="mt-1.5 p-2 bg-[#09090D] border border-zinc-800 rounded-lg text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">{pendingAction.params.messageTemplate}</div>}
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
                {pendingAction.type === 'GENERATE_CERTIFICATE' ? 'تحميل وطباعة الشهادة 🎓' : 'تأكيد الإجراء ✅'}
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
