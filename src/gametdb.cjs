// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const fs = require('node:fs');
const path = require('node:path');
const { unzipSync } = require('fflate');
const { XMLParser } = require('fast-xml-parser');
const { get } = require('./catalog-http.cjs');
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const indexes = new Map(), pending = new Map(), artwork = new Map();
const ttl = 24 * 3600000;

function parseCatalog(xml) {
  if (xml.length > 64 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('providerUnavailable');
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, isArray: name => name === 'locale' });
  const records = [];
  for (const match of xml.matchAll(/<game\b[^>]*>[\s\S]*?<\/game>/g)) {
    const game = parser.parse(match[0]).game;
    if (!/^[A-Z0-9]{5}$/.test(game?.id || '')) continue;
    const titles = {};
    for (const locale of game.locale || []) if (typeof locale.title === 'string' && locale.title.trim()) titles[locale['@_lang']] = locale.title.trim();
    const title = titles.EN || Object.values(titles)[0] || String(game['@_name'] || '').replace(/\s*\([A-Z,]+\)$/, '').trim();
    if (title) records.push({ id: game.id, title, titles });
  }
  if (!records.length) throw Error('providerUnavailable');
  return records;
}
async function loadCatalog({ cacheDir } = {}) {
  const key = cacheDir || 'memory';
  if (indexes.has(key) && indexes.get(key).until > Date.now()) return indexes.get(key).records;
  if (pending.has(key)) return pending.get(key);
  const promise = (async () => {
    let old;
    const file = cacheDir && path.join(cacheDir, 'gametdb-switch.json');
    if (file && fs.existsSync(file)) {
      try {
        const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (stored.version === 1 && Array.isArray(stored.records) && stored.records.length && stored.records.every(record => /^[A-Z0-9]{5}$/.test(record.id) && typeof record.title === 'string')) old = stored;
        if (old && old.fetched + ttl > Date.now()) { indexes.set(key, { records: old.records, until: old.fetched + ttl }); return old.records; }
      } catch { /* Download a fresh index if a local cache file is incomplete. */ }
    }
    try {
      const bytes = await get('https://www.gametdb.com/switchtdb.zip?LANG=EN', { binary: true, maxBytes: 12 * 1024 * 1024, timeout: 30000 });
      const archive = unzipSync(bytes, { filter: entry => entry.name === 'switchtdb.xml' && entry.originalSize <= 64 * 1024 * 1024 });
      if (!archive['switchtdb.xml']) throw Error('providerUnavailable');
      const records = parseCatalog(Buffer.from(archive['switchtdb.xml']).toString('utf8'));
      indexes.set(key, { records, until: Date.now() + ttl });
      if (file) {
        try { fs.mkdirSync(cacheDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify({ version: 1, fetched: Date.now(), records })); }
        catch { /* An unwritable cache does not prevent online artwork lookup. */ }
      }
      return records;
    } catch (error) {
      if (old) { indexes.set(key, { records: old.records, until: Date.now() + 300000 }); return old.records; }
      throw error;
    }
  })();
  pending.set(key, promise);
  try { return await promise; } finally { pending.delete(key); }
}
async function coverFor(id, language = 'en') {
  const preferred = ({ en: 'EN', es: 'ES', ca: 'ES', fr: 'FR', de: 'DE' })[language] || 'EN';
  const key = id + ':' + preferred;
  if (artwork.has(key)) return artwork.get(key);
  const promise = (async () => {
    for (const region of [...new Set([preferred, 'EN', 'US'])]) {
      for (const type of ['coverM', 'cover']) {
        const url = `https://art.gametdb.com/switch/${type}/${region}/${id}.jpg`;
        try {
          const response = await get(url, { method: 'HEAD', timeout: 6000 });
          if (response.headers.get('content-type')?.startsWith('image/')) return { url, region };
        } catch { /* Try the next available size or regional front cover. */ }
      }
    }
    return null;
  })();
  artwork.set(key, promise);
  if (artwork.size > 1000) artwork.delete(artwork.keys().next().value);
  const result = await promise;
  if (!result) artwork.delete(key);
  return result;
}
async function search(title, platform, options = {}) {
  if (platform !== 'Nintendo Switch') return [];
  const query = normalize(title);
  if (query.length < 2) return [];
  const records = await loadCatalog(options);
  const matches = records.filter(record => [record.title, ...Object.values(record.titles || {})].some(name => normalize(name).includes(query)))
    .sort((a, b) => Number(normalize(b.title) === query) - Number(normalize(a.title) === query)).slice(0, 10);
  const results = await Promise.all(matches.map(async record => {
    const cover = await coverFor(record.id, options.language);
    return cover && { title: record.title, platform, source: 'GameTDB', externalId: record.id, url: cover.url, region: cover.region };
  }));
  return results.filter(Boolean);
}
module.exports = { search, parseCatalog };
