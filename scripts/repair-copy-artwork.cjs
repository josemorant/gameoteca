// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const fs = require('node:fs'), path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');
const { findCopyArtwork, downloadArtwork } = require('../src/artwork.cjs');
async function main() {
  const file = path.resolve(process.argv[2] || 'data/catalog.sqlite');
  const copyId = Number(process.argv[3]);
  const apply = process.argv.includes('--apply');
  const replace = process.argv.includes('--replace');
  if (!Number.isInteger(copyId) || copyId < 1 || !fs.existsSync(file)) throw Error('Provide an existing database path and copy ID.');
  const db = new DatabaseSync(file, { readOnly: !apply });
  try {
    const copy = db.prepare('SELECT copies.*,games.title,games.platform,games.barcode,games.cover,games.source FROM copies JOIN games ON games.id=copies.game_id WHERE copies.id=?').get(copyId);
    if (!copy) throw Error('Copy not found.');
    if (copy.cover && !replace) throw Error('This copy already has artwork; it will not be overwritten.');
    const artwork = await findCopyArtwork(copy, { cacheDir: path.resolve('build/provider-cache'), language: 'es' });
    if (!apply) { console.log(JSON.stringify({ copyId, title: copy.title, platform: copy.platform, barcode: copy.barcode, artwork, changes: ['cover', 'source'] }, null, 2)); return; }
    const dataDir = path.dirname(file);
    const backupFile = path.join(dataDir, 'catalog.before-artwork-' + Date.now() + '.sqlite');
    await backup(db, backupFile);
    const cover = await downloadArtwork(artwork.url, dataDir);
    db.exec('BEGIN IMMEDIATE');
    try {
      const changed = db.prepare('UPDATE games SET cover=?,source=? WHERE id=? AND cover=?').run(cover, artwork.source, copy.game_id, copy.cover);
      if (changed.changes !== 1) throw Error('The record changed during lookup. No database changes were applied.');
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    console.log(JSON.stringify({ copyId, title: copy.title, cover, source: artwork.source, backupFile }, null, 2));
  } finally { db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
