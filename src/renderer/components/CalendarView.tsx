import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import type { Note } from '../../shared/types';

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface DayInfo {
  date: string;
  dailyNotes: Note[];
  schedules: Note[];
}

export function CalendarView({ onDateSelect }: { onDateSelect?: (date: string) => void }) {
  const user = useAuthStore((s) => s.user);
  const [today] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => today.getMonth());
  const [currentYear, setCurrentYear] = useState(() => today.getFullYear());
  const [dailyNotes, setDailyNotes] = useState<Note[]>([]);
  const [schedules, setSchedules] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const abortedRef = useRef(false);
  const pad = (n: number) => String(n).padStart(2, '0');

  // ISO week number
  const isoWeek = (d: Date): number => {
    const tmp = new Date(d.getTime());
    tmp.setHours(0, 0, 0, 0);
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const w1 = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  };

  // D96: Load both daily notes and schedules concurrently
  const loadData = useCallback(async () => {
    if (!user) return;
    abortedRef.current = false;
    setLoading(true);
    try {
      const monthStart = `${currentYear}-${pad(currentMonth + 1)}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthEnd = `${currentYear}-${pad(currentMonth + 1)}-${pad(lastDay)}`;

      const [dailyR, schedR] = await Promise.all([
        window.api.noteList(user.id, 'daily', monthStart, monthEnd),
        window.api.noteList(user.id, 'schedule', monthStart, monthEnd),
      ]);

      if (!abortedRef.current) {
        if (dailyR.success && dailyR.data) setDailyNotes(dailyR.data);
        if (schedR.success && schedR.data) setSchedules(schedR.data);
      }
    } catch (e) {
      console.error('[CalendarView] Failed to load:', e);
      if (!abortedRef.current) setError('加载失败');
    } finally {
      if (!abortedRef.current) setLoading(false);
    }
  }, [user, currentYear, currentMonth]);

  useEffect(() => {
    loadData();
    return () => { abortedRef.current = true; };
  }, [loadData]);

  useEffect(() => {
    const unsub = window.api.onNoteRefresh(() => loadData());
    return () => { unsub(); abortedRef.current = true; };
  }, [loadData]);

  // Calendar grid days with week grouping
  const calendarWeeks = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    const allDays: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) allDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) allDays.push(d);

    // Group into weeks
    const weeks: { weekNum: number; days: (number | null)[] }[] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      const weekDays = allDays.slice(i, i + 7);
      // Calculate ISO week number for the first non-null day in this row
      let weekNum = 0;
      for (const d of weekDays) {
        if (d !== null) {
          weekNum = isoWeek(new Date(currentYear, currentMonth, d));
          break;
        }
      }
      weeks.push({ weekNum, days: weekDays });
    }
    return weeks;
  }, [currentYear, currentMonth]);

  // Map date string -> DayInfo
  const dayInfoMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const getKey = (n: Note) => n.dueDate ? String(n.dueDate).slice(0, 10) : String(n.createdAt).slice(0, 10);

    for (const n of dailyNotes) {
      const k = getKey(n);
      const entry = map.get(k) || { date: k, dailyNotes: [], schedules: [] };
      entry.dailyNotes.push(n);
      map.set(k, entry);
    }
    for (const n of schedules) {
      const k = getKey(n);
      const entry = map.get(k) || { date: k, dailyNotes: [], schedules: [] };
      entry.schedules.push(n);
      map.set(k, entry);
    }
    return map;
  }, [dailyNotes, schedules]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else { setCurrentMonth((m) => m - 1); }
    setSelectedDate(null);
    setShowMonthPicker(false);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else { setCurrentMonth((m) => m + 1); }
    setSelectedDate(null);
    setShowMonthPicker(false);
  };

  const handleToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
    setShowMonthPicker(false);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
    setSelectedDate((prev) => prev === dateStr ? null : dateStr);
    onDateSelect?.(dateStr);
  };

  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const handleMonthSelect = (m: number) => {
    setCurrentMonth(m);
    setShowMonthPicker(false);
    setSelectedDate(null);
  };

  // Quick schedule creation for selected date
  const handleQuickSchedule = async () => {
    if (!user || !selectedDate || !quickTitle.trim() || quickSaving) return;
    setQuickSaving(true);
    try {
      await window.api.noteCreate({
        userId: user.id, content: quickTitle.trim(), title: quickTitle.trim(),
        memoType: 'schedule', dueDate: selectedDate,
      });
      setQuickTitle('');
      loadData();
    } catch (e) { console.error('[CalendarView]', e); }
    finally { setQuickSaving(false); }
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const selectedInfo = selectedDate ? dayInfoMap.get(selectedDate) : null;

  return (
    <div>
      {/* Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrevMonth} aria-label="上个月"
            className="rounded-[4px] px-2 py-1 text-[14px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ←
          </button>
          <button type="button" onClick={() => setShowMonthPicker((v) => !v)}
            className="rounded-[4px] px-2 py-1 text-[15px] font-semibold hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            {currentYear} 年 {currentMonth + 1} 月
          </button>
          <button type="button" onClick={handleNextMonth} aria-label="下个月"
            className="rounded-[4px] px-2 py-1 text-[14px] hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            →
          </button>
        </div>
        <button type="button" onClick={handleToday}
          className="rounded-[4px] px-3 py-1 text-[12px] font-medium transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent-blue)', background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer' }}>
          今天
        </button>
      </div>

      {/* Month picker */}
      {showMonthPicker && (
        <div className="mb-4 grid grid-cols-4 gap-1 rounded-[8px] border p-3"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          {MONTH_LABELS.map((label, idx) => (
            <button key={label} type="button" onClick={() => handleMonthSelect(idx)}
              className="rounded-[4px] py-1.5 text-[13px] font-medium transition-colors"
              style={{
                background: idx === currentMonth ? 'var(--accent-blue)' : 'transparent',
                color: idx === currentMonth ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Weekday headers + week number column */}
      <div className="mb-1 grid gap-0.5 text-center text-[11px] font-medium"
        style={{ gridTemplateColumns: '24px repeat(7, 1fr)', color: 'var(--text-muted)' }}>
        <div className="py-1" />
        {WEEKDAY_HEADERS.map((h) => <div key={h} className="py-1">{h}</div>)}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: '3rem' }}>
          <p>{error}</p>
          <button onClick={() => { setError(null); loadData(); }}
            style={{ color: 'var(--accent-blue)', marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            重试
          </button>
        </div>
      )}

      {/* Calendar grid */}
      {loading ? (
        <div className="flex justify-center py-8 text-[13px]" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : (
        <div>
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="grid gap-0.5" style={{ gridTemplateColumns: '24px repeat(7, 1fr)' }}>
              {/* Week number */}
              <div className="flex items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {week.weekNum > 0 ? `W${week.weekNum}` : ''}
              </div>
              {week.days.map((day, di) => {
                if (day === null) return <div key={`empty-${wi}-${di}`} />;
                const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
                const info = dayInfoMap.get(dateStr);
                const hasDaily = info && info.dailyNotes.length > 0;
                const hasSchedule = info && info.schedules.length > 0;
                const isTodayDay = isToday(day);
                const isSelected = selectedDate === dateStr;
                return (
                  <button key={dateStr} type="button" onClick={() => handleDayClick(day)}
                    className="relative flex flex-col items-center rounded-[4px] py-1 text-[13px] transition-colors hover:opacity-80"
                    style={{
                      background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      color: isTodayDay ? 'var(--accent-blue)' : 'var(--text-primary)',
                      fontWeight: isTodayDay ? 700 : 400,
                      border: isSelected ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}>
                    <span>{day}</span>
                    {/* Dots: blue for daily, green for schedule */}
                    <span className="mt-0.5 flex gap-[2px]" style={{ minHeight: 7 }}>
                      {hasDaily && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />}
                      {hasSchedule && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />}
                      {!hasDaily && !hasSchedule && <span style={{ width: 6, height: 6, display: 'inline-block' }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Day info tooltip + quick schedule creation */}
      {selectedDate && (
        <div className="mt-3 rounded-[8px] border p-4" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}>
          <h4 className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedDate}</h4>
          {selectedInfo?.dailyNotes.length ? (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--accent-blue)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', display: 'inline-block' }} />
                每日便签 ({selectedInfo.dailyNotes.length})
              </span>
            </div>
          ) : null}
          {selectedInfo?.schedules.length ? (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium mb-1" style={{ color: 'var(--accent-green)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
                日程 ({selectedInfo.schedules.length})
              </span>
              {selectedInfo.schedules.map((s) => (
                <div key={s.id} className="ml-3 mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                  {s.title || s.content?.slice(0, 40)}
                  {s.dueDate && <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{String(s.dueDate).slice(11, 16)}</span>}
                </div>
              ))}
            </div>
          ) : null}
          {/* Quick schedule input */}
          <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <input type="text" value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSchedule()}
              placeholder="添加日程..."
              className="flex-1 rounded-[4px] border px-2 py-1 text-[12px] outline-none"
              style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }} />
            <button type="button" onClick={handleQuickSchedule}
              disabled={!quickTitle.trim() || quickSaving}
              className="rounded-[4px] px-3 py-1 text-[12px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ background: 'var(--accent-green)', color: '#fff' }}>
              {quickSaving ? '...' : '添加'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
