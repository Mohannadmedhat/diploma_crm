import React, { useMemo, useState } from 'react';
import {
  Student,
  Session,
  Diploma,
  AppConfig,
  SmartNotificationLog,
  SmartScenarioType
} from '../types';
import { calculateStudentDiplomaAttendance } from '../services/business';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  Users,
  Zap
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

export interface SmartScenario {
  id: SmartScenarioType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  accentColor: string;
  getStudents: (
    diplomaId: string,
    students: Student[],
    sessions: Session[],
    diplomas: Diploma[],
    config: AppConfig | null
  ) => Student[];
  defaultTemplate: (diploma: Diploma | undefined, session: Session | undefined) => string;
}

interface SmartNotificationsProps {
  students: Student[];
  sessions: Session[];
  diplomas: Diploma[];
  config: AppConfig | null;
  onSaveConfig: (cfg: AppConfig) => void;
  onSendQueue: (
    queueStudents: Student[],
    template: string,
    diploma: Diploma
  ) => void;
}

// =====================================================
// HELPERS
// =====================================================

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0)  return `\u0645\u0646\u0630 ${days} ${days === 1 ? '\u064a\u0648\u0645' : '\u0623\u064a\u0627\u0645'}`;
  if (hrs  > 0)  return `\u0645\u0646\u0630 ${hrs} ${hrs  === 1 ? '\u0633\u0627\u0639\u0629' : '\u0633\u0627\u0639\u0627\u062a'}`;
  if (mins > 0)  return `\u0645\u0646\u0630 ${mins} \u062f\u0642\u064a\u0642\u0629`;
  return '\u0627\u0644\u0622\u0646';
}

// =====================================================
// SCENARIO DEFINITIONS
// =====================================================

const SCENARIOS: SmartScenario[] = [
  {
    id: 'absence_last_session',
    label: '\u063a\u0627\u0626\u0628\u0648 \u0622\u062e\u0631 \u062c\u0644\u0633\u0629',
    description: '\u0623\u0631\u0633\u0644 \u0631\u0633\u0627\u0644\u0629 \u0644\u0643\u0644 \u0637\u0627\u0644\u0628 \u063a\u0627\u0628 \u0641\u064a \u0622\u062e\u0631 \u062c\u0644\u0633\u0629 \u0645\u0633\u062c\u0651\u0644\u0629',
    icon: <AlertTriangle size={22} />,
    color: 'scenario-red',
    accentColor: '#ef4444',
    getStudents: (diplomaId, students, sessions) => {
      const diplomaSessions = sessions
        .filter(s => s.diplomaId === diplomaId && s.sessionStatus !== 'Cancelled')
        .sort((a, b) => b.date.localeCompare(a.date));
      const last = diplomaSessions[0];
      if (!last) return [];
      return students.filter(st => {
        const rec = last.attendance?.[st.id];
        return rec && rec.status === 'Absent';
      });
    },
    defaultTemplate: (diploma, session) =>
      `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 {studentName} \ud83d\udc4b\n\u0627\u0641\u062a\u0642\u062f\u0646\u0627 \u062d\u0636\u0648\u0631\u0643 \u0641\u064a \u062c\u0644\u0633\u0629 \u062f\u0628\u0644\u0648\u0645 ${diploma?.name || '{course}'} \u0628\u062a\u0627\u0631\u064a\u062e ${session?.date || '{date}'}.\n\u0646\u0623\u0645\u0644 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0627\u0646\u0639 \u062e\u064a\u0631\u0627\u064b! \u064a\u0631\u062c\u0649 \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0641\u0648\u0631 \u0631\u0641\u0639\u0647 \u0639\u0644\u0649 \u0627\u0644\u0645\u0646\u0635\u0629 \u0644\u062a\u0639\u0648\u064a\u0636 \u0645\u0627 \u0641\u0627\u062a\u0643 \ud83d\udcda\n\u0646\u0631\u0627\u0643 \u0641\u064a \u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629 \u2014 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c.`
  },
  {
    id: 'repeated_absence',
    label: '\u062a\u062d\u0630\u064a\u0631 \u0627\u0644\u063a\u064a\u0627\u0628 \u0627\u0644\u0645\u062a\u0643\u0631\u0631',
    description: '\u0637\u0644\u0627\u0628 \u062a\u062c\u0627\u0648\u0632\u0648\u0627 \u0639\u062f\u062f \u0627\u0644\u063a\u064a\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u0645\u0648\u062d \u0628\u0647 \u0641\u064a \u0627\u0644\u062f\u0628\u0644\u0648\u0645\u0629',
    icon: <AlertTriangle size={22} />,
    color: 'scenario-orange',
    accentColor: '#f97316',
    getStudents: (diplomaId, students, sessions, diplomas, config) => {
      const diploma = diplomas.find(d => d.id === diplomaId);
      if (!diploma) return [];
      const minRate = config?.minAttendanceRate || 75;
      return students.filter(st => {
        if (!st.diplomaIds.includes(diplomaId)) return false;
        const stats = calculateStudentDiplomaAttendance(st, diploma, sessions, minRate);
        return stats.absentCount > (diploma.allowedAbsences ?? 3);
      });
    },
    defaultTemplate: (diploma) =>
      `\u062a\u0646\u0628\u064a\u0647 \u0623\u0643\u0627\u062f\u064a\u0645\u064a \u2014 \u0639\u0632\u064a\u0632\u064a {studentName} \ud83d\udccb\n\u0646\u0648\u062f \u0625\u0639\u0644\u0627\u0645\u0643 \u0628\u0623\u0646 \u0646\u0633\u0628\u0629 \u063a\u064a\u0627\u0628\u0643 \u0641\u064a \u062f\u0628\u0644\u0648\u0645 ${diploma?.name || '{course}'} \u0642\u062f \u062a\u062c\u0627\u0648\u0632\u062a \u0627\u0644\u062d\u062f \u0627\u0644\u0645\u0633\u0645\u0648\u062d \u0628\u0647.\n\u064a\u064f\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0639\u0627\u062c\u0644\u0627\u064b \u0644\u062a\u0633\u0648\u064a\u0629 \u0648\u0636\u0639\u0643 \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a \u0648\u062a\u0641\u0627\u062f\u064a \u0623\u064a \u0625\u062c\u0631\u0627\u0621\u0627\u062a.\n\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0634\u0624\u0648\u0646 \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629.`
  },
  {
    id: 'session_reminder',
    label: '\u062a\u0630\u0643\u064a\u0631 \u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629',
    description: '\u0623\u0631\u0633\u0644 \u062a\u0630\u0643\u064a\u0631\u0627\u064b \u0644\u062c\u0645\u064a\u0639 \u0637\u0644\u0627\u0628 \u0627\u0644\u062f\u0628\u0644\u0648\u0645\u0629 \u0628\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629',
    icon: <Calendar size={22} />,
    color: 'scenario-blue',
    accentColor: '#3b82f6',
    getStudents: (diplomaId, students) =>
      students.filter(st => st.diplomaIds.includes(diplomaId)),
    defaultTemplate: (diploma, session) => {
      const dateStr = session?.date || '{التاريخ}';
      const timeStr = session?.startTime || diploma?.sessionTime || '{الوقت}';
      return `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 {studentName} \ud83d\udc4b\n\u0646\u0630\u0643\u0651\u0631\u0643\u0645 \u0628\u0645\u0648\u0639\u062f \u062c\u0644\u0633\u0629 \u062f\u0628\u0644\u0648\u0645 ${diploma?.name || '{course}'} \u0627\u0644\u0642\u0627\u062f\u0645\u0629:\n\ud83d\udcc5 \u0627\u0644\u062a\u0627\u0631\u064a\u062e: ${dateStr}\n\u23f0 \u0627\u0644\u0648\u0642\u062a: ${timeStr}\n\u062d\u0636\u0648\u0631\u0643\u0645 \u064a\u064f\u0633\u0639\u062f\u0646\u0627 \u2014 \u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062c.`;
    }
  },
  {
    id: 'custom',
    label: '\u0631\u0633\u0627\u0644\u0629 \u0645\u062e\u0635\u0635\u0629 \u0633\u0631\u064a\u0639\u0629',
    description: '\u0627\u0643\u062a\u0628 \u0631\u0633\u0627\u0644\u062a\u0643 \u0648\u0627\u062e\u062a\u0631 \u0627\u0644\u0645\u0633\u062a\u0644\u0645\u064a\u0646 \u0645\u0646 \u0637\u0644\u0627\u0628 \u0627\u0644\u062f\u0628\u0644\u0648\u0645\u0629',
    icon: <MessageSquare size={22} />,
    color: 'scenario-purple',
    accentColor: '#8b5cf6',
    getStudents: (diplomaId, students) =>
      students.filter(st => st.diplomaIds.includes(diplomaId)),
    defaultTemplate: (diploma) =>
      `\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 {studentName}\u060c\n\u0628\u062e\u0635\u0648\u0635 \u062f\u0628\u0644\u0648\u0645 ${diploma?.name || '{course}'} \u0646\u0648\u062f \u0625\u0639\u0644\u0627\u0645\u0643\u0645 \u0628\u0623\u0646...`
  }
];

// color maps
const colorMap: Record<string, { bg: string; border: string; icon: string; btn: string }> = {
  'scenario-red':    { bg: 'rgba(239,68,68,0.08)',   border: '#ef4444', icon: '#ef4444', btn: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  'scenario-orange': { bg: 'rgba(249,115,22,0.08)',  border: '#f97316', icon: '#f97316', btn: 'linear-gradient(135deg,#f97316,#ea580c)' },
  'scenario-blue':   { bg: 'rgba(59,130,246,0.08)',  border: '#3b82f6', icon: '#3b82f6', btn: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
  'scenario-purple': { bg: 'rgba(139,92,246,0.08)',  border: '#8b5cf6', icon: '#8b5cf6', btn: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }
};

// =====================================================
// SCENARIO CARD
// =====================================================

function ScenarioCard({
  scenario,
  diploma,
  students,
  sessions,
  diplomas,
  config,
  logs,
  onSend
}: {
  key?: React.Key;
  scenario: SmartScenario;
  diploma: Diploma;
  students: Student[];
  sessions: Session[];
  diplomas: Diploma[];
  config: AppConfig | null;
  logs: SmartNotificationLog[];
  onSend: (students: Student[], template: string) => void;
}) {
  const lastSession = useMemo(() =>
    sessions
      .filter(s => s.diplomaId === diploma.id && s.sessionStatus !== 'Cancelled')
      .sort((a, b) => b.date.localeCompare(a.date))[0],
    [sessions, diploma.id]
  );

  const nextSession = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sessions
      .filter(s => s.diplomaId === diploma.id && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [sessions, diploma.id]);

  const targetSession = scenario.id === 'session_reminder' ? nextSession : lastSession;

  const targetStudents = useMemo(
    () => scenario.getStudents(diploma.id, students, sessions, diplomas, config),
    [diploma.id, students.length, sessions.length]
  );

  const lastLog = useMemo(
    () => logs
      .filter(l => l.diplomaId === diploma.id && l.scenarioType === scenario.id)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0],
    [logs, diploma.id, scenario.id]
  );

  const [template, setTemplate] = useState(() =>
    scenario.defaultTemplate(diploma, targetSession)
  );
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    targetStudents.forEach(s => { init[s.id] = true; });
    return init;
  });

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    targetStudents.forEach(s => { init[s.id] = true; });
    setSelected(init);
  }, [targetStudents.length, diploma.id]);

  React.useEffect(() => {
    setTemplate(scenario.defaultTemplate(diploma, targetSession));
  }, [diploma.id, targetSession?.id]);

  const chosen = targetStudents.filter(s => selected[s.id]);
  const isEmpty = targetStudents.length === 0;
  const c = colorMap[scenario.color];

  // Filter students based on search input
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return targetStudents;
    const q = searchQuery.toLowerCase();
    return targetStudents.filter(s =>
      s.name.toLowerCase().includes(q) || s.phone.includes(q)
    );
  }, [targetStudents, searchQuery]);

  // Insert tag helper
  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setTemplate(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Generate live preview text for the first chosen student
  const previewText = useMemo(() => {
    const sampleStudent = chosen[0] || targetStudents[0];
    if (!sampleStudent) return '';
    return template.replace(/\{studentName\}/g, sampleStudent.name);
  }, [template, chosen, targetStudents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isEmpty ? 'rgba(255,255,255,0.02)' : `linear-gradient(145deg, #16213e, #0f172a)`,
        border: `1.5px solid ${isEmpty ? 'rgba(255,255,255,0.05)' : c.border + '55'}`,
        borderRadius: 20,
        overflow: 'hidden',
        opacity: isEmpty ? 0.45 : 1,
        transition: 'all 0.2s'
      }}
    >
      {/* Colored top accent bar */}
      {!isEmpty && (
        <div style={{ height: 3, background: c.btn, borderRadius: '20px 20px 0 0' }} />
      )}

      <div style={{ padding: '1.125rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {/* Icon box */}
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: c.bg,
            border: `1px solid ${c.border}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: c.icon, flexShrink: 0,
            boxShadow: `0 0 16px ${c.border}25`
          }}>
            {scenario.icon}
          </div>

          {/* Title + desc */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>
                {scenario.label}
              </span>
              {!isEmpty && (
                <span style={{
                  background: c.bg, color: c.icon,
                  border: `1px solid ${c.border}40`,
                  borderRadius: 20, padding: '2px 10px',
                  fontSize: '0.75rem', fontWeight: 700
                }}>
                  {targetStudents.length} طالب
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {scenario.description}
            </p>
          </div>

          {/* Last sent badge */}
          {lastLog && (
            <div style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 10, padding: '4px 10px',
              fontSize: '0.72rem', color: '#22c55e',
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0
            }}>
              <CheckCircle size={11} />
              {timeAgo(lastLog.sentAt)}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        {!isEmpty && (
          <>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: expanded ? c.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${expanded ? c.border + '40' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10, cursor: 'pointer',
                color: expanded ? c.icon : '#64748b',
                fontSize: '0.78rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '0.45rem 0.875rem', alignSelf: 'flex-start',
                transition: 'all 0.15s'
              }}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'إخفاء التفاصيل والتخصيص' : 'تخصيص الرسالة والمستلمين'}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  key="details"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14, padding: '1.25rem 1rem 1rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem'
                  }}>
                    {/* Template editor */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={{
                          fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <MessageSquare size={13} style={{ color: c.icon }} />
                          نص الرسالة
                        </label>
                        {/* Quick variables helper */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => insertTag('{studentName}')}
                            style={{
                              fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.1)',
                              border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer'
                            }}
                          >
                            + اسم الطالب
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={template}
                        onChange={e => setTemplate(e.target.value)}
                        rows={4}
                        style={{
                          width: '100%', resize: 'none', borderRadius: 12,
                          background: 'rgba(0,0,0,0.3)',
                          border: `1px solid rgba(255,255,255,0.08)`,
                          color: '#e2e8f0',
                          padding: '0.75rem 1rem', fontSize: '0.84rem',
                          direction: 'rtl', fontFamily: 'inherit', lineHeight: 1.7,
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Live Preview Box */}
                    {previewText && (
                      <div style={{
                        background: 'rgba(34,197,94,0.03)',
                        border: '1.5px dashed rgba(34,197,94,0.15)',
                        borderRadius: 12, padding: '0.75rem 1rem'
                      }}>
                        <div style={{
                          fontSize: '0.72rem', color: '#22c55e', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4
                        }}>
                          <Sparkles size={11} />
                          معاينة حية للرسالة (لأول مستلم):
                        </div>
                        <p style={{
                          margin: 0, fontSize: '0.8rem', color: '#94a3b8',
                          whiteSpace: 'pre-wrap', lineHeight: 1.6, direction: 'rtl'
                        }}>
                          {previewText}
                        </p>
                      </div>
                    )}

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

                    {/* Student checklist */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                        <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Users size={12} style={{ color: c.icon }} />
                          المستلمون المحددون
                          <span style={{
                            background: c.bg, color: c.icon,
                            borderRadius: 20, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700
                          }}>
                            {chosen.length}/{targetStudents.length}
                          </span>
                        </label>

                        {/* Search bar inside student list */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                          <input
                            type="text"
                            placeholder="بحث في القائمة..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                              background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', color: '#fff',
                              outline: 'none', width: '100%', maxWidth: 140, direction: 'rtl'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => { const a: Record<string,boolean> = {}; targetStudents.forEach(s => { a[s.id]=true; }); setSelected(a); }}
                            style={{
                              fontSize: '0.7rem', color: c.icon, background: c.bg,
                              border: `1px solid ${c.border}30`, borderRadius: 6,
                              padding: '2.5px 8px', cursor: 'pointer', fontWeight: 600
                            }}
                          >الكل</button>
                          <button
                            type="button"
                            onClick={() => setSelected({})}
                            style={{
                              fontSize: '0.7rem', color: '#64748b',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 6, padding: '2.5px 8px', cursor: 'pointer'
                            }}
                          >إلغاء</button>
                        </div>
                      </div>

                      {/* Filtered list with custom slim scrollbar */}
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: 4,
                        maxHeight: 180, overflowY: 'auto', paddingRight: 4
                      }} className="custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map(st => {
                            const initials = st.name.slice(0, 1);
                            const isChosen = !!selected[st.id];
                            return (
                              <label key={st.id} style={{
                                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                                padding: '6px 10px', borderRadius: 10,
                                background: isChosen ? c.bg : 'rgba(255,255,255,0.01)',
                                border: `1px solid ${isChosen ? c.border + '30' : 'rgba(255,255,255,0.04)'}`,
                                transition: 'all 0.15s'
                              }}>
                                {/* Avatar */}
                                <div style={{
                                  width: 28, height: 28, borderRadius: 8,
                                  background: isChosen ? c.btn : 'rgba(255,255,255,0.08)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '0.75rem', fontWeight: 700,
                                  color: isChosen ? '#fff' : '#64748b', flexShrink: 0,
                                  transition: 'all 0.15s'
                                }}>
                                  {initials}
                                </div>
                                <span style={{ fontSize: '0.83rem', color: '#e2e8f0', flex: 1 }}>{st.name}</span>
                                <span style={{ fontSize: '0.72rem', color: '#475569', direction: 'ltr' }}>{st.phone}</span>
                                <input
                                  type="checkbox" checked={isChosen}
                                  onChange={e => setSelected(p => ({ ...p, [st.id]: e.target.checked }))}
                                  style={{ accentColor: c.icon, width: 14, height: 14, flexShrink: 0 }}
                                />
                              </label>
                            );
                          })
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1rem', color: '#475569', fontSize: '0.75rem' }}>
                            لا توجد نتائج مطابقة للبحث
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Send button */}
        {!isEmpty ? (
          <motion.button
            whileHover={{ scale: 1.015, boxShadow: `0 8px 24px ${c.border}40` }}
            whileTap={{ scale: 0.97 }}
            disabled={chosen.length === 0}
            onClick={() => onSend(chosen, template)}
            style={{
              padding: '0.75rem', borderRadius: 14, border: 'none',
              background: chosen.length === 0 ? 'rgba(255,255,255,0.04)' : c.btn,
              color: chosen.length === 0 ? '#475569' : '#fff',
              fontWeight: 700, fontSize: '0.9rem',
              cursor: chosen.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              letterSpacing: '0.01em',
              boxShadow: chosen.length > 0 ? `0 4px 16px ${c.border}30` : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Send size={16} />
            إرسال الآن — {chosen.length} طالب
          </motion.button>
        ) : (
          <div style={{
            textAlign: 'center', padding: '0.5rem',
            fontSize: '0.8rem', color: '#475569',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
          }}>
            <CheckCircle size={14} style={{ color: '#22c55e' }} />
            لا يوجد طلاب مستهدفون حالياً
          </div>
        )}
      </div>
    </motion.div>
  );

}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function SmartNotifications({
  students,
  sessions,
  diplomas,
  config,
  onSaveConfig,
  onSendQueue
}: SmartNotificationsProps) {
  const activeDiplomas = diplomas.filter(d => d.status === 'Active' || d.status === 'Upcoming');

  const [selectedDiplomaId, setSelectedDiplomaId] = useState(
    activeDiplomas[0]?.id || diplomas[0]?.id || ''
  );

  const selectedDiploma = diplomas.find(d => d.id === selectedDiplomaId);
  const logs: SmartNotificationLog[] = config?.smartNotificationLogs || [];

  const totalSentToday = useMemo(() => {
    const todayPrefix = new Date().toISOString().slice(0, 10);
    return logs
      .filter(l => l.sentAt.startsWith(todayPrefix) && l.diplomaId === selectedDiplomaId)
      .reduce((sum, l) => sum + l.totalSent, 0);
  }, [logs, selectedDiplomaId]);

  const handleSend = (scenario: SmartScenario, chosenStudents: Student[], template: string) => {
    if (!selectedDiploma || chosenStudents.length === 0) return;

    const newLog: SmartNotificationLog = {
      id: `snl_${Date.now()}`,
      diplomaId: selectedDiploma.id,
      diplomaName: selectedDiploma.name,
      scenarioType: scenario.id,
      studentIds: chosenStudents.map(s => s.id),
      sentAt: new Date().toISOString(),
      totalSent: chosenStudents.length,
      totalSkipped: 0,
      messagePreview: template.slice(0, 100)
    };

    onSaveConfig({
      ...(config || { minAttendanceRate: 75, language: 'ar' as const }),
      smartNotificationLogs: [...logs, newLog]
    });

    onSendQueue(chosenStudents, template, selectedDiploma);
  };

  if (diplomas.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted, #94a3b8)' }}>
        <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p>لا توجد دبلومات مضافة بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

      {/* Header banner */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(139,92,246,0.12),rgba(59,130,246,0.08))',
        border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 16, padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.875rem'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0
        }}>
          <Zap size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.97rem', color: 'var(--text-primary, #f1f5f9)' }}>
            إشعارات ذكية — بكليك واحد
          </div>
          <div style={{ fontSize: '0.79rem', color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
            سيناريوهات جاهزة للإرسال الفوري بدون تهيئة يدوية
          </div>
        </div>
        {totalSentToday > 0 && (
          <div style={{
            marginRight: 'auto',
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 20, padding: '4px 12px',
            fontSize: '0.77rem', color: '#22c55e',
            display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600
          }}>
            <CheckCircle size={12} />
            أُرسل اليوم: {totalSentToday}
          </div>
        )}
      </div>

      {/* Diploma pills */}
      {activeDiplomas.length > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeDiplomas.map(d => (
            <button key={d.id} onClick={() => setSelectedDiplomaId(d.id)} style={{
              padding: '0.38rem 0.875rem', borderRadius: 20, border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: '0.81rem',
              background: d.id === selectedDiplomaId
                ? 'linear-gradient(135deg,#8b5cf6,#3b82f6)'
                : 'rgba(255,255,255,0.06)',
              color: d.id === selectedDiplomaId ? '#fff' : 'var(--text-muted, #94a3b8)',
              transition: 'all 0.15s'
            }}>
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Quick stats */}
      {selectedDiploma && (
        <div style={{
          display: 'flex', gap: '1rem', flexWrap: 'wrap',
          padding: '0.7rem 1rem',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12
        }}>
          {[
            { icon: <Users size={13} />, label: 'الطلاب', value: students.filter(s => s.diplomaIds.includes(selectedDiplomaId)).length },
            { icon: <Calendar size={13} />, label: 'الجلسات', value: sessions.filter(s => s.diplomaId === selectedDiplomaId).length },
            {
              icon: <Clock size={13} />, label: 'آخر إرسال ذكي',
              value: (() => {
                const last = logs.filter(l => l.diplomaId === selectedDiplomaId).sort((a,b)=>b.sentAt.localeCompare(a.sentAt))[0];
                return last ? timeAgo(last.sentAt) : 'لا يوجد';
              })()
            }
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.81rem' }}>
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{stat.icon}</span>
              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>{stat.label}:</span>
              <span style={{ color: 'var(--text-primary, #f1f5f9)', fontWeight: 600 }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scenario cards */}
      {selectedDiploma ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {SCENARIOS.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              diploma={selectedDiploma}
              students={students}
              sessions={sessions}
              diplomas={diplomas}
              config={config}
              logs={logs}
              onSend={(studs, tpl) => handleSend(scenario, studs, tpl)}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted, #94a3b8)' }}>
          <Sparkles size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p style={{ margin: 0 }}>اختر دبلومة لعرض السيناريوهات المتاحة</p>
        </div>
      )}

      {/* Send history */}
      {logs.filter(l => l.diplomaId === selectedDiplomaId).length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, padding: '1rem 1.25rem'
        }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.87rem', fontWeight: 700, color: 'var(--text-primary, #f1f5f9)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} style={{ color: 'var(--text-muted, #94a3b8)' }} />
            سجل الإرسال الأخير
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {logs
              .filter(l => l.diplomaId === selectedDiplomaId)
              .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
              .slice(0, 6)
              .map(log => (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.45rem 0.75rem', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)'
                }}>
                  <CheckCircle size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.81rem', color: 'var(--text-primary, #f1f5f9)', flex: 1 }}>
                    {SCENARIOS.find(s => s.id === log.scenarioType)?.label || log.scenarioType}
                  </span>
                  <span style={{ fontSize: '0.77rem', color: '#22c55e', fontWeight: 600 }}>
                    {log.totalSent} رسالة
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>
                    {timeAgo(log.sentAt)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
