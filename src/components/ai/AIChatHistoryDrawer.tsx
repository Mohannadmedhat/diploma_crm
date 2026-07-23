import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Plus, Trash2, X, MessageSquare } from 'lucide-react';
import { ChatSession } from '../../hooks/useAIChatSessions';

interface AIChatHistoryDrawerProps {
  isOpen: boolean;
  sessionsList: ChatSession[];
  currentSessionId: string;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onClearAllSessions: () => void;
  onStartNewSession: () => void;
  onClose: () => void;
}

export const AIChatHistoryDrawer: React.FC<AIChatHistoryDrawerProps> = ({
  isOpen,
  sessionsList,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAllSessions,
  onStartNewSession,
  onClose
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-x-0 top-[65px] bottom-0 z-50 bg-[#0A0A0D]/95 backdrop-blur-md flex flex-col p-4 text-right border-t border-zinc-800"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">سجل المحادثات المحفوظة</h4>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900/50 px-2 py-0.5 rounded-full font-mono font-bold">
                {sessionsList.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sessionsList.length > 0 && (
                <button
                  onClick={onClearAllSessions}
                  className="text-[10px] text-rose-400 hover:text-rose-300 transition-all flex items-center gap-1 cursor-pointer font-medium bg-rose-950/20 border border-rose-900/30 px-2 py-1 rounded-md"
                >
                  <Trash2 className="w-3 h-3" />
                  مسح جميع المحادثات
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="py-2 shrink-0 select-none">
            <button
              onClick={onStartNewSession}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              بدء محادثة جديدة الآن
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 custom-scrollbar">
            {sessionsList.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-xs">
                لا توجد محادثات سابقة محفوظة في السجل حتى الآن.
              </div>
            ) : (
              sessionsList.map(session => {
                const isActive = session.id === currentSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                      isActive
                        ? 'bg-indigo-950/50 border-indigo-500/50 text-white shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-200'
                      }`}>
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="truncate flex-1">
                        <h5 className="text-xs font-bold truncate leading-tight">{session.title}</h5>
                        <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-2">
                          <span>{session.createdAt}</span>
                          <span>•</span>
                          <span>{session.messages.length} رسالة</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/50 transition-all opacity-80 group-hover:opacity-100 shrink-0 cursor-pointer mr-2"
                      title="حذف هذه المحادثة من السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
