import { nowMySQL } from '../../shared/datetime';
import type { MemoType, Note } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';

const VALID_MEMO_TYPES: readonly string[] = ['note', 'schedule', 'todo', 'daily'];

interface NoteRow {
  id: number;
  user_id: number;
  content: string;
  pinned: number;
  source: string;
  title: string;
  memo_type: MemoType;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id, userId: r.user_id, content: r.content,
    pinned: r.pinned !== 0, source: r.source,
    title: r.title, memoType: r.memo_type, dueDate: r.due_date ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export class NoteService {
  static async listNotes(userId: number, memoType?: string, dueDateFrom?: string, dueDateTo?: string): Promise<Note[]> {
    let sql = 'SELECT * FROM notes WHERE user_id = ?';
    const params: unknown[] = [userId];
    if (memoType) {
      sql += ' AND memo_type = ?';
      params.push(memoType);
    }
    if (dueDateFrom) {
      sql += ' AND due_date >= ?';
      params.push(dueDateFrom);
    }
    if (dueDateTo) {
      sql += ' AND due_date <= ?';
      params.push(dueDateTo);
    }
    sql += ' ORDER BY pinned DESC, updated_at DESC';
    const rows = await dbAll<NoteRow>(sql, params);
    return rows.map(rowToNote);
  }

  static async createNote(
    userId: number,
    content: string,
    source: string = 'manual',
    title: string = '',
    memoType: MemoType = 'note',
    dueDate?: string,
  ): Promise<Note> {
    // D54: Application-level validation replaces DB CHECK constraint
    if (!VALID_MEMO_TYPES.includes(memoType)) {
      throw new Error(`Invalid memoType: ${memoType}`);
    }
    // R194: Daily note idempotency — at most one per user per day
    if (memoType === 'daily' && dueDate) {
      const existing = await dbGet<NoteRow>(
        'SELECT * FROM notes WHERE user_id = ? AND memo_type = ? AND due_date = ? LIMIT 1',
        [userId, 'daily', dueDate],
      );
      if (existing) return rowToNote(existing);
    }
    const now = nowMySQL();
    await dbRun(
      'INSERT INTO notes (user_id, content, source, title, memo_type, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, content, source, title, memoType, dueDate || null, now, now],
    );
    const row = await dbGet<NoteRow>(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId],
    );
    if (!row) throw new Error('创建便签失败');
    return rowToNote(row);
  }

  static async updateNote(
    noteId: number,
    userId: number,
    data: { title?: string; content?: string; memoType?: MemoType; dueDate?: string | null },
  ): Promise<Note> {
    const now = nowMySQL();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); params.push(data.title); }
    if (data.content !== undefined) { sets.push('content = ?'); params.push(data.content); }
    if (data.memoType !== undefined) { sets.push('memo_type = ?'); params.push(data.memoType); }
    if (data.dueDate !== undefined) { sets.push('due_date = ?'); params.push(data.dueDate); }
    sets.push('updated_at = ?');
    params.push(now);
    params.push(noteId);
    params.push(userId);
    await dbRun(`UPDATE notes SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const row = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    if (!row) throw new Error('便签不存在');
    return rowToNote(row);
  }

  static async deleteNote(userId: number, noteId: number): Promise<void> {
    await dbRun('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  }

  static async togglePin(userId: number, noteId: number): Promise<Note | null> {
    const row = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    if (!row) return null;
    await dbRun('UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?', [row.pinned ? 0 : 1, nowMySQL(), noteId, userId]);
    const updated = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
    return updated ? rowToNote(updated) : null;
  }

  /** Clean notes older than 24h (unpinned only). Returns number of deleted notes. */
  static async cleanOldNotes(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19);
    const before = await dbGet<{ c: number }>("SELECT COUNT(*) as c FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    await dbRun("DELETE FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    return before?.c ?? 0;
  }
}
