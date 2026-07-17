import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface QuickNote {
  id: string;
  text: string;
  createdAt: string;
  diplomaId: string | null;
  diplomaName: string;
  color: 'yellow' | 'blue' | 'rose' | 'emerald';
}

const NOTE_COLORS = {
  yellow: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/40',
    text: 'text-amber-200',
    dot: 'bg-amber-400',
  },
  blue: {
    bg: 'bg-indigo-950/30',
    border: 'border-indigo-800/40',
    text: 'text-indigo-200',
    dot: 'bg-indigo-400',
  },
  rose: {
    bg: 'bg-rose-950/20',
    border: 'border-rose-800/30',
    text: 'text-rose-200',
    dot: 'bg-rose-400',
  },
  emerald: {
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-800/30',
    text: 'text-emerald-200',
    dot: 'bg-emerald-400',
  },
} as const;

const STORAGE_KEY = 'diploma_quick_notes_v1';

function loadNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

interface QuickNotesProps {
  currentDiplomaId?: string;
  currentDiplomaName?: string;
}

export default function QuickNotes({ currentDiplomaId, currentDiplomaName }: QuickNotesProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<QuickNote[]>(loadNotes);
  const [text, setText] = useState('');
  const [color, setColor] = useState<QuickNote['color']>('yellow');
  const [filterDiploma, setFilterDiploma] = useState<'all' | 'current'>('all');
  const [collapsed, setCollapsed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !collapsed) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [open, collapsed]);

  const addNote = () => {
    if (!text.trim()) return;
    const newNote: QuickNote = {
      id: `note-${Date.now()}`,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      diplomaId: currentDiplomaId || null,
      diplomaName: currentDiplomaName || 'عام',
      color,
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotes(updated);
    setText('');
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    saveNotes(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addNote();
    }
  };

  const filteredNotes = filterDiploma === 'current' && currentDiplomaId
    ? notes.filter(n => n.diplomaId === currentDiplomaId)
    : notes;

  function formatRelative(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
    return new Date(iso).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none print:hidden flex flex-col items-end gap-2" dir="rtl">
      <AnimatePresence>
        {open && (
          <motion.div
            key="notes-panel"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-80 bg-[#0f0f14] border border-zinc-800/70 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white">ملاحظاتي السريعة</span>
                {notes.length > 0 && (
                  <span className="text-[9px] bg-zinc-800 text-zinc-400 rounded-full px-1.5 py-0.5 font-bold">
                    {notes.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCollapsed(p => !p)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Input area */}
                  <div className="p-3 space-y-2 border-b border-zinc-800/40">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={currentDiplomaName ? `ملاحظة على: ${currentDiplomaName}` : 'اكتب ملاحظة سريعة...'}
                      rows={3}
                      className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 resize-none outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all font-sans text-right"
                      dir="rtl"
                    />
                    <div className="flex items-center justify-between">
                      {/* Color picker */}
                      <div className="flex items-center gap-1.5">
                        {(Object.keys(NOTE_COLORS) as QuickNote['color'][]).map(c => (
                          <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-4 h-4 rounded-full transition-all cursor-pointer ${NOTE_COLORS[c].dot} ${
                              color === c ? 'ring-2 ring-white/60 scale-125' : 'opacity-40 hover:opacity-80'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-zinc-600 font-sans">Ctrl+Enter</span>
                        <button
                          onClick={addNote}
                          disabled={!text.trim()}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black disabled:cursor-not-allowed rounded-lg text-[10px] font-black transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          حفظ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  {currentDiplomaId && notes.length > 0 && (
                    <div className="flex border-b border-zinc-800/40">
                      {([
                        { key: 'all', label: 'كل الملاحظات' },
                        { key: 'current', label: currentDiplomaName || 'الدبلومة الحالية' }
                      ] as { key: 'all' | 'current'; label: string }[]).map(f => (
                        <button
                          key={f.key}
                          onClick={() => setFilterDiploma(f.key)}
                          className={`flex-1 py-1.5 text-[10px] font-bold transition-colors cursor-pointer truncate px-2 ${
                            filterDiploma === f.key
                              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-950/10'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Notes list */}
                  <div className="max-h-64 overflow-y-auto p-3 space-y-2">
                    {filteredNotes.length === 0 ? (
                      <div className="py-6 text-center text-zinc-600 text-[11px] font-sans">
                        لا توجد ملاحظات بعد 📝
                      </div>
                    ) : (
                      filteredNotes.map(note => {
                        const c = NOTE_COLORS[note.color];
                        return (
                          <div
                            key={note.id}
                            className={`p-3 rounded-xl border ${c.bg} ${c.border} group relative`}
                          >
                            <p className={`text-xs leading-relaxed ${c.text} font-sans text-right whitespace-pre-wrap`}>
                              {note.text}
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/30">
                              <span className="text-[9px] text-zinc-600 font-sans">
                                {note.diplomaName !== 'عام' && (
                                  <span className="text-zinc-500">📚 {note.diplomaName} · </span>
                                )}
                                {formatRelative(note.createdAt)}
                              </span>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-900/30 rounded text-zinc-600 hover:text-rose-400 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all cursor-pointer border font-bold ${
          open
            ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20'
            : 'bg-[#141414] border-zinc-700/50 text-zinc-300 hover:text-white hover:border-amber-500/50 hover:bg-zinc-900 shadow-black/30'
        }`}
      >
        <StickyNote className="w-4 h-4 shrink-0" />
        <span className="text-xs font-bold">ملاحظات</span>
        {!open && notes.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center shadow">
            {notes.length > 9 ? '9+' : notes.length}
          </span>
        )}
      </button>
    </div>
  );
}

