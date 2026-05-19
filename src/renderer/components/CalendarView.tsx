import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { nowMySQL, toMySQLDateTime } from '../../shared/datetime';
import type { Note } from '../../shared/types';

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];

interface SchedulePopup {
  date: string; // YYYY-MM-DD
  note?: Note;
  title: string;
  time: string;
}

export function CalendarView({ onDateSelect }: { onDateSelect?: (date: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const [today] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [schedules, setSchedules] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortedRef = useRef(false);
  const [popup, setPopup] = useState<SchedulePopup | null>(null);
  const [saving, setSaving] = useState(false);
  const pad = (n: number) => String(n).padStart(2, '0');

  // Load schedule-type notes for the current month
  const loadSchedules = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    try {
      const monthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`;
      const r = await window.api.noteList(user.id, 'schedule', monthStart, monthEnd);
      if (r.success && r.data && !abortedRef.current) {
        setSchedules(r.data);
      }
    } catch (e) {
      console.error('[CalendarView] Failed to load schedules:', e);
      setError('加载失败');
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  useEffect(() => {
    loadSchedules();
    return () => { abortedRef.current = true; };
  }, [loadSchedules]);

  // Listen for note:refresh to reload
  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadSchedules());
    return () => { unsub(); abortedRef.current = true; };
  }, [loadSchedules]);

  // Derive calendar grid days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday=1 ... Sunday=0 (getDay returns 0=Sun, adjust)
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // now 0=Mon ... 6=Sun

    const days: (number | null)[] = [];
    // Padding before first day
    for (let i = 0; i < startDow; i++) days.push(null);
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentYear, currentMonth]);

  // Map date string -> schedules on that day
  const scheduleMap = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const s of schedules) {
      const dateKey = s.dueDate ? String(s.dueDate).slice(0, 10) : String(s.createdAt).slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(s);
      map.set(dateKey, list);
    }
    return map;
  }, [schedules]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setPopup(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setPopup(null);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
    const existingSchedules = scheduleMap.get(dateStr) || [];
    const existing = existingSchedules[0];
    if (existing) {
      setPopup({
        date: dateStr,
        note: existing,
        title: existing.title,
        time: existing.dueDate ? existing.dueDate.slice(11, 16) : '',
      });
    } else {
      setPopup({
        date: dateStr,
        title: '',
        time: '',
      });
    }
    // T2005: Notify parent so daily note can be viewed/created for this date
    onDateSelect?.(dateStr);
  };

  const handleSaveSchedule = async () => {
    if (!user || !popup) return;
    setSaving(true);
    try {
      const dueDate = `${popup.date} ${popup.time || '00:00'}:00`;
      if (popup.note) {
        // Update existing
        await window.api.noteCreate({
          userId: user.id,
          noteId: popup.note.id,
          content: popup.note.content,
          title: popup.title || popup.note.title,
          dueDate,
          memoType: 'schedule',
        });
      } else {
        // Create new
        await window.api.noteCreate({
          userId: user.id,
          content: popup.title || popup.date,
          title: popup.title || '',
          memoType: 'schedule',
          dueDate,
        });
      }
      setPopup(null);
      loadSchedules();
    } catch (e) {
      console.error('[CalendarView] Failed to save schedule:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!user || !popup?.note) return;
    await window.api.noteDelete({ userId: user.id, noteId: popup.note.id });
    setPopup(null);
    loadSchedules();
  };

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const monthLabel = `${currentYear} 年 ${currentMonth + 1} 月`;

  return (
    <div>
      {/* Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="上个月"
          className="rounded-[4px] px-3 py-1 text-[14px] hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          ←
        </button>
        <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="下个月"
          className="rounded-[4px] px-3 py-1 text-[14px] hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {WEEKDAY_HEADERS.map((h) => (
          <div key={h} className="py-1">{h}</div>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: '3rem' }}>
          <p>{error}</p>
          <button
            onClick={() => { setError(null); loadSchedules(); }}
            style={{ color: 'var(--accent-blue)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            重试
          </button>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center py-8 text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
            const daySchedules = scheduleMap.get(dateStr) || [];
            const isTodayDay = isToday(day);
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(day)}
                className="relative flex flex-col items-center rounded-[4px] py-1.5 text-[13px] transition-colors hover:opacity-80"
                style={{
                  background: isTodayDay ? 'var(--bg-tertiary)' : 'transparent',
                  color: isTodayDay ? 'var(--accent-blue)' : 'var(--text-primary)',
                  fontWeight: isTodayDay ? 700 : 400,
                }}
              >
                <span>{day}</span>
                {daySchedules.length > 0 ? (
                  <span
                    className="mt-0.5 text-[10px] font-semibold rounded-full px-1.5"
                    style={{
                      background: 'var(--accent-blue)',
                      color: '#fff',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {daySchedules.length}
                  </span>
                ) : (
                  <span className="mt-0.5 h-[18px]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Schedule popup */}
      {popup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setPopup(null)}
        >
          <div
            className="w-[320px] rounded-[8px] border p-5 shadow-lg"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-4 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {popup.note ? '编辑日程' : '新建日程'} — {popup.date}
            </h4>

            <div className="mb-3">
              <label className="mb-1 block text-[12px]" style={{ color: 'var(--text-secondary)' }}>标题</label>
              <input
                type="text"
                value={popup.title}
                onChange={(e) => setPopup((p) => p ? { ...p, title: e.target.value } : null)}
                placeholder="日程标题"
                className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[12px]" style={{ color: 'var(--text-secondary)' }}>时间</label>
              <input
                type="time"
                value={popup.time}
                onChange={(e) => setPopup((p) => p ? { ...p, time: e.target.value } : null)}
                className="w-full rounded-[4px] border px-3 py-1.5 text-[13px] outline-none"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={saving}
                className="flex-1 rounded-[4px] px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              {popup.note && (
                <button
                  type="button"
                  onClick={handleDeleteSchedule}
                  className="rounded-[4px] px-4 py-1.5 text-[13px] transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent-red)', color: 'white' }}
                >
                  删除
                </button>
              )}
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="rounded-[4px] px-4 py-1.5 text-[13px] transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
