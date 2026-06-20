import React, { useState } from 'react';
import { Mentor } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MentorsProps {
  mentors: Mentor[];
  onSaveMentors: (mentors: Mentor[]) => void;
  isAdmin?: boolean;
}

export default function MentorsManager({ mentors, onSaveMentors, isAdmin = false }: MentorsProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setStatus('Active');
    setShowForm(true);
    setError('');
  };

  const handleStartEdit = (ment: Mentor) => {
    setEditingId(ment.id);
    setName(ment.name);
    setPhone(ment.phone);
    setEmail(ment.email);
    setStatus(ment.status);
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
      status: status
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

  return (
    <div className="space-y-4 text-right" id="mentors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            إدارة منسقي الدبلومات وموجهي التدريب (Mentors Directory)
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">تنظيم وإدار موجهي التوجيه الأكاديمي والتقني المعتمدين والمتابعين لحضور الطلاب</p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white hover:from-teal-500 hover:to-teal-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-indigo-900/20 rounded-xl space-y-4"
            onSubmit={handleSave}
            id="form-mentor"
          >
            <div className="text-xs font-bold text-indigo-400 uppercase border-b border-[#262626] pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {editingId ? 'تعديل منسق دبلومة' : 'تسجيل منسق (منتور) مرشد للعمليات'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  اسم المنتور بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: م. ممدوح الشمري"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  رقم الهاتف (مع رمز الدولة) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +966500000000"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., mamdouh@platform.edu"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                حالة المنتور المهنية الحالية
              </label>
              <div className="flex items-center gap-4 mt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Active'}
                    onChange={() => setStatus('Active')}
                    className="accent-indigo-500"
                  />
                  <span>نشط ومفعل لمتابعة حضور الطلاب</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="radio"
                    checked={status === 'Inactive'}
                    onChange={() => setStatus('Inactive')}
                    className="accent-indigo-500"
                  />
                  <span>غير نشط مؤقتاً</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#2D3748] hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mentors.map((men) => (
          <div
            key={men.id}
            className={`bg-[#0F0F0F]/60 border rounded-xl p-4 transition-all flex flex-col justify-between ${
              men.status === 'Active' ? 'border-[#262626] hover:border-teal-500/30' : 'border-dashed border-zinc-800 opacity-65'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(men)}
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                      men.status === 'Active'
                        ? 'text-teal-400 bg-teal-950/20 border-teal-900/10'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                  >
                    {men.status === 'Active' ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                  </button>
                ) : (
                  <div
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 transition-all ${
                      men.status === 'Active'
                        ? 'text-teal-400 bg-teal-950/20 border-teal-900/10'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                  >
                    {men.status === 'Active' ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-1 bg-[#171717]/80 rounded border border-[#232323] px-1">
                    <button
                      onClick={() => handleStartEdit(men)}
                      className="p-1 px-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
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

              <div className="space-y-2">
                <span className="text-xs font-bold text-white block">{men.name}</span>
                <div className="space-y-1 block font-mono text-[10px] text-zinc-455">
                  <div className="flex items-center gap-1.5 font-sans" dir="ltr">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span>{men.phone}</span>
                  </div>
                  {men.email && (
                    <div className="flex items-center gap-1.5 font-sans overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      <span>{men.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
