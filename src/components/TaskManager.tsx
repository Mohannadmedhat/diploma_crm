import React, { useState } from 'react';
import { Task } from '../types';
import { ToggleLeft, Plus, Trash2, Calendar, ClipboardList, Check, X, ShieldAlert, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskManagerProps {
  tasks: Task[];
  onSaveTasks: (tasks: Task[]) => void;
}

export default function TaskManager({ tasks, onSaveTasks }: TaskManagerProps) {
  const [showForm, setShowForm] = useState(false);
  
  // Composer states
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [status, setStatus] = useState<Task['status']>('Pending');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('يرجى تحديد مسار عنوان المهمة المطلوب.');
      return;
    }

    const newTask: Task = {
      id: `tsk-${Date.now()}`,
      title: title.trim(),
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      priority,
      status,
      notes: notes.trim()
    };

    onSaveTasks([newTask, ...tasks]);
    setTitle('');
    setDueDate('');
    setPriority('Medium');
    setStatus('Pending');
    setNotes('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف مهمة فريق العمليات هذه نهائياً؟')) {
      onSaveTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const handleUpdateStatus = (id: string, newStatus: Task['status']) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    onSaveTasks(updated);
  };

  return (
    <div className="space-y-4 text-right" id="task-manager" dir="rtl">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#3B82F6]" />
            شؤون وعمليات فريق المتابعة الإدارية
          </h3>
          <p className="text-xs text-zinc-400">تنظيم وتوزيع المسؤوليات اليومية ومتابعة طلبات الأعذار الطبية وإصدار تصاريح غياب الدبلوم</p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError('');
          }}
          className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          إسناد مهمة جديدة
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-955/20 border border-red-500/20 text-red-100 text-xs rounded">
          {error}
        </div>
      )}

      {/* Task Creation Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-[#0F0F0F] border border-[#262626] rounded-xl space-y-4"
            onSubmit={handleSubmit}
            id="form-task-composer"
          >
            <div className="text-xs font-bold text-[#3B82F6] pb-1 border-b border-[#262626] uppercase">
              إضافة وإسناد مهمة إدارية جديدة
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">عنوان المهمة الإدارية</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: الاتصال بولي أمر سليمان لمراجعة الغياب المتكرر"
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right"
                  required
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">آخر موعد للتسليم (Due Date)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden text-right cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">مستوى الأولوية والاستعجال</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                >
                  <option value="Low">منخفضة عادي (Low)</option>
                  <option value="Medium">متوسطة هامة (Medium)</option>
                  <option value="High">مرتفعة عاجلة جداً (High)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">الحالة التشغيلية المبدئية</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden cursor-pointer text-right"
                >
                  <option value="Pending">قيد الانتظار والترقب (Pending)</option>
                  <option value="In Progress">جاري تنفيذها حالياً (In Progress)</option>
                  <option value="Completed">مكتملة ومغلقة (Completed)</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 font-sans">ملاحظات العمليات والتوجيهات</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="تفاصيل التنسيق ومضمون الاجتماعات أو النتائج..."
                rows={2}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-[#3B82F6] text-xs text-zinc-100 rounded outline-hidden resize-none text-right placeholder-zinc-800"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262626]">
              <button
                type="submit"
                className="px-4 py-2 bg-[#3B82F6] text-white hover:bg-blue-600 rounded text-xs font-semibold cursor-pointer"
              >
                تأكيد وبث التكليف
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError('');
                }}
                className="px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-zinc-300 rounded text-xs cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="tasks-items-grid">
        {tasks.length === 0 ? (
          <div className="md:col-span-2 p-8 text-center bg-[#0F0F0F] border border-[#262626] border-dashed rounded font-sans">
            <span className="text-zinc-500 text-xs text-center block leading-relaxed">أجندة الشؤون التنفيذية فارغة حالياً. كل التكاليف مكتملة أو لم تسجل بعد!</span>
          </div>
        ) : (
          tasks.map((task) => {
            // Priority elements
            let priorityBadge = 'text-blue-400 bg-blue-950/20 border-blue-900/40';
            let priorityLabel = 'أولوية عادية';
            if (task.priority === 'High') {
              priorityBadge = 'text-red-400 bg-red-950/40 border-red-900/40';
              priorityLabel = 'عاجل وحرج';
            } else if (task.priority === 'Medium') {
              priorityBadge = 'text-amber-400 bg-amber-950/30 border-amber-900/40';
              priorityLabel = 'أولوية هامة';
            }

            // Status control styling
            let statusBtnColor = 'border-amber-900/30 text-amber-400 bg-amber-955/20';
            let statusText = 'قيد الانتظار';
            if (task.status === 'In Progress') {
              statusBtnColor = 'border-blue-900/30 text-blue-400 bg-blue-955/20';
              statusText = 'جاري المعالجة';
            } else if (task.status === 'Completed') {
              statusBtnColor = 'border-emerald-900/20 text-emerald-400 bg-emerald-950/20';
              statusText = 'مكتملة ومغلقة';
            }

            return (
              <div
                key={task.id}
                className="bg-[#0F0F0F]/60 border border-[#262626] rounded-xl p-4 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${priorityBadge}`}>
                      {priorityLabel}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                      title="مسح من المذكرة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-normal leading-relaxed">{task.title}</h4>
                  
                  {task.notes && (
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">{task.notes}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#1a1a1a] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    تاريخ التسليم: {task.dueDate}
                  </span>

                  {/* Status selector directly interactive on card */}
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    <span className="text-[10px] text-zinc-500 font-sans">تحديث الحالة:</span>
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateStatus(task.id, e.target.value as Task['status'])}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border outline-hidden cursor-pointer ${statusBtnColor}`}
                    >
                      <option value="Pending">قيد الانتظار</option>
                      <option value="In Progress">جاري العمل</option>
                      <option value="Completed">مكتمل ومغلق</option>
                    </select>
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
