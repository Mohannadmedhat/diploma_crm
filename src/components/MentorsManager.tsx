import React, { useState } from 'react';
import { Mentor, Diploma, Session } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, Phone, Mail, Award, BookOpen, MessageCircle } from 'lucide-react';
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

  return (
    <div className="space-y-6 text-right" id="mentors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
            موجهي التدريب ومنسقي الدبلومات (Mentors Directory)
          </h3>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">تسجيل وإدارة السادة الموجهين والمنسقين المسؤولين عن متابعة الحضور والعمليات التقنية.</p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-teal-600/10 active:scale-95"
            id="btn-add-mentor"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منسق (منتور) جديد</span>
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

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {mentors.map((men) => {
          const mentorDips = diplomas.filter(d => d.mentorId === men.id);
          const activeDips = mentorDips.filter(d => d.status === 'Active');

          return (
            <div
              key={men.id}
              className={`bg-[#121212]/30 backdrop-blur-md border rounded-2xl p-5 transition-all flex flex-col justify-between relative overflow-hidden group shadow-lg ${
                men.status === 'Active'
                  ? 'border-zinc-800/80 hover:border-teal-500/40 hover:bg-[#121212]/50'
                  : 'border-dashed border-zinc-900 opacity-60'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
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

              {/* Main Card Content */}
              <div className="flex gap-3 text-right">
                {/* Avatar Badge */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600/10 to-teal-550/5 border border-teal-550/20 flex items-center justify-center text-teal-400 font-black text-xs shrink-0 select-none uppercase shadow-sm">
                  {getInitials(men.name)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <span className="text-xs font-bold text-white block group-hover:text-teal-400 transition-colors leading-relaxed truncate pl-14" title={men.name}>
                    {men.name}
                  </span>
                  
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
                        : 'لا يتابع دبلومات نشطة حالياً'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer: Action Links and admin settings */}
              <div className="flex items-center justify-between border-t border-zinc-900/50 mt-4 pt-3 gap-2">
                {/* Communication channels */}
                <div className="flex items-center gap-2">
                  {/* WhatsApp chat */}
                  <a
                    href={`https://wa.me/${men.phone.replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg bg-emerald-950/20 border border-emerald-900/25 text-emerald-450 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                    title={`واتساب: ${men.phone}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>

                  {/* Phone Call */}
                  <a
                    href={`tel:${men.phone}`}
                    className="w-7 h-7 rounded-lg bg-blue-955 border border-blue-900/25 text-blue-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-sm"
                    title={`اتصال هاتفي: ${men.phone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {/* Email */}
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

                {/* Edit & Delete Controls (Only for Admin) */}
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
    </div>
  );
}
