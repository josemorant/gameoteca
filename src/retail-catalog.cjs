// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const { parse } = require('node-html-parser');
const { get } = require('./catalog-http.cjs');
const origin = 'https://www.shinestar.es';
const equivalent = (a, b) => String(a).padStart(14, '0') === String(b).padStart(14, '0');
function safeUrl(value) {
  try { const url = new URL(value, origin); return url.origin === origin && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function parseSearch(html) {
  const root = parse(html);
  return [...new Set(root.querySelectorAll('.product-title a').map(anchor => safeUrl(anchor.getAttribute('href'))).filter(Boolean))];
}
function parseProduct(html, requestedCode) {
  const root = parse(html);
  const name = root.querySelector('h1')?.text.trim();
  const reference = root.querySelectorAll('.product-reference').find(node => /^EAN\s*$/i.test(node.querySelector('label')?.text.trim() || ''));
  const code = reference?.querySelector('span')?.text.trim();
  if (!name || !/^\d{8,14}$/.test(code || '') || (requestedCode && !equivalent(code, requestedCode))) return null;
  const image = safeUrl(root.querySelector('meta[property="og:image"]')?.getAttribute('content'));
  return { rawTitle: name, code, image: image || '' };
}
async function lookup(query, requestedCode) {
  const url = new URL('/busqueda', origin);
  url.search = new URLSearchParams({ controller: 'search', s: query });
  const links = parseSearch(await get(url));
  const results = await Promise.all(links.slice(0, requestedCode ? 3 : 6).map(async link => {
    try {
      const item = parseProduct(await get(link), requestedCode);
      return item && { ...item, sourceUrl: link };
    } catch { return null; }
  }));
  return results.filter(Boolean);
}
async function barcode(code) {
  const query = code.length === 12 ? '0' + code : code.length === 14 && code.startsWith('0') ? code.slice(1) : code;
  return lookup(query, code);
}
async function search(title) { return lookup(title.replace(/[^\p{L}\p{N}\s]/gu, ' '), null); }
module.exports = { barcode, search, parseProduct, parseSearch };
