import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { AiSettings, ChatRequest, TagSuggestionRequest } from '../../shared/ai-types';
import { AiService } from '../services/ai.service';

export function registerAiHandlers(): void {
  ipcMain.handle(IPC.AI_CHAT, async (_event, data: { settings: AiSettings; request: ChatRequest }) => {
    try {
      const content = await AiService.chat(data.settings, data.request);
      return { success: true, data: { content } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.AI_TAG_SUGGEST, async (_event, data: { settings: AiSettings; request: TagSuggestionRequest; existingTags: string[] }) => {
    try {
      const tags = await AiService.suggestTags(data.settings, data.request, data.existingTags || []);
      return { success: true, data: { tags } };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
