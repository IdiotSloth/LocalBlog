import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { getBlogsDir, getKnowledgeBaseDir, getAssetsDir } from '../utils/paths';

const MAX_BACKUPS = 7;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

export class BackupService {
  private static timer: ReturnType<typeof setInterval> | null = null;

  /** Get the backup directory path */
  static getBackupDir(): string {
    const userData = app.getPath('userData');
    return path.join(userData, 'backups');
  }

  /** Get database file path */
  static getDbPath(): string {
    const base =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library', 'Application Support')
        : path.join(process.env.HOME || '', '.local', 'share'));
    return path.join(base, 'LocalBlogKB', 'database.db');
  }

  /** Create a backup of the database */
  static createBackup(): string | null {
    const dbPath = BackupService.getDbPath();
    if (!fs.existsSync(dbPath)) {
      console.log('[Backup] Database file not found, skipping');
      return null;
    }

    const backupDir = BackupService.getBackupDir();
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `database.db.backup.${timestamp}`;
    const backupPath = path.join(backupDir, backupName);

    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`[Backup] Created: ${backupName}`);
      return backupPath;
    } catch (err) {
      console.error('[Backup] Failed:', (err as Error).message);
      return null;
    }
  }

  /** Clean up old backups, keeping only the latest N */
  static cleanOldBackups(): number {
    const backupDir = BackupService.getBackupDir();
    if (!fs.existsSync(backupDir)) return 0;

    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('database.db.backup.'))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime); // newest first

    let cleaned = 0;
    for (let i = MAX_BACKUPS; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i]!.path);
        cleaned++;
      } catch {
        /* skip */
      }
    }

    if (cleaned > 0) console.log(`[Backup] Cleaned ${cleaned} old backup(s)`);
    return cleaned;
  }

  /** Start automatic periodic backups */
  static startAutoBackup(): void {
    if (BackupService.timer) return;

    // Create backup on startup
    BackupService.createBackup();
    BackupService.cleanOldBackups();

    // Schedule periodic backups
    BackupService.timer = setInterval(() => {
      BackupService.createBackup();
      BackupService.cleanOldBackups();
    }, BACKUP_INTERVAL_MS);

    console.log('[Backup] Auto-backup started (every 24h, keeping last 7)');
  }

  /** Stop auto-backup timer */
  static stopAutoBackup(): void {
    if (BackupService.timer) {
      clearInterval(BackupService.timer);
      BackupService.timer = null;
    }
  }

  /** Export entire workspace as a ZIP file (STORE-only, zero dependencies) */
  static async exportWorkspaceAsZip(userId: number, outputPath: string): Promise<string> {
    const files: { name: string; data: Buffer }[] = [];

    const collectDir = (dir: string, prefix: string): void => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const zipName = prefix + '/' + e.name;
        if (e.isDirectory()) {
          collectDir(full, zipName);
        } else {
          files.push({ name: zipName, data: fs.readFileSync(full) });
        }
      }
    };

    const blogsDir = await getBlogsDir(userId);
    const kbDir = await getKnowledgeBaseDir(userId);
    const assetsDir = await getAssetsDir(userId);

    collectDir(blogsDir, 'Blogs');
    collectDir(kbDir, 'KnowledgeBase');
    collectDir(assetsDir, 'Assets');

    const dbPath = BackupService.getDbPath();
    if (fs.existsSync(dbPath)) {
      files.push({ name: 'database.db', data: fs.readFileSync(dbPath) });
    }

    // Minimal ZIP writer (STORE method, zero compression)
    const crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c;
    }
    const crc32 = (buf: Buffer): number => {
      let c = 0xffffffff;
      for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };

    const chunks: Buffer[] = [];
    const centralEntries: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuf = Buffer.from(file.name, 'utf-8');
      const crc = crc32(file.data);
      const size = file.data.length;

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(size, 18);
      localHeader.writeUInt32LE(size, 22);
      localHeader.writeUInt16LE(nameBuf.length, 26);

      chunks.push(localHeader, nameBuf, file.data);

      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(20, 4);
      central.writeUInt16LE(20, 6);
      central.writeUInt16LE(0, 10);
      central.writeUInt16LE(0, 12);
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(size, 20);
      central.writeUInt32LE(size, 24);
      central.writeUInt16LE(nameBuf.length, 28);
      central.writeUInt16LE(0, 32);
      central.writeUInt16LE(0, 34);
      central.writeUInt16LE(0, 36);
      central.writeUInt32LE(0, 38);
      central.writeUInt32LE(offset, 42);

      centralEntries.push(central, nameBuf);
      offset += 30 + nameBuf.length + size;
    }

    const centralOffset = chunks.reduce((a, b) => a + b.length, 0);
    const centralSize = centralEntries.reduce((a, b) => a + b.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(centralOffset, 16);
    eocd.writeUInt16LE(0, 20);

    const zipBuf = Buffer.concat([...chunks, ...centralEntries, eocd]);
    fs.writeFileSync(outputPath, zipBuf);
    return outputPath;
  }

  /** List available backups */
  static listBackups(): { name: string; size: number; createdAt: Date }[] {
    const backupDir = BackupService.getBackupDir();
    if (!fs.existsSync(backupDir)) return [];

    return fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith('database.db.backup.'))
      .map((f) => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return { name: f, size: stat.size, createdAt: stat.mtime };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
