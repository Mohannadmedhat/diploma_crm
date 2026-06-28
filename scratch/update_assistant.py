import os
import re

assistant_path = r"e:\diploma-operations-assistant (3)\src\components\AIAssistant.tsx"

with open(assistant_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Insert state hooks
state_hooks = """  const [editedParams, setEditedParams] = useState<any>({});
  const [isOpen, setIsOpen] = useState(false);"""
content = content.replace(
    "  const [messages, setMessages] = useState<ChatMessage[]>([]);",
    state_hooks + "\n  const [messages, setMessages] = useState<ChatMessage[]>([]);"
)

# 2. Insert toggle effect listener
toggle_effect = """  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };
    window.addEventListener('TOGGLE_SAYED_AI', handleToggle);
    return () => {
      window.removeEventListener('TOGGLE_SAYED_AI', handleToggle);
    };
  }, []);"""
content = content.replace(
    "  // Initialize Speech Recognition\n  useEffect(() => {",
    toggle_effect + "\n\n  // Initialize Speech Recognition\n  useEffect(() => {"
)

# 3. Replace cert useEffect with unified parameter initialization
old_cert_effect = """  useEffect(() => {
    if (pendingAction && pendingAction.type === 'GENERATE_CERTIFICATE') {
      setEditCertName(pendingAction.params.studentNameForCert || '');
      
      const dipNameAr = pendingAction.params.diplomaNameForCert || '';
      const { nameEn, hours } = getDiplomaEnglishNameAndHours(dipNameAr);
      setEditCertDiploma(nameEn);
      setEditCertHours(hours);
      
      setEditCertDate(pendingAction.params.dateForCert || new Date().toISOString().split('T')[0]);
    }
  }, [pendingAction, diplomaTypes]);"""

new_cert_effect = """  useEffect(() => {
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
  }, [pendingAction, diplomaTypes]);"""

content = content.replace(old_cert_effect, new_cert_effect)

# 4. Modify handleConfirmAction params merging
content = content.replace(
    "      const { type, params } = pendingAction;",
    "      const { type } = pendingAction;\n      const params = { ...pendingAction.params, ...editedParams };"
)

# 5. Replace render block return statement
old_return_start_idx = content.find("  return (\n    <div className=\"space-y-5 text-right")
if old_return_start_idx == -1:
    # Try finding generic return start
    old_return_start_idx = content.find("  return (\n    <div className=\"space-y-5")

old_return_end_pattern = "    </div>\n  );\n\n  function handleTextareaSubmit"
old_return_end_idx = content.find(old_return_end_pattern)

if old_return_start_idx != -1 and old_return_end_idx != -1:
    new_return_content = """  return (
    <>
      {/* Floating Trigger Button */}
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

      {/* Floating Expandable Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-[9999] w-96 h-[550px] bg-[#0A0A0D]/95 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md font-sans text-right select-none"
            dir="rtl"
          >
            {/* Header of Chatbox */}
            <div className="p-4 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between shrink-0">
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
                {messages.length > 1 && (
                  <button
                    onClick={handleClearChat}
                    className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
                    title="مسح سجل المحادثة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-zinc-900 text-zinc-500 hover:text-white transition-all cursor-pointer"
                  title="تصغير"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

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
"""

content = content.replace("  const [messages, setMessages] = useState<ChatMessage[]>([]);", state_hooks + "\n  const [messages, setMessages] = useState<ChatMessage[]>([]);")
content = content.replace("  // Initialize Speech Recognition\n  useEffect(() => {", toggle_effect + "\n\n  // Initialize Speech Recognition\n  useEffect(() => {")
content = content.replace(old_cert_effect, new_cert_effect)
content = content.replace("      const { type, params } = pendingAction;", "      const { type } = pendingAction;\n      const params = { ...pendingAction.params, ...editedParams };")

old_return_start_idx = content.find("  return (\n    <div className=\"space-y-5 text-right")
if old_return_start_idx == -1:
    old_return_start_idx = content.find("  return (\n    <div className=\"space-y-5")

old_return_end_pattern = "    </div>\n  );\n\n  function handleTextareaSubmit"
old_return_end_idx = content.find(old_return_end_pattern)

if old_return_start_idx != -1 and old_return_end_idx != -1:
    content = content[:old_return_start_idx] + new_return_content + content[old_return_end_idx + len(old_return_end_pattern):]

with open(assistant_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Assistant UI successfully updated!")
