import React, { useState, useMemo } from 'react';
import { Instructor, Diploma, Session } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, Phone, Mail, Award, BookOpen, MessageCircle, Search, LayoutGrid, List, ChevronLeft, ChevronRight, X, Filter, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructorsProps {
  instructors: Instructor[];
  onSaveInstructors: (instructors: Instructor[]) => void;
  isAdmin?: boolean;
  diplomas: Diploma[];
  sessions: Session[];
}

export default function InstructorsManager({ instructors, onSaveInstructors, isAdmin = false, diplomas, sessions }: InstructorsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter, View, & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6); // Compact default size: 6 items (2 rows)

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [rating, setRating] = useState<number>(5);
  const [error, setError] = useState('');

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setSpecialty('');
    setStatus('Active');
    setHourlyRate('');
    setRating(5);
    setShowForm(true);
    setError('');
  };

  const handleStartEdit = (inst: Instructor) => {
    setEditingId(inst.id);
    setName(inst.name);
    setPhone(inst.phone);
    setEmail(inst.email);
    setSpecialty(inst.specialty || '');
    setStatus(inst.status);
    setHourlyRate(inst.hourlyRate !== undefined ? inst.hourlyRate : '');
    setRating(inst.rating !== undefined ? inst.rating : 5);
    setShowForm(true);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم المحاضر.');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتف المحاضر.');
      return;
    }

    const savedInst: Instructor = {
      id: editingId || `inst-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      specialty: specialty.trim() || undefined,
      status: status,
      hourlyRate: hourlyRate !== '' ? Number(hourlyRate) : undefined,
      rating: Number(rating)
    };

    let updatedList: Instructor[];
    if (editingId) {
      updatedList = instructors.map((i) => (i.id === editingId ? savedInst : i));
    } else {
      updatedList = [savedInst, ...instructors];
    }

    onSaveInstructors(updatedList);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`هل أنت متأكد من مسح المحاضر "${label}"؟ لن يتم حذف بيانات حقول الدبلومات المعينة مسبقاً، ولكن لن يكون متاحاً للاختيار في الدبلومات الجديدة.`)) {
      onSaveInstructors(instructors.filter((i) => i.id !== id));
    }
  };

  const toggleStatus = (target: Instructor) => {
    const updated = instructors.map((i) => {
      if (i.id === target.id) {
        return {
          ...i,
          status: (i.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive'
        };
      }
      return i;
    });
    onSaveInstructors(updated);
  };

  // Helper to extract initials for avatar
  const getInitials = (fullName: string) => {
    const cleanName = fullName.replace(/(د\.|م\.|أ\.)\s+/g, ''); // strip honorifics
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '🎓';
    if (parts.length === 1) return parts[0].substring(0, 2);
    return `${parts[0][0]} ${parts[parts.length - 1][0]}`;
  };

  // Filtered instructors logic
  const filteredInstructors = useMemo(() => {
    return instructors.filter((ins) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ins.name.toLowerCase().includes(q) ||
        (ins.specialty && ins.specialty.toLowerCase().includes(q)) ||
        ins.phone.includes(q) ||
        (ins.email && ins.email.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || ins.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [instructors, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredInstructors.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedInstructors = useMemo(() => {
    if (pageSize === 0) return filteredInstructors;
    const start = (safePage - 1) * pageSize;
    return filteredInstructors.slice(start, start + pageSize);
  }, [filteredInstructors, pageSize, safePage]);

  // Calculate instructor stats memoized helper
  const getInstructorStats = (ins: Instructor) => {
    const instructorDips = diplomas.filter((d) => d.instructorId === ins.id);
    const activeDips = instructorDips.filter((d) => d.status === 'Active');

    const instructorDipIds = instructorDips.map((d) => d.id);
    const instructorSessions = sessions.filter(
      (s) => instructorDipIds.includes(s.diplomaId) || s.instructor === ins.name
    );
    const totalHours = instructorSessions.reduce((sum, s) => {
      if (!s.startTime || !s.endTime) return sum + 2;
      try {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const diffMin = eh * 60 + em - (sh * 60 + sm);
        return sum + (diffMin > 0 ? diffMin / 60 : 2);
      } catch (e) {
        return sum + 2;
      }
    }, 0);
    const totalEarnings = totalHours * (ins.hourlyRate || 0);

    return { instructorDips, activeDips, instructorSessions, totalHours, totalEarnings };
  };

  return (
    <div className="space-y-4 text-right" id="instructors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            أعضاء هيئة التدريس والمحاضرين الأكاديميين
            <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 text-[9px] px-2 py-0.5 rounded-full font-mono">
              عرض مدمج بدون تمرير
            </span>
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            تسجيل وتعديل بيانات السادة المحاضرين مع ربطهم بمواد وتخصصات الدبلومات.
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 shrink-0"
            id="btn-add-instructor"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة محاضر جديد</span>
          </button>
        ) : (
          <span className="px-2 py-1 bg-[#1F1F1F] text-zinc-400 border border-[#2D2D2D] rounded-lg text-[10px] font-bold select-none shrink-0">
            ⚙️ عرض فقط (الأدمن)
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-955/20 border border-red-500/20 text-red-100 text-xs rounded flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Entry Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-[#0A0A0E] border border-indigo-900/30 rounded-xl space-y-4 shadow-2xl"
            onSubmit={handleSave}
            id="form-instructor"
          >
            <div className="text-xs font-bold text-indigo-400 uppercase border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {editingId ? 'تعديل بيانات المحاضر الحالي' : 'تسجيل محاضر أكاديمي جديد'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  اسم المحاضر بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: د. عادل القحطاني"
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  التخصص الرئيسي / المادة
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="مثال: أمن سيبراني، برمجة ويب"
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  رقم الهاتف (مع رمز الدولة) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +966500000000"
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  البريد الإلكتروني الافتراضي
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., adel@platform.edu"
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  سعر ساعة التدريس المقدرة (EGP)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="مثال: 250"
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right font-sans font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                  تقييم الأداء الحالي (من 1 إلى 5)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-300 rounded-lg outline-hidden cursor-pointer"
                >
                  <option value="5">⭐⭐⭐⭐⭐ (ممتاز - 5)</option>
                  <option value="4">⭐⭐⭐⭐ (جيد جداً - 4)</option>
                  <option value="3">⭐⭐⭐ (جيد - 3)</option>
                  <option value="2">⭐⭐ (مقبول - 2)</option>
                  <option value="1">⭐ (ضعيف - 1)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                حالة المحاضر الحالية
              </label>
              <div className="flex items-center gap-4 mt-1 font-sans">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Active'}
                    onChange={() => setStatus('Active')}
                    className="accent-indigo-500"
                  />
                  <span>نشط ومتاح للتكليف الأكاديمي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Inactive'}
                    onChange={() => setStatus('Inactive')}
                    className="accent-indigo-500"
                  />
                  <span>غير نشط / معطل مؤقتاً</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#10B981] hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {editingId ? 'حفظ التغييرات' : 'حفظ المحاضر'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-1.5 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-[#0D0D11] border border-zinc-850 p-2.5 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shadow-md">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="البحث باسم المحاضر، التخصص، أو الهاتف..."
            className="w-full pl-8 pr-8 py-1.5 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-200 rounded-lg outline-hidden transition-all placeholder:text-zinc-550"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter controls group */}
        <div className="flex flex-wrap items-center gap-2 font-sans">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-[#050508] border border-zinc-800 rounded-lg px-2 py-1">
            <Filter className="w-3 h-3 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] text-zinc-300 outline-hidden cursor-pointer"
            >
              <option value="all">جميع الحالات ({instructors.length})</option>
              <option value="Active">النشطون فقط</option>
              <option value="Inactive">المعطلون فقط</option>
            </select>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-1 bg-[#050508] border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-400">
            <span>في الصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] text-indigo-400 font-bold outline-hidden cursor-pointer"
            >
              <option value="3">3 محاضرين</option>
              <option value="6">6 محاضرين</option>
              <option value="9">9 محاضرين</option>
              <option value="12">12 محاضر</option>
              <option value="0">الكل ({totalItems})</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-[#050508] p-0.5 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="عرض الكروت (Grid)"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>كروت</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="عرض الجدول المدمج (Compact Table)"
            >
              <List className="w-3 h-3" />
              <span>جدول مدمج</span>
            </button>
          </div>
        </div>
      </div>

      {/* RESULT COUNT & STATUS SUMMARY */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 font-sans">
        <div>
          عرض <span className="font-bold text-white">{totalItems > 0 ? (safePage - 1) * (pageSize || totalItems) + 1 : 0}</span> إلى{' '}
          <span className="font-bold text-white">
            {pageSize === 0 ? totalItems : Math.min(safePage * pageSize, totalItems)}
          </span>{' '}
          من إجمالي <span className="font-bold text-indigo-400">{totalItems}</span> محاضر
          {searchTerm && <span className="text-zinc-500 mr-2">(مصفى حسب التصفية)</span>}
        </div>
        {totalPages > 1 && pageSize > 0 && (
          <div className="text-zinc-500">
            صفحة <span className="text-zinc-200 font-bold">{safePage}</span> من{' '}
            <span className="text-zinc-200 font-bold">{totalPages}</span>
          </div>
        )}
      </div>

      {/* FIXED MAX-HEIGHT CONTAINER TO PREVENT PAGE OVERFLOW */}
      <div className="max-h-[480px] overflow-y-auto custom-scrollbar p-1 border border-zinc-850/60 rounded-xl bg-[#08080C]/40">
        {/* EMPTY STATE */}
        {paginatedInstructors.length === 0 && (
          <div className="p-10 text-center space-y-2">
            <User className="w-8 h-8 text-zinc-600 mx-auto animate-bounce" />
            <h4 className="text-xs font-bold text-zinc-300">لا توجد نتائج مطابقة لبحثك</h4>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              جرب كتابة كلمة بحث أخرى أو تغيير الفلتر لعرض المحاضرين المطابقين.
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="px-3 py-1 bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs cursor-pointer transition-all"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        )}

        {/* GRID VIEW */}
        {viewMode === 'grid' && paginatedInstructors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedInstructors.map((ins) => {
              const { activeDips, instructorSessions, totalHours, totalEarnings } = getInstructorStats(ins);

              return (
                <div
                  key={ins.id}
                  className={`bg-[#121212]/50 backdrop-blur-md border rounded-xl p-4 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md ${
                    ins.status === 'Active'
                      ? 'border-zinc-800/80 hover:border-indigo-550/40 hover:bg-[#121212]/70'
                      : 'border-dashed border-zinc-900 opacity-60'
                  }`}
                >
                  {/* Main Card Content */}
                  <div className="flex gap-2.5 text-right">
                    {/* Avatar Badge */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/10 to-indigo-550/5 border border-indigo-550/20 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0 select-none uppercase shadow-sm">
                      {getInitials(ins.name)}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Name and Status row */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs font-bold text-white block group-hover:text-indigo-400 transition-colors leading-relaxed truncate flex-1 min-w-0"
                          title={ins.name}
                          dir="ltr"
                          style={{ textAlign: 'right' }}
                        >
                          {ins.name}
                        </span>
                        <div className="shrink-0">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => toggleStatus(ins)}
                              className={`text-[8px] font-bold border px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                                ins.status === 'Active'
                                  ? 'text-emerald-400 bg-emerald-955/20 border-emerald-900/30'
                                  : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                              }`}
                            >
                              {ins.status === 'Active' ? 'نشط' : 'معطل'}
                            </button>
                          ) : (
                            <div
                              className={`text-[8px] font-bold border px-2 py-0.5 rounded-full transition-all ${
                                ins.status === 'Active'
                                  ? 'text-emerald-400 bg-emerald-955/20 border-emerald-900/30'
                                  : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                              }`}
                            >
                              {ins.status === 'Active' ? 'نشط' : 'معطل'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Specialty */}
                      <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900/60 border border-zinc-850 px-2 py-0.5 rounded font-sans">
                        <Award className="w-2.5 h-2.5 text-zinc-500" />
                        {ins.specialty || 'تخصص عام / أكاديمي'}
                      </span>

                      {/* Active Diplomas Count */}
                      <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-sans font-medium mt-0.5">
                        <BookOpen className="w-2.5 h-2.5 shrink-0" />
                        <span>
                          {activeDips.length > 0
                            ? `يدرس: ${activeDips.length} دبلومة نشطة`
                            : 'لا توجد دبلومات نشطة حالياً'}
                        </span>
                      </div>

                      {/* Financial & Performance Stats */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-900 grid grid-cols-2 gap-1.5 text-[9px] font-sans">
                        <div className="p-1.5 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                          <span className="text-zinc-500 block text-[8px]">سعر الساعة:</span>
                          <span className="text-zinc-200 font-bold font-mono">
                            {ins.hourlyRate !== undefined ? `${ins.hourlyRate} EGP` : 'غير محدد'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                          <span className="text-zinc-500 block text-[8px]">مستحقات المحاضر:</span>
                          <span className="text-emerald-400 font-bold font-mono">
                            {totalEarnings > 0 ? `${totalEarnings.toLocaleString()} EGP` : '0 EGP'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                          <span className="text-zinc-500 block text-[8px]">إجمالي الساعات:</span>
                          <span className="text-zinc-200 font-bold font-mono">{totalHours.toFixed(1)} س</span>
                        </div>
                        <div className="p-1.5 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                          <span className="text-zinc-500 block text-[8px]">المحاضرات:</span>
                          <span className="text-indigo-400 font-bold font-mono">{instructorSessions.length} محاضرة</span>
                        </div>
                      </div>

                      {/* Rating Badge */}
                      <div className="mt-2 flex items-center justify-between text-[9px] bg-zinc-950/30 border border-zinc-900 p-1 px-2 rounded-lg">
                        <span className="text-zinc-500 font-bold">تقييم أداء المحاضر:</span>
                        <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                          <span>{ins.rating || 5}</span>
                          <span className="text-xs">★</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Action Links and admin settings */}
                  <div className="flex items-center justify-between border-t border-zinc-900/50 mt-3 pt-2 gap-2">
                    {/* Communication channels */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://wa.me/${ins.phone.replace(/\+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-lg bg-emerald-955 border border-emerald-900/25 text-emerald-450 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                        title={`واتساب: ${ins.phone}`}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>

                      <a
                        href={`tel:${ins.phone}`}
                        className="w-6 h-6 rounded-lg bg-blue-955 border border-blue-900/25 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                        title={`اتصال هاتفي: ${ins.phone}`}
                      >
                        <Phone className="w-3 h-3" />
                      </a>

                      {ins.email && (
                        <a
                          href={`mailto:${ins.email}`}
                          className="w-6 h-6 rounded-lg bg-indigo-950/20 border border-indigo-900/25 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                          title={`البريد الإلكتروني: ${ins.email}`}
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Edit & Delete Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 bg-[#171717]/60 rounded-lg border border-[#232323] px-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(ins)}
                          className="p-1 text-zinc-450 hover:text-white transition-colors cursor-pointer text-[10px]"
                          title="تعديل"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(ins.id, ins.name)}
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* COMPACT TABLE VIEW */}
        {viewMode === 'table' && paginatedInstructors.length > 0 && (
          <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-[#0D0D11]/60 shadow-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#050508] border-b border-zinc-800 text-zinc-400 font-sans">
                <tr>
                  <th className="py-2.5 px-3 text-[10px] font-bold">المحاضر</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold">التخصص</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold">الدبلومات النشطة</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold">الساعات والمستحقات</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold">التقييم</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-center">الحالة</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60 font-sans">
                {paginatedInstructors.map((ins) => {
                  const { activeDips, instructorSessions, totalHours, totalEarnings } = getInstructorStats(ins);

                  return (
                    <tr
                      key={ins.id}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Instructor Info */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black text-[9px] flex items-center justify-center shrink-0 uppercase select-none">
                            {getInitials(ins.name)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white block group-hover:text-indigo-400 transition-colors truncate text-[11px]">
                              {ins.name}
                            </span>
                            <span className="text-[9px] text-zinc-500 block truncate font-mono" dir="ltr" style={{ textAlign: 'right' }}>
                              {ins.phone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td className="py-2 px-3 text-zinc-300">
                        <span className="inline-block bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-[9px]">
                          {ins.specialty || 'تخصص عام'}
                        </span>
                      </td>

                      {/* Active Diplomas */}
                      <td className="py-2 px-3">
                        <span className="text-indigo-400 font-medium text-[10px]">
                          {activeDips.length > 0 ? `${activeDips.length} دبلومة` : '-'}
                        </span>
                      </td>

                      {/* Hours & Earnings */}
                      <td className="py-2 px-3 font-mono">
                        <div className="text-[10px]">
                          <span className="text-emerald-400 font-bold">
                            {totalEarnings > 0 ? `${totalEarnings.toLocaleString()} EGP` : '0 EGP'}
                          </span>
                          <span className="text-zinc-500 text-[8px] block">
                            ({totalHours.toFixed(1)} س | {instructorSessions.length} محاضرة)
                          </span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-[10px]">
                          <span>{ins.rating || 5}</span>
                          <span>★</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => toggleStatus(ins)}
                            className={`text-[8px] font-bold border px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                              ins.status === 'Active'
                                ? 'text-emerald-400 bg-emerald-955/40 border-emerald-900/40'
                                : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                            }`}
                          >
                            {ins.status === 'Active' ? 'نشط' : 'معطل'}
                          </button>
                        ) : (
                          <span
                            className={`text-[8px] font-bold border px-2 py-0.5 rounded-full inline-block ${
                              ins.status === 'Active'
                                ? 'text-emerald-400 bg-emerald-955/40 border-emerald-900/40'
                                : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                            }`}
                          >
                            {ins.status === 'Active' ? 'نشط' : 'معطل'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={`https://wa.me/${ins.phone.replace(/\+/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-emerald-955/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"
                            title="واتساب"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                          <a
                            href={`tel:${ins.phone}`}
                            className="p-1 rounded-md bg-blue-955/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                            title="اتصال"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleStartEdit(ins)}
                                className="p-1 rounded-md bg-zinc-850 text-zinc-300 hover:text-white transition-all cursor-pointer"
                                title="تعديل"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(ins.id, ins.name)}
                                className="p-1 rounded-md bg-zinc-850 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION FOOTER */}
      {totalPages > 1 && pageSize > 0 && (
        <div className="flex items-center justify-between bg-[#0D0D11] border border-zinc-850 p-2 rounded-xl shadow-md font-sans">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>السابقة</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | string)[]>((acc, page, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && page - (arr[idx - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((p, idx) =>
                typeof p === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(p)}
                    className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      safePage === p
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-zinc-900/60 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={idx} className="px-1 text-[11px] text-zinc-600 select-none">
                    ...
                  </span>
                )
              )}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <span>التالية</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
