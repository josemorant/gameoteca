// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),https=require('node:https'),crypto=require('node:crypto');
const {loadTLS}=require('../src/tls.cjs'),{start}=require('../src/server.cjs');
test('local CA is persistent and signs renewed IP-specific server certificates',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gameoteca-ca-'));
 try{
  const first=await loadTLS(directory,['192.168.1.23']);const second=await loadTLS(directory,['192.168.1.24']);
  assert.equal(first.fingerprint,second.fingerprint);
  const root=new crypto.X509Certificate(second.ca),leaf=new crypto.X509Certificate(second.cert);
  assert.equal(root.ca,true);assert.equal(leaf.ca,false);assert.ok(leaf.verify(root.publicKey));
  assert.ok(leaf.checkIP('192.168.1.24'));assert.equal(leaf.checkIP('192.168.1.23'),undefined);
  assert.ok(Date.parse(leaf.validTo)-Date.parse(leaf.validFrom)<398*86400000);
 }finally{fs.rmSync(directory,{recursive:true});}
});
test('HTTPS is verified with the generated CA; onboarding exposes no private key',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gameoteca-https-'));
 const service=await start({port:0,dataDir:directory});
 try{
  const setup=await(await fetch(`http://127.0.0.1:${service.port}/mobile/setup`)).json();
  assert.equal(setup.secureUrl,`https://127.0.0.1:${service.httpsPort}/?scan=1`);
  assert.match(setup.fingerprint,/^[A-F0-9:]+$/);
  const certificate=await fetch(`http://127.0.0.1:${service.port}/mobile-ca.cer`);assert.equal(certificate.status,200);
  assert.equal(new crypto.X509Certificate(Buffer.from(await certificate.arrayBuffer())).ca,true);
  assert.equal((await fetch(`http://127.0.0.1:${service.port}/tls/ca-key.pem`)).status,404);
  const response=await new Promise((resolve,reject)=>{https.get(`https://127.0.0.1:${service.httpsPort}/api/info`,{ca:service.ca,headers:{Origin:`https://127.0.0.1:${service.httpsPort}`}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(text)}));}).on('error',reject);});
  assert.equal(response.status,200);assert.match(response.data.pin,/^\d{4}$/);
 }finally{await service.close();fs.rmSync(directory,{recursive:true});}
});
