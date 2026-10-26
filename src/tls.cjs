// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
require('reflect-metadata');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const x509 = require('@peculiar/x509');
const webcrypto = crypto.webcrypto;
const algorithm = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
const day = 86400000;
const pemKey = async key => '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await webcrypto.subtle.exportKey('pkcs8', key)).toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
const serial = () => '01' + crypto.randomBytes(15).toString('hex');

async function loadTLS(dataDir, addresses) {
  const directory = path.join(dataDir, 'tls');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const caFile = path.join(directory, 'ca.pem'), caKeyFile = path.join(directory, 'ca-key.pem');
  if (!fs.existsSync(caFile) && !fs.existsSync(caKeyFile)) {
    const keys = await webcrypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    const ca = await x509.X509CertificateGenerator.createSelfSigned({
      serialNumber: serial(), name: 'CN=Gameoteca Local Scanner CA', keys,
      notBefore: new Date(Date.now() - day), notAfter: new Date(Date.now() + 3650 * day),
      extensions: [new x509.BasicConstraintsExtension(true, 0, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
        await x509.SubjectKeyIdentifierExtension.create(keys.publicKey, false, webcrypto)]
    }, webcrypto);
    fs.writeFileSync(caKeyFile, await pemKey(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(caFile, ca.toString('pem'));
  }
  const caPem = fs.readFileSync(caFile, 'utf8');
  const root = new crypto.X509Certificate(caPem);
  if (Date.parse(root.validTo) < Date.now() + day) throw Error('tlsExpired');
  const ips = [...new Set(['127.0.0.1', ...addresses])].sort();
  const leafFile = path.join(directory, 'server.pem'), leafKeyFile = path.join(directory, 'server-key.pem');
  const metaFile = path.join(directory, 'addresses.json');
  let renew = true;
  if (fs.existsSync(leafFile) && fs.existsSync(leafKeyFile) && fs.existsSync(metaFile)) {
    const leaf = new crypto.X509Certificate(fs.readFileSync(leafFile));
    renew = Date.parse(leaf.validTo) < Date.now() + 7 * day || fs.readFileSync(metaFile, 'utf8') !== JSON.stringify(ips) || !leaf.verify(root.publicKey);
  }
  if (renew) {
    const keyDer = crypto.createPrivateKey(fs.readFileSync(caKeyFile)).export({ type: 'pkcs8', format: 'der' });
    const signingKey = await webcrypto.subtle.importKey('pkcs8', keyDer, algorithm, false, ['sign']);
    const keys = await webcrypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    const rootCertificate = new x509.X509Certificate(caPem);
    const cert = await x509.X509CertificateGenerator.create({
      serialNumber: serial(), subject: 'CN=Gameoteca Local Scanner', issuer: rootCertificate.subject,
      publicKey: keys.publicKey, signingKey,
      notBefore: new Date(Date.now() - day), notAfter: new Date(Date.now() + 365 * day),
      extensions: [new x509.BasicConstraintsExtension(false, undefined, true),
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment, true),
        new x509.ExtendedKeyUsageExtension(['1.3.6.1.5.5.7.3.1']),
        new x509.SubjectAlternativeNameExtension([{ type: 'dns', value: 'localhost' }, ...ips.map(value => ({ type: 'ip', value }))]),
        await x509.SubjectKeyIdentifierExtension.create(keys.publicKey, false, webcrypto),
        await x509.AuthorityKeyIdentifierExtension.create(rootCertificate.publicKey, false, webcrypto)]
    }, webcrypto);
    fs.writeFileSync(leafKeyFile, await pemKey(keys.privateKey), { mode: 0o600 });
    fs.writeFileSync(leafFile, cert.toString('pem'));
    fs.writeFileSync(metaFile, JSON.stringify(ips));
  }
  return { key: fs.readFileSync(leafKeyFile), cert: fs.readFileSync(leafFile, 'utf8') + '\n' + caPem,
    ca: caPem, caDer: root.raw, fingerprint: root.fingerprint256 };
}
module.exports = { loadTLS };
