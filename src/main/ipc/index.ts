import { registerAiHandlers } from './ai';
import { registerAppHandlers } from './app';
import { registerAuthHandlers } from './auth';
import { registerBlogHandlers } from './blog';
import { registerBookmarkHandlers } from './bookmark';
import { registerContinueHandlers } from './continue';
import { registerFolderHandlers } from './folder';
import { registerGraphHandlers } from './graph';
import { registerKnowledgeHandlers } from './knowledge';
import { registerNoteHandlers } from './note';
import { registerRecycleHandlers } from './recycle';
import { registerReferenceHandlers } from './reference';
import { registerScrapeHandler } from './scrape';
import { registerSearchHandlers } from './search';
import { registerShortcutHandlers } from './shortcut';
import { registerTagHandlers } from './tags';
import { registerWhiteboardHandlers } from './whiteboard';
import { registerWorkspaceHandlers } from './workspace';

export function registerAllIpcHandlers(): void {
  registerAuthHandlers();
  registerBlogHandlers();
  registerFolderHandlers();
  registerKnowledgeHandlers();
  registerSearchHandlers();
  registerWorkspaceHandlers();
  registerRecycleHandlers();
  registerReferenceHandlers();
  registerScrapeHandler();
  registerAppHandlers();
  registerShortcutHandlers();
  registerTagHandlers();
  registerNoteHandlers();
  registerContinueHandlers();
  registerGraphHandlers();
  registerBookmarkHandlers();
  registerAiHandlers();
  registerWhiteboardHandlers();
}
