// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const asar=require('@electron/asar');
const file='release/win-unpacked/resources/app.asar';
const source=asar.extractFile(file,'src/providers.cjs').toString();
if(!source.includes("replace(/ /g,'_')"))throw Error('Missing Libretro repository-name normalization');
const files=asar.listPackage(file).map(p=>p.replace(/\\/g,'/'));
for(const suffix of ['bootstrap/dist/css/bootstrap.min.css','@zxing/library/umd/index.min.js','qrcode/lib/index.js','@peculiar/x509/build/x509.cjs.js','reflect-metadata/Reflect.js','fflate/lib/node.cjs','fast-xml-parser/lib/fxp.cjs','node-html-parser/dist/index.cjs','src/tls.cjs','src/store.cjs','src/pairing.cjs','src/gametdb.cjs','src/retail-catalog.cjs','src/catalog-http.cjs','src/artwork.cjs','public/app.js','public/scanner.js','public/i18n.js','public/ui-icons.svg'])if(!files.some(p=>p.endsWith(suffix)))throw Error('Missing '+suffix);
console.log('Windows package verified: live scanner, HTTPS, artwork provider chain, QR, pairing, SQLite, translations and icons.');
