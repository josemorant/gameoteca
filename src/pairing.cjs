// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const crypto = require('node:crypto');

function createPairing({ now = Date.now } = {}) {
  const pin = String(crypto.randomInt(10000)).padStart(4, '0');
  const failures = new Map();
  const sessions = new Map();
  let globalFailures = 0;
  let globalReset = now() + 300000;
  function pair(address, candidate) {
    const time = now();
    if (time >= globalReset) { globalFailures = 0; globalReset = time + 300000; }
    const entry = failures.get(address);
    if ((entry && entry.until > time && entry.count >= 5) || globalFailures >= 40) {
      return { status: 429, error: 'pairLimited' };
    }
    if (typeof candidate !== 'string' || !/^\d{4}$/.test(candidate) || candidate !== pin) {
      const count = entry && entry.until > time ? entry.count + 1 : 1;
      failures.set(address, { count, until: time + 300000 });
      globalFailures++;
      if (failures.size > 1024) for (const [key, value] of failures) if (value.until <= time) failures.delete(key);
      return { status: 401, error: 'pairInvalid' };
    }
    failures.delete(address);
    for (const [key, expiry] of sessions) if (expiry <= time) sessions.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, time + 12 * 3600000);
    return { status: 200, token };
  }
  return { pin, pair, authorized(token) { return typeof token === 'string' && (sessions.get(token) || 0) > now(); } };
}
module.exports = { createPairing };
