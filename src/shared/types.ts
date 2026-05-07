// ==================== User ====================
export interface User {
  id: number;
  username: string;
  workspacePath: string;
  createdAt: string; // ISO 8601
}

// ==================== Blog ====================
export type BlogFormat = 'md' | 'html';
export type ItemStatus = 'active' | 'trash';

export interface Blog {
  id: number;
  userId: number;
  title: string;
  format: BlogFormat;
  status: ItemStatus;
  seriesId?: string;
  seriesName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogWithTags extends Blog {
  tags: Tag[];
}

// ==================== Tag ====================
export interface Tag {
  id: number;
  userId: number;
  name: string;
}

// ==================== Knowledge File ====================
export type FileType = 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'txt' | 'image' | 'other';

export interface KnowledgeFile {
  id: number;
  userId: number;
  filename: string;
  filePath: string;
  fileType: FileType;
  fileSize: number; // bytes
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeFileWithTags extends KnowledgeFile {
  tags: Tag[];
}

// ==================== Recycle Bin ====================
export type ItemType = 'blog' | 'knowledge_file';

export interface RecycleBinItem {
  id: number;
  userId: number;
  itemType: ItemType;
  itemId: number;
  deletedAt: string;
}

// ==================== Search ====================
export type SearchScope = 'all' | 'blog' | 'knowledge';

export interface SearchResult {
  scope: SearchScope;
  id: number;
  title: string;
  snippet: string; // highlighted match context
  matchField: string;
}

// ==================== Workspace ====================
export interface WorkspaceInfo {
  path: string;
  totalFiles: number;
  blogCount: number;
  knowledgeCount: number;
  tagCount: number;
  storageSize: number; // bytes
}

// ==================== Auth ====================
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterRequest {
  username: string;
  password: string;
  workspacePath: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// ==================== Web Scraping ====================
export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResult {
  title: string;
  content: string; // Markdown
  excerpt: string;
  siteName: string;
}

// ==================== File Import ====================
export interface FileImportOptions {
  copyToWorkspace: boolean; // true = 复制到工作区; false = 仅索引原路径
}

// ==================== Stats ====================
export interface UserStats {
  totalBlogs: number;
  totalWords: number;
  totalFiles: number;
  longestBlog: number;
  currentStreak: number;
  longestStreak: number;
  uniqueTags: number;
  hasMdBlog: boolean;
  hasHtmlBlog: boolean;
  hasNightBlog: boolean;
  hasEarlyBlog: boolean;
  monthlyCount: number;
  monthlyWords: number;
  byTag: { name: string; count: number }[];
  byFormat: { format: string; count: number }[];
  heatmap: { date: string; count: number }[];
}

// ==================== Folder ====================
export interface FolderTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  type: string;
  itemCount: number;
  children: FolderTreeNode[];
}

// ==================== Continue Writing ====================
export interface DraftItem {
  id: number;
  blogId: number;
  blogTitle: string;
  content: string;
  savedAt: string;
}

export interface LastBlog {
  id: number;
  title: string;
  updatedAt: string;
}

export interface RecentFile {
  id: number;
  filename: string;
  createdAt: string;
}
