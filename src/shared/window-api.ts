/** Strongly-typed window.api contract — aligned with preload/index.ts runtime methods.
 *  Update BOTH files together when adding/removing IPC handlers. */
import type { AuthResponse, LoginRequest, RegisterRequest, WorkspaceInfo } from './types';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WindowApi {
  // Auth — matches preload variable names (not IPC channel names)
  login(req: LoginRequest): Promise<AuthResponse>;
  register(req: RegisterRequest): Promise<AuthResponse>;
  logout(token: string): Promise<void>;
  verifyToken(token: string): Promise<AuthResponse>;
  deleteAccount(data: { userId: number; keepFiles: boolean }): Promise<{ success: boolean; error?: string }>;

  // Blog
  blogList(filters?: object): Promise<unknown>;
  blogGet(blogId: number): Promise<unknown>;
  blogCreate(data: object): Promise<unknown>;
  blogUpdate(data: object): Promise<unknown>;
  blogDelete(blogId: number): Promise<unknown>;
  blogRestore(blogId: number): Promise<unknown>;
  blogExport(data: object): Promise<unknown>;
  blogExportPdf(blogId: number): Promise<unknown>;
  blogExportDocx(blogId: number): Promise<unknown>;
  blogImportMd(data: object): Promise<unknown>;
  blogSaveDraft(data: object): Promise<unknown>;
  blogGetHistory(blogId: number): Promise<unknown>;
  blogRollback(data: object): Promise<unknown>;
  blogListAttachments(blogId: number): Promise<unknown>;
  blogDeleteAttachment(data: object): Promise<unknown>;
  blogCleanupAttachments(blogId: number): Promise<unknown>;
  blogQuickCreate(data: object): Promise<unknown>;
  blogSeriesList(userId: number): Promise<unknown>;
  blogSeriesGet(seriesId: string): Promise<unknown>;
  blogSeriesSet(data: object): Promise<unknown>;
  blogBatchDelete(blogIds: number[]): Promise<unknown>;
  blogBatchTag(data: object): Promise<unknown>;

  // Tag
  tagList(userId: number): Promise<unknown>;
  tagCreate(data: object): Promise<unknown>;
  tagUpdate(data: object): Promise<unknown>;
  tagDelete(tagId: number): Promise<unknown>;
  tagSetBlog(data: object): Promise<unknown>;
  tagSetFile(data: object): Promise<unknown>;

  // Knowledge Base
  kbList(filters?: object): Promise<unknown>;
  kbGet(fileId: number): Promise<unknown>;
  kbImport(data: object): Promise<unknown>;
  kbDelete(data: object): Promise<unknown>;
  kbRestore(fileId: number): Promise<unknown>;
  kbRename(data: object): Promise<unknown>;
  kbPreview(fileId: number): Promise<unknown>;
  kbOpenExternal(fileId: number): Promise<unknown>;
  kbBatchDelete(fileIds: number[]): Promise<unknown>;

  // Search
  searchGlobal(data: object): Promise<unknown>;
  searchBlogs(data: object): Promise<unknown>;
  searchKb(data: object): Promise<unknown>;

  // Workspace
  workspaceGetInfo(userId: number): Promise<WorkspaceInfo>;
  workspaceSetPath(data: object): Promise<void>;
  workspaceMigrate(data: object): Promise<void>;
  workspaceOpenInFolder(userId: number): Promise<void>;

  // Recycle Bin
  recycleList(userId: number): Promise<unknown>;
  recycleRestore(data: object): Promise<void>;
  recycleEmpty(userId: number): Promise<void>;
  recycleSetAutoClean(data: object): Promise<void>;
  recycleBatchRestore(data: object): Promise<unknown>;

  // References
  refAdd(data: object): Promise<unknown>;
  refRemove(refId: number): Promise<unknown>;
  refGetFrom(data: object): Promise<unknown>;
  refGetTo(data: object): Promise<unknown>;
  refSearch(data: object): Promise<unknown>;

  // Folder
  folderTree(data: object): Promise<unknown>;
  folderCreate(data: object): Promise<unknown>;
  folderRename(data: object): Promise<unknown>;
  folderDelete(folderId: number): Promise<unknown>;
  folderMoveItem(data: object): Promise<unknown>;

  // Web Scraping
  scrapeWebpage(url: string): Promise<unknown>;

  // Stats
  statsGet(userId: number): Promise<unknown>;
  statsDaily(userId: number): Promise<unknown>;

  // Backup
  backupList(): Promise<unknown>;
  backupCreate(): Promise<unknown>;
  backupRestore(filename: string): Promise<unknown>;
  backupDelete(filename: string): Promise<unknown>;

  // Events
  onTrayAction(cb: (action: string) => void): () => void;
  onPetAction(cb: (action: string) => void): () => void;

  // File System
  selectFiles(exts: string[]): Promise<string[] | undefined>;
  selectDir(): Promise<string | undefined>;

  // App
  appGetVersion(): Promise<unknown>;
  appGetSystemLanguage(): Promise<unknown>;
  appSetAutoStart(enable: boolean): Promise<unknown>;
  appGetAutoStart(): Promise<unknown>;
  appCreateStartMenuShortcut(): Promise<unknown>;
  appHasStartMenuShortcut(): Promise<unknown>;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
