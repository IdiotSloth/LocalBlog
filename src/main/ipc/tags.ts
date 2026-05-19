import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { dbRun } from '../db';
import { TagService } from '../services/tag.service';

export function registerTagHandlers(): void {
  ipcMain.handle(IPC.TAG_LIST, async (_event, userId: number) => {
    try {
      const tags = await TagService.listTags(userId);
      return { success: true, data: tags };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_CREATE, async (_event, data: { userId: number; name: string }) => {
    try {
      const tag = await TagService.createTag(data.userId, data.name);
      return { success: true, data: tag };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_UPDATE, async (_event, data: { userId: number; tagId: number; name: string; description?: string }) => {
    try {
      await TagService.updateTag(data.userId, data.tagId, data.name, data.description);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.TAG_DELETE, async (_event, data: { userId: number; tagId: number }) => {
    try {
      await TagService.deleteTag(data.userId, data.tagId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // T2109: Merge source tag into target tag — reassign all refs, delete source
  ipcMain.handle(IPC.TAG_MERGE, async (_event, data: { userId: number; sourceId: number; targetId: number }) => {
    try {
      // Verify both tags belong to the user
      const tags = await TagService.listTags(data.userId);
      const src = tags.find((t) => t.id === data.sourceId);
      const tgt = tags.find((t) => t.id === data.targetId);
      if (!src || !tgt) return { success: false, error: '标签不存在' };
      if (src.id === tgt.id) return { success: false, error: '不能合并相同标签' };

      // R278: Wrap in transaction — crash-safe atomic merge
      await dbRun('BEGIN');
      try {
        // Reassign blog_tags
        await dbRun('UPDATE blog_tags SET tag_id = ? WHERE tag_id = ?', [data.targetId, data.sourceId]);
        await dbRun('DELETE FROM blog_tags WHERE tag_id = ?', [data.sourceId]);
        // Reassign knowledge_file_tags
        await dbRun('UPDATE knowledge_file_tags SET tag_id = ? WHERE tag_id = ?', [data.targetId, data.sourceId]);
        await dbRun('DELETE FROM knowledge_file_tags WHERE tag_id = ?', [data.sourceId]);
        // Delete the source tag
        await dbRun('DELETE FROM tags WHERE id = ? AND user_id = ?', [data.sourceId, data.userId]);
        await dbRun('COMMIT');
      } catch (innerErr) {
        await dbRun('ROLLBACK');
        throw innerErr;
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
