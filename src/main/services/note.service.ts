import { nowMySQL } from '../../shared/datetime';
import { dbAll, dbGet, dbRun } from '../db';

interface NoteRow {
  id: number;
  user_id: number;
  content: string;
  pinned: number;
  source: string;
  created_at: string;
}

export interface Note {
  id: number;
  userId: number;
  content: string;
  pinned: boolean;
  source: string;
  createdAt: string;
}

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id, userId: r.user_id, content: r.content,
    pinned: r.pinned !== 0, source: r.source, createdAt: r.created_at,
  };
}

export class NoteService {
  static async listNotes(userId: number): Promise<Note[]> {
    const rows = await dbAll<NoteRow>(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, created_at DESC',
      [userId],
    );
    return rows.map(rowToNote);
  }

  static async createNote(userId: number, content: string, source: string = 'manual'): Promise<Note> {
    const now = nowMySQL();
    await dbRun('INSERT INTO notes (user_id, content, source, created_at) VALUES (?, ?, ?, ?)', [
      userId, content, source, now,
    ]);
    const row = await dbGet<NoteRow>(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId],
    );
    if (!row) throw new Error('创建便签失败');
    return rowToNote(row);
  }

  static async deleteNote(noteId: number): Promise<void> {
    await dbRun('DELETE FROM notes WHERE id = ?', [noteId]);
  }

  static async togglePin(noteId: number): Promise<Note | null> {
    const row = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ?', [noteId]);
    if (!row) return null;
    await dbRun('UPDATE notes SET pinned = ? WHERE id = ?', [row.pinned ? 0 : 1, noteId]);
    const updated = await dbGet<NoteRow>('SELECT * FROM notes WHERE id = ?', [noteId]);
    return updated ? rowToNote(updated) : null;
  }

  /** Clean notes older than 24h (unpinned only) */
  static async cleanOldNotes(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().replace('T', ' ').slice(0, 19);
    await dbRun("DELETE FROM notes WHERE pinned = 0 AND created_at < ?", [cutoffStr]);
    // We can't easily get affected rows in sql.js; return 0 as indicator
    return 0;
  }
}
