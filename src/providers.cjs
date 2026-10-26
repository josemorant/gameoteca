// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const platforms = {'NES':'Nintendo - Nintendo Entertainment System','Super Nintendo':'Nintendo - Super Nintendo Entertainment System','Nintendo 64':'Nintendo - Nintendo 64','Game Boy':'Nintendo - Game Boy','Game Boy Color':'Nintendo - Game Boy Color','Game Boy Advance':'Nintendo - Game Boy Advance','Nintendo DS':'Nintendo - Nintendo DS','Nintendo 3DS':'Nintendo - Nintendo 3DS','GameCube':'Nintendo - GameCube','Wii':'Nintendo - Wii','Wii U':'Nintendo - Wii U','PlayStation':'Sony - PlayStation','PlayStation 2':'Sony - PlayStation 2','PSP':'Sony - PlayStation Portable','Mega Drive':'Sega - Mega Drive - Genesis','Dreamcast':'Sega - Dreamcast'};
async function json(url){try{const r=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Gameoteca/1.1'}});if(!r.ok)throw Error('providerUnavailable');return await r.json()}catch{throw Error('providerUnavailable')}}
const cache=new Map();
const gametdb = require('./gametdb.cjs');
const retail = require('./retail-catalog.cjs');
async function theGamesDBSearch(title,platform){
 const u=new URL('https://api.thegamesdb.net/v1.1/Games/ByGameName');u.search=new URLSearchParams({apikey:process.env.THEGAMESDB_API_KEY,name:title,include:'boxart,platform'});
 const d=await json(u);return (d.data?.games||[]).slice(0,30).map(g=>({title:g.game_title,platform:inferPlatform({title:d.include?.platform?.data?.[g.platform]?.name||''})||d.include?.platform?.data?.[g.platform]?.name||platform,source:'TheGamesDB',url:(()=>{const a=d.include?.boxart?.data?.[g.id]?.find(a=>a.side==='front');return a?d.include.boxart.base_url.original+a.filename:''})()}));
}
async function libretroSearch(title,platform){
 const repo=platforms[platform]?.replace(/ /g,'_');if(!repo)return [];
 if(!cache.has(repo)){const d=await json(`https://api.github.com/repos/libretro-thumbnails/${encodeURIComponent(repo)}/git/trees/master?recursive=1`);cache.set(repo,(d.tree||[]).filter(x=>x.path.startsWith('Named_Boxarts/')&&x.path.endsWith('.png')).map(x=>x.path));}
 const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 return cache.get(repo).filter(p=>norm(p.slice(14)).includes(norm(title))).slice(0,30).map(p=>({title:p.split('/').pop().replace(/\.png$/,''),platform,source:'Libretro',url:`https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(repo)}/master/${p.split('/').map(encodeURIComponent).join('/')}`}));
}
const retailPlatforms = new Set(['Nintendo Switch','Nintendo Switch 2','PlayStation 3','PlayStation 4','PlayStation 5','Xbox One','Xbox Series','PC']);
async function search(title,platform,options={}){
 const requests=[];
 if(process.env.THEGAMESDB_API_KEY)requests.push(theGamesDBSearch(title,platform));
 if(platform==='Nintendo Switch')requests.push(gametdb.search(title,platform,options));
 if(platforms[platform])requests.push(libretroSearch(title,platform));
 if(retailPlatforms.has(platform))requests.push(retail.search(title).then(records=>records.map(record=>({title:cleanTitle(record.rawTitle,inferPlatform({title:record.rawTitle})),platform:inferPlatform({title:record.rawTitle}),source:'Shine Star',url:record.image,region:'ES'})).filter(record=>record.platform===platform&&allowedArtwork(record.url))));
 if(!requests.length)throw Error('platformUnavailable');
 const responses=await Promise.allSettled(requests);
 const results=responses.filter(response=>response.status==='fulfilled').flatMap(response=>response.value);
 if(!results.length&&responses.some(response=>response.status==='rejected'))throw Error('providerUnavailable');
 const seen=new Set();
 return results.filter(game=>{const key=game.platform+'|'+game.url;if(!allowedArtwork(game.url)||seen.has(key))return false;seen.add(key);return true;}).slice(0,30);
}
const artworkHosts = new Set(['raw.githubusercontent.com','cdn.thegamesdb.net','art.gametdb.com','www.shinestar.es','m.media-amazon.com','images-na.ssl-images-amazon.com','images-eu.ssl-images-amazon.com','i5.walmartimages.com','i.ebayimg.com','images.upcitemdb.com']);
function allowedArtwork(value) {
 try { const url=value instanceof URL?value:new URL(value);return url.protocol==='https:'&&!url.port&&!url.username&&!url.password&&artworkHosts.has(url.hostname); } catch { return false; }
}
const platformPatterns = [
 ['Nintendo Switch 2',/\b(?:nintendo\s+)?switch\s*2\b/i], ['Nintendo Switch',/\b(?:nintendo\s+)?switch\b(?!\s*2)/i],
 ['PlayStation 5',/\b(?:playstation\s*5|ps5)\b/i], ['PlayStation 4',/\b(?:playstation\s*4|ps4)\b/i],
 ['PlayStation 3',/\b(?:playstation\s*3|ps3)\b/i], ['PlayStation 2',/\b(?:playstation\s*2|ps2)\b/i],
 ['PlayStation',/\b(?:ps1|psx|playstation(?!\s*[2345]|\s+portable))\b/i],
 ['Xbox Series',/\bxbox\s+series\s*[xs]?(?:\s*[\/]\s*[xs])?\b/i], ['Xbox One',/\bxbox\s+one\b/i], ['Xbox 360',/\bxbox\s*360\b/i], ['Xbox',/\bxbox\b(?!\s*(?:series|one|360))/i],
 ['Nintendo 3DS',/\b(?:nintendo\s*)?3ds\b/i], ['Nintendo DS',/\b(?:nintendo\s+ds|nds)\b/i],
 ['Wii U',/\bwii\s*u\b/i], ['Wii',/\bwii\b(?!\s*u)/i], ['GameCube',/\bgame\s*cube\b/i],
 ['Game Boy Advance',/\b(?:game\s*boy\s*advance|gba)\b/i], ['Game Boy Color',/\bgame\s*boy\s*color\b/i],
 ['Game Boy',/\bgame\s*boy\b(?!\s*(?:advance|color))/i], ['Nintendo 64',/\b(?:nintendo\s*64|n64)\b/i],
 ['Super Nintendo',/\b(?:super\s*nintendo|snes)\b/i], ['NES',/\bnes\b/i],
 ['PSP',/\b(?:psp|playstation\s+portable)\b/i], ['Mega Drive',/\b(?:mega\s*drive|sega\s*genesis)\b/i],
 ['Dreamcast',/\bdreamcast\b/i], ['PC',/\b(?:pc|windows)\b/i]
];
function inferPlatform(item) {
 const primary=String(item.title||'')+' '+String(item.model||'');
 const found=platformPatterns.filter(([,pattern])=>pattern.test(primary));
 return found.length===1?found[0][0]:'';
}
function cleanTitle(title,platform) {
 let value=title.trim();
 const names=platformPatterns.find(([name])=>name===platform)?.[1].source;
 if(names){
  value=value.replace(new RegExp('^\\s*(?:'+names+')\\s*[-:|–]\\s*','i'),'');
  value=value.replace(new RegExp('\\s*(?:[-|–]\\s*|\\()'+names+'\\)?\\s*$','i'),'');
  value=value.replace(new RegExp('\\s+(?:'+names+')\\s*$','i'),'');
  if(!/^Nintendo Switch Sports$/i.test(value))value=value.replace(new RegExp('^\\s*(?:'+names+')\\s+','i'),'');
 }
 value=value.replace(/\s+(?:racing|action|adventure|sports|role[- ]playing)\s+video\s+game$/i,'');
 return value.trim()||title.trim();
}
const barcodeCache=new Map();
async function barcode(code,options={}) {
 const {normalizeBarcode}=require('../public/scanner.js');
 if(!normalizeBarcode(code))throw Error('barcodeInvalid');
 const key=code.padStart(14,'0')+':'+(options.language||'en');
 const cached=barcodeCache.get(key);if(cached&&cached.until>Date.now())return cached.items.map(item=>({...item,barcode:code}));
 let raw=[],failed=false;
 try{
  const response=await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Gameoteca/1.3'}});
  if(response.status!==404){if(!response.ok)throw Error('providerUnavailable');const data=await response.json();if(data.code&&data.code!=='OK')throw Error('providerUnavailable');raw=(data.items||[]).filter(item=>typeof item.title==='string'&&item.title.trim());}
 }catch{failed=true;}
 if(!raw.length||raw.every(item=>!inferPlatform(item))){
  try{
   const alternatives=await retail.barcode(code);
   raw.push(...alternatives.map(item=>({title:item.rawTitle,images:item.image?[item.image]:[],catalogSource:'Shine Star',sourceUrl:item.sourceUrl})));
  }catch{failed=true;}
 }
 if(!raw.length&&failed)throw Error('providerUnavailable');
 const items=[];
 for(const item of raw.slice(0,5)){
  const platform=inferPlatform(item),title=cleanTitle(item.title,platform);
  const source=item.catalogSource||'UPCitemdb';
  let artworkUrl=(item.images||[]).find(allowedArtwork)||'',artworkSource=artworkUrl?source:'';
  if((!artworkUrl||(item.catalogSource==='Shine Star'&&(platform==='Nintendo Switch'||process.env.THEGAMESDB_API_KEY)))&&platform){
   try{
    const matches=item.catalogSource==='Shine Star'&&platform==='Nintendo Switch'?await gametdb.search(title,platform,options):await search(title,platform,options);
    const normalized=value=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\([^)]*\)|\[[^\]]*\]/g,'').replace(/[^a-z0-9]/g,'');
    const exact=matches.filter(game=>game.platform===platform&&normalized(game.title)===normalized(title)&&allowedArtwork(game.url));
    const chosen=exact.find(game=>/\(Europe\)/i.test(game.title))||exact[0];
    if(chosen){artworkUrl=chosen.url;artworkSource=chosen.source;}
   }catch{ /* Metadata remains usable when an artwork provider is unavailable. */ }
  }
  items.push({title,platform,barcode:code,source,sourceUrl:item.sourceUrl||'',artworkUrl,artworkSource});
 }
 if(barcodeCache.size>=256)barcodeCache.delete(barcodeCache.keys().next().value);
 if(items.length)barcodeCache.set(key,{until:Date.now()+600000,items});
 return items;
}
module.exports={search,barcode,platforms,allowedArtwork,inferPlatform,cleanTitle};
