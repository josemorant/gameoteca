// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
async function get(url, { binary = false, method = 'GET', maxBytes = 2 * 1024 * 1024, timeout = 20000 } = {}) {
  let response;
  try { response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(timeout), headers: { 'User-Agent': 'Gameoteca/1.3' } }); }
  catch { throw Error('providerUnavailable'); }
  if (!response.ok) throw Error('providerUnavailable');
  if (method === 'HEAD') return response;
  if (Number(response.headers.get('content-length')) > maxBytes) throw Error('providerUnavailable');
  let length = 0; const chunks = [];
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maxBytes) throw Error('providerUnavailable');
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return binary ? buffer : buffer.toString('utf8');
}
module.exports = { get };
