import { clipboard, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { NoteService } from '../services/note.service';

let noteRefreshTarget: Electron.WebContents | null = null;

export function setNoteRefreshTarget(wc: Electron.WebContents | null): void {
  noteRefreshTarget = wc;
}

export function registerNoteHandlers(): void {
  ipcMain.handle(IPC.NOTE_LIST, async (_event, userId: number) => {
    try {
      const notes = await NoteService.listNotes(userId);
      return { success: true, data: notes };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_CREATE, async (_event, data: { userId: number; content: string; source?: string }) => {
    try {
      const note = await NoteService.createNote(data.userId, data.content, data.source || 'manual');
      noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
      return { success: true, data: note };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_DELETE, async (_event, data: { userId: number; noteId: number }) => {
    try {
      await NoteService.deleteNote(data.userId, data.noteId);
      noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_PIN, async (_event, data: { userId: number; noteId: number }) => {
    try {
      const note = await NoteService.togglePin(data.userId, data.noteId);
      noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
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
