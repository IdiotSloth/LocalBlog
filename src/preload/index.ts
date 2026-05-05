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
  blogDelete: (blogId) => ipcRenderer.invoke(IPC.BLOG_DELETE, blogId),
  blogRestore: (blogId) => ipcRenderer.invoke(IPC.BLOG_RESTORE, blogId),
  blogExport: (data) => ipcRenderer.invoke(IPC.BLOG_EXPORT, data),
  blogExportPdf: (blogId) => ipcRenderer.invoke(IPC.BLOG_EXPORT_PDF, blogId),
  blogExportDocx: (blogId) => ipcRenderer.invoke(IPC.BLOG_EXPORT_DOCX, blogId),
  blogImportMd: (data) => ipcRenderer.invoke(IPC.BLOG_IMPORT_MD, data),
  blogSaveDraft: (data) => ipcRenderer.invoke(IPC.BLOG_SAVE_DRAFT, data),
  blogGetHistory: (blogId) => ipcRenderer.invoke(IPC.BLOG_GET_HISTORY, blogId),
  blogRollback: (data) => ipcRenderer.invoke(IPC.BLOG_ROLLBACK, data),
  blogListAttachments: (blogId) => ipcRenderer.invoke(IPC.BLOG_LIST_ATTACHMENTS, blogId),
  blogDeleteAttachment: (data) => ipcRenderer.invoke(IPC.BLOG_DELETE_ATTACHMENT, data),
  blogCleanupAttachments: (blogId) => ipcRenderer.invoke(IPC.BLOG_CLEANUP_ATTACHMENTS, blogId),
  blogQuickCreate: (data) => ipcRenderer.invoke(IPC.BLOG_QUICK_CREATE, data),
  blogSeriesList: (userId) => ipcRenderer.invoke(IPC.BLOG_SERIES_LIST, userId),
  blogSeriesGet: (seriesId) => ipcRenderer.invoke(IPC.BLOG_SERIES_GET, seriesId),
  blogSeriesSet: (data) => ipcRenderer.invoke(IPC.BLOG_SERIES_SET, data),
  blogBatchDelete: (blogIds) => ipcRenderer.invoke(IPC.BLOG_BATCH_DELETE, blogIds),
  blogBatchTag: (data) => ipcRenderer.invoke(IPC.BLOG_BATCH_TAG, data),

  // Tag
  tagList: (userId) => ipcRenderer.invoke(IPC.TAG_LIST, userId),
  tagCreate: (data) => ipcRenderer.invoke(IPC.TAG_CREATE, data),
  tagUpdate: (data) => ipcRenderer.invoke(IPC.TAG_UPDATE, data),
  tagDelete: (tagId) => ipcRenderer.invoke(IPC.TAG_DELETE, tagId),
  tagSetBlog: (data) => ipcRenderer.invoke(IPC.TAG_SET_BLOG, data),
  tagSetFile: (data) => ipcRenderer.invoke(IPC.TAG_SET_FILE, data),

  // Knowledge Base
  kbList: (filters) => ipcRenderer.invoke(IPC.KB_LIST, filters),
  kbGet: (fileId) => ipcRenderer.invoke(IPC.KB_GET, fileId),
  kbImport: (data) => ipcRenderer.invoke(IPC.KB_IMPORT, data),
  kbDelete: (data) => ipcRenderer.invoke(IPC.KB_DELETE, data),
  kbRestore: (fileId) => ipcRenderer.invoke(IPC.KB_RESTORE, fileId),
  kbRename: (data) => ipcRenderer.invoke(IPC.KB_RENAME, data),
  kbPreview: (fileId) => ipcRenderer.invoke(IPC.KB_PREVIEW, fileId),
  kbOpenExternal: (fileId) => ipcRenderer.invoke(IPC.KB_OPEN_EXTERNAL, fileId),
  kbBatchDelete: (fileIds) => ipcRenderer.invoke(IPC.KB_BATCH_DELETE, fileIds),

  // Search
  searchGlobal: (data) => ipcRenderer.invoke(IPC.SEARCH_GLOBAL, data),
  searchBlogs: (data) => ipcRenderer.invoke(IPC.SEARCH_BLOGS, data),
  searchKb: (data) => ipcRenderer.invoke(IPC.SEARCH_KB, data),

  // Workspace
  workspaceGetInfo: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_GET_INFO, userId),
  workspaceSetPath: (data) => ipcRenderer.invoke(IPC.WORKSPACE_SET_PATH, data),
  workspaceMigrate: (data) => ipcRenderer.invoke(IPC.WORKSPACE_MIGRATE, data),
  workspaceOpenInFolder: (userId) => ipcRenderer.invoke(IPC.WORKSPACE_OPEN_IN_FOLDER, userId),

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

  // Folder
  folderTree: (data) => ipcRenderer.invoke(IPC.FOLDER_TREE, data),
  folderCreate: (data) => ipcRenderer.invoke(IPC.FOLDER_CREATE, data),
  folderRename: (data) => ipcRenderer.invoke(IPC.FOLDER_RENAME, data),
  folderDelete: (folderId) => ipcRenderer.invoke(IPC.FOLDER_DELETE, folderId),
  folderMoveItem: (data) => ipcRenderer.invoke(IPC.FOLDER_MOVE_ITEM, data),

  // Web Scraping
  scrapeWebpage: (url) => ipcRenderer.invoke(IPC.SCRAPE_WEBPAGE, url),

  // Stats
  statsGet: (userId) => ipcRenderer.invoke(IPC.STATS_GET, userId),
  statsDaily: (userId) => ipcRenderer.invoke(IPC.STATS_DAILY, userId),

  // Backup
  backupList: () => ipcRenderer.invoke(IPC.BACKUP_LIST),
  backupCreate: () => ipcRenderer.invoke(IPC.BACKUP_CREATE),
  backupRestore: (filename) => ipcRenderer.invoke(IPC.BACKUP_RESTORE, filename),
  backupDelete: (filename) => ipcRenderer.invoke(IPC.BACKUP_DELETE, filename),

  // Events — Electron → Renderer
  onTrayAction: (cb) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on('tray-action', handler);
    return () => ipcRenderer.removeListener('tray-action', handler);
  },
  onPetAction: (cb) => {
    const handler = (_event: any, action: string) => cb(action);
    ipcRenderer.on('pet-action', handler);
    return () => ipcRenderer.removeListener('pet-action', handler);
  },

  // File System Dialogs
  selectFiles: (exts) => ipcRenderer.invoke(IPC.FS_SELECT_FILES, { extensions: exts }),
  selectDir: () => ipcRenderer.invoke(IPC.FS_SELECT_DIR),

  // App
  appGetVersion: () => ipcRenderer.invoke(IPC.APP_GET_VERSION),
  appGetSystemLanguage: () => ipcRenderer.invoke(IPC.APP_GET_SYSTEM_LANGUAGE),
  appSetAutoStart: (enable) => ipcRenderer.invoke(IPC.APP_SET_AUTO_START, enable),
  appGetAutoStart: () => ipcRenderer.invoke(IPC.APP_GET_AUTO_START),
  appCreateStartMenuShortcut: () => ipcRenderer.invoke(IPC.APP_CREATE_START_MENU_SHORTCUT),
  appHasStartMenuShortcut: () => ipcRenderer.invoke(IPC.APP_HAS_START_MENU_SHORTCUT),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
