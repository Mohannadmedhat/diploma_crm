import React, { useState } from 'react';
import { DiplomaTemplate } from '../types';
import { Award, Clock, HelpCircle, Plus, Edit2, Trash2, Check, X, ShieldAlert, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiplomaTemplatesProps {
  templates: DiplomaTemplate[];
  onSaveTemplates: (templates: DiplomaTemplate[]) => void;
}

export default function DiplomaTemplates({ templates, onSaveTemplates }: DiplomaTemplatesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(6);
  const [error, setError] = useState('');

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setDuration(6);
    setShowForm(true);
    setError('');
  };

  const handleStartEdit = (t: DiplomaTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description);
    setDuration(t.estimatedDurationMonths);
    setShowForm(true);
    setError('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم نوع/قالب الدبلوم.');
      return;
    }

    const savedTemplate: DiplomaTemplate = {
      id: editingId || `dt-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      estimatedDurationMonths: Number(duration) || 6
    };

    let updatedList: DiplomaTemplate[];
    if (editingId) {
      updatedList = templates.map((t) => (t.id === editingId ? savedTemplate : t));
    } else {
      updatedList = [savedTemplate, ...templates];
    }

    onSaveTemplates(updatedList);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string, label: string) => {
    if (templates.length <= 1) {
      alert('يجب الإبقاء على قالب واحد على الأقل لتسهيل عمليات التأسيس السريع.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من مسح قالب "${label}"؟ لن يتم حذف الدبلومات التي تم إنشاؤها مسبقاً باستخدامه، ولكن لن تظهر في قائمة التأسيس السريع للمسارات الجديدة.`)) {
      onSaveTemplates(templates.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-4 text-right" id="diploma-templates-component" dir="rtl">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            إدارة قوالب وأنواع الدبلومات الأكاديمية
          </h3>
          <p className="text-xs text-zinc-400 font-sans">تجهيز قوالب البرامج الجاهزة لتأسيسها وتوليد المسارات والمحاضرات للطلاب بضغطة زر</p>
        </div>
        <button
          onClick={handleStartAdd}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          id="btn-add-diploma-template"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قالب دبلوم جديد</span>
        </button>
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
            className="p-5 bg-[#0F0F0F] border border-amber-900/20 rounded-xl space-y-4"
            onSubmit={handleSave}
            id="form-diploma-template-record"
          >
            <div className="text-xs font-bold text-amber-500 uppercase border-b border-[#262626] pb-1.5 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              {editingId ? 'تحيين قالب برنامج تدريبي' : 'ابتكار وتأسيس قالب برنامج تدريبي جديد'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  مسمى قالب الدبلوم المعتمد
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: دبلوم تقنيات الذكاء الاصطناعي والتوليد"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  المدة التدريبية التقريبية (بالأشهر)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={48}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-100 rounded outline-hidden text-right font-mono"
                    required
                  />
                  <span className="absolute left-3 top-2 text-[10px] text-zinc-500 font-sans">شهر</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                الرسالة التدريسية ومحاور هذا التخصص
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="تفصيل المادة العلمية وأبرز الكفاءات والبرمجيات التي يحصل عليها الطالب..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-amber-500 text-xs text-zinc-100 rounded outline-hidden resize-none text-right placeholder-zinc-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {editingId ? 'تعديل تفاصيل القالب' : 'حفظ وإدراج قالب الدبلوم'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded text-xs cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Database Templates list grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-[#0F0F0F]/60 border border-[#262626] rounded-xl p-4 hover:border-amber-500/30 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2.5">
                <span className="text-[9px] font-mono text-amber-400 bg-amber-950/30 border border-amber-900/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-amber-400" />
                  الافتراضي: {tpl.estimatedDurationMonths} أشهر
                </span>
                
                <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                  <button
                    onClick={() => handleStartEdit(tpl)}
                    className="p-1 px-1.5 bg-[#171717] rounded border border-[#262626] text-zinc-400 hover:text-white transition-colors cursor-pointer text-[10px]"
                    title="تعديل القالب"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="مسح القالب"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-950/40 border border-amber-900/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <h4 className="text-xs font-bold text-white leading-normal leading-relaxed">{tpl.name}</h4>
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
