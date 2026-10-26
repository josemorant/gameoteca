// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {PNG}=require('pngjs');
const jsQR=require('jsqr');
const {start}=require('../src/server.cjs');
test('QR decodes to the scanner URL; remote access requires PIN pairing',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gameoteca-mobile-'));
 const service=await start({port:0,dataDir:dir});
 const base=`http://127.0.0.1:${service.port}`;
 try{
   const info=await(await fetch(base+'/api/info')).json();assert.match(info.pin,/^\d{4}$/);assert.equal(info.token,undefined);
   for(const file of ['/i18n.js','/ui-icons.svg','/favicon.ico'])assert.equal((await fetch(base+file)).status,200);
   if(info.urls.length){
     const response=await fetch(base+'/api/qr?index=0');assert.equal(response.headers.get('content-type'),'image/png');
     const png=PNG.sync.read(Buffer.from(await response.arrayBuffer()));
     const decoded=jsQR(new Uint8ClampedArray(png.data),png.width,png.height);
     assert.ok(decoded,'QR must be readable by an independent decoder');
     assert.equal(decoded.data,info.urls[0]);assert.ok(!decoded.data.includes('pin='));
     const remote=new URL(info.urls[0]).origin;
     assert.equal((await fetch(remote+'/api/copies')).status,401);
     assert.equal((await fetch(remote+'/api/copies',{headers:{'X-Pair-Token':info.pin}})).status,401);
     const pairing=await fetch(remote+'/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:info.pin})});
     assert.equal(pairing.status,200);const {token}=await pairing.json();
     const remoteInfo=await(await fetch(remote+'/api/info',{headers:{'X-Pair-Token':token}})).json();
     assert.equal(remoteInfo.pin,undefined);assert.deepEqual(remoteInfo.urls,[]);
     assert.equal((await fetch(remote+'/api/copies',{headers:{'X-Pair-Token':token}})).status,200);
     assert.equal((await fetch(remote+'/api/qr?index=0',{headers:{'X-Pair-Token':token}})).status,403);
   }
   assert.equal((await fetch(base+'/api/pair',{method:'POST',headers:{Origin:'https://other.test','Content-Type':'application/json'},body:JSON.stringify({pin:info.pin})})).status,403);
 }finally{await service.close();fs.rmSync(dir,{recursive:true})}
});
