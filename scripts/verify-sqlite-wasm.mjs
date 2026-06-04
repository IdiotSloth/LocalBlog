// @ts-check
/**
 * Phase 24 Step 0: Verify @sqlite.org/sqlite-wasm feasibility in Node.js.
 * Runs independently — no Electron, no React, no existing code.
 *
 * Verifies:
 *   a. WASM module initialization
 *   b. File-based database creation (not OPFS)
 *   c. CREATE TABLE / INSERT / SELECT
 *   d. FTS5 virtual table
 *   e. Persistence: close → reopen → verify data survives
 *   f. Parameterized queries (SQL injection safety check)
 *
 * Usage: node scripts/verify-sqlite-wasm.mjs
 * Exit code: 0 = all pass, 1 = failure
 */

import { unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const DB_PATH = resolve(import.meta.dirname, '..', '.verify-sqlite-wasm-test.db');
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`); }
}

// Cleanup from previous run
if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

try {
  // ═══ a. Initialize WASM module ═══
  console.log('a. Initializing WASM module...');
  const sqlite3 = await sqlite3InitModule();
  check('Module initialized', !!sqlite3 && typeof sqlite3 === 'object');
  check('oo1 API available', !!sqlite3?.oo1);
  check('DB constructor exists', typeof sqlite3?.oo1?.DB === 'function');

  // ═══ b. Create file database ═══
  console.log('\nb. Creating file database...');
  const db = new sqlite3.oo1.DB(DB_PATH, 'c');
  check('DB created', !!db);
  check('DB is open', db.isOpen());
  check('DB filename correct', db.filename === DB_PATH);

  // ═══ c. CREATE TABLE / INSERT / SELECT ═══
  console.log('\nc. CREATE TABLE / INSERT / SELECT...');
  db.exec("CREATE TABLE test(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, value REAL)");
  db.exec("INSERT INTO test(name, value) VALUES('hello', 3.14)");
  db.exec("INSERT INTO test(name, value) VALUES('world', 2.718)");

  const rows = [];
  db.exec({
    sql: 'SELECT * FROM test ORDER BY id',
    rowMode: 'object',
    callback: (row) => rows.push(row),
  });
  check('SELECT returned 2 rows', rows.length === 2);
  check('Row 1 has name=hello', rows[0]?.name === 'hello');
  check('Row 2 has value=2.718', rows[1]?.value === 2.718);

  // Parameterized query check
  console.log('\n   Parameterized query...');
  const paramRows = [];
  db.exec({
    sql: 'SELECT name FROM test WHERE id = ?',
    bind: [1],
    rowMode: 'object',
    callback: (r) => paramRows.push(r),
  });
  check('Parameterized SELECT works', paramRows.length === 1 && paramRows[0]?.name === 'hello');

  // ═══ d. FTS5 virtual table ═══
  console.log('\nd. FTS5 virtual table...');
  try {
    db.exec("CREATE VIRTUAL TABLE fts_test USING fts5(content)");
    db.exec("INSERT INTO fts_test(content) VALUES('The quick brown fox')");
    db.exec("INSERT INTO fts_test(content) VALUES('Jumped over the lazy dog')");

    const ftsRows = [];
    db.exec({
      sql: "SELECT * FROM fts_test WHERE fts_test MATCH 'quick'",
      rowMode: 'object',
      callback: (r) => ftsRows.push(r),
    });
    check('FTS5 created', true);
    check('FTS5 search works', ftsRows.length === 1 && ftsRows[0]?.content?.includes('quick'));
  } catch (e) {
    check('FTS5: ' + e.message, false);
  }

  // ═══ e. Persistence ═══
  console.log('\ne. Persistence (close → reopen)...');
  db.close();
  check('DB closed', !db.isOpen());

  const db2 = new sqlite3.oo1.DB(DB_PATH, 'c');
  const reopenRows = [];
  db2.exec({
    sql: 'SELECT * FROM test ORDER BY id',
    rowMode: 'object',
    callback: (r) => reopenRows.push(r),
  });
  check('Reopened DB has 2 rows', reopenRows.length === 2);
  check('Data survived close/reopen', reopenRows[0]?.name === 'hello');
  db2.close();

  // ═══ f. Transaction support ═══
  console.log('\nf. Transaction support...');
  const db3 = new sqlite3.oo1.DB(DB_PATH, 'c');
  db3.exec('BEGIN');
  db3.exec("INSERT INTO test(name, value) VALUES('txn_test', 9.99)");
  db3.exec('ROLLBACK');
  const txnRows = [];
  db3.exec({
    sql: 'SELECT * FROM test ORDER BY id',
    rowMode: 'object',
    callback: (r) => txnRows.push(r),
  });
  check('ROLLBACK works (still 2 rows)', txnRows.length === 2);
  db3.close();

  // ═══ Cleanup ═══
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
  console.log('\n✅ Test DB cleaned up');

} catch (e) {
  console.error('\n❌ Fatal error:', e.message);
  failed++;
  // Cleanup
  if (existsSync(DB_PATH)) {
    try { unlinkSync(DB_PATH); } catch {}
  }
}

// ═══ Results ═══
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ VERIFICATION FAILED — sqlite-wasm is NOT suitable for Phase 24');
  console.log('   Fallback: keep sql.js (B1)');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED — sqlite-wasm is ready for T2403 migration');
}
