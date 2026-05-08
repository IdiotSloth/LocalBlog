import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { getPool } from '../db';
import { type AuthRequest, requireAuth } from '../middleware/auth';

const UPLOAD_BASE = path.resolve('server/uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory for user exists
function ensureUserDir(userId: number): string {
  const dir = path.join(UPLOAD_BASE, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const req = _req as AuthRequest;
    const uid = req.userId || 0;
    cb(null, ensureUserDir(uid));
  },
  filename(_req, file, cb) {
    const safe = file.originalname.replace(/[<>:"/\\|?*]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    const allowed = /\.(docx|doc|xlsx|xls|pptx|ppt|pdf|txt|md|png|jpe?g|gif|webp|svg|bmp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${path.extname(file.originalname)}`));
    }
  },
});

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

uploadRouter.post('/file', upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: '未登录' });
    const files = req.files as Express.Multer.File[];
    if (!files?.length) return res.json({ success: false, error: '未选择文件' });

    const pool = getPool();
    const results: { filename: string; id: number }[] = [];

    for (const f of files) {
      const ext = path.extname(f.originalname).toLowerCase().replace('.', '');
      const fileType = mapExtToType(ext);
      const [result] = (await pool.execute(
        'INSERT INTO knowledge_files (user_id, filename, file_path, file_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, f.originalname, f.path, fileType, f.size, 'active'],
      )) as any[];
      results.push({ filename: f.originalname, id: result.insertId });
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    return res.json({ success: false, error: (err as Error).message });
  }
});

function mapExtToType(ext: string): string {
  const map: Record<string, string> = {
    docx: 'docx', doc: 'docx',
    xlsx: 'xlsx', xls: 'xlsx',
    pptx: 'pptx', ppt: 'pptx',
    pdf: 'pdf', txt: 'txt', md: 'txt',
    png: 'image', jpg: 'image', jpeg: 'image',
    gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
  };
  return map[ext] || 'other';
}
