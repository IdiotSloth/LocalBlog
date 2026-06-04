import fs from 'node:fs';
import path from 'node:path';
import { clipboard, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { MemoType } from '../../shared/types';
import { syncWikilinkRefs } from './blog';
import { NoteService } from '../services/note.service';
import { getWorkspacePath } from '../utils/paths';

let noteRefreshTarget: Electron.WebContents | null = null;

export function setNoteRefreshTarget(wc: Electron.WebContents | null): void {
  noteRefreshTarget = wc;
}

function broadcastRefresh(): void {
  noteRefreshTarget?.send(IPC.EVT_NOTE_REFRESH);
}

export function registerNoteHandlers(): void {
  ipcMain.handle(IPC.NOTE_LIST, async (_event, userId: number, memoType?: string, dueDateFrom?: string, dueDateTo?: string) => {
    try {
      const notes = await NoteService.listNotes(userId, memoType, dueDateFrom, dueDateTo);
      return { success: true, data: notes };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_CREATE, async (_event, data: {
    userId: number; content: string; source?: string;
    title?: string; memoType?: MemoType; dueDate?: string;
    noteId?: number; // if provided, update instead of create
  }) => {
    try {
      // T1906: reuse note:create for update when noteId is provided
      if (data.noteId) {
        const note = await NoteService.updateNote(data.noteId, data.userId, {
          title: data.title, content: data.content,
          memoType: data.memoType, dueDate: data.dueDate,
        });
        // R219: Sync wikilink refs from updated note content (insert-only, no diff without oldContent)
        if (data.content) await syncWikilinkRefs('note', note.id, data.content, data.userId);
        broadcastRefresh();
        return { success: true, data: note };
      }
      const note = await NoteService.createNote(
        data.userId, data.content, data.source || 'manual',
        data.title || '', data.memoType || 'note', data.dueDate,
      );
      // R219: Sync wikilink refs from new note content
      if (data.content) await syncWikilinkRefs('note', note.id, data.content, data.userId);
      broadcastRefresh();
      return { success: true, data: note };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_DELETE, async (_event, data: { userId: number; noteId: number }) => {
    try {
      // D140 cascade: delete referenced images before deleting the note
      const notes = await NoteService.listNotes(data.userId);
      const note = notes.find((n) => n.id === data.noteId);
      if (note?.content) {
        const imgRe = /!\[.*?\]\(notes-images\/([^)]+)\)/g;
        let m;
        const workspace = await getWorkspacePath(data.userId);
        const imgDir = path.join(workspace, 'notes-images');
        while ((m = imgRe.exec(note.content)) !== null) {
          const imgPath = path.join(imgDir, m[1]!);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      }
      await NoteService.deleteNote(data.userId, data.noteId);
      broadcastRefresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.NOTE_IMAGE_SAVE, async (_event, data: { userId: number; base64: string }) => {
    try {
      const workspace = await getWorkspacePath(data.userId);
      const imgDir = path.join(workspace, 'notes-images');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      // Validate: only accept data:image/... base64
      if (!data.base64.startsWith('data:image/')) return { success: false, error: '仅支持图片粘贴' };
      const ext = data.base64.match(/^data:image\/(\w+);/)?.[1] || 'png';
      const filename = `${crypto.randomUUID()}.${ext}`;
      const filePath = path.join(imgDir, filename);
      // Path traversal guard
      if (!path.resolve(filePath).startsWith(path.resolve(workspace))) return { success: false, error: '路径无效' };
      const buf = Buffer.from(data.base64.split(',')[1]!, 'base64');
      fs.writeFileSync(filePath, buf);
      return { success: true, data: `notes-images/${filename}` };
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
