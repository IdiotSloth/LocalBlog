import { registerAppHandlers } from './app';
import { registerAuthHandlers } from './auth';
import { registerBlogHandlers } from './blog';
import { registerFolderHandlers } from './folder';
import { registerKnowledgeHandlers } from './knowledge';
import { registerNoteHandlers } from './note';
import { registerRecycleHandlers } from './recycle';
import { registerReferenceHandlers } from './reference';
import { registerScrapeHandler } from './scrape';
import { registerSearchHandlers } from './search';
import { registerTagHandlers } from './tags';
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
  registerTagHandlers();
  registerNoteHandlers();
}
