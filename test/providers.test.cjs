// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test'),assert=require('node:assert/strict');
test('Libretro maps platform names to repositories and preserves regions',async()=>{
 const original=global.fetch;let requested='';global.fetch=async url=>{requested=String(url);return {ok:true,json:async()=>({tree:[{path:'Named_Boxarts/Super Mario 64 (Europe).png'},{path:'Named_Snaps/Super Mario 64.png'}]})}};
 try{const results=await require('../src/providers.cjs').search('Super Mario','Nintendo 64');assert.match(requested,/Nintendo_-_Nintendo_64/);assert.equal(results.length,1);assert.equal(results[0].title,'Super Mario 64 (Europe)');assert.match(results[0].url,/Nintendo_-_Nintendo_64\/master\/Named_Boxarts/)}finally{global.fetch=original}
});
