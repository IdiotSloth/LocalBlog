/**
 * IPC channel names shared between main and renderer processes.
 * Using const objects ensures type-safe channel usage on both sides.
 */
export const IPC = {
  // Auth
  AUTH_LOGIN: 'auth:login',
  AUTH_REGISTER: 'auth:register',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_VERIFY_TOKEN: 'auth:verify-token',
  AUTH_DELETE_ACCOUNT: 'auth:delete-account',

  // Blog
  BLOG_LIST: 'blog:list',
  BLOG_GET: 'blog:get',
  BLOG_CREATE: 'blog:create',
  BLOG_UPDATE: 'blog:update',
  BLOG_DELETE: 'blog:delete',
  BLOG_RESTORE: 'blog:restore',
  BLOG_EXPORT: 'blog:export',
  BLOG_IMPORT_MD: 'blog:import-md',
  BLOG_SAVE_DRAFT: 'blog:save-draft',
  BLOG_GET_HISTORY: 'blog:get-history',
  BLOG_ROLLBACK: 'blog:rollback',
  BLOG_SET_PINNED: 'blog:set-pinned',
  BLOG_SET_COLOR: 'blog:set-color',

  // Tag
  TAG_LIST: 'tag:list',
  TAG_CREATE: 'tag:create',
  TAG_UPDATE: 'tag:update',
  TAG_DELETE: 'tag:delete',
  TAG_MERGE: 'tag:merge',
  TAG_SET_BLOG: 'tag:set-blog',
  TAG_SET_FILE: 'tag:set-file',

  // Quick Note
  BLOG_QUICK_CREATE: 'blog:quickCreate',

  // Series
  BLOG_SERIES_LIST: 'blog:seriesList',
  BLOG_SERIES_GET: 'blog:seriesGet',
  BLOG_SERIES_SET: 'blog:seriesSet',
  BLOG_SERIES_RENAME: 'blog:seriesRename',

  // Batch operations
  BLOG_BATCH_DELETE: 'blog:batchDelete',
  BLOG_BATCH_TAG: 'blog:batchTag',
  KB_BATCH_DELETE: 'kb:batchDelete',
  RECYCLE_BATCH_RESTORE: 'recycle:batchRestore',

  // Knowledge Base
  KB_LIST: 'kb:list',
  KB_GET: 'kb:get',
  KB_IMPORT: 'kb:import',
  KB_DELETE: 'kb:delete',
  KB_RESTORE: 'kb:restore',
  KB_RENAME: 'kb:rename',
  KB_PREVIEW: 'kb:preview',
  KB_OPEN_EXTERNAL: 'kb:open-external',
  KB_SET_PROPERTIES: 'kb:set-properties',
  KB_UPDATE_CONTENT: 'kb:update-content',

  // Search
  SEARCH_GLOBAL: 'search:global',
  SEARCH_BLOGS: 'search:blogs',
  SEARCH_KB: 'search:kb',
  REBUILD_FTS_INDEX: 'search:rebuild-index',
  SEARCH_QUERY: 'search:query',
  SEARCH_GET_DOCUMENTS: 'search:get-documents',

  // Workspace
  WORKSPACE_EXPORT_ZIP: 'workspace:export-zip',
  WORKSPACE_GET_INFO: 'workspace:get-info',
  WORKSPACE_SET_PATH: 'workspace:set-path',
  WORKSPACE_MIGRATE: 'workspace:migrate',
  WORKSPACE_OPEN_IN_FOLDER: 'workspace:open-in-folder',

  // Recycle Bin
  RECYCLE_LIST: 'recycle:list',
  RECYCLE_RESTORE: 'recycle:restore',
  RECYCLE_EMPTY: 'recycle:empty',
  RECYCLE_SET_AUTO_CLEAN: 'recycle:set-auto-clean',

  // Folder
  FOLDER_TREE: 'folder:tree',
  FOLDER_CREATE: 'folder:create',
  FOLDER_RENAME: 'folder:rename',
  FOLDER_DELETE: 'folder:delete',
  FOLDER_MOVE_ITEM: 'folder:move-item',
  FOLDER_MOVE: 'folder:move',

  // Web Scraping
  SCRAPE_WEBPAGE: 'scrape:webpage',
  SCRAPE_EXTRACT_TOC: 'scrape:extract-toc',
  SCRAPE_COLLECT_MANUAL: 'scrape:collect-manual',

  // Attachments
  BLOG_LIST_ATTACHMENTS: 'blog:list-attachments',
  BLOG_DELETE_ATTACHMENT: 'blog:delete-attachment',
  BLOG_CLEANUP_ATTACHMENTS: 'blog:cleanup-attachments',

  // Backup
  BACKUP_LIST: 'backup:list',
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_DELETE: 'backup:delete',

  // File System
  FS_SELECT_DIR: 'fs:select-dir',
  FS_SELECT_FILES: 'fs:select-files',

  // Stats
  STATS_GET: 'stats:get',
  STATS_DAILY: 'stats:daily',

  // References
  REF_ADD: 'ref:add',
  REF_REMOVE: 'ref:remove',
  REF_GET_FROM: 'ref:getFrom',
  REF_GET_TO: 'ref:getTo',
  REF_SEARCH: 'ref:search',

  // PDF Export
  BLOG_EXPORT_PDF: 'blog:exportPdf',
  BLOG_EXPORT_DOCX: 'blog:exportDocx',

  // Notes
  NOTE_LIST: 'note:list',

  // Continue Writing
  CONTINUE_GET_DRAFTS: 'continue:get-drafts',
  CONTINUE_GET_LAST_BLOG: 'continue:get-last-blog',
  CONTINUE_GET_RECENT_FILES: 'continue:get-recent-files',
  NOTE_CREATE: 'note:create',
  NOTE_DELETE: 'note:delete',
  NOTE_PIN: 'note:pin',
  NOTE_CLIPBOARD: 'note:clipboard',

  // Graph (Phase 20C)
  GRAPH_GET_DATA: 'graph:getData',

  // Shortcuts
  SHORTCUT_GET_ALL: 'shortcut:get-all',
  SHORTCUT_UPDATE: 'shortcut:update',
  SHORTCUT_RESET: 'shortcut:reset',

  // App
  SHELL_OPEN_EXTERNAL: 'shell:openExternal',
  APP_VISIBILITY: 'app:visibility',
  APP_GET_VERSION: 'app:get-version',
  APP_GET_SYSTEM_LANGUAGE: 'app:get-system-language',
  APP_SET_AUTO_START: 'app:set-auto-start',
  APP_GET_AUTO_START: 'app:get-auto-start',
  APP_CREATE_START_MENU_SHORTCUT: 'app:create-start-menu-shortcut',
  APP_HAS_START_MENU_SHORTCUT: 'app:has-start-menu-shortcut',

  // Pet
  PET_SCRAPE: 'pet:scrape',
  PET_SCRAPE_IMPORT: 'pet:scrape-import',
  PET_START_DRAG: 'pet:startDrag',
  PET_STOP_DRAG: 'pet:stopDrag',
  PET_SAVE_POSITION: 'pet:savePosition',
  PET_CLICK: 'pet:click',

  // Events (main → renderer via webContents.send)
  EVT_TRAY_ACTION: 'tray-action',
  EVT_PET_ACTION: 'pet-action',
  EVT_NAVIGATE: 'navigate',
  EVT_BLOG_REFRESH: 'blog:refresh',
  EVT_NOTE_REFRESH: 'note:refresh',
  EVT_KB_REFRESH: 'kb:refresh',
  EVT_MANUAL_COLLECT_PROGRESS: 'manual:collect-progress',
  EVT_APP_ERROR: 'app:error',
  EVT_UPDATE_STATUS: 'app:update-status',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
