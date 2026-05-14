import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/main/db', () => ({
  dbGet: vi.fn(),
  dbRun: vi.fn(),
  dbAll: vi.fn(),
}));

import { dbAll, dbGet, dbRun } from '../../../src/main/db';
import { NoteService } from '../../../src/main/services/note.service';

const mockDbGet = dbGet as ReturnType<typeof vi.fn>;
const mockDbRun = dbRun as ReturnType<typeof vi.fn>;
const mockDbAll = dbAll as ReturnType<typeof vi.fn>;

describe('NoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note and return it', async () => {
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        content: 'Test note',
        pinned: 0,
        source: 'manual',
        created_at: '2026-01-01 12:00:00',
      });
      const note = await NoteService.createNote(1, 'Test note', 'manual');
      expect(note).not.toBeNull();
      expect(note.content).toBe('Test note');
      expect(note.pinned).toBe(false);
    });

    it('should create a note and default source to manual', async () => {
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce({
        id: 2,
        user_id: 1,
        content: 'Another note',
        pinned: 0,
        source: 'manual',
        created_at: '2026-01-01 12:00:00',
      });
      const note = await NoteService.createNote(1, 'Another note');
      expect(note.source).toBe('manual');
    });
  });

  describe('togglePin', () => {
    it('should toggle pinned status from false to true', async () => {
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        content: 'Test note',
        pinned: 0,
        source: 'manual',
        created_at: '2026-01-01 12:00:00',
      });
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce({
        id: 1,
        user_id: 1,
        content: 'Test note',
        pinned: 1,
        source: 'manual',
        created_at: '2026-01-01 12:00:00',
      });
      const note = await NoteService.togglePin(1, 1);
      expect(note).not.toBeNull();
      expect(note?.pinned).toBe(true);
      // Verify UPDATE was called with pinned=1
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notes SET pinned = ?'),
        expect.arrayContaining([1, 1, 1]),
      );
    });
  });

  describe('cleanOldNotes', () => {
    it('should delete old unpinned notes', async () => {
      mockDbRun.mockResolvedValue(undefined);
      const count = await NoteService.cleanOldNotes();
      expect(count).toBe(0); // sql.js can't easily return affected rows
      expect(mockDbRun).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notes WHERE pinned = 0'),
        expect.any(Array),
      );
    });
  });

  describe('listNotes', () => {
    it('should return all notes for user', async () => {
      mockDbAll.mockResolvedValueOnce([
        { id: 1, user_id: 1, content: 'Note 1', pinned: 1, source: 'manual', created_at: '2026-01-01' },
        { id: 2, user_id: 1, content: 'Note 2', pinned: 0, source: 'clipboard', created_at: '2026-01-02' },
      ]);
      const notes = await NoteService.listNotes(1);
      expect(notes).toHaveLength(2);
      expect(notes[0]?.pinned).toBe(true);
      expect(notes[1]?.pinned).toBe(false);
    });
  });
});
