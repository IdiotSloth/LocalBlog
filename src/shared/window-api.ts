/** Strongly-typed window.api contract — aligned with preload/index.ts runtime methods.
 *  Update BOTH files together when adding/removing IPC handlers. */
import type {
  AuthResponse,
  Blog,
  BlogWithTags,
  FolderTreeNode,
  KnowledgeFileWithTags,
  LoginRequest,
  RecycleBinItem,
  RegisterRequest,
  ScrapeResult,
  SearchResult,
  Tag,
  UserStats,
  WorkspaceInfo,
} from './types';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WindowApi {
  // Auth
  login(req: LoginRequest): Promise<AuthResponse>;
  register(req: RegisterRequest): Promise<AuthResponse>;
  logout(token: string): Promise<void>;
  verifyToken(token: string): Promise<AuthResponse>;
  deleteAccount(data: { userId: number; keepFiles: boolean }): Promise<{ success: boolean; error?: string }>;

  // Blog — core
  blogList(filters?: Record<string, unknown>): Promise<ApiResponse<{ blogs: BlogWithTags[]; total: number }>>;
  blogGet(blogId: number): Promise<ApiResponse<BlogWithTags>>;
  blogCreate(data: Record<string, unknown>): Promise<ApiResponse<Blog>>;
  blogUpdate(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogDelete(blogId: number): Promise<ApiResponse<void>>;
  blogRestore(blogId: number): Promise<ApiResponse<void>>;
  blogExport(data: Record<string, unknown>): Promise<ApiResponse<{ path: string }>>;
  blogExportPdf(blogId: number): Promise<ApiResponse<{ path: string }>>;
  blogExportDocx(blogId: number): Promise<ApiResponse<{ path: string }>>;
  blogImportMd(data: Record<string, unknown>): Promise<ApiResponse<Blog[]>>;
  blogSaveDraft(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogGetHistory(blogId: number): Promise<ApiResponse<Record<string, unknown>[]>>;
  blogRollback(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogListAttachments(blogId: number): Promise<ApiResponse<{ filename: string; size: number; usedInBlog: boolean }[]>>;
  blogDeleteAttachment(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogCleanupAttachments(blogId: number): Promise<ApiResponse<{ deleted: number }>>;
  blogQuickCreate(data: Record<string, unknown>): Promise<ApiResponse<Blog>>;
  blogSeriesList(userId: number): Promise<ApiResponse<Record<string, unknown>[]>>;
  blogSeriesGet(seriesId: string): Promise<ApiResponse<Record<string, unknown>>>;
  blogSeriesSet(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogBatchDelete(blogIds: number[]): Promise<ApiResponse<{ deleted: number }>>;
  blogBatchTag(data: Record<string, unknown>): Promise<ApiResponse<void>>;

  // Tag
  tagList(userId: number): Promise<ApiResponse<(Tag & { count?: number })[]>>;
  tagCreate(data: Record<string, unknown>): Promise<ApiResponse<Tag>>;
  tagUpdate(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  tagDelete(tagId: number): Promise<ApiResponse<void>>;
  tagSetBlog(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  tagSetFile(data: Record<string, unknown>): Promise<ApiResponse<void>>;

  // Knowledge Base — core
  kbList(filters?: Record<string, unknown>): Promise<ApiResponse<{ files: KnowledgeFileWithTags[]; total: number }>>;
  kbGet(fileId: number): Promise<ApiResponse<KnowledgeFileWithTags>>;
  kbImport(data: Record<string, unknown>): Promise<ApiResponse<KnowledgeFileWithTags[]>>;
  kbDelete(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  kbRestore(fileId: number): Promise<ApiResponse<void>>;
  kbRename(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  kbPreview(fileId: number): Promise<ApiResponse<{ filename: string; fileType: string; content?: string }>>;
  kbOpenExternal(fileId: number): Promise<ApiResponse<void>>;
  kbBatchDelete(fileIds: number[]): Promise<ApiResponse<{ deleted: number }>>;

  // Search
  searchGlobal(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;
  searchBlogs(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;
  searchKb(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;

  // Workspace
  workspaceGetInfo(userId: number): Promise<WorkspaceInfo>;
  workspaceSetPath(data: Record<string, unknown>): Promise<void>;
  workspaceMigrate(data: Record<string, unknown>): Promise<void>;
  workspaceOpenInFolder(userId: number): Promise<void>;

  // Recycle Bin
  recycleList(userId: number): Promise<ApiResponse<RecycleBinItem[]>>;
  recycleRestore(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  recycleEmpty(userId: number): Promise<ApiResponse<{ removed: number }>>;
  recycleSetAutoClean(data: Record<string, unknown>): Promise<ApiResponse<{ cleaned: number }>>;
  recycleBatchRestore(data: Record<string, unknown>): Promise<ApiResponse<{ restored: number }>>;

  // References
  refAdd(data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>>;
  refRemove(refId: number): Promise<ApiResponse<void>>;
  refGetFrom(data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>[]>>;
  refGetTo(data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>[]>>;
  refSearch(data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>[]>>;

  // Folder
  folderTree(data: Record<string, unknown>): Promise<ApiResponse<FolderTreeNode[]>>;
  folderCreate(data: Record<string, unknown>): Promise<ApiResponse<{ id: number }>>;
  folderRename(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  folderDelete(folderId: number): Promise<ApiResponse<void>>;
  folderMoveItem(data: Record<string, unknown>): Promise<ApiResponse<void>>;

  // Web Scraping
  scrapeWebpage(url: string): Promise<ApiResponse<ScrapeResult>>;

  // Stats
  statsGet(userId: number): Promise<ApiResponse<UserStats>>;
  statsDaily(userId: number): Promise<ApiResponse<{ date: string; count: number }[]>>;

  // Backup
  backupList(): Promise<ApiResponse<{ filename: string; size: number; createdAt: string }[]>>;
  backupCreate(): Promise<ApiResponse<{ path: string }>>;
  backupRestore(filename: string): Promise<ApiResponse<{ needsRestart: boolean }>>;
  backupDelete(filename: string): Promise<ApiResponse<void>>;

  // Events
  onTrayAction(cb: (action: string) => void): () => void;
  onPetAction(cb: (action: string) => void): () => void;

  // File System
  selectFiles(exts: string[]): Promise<string[] | undefined>;
  selectDir(): Promise<string | undefined>;

  // App
  appGetVersion(): Promise<ApiResponse<string>>;
  appGetSystemLanguage(): Promise<ApiResponse<string>>;
  appSetAutoStart(enable: boolean): Promise<ApiResponse<void>>;
  appGetAutoStart(): Promise<ApiResponse<{ enabled: boolean }>>;
  appCreateStartMenuShortcut(): Promise<ApiResponse<void>>;
  appHasStartMenuShortcut(): Promise<ApiResponse<{ exists: boolean }>>;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
