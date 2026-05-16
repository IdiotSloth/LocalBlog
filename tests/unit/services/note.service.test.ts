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

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_id: 1,
    content: 'Test note',
    pinned: 0,
    source: 'manual',
    title: '',
    memo_type: 'note' as const,
    due_date: null,
    created_at: '2026-01-01 12:00:00',
    updated_at: '2026-01-01 12:00:00',
    ...overrides,
  };
}

describe('NoteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note and return it', async () => {
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce(makeRow({ id: 1, content: 'Test note' }));
      const note = await NoteService.createNote(1, 'Test note', 'manual');
      expect(note).not.toBeNull();
      expect(note.content).toBe('Test note');
      expect(note.pinned).toBe(false);
      expect(note.title).toBe('');
      expect(note.memoType).toBe('note');
    });

    it('should create a note and default source to manual', async () => {
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce(makeRow({ id: 2, content: 'Another note' }));
      const note = await NoteService.createNote(1, 'Another note');
      expect(note.source).toBe('manual');
    });
  });

  describe('togglePin', () => {
    it('should toggle pinned status from false to true', async () => {
      mockDbGet.mockResolvedValueOnce(makeRow({ id: 1, pinned: 0 }));
      mockDbRun.mockResolvedValue(undefined);
      mockDbGet.mockResolvedValueOnce(makeRow({ id: 1, pinned: 1 }));
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
        makeRow({ id: 1, content: 'Note 1', pinned: 1 }),
        makeRow({ id: 2, content: 'Note 2', pinned: 0, source: 'clipboard' }),
      ]);
      const notes = await NoteService.listNotes(1);
      expect(notes).toHaveLength(2);
      expect(notes[0]?.pinned).toBe(true);
      expect(notes[1]?.pinned).toBe(false);
    });
  });
});
