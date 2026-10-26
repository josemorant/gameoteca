// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { zipSync, strToU8 } = require('fflate');
const gametdb = require('../src/gametdb.cjs');
const retail = require('../src/retail-catalog.cjs');
const providers = require('../src/providers.cjs');
const { start } = require('../src/server.cjs');
const xml = '<datafile><game name="Metroid Prime 4: Beyond (EN,ES)"><id>BGW5A</id><type>Switch</type><locale lang="EN"><title>Metroid Prime 4: Beyond</title></locale><locale lang="ES"><title>Metroid Prime 4: Beyond</title></locale></game></datafile>';
const searchHtml = '<article class="product-miniature"><h3 class="product-title"><a href="https://www.shinestar.es/SOFT/18259-S2MEP4-0045496513245.html">Switch - Metroid Prime 4: Beyond</a></h3></article>';
const productHtml = '<meta property="og:image" content="https://www.shinestar.es/47969-thickbox_default/S2MEP4.jpg"><h1>Switch - Metroid Prime 4: Beyond</h1><div class="product-reference"><label>EAN </label><span itemprop="sku">0045496513245</span></div>';

test('GameTDB matches punctuation-insensitive titles, falls back from ES to EN and caches its index', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gametdb-index-'));
  const original = global.fetch, requests = [];
  global.fetch = async (url, options) => {
    requests.push(String(url));
    if (String(url).includes('switchtdb.zip')) return new Response(Buffer.from(zipSync({ 'switchtdb.xml': strToU8(xml) })));
    if (String(url).includes('/ES/')) return new Response('', { status: 404 });
    assert.equal(options.method, 'HEAD');
    return new Response(null, { headers: { 'Content-Type': 'image/jpeg' } });
  };
  try {
    const results = await gametdb.search('metroid prime 4 beyond', 'Nintendo Switch', { cacheDir: directory, language: 'es' });
    assert.equal(results.length, 1); assert.equal(results[0].externalId, 'BGW5A'); assert.equal(results[0].region, 'EN');
    assert.equal(results[0].url, 'https://art.gametdb.com/switch/coverM/EN/BGW5A.jpg');
    await gametdb.search('Metroid Prime 4', 'Nintendo Switch', { cacheDir: directory, language: 'es' });
    assert.equal(requests.filter(url => url.includes('switchtdb.zip')).length, 1);
    assert.ok(fs.existsSync(path.join(directory, 'gametdb-switch.json')));
    assert.deepEqual(await gametdb.search('Metroid', 'Nintendo Switch 2'), []);
    assert.throws(() => gametdb.parseCatalog('<!DOCTYPE unsafe><datafile/>'));
  } finally { global.fetch = original; fs.rmSync(directory, { recursive: true }); }
});
test('retail parsing accepts equivalent UPC/EAN only after checking the product EAN field', () => {
  assert.equal(retail.parseSearch(searchHtml).length, 1);
  assert.equal(retail.parseProduct(productHtml, '045496513245').rawTitle, 'Switch - Metroid Prime 4: Beyond');
  assert.equal(retail.parseProduct(productHtml, '0045496513245').code, '0045496513245');
  assert.equal(retail.parseProduct(productHtml, '045496590475'), null);
  assert.equal(retail.parseProduct('<h1>Metroid Prime 4</h1><div>0045496513245</div>', '045496513245'), null);
  assert.deepEqual(retail.parseSearch('<h3 class="product-title"><a href="https://evil.test/0045496513245">Wrong origin</a></h3>'), []);
});
test('the reported Spanish barcode falls back to the verified catalogue and supports its EAN-13 form', async () => {
  const original = global.fetch, requests = [];
  global.fetch = async url => {
    requests.push(String(url));
    if (String(url).includes('api.upcitemdb.com')) return Response.json({ code: 'OK', items: [] });
    if (String(url).includes('switchtdb.zip')) return new Response(Buffer.from(zipSync({ 'switchtdb.xml': strToU8(xml) })));
    if (String(url).includes('art.gametdb.com')) return new Response(null, { headers: { 'Content-Type': 'image/jpeg' } });
    if (String(url).includes('/busqueda')) return new Response(searchHtml);
    return new Response(productHtml);
  };
  try {
    const results = await providers.barcode('045496513245', { language: 'es' });
    assert.equal(results[0].title, 'Metroid Prime 4: Beyond'); assert.equal(results[0].platform, 'Nintendo Switch');
    assert.equal(results[0].source, 'Shine Star'); assert.match(results[0].artworkUrl, /art\.gametdb\.com/); assert.equal(results[0].artworkSource,'GameTDB');
    assert.ok(requests.some(url=>url.includes('s=0045496513245')));
    const count = requests.length;
    const ean = await providers.barcode('0045496513245', { language: 'es' });
    assert.equal(ean[0].barcode, '0045496513245'); assert.equal(requests.length, count);
  } finally { global.fetch = original; }
});
test('an unavailable barcode provider does not block the alternative catalogue', async () => {
  const original = global.fetch;
  global.fetch = async url => String(url).includes('api.upcitemdb.com') ? new Response('', { status: 429 }) : new Response(String(url).includes('/busqueda') ? searchHtml : productHtml);
  try { assert.equal((await providers.barcode('045496513245', { language: 'de' }))[0].source, 'Shine Star'); }
  finally { global.fetch = original; }
});
test('a provider outage is reported instead of an empty artwork search', async () => {
  const original = global.fetch; global.fetch = async () => { throw Error('offline'); };
  try { await assert.rejects(providers.search('Metroid Prime 4', 'Nintendo Switch 2'), /providerUnavailable/); }
  finally { global.fetch = original; }
});
test('fetching a saved copy cover preserves every copy condition, edition and note', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'saved-artwork-'));
  const service = await start({ port: 0, tls: false, dataDir: directory });
  const original = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).startsWith('http://127.0.0.1:')) return original(url, options);
    if (String(url).includes('api.github.com')) return Response.json({ tree: [{ path: 'Named_Boxarts/Example Game.png' }] });
    return new Response(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64'), { headers: { 'Content-Type': 'image/png' } });
  };
  try {
    service.store.save({ title: 'Example Game', platform: 'Nintendo 64', state: 'sealed', edition: 'PAL', notes: 'Original note' });
    service.store.save({ title: 'Example Game', platform: 'Nintendo 64', state: 'good', edition: 'Standard', notes: 'Second copy' });
    const before = service.store.list(), copy = before[0];
    const response = await fetch(`http://127.0.0.1:${service.port}/api/copies/${copy.id}/artwork`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 200); const after = service.store.list();
    assert.deepEqual(after.map(({ cover, source, ...rest }) => rest), before.map(({ cover, source, ...rest }) => rest));
    assert.ok(after.every(copy => copy.cover && copy.source === 'Libretro'));
    assert.ok(fs.existsSync(path.join(directory, after[0].cover)));
  } finally { global.fetch = original; await service.close(); fs.rmSync(directory, { recursive: true }); }
});
