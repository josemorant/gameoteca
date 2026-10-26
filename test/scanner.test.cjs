// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LiveBarcodeScanner, normalizeBarcode } = require('../public/scanner.js');
test('the bundled real decoder reads an EAN-13 image with the camera format hints',async()=>{
  const image=await require('bwip-js').toBuffer({bcid:'ean13',text:'0045496590475',scale:3,height:16,includetext:false,paddingwidth:20,paddingheight:12,backgroundcolor:'FFFFFF',barcolor:'000000'});
  const png=require('pngjs').PNG.sync.read(image),Z=require('@zxing/library');
  const luminance=new Uint8ClampedArray(png.width*png.height);
  for(let i=0;i<luminance.length;i++)luminance[i]=(png.data[i*4]+2*png.data[i*4+1]+png.data[i*4+2])/4;
  const hints=new Map([[Z.DecodeHintType.POSSIBLE_FORMATS,[Z.BarcodeFormat.EAN_13,Z.BarcodeFormat.EAN_8,Z.BarcodeFormat.UPC_A,Z.BarcodeFormat.UPC_E]],[Z.DecodeHintType.TRY_HARDER,true]]);
  const reader=new Z.MultiFormatReader();
  const result=reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.RGBLuminanceSource(luminance,png.width,png.height))),hints);
  assert.equal(normalizeBarcode(result.getText()).replace(/^0(?=\d{12}$)/,''),'045496590475');
});

test('EAN and UPC checksums reject false reads and UPC-E expands correctly', () => {
  assert.equal(normalizeBarcode('045496590475'), '045496590475');
  assert.equal(normalizeBarcode('0045496590475'), '0045496590475');
  assert.equal(normalizeBarcode('045496590476'), null);
  assert.equal(normalizeBarcode('123456789'), null);
  assert.equal(normalizeBarcode('hello'), null);
  assert.equal(normalizeBarcode('04252614', 'upc_e'), '042100005264');
});
test('live camera reads stop the stream and emit one internet lookup candidate', { timeout: 3000 }, async () => {
  let stopCount = 0, constraints, formats, detected = [];
  const stream = { getTracks: () => [{ stop: () => stopCount++ }] };
  const video = { srcObject: null, play: async () => {} };
  let resolve;
  const result = new Promise(r => { resolve = r; });
  class Detector {
    static async getSupportedFormats() { return ['qr_code','ean_13','upc_a']; }
    constructor(options) { formats = options.formats; }
    async detect() { return [{ rawValue:'045496590476',format:'upc_a' },{rawValue:'045496590475',format:'upc_a'},{rawValue:'045496590475',format:'upc_a'}]; }
  }
  const camera = new LiveBarcodeScanner({video,Detector,mediaDevices:{getUserMedia:async options => { constraints=options;return stream; }},onDetected:code => { detected.push(code);resolve(); }});
  await camera.start(); await result;
  assert.equal(constraints.video.facingMode.ideal,'environment');assert.equal(constraints.audio,false);
  assert.deepEqual(formats,['ean_13','upc_a']);assert.deepEqual(detected,['045496590475']);
  assert.equal(stopCount,1);assert.equal(video.srcObject,null);
});
test('closing while camera permission is pending releases the eventual stream', async () => {
  let resolve, stopped=0;
  const camera=new LiveBarcodeScanner({video:{srcObject:null,play:async()=>{}},onDetected:()=>assert.fail('Unexpected barcode'),mediaDevices:{getUserMedia:()=>new Promise(r=>{resolve=r;})}});
  const start=camera.start();camera.stop();resolve({getTracks:()=>[{stop:()=>stopped++}]});
  assert.equal(await start,false);assert.equal(stopped,1);
});
test('ZXing fallback uses only retail barcode formats and resets after detection',async()=>{
  let options,resets=0,stopped=0,found;
  const Z={DecodeHintType:{POSSIBLE_FORMATS:1,TRY_HARDER:2},BarcodeFormat:{EAN_13:13,EAN_8:8,UPC_A:12,UPC_E:7},BrowserMultiFormatReader:class{
    constructor(hints){options=hints;}
    reset(){resets++;}
    async decodeFromStream(stream,video,callback){callback({getText:()=> '045496590475',getBarcodeFormat:()=>12});}
  }};
  const camera=new LiveBarcodeScanner({video:{srcObject:null,play:async()=>{}},Detector:null,zxing:Z,onDetected:code=>{found=code;},mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop:()=>stopped++}]})}});
  await camera.start();assert.deepEqual(options.get(1),[13,8,12,7]);assert.equal(found,'045496590475');assert.equal(stopped,1);assert.ok(resets>=1);
});
