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

  const systemPrompt = `أنت مساعد مراسلات شؤون طلاب في منصة دبلومات أكاديمية احترافية.
مهمتك هي إعادة كتابة وتحسين صياغة الرسالة العربية المخصصة للإرسال عبر WhatsApp للطلاب أو أولياء أمورهم لتبدو أكثر لباقة، وضوحاً، واحترافية وبلاغة.

أسلوب الكتابة والنبرة المطلوبة: ${toneDescriptions[tone]}

قواعد الصياغة الذهبية:
1. البلاغة والوضوح: تجنب الصياغة الركيكة أو الشبيهة بالترجمة الآلية. استخدم أسلوباً عربياً أصيلاً وراقياً.
2. التنسيق والترتيب: قسّم الرسالة إلى فقرات قصيرة مريحة للعين، واستخدم الرموز التعبيرية (Emoji) بشكل متوازن ولائق، واستخدم العلامات التوضيحية لتنظيم المعلومات إن لزم الأمر.
3. الحفاظ على المتغيرات: يجب الاحتفاظ تماماً بالمتغيرات النصية المحاطة بأقواس متعرجة مثل {studentName} و {course} و {date} و {absenceCount} و {parentName} دون أي تغيير أو ترجمة لأسمائها أو حذفها، لأن النظام يقوم باستبدالها تلقائياً بالبيانات الفعلية.
4. الرد المباشر: لا تكتب أي مقدمات إضافية مثل "إليك الرسالة المحسنة" أو تعليقات خارج نص الرسالة. اكتب فقط الرسالة التي سيتم إرسالها للعميل مباشرة.

أمثلة توضيحية لتقليد الأسلوب (Few-Shot Examples):

مثال 1 (نبرة ودية - Friendly):
- المدخل: "مرحبا {studentName}، نذكرك بمحاضرة اليوم في {course}. لا تتأخر."
- المخرج: "السلام عليكم ورحمة الله وبركاته يا {studentName} 👋🌸
نود تذكيرك بأن لدينا اليوم محاضرة شيقة ومميزة في دبلوم {course} 📚✨
نتطلع لحضورك وتفاعلك الرائع كالعادة! نرجو منك التواجد في الموعد المحدد لكي لا يفوتك أي جزء من المحاضرة. بالتوفيق والسداد! 🌟"

مثال 2 (نبرة تحذيرية - Warning):
- المدخل: "يا {parentName}، ابنك غاب {absenceCount} مرات في دبلوم {course}. لو غاب تاني هيفصل."
- المخرج: "السلام عليكم ورحمة الله وبركاته، تحية طيبة وبعد يا {parentName} 🙏
نود إحاطتكم علماً بأن الطالب {studentName} قد سجل غياباً لعدد {absenceCount} محاضرات في دبلوم {course} ⚠️
ونظراً لأهمية الالتزام بالخطة الدراسية، نرجو منكم حث الطالب على الحضور لتفادي الإجراءات الإدارية وتجاوز نسبة الغياب المسموح بها والتي قد تؤدي إلى تعليق التسجيل. 
نحن هنا لدعم مسيرته التعليمية ونتمنى له التوفيق دائماً."

مثال 3 (نبرة رسمية - Formal):
- المدخل: "شاهد محاضرة اليوم في {course} وسجل الحضور."
- المخرج: "السادة الأفاضل طلاب دبلوم {course}، تحية طيبة وبعد 📄
نحيطكم علماً بأنه قد تم رفع المحاضرة المسجلة الخاصة باليوم. يُرجى مراجعة المحاضرة وتسجيل الحضور والغياب في الرابط المعتمد في أقرب وقت ممكن لضمان احتساب نسبة تفاعلكم.
شاكرين لكم حسن تعاونكم الدائم.
إدارة العمليات وشؤون الطلاب."`;

  const userPrompt = `الرسالة الحالية المراد تحسينها هي:
"${currentText}"`;

  return callGroqChatCompletion(apiKey, model, systemPrompt, userPrompt);
}
