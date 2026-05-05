import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { AuthResponse, LoginRequest, RegisterRequest, WorkspaceInfo } from '../shared/types';
import type { WindowApi } from '../shared/window-api';

const api: WindowApi = {
  // Auth
  login: (req: LoginRequest): Promise<AuthResponse> => ipcRenderer.invoke(IPC.AUTH_LOGIN, req),
  register: (req: RegisterRequest): Promise<AuthResponse> => ipcRenderer.invoke(IPC.AUTH_REGISTER, req),
  logout: (token: string): Promise<void> => ipcRenderer.invoke(IPC.AUTH_LOGOUT, token),
  verifyToken: (token: string): Promise<AuthResponse> => ipcRenderer.invoke(IPC.AUTH_VERIFY_TOKEN, token),
  deleteAccount: (data: { userId: number; keepFiles: boolean }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC.AUTH_DELETE_ACCOUNT, data),

  // Blog — returns ApiResponse<T> = { success: boolean; data?: T; error?: string }
  blogList: (filters?: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_LIST, filters),
  blogGet: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_GET, blogId),
  blogCreate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_CREATE, data),
  blogUpdate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_UPDATE, data),
  blogDelete: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_DELETE, blogId),
  blogRestore: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_RESTORE, blogId),
  blogExport: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_EXPORT, data),
  blogExportPdf: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_EXPORT_PDF, blogId),
  blogExportDocx: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_EXPORT_DOCX, blogId),
  blogImportMd: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_IMPORT_MD, data),
  blogSaveDraft: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_SAVE_DRAFT, data),
  blogGetHistory: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_GET_HISTORY, blogId),
  blogRollback: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_ROLLBACK, data),
  blogListAttachments: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_LIST_ATTACHMENTS, blogId),
  blogDeleteAttachment: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_DELETE_ATTACHMENT, data),
  blogCleanupAttachments: (blogId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_CLEANUP_ATTACHMENTS, blogId),
  blogQuickCreate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_QUICK_CREATE, data),
  blogSeriesList: (userId: number): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_SERIES_LIST, userId),
  blogSeriesGet: (seriesId: string): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_SERIES_GET, seriesId),
  blogSeriesSet: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_SERIES_SET, data),
  blogBatchDelete: (blogIds: number[]): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_BATCH_DELETE, blogIds),
  blogBatchTag: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.BLOG_BATCH_TAG, data),
  kbBatchDelete: (fileIds: number[]): Promise<unknown> => ipcRenderer.invoke(IPC.KB_BATCH_DELETE, fileIds),
  recycleBatchRestore: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.RECYCLE_BATCH_RESTORE, data),

  // Tag
  tagList: (userId: number): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_LIST, userId),
  tagCreate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_CREATE, data),
  tagUpdate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_UPDATE, data),
  tagDelete: (tagId: number): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_DELETE, tagId),
  tagSetBlog: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_SET_BLOG, data),
  tagSetFile: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.TAG_SET_FILE, data),

  // Knowledge Base
  kbList: (filters?: object): Promise<unknown> => ipcRenderer.invoke(IPC.KB_LIST, filters),
  kbGet: (fileId: number): Promise<unknown> => ipcRenderer.invoke(IPC.KB_GET, fileId),
  kbImport: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.KB_IMPORT, data),
  kbDelete: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.KB_DELETE, data),
  kbRestore: (fileId: number): Promise<unknown> => ipcRenderer.invoke(IPC.KB_RESTORE, fileId),
  kbRename: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.KB_RENAME, data),
  kbPreview: (fileId: number): Promise<unknown> => ipcRenderer.invoke(IPC.KB_PREVIEW, fileId),
  kbOpenExternal: (fileId: number): Promise<unknown> => ipcRenderer.invoke(IPC.KB_OPEN_EXTERNAL, fileId),

  // Search
  searchGlobal: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.SEARCH_GLOBAL, data),
  searchBlogs: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.SEARCH_BLOGS, data),
  searchKb: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.SEARCH_KB, data),

  // Workspace
  workspaceGetInfo: (userId: number): Promise<WorkspaceInfo> => ipcRenderer.invoke(IPC.WORKSPACE_GET_INFO, userId),
  workspaceSetPath: (data: object): Promise<void> => ipcRenderer.invoke(IPC.WORKSPACE_SET_PATH, data),
  workspaceMigrate: (data: object): Promise<void> => ipcRenderer.invoke(IPC.WORKSPACE_MIGRATE, data),
  workspaceOpenInFolder: (userId: number): Promise<void> => ipcRenderer.invoke(IPC.WORKSPACE_OPEN_IN_FOLDER, userId),

  // Recycle Bin
  recycleList: (userId: number): Promise<unknown> => ipcRenderer.invoke(IPC.RECYCLE_LIST, userId),
  recycleRestore: (data: object): Promise<void> => ipcRenderer.invoke(IPC.RECYCLE_RESTORE, data),
  recycleEmpty: (userId: number): Promise<void> => ipcRenderer.invoke(IPC.RECYCLE_EMPTY, userId),
  recycleSetAutoClean: (data: object): Promise<void> => ipcRenderer.invoke(IPC.RECYCLE_SET_AUTO_CLEAN, data),

  // References
  refAdd: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.REF_ADD, data),
  refRemove: (refId: number): Promise<unknown> => ipcRenderer.invoke(IPC.REF_REMOVE, refId),
  refGetFrom: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.REF_GET_FROM, data),
  refGetTo: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.REF_GET_TO, data),
  refSearch: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.REF_SEARCH, data),

  // Folder
  folderTree: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.FOLDER_TREE, data),
  folderCreate: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.FOLDER_CREATE, data),
  folderRename: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.FOLDER_RENAME, data),
  folderDelete: (folderId: number): Promise<unknown> => ipcRenderer.invoke(IPC.FOLDER_DELETE, folderId),
  folderMoveItem: (data: object): Promise<unknown> => ipcRenderer.invoke(IPC.FOLDER_MOVE_ITEM, data),

  // Web Scraping
  scrapeWebpage: (url: string): Promise<unknown> => ipcRenderer.invoke(IPC.SCRAPE_WEBPAGE, url),

  // Stats
  statsGet: (userId: number): Promise<unknown> => ipcRenderer.invoke(IPC.STATS_GET, userId),
  statsDaily: (userId: number): Promise<unknown> => ipcRenderer.invoke(IPC.STATS_DAILY, userId),

  // Backup
  backupList: (): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_LIST),
  backupCreate: (): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_CREATE),
  backupRestore: (filename: string): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_RESTORE, filename),
  backupDelete: (filename: string): Promise<unknown> => ipcRenderer.invoke(IPC.BACKUP_DELETE, filename),

  // Events — Electron → Renderer
  onTrayAction: (cb: (action: string) => void): (() => void) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on('tray-action', handler);
    return () => ipcRenderer.removeListener('tray-action', handler);
  },
  onPetAction: (cb: (action: string) => void): (() => void) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on('pet-action', handler);
    return () => ipcRenderer.removeListener('pet-action', handler);
  },

  // File System Dialogs
  selectDir: (): Promise<string | null> => ipcRenderer.invoke(IPC.FS_SELECT_DIR),
  selectFiles: (extensions: string[]): Promise<string[]> => ipcRenderer.invoke(IPC.FS_SELECT_FILES, { extensions }),

  // App
  getVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  getSystemLanguage: (): Promise<string> => ipcRenderer.invoke(IPC.APP_GET_SYSTEM_LANGUAGE),
  setAutoStart: (enabled: boolean): Promise<unknown> => ipcRenderer.invoke(IPC.APP_SET_AUTO_START, enabled),
  getAutoStart: (): Promise<unknown> => ipcRenderer.invoke(IPC.APP_GET_AUTO_START),
  createStartMenuShortcut: (): Promise<unknown> => ipcRenderer.invoke(IPC.APP_CREATE_START_MENU_SHORTCUT),
  hasStartMenuShortcut: (): Promise<unknown> => ipcRenderer.invoke(IPC.APP_HAS_START_MENU_SHORTCUT),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
