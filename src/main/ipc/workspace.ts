import fs from 'node:fs';
import path from 'node:path';
import { dialog, ipcMain, shell } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { WorkspaceInfo } from '../../shared/types';
import { dbGet } from '../db';
import { getWorkspacePath } from '../utils/paths';

export function registerWorkspaceHandlers(): void {
  ipcMain.handle(IPC.WORKSPACE_GET_INFO, async (_event, userId: number): Promise<WorkspaceInfo> => {
    try {
      const wsPath = await getWorkspacePath(userId);
      const getCount = async (sql: string, params: unknown[]): Promise<number> => {
        const row = await dbGet<{ c: number }>(sql, params);
        return row?.c || 0;
      };
      const blogCount = await getCount('SELECT COUNT(*) as c FROM blogs WHERE user_id = ? AND status = ?', [
        userId,
        'active',
      ]);
      const knowledgeCount = await getCount(
        'SELECT COUNT(*) as c FROM knowledge_files WHERE user_id = ? AND status = ?',
        [userId, 'active'],
      );
      const tagCount = await getCount('SELECT COUNT(*) as c FROM tags WHERE user_id = ?', [userId]);
      let storageSize = 0;
      try {
        const files = fs.readdirSync(wsPath, { recursive: true, withFileTypes: true });
        for (const f of files) {
          if (f.isFile()) {
            try {
              storageSize += fs.statSync(path.join(f.parentPath || wsPath, f.name)).size;
            } catch {
              /* file may have been deleted since readdir */
            }
          }
        }
      } catch {
        /* directory listing failed, return 0 size */
      }
      return { path: wsPath, totalFiles: blogCount + knowledgeCount, blogCount, knowledgeCount, tagCount, storageSize };
    } catch {
      console.error('[workspace] Failed to get workspace info');
      return { path: '', totalFiles: 0, blogCount: 0, knowledgeCount: 0, tagCount: 0, storageSize: 0 };
    }
  });

  ipcMain.handle(IPC.WORKSPACE_SET_PATH, async (_event, data: { userId: number; newPath: string }) => {
    /* TODO */
  });
  ipcMain.handle(IPC.WORKSPACE_MIGRATE, async (_event, data: { userId: number; newPath: string }) => {
    /* TODO */
  });
  ipcMain.handle(IPC.WORKSPACE_OPEN_IN_FOLDER, async (_event, userId: number) => {
    try {
      shell.openPath(await getWorkspacePath(userId));
    } catch {
      /* shell.openPath may fail if path does not exist */
    }
  });
  ipcMain.handle(IPC.FS_SELECT_DIR, async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  ipcMain.handle(IPC.FS_SELECT_FILES, async (_event, filters: { extensions: string[] }) => {
    const r = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'All', extensions: filters.extensions }],
    });
    return r.canceled ? [] : r.filePaths;
  });
}
