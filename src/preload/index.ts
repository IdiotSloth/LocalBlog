import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { WindowApi } from '../shared/window-api';

const api: WindowApi = {
  // Auth
  login: (req) => ipcRenderer.invoke(IPC.AUTH_LOGIN, req),
  register: (req) => ipcRenderer.invoke(IPC.AUTH_REGISTER, req),
  logout: (token) => ipcRenderer.invoke(IPC.AUTH_LOGOUT, token),
  verifyToken: (token) => ipcRenderer.invoke(IPC.AUTH_VERIFY_TOKEN, token),
  deleteAccount: (data) => ipcRenderer.invoke(IPC.AUTH_DELETE_ACCOUNT, data),

  // Blog — core
  blogList: (filters) => ipcRenderer.invoke(IPC.BLOG_LIST, filters),
  blogGet: (blogId) => ipcRenderer.invoke(IPC.BLOG_GET, blogId),
  blogCreate: (data) => ipcRenderer.invoke(IPC.BLOG_CREATE, data),
  blogUpdate: (data) => ipcRenderer.invoke(IPC.BLOG_UPDATE, data),
  blogDelete: (data) => ipcRenderer.invoke(IPC.BLOG_DELETE, data),
  blogRestore: (data) => ipcRenderer.invoke(IPC.BLOG_RESTORE, data),
  blogExport: (data) => ipcRenderer.invoke(IPC.BLOG_EXPORT, data),
  blogExportPdf: (blogId) => ipcRenderer.invoke(IPC.BLOG_EXPORT_PDF, blogId),
  blogExportDocx: (blogId) => ipcRenderer.invoke(IPC.BLOG_EXPORT_DOCX, blogId),
  blogImportMd: (data) => ipcRenderer.invoke(IPC.BLOG_IMPORT_MD, data),
  blogSaveDraft: (data) => ipcRenderer.invoke(IPC.BLOG_SAVE_DRAFT, data),
  blogGetHistory: (blogId) => ipcRenderer.invoke(IPC.BLOG_GET_HISTORY, blogId),
  blogRollback: (data) => ipcRenderer.invoke(IPC.BLOG_ROLLBACK, data),
  blogSetPinned: (data) => ipcRenderer.invoke(IPC.BLOG_SET_PINNED, data),
  blogSetColor: (data) => ipcRenderer.invoke(IPC.BLOG_SET_COLOR, data),
  blogListAttachments: (blogId) => ipcRenderer.invoke(IPC.BLOG_LIST_ATTACHMENTS, blogId),
  blogDeleteAttachment: (data) => ipcRenderer.invoke(IPC.BLOG_DELETE_ATTACHMENT, data),
  blogCleanupAttachments: (blogId) => ipcRenderer.invoke(IPC.BLOG_CLEANUP_ATTACHMENTS, blogId),
  blogQuickCreate: (data) => ipcRenderer.invoke(IPC.BLOG_QUICK_CREATE, data),
  blogSeriesList: (userId) => ipcRenderer.invoke(IPC.BLOG_SERIES_LIST, userId),
  blogSeriesGet: (seriesId) => ipcRenderer.invoke(IPC.BLOG_SERIES_GET, seriesId),
  blogSeriesSet: (data) => ipcRenderer.invoke(IPC.BLOG_SERIES_SET, data),
  blogSeriesRename: (data) => ipcRenderer.invoke(IPC.BLOG_SERIES_RENAME, data),
  blogBatchDelete: (data) => ipcRenderer.invoke(IPC.BLOG_BATCH_DELETE, data),
  blogBatchTag: (data) => ipcRenderer.invoke(IPC.BLOG_BATCH_TAG, data),

  // Tag
  tagList: (userId) => ipcRenderer.invoke(IPC.TAG_LIST, userId),
  tagCreate: (data) => ipcRenderer.invoke(IPC.TAG_CREATE, data),
  tagUpdate: (data) => ipcRenderer.invoke(IPC.TAG_UPDATE, data),
  tagDelete: (data) => ipcRenderer.invoke(IPC.TAG_DELETE, data),
  tagMerge: (data) => ipcRenderer.invoke(IPC.TAG_MERGE, data),
  tagSetBlog: (data) => ipcRenderer.invoke(IPC.TAG_SET_BLOG, data),
  tagSetFile: (data) => ipcRenderer.invoke(IPC.TAG_SET_FILE, data),

  // Knowledge Base
  kbList: (filters) => ipcRenderer.invoke(IPC.KB_LIST, filters),
  kbGet: (data) => ipcRenderer.invoke(IPC.KB_GET, data),
  kbImport: (data) => ipcRenderer.invoke(IPC.KB_IMPORT, data),
  kbDelete: (data) => ipcRenderer.invoke(IPC.KB_DELETE, data),
  kbRestore: (data) => ipcRenderer.invoke(IPC.KB_RESTORE, data),
  kbRename: (data) => ipcRenderer.invoke(IPC.KB_RENAME, data),
  kbPreview: (data) => ipcRenderer.invoke(IPC.KB_PREVIEW, data),
  kbOpenExternal: (data) => ipcRenderer.invoke(IPC.KB_OPEN_EXTERNAL, data),
  kbBatchDelete: (data) => ipcRenderer.invoke(IPC.KB_BATCH_DELETE, data),
  kbSetProperties: (data) => ipcRenderer.invoke(IPC.KB_SET_PROPERTIES, data),
  kbUpdateContent: (data) => ipcRenderer.invoke(IPC.KB_UPDATE_CONTENT, data),

  // Search
  searchGlobal: (data) => ipcRenderer.invoke(IPC.SEARCH_GLOBAL, data),
  searchBlogs: (data) => ipcRenderer.invoke(IPC.SEARCH_BLOGS, data),
  searchKb: (data) => ipcRenderer.invoke(IPC.SEARCH_KB, data),
  searchQuery: (data) => ipcRenderer.invoke(IPC.SEARCH_QUERY, data),
  searchGetDocuments: (data) => ipcRenderer.invoke(IPC.SEARCH_GET_DOCUMENTS, data),

  // Workspace
  workspaceExportZip: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_EXPORT_ZIP, userId),
  workspaceGetInfo: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_GET_INFO, userId),
  workspaceSetPath: (data) => ipcRenderer.invoke(IPC.WORKSPACE_SET_PATH, data),
  workspaceMigrate: (data) => ipcRenderer.invoke(IPC.WORKSPACE_MIGRATE, data),
  workspaceOpenInFolder: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_OPEN_IN_FOLDER, userId),
  workspaceExportMd: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_EXPORT_MD, userId),

  // Recycle Bin
  recycleList: (userId) => ipcRenderer.invoke(IPC.RECYCLE_LIST, userId),
  recycleRestore: (data) => ipcRenderer.invoke(IPC.RECYCLE_RESTORE, data),
  recycleEmpty: (userId) => ipcRenderer.invoke(IPC.RECYCLE_EMPTY, userId),
  recycleSetAutoClean: (data) => ipcRenderer.invoke(IPC.RECYCLE_SET_AUTO_CLEAN, data),
  recycleBatchRestore: (data) => ipcRenderer.invoke(IPC.RECYCLE_BATCH_RESTORE, data),

  // References
  refAdd: (data) => ipcRenderer.invoke(IPC.REF_ADD, data),
  refRemove: (refId) => ipcRenderer.invoke(IPC.REF_REMOVE, refId),
  refGetFrom: (data) => ipcRenderer.invoke(IPC.REF_GET_FROM, data),
  refGetTo: (data) => ipcRenderer.invoke(IPC.REF_GET_TO, data),
  refSearch: (data) => ipcRenderer.invoke(IPC.REF_SEARCH, data),

  // Bookmarks (T2209)
  bookmarkAdd: (data) => ipcRenderer.invoke(IPC.BOOKMARK_ADD, data),
  bookmarkRemove: (data) => ipcRenderer.invoke(IPC.BOOKMARK_REMOVE, data),
  bookmarkList: (userId) => ipcRenderer.invoke(IPC.BOOKMARK_LIST, userId),

  // AI (T2204)
  aiChat: (data) => ipcRenderer.invoke(IPC.AI_CHAT, data),
  aiTagSuggest: (data) => ipcRenderer.invoke(IPC.AI_TAG_SUGGEST, data),

  // Quick Note (T2304)
  quickNoteShow: (userId) => ipcRenderer.invoke(IPC.QUICK_NOTE_SHOW, userId),
  onQuickNoteTrigger: (cb: () => void) => {
    const h = () => cb();
    ipcRenderer.on(IPC.EVT_QUICK_NOTE_TRIGGER, h);
    return () => ipcRenderer.removeListener(IPC.EVT_QUICK_NOTE_TRIGGER, h);
  },

  // Clipboard (T2304)
  clipboardHistory: () => ipcRenderer.invoke(IPC.CLIPBOARD_HISTORY),
  clipboardClear: () => ipcRenderer.invoke(IPC.CLIPBOARD_CLEAR),
  clipboardToggle: (data: { enable: boolean; userId: number }) => ipcRenderer.invoke(IPC.CLIPBOARD_TOGGLE, data),
  clipboardStatus: () => ipcRenderer.invoke(IPC.CLIPBOARD_STATUS),

  // Whiteboard (T2307)
  whiteboardGet: (userId) => ipcRenderer.invoke(IPC.WHITEBOARD_GET, userId),
  whiteboardNodes: (whiteboardId) => ipcRenderer.invoke(IPC.WHITEBOARD_NODES, whiteboardId),
  whiteboardNodeCreate: (data) => ipcRenderer.invoke(IPC.WHITEBOARD_NODE_CREATE, data),
  whiteboardNodeUpdate: (data) => ipcRenderer.invoke(IPC.WHITEBOARD_NODE_UPDATE, data),
  whiteboardNodeDelete: (nodeId) => ipcRenderer.invoke(IPC.WHITEBOARD_NODE_DELETE, nodeId),
  whiteboardEdges: (whiteboardId) => ipcRenderer.invoke(IPC.WHITEBOARD_EDGES, whiteboardId),
  whiteboardEdgeCreate: (data) => ipcRenderer.invoke(IPC.WHITEBOARD_EDGE_CREATE, data),
  whiteboardEdgeDelete: (edgeId) => ipcRenderer.invoke(IPC.WHITEBOARD_EDGE_DELETE, edgeId),

  // Folder
  folderTree: (data) => ipcRenderer.invoke(IPC.FOLDER_TREE, data),
  folderCreate: (data) => ipcRenderer.invoke(IPC.FOLDER_CREATE, data),
  folderRename: (data) => ipcRenderer.invoke(IPC.FOLDER_RENAME, data),
  folderDelete: (data) => ipcRenderer.invoke(IPC.FOLDER_DELETE, data),
  folderMoveItem: (data) => ipcRenderer.invoke(IPC.FOLDER_MOVE_ITEM, data),
  folderMove: (data) => ipcRenderer.invoke(IPC.FOLDER_MOVE, data),

  // Web Scraping
  scrapeWebpage: (url) => ipcRenderer.invoke(IPC.SCRAPE_WEBPAGE, url),
  scrapeExtractToc: (url) => ipcRenderer.invoke(IPC.SCRAPE_EXTRACT_TOC, url),
  scrapeCollectManual: (data) => ipcRenderer.invoke(IPC.SCRAPE_COLLECT_MANUAL, data),

  // Stats
  statsGet: (userId) => ipcRenderer.invoke(IPC.STATS_GET, userId),
  statsDaily: (userId) => ipcRenderer.invoke(IPC.STATS_DAILY, userId),

  // Backup
  backupList: () => ipcRenderer.invoke(IPC.BACKUP_LIST),
  backupCreate: () => ipcRenderer.invoke(IPC.BACKUP_CREATE),
  backupRestore: (filename) => ipcRenderer.invoke(IPC.BACKUP_RESTORE, filename),
  backupDelete: (filename) => ipcRenderer.invoke(IPC.BACKUP_DELETE, filename),

  // Events — Electron → Renderer
  onAppVisibility: (cb) => {
    const handler = (_event: any, state: string) => cb(state as 'hidden' | 'visible');
    ipcRenderer.on(IPC.APP_VISIBILITY, handler);
    return () => ipcRenderer.removeListener(IPC.APP_VISIBILITY, handler);
  },
  onTrayAction: (cb) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on(IPC.EVT_TRAY_ACTION, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_TRAY_ACTION, handler);
  },
  onPetAction: (cb) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on(IPC.EVT_PET_ACTION, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_PET_ACTION, handler);
  },
  onNavigate: (cb) => {
    const handler = (_event: any, path: string) => cb(path);
    ipcRenderer.on(IPC.EVT_NAVIGATE, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_NAVIGATE, handler);
  },
  onBlogRefresh: (cb) => {
    const handler = () => cb();
    ipcRenderer.on(IPC.EVT_BLOG_REFRESH, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_BLOG_REFRESH, handler);
  },
  onManualCollectProgress: (cb) => {
    const handler = (_e: unknown, data: { done: number; total: number; title: string; status: string }) => cb(data);
    ipcRenderer.on(IPC.EVT_MANUAL_COLLECT_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_MANUAL_COLLECT_PROGRESS, handler);
  },
  onNoteRefresh: (cb) => {
    const handler = () => cb();
    ipcRenderer.on(IPC.EVT_NOTE_REFRESH, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_NOTE_REFRESH, handler);
  },
  onAppError: (cb) => {
    const handler = (_e: unknown, data: { message: string }) => cb(data);
    ipcRenderer.on(IPC.EVT_APP_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_APP_ERROR, handler);
  },
  onUpdateStatus: (cb: (data: { status: string; version?: string; percent?: number }) => void) => {
    const handler = (_e: unknown, data: { status: string; version?: string; percent?: number }) => cb(data);
    ipcRenderer.on(IPC.EVT_UPDATE_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_UPDATE_STATUS, handler);
  },
  onKbRefresh: (cb) => {
    const handler = () => cb();
    ipcRenderer.on(IPC.EVT_KB_REFRESH, handler);
    return () => ipcRenderer.removeListener(IPC.EVT_KB_REFRESH, handler);
  },

  // Notes
  noteList: (userId, memoType, dueDateFrom, dueDateTo) => ipcRenderer.invoke(IPC.NOTE_LIST, userId, memoType, dueDateFrom, dueDateTo),
  noteCreate: (data) => ipcRenderer.invoke(IPC.NOTE_CREATE, data),
  noteDelete: (data) => ipcRenderer.invoke(IPC.NOTE_DELETE, data),
  notePin: (data) => ipcRenderer.invoke(IPC.NOTE_PIN, data),
  noteClipboard: () => ipcRenderer.invoke(IPC.NOTE_CLIPBOARD),
  noteImageSave: (data: { userId: number; base64: string }) => ipcRenderer.invoke(IPC.NOTE_IMAGE_SAVE, data),

  // Continue Writing
  continueGetDrafts: (userId) => ipcRenderer.invoke(IPC.CONTINUE_GET_DRAFTS, userId),
  continueGetLastBlog: (userId) => ipcRenderer.invoke(IPC.CONTINUE_GET_LAST_BLOG, userId),
  continueGetRecentFiles: (userId) => ipcRenderer.invoke(IPC.CONTINUE_GET_RECENT_FILES, userId),
  // File System Dialogs
  selectFiles: (exts) => ipcRenderer.invoke(IPC.FS_SELECT_FILES, { extensions: exts }),
  selectDir: () => ipcRenderer.invoke(IPC.FS_SELECT_DIR),

  // Shortcuts
  shortcutGetAll: () => ipcRenderer.invoke(IPC.SHORTCUT_GET_ALL),
  shortcutUpdate: (id, key) => ipcRenderer.invoke(IPC.SHORTCUT_UPDATE, id, key),
  shortcutReset: () => ipcRenderer.invoke(IPC.SHORTCUT_RESET),

  // App
  bgImageRead: (data: { filePath: string; userId: number }) => ipcRenderer.invoke(IPC.BG_IMAGE_READ, data),
  shellOpenExternal: (url: string) => ipcRenderer.invoke(IPC.SHELL_OPEN_EXTERNAL, url),
  appGetVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  appGetSystemLanguage: () => ipcRenderer.invoke(IPC.APP_GET_SYSTEM_LANGUAGE),
  appSetAutoStart: (enable) => ipcRenderer.invoke(IPC.APP_SET_AUTO_START, enable),
  appGetAutoStart: () => ipcRenderer.invoke(IPC.APP_GET_AUTO_START),
  appCreateStartMenuShortcut: () => ipcRenderer.invoke(IPC.APP_CREATE_START_MENU_SHORTCUT),
  appHasStartMenuShortcut: () => ipcRenderer.invoke(IPC.APP_HAS_START_MENU_SHORTCUT),
  appCheckUpdate: () => ipcRenderer.invoke(IPC.APP_CHECK_UPDATE),
  appDownloadUpdate: () => ipcRenderer.invoke(IPC.APP_DOWNLOAD_UPDATE),
  appInstallUpdate: () => ipcRenderer.invoke(IPC.APP_INSTALL_UPDATE),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
