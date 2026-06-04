/**
 * One-shot migration: rename Blog files from {id}.md to {sanitizedTitle}.md
 * Usage: npx tsx scripts/migrate-md-filenames.ts [--dry-run] [--user-id <id>]
 * D142=B — full migration, no dual-path fallback.
 */
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

function sanitizeFileName(title: string): string {
  return title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim() || 'untitled';
}

function getExt(format: string): string {
  return format === 'html' ? '.html' : '.md';
}

async function main() {
  // Dynamic import to use the project's DB module
  const { getDatabase } = await import('../src/main/db/index.js');
  const { dbAll } = await import('../src/main/db/index.js');
  const db = getDatabase();

  const rows = await dbAll<{ id: number; user_id: number; title: string; format: string; workspace_path: string }>(
    `SELECT b.id, b.user_id, b.title, b.format, u.workspace_path
     FROM blogs b JOIN users u ON b.user_id = u.id
     WHERE b.status = 'active'`,
  );

  const results: { id: number; oldName: string; newName: string; action: string; reason?: string }[] = [];

  for (const row of rows) {
    const blogsDir = path.join(row.workspace_path, 'Blogs');
    const ext = getExt(row.format);
    const oldName = `${row.id}${ext}`;
    const oldPath = path.join(blogsDir, oldName);
    const baseName = sanitizeFileName(row.title);

    if (!fs.existsSync(oldPath)) {
      results.push({ id: row.id, oldName, newName: '-', action: 'skip', reason: 'old file not found (may already be title-named)' });
      continue;
    }

    // Resolve conflicts
    let finalName = baseName + ext;
    if (fs.existsSync(path.join(blogsDir, finalName))) {
      let counter = 1;
      while (fs.existsSync(path.join(blogsDir, `${baseName}-${counter}${ext}`))) counter++;
      finalName = `${baseName}-${counter}${ext}`;
    }

    if (DRY_RUN) {
      results.push({ id: row.id, oldName, newName: finalName, action: 'rename' });
    } else {
      try {
        fs.renameSync(oldPath, path.join(blogsDir, finalName));
        results.push({ id: row.id, oldName, newName: finalName, action: 'rename' });
      } catch (e: any) {
        results.push({ id: row.id, oldName, newName: finalName, action: 'error', reason: e.message });
      }
    }
  }

  // Summary
  const renamed = results.filter((r) => r.action === 'rename').length;
  const skipped = results.filter((r) => r.action === 'skip').length;
  const errors = results.filter((r) => r.action === 'error').length;

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Migration Summary:`);
  console.log(`  Total: ${results.length} | Renamed: ${renamed} | Skipped: ${skipped} | Errors: ${errors}\n`);

  for (const r of results) {
    const prefix = r.action === 'rename' ? '✓' : r.action === 'skip' ? '○' : '✗';
    console.log(`  ${prefix} ${r.oldName} → ${r.newName}${r.reason ? ` (${r.reason})` : ''}`);
  }

  if (DRY_RUN) console.log('\nRun without --dry-run to execute.');
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
