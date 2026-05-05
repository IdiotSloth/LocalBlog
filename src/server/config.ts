/** Shared server configuration */
export const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'local_blog_kb',
};

export const JWT_SECRET = process.env.JWT_SECRET || 'local-blog-kb-secret-change-in-production';
