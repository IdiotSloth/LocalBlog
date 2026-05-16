import fs from 'node:fs';
import path from 'node:path';
import { app, globalShortcut } from 'electron';
import type { ShortcutDef } from '../../shared/shortcuts';
import { SHORTCUTS as DEFAULTS } from '../../shared/shortcuts';

/** Action handlers injected by main/index.ts to avoid circular deps with pet.ts */
type ShortcutActions = Record<string, () => void>;
let shortcutActions: ShortcutActions = {};

export class ShortcutService {
  static setActions(actions: ShortcutActions): void {
    shortcutActions = actions;
  }

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
    try { fs.writeFileSync(ShortcutService.filePath(), JSON.stringify(overrides, null, 2)); } catch { /* best-effort */ }
  }

  static reset(): void {
    try {
      if (fs.existsSync(ShortcutService.filePath())) fs.unlinkSync(ShortcutService.filePath());
    } catch { /* best-effort */ }
  }

  /** Convert user-facing key (Ctrl+N) to Electron accelerator (CommandOrControl+N) */
  private static toAccelerator(key: string): string {
    return key.replace(/^Ctrl\+/, 'CommandOrControl+');
  }

  /** Re-register all global shortcuts from saved config. Idempotent. */
  static reregisterAll(): void {
    globalShortcut.unregisterAll();
    const shortcuts = ShortcutService.load();
    for (const s of shortcuts) {
      if (s.group !== 'global') continue;
      const action = shortcutActions[s.id];
      if (!action) continue;
      try {
        globalShortcut.register(ShortcutService.toAccelerator(s.key), action);
      } catch {
        console.error(`[ShortcutService] Failed to register shortcut: ${s.id} → ${s.key}`);
      }
    }
  }
}
