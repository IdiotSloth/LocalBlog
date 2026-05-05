import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
/** Express Web Server — provides browser-accessible frontend + REST API */
import express from 'express';
import { closeMySQL, initMySQL } from './db';
import { errorHandler } from './middleware/error-handler';
import { authRouter } from './routes/auth';
import { blogRouter } from './routes/blog';
import { knowledgeRouter } from './routes/knowledge';
import { recycleRouter } from './routes/recycle';
import { scrapeRouter } from './routes/scrape';
import { searchRouter } from './routes/search';
import { tagRouter } from './routes/tags';
import { workspaceRouter } from './routes/workspace';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3456;
const app = express();

app.use(
  cors({ origin: ['http://localhost:3456', 'http://localhost:5173', 'http://127.0.0.1:3456'], credentials: true }),
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/blog', blogRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/tags', tagRouter);
app.use('/api/search', searchRouter);
app.use('/api/workspace', workspaceRouter);
app.use('/api/recycle', recycleRouter);
app.use('/api/scrape', scrapeRouter);

// Unified error handler (must be last middleware)
app.use(errorHandler);

// Serve React frontend (built by `npm run build`) with caching
const frontendDir = path.join(__dirname, '../../out/renderer');
app.use(
  express.static(frontendDir, {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }),
);
// Express 5: use /{*splat} for catch-all
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

async function start() {
  try {
    await initMySQL();
    console.log(`[Server] MySQL connected`);
  } catch {
    console.log('[Server] MySQL unavailable — running with sql.js fallback');
  }

  app.listen(PORT, () => {
    console.log(`[Server] Web 服务已启动: http://localhost:${PORT}`);
  });
}

start();

process.on('SIGTERM', () => {
  closeMySQL();
  process.exit();
});
