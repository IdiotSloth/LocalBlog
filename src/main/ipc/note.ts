import { clipboard, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { NoteService } from '../services/note.service';

let noteRefreshTarget: Electron.WebContents | null = null;

export function setNoteRefreshTarget(wc: Electron.WebContents | null): void {
  noteRefreshTarget = wc;
}

function broadcastRefresh(): void {
  noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
}

export function registerNoteHandlers(): void {
  ipcMain.handle(IPC.NOTE_LIST, async (_event, userId: number, memoType?: string) => {
    try {
      const notes = await NoteService.listNotes(userId, memoType);
      return { success: true, data: notes };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_CREATE, async (_event, data: {
    userId: number; content: string; source?: string;
    title?: string; memoType?: 'note' | 'schedule' | 'todo'; dueDate?: string;
    noteId?: number; // if provided, update instead of create
  }) => {
    try {
      // T1906: reuse note:create for update when noteId is provided
      if (data.noteId) {
        const note = await NoteService.updateNote(data.noteId, data.userId, {
          title: data.title, content: data.content,
          memoType: data.memoType, dueDate: data.dueDate,
        });
        broadcastRefresh();
        return { success: true, data: note };
      }
      const note = await NoteService.createNote(
        data.userId, data.content, data.source || 'manual',
        data.title || '', data.memoType || 'note', data.dueDate,
      );
      broadcastRefresh();
      return { success: true, data: note };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_DELETE, async (_event, data: { userId: number; noteId: number }) => {
    try {
      await NoteService.deleteNote(data.userId, data.noteId);
      broadcastRefresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_PIN, async (_event, data: { userId: number; noteId: number }) => {
    try {
      const note = await NoteService.togglePin(data.userId, data.noteId);
      broadcastRefresh();
      return note ? { success: true, data: note } : { success: false, error: '便签不存在' };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_CLIPBOARD, async () => {
    try {
      const text = clipboard.readText();
      return { success: true, data: text };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
