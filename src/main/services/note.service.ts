import { nowMySQL } from '../../shared/datetime';
import type { Note } from '../../shared/types';
import { dbAll, dbGet, dbRun } from '../db';

interface NoteRow {
  id: number;
  user_id: number;
  content: string;
  pinned: number;
  source: string;
  title: string;
  memo_type: 'note' | 'schedule' | 'todo';
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
  static async listNotes(userId: number, memoType?: string): Promise<Note[]> {
    let sql = 'SELECT * FROM notes WHERE user_id = ?';
    const params: unknown[] = [userId];
    if (memoType) {
      sql += ' AND memo_type = ?';
      params.push(memoType);
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
    memoType: 'note' | 'schedule' | 'todo' = 'note',
    dueDate?: string,
  ): Promise<Note> {
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
    data: { title?: string; content?: string; memoType?: 'note' | 'schedule' | 'todo'; dueDate?: string | null },
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
    const row = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (!row) throw new Error('便签不存在');
    return rowToNote(row);
  }

  static async deleteNote(userId: number, noteId: number): Promise<void> {
    await dbRun('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, userId]);
  }

  static async togglePin(userId: number, noteId: number): Promise<Note | null> {
    const row = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (!row) return null;
    await dbRun('UPDATE notes SET pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?', [row.pinned ? 0 : 1, nowMySQL(), noteId, userId]);
    const updated = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ?', [noteId]);
    return updated ? rowToNote(updated) : null;
  }

  /** Clean notes older than 24h (unpinned only) */
  static async cleanOldNotes(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19);
    await dbRun("DELETE FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    return 0;
  }
}
