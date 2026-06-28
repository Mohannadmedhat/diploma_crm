import React, { useState } from 'react';
import { Instructor, Diploma, Session } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, Phone, Mail, Award, BookOpen, ExternalLink, MessageCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6 text-right" id="instructors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            أعضاء هيئة التدريس والمحاضرين האكاديميين
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">تسجيل وتعديل بيانات السادة المحاضرين مع ربطهم بمواد وتخصصات الدبلومات.</p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95"
            id="btn-add-instructor"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة محاضر جديد</span>
          </button>
        ) : (
          <span className="px-2.5 py-1.5 bg-[#1F1F1F] text-zinc-400 border border-[#2D2D2D] rounded-lg text-[10px] font-bold select-none">
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
            className="p-5 bg-[#0A0A0E] border border-indigo-900/30 rounded-xl space-y-4 shadow-2xl"
            onSubmit={handleSave}
            id="form-instructor"
          >
            <div className="text-xs font-bold text-indigo-400 uppercase border-b border-zinc-900 pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {editingId ? 'تعديل بيانات المحاضر الحالي' : 'تسجيل محاضر أكاديمي جديد'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  اسم المحاضر بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: د. عادل القحطاني"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  التخصص الرئيسي / المادة
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="مثال: أمن سيبراني، برمجة ويب"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
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
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  البريد الإلكتروني الافتراضي
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., adel@platform.edu"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  سعر ساعة التدريس المقدرة (EGP)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value !== '' ? Number(e.target.value) : '')}
                  placeholder="مثال: 250"
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right font-sans font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1.5">
                  تقييم الأداء الحالي (من 1 إلى 5)
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#050508] border border-zinc-800 focus:border-indigo-500 text-xs text-zinc-300 rounded-lg outline-hidden cursor-pointer"
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

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#10B981] hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {editingId ? 'حفظ التغييرات' : 'حفظ المحاضر'}
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

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {instructors.map((ins) => {
          const instructorDips = diplomas.filter(d => d.instructorId === ins.id);
          const activeDips = instructorDips.filter(d => d.status === 'Active');

          const instructorDipIds = instructorDips.map(d => d.id);
          const instructorSessions = sessions.filter(s => instructorDipIds.includes(s.diplomaId) || s.instructor === ins.name);
          const totalHours = instructorSessions.reduce((sum, s) => {
            if (!s.startTime || !s.endTime) return sum + 2;
            try {
              const [sh, sm] = s.startTime.split(':').map(Number);
              const [eh, em] = s.endTime.split(':').map(Number);
              const diffMin = (eh * 60 + em) - (sh * 60 + sm);
              return sum + (diffMin > 0 ? diffMin / 60 : 2);
            } catch (e) {
              return sum + 2;
            }
          }, 0);
          const totalEarnings = totalHours * (ins.hourlyRate || 0);

          return (
            <div
              key={ins.id}
              className={`bg-[#121212]/30 backdrop-blur-md border rounded-2xl p-5 transition-all flex flex-col justify-between relative overflow-hidden group shadow-lg ${
                ins.status === 'Active'
                  ? 'border-zinc-800/80 hover:border-indigo-550/40 hover:bg-[#121212]/50'
                  : 'border-dashed border-zinc-900 opacity-60'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(ins)}
                    className={`text-[8px] font-bold border px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                      ins.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                    }`}
                  >
                    {ins.status === 'Active' ? 'نشط' : 'معطل'}
                  </button>
                ) : (
                  <div
                    className={`text-[8px] font-bold border px-2 py-0.5 rounded-full transition-all ${
                      ins.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-900/50 border-zinc-800'
                    }`}
                  >
                    {ins.status === 'Active' ? 'نشط' : 'معطل'}
                  </div>
                )}
              </div>

              {/* Main Card Content */}
              <div className="flex gap-3 text-right">
                {/* Avatar Badge */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600/10 to-indigo-550/5 border border-indigo-550/20 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0 select-none uppercase shadow-sm">
                  {getInitials(ins.name)}
                </div>

                <div className="space-y-1 overflow-hidden">
                  <span className="text-xs font-bold text-white block group-hover:text-indigo-400 transition-colors leading-relaxed truncate" title={ins.name}>
                    {ins.name}
                  </span>
                  
                  {/* Specialty */}
                  <span className="inline-flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-900/60 border border-zinc-850 px-2 py-0.5 rounded font-sans">
                    <Award className="w-2.5 h-2.5 text-zinc-500" />
                    {ins.specialty || 'تخصص عام / أكاديمي'}
                  </span>

                  {/* Active Diplomas Count */}
                  <div className="flex items-center gap-1 text-[9px] text-indigo-400 font-sans font-medium mt-1">
                    <BookOpen className="w-2.5 h-2.5 shrink-0" />
                    <span>
                      {activeDips.length > 0 
                        ? `يدرس: ${activeDips.length} دبلومة نشطة`
                        : 'لا توجد دبلومات نشطة حالياً'
                      }
                    </span>
                  </div>

                  {/* Financial & Performance Stats */}
                  <div className="mt-3.5 pt-2.5 border-t border-zinc-900 grid grid-cols-2 gap-2 text-[10px] font-sans">
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">سعر الساعة:</span>
                      <span className="text-zinc-200 font-bold font-mono">
                        {ins.hourlyRate !== undefined ? `${ins.hourlyRate} EGP` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">مستحقات المحاضر:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {totalEarnings > 0 ? `${totalEarnings.toLocaleString()} EGP` : '0 EGP'}
                      </span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">إجمالي الساعات:</span>
                      <span className="text-zinc-200 font-bold font-mono">{totalHours.toFixed(1)} ساعة</span>
                    </div>
                    <div className="p-2 bg-zinc-950/50 border border-zinc-900 rounded-lg">
                      <span className="text-zinc-500 block text-[9px]">المحاضرات المنجزة:</span>
                      <span className="text-indigo-400 font-bold font-mono">{instructorSessions.length} محاضرة</span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] bg-zinc-950/30 border border-zinc-900 p-1.5 px-2.5 rounded-lg">
                    <span className="text-zinc-500 font-bold">تقييم أداء المحاضر:</span>
                    <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                      <span>{ins.rating || 5}</span>
                      <span className="text-xs">★</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Action Links and admin settings */}
              <div className="flex items-center justify-between border-t border-zinc-900/50 mt-4 pt-3 gap-2">
                {/* Communication channels */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp chat */}
                  <a
                    href={`https://wa.me/${ins.phone.replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-emerald-950/20 border border-emerald-900/25 text-emerald-450 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                    title={`واتساب: ${ins.phone}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>

                  {/* Phone Call */}
                  <a
                    href={`tel:${ins.phone}`}
                    className="w-7 h-7 rounded-lg bg-blue-955 border border-blue-900/25 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                    title={`اتصال هاتفي: ${ins.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {/* Email */}
                  {ins.email && (
                    <a
                      href={`mailto:${ins.email}`}
                      className="w-7 h-7 rounded-lg bg-indigo-950/20 border border-indigo-900/25 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                      title={`البريد الإلكتروني: ${ins.email}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Edit & Delete Controls (Only for Admin) */}
                {isAdmin && (
                  <div className="flex items-center gap-1 bg-[#171717]/60 rounded-lg border border-[#232323] px-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(ins)}
                      className="p-1 px-1.5 text-zinc-450 hover:text-white transition-colors cursor-pointer text-[10px]"
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
    </div>
  );
}
