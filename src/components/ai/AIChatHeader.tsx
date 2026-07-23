import React from 'react';
import { Sparkles, Plus, History, Trash2, X } from 'lucide-react';

interface AIChatHeaderProps {
  mode: 'floating' | 'embedded';
  sessionsCount: number;
  showHistoryDrawer: boolean;
  onNewSession: () => void;
  onToggleHistory: () => void;
  onClearCurrentChat: () => void;
  onClose: () => void;
}

export const AIChatHeader: React.FC<AIChatHeaderProps> = ({
  mode,
  sessionsCount,
  showHistoryDrawer,
  onNewSession,
  onToggleHistory,
  onClearCurrentChat,
  onClose
}) => {
  return (
    <div className="p-4 bg-zinc-950/90 border-b border-zinc-900 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-indigo-400">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
            مساعد سيد الذكي
            <span className="text-[8px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded-sm border border-indigo-900/20 font-mono font-bold">Groq AI</span>
          </h3>
          <p className="text-[9px] text-zinc-500 mt-1 leading-none">أتمتة العمليات والأكاديميات الذكية</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        {/* New Chat Button */}
        <button
          onClick={onNewSession}
          className="px-2 py-1.5 rounded-md bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
          title="بدء محادثة جديدة"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">محادثة جديدة</span>
        </button>

        {/* History Drawer Toggle Button */}
        <button
          onClick={onToggleHistory}
          className={`px-2 py-1.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-medium ${
            showHistoryDrawer || sessionsCount > 0
              ? 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
          title="عرض سجل المحادثات السابقة المحفوظة"
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">السجل ({sessionsCount})</span>
        </button>

        {/* Clear current session button */}
        <button
          onClick={onClearCurrentChat}
          className="p-1.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:bg-rose-950/40 hover:border-rose-800/50 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer"
          title="مسح هذه المحادثة الحالية"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {mode === 'floating' && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="تصغير"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
