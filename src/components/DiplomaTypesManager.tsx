import React, { useState } from 'react';
import { DiplomaType } from '../types';
import { Award, Plus, Edit2, Trash2, ShieldAlert, CheckCircle, XCircle, FileText, ToggleLeft, ToggleRight, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiplomaTypesProps {
  types: DiplomaType[];
  onSaveTypes: (types: DiplomaType[]) => void;
  isAdmin?: boolean;
}

export default function DiplomaTypesManager({ types, onSaveTypes, isAdmin = false }: DiplomaTypesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');

  const handleStartAdd = () => {
    setEditingId(null);
    setNameAr('');
    setNameEn('');
    setDescription('');
    setStatus('Active');
    setShowForm(true);
    setError('');
  };

  const handleStartEdit = (t: DiplomaType) => {
    setEditingId(t.id);
    setNameAr(t.nameAr);
    setNameEn(t.nameEn);
    setDescription(t.description);
    setStatus(t.status);
    setShowForm(true);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nameAr.trim()) {
      setError('يرجى إدخال اسم نوع الدبلومة باللغة العربية.');
      return;
    }
    if (!nameEn.trim()) {
      setError('يرجى إدخال اسم نوع الدبلومة باللغة الإنجليزية.');
      return;
    }

    const savedType: DiplomaType = {
      id: editingId || `dtype-${Date.now()}`,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim(),
      description: description.trim(),
      status: status
    };

    let updatedList: DiplomaType[];
    if (editingId) {
      updatedList = types.map((t) => (t.id === editingId ? savedType : t));
    } else {
      updatedList = [savedType, ...types];
    }

    onSaveTypes(updatedList);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    if (types.length <= 1) {
      alert('يجب الإبقاء على نوع دبلوم واحد على الأقل بالنظام لتفادي الأخطاء.');
      return;
    }
    if (confirm(`هل أنت متأكد من مسح نوع دبلوم "${label}"؟ لن يتم تدمير الدبلومات المسجلة مسبقاً بهذا النوع، ولكن لن يمكن اختيار هذا النوع للدبلومات الجديدة.`)) {
      onSaveTypes(types.filter((t) => t.id !== id));
    }
  };

  const toggleStatus = (target: DiplomaType) => {
    const updated = types.map((t) => {
      if (t.id === target.id) {
        return {
          ...t,
          status: (t.status === 'Active' ? 'Inactive' : 'Active') as 'Active' | 'Inactive'
        };
      }
      return t;
    });
    onSaveTypes(updated);
  };

  return (
    <div className="space-y-4 text-right" id="diploma-types-manager" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            إدارة وتصنيف أنواع الدبلومات (Diploma Type Directory)
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">تجهيز وتصنيف فروع البرامج التدريبية المعتمدة وتحديد حالتها من التفعيل</p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-400 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
            id="btn-add-diploma-type"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة نوع دبلومة جديد</span>
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

      {/* Entry/edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-indigo-900/20 rounded-xl space-y-4"
            onSubmit={handleSave}
            id="form-diploma-type-record"
          >
            <div className="text-xs font-bold text-indigo-400 uppercase border-b border-[#262626] pb-1.5 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              {editingId ? 'تحيين نوع الدبلومة الأكاديمية' : 'إدراج نوع وتصنيف دبلومة جديدة'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  اسم نوع الدبلومة بالعربية (مثال: دبلوم الذكاء الاصطناعي)
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: دبلوم الذكاء الاصطناعي"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  اسم نوع الدبلومة بالإنجليزية (مثال: AI Diploma)
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g., AI Diploma"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  الوصف التفصيلي (المنهج والرسالة)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="نبذة برمجية أو منهجية عن هذا التخصص الأكاديمي..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden resize-none text-right placeholder-zinc-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  حالة نوع الدبلومة حالياً
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={status === 'Active'}
                      onChange={() => setStatus('Active')}
                      className="accent-indigo-500"
                    />
                    <span>نشط (متاح للتسجيل والربط)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="radio"
                      checked={status === 'Inactive'}
                      onChange={() => setStatus('Inactive')}
                      className="accent-indigo-500"
                    />
                    <span>غير نشط (معطل ومؤرشف)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                {editingId ? 'حفظ التعديلات' : 'إدراج نوع الدبلومة'}
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

      {/* Diploma Types Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map((tpl) => (
          <div
            key={tpl.id}
            className={`bg-[#0F0F0F]/60 border rounded-xl p-4 transition-all flex flex-col justify-between ${
              tpl.status === 'Active' ? 'border-[#262626] hover:border-indigo-500/30' : 'border-dashed border-zinc-800 opacity-60'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => toggleStatus(tpl)}
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                      tpl.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                    title="انقر لتغيير حالة التفعيل"
                  >
                    {tpl.status === 'Active' ? (
                      <>
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                        نشط ومفعل
                      </>
                    ) : (
                      <>
                        <XCircle className="w-2.5 h-2.5 text-zinc-500" />
                        معطل / مؤرشف
                      </>
                    )}
                  </button>
                ) : (
                  <div
                    className={`text-[9px] font-mono border px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 transition-all ${
                      tpl.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30'
                        : 'text-zinc-500 bg-zinc-950/30 border-zinc-900'
                    }`}
                  >
                    {tpl.status === 'Active' ? (
                      <>
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                        نشط ومفعل
                      </>
                    ) : (
                      <>
                        <XCircle className="w-2.5 h-2.5 text-zinc-500" />
                        معطل / مؤرشف
                      </>
                    )}
                  </div>
                )}
                
                {isAdmin && (
                  <div className="flex items-center gap-1 bg-[#171717]/80 rounded border border-[#232323] px-1">
                    <button
                      onClick={() => handleStartEdit(tpl)}
                      className="p-1 px-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                      title="تعديل"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id, tpl.nameAr)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="مسح"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white leading-normal">{tpl.nameAr}</h4>
                <p className="text-[10px] text-zinc-500 font-sans tracking-wide font-medium">{tpl.nameEn}</p>
              </div>

              {tpl.description && (
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans line-clamp-3">{tpl.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
