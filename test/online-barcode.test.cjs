// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const providers=require('../src/providers.cjs');
const {start}=require('../src/server.cjs');
test('internet metadata infers platform and returns trusted artwork automatically',async()=>{
 const original=global.fetch;const calls=[];
 global.fetch=async url=>{calls.push(String(url));return{ok:true,status:200,json:async()=>({code:'OK',items:[{title:'Nintendo Switch Mario Kart 8 Deluxe racing video game',images:['http://127.0.0.1/private','https://i5.walmartimages.com/cover.jpg']}]})}};
 try{
  const items=await providers.barcode('045496590475');
  assert.equal(items[0].title,'Mario Kart 8 Deluxe');assert.equal(items[0].platform,'Nintendo Switch');assert.equal(items[0].source,'UPCitemdb');
  assert.equal(items[0].artworkUrl,'https://i5.walmartimages.com/cover.jpg');assert.match(calls[0],/^https:\/\/api.upcitemdb.com\//);
  assert.equal(providers.allowedArtwork('https://raw.githubusercontent.com.evil.test/image.png'),false);
  assert.equal(providers.allowedArtwork('https://cdn.thegamesdb.net:8080/image.jpg'),false);
 }finally{global.fetch=original;}
});
test('ambiguous platform names remain unset rather than selecting a wrong platform',()=>{
 assert.equal(providers.inferPlatform({title:'Example game for PS4 / PS5'}),'');
 assert.equal(providers.inferPlatform({title:'Example for Nintendo Switch 2'}),'Nintendo Switch 2');
 assert.equal(providers.inferPlatform({title:'Example for Wii U'}),'Wii U');
 assert.equal(providers.cleanTitle('Nintendo Switch Sports','Nintendo Switch'),'Nintendo Switch Sports');
});
test('barcode API always calls the internet adapter even when the collection has that barcode',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'online-only-'));let calls=0;
 const service=await start({port:0,tls:false,dataDir:directory,lookupBarcode:async code=>{calls++;return[{barcode:code,title:'Internet title',platform:'Nintendo Switch',source:'UPCitemdb'}];}});
 try{
  service.store.save({barcode:'045496590475',title:'Local title',platform:'Nintendo Switch',state:'good'});
  const data=await(await fetch(`http://127.0.0.1:${service.port}/api/barcode?code=045496590475`)).json();
  assert.equal(calls,1);assert.equal(data[0].title,'Internet title');assert.equal(data[0].source,'UPCitemdb');
 }finally{await service.close();fs.rmSync(directory,{recursive:true});}
});
