import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state variable
old_state = "const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);"
new_state = "const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);\n  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);"
if new_state not in content:
    content = content.replace(old_state, new_state)

# 2. Replace enrolledStudents mapping block in the students tab
bulk_idx = content.find("{/* Feature 3: Bulk WhatsApp Message button */}")
if bulk_idx != -1:
    start_idx = content.find("{enrolledStudents.map((st) => (", bulk_idx)
    end_idx = content.find("{enrolledStudents.length === 0", start_idx)
    
    if start_idx != -1 and end_idx != -1:
        new_map_block = """{enrolledStudents.map((st) => {
                    const studentSessions = enrolledSessions.filter(ses => ses.attendance && ses.attendance[st.id]);
                    const totalMarked = studentSessions.length;
                    const absentCount = studentSessions.filter(ses => ses.attendance[st.id]?.status === 'Absent').length;
                    const presenceCount = studentSessions.filter(ses => ses.attendance[st.id]?.status === 'Present').length;
                    const attendanceRate = totalMarked > 0 ? Math.round((presenceCount / totalMarked) * 100) : 100;
                    const allowedAbsences = diploma?.allowedAbsences ?? 3;
                    const isThreatened = absentCount > allowedAbsences;

                    return (
                      <div 
                        key={st.id} 
                        className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans ${
                          isThreatened 
                            ? 'bg-rose-955/10 border-rose-900/40 hover:border-rose-900/60 shadow-lg shadow-rose-950/5' 
                            : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isThreatened ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <span 
                              className="text-xs font-bold text-white capitalize cursor-pointer hover:underline hover:text-indigo-400"
                              onClick={() => setSelectedStudentForProfile(st)}
                            >
                              {st.name}
                            </span>
                            {isThreatened ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-955/20 border border-rose-900/30 text-rose-400 text-[9px] font-bold">
                                ⚠️ متجاوز للغياب المسموح ({absentCount}/{allowedAbsences})
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[9px] font-bold font-mono">
                                نسبة حضور: {attendanceRate}%
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-sans">
                            ولي الأمر: <span className="text-zinc-400">{st.parentName || 'غير معلم'}</span> • الواتساب: <span className="text-zinc-400 font-mono tracking-wide">{st.phone}</span>
                          </div>

                          {/* CRM Financial Metadata Block */}
                          <div className="mt-2.5 pt-2 border-t border-[#1a1a1a] grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px] font-sans text-zinc-450">
                            {st.studentType && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">حالة الطالب: </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#1f2937] text-zinc-200 text-[9px] font-semibold font-sans">{st.studentType}</span>
                              </div>
                            )}
                            {st.salesName && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">المبيعات: </span>
                                <span className="text-zinc-200">{st.salesName}</span>
                              </div>
                            )}
                            {st.paymentMethod && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">طريقة السداد: </span>
                                <span className="text-zinc-200">{st.paymentMethod}</span>
                              </div>
                            )}
                            {st.discount && st.discount !== '0%' && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">الخصم: </span>
                                <span className="text-emerald-400 font-semibold">{st.discount}</span>
                              </div>
                            )}
                            {st.coursePrice !== undefined && st.coursePrice > 0 && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">السعر: </span>
                                <span className="text-zinc-300 font-mono">{st.coursePrice} EGP</span>
                              </div>
                            )}
                            {st.payedAmount !== undefined && st.payedAmount > 0 && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">المدفوع: </span>
                                <span className="text-emerald-500 font-semibold font-mono">{st.payedAmount} EGP</span>
                              </div>
                            )}
                            {st.remainingAmount !== undefined && st.remainingAmount > 0 && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">المتبقي: </span>
                                <span className="text-amber-500 font-semibold font-mono">{st.remainingAmount} EGP</span>
                              </div>
                            )}
                            {st.deposit !== undefined && st.deposit > 0 && (
                              <div>
                                <span className="text-zinc-500 text-[10px]">العربون: </span>
                                <span className="text-[#3B82F6] font-mono">{st.deposit} EGP</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedStudentForProfile(st)}
                            className="px-2 py-1 bg-indigo-950/45 border border-indigo-900/40 text-indigo-400 hover:text-indigo-350 rounded text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 font-sans"
                            title="عرض الملف الأكاديمي والغياب للولد"
                          >
                            <User className="w-3.5 h-3.5" />
                            الملف الأكاديمي 📊
                          </button>
                          <button
                            onClick={() => {
                              setStudentToEdit(st);
                              setShowStudentEditForm(true);
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1 font-sans"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#3B82F6]" />
                            تعديل
                          </button>
                          <button
                            onClick={() => executeSendWhatsApp(st, 'تنبيه')}
                            className="px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-950 rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1 select-none"
                          >
                            <Send className="w-3.5 h-3.5" />
                            مراسلة
                          </button>
                          <button
                            onClick={() => handleRemoveFromDiploma(st.id, st.name)}
                            className="px-2.5 py-1.5 bg-rose-950/20 border border-rose-900/30 text-rose-400 hover:bg-rose-955/50 rounded text-[10px] scroll-smooth transition-colors cursor-pointer"
                            title="حذف"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  """
        content = content[:start_idx] + new_map_block + content[end_idx:]

# 3. Add Slide-over Drawer JSX
drawer_jsx = """      {/* Student Profile Drawer (Slide-over Drawer) */}
      <AnimatePresence>
        {selectedStudentForProfile && (() => {
          const st = selectedStudentForProfile;
          const studentSessions = enrolledSessions.filter(ses => ses.attendance && ses.attendance[st.id]);
          const totalMarked = studentSessions.length;
          const absentSessions = studentSessions.filter(ses => ses.attendance[st.id]?.status === 'Absent');
          const absentCount = absentSessions.length;
          const presentCount = studentSessions.filter(ses => ses.attendance[st.id]?.status === 'Present').length;
          const excusedCount = studentSessions.filter(ses => ses.attendance[st.id]?.status === 'Excused').length;
          const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;
          const allowedAbsences = diploma?.allowedAbsences ?? 3;
          const isThreatened = absentCount > allowedAbsences;

          return (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[450px] z-[9999] bg-[#09090C]/95 border-r border-zinc-800 shadow-2xl flex flex-col backdrop-blur-md text-right select-none font-sans"
              dir="rtl"
            >
              {/* Header */}
              <div className="p-5 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold ${
                    isThreatened 
                      ? 'bg-rose-955/20 border-rose-900/50 text-rose-400' 
                      : 'bg-indigo-955/20 border-indigo-900/30 text-indigo-400'
                  }`}>
                    {st.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      {st.name}
                      {isThreatened ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-955/20 border border-rose-900/30 text-rose-400 text-[9px] font-bold">
                          ⚠️ متجاوز للغياب
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[9px] font-bold font-mono">
                          ✅ نسبة حضور: {attendanceRate}%
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">{st.phone} · {st.parentName || 'ولي الأمر غير مسجل'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudentForProfile(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">نسبة الحضور الحالية:</span>
                    <span className={`text-lg font-black font-mono ${attendanceRate < (diploma?.requiredAttendanceRate ?? 75) ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {attendanceRate}%
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">المحاضرات الفائتة:</span>
                    <span className={`text-lg font-black font-mono ${isThreatened ? 'text-rose-400' : 'text-zinc-200'}`}>
                      {absentCount} <span className="text-xs text-zinc-500 font-normal">من أصل {allowedAbsences} غيابات مسموحة</span>
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">حضور / معذور / غياب:</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                      <span className="text-emerald-400">{presentCount}</span>
                      <span className="text-zinc-650">/</span>
                      <span className="text-amber-500">{excusedCount}</span>
                      <span className="text-zinc-650">/</span>
                      <span className="text-rose-400">{absentCount}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block">حالة الدفعة والمالية:</span>
                    <span className="text-xs font-bold text-zinc-300 font-mono">
                      {st.payedAmount || 0} / {st.coursePrice || 0} EGP
                    </span>
                  </div>
                </div>

                {/* Timeline / Session Logs */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-900 pb-2">
                    📋 خط الحضور والغياب الزمني
                  </h4>
                  
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {enrolledSessions.map((ses, idx) => {
                      const record = ses.attendance && ses.attendance[st.id];
                      const status = record?.status || 'Unmarked';
                      const note = record?.note || '';
                      
                      return (
                        <div key={ses.id} className="p-2.5 bg-zinc-950/20 border border-zinc-900/60 rounded-lg flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-zinc-200 block">المحاضرة {idx + 1}: {ses.title}</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{ses.date}</span>
                            {note && (
                              <span className="text-[9px] text-amber-500/80 block mt-0.5 font-sans">✍️ ملاحظة: {note}</span>
                            )}
                          </div>
                          
                          <div>
                            {status === 'Present' && (
                              <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 text-[10px] font-bold">
                                حاضر ✅
                              </span>
                            )}
                            {status === 'Absent' && (
                              <span className="px-2 py-0.5 rounded bg-rose-955/20 border border-rose-900/30 text-rose-400 text-[10px] font-bold">
                                غائب ❌
                              </span>
                            )}
                            {status === 'Excused' && (
                              <span className="px-2 py-0.5 rounded bg-amber-955/20 border border-amber-900/30 text-amber-400 text-[10px] font-bold">
                                معذور ⚠️
                              </span>
                            )}
                            {status === 'Unmarked' && (
                              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-550 text-[10px] font-bold">
                                معلّق ⏳
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {enrolledSessions.length === 0 && (
                      <div className="p-6 text-center text-zinc-650 text-[11px]">
                        لم يتم توليد أي محاضرات بعد لهذه الدبلومة.
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info details */}
                <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl space-y-2 text-[11px] text-zinc-400">
                  <span className="font-bold text-zinc-300 block mb-1">🔍 معلومات إضافية للمنسق:</span>
                  <div>• المحاضر المسؤول: <span className="text-zinc-300">{diploma?.instructorName || 'غير معين'}</span></div>
                  <div>• أيام التدريس الفعلي: <span className="text-zinc-350">{diploma?.studyDays?.join(' - ') || 'غير معين'}</span></div>
                  <div>• مسؤول المبيعات: <span className="text-zinc-300">{st.salesName || 'غير مسجل'}</span></div>
                  <div>• وسيلة السداد المفضلة: <span className="text-zinc-350">{st.paymentMethod || 'غير مسجل'}</span></div>
                </div>

              </div>

              {/* Footer actions */}
              <div className="p-4 bg-zinc-950/80 border-t border-zinc-900 flex items-center justify-between shrink-0">
                <button
                  onClick={() => {
                    setStudentToEdit(st);
                    setShowStudentEditForm(true);
                    setSelectedStudentForProfile(null);
                  }}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  تعديل بيانات الطالب 📝
                </button>
                <button
                  onClick={() => {
                    executeSendWhatsApp(st, 'تنبيه');
                  }}
                  className="px-4 py-2 bg-emerald-650 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  مراسلة فورية (واتساب) 💬
                </button>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
"""

# Append drawer_jsx right before the last closing div of the render method:
last_div_idx = content.rfind("    </div>\n  );\n}")
if last_div_idx != -1:
    content = content[:last_div_idx] + drawer_jsx + "\n" + content[last_div_idx:]
else:
    # Try alternative spacing
    last_div_idx = content.rfind("    </div>\n\n  );\n}")
    if last_div_idx != -1:
        content = content[:last_div_idx] + drawer_jsx + "\n" + content[last_div_idx:]
    else:
        # Fallback, just append right before return end
        last_div_idx = content.rfind("  );\n}")
        content = content[:last_div_idx] + drawer_jsx + "\n" + content[last_div_idx:]

with open(workspace_path, "w", encoding="utf-8") as f:
    f.write(content)

print("DiplomaWorkspace.tsx successfully updated with isolated indices!")
