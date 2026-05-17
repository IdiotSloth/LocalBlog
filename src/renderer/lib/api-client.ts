/**
 * Universal API client — works in Electron (window.api) and Browser (fetch REST API).
 */
import type { WindowApi } from '../../shared/window-api';

const BASE = 'http://localhost:3456';

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  return res.json();
}

function getQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const webApi = {
  // Auth
  login: (req: { username: string; password: string; rememberMe: boolean }) => request('POST', '/api/auth/login', req),
  register: (req: { username: string; password: string; workspacePath: string }) =>
    request('POST', '/api/auth/register', req),
  logout: () => request('POST', '/api/auth/logout'),
  verifyToken: () => request('GET', '/api/auth/session'),
  deleteAccount: (data: { userId: number; keepFiles: boolean }) => request('POST', '/api/auth/delete', data),

  // Blog
  blogList: (filters: Record<string, unknown> = {}) => request('GET', `/api/blog/list${getQuery(filters)}`),
  blogGet: (blogId: number) => request('GET', `/api/blog/${blogId}`),
  blogCreate: (data: object) => request('POST', '/api/blog/create', data),
  blogUpdate: (data: { blogId: number; title?: string; content?: string }) =>
    request('POST', `/api/blog/${data.blogId}/update`, data),
  blogDelete: (data: { userId: number; blogId: number }) => request('POST', `/api/blog/${data.blogId}/delete`, data),
  blogRestore: (data: { userId: number; blogId: number }) => request('POST', `/api/blog/${data.blogId}/restore`, data),
  blogExport: () => Promise.resolve({ success: false, error: '网页版暂不支持导出' }),
  blogImportMd: (data: { userId: number; filePaths: string[] }) => request('POST', '/api/blog/import-md', data),
  blogSaveDraft: (data: { blogId: number; content: string }) => request('POST', '/api/blog/save-draft', data),
  blogGetHistory: (blogId: number) => request('GET', `/api/blog/${blogId}/history`),
  blogRollback: (data: { blogId: number; draftId: number }) =>
    request('POST', `/api/blog/${data.blogId}/rollback`, data),
  blogSeriesList: () => Promise.resolve({ success: false, error: '网页版暂不支持系列功能' }),
  blogSeriesGet: () => Promise.resolve({ success: false, error: '网页版暂不支持系列功能' }),
  blogSeriesSet: () => Promise.resolve({ success: false, error: '网页版暂不支持系列功能' }),
  blogSeriesRename: () => Promise.resolve({ success: false, error: '网页版暂不支持系列功能' }),

  // Tag
  tagList: () => request('GET', '/api/tags/list'),
  tagCreate: (data: { userId: number; name: string }) => request('POST', '/api/tags/create', data),
  tagUpdate: (data: { tagId: number; name: string }) => request('POST', `/api/tags/${data.tagId}/update`, data),
  tagDelete: (data: { userId: number; tagId: number }) => request('POST', `/api/tags/${data.tagId}/delete`, data),
  tagSetBlog: (data: { blogId: number; tagIds: number[] }) => request('POST', `/api/blog/${data.blogId}/tags`, data),
  tagSetFile: (data: { fileId: number; tagIds: number[] }) =>
    request('POST', `/api/knowledge/${data.fileId}/tags`, data),

  // Knowledge Base
  kbList: (filters: Record<string, unknown> = {}) => request('GET', `/api/knowledge/list${getQuery(filters)}`),
  kbGet: (data: { fileId: number; userId: number }) => request('GET', `/api/knowledge/${data.fileId}`),
  kbImport: (data: { userId: number; filePaths: string[]; copyToWorkspace: boolean }) =>
    request('POST', '/api/knowledge/import', data),
  kbDelete: (data: { fileId: number; deletePhysicalFile: boolean }) =>
    request('POST', `/api/knowledge/${data.fileId}/delete`, data),
  kbRestore: (data: { userId: number; fileId: number }) => request('POST', `/api/knowledge/${data.fileId}/restore`, data),
  kbRename: (data: { fileId: number; newFilename: string }) =>
    request('POST', `/api/knowledge/${data.fileId}/rename`, data),
  kbPreview: (data: { fileId: number; userId: number }) => request('GET', `/api/knowledge/${data.fileId}/preview`),
  kbOpenExternal: (_data: { fileId: number; userId: number }) => Promise.resolve({ success: false, error: '网页版暂不支持系统程序打开' }),

  // Search
  searchGlobal: (data: { userId: number; query: string }) => request('POST', '/api/search/global', data),
  searchBlogs: (data: { userId: number; query: string }) => request('POST', '/api/search/blogs', data),
  searchKb: (data: { userId: number; query: string }) => request('POST', '/api/search/kb', data),
  searchQuery: () => Promise.resolve({ success: false, error: 'FTS搜索为桌面专属功能' }),
  searchGetDocuments: () => Promise.resolve({ success: false, error: 'FTS搜索为桌面专属功能' }),

  // Workspace
  shortcutGetAll: () => Promise.resolve({ success: false, error: '快捷键设置为桌面专属功能' }),
  shortcutUpdate: () => Promise.resolve({ success: false, error: '快捷键设置为桌面专属功能' }),
  shortcutReset: () => Promise.resolve({ success: false, error: '快捷键设置为桌面专属功能' }),
  workspaceExportZip: () => Promise.resolve({ success: false, error: '导出工作区为桌面专属功能' }),
  workspaceGetInfo: () => request('GET', '/api/workspace/info'),
  workspaceSetPath: () => Promise.resolve({ success: true }),
  workspaceMigrate: () => Promise.resolve({ success: true }),
  workspaceOpenInFolder: () => Promise.resolve({ success: false, error: '网页版不支持打开文件夹' }),

  // Recycle
  recycleList: () => request('GET', '/api/recycle/list'),
  recycleRestore: (data: { userId: number; itemId: number; itemType: string }) =>
    request('POST', '/api/recycle/restore', data),
  recycleEmpty: () => request('POST', '/api/recycle/empty'),
  recycleSetAutoClean: (data: { userId: number; days: number }) => request('POST', '/api/recycle/auto-clean', data),

  // Web scraping
  scrapeWebpage: (url: string) => request('POST', '/api/scrape/webpage', { url }),
  scrapeExtractToc: () => Promise.resolve({ success: false, error: '网页版暂不支持批量采集' }),
  scrapeCollectManual: () => Promise.resolve({ success: false, error: '网页版暂不支持批量采集' }),
  onManualCollectProgress: () => () => {},
  onNavigate: () => () => {},
  onAppVisibility: () => () => {},
  blogExportDocx: () => Promise.resolve({ success: false, error: '网页版暂不支持Word导出' }),
  blogQuickCreate: () => Promise.resolve({ success: false, error: '网页版暂不支持快捷创建' }),
  statsDaily: () => Promise.resolve({ success: false, error: '网页版暂不支持每日统计' }),

  // File dialogs (not available in browser)
  selectDir: () => Promise.resolve(prompt('请输入工作区目录路径') || null),
  selectFiles: () => Promise.resolve([]),

  // Stats & Backup (web stub)
  statsGet: () => Promise.resolve({ success: false, error: '网页版暂不支持统计' }),
  backupList: () => Promise.resolve({ success: false, error: '网页版暂不支持备份管理' }),
  backupCreate: () => Promise.resolve({ success: false, error: '网页版暂不支持备份管理' }),
  backupRestore: () => Promise.resolve({ success: false, error: '网页版暂不支持备份管理' }),
  backupDelete: () => Promise.resolve({ success: false, error: '网页版暂不支持备份管理' }),
  blogExportPdf: () => Promise.resolve({ success: false, error: '网页版暂不支持PDF导出' }),
  blogListAttachments: () => Promise.resolve({ success: false, error: '网页版暂不支持附件管理' }),
  blogDeleteAttachment: () => Promise.resolve({ success: false, error: '网页版暂不支持附件管理' }),
  blogCleanupAttachments: () => Promise.resolve({ success: false, error: '网页版暂不支持附件管理' }),
  blogBatchDelete: () => Promise.resolve({ success: false, error: '网页版暂不支持批量操作' }),
  blogBatchTag: () => Promise.resolve({ success: false, error: '网页版暂不支持批量操作' }),
  kbBatchDelete: () => Promise.resolve({ success: false, error: '网页版暂不支持批量操作' }),
  recycleBatchRestore: () => Promise.resolve({ success: false, error: '网页版暂不支持批量操作' }),
  folderTree: () => Promise.resolve({ success: false, error: '网页版暂不支持文件夹' }),
  folderCreate: () => Promise.resolve({ success: false, error: '网页版暂不支持文件夹' }),
  folderRename: () => Promise.resolve({ success: false, error: '网页版暂不支持文件夹' }),
  folderDelete: () => Promise.resolve({ success: false, error: '网页版暂不支持文件夹' }),
  folderMove: () => Promise.resolve({ success: false, error: '网页版暂不支持移动文件夹' }),
  folderMoveItem: () => Promise.resolve({ success: false, error: '网页版暂不支持文件夹' }),
  refAdd: () => Promise.resolve({ success: false, error: '网页版暂不支持引用' }),
  refRemove: () => Promise.resolve({ success: false, error: '网页版暂不支持引用' }),
  refGetFrom: () => Promise.resolve({ success: false, error: '网页版暂不支持引用' }),
  refGetTo: () => Promise.resolve({ success: false, error: '网页版暂不支持引用' }),
  refSearch: () => Promise.resolve({ success: false, error: '网页版暂不支持引用' }),

  // App
  shellOpenExternal: () => Promise.resolve({ success: false, error: '网页版暂不支持打开外部链接' }),
  appGetVersion: () => Promise.resolve({ success: true, data: '0.3.0-web' }),
  appGetSystemLanguage: () => Promise.resolve({ success: true, data: navigator.language }),
  appSetAutoStart: () => Promise.resolve({ success: true }),
  appGetAutoStart: () => Promise.resolve({ success: true, data: { enabled: false } }),
  appCreateStartMenuShortcut: () => Promise.resolve({ success: false, error: '网页版不支持' }),
  appHasStartMenuShortcut: () => Promise.resolve({ success: true, data: { exists: false } }),

  // Notes (desktop-only)
  noteList: () => Promise.resolve({ success: false, error: '便签为桌面专属功能' }),
  noteCreate: () => Promise.resolve({ success: false, error: '便签为桌面专属功能' }),
  noteDelete: () => Promise.resolve({ success: false, error: '便签为桌面专属功能' }),
  notePin: () => Promise.resolve({ success: false, error: '便签为桌面专属功能' }),
  noteClipboard: () => Promise.resolve({ success: false, error: '便签为桌面专属功能' }),
  onBlogRefresh: () => () => {},
  onNoteRefresh: () => () => {},
  onAppError: () => () => {},
  onKbRefresh: () => () => {},
  onTrayAction: () => () => {},
  onPetAction: () => () => {},
  onUpdateStatus: () => () => {},

  // Continue Writing
  continueGetDrafts: () => Promise.resolve({ success: false, error: '续写视图为桌面专属功能' }),
  continueGetLastBlog: () => Promise.resolve({ success: false, error: '续写视图为桌面专属功能' }),
  continueGetRecentFiles: () => Promise.resolve({ success: false, error: '续写视图为桌面专属功能' }),
};

/** Detect environment and return the appropriate API */
export const api: WindowApi = (() => {
  const w = window as { api?: WindowApi };
  if (w.api) return w.api;
  return webApi as WindowApi;
})();
