import React, { useState } from 'react';
import { isCloudConfigured, signInCloud } from '../services/supabase';
import { Lock, User, LogIn, GraduationCap, AlertCircle, Cloud, Database, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: (username: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const userClean = username.trim().toLowerCase();

    try {
      if (isCloudConfigured) {
        const res = await signInCloud(userClean, password);
        if (res.success) {
          onLoginSuccess(userClean);
        } else {
          setError(res.message);
        }
      } else {
        // Local dev mode: allow admin/admin
        if (userClean === 'admin' && password === 'admin') {
          onLoginSuccess(userClean);
        } else {
          setError('في وضع العمل المحلي، استخدم: admin / admin');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء معالجة الطلب');
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#070707] font-sans selection:bg-[#3B82F6]/30 selection:text-white" dir="rtl">
      
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-50 pointer-events-none"
      >
        <source src="/login-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 bg-black/50 z-0"></div>
      
      {/* Animated Glowing Ambient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl animate-pulse duration-[8000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-600/10 blur-3xl animate-pulse duration-[6000ms]"></div>

      {/* Decorative Interactive Background Shapes */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-500/15 to-cyan-500/15 rounded-full blur-2xl"></div>

      {/* Outer Card Glassmorphic container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-[#121212]/60 backdrop-blur-xl border border-[#262626]/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60"
      >
        
        {/* Connection status badge */}
        <div className="flex justify-center mb-4">
          {isCloudConfigured ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 select-none">
              <Cloud className="w-3.5 h-3.5" />
              <span>الربط السحابي مفعّل (متصل بـ Supabase)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 select-none">
              <Database className="w-3.5 h-3.5" />
              <span>وضع العمل المحلي (سيتم الحفظ بالمتصفح فقط)</span>
            </div>
          )}
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-3">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            منصة دبلومات الشؤون التعليمية
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-xs">
            لوحة تسجيل الدخول وإدارة الأنشطة والطلاب
          </p>
        </div>

        {/* Notification Boxes */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-xs font-semibold mb-4 text-right leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field */}
          <div className="space-y-1 text-right">
            <label className="text-xs font-bold text-zinc-300">اسم المستخدم</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-zinc-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full text-right pr-9 pl-3 py-2.5 bg-[#171717]/80 hover:bg-[#1C1C1C]/90 focus:bg-[#1E1E1E] text-white border border-[#262626] focus:border-indigo-500 rounded-xl outline-hidden text-xs transition-all focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1 text-right">
            <label className="text-xs font-bold text-zinc-300">كلمة المرور</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full text-right pr-9 pl-9 py-2.5 bg-[#171717]/80 hover:bg-[#1C1C1C]/90 focus:bg-[#1E1E1E] text-white border border-[#262626] focus:border-indigo-500 rounded-xl outline-hidden text-xs transition-all focus:ring-1 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-3 flex items-center text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-4 bg-gradient-to-r from-indigo-600 to-[#3B82F6] hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول للمنصة</span>
              </>
            )}
          </button>
        </form>

        {/* Local Mode Info */}
        {!isCloudConfigured && (
          <div className="mt-5 text-center text-[10px] text-zinc-500 leading-relaxed font-mono select-none">
            💡 الحساب الافتراضي الأول للمدير محلياً: <span className="text-[#3B82F6] font-bold">admin / admin</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
