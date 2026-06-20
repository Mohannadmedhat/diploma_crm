import React, { useState } from 'react';
import { Announcement, Student, Diploma } from '../types';
import { Megaphone, Plus, Trash2, Calendar, Target, UserCheck, Check, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementsCenterProps {
  announcements: Announcement[];
  students: Student[];
  diplomas: Diploma[];
  onSaveAnnouncement: (announcements: Announcement[]) => void;
}

export default function AnnouncementsCenter({
  announcements,
  students,
  diplomas,
  onSaveAnnouncement
}: AnnouncementsCenterProps) {
  const [showForm, setShowForm] = useState(false);
  
  // Composer states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<Announcement['targetType']>('all');
  const [targetDiplomaId, setTargetDiplomaId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !content.trim()) {
      setError('يرجى تعبئة عنوان الإعلان ومضمون المنشور.');
      return;
    }

    if (targetType === 'diploma' && !targetDiplomaId) {
      setError('يرجى تحديد الدبلوم المستهدف بالإعلان الموجه.');
      return;
    }

    if (targetType === 'students' && selectedStudentIds.length === 0) {
      setError('يرجى اختيار طالب واحد على الأقل لتوجيه التنويه المخصص.');
      return;
    }

    const newAnnouncement: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      targetType,
      targetDiplomaId: targetType === 'diploma' ? targetDiplomaId : undefined,
      targetStudentIds: targetType === 'students' ? selectedStudentIds : undefined,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    onSaveAnnouncement([newAnnouncement, ...announcements]);
    
    // Clear Form
    setTitle('');
    setContent('');
    setTargetType('all');
    setTargetDiplomaId('');
    setSelectedStudentIds([]);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من مسح هذا الإعلان من سجل الأرشيف التاريخي؟')) {
      onSaveAnnouncement(announcements.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-4 text-right" id="announcements-center" dir="rtl">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#3B82F6]" />
            مركز التنويهات والبرودكاست الإداري
          </h3>
          <p className="text-xs text-zinc-400">بث الإعلانات العامة والأكاديمية للفئات المستهدفة وحفظ سجل التاريخ الإداري للمنصة</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError('');
          }}
          className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          بث تنويه جديد
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-955/20 border border-red-500/20 text-red-105 text-xs rounded">
          {error}
        </div>
      )}

      {/* Broadcasting Composer Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-[#262626] rounded-xl space-y-4"
            onSubmit={handleSubmit}
            id="form-broadcast-composer"
          >
            <div className="text-xs font-bold text-[#3B82F6] pb-1 border-b border-[#262626] uppercase">
              تفاصيل الإعلان المعلق ونطاق استهدافه
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">عنوان التنويه / موضوع البث</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: ورشة تدريبية إضافية - لغة SQL"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>

              {/* Target Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">الفئة المستهدفة بالخطاب</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as Announcement['targetType'])}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                >
                  <option value="all">عام - كل منسوبي المنصة والطلاب</option>
                  <option value="diploma">دبلوم محدد أكاديمياً</option>
                  <option value="students">طلاب محددين بذاتهم</option>
                </select>
              </div>
            </div>

            {/* Sub fields */}
            {targetType === 'diploma' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[#0A0A0A] border border-[#262626] rounded-lg"
              >
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">اختر الدبلوم الموجه له التنبيه:</label>
                <select
                  value={targetDiplomaId}
                  onChange={(e) => setTargetDiplomaId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#171717] border border-[#262626] text-xs text-white rounded outline-hidden cursor-pointer text-right"
                >
                  <option value="">-- اضغط للاختيار --</option>
                  {diplomas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}

            {targetType === 'students' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[#0A0A0A] border border-[#262626] rounded-lg space-y-2"
              >
                <label className="block text-xs font-semibold text-zinc-400 mb-1">حدد الطلاب المستلمين (اختر واحداً أو أكثر):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                  {students.map((st) => (
                    <label key={st.id} className="flex items-center gap-1.5 text-xs text-zinc-350 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(st.id)}
                        onChange={() => handleToggleStudent(st.id)}
                        className="w-3.5 h-3.5 text-[#3B82F6]"
                      />
                      <span>{st.name}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Content text */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">محتوى الإعلان وتفاصيل الرابط</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="تفاصيل التنبيه كاملاً وتوجيه الإجراءات المتوقعة..."
                rows={4}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-105 rounded outline-hidden resize-none text-right placeholder-zinc-800"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer transition-all flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>بث ونشر الإعلان فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 rounded text-xs cursor-pointer"
              >
                تحديث التراجع
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Historical Logs List */}
      <div className="space-y-3" id="announcements-logs-feed">
        {announcements.length === 0 ? (
          <div className="p-8 text-center bg-[#0F0F0F] border border-[#262626] border-dashed rounded font-sans">
            <span className="text-zinc-500 text-xs text-center block leading-relaxed">لم يتم إصدار أو تدوين أي إعلانات أو مذكرات برودكاست رسمية حتى هذه اللحظة.</span>
          </div>
        ) : (
          announcements.map((ann) => {
            // Determine badge for target
            let targetLabel = 'برودكاست عام';
            let targetColor = 'text-blue-400 bg-blue-950/40 border-blue-900/40';

            if (ann.targetType === 'diploma') {
              const dName = diplomas.find((d) => d.id === ann.targetDiplomaId)?.name || 'غير مسمى';
              targetLabel = `خاص بدبلوم: ${dName}`;
              targetColor = 'text-amber-400 bg-amber-950/40 border-amber-900/40';
            } else if (ann.targetType === 'students') {
              targetLabel = `موجه ومخصص لـ ${ann.targetStudentIds?.length || 0} من الطلاب`;
              targetColor = 'text-pink-400 bg-pink-955/20 border-pink-500/20';
            }

            return (
              <div
                key={ann.id}
                className="p-5 bg-[#0F0F0F]/60 border border-[#262626] rounded-xl flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded border ${targetColor}`}>
                      {targetLabel}
                    </span>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="مسح من الأرشيف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-[#3B82F6]" />
                    <h4 className="text-xs font-bold text-white leading-normal">{ann.title}</h4>
                  </div>

                  <p className="text-xs text-zinc-350 leading-relaxed font-sans whitespace-pre-wrap">{ann.content}</p>
                </div>

                <div className="pt-2 border-t border-[#1F1F1F] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>تاريخ البث: {ann.date}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
