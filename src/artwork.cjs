// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { allowedArtwork } = require('./providers.cjs');
async function downloadArtwork(url, dataDir) {
  if (!allowedArtwork(url)) throw Error('coverHost');
  let response;
  try { response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); }
  catch { throw Error('coverFailed'); }
  if (!response.ok) throw Error('coverFailed');
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()];
  if (!extension) throw Error('coverNotImage');
  if (Number(response.headers.get('content-length')) > 8 * 1024 * 1024) throw Error('imageLarge');
  let length = 0; const chunks = [];
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 8 * 1024 * 1024) throw Error('imageLarge');
    chunks.push(chunk);
  }
  const image = Buffer.concat(chunks);
  if (!image.length) throw Error('coverNotImage');
  const name = crypto.createHash('sha256').update(image).digest('hex') + '.' + extension;
  fs.mkdirSync(path.join(dataDir, 'covers'), { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'covers', name), image);
  return '/covers/' + name;
}
async function findCopyArtwork(copy, options) {
  const providers = require('./providers.cjs');
  if (copy.barcode) {
    try {
      const games = await providers.barcode(copy.barcode, options);
      const match = games.find(game => game.platform === copy.platform && allowedArtwork(game.artworkUrl));
      if (match) return { url: match.artworkUrl, source: match.artworkSource || match.source };
    } catch { /* A title search can still repair artwork when barcode lookup is unavailable. */ }
  }
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[^a-z0-9]/g, '');
  const games = await providers.search(copy.title, copy.platform, options);
  const match = games.find(game => game.platform === copy.platform && normalize(game.title) === normalize(copy.title) && allowedArtwork(game.url));
  if (!match) throw Error('artworkMissing');
  return match;
}
module.exports = { downloadArtwork, findCopyArtwork };
