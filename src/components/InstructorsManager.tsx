import React, { useState } from 'react';
import { Instructor } from '../types';
import { User, Plus, Edit2, Trash2, ShieldAlert, CheckCircle, XCircle, Phone, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructorsProps {
  instructors: Instructor[];
  onSaveInstructors: (instructors: Instructor[]) => void;
  isAdmin?: boolean;
}

export default function InstructorsManager({ instructors, onSaveInstructors, isAdmin = false }: InstructorsProps) {
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

  const handleStartEdit = (inst: Instructor) => {
    setEditingId(inst.id);
    setName(inst.name);
    setPhone(inst.phone);
    setEmail(inst.email);
    setStatus(inst.status);
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
      status: status
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

  return (
    <div className="space-y-4 text-right" id="instructors-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            إدارة المحاضرين الأكاديميين (Instructors Directory)
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">تسجيل بيانات السادة المحاضرين والأساتذة الأكاديميين لتسهيل تعيينهم على البرامج المختلفة</p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-indigo-900/20 rounded-xl space-y-4"
            onSubmit={handleSave}
            id="form-instructor"
          >
            <div className="text-xs font-bold text-indigo-400 uppercase border-b border-[#262626] pb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {editingId ? 'تعديل بيانات المحاضر الحالي' : 'تسجيل محاضر أكاديمي جديد'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  اسم المحاضر بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: د. عادل القحطاني"
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
                  البريد الإلكتروني الافتراضي
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., adel@platform.edu"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                حالة المحاضر الحالية
              </label>
              <div className="flex items-center gap-4 mt-1">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructors.map((ins) => (
          <div
            key={ins.id}
            className={`bg-[#0F0F0F]/60 border rounded-xl p-4 transition-all flex flex-col justify-between ${
              ins.status === 'Active' ? 'border-[#262626] hover:border-emerald-500/30' : 'border-dashed border-zinc-800 opacity-65'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(ins)}
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
                      ins.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                  >
                    {ins.status === 'Active' ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                  </button>
                ) : (
                  <div
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 transition-all ${
                      ins.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                  >
                    {ins.status === 'Active' ? 'نشط ومفعل' : 'معطل مؤقتاً'}
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-1 bg-[#171717]/80 rounded border border-[#232323] px-1">
                    <button
                      onClick={() => handleStartEdit(ins)}
                      className="p-1 px-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
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

              <div className="space-y-2">
                <span className="text-xs font-bold text-white block">{ins.name}</span>
                <div className="space-y-1 block font-mono text-[10px] text-zinc-455">
                  <div className="flex items-center gap-1.5 font-sans" dir="ltr">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    <span>{ins.phone}</span>
                  </div>
                  {ins.email && (
                    <div className="flex items-center gap-1.5 font-sans overflow-hidden text-ellipsis whitespace-nowrap" dir="ltr">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      <span>{ins.email}</span>
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
