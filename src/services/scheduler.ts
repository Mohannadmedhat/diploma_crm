import { ScheduledMessage } from '../types';

/**
 * Creates a new scheduled message and returns it.
 * The caller is responsible for saving it to AppConfig.scheduledMessages.
 */
export function createScheduledMessage(params: {
  diplomaId: string;
  diplomaName: string;
  messageType: ScheduledMessage['messageType'];
  messageTemplate: string;
  targetGroup: ScheduledMessage['targetGroup'];
  scheduledAt: string; // ISO datetime
  note?: string;
  createdBy?: string;
}): ScheduledMessage {
  return {
    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    diplomaId: params.diplomaId,
    diplomaName: params.diplomaName,
    messageType: params.messageType,
    messageTemplate: params.messageTemplate,
    targetGroup: params.targetGroup,
    scheduledAt: params.scheduledAt,
    status: 'pending',
    createdAt: new Date().toISOString(),
    note: params.note,
    createdBy: params.createdBy,
  };
}

/**
 * Checks if a scheduled message is due to fire right now (within a 1-minute window).
 */
export function isScheduleDue(schedule: ScheduledMessage): boolean {
  if (schedule.status !== 'pending') return false;

  const now = new Date();
  const scheduledTime = new Date(schedule.scheduledAt);

  // Fire if the scheduled time is within the past 2 minutes and hasn't been sent
  const diffMs = now.getTime() - scheduledTime.getTime();
  return diffMs >= 0 && diffMs < 2 * 60 * 1000; // within 2-minute window
}

/**
 * Returns all pending schedules that are due now.
 */
export function getDueSchedules(schedules: ScheduledMessage[]): ScheduledMessage[] {
  return (schedules || []).filter(isScheduleDue);
}

/**
 * Returns all pending (future) schedules sorted by soonest first.
 */
export function getPendingSchedules(schedules: ScheduledMessage[]): ScheduledMessage[] {
  const now = new Date();
  return (schedules || [])
    .filter(s => s.status === 'pending' && new Date(s.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

/**
 * Formats a scheduled datetime as a human-readable Arabic string.
 */
export function formatScheduledAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Parses natural language time offsets like "بعد ساعتين", "الساعة 6", etc.
 * Returns an ISO datetime string relative to now or to a provided base date.
 */
export function parseScheduleTime(text: string, baseDate?: Date): string | null {
  const now = baseDate || new Date();
  const lower = text.toLowerCase();

  // "بعد X ساعة/ساعات/دقيقة/دقائق"
  const afterMatch = lower.match(/بعد\s+(\d+)\s*(ساعة|ساعات|ساعه|دقيقة|دقائق|دقيقه)/);
  if (afterMatch) {
    const amount = parseInt(afterMatch[1]);
    const unit = afterMatch[2];
    const ms = unit.includes('ساعة') || unit.includes('ساعه') || unit.includes('ساعات')
      ? amount * 60 * 60 * 1000
      : amount * 60 * 1000;
    return new Date(now.getTime() + ms).toISOString();
  }

  // "الساعة X" (today at hour X)
  const hourMatch = lower.match(/الساعة\s+(\d+)/);
  if (hourMatch) {
    const hour = parseInt(hourMatch[1]);
    const d = new Date(now);
    d.setHours(hour, 0, 0, 0);
    // If the time has already passed today, schedule for tomorrow
    if (d.getTime() < now.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString();
  }

  return null;
}
