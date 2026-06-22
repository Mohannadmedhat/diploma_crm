export async function callGroqChatCompletion(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('مفتاح Groq API غير مدخل. يرجى تهيئة الإعدادات أولاً.');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  
  const body = {
    model: model || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorMsg = '';
    try {
      const errData = await response.json();
      errorMsg = errData.error?.message || response.statusText;
    } catch {
      errorMsg = await response.text();
    }
    throw new Error(`خطأ من Groq API (${response.status}): ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function testGroqConnection(apiKey: string, model: string): Promise<boolean> {
  try {
    const res = await callGroqChatCompletion(
      apiKey,
      model,
      'You are a helpful assistant. Reply with only one word: OK.',
      'Ping'
    );
    return res.trim().toLowerCase().includes('ok');
  } catch (e) {
    console.error('Groq test failed:', e);
    throw e;
  }
}

export async function generateAIAnnouncement(
  apiKey: string,
  model: string,
  prompt: string,
  diplomaName?: string
): Promise<string> {
  const systemPrompt = `أنت منسق أكاديمي خبير ومساعد إداري في منصة دبلومات تعليمية. 
مهمتك هي صياغة إعلان أكاديمي رسمي واحترافي باللغة العربية الفصحى لتقديمه للطلاب. 
يجب أن يكون الأسلوب مهنياً، واضحاً، ومنظماً باستخدام علامات الترقيم والفقرات والرموز التعبيرية (Emoji) المناسبة لإثارة اهتمام الطلاب.
اكتب فقط نص الإعلان مباشرة دون أي مقدمات أو هوامش إضافية.`;

  const userPrompt = `صغ إعلان عن دبلوم ${diplomaName || 'المنصة الأكاديمية'} بناءً على الوصف التالي:
"${prompt}"`;

  return callGroqChatCompletion(apiKey, model, systemPrompt, userPrompt);
}

export async function improveWhatsAppMessage(
  apiKey: string,
  model: string,
  currentText: string,
  tone: 'friendly' | 'warning' | 'formal'
): Promise<string> {
  const toneDescriptions = {
    friendly: 'أسلوب ودّي، دافئ، تشجيعي وأخوي مع استخدام رموز تعبيرية إيجابية ومحفزة.',
    warning: 'أسلوب تنبيهي جاد وحازم يوضح أهمية الالتزام بالحضور لتفادي الفصل، مع الحفاظ على الاحترام والمهنية.',
    formal: 'أسلوب رسمي، أكاديمي، مباشر وجاد جداً مناسب للمراسلات الإدارية الرسمية.'
  };

  const systemPrompt = `أنت مساعد مراسلات شؤون طلاب في منصة دبلومات أكاديمية.
مهمتك هي إعادة كتابة وتحسين صياغة الرسالة العربية المخصصة للإرسال عبر WhatsApp للطلاب أو أولياء أمورهم.
نغمة وأسلوب الكتابة المطلوبة: ${toneDescriptions[tone]}
تنبيهات هامة:
1. احتفظ بالمتغيرات النصية المحاطة بأقواس مثل {studentName} و {course} و {date} و {absenceCount} و {parentName} تماماً كما هي في النص دون ترجمتها أو حذفها أو تعديلها لكي يتمكن النظام من استبدالها لاحقاً.
2. لا تكتب أي نصوص تفسيرية خارج الرسالة المحسنة. اكتب الرسالة المحسنة مباشرة.`;

  const userPrompt = `الرسالة الحالية المراد تحسينها هي:
"${currentText}"`;

  return callGroqChatCompletion(apiKey, model, systemPrompt, userPrompt);
}
