// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPairing}=require('../src/pairing.cjs');

test('four digit PIN exchanges for expiring sessions, not direct API credentials',()=>{
 let time=1000;const pairing=createPairing({now:()=>time});
 assert.match(pairing.pin,/^\d{4}$/);
 assert.equal(pairing.authorized(pairing.pin),false);
 const result=pairing.pair('phone',pairing.pin);
 assert.equal(result.status,200);assert.ok(pairing.authorized(result.token));
 assert.equal(pairing.authorized('random'),false);
 time+=12*3600000;assert.equal(pairing.authorized(result.token),false);
});
test('five failed PIN attempts lock the address for five minutes',()=>{
 let time=1000;const pairing=createPairing({now:()=>time});
 const wrong=pairing.pin==='0000'?'0001':'0000';
 for(let n=0;n<5;n++)assert.equal(pairing.pair('phone',wrong).status,401);
 assert.equal(pairing.pair('phone',pairing.pin).status,429);
 assert.equal(pairing.pair('other',pairing.pin).status,200);
 time+=300001;assert.equal(pairing.pair('phone',pairing.pin).status,200);
});
test('global attempt limit bounds guessing across multiple addresses',()=>{
 const pairing=createPairing();
 for(let n=0;n<40;n++)assert.equal(pairing.pair('phone-'+n,'invalid').status,401);
 assert.equal(pairing.pair('another',pairing.pin).status,429);
});
