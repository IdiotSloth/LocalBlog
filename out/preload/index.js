"use strict";
const electron = require("electron");
const IPC = {
  // Auth
  AUTH_LOGIN: "auth:login",
  AUTH_REGISTER: "auth:register",
  AUTH_LOGOUT: "auth:logout",
  AUTH_VERIFY_TOKEN: "auth:verify-token",
  AUTH_DELETE_ACCOUNT: "auth:delete-account",
  // Blog
  BLOG_LIST: "blog:list",
  BLOG_GET: "blog:get",
  BLOG_CREATE: "blog:create",
  BLOG_UPDATE: "blog:update",
  BLOG_DELETE: "blog:delete",
  BLOG_RESTORE: "blog:restore",
  BLOG_EXPORT: "blog:export",
  BLOG_IMPORT_MD: "blog:import-md",
  BLOG_SAVE_DRAFT: "blog:save-draft",
  BLOG_GET_HISTORY: "blog:get-history",
  BLOG_ROLLBACK: "blog:rollback",
  // Tag
  TAG_LIST: "tag:list",
  TAG_CREATE: "tag:create",
  TAG_UPDATE: "tag:update",
  TAG_DELETE: "tag:delete",
  TAG_SET_BLOG: "tag:set-blog",
  TAG_SET_FILE: "tag:set-file",
  // Quick Note
  BLOG_QUICK_CREATE: "blog:quickCreate",
  // Series
  BLOG_SERIES_LIST: "blog:seriesList",
  BLOG_SERIES_GET: "blog:seriesGet",
  BLOG_SERIES_SET: "blog:seriesSet",
  // Batch operations
  BLOG_BATCH_DELETE: "blog:batchDelete",
  BLOG_BATCH_TAG: "blog:batchTag",
  KB_BATCH_DELETE: "kb:batchDelete",
  RECYCLE_BATCH_RESTORE: "recycle:batchRestore",
  // Knowledge Base
  KB_LIST: "kb:list",
  KB_GET: "kb:get",
  KB_IMPORT: "kb:import",
  KB_DELETE: "kb:delete",
  KB_RESTORE: "kb:restore",
  KB_RENAME: "kb:rename",
  KB_PREVIEW: "kb:preview",
  KB_OPEN_EXTERNAL: "kb:open-external",
  // Search
  SEARCH_GLOBAL: "search:global",
  SEARCH_BLOGS: "search:blogs",
  SEARCH_KB: "search:kb",
  // Workspace
  WORKSPACE_GET_INFO: "workspace:get-info",
  WORKSPACE_SET_PATH: "workspace:set-path",
  WORKSPACE_MIGRATE: "workspace:migrate",
  WORKSPACE_OPEN_IN_FOLDER: "workspace:open-in-folder",
  // Recycle Bin
  RECYCLE_LIST: "recycle:list",
  RECYCLE_RESTORE: "recycle:restore",
  RECYCLE_EMPTY: "recycle:empty",
  RECYCLE_SET_AUTO_CLEAN: "recycle:set-auto-clean",
  // Folder
  FOLDER_TREE: "folder:tree",
  FOLDER_CREATE: "folder:create",
  FOLDER_RENAME: "folder:rename",
  FOLDER_DELETE: "folder:delete",
  FOLDER_MOVE_ITEM: "folder:move-item",
  // Web Scraping
  SCRAPE_WEBPAGE: "scrape:webpage",
  // Attachments
  BLOG_LIST_ATTACHMENTS: "blog:list-attachments",
  BLOG_DELETE_ATTACHMENT: "blog:delete-attachment",
  BLOG_CLEANUP_ATTACHMENTS: "blog:cleanup-attachments",
  // Backup
  BACKUP_LIST: "backup:list",
  BACKUP_CREATE: "backup:create",
  BACKUP_RESTORE: "backup:restore",
  BACKUP_DELETE: "backup:delete",
  // File System
  FS_SELECT_DIR: "fs:select-dir",
  FS_SELECT_FILES: "fs:select-files",
  // Stats
  STATS_GET: "stats:get",
  STATS_DAILY: "stats:daily",
  // References
  REF_ADD: "ref:add",
  REF_REMOVE: "ref:remove",
  REF_GET_FROM: "ref:getFrom",
  REF_GET_TO: "ref:getTo",
  REF_SEARCH: "ref:search",
  // PDF Export
  BLOG_EXPORT_PDF: "blog:exportPdf",
  BLOG_EXPORT_DOCX: "blog:exportDocx",
  // Notes
  NOTE_LIST: "note:list",
  NOTE_CREATE: "note:create",
  NOTE_DELETE: "note:delete",
  NOTE_PIN: "note:pin",
  NOTE_CLIPBOARD: "note:clipboard",
  // App
  APP_GET_VERSION: "app:get-version",
  APP_GET_SYSTEM_LANGUAGE: "app:get-system-language",
  APP_SET_AUTO_START: "app:set-auto-start",
  APP_GET_AUTO_START: "app:get-auto-start",
  APP_CREATE_START_MENU_SHORTCUT: "app:create-start-menu-shortcut",
  APP_HAS_START_MENU_SHORTCUT: "app:has-start-menu-shortcut"
};
const api = {
  // Auth
  login: (req) => electron.ipcRenderer.invoke(IPC.AUTH_LOGIN, req),
  register: (req) => electron.ipcRenderer.invoke(IPC.AUTH_REGISTER, req),
  logout: (token) => electron.ipcRenderer.invoke(IPC.AUTH_LOGOUT, token),
  verifyToken: (token) => electron.ipcRenderer.invoke(IPC.AUTH_VERIFY_TOKEN, token),
  deleteAccount: (data) => electron.ipcRenderer.invoke(IPC.AUTH_DELETE_ACCOUNT, data),
  // Blog — core
  blogList: (filters) => electron.ipcRenderer.invoke(IPC.BLOG_LIST, filters),
  blogGet: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_GET, blogId),
  blogCreate: (data) => electron.ipcRenderer.invoke(IPC.BLOG_CREATE, data),
  blogUpdate: (data) => electron.ipcRenderer.invoke(IPC.BLOG_UPDATE, data),
  blogDelete: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_DELETE, blogId),
  blogRestore: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_RESTORE, blogId),
  blogExport: (data) => electron.ipcRenderer.invoke(IPC.BLOG_EXPORT, data),
  blogExportPdf: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_EXPORT_PDF, blogId),
  blogExportDocx: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_EXPORT_DOCX, blogId),
  blogImportMd: (data) => electron.ipcRenderer.invoke(IPC.BLOG_IMPORT_MD, data),
  blogSaveDraft: (data) => electron.ipcRenderer.invoke(IPC.BLOG_SAVE_DRAFT, data),
  blogGetHistory: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_GET_HISTORY, blogId),
  blogRollback: (data) => electron.ipcRenderer.invoke(IPC.BLOG_ROLLBACK, data),
  blogListAttachments: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_LIST_ATTACHMENTS, blogId),
  blogDeleteAttachment: (data) => electron.ipcRenderer.invoke(IPC.BLOG_DELETE_ATTACHMENT, data),
  blogCleanupAttachments: (blogId) => electron.ipcRenderer.invoke(IPC.BLOG_CLEANUP_ATTACHMENTS, blogId),
  blogQuickCreate: (data) => electron.ipcRenderer.invoke(IPC.BLOG_QUICK_CREATE, data),
  blogSeriesList: (userId) => electron.ipcRenderer.invoke(IPC.BLOG_SERIES_LIST, userId),
  blogSeriesGet: (seriesId) => electron.ipcRenderer.invoke(IPC.BLOG_SERIES_GET, seriesId),
  blogSeriesSet: (data) => electron.ipcRenderer.invoke(IPC.BLOG_SERIES_SET, data),
  blogBatchDelete: (blogIds) => electron.ipcRenderer.invoke(IPC.BLOG_BATCH_DELETE, blogIds),
  blogBatchTag: (data) => electron.ipcRenderer.invoke(IPC.BLOG_BATCH_TAG, data),
  // Tag
  tagList: (userId) => electron.ipcRenderer.invoke(IPC.TAG_LIST, userId),
  tagCreate: (data) => electron.ipcRenderer.invoke(IPC.TAG_CREATE, data),
  tagUpdate: (data) => electron.ipcRenderer.invoke(IPC.TAG_UPDATE, data),
  tagDelete: (tagId) => electron.ipcRenderer.invoke(IPC.TAG_DELETE, tagId),
  tagSetBlog: (data) => electron.ipcRenderer.invoke(IPC.TAG_SET_BLOG, data),
  tagSetFile: (data) => electron.ipcRenderer.invoke(IPC.TAG_SET_FILE, data),
  // Knowledge Base
  kbList: (filters) => electron.ipcRenderer.invoke(IPC.KB_LIST, filters),
  kbGet: (fileId) => electron.ipcRenderer.invoke(IPC.KB_GET, fileId),
  kbImport: (data) => electron.ipcRenderer.invoke(IPC.KB_IMPORT, data),
  kbDelete: (data) => electron.ipcRenderer.invoke(IPC.KB_DELETE, data),
  kbRestore: (fileId) => electron.ipcRenderer.invoke(IPC.KB_RESTORE, fileId),
  kbRename: (data) => electron.ipcRenderer.invoke(IPC.KB_RENAME, data),
  kbPreview: (fileId) => electron.ipcRenderer.invoke(IPC.KB_PREVIEW, fileId),
  kbOpenExternal: (fileId) => electron.ipcRenderer.invoke(IPC.KB_OPEN_EXTERNAL, fileId),
  kbBatchDelete: (fileIds) => electron.ipcRenderer.invoke(IPC.KB_BATCH_DELETE, fileIds),
  // Search
  searchGlobal: (data) => electron.ipcRenderer.invoke(IPC.SEARCH_GLOBAL, data),
  searchBlogs: (data) => electron.ipcRenderer.invoke(IPC.SEARCH_BLOGS, data),
  searchKb: (data) => electron.ipcRenderer.invoke(IPC.SEARCH_KB, data),
  // Workspace
  workspaceGetInfo: (userId) => electron.ipcRenderer.invoke(IPC.WORKSPACE_GET_INFO, userId),
  workspaceSetPath: (data) => electron.ipcRenderer.invoke(IPC.WORKSPACE_SET_PATH, data),
  workspaceMigrate: (data) => electron.ipcRenderer.invoke(IPC.WORKSPACE_MIGRATE, data),
  workspaceOpenInFolder: (userId) => electron.ipcRenderer.invoke(IPC.WORKSPACE_OPEN_IN_FOLDER, userId),
  // Recycle Bin
  recycleList: (userId) => electron.ipcRenderer.invoke(IPC.RECYCLE_LIST, userId),
  recycleRestore: (data) => electron.ipcRenderer.invoke(IPC.RECYCLE_RESTORE, data),
  recycleEmpty: (userId) => electron.ipcRenderer.invoke(IPC.RECYCLE_EMPTY, userId),
  recycleSetAutoClean: (data) => electron.ipcRenderer.invoke(IPC.RECYCLE_SET_AUTO_CLEAN, data),
  recycleBatchRestore: (data) => electron.ipcRenderer.invoke(IPC.RECYCLE_BATCH_RESTORE, data),
  // References
  refAdd: (data) => electron.ipcRenderer.invoke(IPC.REF_ADD, data),
  refRemove: (refId) => electron.ipcRenderer.invoke(IPC.REF_REMOVE, refId),
  refGetFrom: (data) => electron.ipcRenderer.invoke(IPC.REF_GET_FROM, data),
  refGetTo: (data) => electron.ipcRenderer.invoke(IPC.REF_GET_TO, data),
  refSearch: (data) => electron.ipcRenderer.invoke(IPC.REF_SEARCH, data),
  // Folder
  folderTree: (data) => electron.ipcRenderer.invoke(IPC.FOLDER_TREE, data),
  folderCreate: (data) => electron.ipcRenderer.invoke(IPC.FOLDER_CREATE, data),
  folderRename: (data) => electron.ipcRenderer.invoke(IPC.FOLDER_RENAME, data),
  folderDelete: (folderId) => electron.ipcRenderer.invoke(IPC.FOLDER_DELETE, folderId),
  folderMoveItem: (data) => electron.ipcRenderer.invoke(IPC.FOLDER_MOVE_ITEM, data),
  // Web Scraping
  scrapeWebpage: (url) => electron.ipcRenderer.invoke(IPC.SCRAPE_WEBPAGE, url),
  // Stats
  statsGet: (userId) => electron.ipcRenderer.invoke(IPC.STATS_GET, userId),
  statsDaily: (userId) => electron.ipcRenderer.invoke(IPC.STATS_DAILY, userId),
  // Backup
  backupList: () => electron.ipcRenderer.invoke(IPC.BACKUP_LIST),
  backupCreate: () => electron.ipcRenderer.invoke(IPC.BACKUP_CREATE),
  backupRestore: (filename) => electron.ipcRenderer.invoke(IPC.BACKUP_RESTORE, filename),
  backupDelete: (filename) => electron.ipcRenderer.invoke(IPC.BACKUP_DELETE, filename),
  // Events — Electron → Renderer
  onTrayAction: (cb) => {
    const handler = (_event, action) => cb(action);
    electron.ipcRenderer.on("tray-action", handler);
    return () => electron.ipcRenderer.removeListener("tray-action", handler);
  },
  onPetAction: (cb) => {
    const handler = (_event, action) => cb(action);
    electron.ipcRenderer.on("pet-action", handler);
    return () => electron.ipcRenderer.removeListener("pet-action", handler);
  },
  onBlogRefresh: (cb) => {
    const handler = () => cb();
    electron.ipcRenderer.on("blog:refresh", handler);
    return () => electron.ipcRenderer.removeListener("blog:refresh", handler);
  },
  onNoteRefresh: (cb) => {
    const handler = () => cb();
    electron.ipcRenderer.on("note:refresh", handler);
    return () => electron.ipcRenderer.removeListener("note:refresh", handler);
  },
  // Notes
  noteList: (userId) => electron.ipcRenderer.invoke(IPC.NOTE_LIST, userId),
  noteCreate: (data) => electron.ipcRenderer.invoke(IPC.NOTE_CREATE, data),
  noteDelete: (noteId) => electron.ipcRenderer.invoke(IPC.NOTE_DELETE, noteId),
  notePin: (noteId) => electron.ipcRenderer.invoke(IPC.NOTE_PIN, noteId),
  noteClipboard: () => electron.ipcRenderer.invoke(IPC.NOTE_CLIPBOARD),
  // File System Dialogs
  selectFiles: (exts) => electron.ipcRenderer.invoke(IPC.FS_SELECT_FILES, { extensions: exts }),
  selectDir: () => electron.ipcRenderer.invoke(IPC.FS_SELECT_DIR),
  // App
  appGetVersion: () => electron.ipcRenderer.invoke(IPC.APP_GET_VERSION),
  appGetSystemLanguage: () => electron.ipcRenderer.invoke(IPC.APP_GET_SYSTEM_LANGUAGE),
  appSetAutoStart: (enable) => electron.ipcRenderer.invoke(IPC.APP_SET_AUTO_START, enable),
  appGetAutoStart: () => electron.ipcRenderer.invoke(IPC.APP_GET_AUTO_START),
  appCreateStartMenuShortcut: () => electron.ipcRenderer.invoke(IPC.APP_CREATE_START_MENU_SHORTCUT),
  appHasStartMenuShortcut: () => electron.ipcRenderer.invoke(IPC.APP_HAS_START_MENU_SHORTCUT)
};
electron.contextBridge.exposeInMainWorld("api", api);
