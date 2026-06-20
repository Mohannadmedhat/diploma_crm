import React, { useState } from 'react';
import { MessageTemplate } from '../types';
import { FileText, Save, Plus, Trash2, Edit2, HelpCircle, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TemplateManagerProps {
  templates: MessageTemplate[];
  onSaveTemplates: (templates: MessageTemplate[]) => void;
  isAdmin?: boolean;
}

export default function TemplateManager({ templates, onSaveTemplates, isAdmin = false }: TemplateManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editText, setEditText] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newText, setNewText] = useState('');
  const [error, setError] = useState('');

  const handleStartEdit = (tpl: MessageTemplate) => {
    setEditingId(tpl.id);
    setEditName(tpl.name);
    setEditText(tpl.text);
    setError('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editText.trim()) {
      setError('يرجى كتابة عنوان القالب ومحتوى النص.');
      return;
    }

    const updated = templates.map((t) =>
      t.id === id ? { ...t, name: editName.trim(), text: editText.trim() } : t
    );
    onSaveTemplates(updated);
    setEditingId(null);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName.trim() || !newText.trim()) {
      setError('يرجى كتابة عنوان القالب وتفاصيل الرسالة.');
      return;
    }

    const newTemplate: MessageTemplate = {
      id: `tpl-${Date.now()}`,
      name: newName.trim(),
      text: newText.trim()
    };

    onSaveTemplates([...templates, newTemplate]);
    setNewName('');
    setNewText('');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (templates.length <= 1) {
      alert('يجب الإبقاء على قالب نشط واحد على الأقل في النظام.');
      return;
    }
    if (window.confirm('هل أنت متأكد من رغبتك في حذف قالب رسائل WhatsApp هذا نهائياً؟')) {
      const filtered = templates.filter((t) => t.id !== id);
      onSaveTemplates(filtered);
    }
  };

  // Helper token buttons
  const insertToken = (token: string, isEditing: boolean) => {
    if (isEditing) {
      setEditText((prev) => prev + token);
    } else {
      setNewText((prev) => prev + token);
    }
  };

  const TokenHelpBar = ({ isEditing }: { isEditing: boolean }) => (
    <div className="bg-[#0A0A0A] p-2.5 rounded border border-[#262626] flex flex-wrap items-center gap-2 mt-1.5 justify-start">
      <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider flex items-center gap-1">
        <CornerDownLeft className="w-3.5 h-3.5 text-[#3B82F6]" />
        إدراج متغير:
      </span>
      {[
        { code: '{studentName}', label: 'اسم الطالب' },
        { code: '{parentName}', label: 'اسم ولي الأمر' },
        { code: '{course}', label: 'اسم الدبلوم' },
        { code: '{date}', label: 'تاريخ المحاضرة/الغياب' }
      ].map((btn) => (
        <button
          key={btn.code}
          type="button"
          onClick={() => insertToken(btn.code, isEditing)}
          className="text-[11px] font-mono font-medium px-2 py-1 bg-[#171717] border border-[#262626] text-[#3B82F6] hover:border-zinc-500 hover:text-white rounded transition-colors cursor-pointer"
          title={btn.label}
        >
          {btn.code}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 text-right" id="template-manager-root" dir="rtl">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">قوالب الصياغات للواتساب</h3>
          <p className="text-xs text-zinc-400">إدارة النماذج والخطابات المستخدمة للمراسلة التلقائية لغياب الطلاب والإنذارات</p>
        </div>
        {isAdmin ? (
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
              setError('');
            }}
            className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1"
            id="btn-toggle-new-template"
          >
            <Plus className="w-3.5 h-3.5" />
            إنشاء قالب جديد
          </button>
        ) : (
          <span className="px-2.5 py-1.5 bg-[#1F1F1F] text-zinc-400 border border-[#2D2D2D] rounded-lg text-[10px] font-bold select-none">
            ⚙️ عرض فقط (الأدمن)
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/25 border border-red-500/20 text-red-200 text-xs rounded flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Template Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-[#0F0F0F] border border-[#262626] rounded-lg space-y-3"
            onSubmit={handleAddNew}
            id="form-new-template"
          >
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                عنوان القالب / المناسبة
              </label>
              <input
                type="text"
                placeholder="مثال: إنذار غياب رسمي متقدم"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                نص الرسالة
              </label>
              <textarea
                placeholder="عزيزي {parentName}، نلاحظ غياب الطالب {studentName} عن دبلوم {course} بـ {date}..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-y text-right placeholder-zinc-800"
                required
              />
              <TokenHelpBar isEditing={false} />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                id="btn-save-new-template"
              >
                إضافة القالب المخصص
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded text-xs cursor-pointer transition-colors"
                id="btn-cancel-new-template"
              >
                إلغاء
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Active templates list */}
      <div className="space-y-3" id="template-items-list">
        {templates.map((tpl) => {
          const isCurrentEdit = editingId === tpl.id;
          return (
            <div
              key={tpl.id}
              className={`p-4 rounded-lg border transition-all ${
                isCurrentEdit
                  ? 'bg-[#0F0F0F] border-[#3B82F6] ring-1 ring-[#3B82F6]/20'
                  : 'bg-[#0F0F0F]/60 border-[#262626] hover:border-zinc-700'
              }`}
            >
              {isCurrentEdit ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      عنوان ومسمى القالب
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs font-semibold text-white rounded outline-hidden text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      محتوى الرسالة
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-y text-right"
                    />
                    <TokenHelpBar isEditing={true} />
                  </div>
                  <div className="flex justify-end gap-2 pt-1 border-t border-[#262626]">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(tpl.id)}
                      className="px-2.5 py-1 bg-[#3B82F6] hover:bg-blue-600 text-white text-[11px] font-semibold rounded transition-colors flex items-center gap-1"
                      id={`btn-save-edit-tpl-${tpl.id}`}
                    >
                      <Save className="w-3 h-3" />
                      تحديث القالب
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 bg-[#262626] hover:bg-[#333] text-zinc-300 text-[11px] rounded transition-colors"
                      id={`btn-cancel-edit-tpl-${tpl.id}`}
                    >
                      تراجع
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#3B82F6] shrink-0" />
                      <span className="text-xs font-semibold text-zinc-200">{tpl.name}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 bg-[#171717] rounded border border-[#262626] p-0.5">
                        <button
                          onClick={() => handleStartEdit(tpl)}
                          className="p-1 text-zinc-500 hover:text-white hover:bg-[#262626] rounded transition-colors cursor-pointer"
                          title="تعديل محتوى القالب"
                          id={`btn-trigger-edit-tpl-${tpl.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-[#262626] rounded transition-colors cursor-pointer"
                          title="حذف القالب"
                          id={`btn-trigger-delete-tpl-${tpl.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-zinc-400 text-xs font-sans leading-relaxed italic bg-[#0A0A0A] p-3 border border-[#262626] rounded select-all text-right whitespace-pre-wrap">
                    "{tpl.text}"
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
