import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { ShortcutDef } from '../../shared/shortcuts';
import { SHORTCUTS as DEFAULTS } from '../../shared/shortcuts';

export class ShortcutService {
  private static filePath(): string {
    return path.join(app.getPath('userData'), 'shortcuts.json');
  }

  static load(): ShortcutDef[] {
    try {
      if (fs.existsSync(ShortcutService.filePath())) {
        const custom = JSON.parse(fs.readFileSync(ShortcutService.filePath(), 'utf-8')) as ShortcutDef[];
        return DEFAULTS.map((d) => {
          const over = custom.find((c) => c.id === d.id);
          return over ? { ...d, key: over.key } : d;
        });
      }
    } catch { /* fall back to defaults */ }
    return [...DEFAULTS];
  }

  static update(id: string, key: string): void {
    const current = ShortcutService.load();
    const entry = current.find((s) => s.id === id);
    if (!entry) throw new Error(`Shortcut not found: ${id}`);
    entry.key = key;
    const overrides = current.filter((e) => DEFAULTS.find((d) => d.id === e.id)?.key !== e.key);
    fs.writeFileSync(ShortcutService.filePath(), JSON.stringify(overrides, null, 2));
  }

  static reset(): void {
    try {
      if (fs.existsSync(ShortcutService.filePath())) fs.unlinkSync(ShortcutService.filePath());
    } catch { /* best-effort */ }
  }
}
