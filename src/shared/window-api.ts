/** Strongly-typed window.api contract — aligned with preload/index.ts runtime methods.
 *  Update BOTH files together when adding/removing IPC handlers. */
import type {
  AuthResponse,
  Blog,
  BlogWithTags,
  DraftItem,
  FolderTreeNode,
  FtsSearchResult,
  IndexableDoc,
  KnowledgeFileWithTags,
  LastBlog,
  LoginRequest,
  MemoType,
  Note,
  RecentFile,
  RecycleBinItem,
  Reference,
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
  blogDelete(data: { userId: number; blogId: number }): Promise<ApiResponse<void>>;
  blogRestore(data: { userId: number; blogId: number }): Promise<ApiResponse<void>>;
  blogExport(data: Record<string, unknown>): Promise<ApiResponse<{ path: string }>>;
  blogExportPdf(blogId: number): Promise<ApiResponse<{ path: string }>>;
  blogExportDocx(blogId: number): Promise<ApiResponse<{ path: string }>>;
  blogImportMd(data: Record<string, unknown>): Promise<ApiResponse<Blog[]>>;
  blogSaveDraft(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogGetHistory(blogId: number): Promise<ApiResponse<DraftItem[]>>;
  blogRollback(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogListAttachments(blogId: number): Promise<ApiResponse<{ filename: string; size: number; usedInBlog: boolean }[]>>;
  blogDeleteAttachment(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogCleanupAttachments(blogId: number): Promise<ApiResponse<{ deleted: number }>>;
  blogSetPinned(data: { id: number; userId: number; isPinned: number }): Promise<ApiResponse<void>>;
  blogSetColor(data: { id: number; userId: number; color: string | null }): Promise<ApiResponse<void>>;
  blogQuickCreate(data: Record<string, unknown>): Promise<ApiResponse<Blog>>;
  blogSeriesList(userId: number): Promise<ApiResponse<{ seriesId: string; seriesName: string; count: number }[]>>;
  blogSeriesGet(seriesId: string): Promise<ApiResponse<BlogWithTags[]>>;
  blogSeriesSet(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  blogSeriesRename(data: { seriesId: string; newName: string; userId: number }): Promise<ApiResponse<void>>;
  blogBatchDelete(data: { userId: number; blogIds: number[] }): Promise<ApiResponse<{ deleted: number }>>;
  blogBatchTag(data: Record<string, unknown>): Promise<ApiResponse<void>>;

  // Tag
  tagList(userId: number): Promise<ApiResponse<(Tag & { count?: number })[]>>;
  tagCreate(data: Record<string, unknown>): Promise<ApiResponse<Tag>>;
  tagUpdate(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  tagDelete(data: { userId: number; tagId: number }): Promise<ApiResponse<void>>;
  tagMerge(data: { userId: number; sourceId: number; targetId: number }): Promise<ApiResponse<void>>;
  tagSetBlog(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  tagSetFile(data: Record<string, unknown>): Promise<ApiResponse<void>>;

  // Knowledge Base — core
  kbList(filters?: Record<string, unknown>): Promise<ApiResponse<{ files: KnowledgeFileWithTags[]; total: number }>>;
  kbGet(data: { fileId: number; userId: number }): Promise<ApiResponse<KnowledgeFileWithTags>>;
  kbImport(data: Record<string, unknown>): Promise<ApiResponse<KnowledgeFileWithTags[]>>;
  kbDelete(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  kbRestore(data: { userId: number; fileId: number }): Promise<ApiResponse<void>>;
  kbRename(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  kbPreview(data: { fileId: number; userId: number }): Promise<ApiResponse<{ html?: string; fileType?: string }>>;
  kbOpenExternal(data: { fileId: number; userId: number }): Promise<ApiResponse<void>>;
  kbSetProperties(data: { fileId: number; userId: number; properties: Record<string, string> }): Promise<ApiResponse<void>>;
  kbUpdateContent(data: { fileId: number; userId: number; content: string }): Promise<ApiResponse<void>>;
  kbBatchDelete(data: { userId: number; fileIds: number[] }): Promise<ApiResponse<{ deleted: number }>>;

  // Search
  searchGlobal(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;
  searchBlogs(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;
  searchKb(data: Record<string, unknown>): Promise<ApiResponse<SearchResult[]>>;
  searchQuery(data: { query: string; userId: number }): Promise<ApiResponse<FtsSearchResult[]>>;
  searchGetDocuments(data: { userId: number }): Promise<ApiResponse<IndexableDoc[]>>;

  // Workspace
  workspaceExportZip(userId: number): Promise<ApiResponse<{ path: string }>>;
  workspaceGetInfo(userId: number): Promise<WorkspaceInfo>;
  workspaceSetPath(data: Record<string, unknown>): Promise<void>;
  workspaceMigrate(data: Record<string, unknown>): Promise<void>;
  workspaceOpenInFolder(userId: number): Promise<void>;
  workspaceExportMd(userId: number): Promise<ApiResponse<{ dir: string; count: number }>>;

  // Recycle Bin
  recycleList(userId: number): Promise<ApiResponse<RecycleBinItem[]>>;
  recycleRestore(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  recycleEmpty(userId: number): Promise<ApiResponse<{ removed: number }>>;
  recycleSetAutoClean(data: Record<string, unknown>): Promise<ApiResponse<{ cleaned: number }>>;
  recycleBatchRestore(data: Record<string, unknown>): Promise<ApiResponse<{ restored: number }>>;

  // References
  refAdd(data: Record<string, unknown>): Promise<ApiResponse<Reference>>;
  refRemove(refId: number): Promise<ApiResponse<void>>;
  refGetFrom(data: Record<string, unknown>): Promise<ApiResponse<Reference[]>>;
  refGetTo(data: Record<string, unknown>): Promise<ApiResponse<Reference[]>>;
  refSearch(data: Record<string, unknown>): Promise<ApiResponse<Reference[]>>;

  // Bookmarks (T2209)
  bookmarkAdd(data: { userId: number; targetType: string; targetId: number; title: string }): Promise<ApiResponse<{ id: number }>>;
  bookmarkRemove(data: { userId: number; targetType: string; targetId: number }): Promise<ApiResponse<void>>;
  bookmarkList(userId: number): Promise<ApiResponse<Array<{ id: number; targetType: string; targetId: number; title: string; createdAt: string }>>>;

  // AI (T2204)
  aiChat(data: Record<string, unknown>): Promise<ApiResponse<{ content: string }>>;
  aiTagSuggest(data: Record<string, unknown>): Promise<ApiResponse<{ tags: string[] }>>;

  // Quick Note (T2304)
  quickNoteShow(userId: number): Promise<void>;
  onQuickNoteTrigger(cb: () => void): () => void;

  // Clipboard (T2304)
  clipboardHistory(): Promise<ApiResponse<{ text: string; time: number }[]>>;
  clipboardClear(): Promise<ApiResponse<void>>;
  clipboardToggle(enable: boolean): Promise<ApiResponse<void>>;
  clipboardStatus(): Promise<ApiResponse<boolean>>;

  // Whiteboard (T2307)
  whiteboardGet(userId: number): Promise<ApiResponse<{ id: number; title: string; description: string; createdAt: string; updatedAt: string } | null>>;
  whiteboardNodes(data: { whiteboardId: number; userId: number }): Promise<ApiResponse<Array<{ id: number; whiteboardId: number; nodeType: string; refType: string | null; refId: number | null; title: string; summary: string; color: string; taskStatus: string; x: number; y: number; createdAt: string; updatedAt: string }>>>;
  whiteboardNodeCreate(data: Record<string, unknown>): Promise<ApiResponse<{ id: number }>>;
  whiteboardNodeUpdate(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  whiteboardNodeDelete(data: { nodeId: number; userId: number }): Promise<ApiResponse<void>>;
  whiteboardEdges(data: { whiteboardId: number; userId: number }): Promise<ApiResponse<Array<{ id: number; sourceNodeId: number; targetNodeId: number; edgeType: string; label: string }>>>;
  whiteboardEdgeCreate(data: Record<string, unknown>): Promise<ApiResponse<{ id: number }>>;
  whiteboardEdgeDelete(data: { edgeId: number; userId: number; whiteboardId: number }): Promise<ApiResponse<void>>;

  // Folder
  folderTree(data: Record<string, unknown>): Promise<ApiResponse<FolderTreeNode[]>>;
  folderCreate(data: Record<string, unknown>): Promise<ApiResponse<{ id: number }>>;
  folderRename(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  folderDelete(data: { userId: number; folderId: number }): Promise<ApiResponse<void>>;
  folderMoveItem(data: Record<string, unknown>): Promise<ApiResponse<void>>;
  folderMove(data: { userId: number; folderId: number; newParentId: number | null }): Promise<ApiResponse<void>>;

  // Web Scraping
  scrapeWebpage(url: string): Promise<ApiResponse<ScrapeResult>>;
  scrapeExtractToc(url: string): Promise<ApiResponse<{ title: string; href: string; level: number }[]>>;
  scrapeCollectManual(data: { userId: number; seriesName: string; entries: { title: string; href: string; level: number }[] }): Promise<ApiResponse<{ seriesId: string; seriesName: string; total: number; succeeded: number; failed: number }>>;
  onNavigate?(cb: (path: string) => void): () => void;
  onManualCollectProgress(cb: (data: { done: number; total: number; title: string; status: string }) => void): () => void;

  // Stats
  statsGet(userId: number): Promise<ApiResponse<UserStats>>;
  statsDaily(userId: number): Promise<ApiResponse<{ date: string; count: number }[]>>;

  // Backup
  backupList(): Promise<ApiResponse<{ filename: string; size: number; createdAt: string }[]>>;
  backupCreate(): Promise<ApiResponse<{ path: string }>>;
  backupRestore(filename: string): Promise<ApiResponse<{ needsRestart: boolean }>>;
  backupDelete(filename: string): Promise<ApiResponse<void>>;

  // Events
  onAppVisibility(cb: (state: 'hidden' | 'visible') => void): () => void;
  onTrayAction(cb: (action: string) => void): () => void;
  onPetAction(cb: (action: string) => void): () => void;
  onBlogRefresh(cb: () => void): () => void;
  onNoteRefresh(cb: () => void): () => void;
  onKbRefresh(cb: () => void): () => void;
  onAppError(cb: (error: { message: string }) => void): () => void;
  onUpdateStatus(cb: (data: { status: string; version?: string; percent?: number; message?: string }) => void): () => void;

  // Notes
  noteList(userId: number, memoType?: string, dueDateFrom?: string, dueDateTo?: string): Promise<ApiResponse<Note[]>>;
  noteCreate(data: {
    userId: number; content: string; source?: string;
    title?: string; memoType?: MemoType; dueDate?: string;
    noteId?: number;
  }): Promise<ApiResponse<Note>>;
  noteDelete(data: { userId: number; noteId: number }): Promise<ApiResponse<void>>;
  notePin(data: { userId: number; noteId: number }): Promise<ApiResponse<Note>>;
  noteClipboard(): Promise<ApiResponse<string>>;

  // Continue Writing
  continueGetDrafts(userId: number): Promise<ApiResponse<DraftItem[]>>;
  continueGetLastBlog(userId: number): Promise<ApiResponse<LastBlog | null>>;
  continueGetRecentFiles(userId: number): Promise<ApiResponse<RecentFile[]>>;

  // Graph (Phase 20C)
  graphGetData(userId: number, filter?: import('./types').GraphFilter): Promise<ApiResponse<import('./types').GraphData>>;

  // File System
  selectFiles(exts: string[]): Promise<string[] | undefined>;
  selectDir(): Promise<string | undefined>;

  // Shortcuts
  shortcutGetAll(): Promise<ApiResponse<import('./shortcuts').ShortcutDef[]>>;
  shortcutUpdate(id: string, key: string): Promise<ApiResponse<void>>;
  shortcutReset(): Promise<ApiResponse<void>>;

  // App
  bgImageRead(data: { filePath: string; userId: number }): Promise<ApiResponse<string>>;
  shellOpenExternal(url: string): Promise<ApiResponse<void>>;
  appGetVersion(): Promise<ApiResponse<string>>;
  appGetSystemLanguage(): Promise<ApiResponse<string>>;
  appSetAutoStart(enable: boolean): Promise<ApiResponse<void>>;
  appGetAutoStart(): Promise<ApiResponse<{ enabled: boolean }>>;
  appCreateStartMenuShortcut(): Promise<ApiResponse<void>>;
  appHasStartMenuShortcut(): Promise<ApiResponse<{ exists: boolean }>>;
  appCheckUpdate(): Promise<ApiResponse<{ updateAvailable: boolean; version: string | null }>>;
  appDownloadUpdate(): Promise<ApiResponse<void>>;
  appInstallUpdate(): Promise<ApiResponse<void>>;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}
