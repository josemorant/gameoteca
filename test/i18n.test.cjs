// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('all five languages cover static UI, status messages and server error keys',()=>{
 const sandbox={localStorage:{getItem:()=>null}};
 vm.runInNewContext(fs.readFileSync('public/i18n.js','utf8')+';globalThis.catalog=translations;globalThis.defaultLanguage=language;',sandbox);
 assert.equal(sandbox.defaultLanguage,'en');
 for(const [key,values] of Object.entries(sandbox.catalog)){
   assert.equal(values.length,5,key);
   values.forEach(value=>assert.ok(typeof value==='string'&&value.trim(),key));
   const placeholders=value=>[...value.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort().join(',');
   values.forEach(value=>assert.equal(placeholders(value),placeholders(values[0]),key));
 }
 const html=fs.readFileSync('public/index.html','utf8');
 for(const match of html.matchAll(/data-(?:i18n|label-key|title-key|placeholder-key)="([^"]+)"/g))assert.ok(sandbox.catalog[match[1]],match[1]);
 for(const file of ['src/server.cjs','src/store.cjs','src/providers.cjs']){
   for(const match of fs.readFileSync(file,'utf8').matchAll(/(?:throw Error\(|error:)\s*'([a-zA-Z]+)'/g))assert.ok(sandbox.catalog[match[1]],match[1]);
 }
});
