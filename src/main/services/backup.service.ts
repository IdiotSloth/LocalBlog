import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

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
    const dbPath = this.getDbPath();
    if (!fs.existsSync(dbPath)) {
      console.log('[Backup] Database file not found, skipping');
      return null;
    }

    const backupDir = this.getBackupDir();
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
    const backupDir = this.getBackupDir();
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
        fs.unlinkSync(files[i].path);
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
    if (this.timer) return;

    // Create backup on startup
    this.createBackup();
    this.cleanOldBackups();

    // Schedule periodic backups
    this.timer = setInterval(() => {
      this.createBackup();
      this.cleanOldBackups();
    }, BACKUP_INTERVAL_MS);

    console.log('[Backup] Auto-backup started (every 24h, keeping last 7)');
  }

  /** Stop auto-backup timer */
  static stopAutoBackup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** List available backups */
  static listBackups(): { name: string; size: number; createdAt: Date }[] {
    const backupDir = this.getBackupDir();
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
