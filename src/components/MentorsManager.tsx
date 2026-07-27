import React, { useState, useMemo } from 'react';
import { Mentor, Diploma, Session } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, Phone, Mail, Award, BookOpen, MessageCircle, Search, LayoutGrid, List, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MentorsProps {
  mentors: Mentor[];
  onSaveMentors: (mentors: Mentor[]) => void;
  isAdmin?: boolean;
  diplomas: Diploma[];
  sessions: Session[];
}

export default function MentorsManager({ mentors, onSaveMentors, isAdmin = false, diplomas, sessions }: MentorsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter, View, & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

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

  const handleStartEdit = (ment: Mentor) => {
    setEditingId(ment.id);
    setName(ment.name);
    setPhone(ment.phone);
    setEmail(ment.email);
    setSpecialty(ment.specialty || '');
    setStatus(ment.status);
    setHourlyRate(ment.hourlyRate !== undefined ? ment.hourlyRate : '');
    setRating(ment.rating !== undefined ? ment.rating : 5);
    setShowForm(true);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم المنسق / المنتور.');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتفه.');
      return;
    }

    const savedMent: Mentor = {
      id: editingId || `ment-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      specialty: specialty.trim() || undefined,
      status: status,
      hourlyRate: hourlyRate !== '' ? Number(hourlyRate) : undefined,
      rating: Number(rating)
    };

    let updatedList: Mentor[];
    if (editingId) {
      updatedList = mentors.map((m) => (m.id === editingId ? savedMent : m));
    } else {
      updatedList = [savedMent, ...mentors];
    }

    onSaveMentors(updatedList);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    if (confirm(`هل أنت متأكد من مسح المنتور "${label}"؟ لن يتم تدمير الحقول المعبأة مسبقاً، ولكن لن يمكن تعيينه للدبلومات الجديدة.`)) {
      onSaveMentors(mentors.filter((m) => m.id !== id));
    }
  };

  const toggleStatus = (target: Mentor) => {
    const updated = mentors.map((m) => {
      if (m.id === target.id) {
        return {
          ...m,
          status: (m.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive'
        };
      }
      return m;
    });
    onSaveMentors(updated);
  };

  // Helper to extract initials for avatar
  const getInitials = (fullName: string) => {
    const cleanName = fullName.replace(/(د\.|م\.|أ\.)\s+/g, ''); // strip honorifics
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '👥';
    if (parts.length === 1) return parts[0].substring(0, 2);
    return `${parts[0][0]} ${parts[parts.length - 1][0]}`;
  };

  // Filtered mentors logic
  const filteredMentors = useMemo(() => {
    return mentors.filter((men) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        men.name.toLowerCase().includes(q) ||
        (men.specialty && men.specialty.toLowerCase().includes(q)) ||
        men.phone.includes(q) ||
        (men.email && men.email.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || men.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [mentors, searchTerm, statusFilter]);

  // Pagination calculation
  const totalItems = filteredMentors.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMentors = useMemo(() => {
    if (pageSize === 0) return filteredMentors;
    const start = (safePage - 1) * pageSize;
    return filteredMentors.slice(start, start + pageSize);
  }, [filteredMentors, pageSize, safePage]);

  return (
    <div className="space-y-5 text-right" id="mentors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            موجهي التدريب ومنسقي الدبلومات (Mentors Directory)
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            تسجيل وإدارة السادة الموجهين والمنسقين المسؤولين عن متابعة الحضور والعمليات التقنية.
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-teal-600/10 active:scale-95 shrink-0"
            id="btn-add-mentor"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منسق (منتور) جديد</span>
          </button>
        ) : (
          <span className="px-2.5 py-1.5 bg-[#1F1F1F] text-zinc-400 border border-[#2D2D2D] rounded-lg text-[10px] font-bold select-none shrink-0">
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
            className="p-5 bg-[#0A0A0E] border border-teal-900/30 rounded-xl space-y-4 shadow-2xl"
            onSubmit={handleSave}
            id="form-mentor"
          >
            <div className="text-xs font-bold text-teal-450 uppercase border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {editingId ? 'تعديل منسق دبلومة' : 'تسجيل منسق (منتور) مرشد للعمليات'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  اسم المنتور بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: م. ممدوح الشمري"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  المجال / التخصص الإرشادي
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="مثال: إرشاد تقني، متابعة إدارية"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  رقم الهاتف (مع رمز الدولة) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +966500000000"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., mamdouh@platform.edu"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  سعر ساعة الإشراف/التدريب المقدرة (EGP)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="مثال: 150"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right font-sans font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  تقييم الأداء الحالي (من 1 إلى 5)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-300 rounded-lg outline-hidden cursor-pointer"
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
              <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                حالة المنتور المهنية الحالية
              </label>
              <div className="flex items-center gap-4 mt-1 font-sans">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Active'}
                    onChange={() => setStatus('Active')}
                    className="accent-teal-500"
                  />
                  <span>نشط ومفعل لمتابعة حضور الطلاب</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Inactive'}
                    onChange={() => setStatus('Inactive')}
                    className="accent-teal-500"
                  />
                  <span>غير نشط مؤقتاً</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {editingId ? 'حفظ التغييرات' : 'حفظ المنتور'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-[#0D0D11] border border-zinc-850 p-3 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="البحث باسم المنسق، المجال الإرشادي، أو الهاتف..."
            className="w-full pl-8 pr-9 py-2 bg-[#050508] border border-zinc-800 focus:border-teal-500 text-xs text-zinc-200 rounded-lg outline-hidden transition-all placeholder:text-zinc-550"
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
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-zinc-300 outline-hidden cursor-pointer"
            >
              <option value="all">جميع الحالات ({mentors.length})</option>
              <option value="Active">النشطون فقط</option>
              <option value="Inactive">المعطلون فقط</option>
            </select>
          </div>

          {/* Page size selector */}
          <div className="flex items-center gap-1.5 bg-[#050508] border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-400">
            <span className="text-[11px]">في الصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs text-teal-400 font-bold outline-hidden cursor-pointer"
            >
              <option value="6">6</option>
              <option value="9">9</option>
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="0">الكل ({totalItems})</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-[#050508] p-1 border border-zinc-800 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="عرض الكروت (Grid)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="عرض الجدول المدمج (Compact Table)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* RESULT COUNT & STATUS SUMMARY */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-sans">
        <div>
          عرض <span className="font-bold text-white">{totalItems > 0 ? (safePage - 1) * (pageSize || totalItems) + 1 : 0}</span> إلى{' '}
          <span className="font-bold text-white">
            {pageSize === 0 ? totalItems : Math.min(safePage * pageSize, totalItems)}
          </span>{' '}
          من إجمالي <span className="font-bold text-teal-400">{totalItems}</span> منسق ومنتور
          {searchTerm && <span className="text-zinc-500 mr-2">(مصفى حسب التصفية)</span>}
        </div>
        {totalPages > 1 && pageSize > 0 && (
          <div className="text-zinc-500">
            صفحة <span className="text-zinc-200 font-bold">{safePage}</span> من{' '}
            <span className="text-zinc-200 font-bold">{totalPages}</span>
          </div>
        )}
      </div>

      {/* EMPTY STATE */}
      {paginatedMentors.length === 0 && (
        <div className="p-12 text-center bg-[#0D0D11]/40 border border-dashed border-zinc-850 rounded-2xl space-y-3">
          <User className="w-10 h-10 text-zinc-600 mx-auto animate-bounce" />
          <h4 className="text-sm font-bold text-zinc-300">لا توجد نتائج مطابقة لبحثك</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            جرب كتابة كلمة بحث أخرى أو تغيير الفلتر لعرض المنسقين والمنتورز المطابقين.
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-teal-950/40 border border-teal-900/50 text-teal-400 hover:text-teal-300 rounded-lg text-xs cursor-pointer transition-all"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && paginatedMentors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedMentors.map((men) => {
            const mentorDips = diplomas.filter((d) => d.mentorId === men.id);
            const activeDips = mentorDips.filter((d) => d.status === 'Active');

            return (
              <div
                key={men.id}
                className={`bg-[#121212]/30 backdrop-blur-md border rounded-2xl p-5 transition-all flex flex-col justify-between relative overflow-hidden group shadow-lg ${
                  men.status === 'Active'
                    ? 'border-zinc-800/80 hover:border-teal-500/40 hover:bg-[#121212]/50'
                    : 'border-dashed border-zinc-900 opacity-60'
                }`}
              >
                {/* Main Card Content */}
                <div className="flex gap-3 text-right">
                  {/* Avatar Badge */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600/10 to-teal-550/5 border border-teal-550/20 flex items-center justify-center text-teal-400 font-black text-xs shrink-0 select-none uppercase shadow-sm">
                    {getInitials(men.name)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    {/* Name and Status row */}
                    <div className="flex items-center justify-between gap-2.5">
                      <span
                        className="text-xs font-bold text-white block group-hover:text-teal-400 transition-colors leading-relaxed truncate flex-1 min-w-0"
                        title={men.name}
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                      >
                        {men.name}
                      </span>
                      <div className="shrink-0">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => toggleStatus(men)}
                            className={`text-[8px] font-bold border px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                              men.status === 'Active'
                                ? 'text-teal-450 bg-teal-950/20 border-teal-900/30'
                                : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                            }`}
                          >
                            {men.status === 'Active' ? 'نشط' : 'معطل'}
                          </button>
                        ) : (
                          <div
                            className={`text-[8px] font-bold border px-2 py-0.5 rounded-full transition-all ${
                              men.status === 'Active'
                                ? 'text-teal-450 bg-teal-950/20 border-teal-900/30'
                                : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                            }`}
                          >
                            {men.status === 'Active' ? 'نشط' : 'معطل'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specialty */}
                    <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900/60 border border-zinc-850 px-2 py-0.5 rounded font-sans">
                      <Award className="w-2.5 h-2.5 text-zinc-500" />
                      {men.specialty || 'متابعة وتوجيه عام'}
                    </span>

                    {/* Active Diplomas Count */}
                    <div className="flex items-center gap-1 text-[9px] text-teal-400 font-sans font-medium mt-1">
                      <BookOpen className="w-2.5 h-2.5 shrink-0" />
                      <span>
                        {activeDips.length > 0
                          ? `يتابع: ${activeDips.length} دبلومة نشطة`
                          : 'لا يتابع دبلومات نشطة حالياً'}
                      </span>
                    </div>

                    {/* Rating Badge */}
                    <div className="mt-3.5 flex items-center justify-between text-[10px] bg-zinc-950/30 border border-zinc-900 p-1.5 px-2.5 rounded-lg">
                      <span className="text-zinc-500 font-bold">تقييم أداء المنتور:</span>
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                        <span>{men.rating || 5}</span>
                        <span className="text-xs">★</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Action Links and admin settings */}
                <div className="flex items-center justify-between border-t border-zinc-900/50 mt-4 pt-3 gap-2">
                  {/* Communication channels */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${men.phone.replace(/\+/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-emerald-955 border border-emerald-900/25 text-emerald-450 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                      title={`واتساب: ${men.phone}`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>

                    <a
                      href={`tel:${men.phone}`}
                      className="w-7 h-7 rounded-lg bg-blue-955 border border-blue-900/25 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                      title={`اتصال هاتفي: ${men.phone}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {men.email && (
                      <a
                        href={`mailto:${men.email}`}
                        className="w-7 h-7 rounded-lg bg-teal-950/20 border border-teal-900/25 text-teal-400 hover:bg-teal-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                        title={`البريد الإلكتروني: ${men.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Edit & Delete Controls */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 bg-[#171717]/60 rounded-lg border border-[#232323] px-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(men)}
                        className="p-1 px-1.5 text-zinc-450 hover:text-white transition-colors cursor-pointer text-[10px]"
                        title="تعديل"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(men.id, men.name)}
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
      {viewMode === 'table' && paginatedMentors.length > 0 && (
        <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-[#0D0D11]/60 shadow-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#050508] border-b border-zinc-800 text-zinc-400 font-sans">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold">المنسق / المنتور</th>
                <th className="py-3 px-3 text-[11px] font-bold">التخصص / المجال</th>
                <th className="py-3 px-3 text-[11px] font-bold">الدبلومات المتابعة</th>
                <th className="py-3 px-3 text-[11px] font-bold">التقييم</th>
                <th className="py-3 px-3 text-[11px] font-bold text-center">الحالة</th>
                <th className="py-3 px-4 text-[11px] font-bold text-center">التواصل والإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/60 font-sans">
              {paginatedMentors.map((men) => {
                const mentorDips = diplomas.filter((d) => d.mentorId === men.id);
                const activeDips = mentorDips.filter((d) => d.status === 'Active');

                return (
                  <tr key={men.id} className="hover:bg-zinc-900/40 transition-colors group">
                    {/* Mentor Info */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-600/10 border border-teal-500/20 text-teal-400 font-black text-[10px] flex items-center justify-center shrink-0 uppercase select-none">
                          {getInitials(men.name)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block group-hover:text-teal-400 transition-colors truncate">
                            {men.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 block truncate font-mono" dir="ltr" style={{ textAlign: 'right' }}>
                            {men.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Specialty */}
                    <td className="py-2.5 px-3 text-zinc-300">
                      <span className="inline-block bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px]">
                        {men.specialty || 'متابعة عامة'}
                      </span>
                    </td>

                    {/* Active Diplomas */}
                    <td className="py-2.5 px-3">
                      <span className="text-teal-400 font-medium text-[11px]">
                        {activeDips.length > 0 ? `${activeDips.length} دبلومة نشطة` : '-'}
                      </span>
                    </td>

                    {/* Rating */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-[11px]">
                        <span>{men.rating || 5}</span>
                        <span>★</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => toggleStatus(men)}
                          className={`text-[9px] font-bold border px-2.5 py-0.5 rounded-full cursor-pointer transition-all ${
                            men.status === 'Active'
                              ? 'text-teal-400 bg-teal-955/40 border-teal-900/40'
                              : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          {men.status === 'Active' ? 'نشط' : 'معطل'}
                        </button>
                      ) : (
                        <span
                          className={`text-[9px] font-bold border px-2.5 py-0.5 rounded-full inline-block ${
                            men.status === 'Active'
                              ? 'text-teal-400 bg-teal-955/40 border-teal-900/40'
                              : 'text-zinc-500 bg-zinc-900 border-zinc-800'
                          }`}
                        >
                          {men.status === 'Active' ? 'نشط' : 'معطل'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`https://wa.me/${men.phone.replace(/\+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md bg-emerald-955/30 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"
                          title="واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`tel:${men.phone}`}
                          className="p-1.5 rounded-md bg-blue-955/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                          title="اتصال"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleStartEdit(men)}
                              className="p-1.5 rounded-md bg-zinc-850 text-zinc-300 hover:text-white transition-all cursor-pointer"
                              title="تعديل"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(men.id, men.name)}
                              className="p-1.5 rounded-md bg-zinc-850 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* PAGINATION FOOTER */}
      {totalPages > 1 && pageSize > 0 && (
        <div className="flex items-center justify-between bg-[#0D0D11] border border-zinc-850 p-3 rounded-xl shadow-md font-sans">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <ChevronRight className="w-4 h-4" />
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
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      safePage === p
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-zinc-900/60 border border-zinc-850 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ) : (
                  <span key={idx} className="px-1 text-xs text-zinc-600 select-none">
                    ...
                  </span>
                )
              )}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            <span>التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
