import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { FtsSearchResult, SearchResult } from '../../shared/types';
import { SearchService } from '../services/search.service';

export function registerSearchHandlers(): void {
  ipcMain.handle(IPC.SEARCH_GLOBAL, async (_event, data: { userId: number; query: string }) => {
    try {
      const result = await SearchService.globalSearch(data.userId, data.query);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
  ipcMain.handle(IPC.SEARCH_BLOGS, async (_event, data: { userId: number; query: string }): Promise<SearchResult[]> => {
    try {
      return await SearchService.searchBlogs(data.userId, data.query);
    } catch {
      return [];
    }
  });
  ipcMain.handle(IPC.SEARCH_KB, async (_event, data: { userId: number; query: string }): Promise<SearchResult[]> => {
    try {
      return await SearchService.searchKnowledge(data.userId, data.query);
    } catch {
      return [];
    }
  });
  ipcMain.handle(IPC.REBUILD_FTS_INDEX, async () => {
    return { success: true };
  });

  // T1801: FTS5 full-text search (Worker-based inverted index)
  ipcMain.handle(IPC.SEARCH_QUERY, async (_event, data: { query: string; userId: number }) => {
    try {
      const results: FtsSearchResult[] = await SearchService.searchAll(data.query, data.userId);
      return { success: true, data: results };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SEARCH_GET_DOCUMENTS, async (_event, data: { userId: number }) => {
    try {
      const docs = await SearchService.getIndexableDocuments(data.userId);
      return { success: true, data: docs };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
