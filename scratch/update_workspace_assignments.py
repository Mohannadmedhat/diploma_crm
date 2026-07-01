import os

workspace_path = r"e:\diploma-operations-assistant (3)\src\components\DiplomaWorkspace.tsx"
with open(workspace_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Diploma, Student, Session, DiplomaType, MessageTemplate, DEFAULT_ARABIC_TEMPLATES, Instructor, Mentor, AttendanceStatus, Task } from '../types';",
    "import { Diploma, Student, Session, DiplomaType, MessageTemplate, DEFAULT_ARABIC_TEMPLATES, Instructor, Mentor, AttendanceStatus, Task, Assignment, AssignmentSubmission } from '../types';"
)

# 2. Update WorkspaceTab type definition
old_tab_type = """type WorkspaceTab = 
  | 'overview' 
  | 'students' 
  | 'sessions' 
  | 'attendance-matrix'
  | 'sheets' 
  | 'whatsapp' 
  | 'reports' 
  | 'settings';"""

new_tab_type = """type WorkspaceTab = 
  | 'overview' 
  | 'students' 
  | 'sessions' 
  | 'attendance-matrix'
  | 'sheets' 
  | 'whatsapp' 
  | 'reports' 
  | 'settings'
  | 'assignments';"""

content = content.replace(old_tab_type, new_tab_type)

# 3. Add states and handlers
old_states_marker = "const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);"
new_states_and_handlers = """const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);

  // Assignments & Project Tracker states
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignMaxGrade, setAssignMaxGrade] = useState<number>(100);

  const currentAssignments = useMemo(() => {
    return diploma?.assignments || [];
  }, [diploma?.assignments]);

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diploma || !assignTitle.trim()) return;

    const existingAssignments = diploma.assignments || [];
    let updated: Assignment[];

    if (editingAssignmentId) {
      updated = existingAssignments.map(a => a.id === editingAssignmentId ? {
        ...a,
        title: assignTitle.trim(),
        description: assignDesc.trim() || undefined,
        dueDate: assignDueDate || undefined,
        maxGrade: Number(assignMaxGrade)
      } : a);
    } else {
      const newAssign: Assignment = {
        id: `assign-${Date.now()}`,
        diplomaId: diploma.id,
        title: assignTitle.trim(),
        description: assignDesc.trim() || undefined,
        dueDate: assignDueDate || undefined,
        maxGrade: Number(assignMaxGrade),
        submissions: {}
      };
      // Pre-fill submissions for all enrolled students
      enrolledStudents.forEach(st => {
        newAssign.submissions[st.id] = { submitted: false };
      });
      updated = [newAssign, ...existingAssignments];
    }

    const updatedDiplomas = diplomas.map(d => d.id === diploma.id ? { ...d, assignments: updated } : d);
    onSaveDiplomas(updatedDiplomas);
    
    // Reset form
    setAssignTitle('');
    setAssignDesc('');
    setAssignDueDate('');
    setAssignMaxGrade(100);
    setEditingAssignmentId(null);
    setShowAssignmentForm(false);
  };

  const handleDeleteAssignment = (assignId: string, title: string) => {
    if (!diploma) return;
    if (confirm(`هل أنت متأكد من حذف التكليف "${title}" بالكامل وسجل درجات الطلاب فيه؟`)) {
      const existing = diploma.assignments || [];
      const updated = existing.filter(a => a.id !== assignId);
      const updatedDiplomas = diplomas.map(d => d.id === diploma.id ? { ...d, assignments: updated } : d);
      onSaveDiplomas(updatedDiplomas);
      if (selectedAssignmentId === assignId) setSelectedAssignmentId(null);
    }
  };

  const handleUpdateSubmission = (assignId: string, studentId: string, submitted: boolean, grade?: number, notes?: string) => {
    if (!diploma) return;
    const existing = diploma.assignments || [];
    const updated = existing.map(a => {
      if (a.id === assignId) {
        const subs = { ...a.submissions };
        subs[studentId] = {
          submitted,
          submittedAt: submitted ? (subs[studentId]?.submittedAt || new Date().toISOString().split('T')[0]) : undefined,
          grade: grade !== undefined ? Math.min(a.maxGrade, Math.max(0, grade)) : undefined,
          notes: notes !== undefined ? notes : subs[studentId]?.notes
        };
        return { ...a, submissions: subs };
      }
      return a;
    });
    const updatedDiplomas = diplomas.map(d => d.id === diploma.id ? { ...d, assignments: updated } : d);
    onSaveDiplomas(updatedDiplomas);
  };"""

content = content.replace(old_states_marker, new_states_and_handlers)

# 4. Update the tabs array inside component JSX
old_tabs_array = """    const tabs = [
      { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
      { id: 'students', label: 'الطلاب', icon: Users },
      { id: 'sessions', label: 'المحاضرات', icon: CalendarCheck2 },
      { id: 'attendance-matrix', label: 'شبكة الحضور', icon: Grid },
      { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
      { id: 'whatsapp', label: 'واتساب', icon: MessageSquare },
      { id: 'reports', label: 'التقارير', icon: BarChart4 },
      { id: 'settings', label: 'الإعدادات', icon: Sliders }
    ];"""

new_tabs_array = """    const tabs = [
      { id: 'overview', label: 'الرئيسية', icon: LayoutDashboard },
      { id: 'students', label: 'الطلاب', icon: Users },
      { id: 'sessions', label: 'المحاضرات', icon: CalendarCheck2 },
      { id: 'attendance-matrix', label: 'شبكة الحضور', icon: Grid },
      { id: 'assignments', label: 'التكليفات والواجبات', icon: FileCheck },
      { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
      { id: 'whatsapp', label: 'واتساب', icon: MessageSquare },
      { id: 'reports', label: 'التقارير', icon: BarChart4 },
      { id: 'settings', label: 'الإعدادات', icon: Sliders }
    ];"""

content = content.replace(old_tabs_array, new_tabs_array)

# 5. Insert assignments tab rendering before Sheets tab marker
old_sheets_marker = "        {/* TAB 4: GOOGLE SHEETS INTEGRATION */}"

assignments_tab_jsx = """        {/* TAB: ASSIGNMENTS & PROJECT TRACKER */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            
            {/* Header controls */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 font-sans">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-400" />
                  إدارة التكليفات والواجبات المدرسية للطلاب
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  رصد درجات الطلاب، تتبع التسليم، وإرسال تنبيهات تلقائية بالواتساب للطلاب المتأخرين.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingAssignmentId(null);
                  setAssignTitle('');
                  setAssignDesc('');
                  setAssignDueDate('');
                  setAssignMaxGrade(100);
                  setShowAssignmentForm(!showAssignmentForm);
                }}
                className="px-3 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء تكليف جديد</span>
              </button>
            </div>

            {/* Main view layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
              
              {/* Left Column: Assignments list & Submissions tracker */}
              <div className={`space-y-6 ${selectedAssignmentId ? 'lg:col-span-6' : 'lg:col-span-12'}`}>
                
                {/* Form to Add/Edit (Inline) */}
                {showAssignmentForm && (
                  <form onSubmit={handleSaveAssignment} className="p-5 bg-[#0B0B0E] border border-indigo-900/30 rounded-xl space-y-4 shadow-xl">
                    <div className="text-xs font-bold text-indigo-400 border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      {editingAssignmentId ? 'تعديل بيانات التكليف' : 'إنشاء تكليف أكاديمي جديد'}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] text-zinc-450 font-bold mb-1">عنوان الواجب/التكليف:</label>
                        <input
                          type="text"
                          value={assignTitle}
                          onChange={(e) => setAssignTitle(e.target.value)}
                          placeholder="مثال: واجب المحاضرة الأولى"
                          className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-white rounded-lg outline-hidden text-right"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] text-zinc-450 font-bold mb-1">الدرجة القصوى:</label>
                        <input
                          type="number"
                          value={assignMaxGrade}
                          onChange={(e) => setAssignMaxGrade(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-white rounded-lg outline-hidden text-center font-mono font-bold"
                          min={1}
                          required
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] text-zinc-455 font-bold mb-1">تاريخ التسليم الأقصى (اختياري):</label>
                        <input
                          type="date"
                          value={assignDueDate}
                          onChange={(e) => setAssignDueDate(e.target.value)}
                          className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-300 rounded-lg outline-hidden font-sans"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] text-zinc-450 font-bold mb-1">تفاصيل ووصف التكليف:</label>
                        <textarea
                          value={assignDesc}
                          onChange={(e) => setAssignDesc(e.target.value)}
                          placeholder="اكتب تفاصيل التكليف أو رابط رفع الملفات هنا..."
                          rows={2}
                          className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-white rounded-lg outline-hidden text-right"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        {editingAssignmentId ? 'حفظ التعديلات' : 'إنشاء التكليف'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAssignmentForm(false);
                          setEditingAssignmentId(null);
                        }}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}

                {/* List Card list */}
                <div className="grid grid-cols-1 gap-4">
                  {currentAssignments.map((a) => {
                    const submissionsArr = Object.values(a.submissions || {});
                    const submittedCount = submissionsArr.filter(s => s.submitted).length;
                    const submissionRate = enrolledStudents.length > 0 
                      ? Math.round((submittedCount / enrolledStudents.length) * 100) 
                      : 0;

                    return (
                      <div 
                        key={a.id} 
                        className={`p-4 border rounded-2xl transition-all flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group shadow-lg ${
                          selectedAssignmentId === a.id
                            ? 'bg-indigo-950/20 border-indigo-500/50 shadow-indigo-950/10'
                            : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-850'
                        }`}
                        onClick={() => setSelectedAssignmentId(a.id)}
                      >
                        <div className="space-y-2 text-right">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-black text-white group-hover:text-indigo-400 transition-colors">
                              {a.title}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-bold font-mono">
                              الدرجة: {a.maxGrade}
                            </span>
                          </div>

                          {a.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                              {a.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-wrap">
                            {a.dueDate && (
                              <span className="flex items-center gap-1 text-amber-500 font-bold">
                                📅 أقصى موعد: {a.dueDate}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-mono">
                              📊 نسبة التسليم: {submittedCount} من {enrolledStudents.length} طلاب ({submissionRate}%)
                            </span>
                          </div>
                        </div>

                        {/* Actions footer */}
                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedAssignmentId(a.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              selectedAssignmentId === a.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                            }`}
                          >
                            📝 رصد درجات الطلاب
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingAssignmentId(a.id);
                                setAssignTitle(a.title);
                                setAssignDesc(a.description || '');
                                setAssignDueDate(a.dueDate || '');
                                setAssignMaxGrade(a.maxGrade);
                                setShowAssignmentForm(true);
                              }}
                              className="p-1 px-2.5 bg-[#171717] border border-zinc-800 text-zinc-400 hover:text-white rounded text-[10px] transition-colors cursor-pointer"
                              title="تعديل التكليف"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(a.id, a.title)}
                              className="p-1 px-2.5 bg-rose-950/20 border border-rose-900/30 text-rose-455 hover:bg-rose-955/40 rounded text-[10px] transition-colors cursor-pointer"
                              title="حذف التكليف"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {currentAssignments.length === 0 && (
                    <div className="p-8 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-xl text-zinc-500 text-xs">
                      لا توجد أي تكليفات أو واجبات حالياً في هذه الدبلومة. اضغط على "إنشاء تكليف جديد" للبدء.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Grades entry for selected assignment */}
              {selectedAssignmentId && (() => {
                const activeAssign = currentAssignments.find(a => a.id === selectedAssignmentId);
                if (!activeAssign) return null;

                return (
                  <div className="lg:col-span-6 bg-[#0B0B0E] p-5 border border-zinc-900 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-indigo-400" />
                          رصد الدرجات: {activeAssign.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-sans mt-0.5">اضغط على حالة التسليم أو رصيد الدرجات لحفظ البيانات فوراً.</p>
                      </div>
                      <button
                        onClick={() => setSelectedAssignmentId(null)}
                        className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Students grading list */}
                    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                      {enrolledStudents.map((st) => {
                        const sub = activeAssign.submissions[st.id] || { submitted: false };
                        
                        return (
                          <div 
                            key={st.id} 
                            className={`p-3 border rounded-xl transition-all space-y-3 font-sans ${
                              sub.submitted 
                                ? 'bg-[#060B08]/40 border-emerald-950/60' 
                                : 'bg-[#0B0808]/40 border-rose-955/15'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white capitalize">{st.name}</span>
                              
                              {/* Submit Switch */}
                              <label className="flex items-center gap-2 cursor-pointer text-[10px] select-none">
                                <input
                                  type="checkbox"
                                  checked={sub.submitted}
                                  onChange={(e) => handleUpdateSubmission(activeAssign.id, st.id, e.target.checked, sub.grade, sub.notes)}
                                  className="accent-indigo-500 scale-95"
                                />
                                <span className={sub.submitted ? 'text-emerald-450 font-bold' : 'text-rose-455'}>
                                  {sub.submitted ? 'تم التسليم ✅' : 'لم يسلم بعد ⏳'}
                                </span>
                              </label>
                            </div>

                            {/* Grade and Feedback inputs */}
                            <div className="grid grid-cols-3 gap-2.5 items-center">
                              <div className="col-span-1 space-y-1">
                                <span className="block text-[8px] text-zinc-500 font-bold">الدرجة:</span>
                                <div className="flex items-center gap-1 bg-[#050508] border border-zinc-800 rounded-lg p-1.5 px-2">
                                  <input
                                    type="number"
                                    value={sub.grade !== undefined ? sub.grade : ''}
                                    onChange={(e) => {
                                      const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                                      handleUpdateSubmission(activeAssign.id, st.id, sub.submitted, val, sub.notes);
                                    }}
                                    disabled={!sub.submitted}
                                    min={0}
                                    max={activeAssign.maxGrade}
                                    placeholder="رصد"
                                    className="w-full bg-transparent text-xs text-white text-center font-mono font-bold focus:outline-hidden disabled:opacity-40"
                                  />
                                  <span className="text-[9px] text-zinc-500 font-bold">/{activeAssign.maxGrade}</span>
                                </div>
                              </div>

                              <div className="col-span-2 space-y-1">
                                <span className="block text-[8px] text-zinc-500 font-bold">الملاحظات:</span>
                                <input
                                  type="text"
                                  value={sub.notes || ''}
                                  onChange={(e) => handleUpdateSubmission(activeAssign.id, st.id, sub.submitted, sub.grade, e.target.value)}
                                  placeholder="ملاحظات أو تعليق التقييم..."
                                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-white rounded-lg outline-hidden text-right"
                                />
                              </div>
                            </div>

                            {/* Direct Action buttons */}
                            <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-zinc-900/60">
                              <button
                                onClick={() => {
                                  const text = sub.submitted 
                                    ? `أهلاً بك، تم تصحيح واجبك الخاص بـ "${activeAssign.title}" في دبلومة "${diploma.name}"، وحصلت على درجة: ${sub.grade || 0} من ${activeAssign.maxGrade}.${sub.notes ? `\\nتعليق المعلم: ${sub.notes}` : ''}`
                                    : `أهلاً بك، تذكير سريع بضرورة تسليم واجب "${activeAssign.title}" في دبلومة "${diploma.name}" في أقرب وقت لتفادي خصم الدرجات.`;
                                  
                                  const url = `https://wa.me/${st.phone.replace(/\\+/g, '')}?text=${encodeURIComponent(text)}`;
                                  window.open(url, '_blank');
                                }}
                                className="px-2 py-1 rounded bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 text-[9px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>إرسال إشعار بالدرجة/التذكير 💬</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        )}

        {/* TAB 4: GOOGLE SHEETS INTEGRATION */}"""

content = content.replace(old_sheets_marker, assignments_tab_jsx)

with open(workspace_path, "w", encoding="utf-8") as f:
    f.write(content)

print("DiplomaWorkspace.tsx successfully updated with Assignments Sub-Tab and grading logic!")
