/** User data directory name (relative to app.getPath('userData')) */
export const USER_DATA_DIR = 'user-data';

/** Default workspace subdirectories */
export const DIR_BLOGS = 'Blogs';
export const DIR_KNOWLEDGE_BASE = 'KnowledgeBase';
export const DIR_ASSETS = 'Assets';
export const DIR_TRASH = '.Trash';

/** Supported file extensions for knowledge base import */
export const SUPPORTED_KB_EXTENSIONS = [
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.pptx',
  '.ppt',
  '.pdf',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
];

/** Maximum blog title length */
export const MAX_TITLE_LENGTH = 200;

/** Blog file extensions per format */
export const BLOG_EXTENSIONS: Record<string, string> = {
  md: '.md',
  html: '.html',
};

/** Recycle bin auto-clean days (default 30) */
export const DEFAULT_RECYCLE_AUTO_CLEAN_DAYS = 30;
