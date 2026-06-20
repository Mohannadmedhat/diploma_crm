import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Users,
  BookOpen,
  GraduationCap,
  Trash2,
  RefreshCw,
  X,
  Calendar,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  Database,
  CheckCircle
} from 'lucide-react';
import { getAllUsersData, deleteUserData, registerNewUser, AdminUserRecord } from '../services/supabase';

interface AdminPanelProps {
  onClose: () => void;
  onImpersonate?: (username: string, userId: string) => void;
}

interface UserStats {
  record: AdminUserRecord;
  username: string;
  diplomasCount: number;
  studentsCount: number;
  sessionsCount: number;
  tasksCount: number;
  expanded: boolean;
}

function extractUsername(email: string): string {
  // Emails are in format "username@diploma.local"
  return email.replace('@diploma.local', '').replace('@', '');
}

export default function AdminPanel({ onClose, onImpersonate }: AdminPanelProps) {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // User creation states
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState('');
  const [addUserError, setAddUserError] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');
    
    const cleanUsername = newUsername.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setAddUserError('اسم المستخدم يجب أن يكون 3 أحلاف على الأقل.');
      return;
    }
    if (newUserPassword.length < 6) {
      setAddUserError('كلمة المرور يجب أن تكون 6 خانات على الأقل.');
      return;
    }

    setAddUserLoading(true);
    const res = await registerNewUser(cleanUsername, newUserPassword);
    if (res.success) {
      setAddUserSuccess(`تم إنشاء حساب المستخدم ${cleanUsername} بنجاح!`);
      setNewUsername('');
      setNewUserPassword('');
      setShowAddUser(false);
      loadUsers(); // Refresh the list
      // Auto-clear success message after 5 seconds
      setTimeout(() => setAddUserSuccess(''), 5000);
    } else {
      setAddUserError(res.message);
    }
    setAddUserLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    const records = await getAllUsersData();
    const stats: UserStats[] = records.map(rec => {
      const data = rec.data || {};
      // Use data.username if stored, otherwise fall back to user_id
      const displayName = data.username ? String(data.username).toUpperCase() : rec.user_id;
      return {
        record: rec,
        username: displayName,
        diplomasCount: Array.isArray(data.diplomas) ? data.diplomas.length : 0,
        studentsCount: Array.isArray(data.students) ? data.students.length : 0,
        sessionsCount: Array.isArray(data.sessions) ? data.sessions.length : 0,
        tasksCount: Array.isArray(data.tasks) ? data.tasks.length : 0,
        expanded: false
      };
    });
    setUsers(stats);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleExpand = (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.record.user_id === userId ? { ...u, expanded: !u.expanded } : u
    ));
  };

  const handleDeleteConfirm = async (userId: string) => {
    setDeletingId(userId);
    const ok = await deleteUserData(userId);
    if (ok) {
      setUsers(prev => prev.filter(u => u.record.user_id !== userId));
    }
    setDeletingId(null);
    setConfirmDeleteId(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getDiplomaNames = (data: any): string[] => {
    if (!data?.diplomas || !Array.isArray(data.diplomas)) return [];
    return data.diplomas.map((d: any) => d.name || 'دبلومة بدون اسم');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl max-h-[90vh] bg-[#0E0E0E] border border-[#1F1F1F] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F1F] bg-[#121212]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-600/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">لوحة تحكم الأدمن</h2>
              <p className="text-[10px] text-zinc-500">عرض وإدارة بيانات جميع المستخدمين</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAddUser(!showAddUser);
                setAddUserError('');
                setAddUserSuccess('');
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-md ${
                showAddUser 
                  ? 'bg-rose-600/10 border-rose-500/30 text-rose-400 hover:bg-rose-600 hover:text-white' 
                  : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{showAddUser ? 'إغلاق النموذج' : 'إضافة يوزر جديد'}</span>
            </button>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="p-2 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A]/50 shrink-0">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>إجمالي المستخدمين:</span>
              <span className="font-bold text-white">{users.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>إجمالي الدبلومات:</span>
              <span className="font-bold text-white">{users.reduce((s, u) => s + u.diplomasCount, 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>إجمالي الطلاب:</span>
              <span className="font-bold text-white">{users.reduce((s, u) => s + u.studentsCount, 0)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Add User Form */}
          <AnimatePresence>
            {showAddUser && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateUser}
                className="bg-[#121212] border border-indigo-500/25 rounded-xl p-5 mb-4 space-y-4 text-right"
              >
                <div className="text-xs font-bold text-indigo-400 border-b border-[#1F1F1F] pb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>إنشاء حساب مستخدم جديد سحابياً</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">اسم المستخدم (مثل: nariman)</label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="اسم المستخدم بالأحرف الإنجليزية"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">كلمة المرور (6 خانات على الأقل)</label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور للحساب"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] focus:border-indigo-500 text-xs text-zinc-100 rounded-lg outline-hidden text-left font-sans"
                      dir="ltr"
                    />
                  </div>
                </div>

                {addUserError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{addUserError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={addUserLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                  >
                     {addUserLoading ? 'جاري إنشاء الحساب...' : 'تأكيد إنشاء الحساب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 bg-[#262626] hover:bg-[#333] text-zinc-300 rounded-lg text-xs cursor-pointer transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {addUserSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{addUserSuccess}</span>
            </div>
          )}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm">جاري تحميل بيانات المستخدمين...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
              <Database className="w-10 h-10 text-zinc-700" />
              <span className="text-sm">لا توجد بيانات مستخدمين محفوظة في Supabase بعد</span>
            </div>
          ) : (
            users.map((user, idx) => (
              <motion.div
                key={user.record.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#121212] border border-[#1F1F1F] rounded-xl overflow-hidden"
              >
                {/* User Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-md">
                    {String(idx + 1).padStart(2, '0')}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-right">
                    <div className="flex items-center gap-2 justify-start">
                      <span className="text-sm font-black text-indigo-400 capitalize">
                        {user.username}
                      </span>
                    </div>
                    {user.username !== user.record.user_id && (
                      <div className="text-[9px] text-zinc-600 font-mono mt-0.5" dir="ltr">
                        ID: {user.record.user_id}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.record.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Stats Pills */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold">
                      {user.diplomasCount} دبلومة
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                      {user.studentsCount} طالب
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[10px] font-bold">
                      {user.sessionsCount} محاضرة
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleExpand(user.record.user_id)}
                      className="p-1.5 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-zinc-500 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="عرض التفاصيل"
                    >
                      {user.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {confirmDeleteId === user.record.user_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteConfirm(user.record.user_id)}
                          disabled={deletingId === user.record.user_id}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                        >
                          {deletingId === user.record.user_id ? '...' : 'تأكيد المسح'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#2A2A2A] text-zinc-400 text-[10px] cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(user.record.user_id)}
                        className="p-1.5 rounded-lg bg-[#1C1C1C] border border-[#262626] hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
                        title="مسح بيانات المستخدم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {user.expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-[#1A1A1A] pt-3 space-y-3">
                        
                        {/* Diplomas List */}
                        <div>
                          <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3" />
                            الدبلومات ({user.diplomasCount})
                          </h4>
                          {getDiplomaNames(user.record.data).length > 0 ? (
                            <div className="space-y-1">
                              {getDiplomaNames(user.record.data).map((name, i) => (
                                <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-300 bg-[#0A0A0A] rounded px-2.5 py-1.5">
                                  <span className="w-4 h-4 rounded bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                                  {name}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic">لا توجد دبلومات</p>
                          )}
                        </div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-[#0A0A0A] rounded-lg p-2.5 text-center">
                            <div className="text-base font-black text-emerald-400">{user.studentsCount}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">طالب</div>
                          </div>
                          <div className="bg-[#0A0A0A] rounded-lg p-2.5 text-center">
                            <div className="text-base font-black text-blue-400">{user.sessionsCount}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">محاضرة</div>
                          </div>
                          <div className="bg-[#0A0A0A] rounded-lg p-2.5 text-center">
                            <div className="text-base font-black text-amber-400">{user.tasksCount}</div>
                            <div className="text-[9px] text-zinc-500 mt-0.5">مهمة</div>
                          </div>
                        </div>
                        {/* Workspace Impersonation Button */}
                        {onImpersonate && (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                onImpersonate(user.username, user.record.user_id);
                                onClose();
                              }}
                              className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/20 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                            >
                              <Users className="w-4 h-4 text-white" />
                              <span>دخول مساحة عمل {user.username} والتعديل عليها</span>
                            </button>
                          </div>
                        )}

                        {/* Warning before delete */}
                        {confirmDeleteId === user.record.user_id && (
                          <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-[10px] text-rose-300">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                            <span>تحذير: سيتم مسح جميع بيانات هذا المستخدم نهائياً (الدبلومات، الطلاب، المحاضرات، المهام). لا يمكن التعافي من هذا الإجراء.</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1A1A1A] bg-[#0A0A0A]/50 shrink-0">
          <p className="text-[10px] text-zinc-600 text-center">
            لوحة الأدمن متاحة لك أنت فقط · البيانات المشتركة (المحاضرون، المنتورون، أنواع الدبلومات) لا تظهر هنا
          </p>
        </div>
      </motion.div>
    </div>
  );
}
