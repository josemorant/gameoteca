// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),QRCode=require('qrcode');
const {loadTLS}=require('./tls.cjs');
const {downloadArtwork,findCopyArtwork}=require('./artwork.cjs');
const {openStore,STATES}=require('./store.cjs'),{createPairing}=require('./pairing.cjs'),providers=require('./providers.cjs');
async function start({port=Number(process.env.PORT||3210),httpsPort=Number(process.env.HTTPS_PORT||(port?port+1:0)),tls=true,dataDir=process.env.DATA_DIR||path.join(__dirname,'../data'),lookupBarcode=providers.barcode}={}){
 const networkIPs=()=>[...new Set(Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal).map(i=>i.address))];
 fs.mkdirSync(path.join(dataDir,'covers'),{recursive:true});
 const certificates=tls?await loadTLS(dataDir,networkIPs()):null;
 const store=openStore(path.join(dataDir,'catalog.sqlite')),pairing=createPairing();
 const providerOptions=url=>({cacheDir:path.join(dataDir,'provider-cache'),language:['en','es','ca','fr','de'].includes(url.searchParams.get('language'))?url.searchParams.get('language'):'en'});
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 const addresses=()=>networkIPs().map(ip=>`http://${ip}:${server.address().port}/?${certificates?'setup':'scan'}=1`);
 const scanAddresses=()=>networkIPs().map(ip=>certificates?`https://${ip}:${secureServer.address().port}/?scan=1`:`http://${ip}:${server.address().port}/?scan=1`);
 let server,secureServer;
 const handle=async(req,res)=>{try{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Permissions-Policy','camera=(self), microphone=()');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'");
 const url=new URL(req.url,'http://localhost'),local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
 if(req.method==='GET'&&url.pathname==='/mobile/setup'){
 const host=new URL(`http://${req.headers.host}`).hostname;
 if(!certificates||!['localhost','127.0.0.1',...networkIPs()].includes(host))return send(res,400,{error:'secureUnavailable'});
 return send(res,200,{secureUrl:`https://${host}:${secureServer.address().port}/?scan=1`,certificateUrl:'/mobile-ca.cer',fingerprint:certificates.fingerprint});
 }
 if(req.method==='GET'&&url.pathname==='/mobile-ca.cer'){
 if(!certificates)return send(res,404,{error:'notFound'});
 res.writeHead(200,{'Content-Type':'application/x-x509-ca-cert','Content-Disposition':'attachment; filename="Gameoteca-Scanner-CA.cer"','Cache-Control':'no-store'});return res.end(certificates.caDer);
 }
 if(url.pathname.startsWith('/api/')){
 if(req.headers.origin&&req.headers.origin!==`${req.socket.encrypted?'https':'http'}://${req.headers.host}`)return send(res,403,{error:'originBlocked'});
 if(url.pathname!=='/api/pair'&&!local&&!pairing.authorized(req.headers['x-pair-token']))return send(res,401,{error:'pairRequired'});
 let body={};if(['POST','PUT'].includes(req.method)){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000)return send(res,413,{error:'requestLarge'})}try{body=JSON.parse(raw||'{}')}catch{return send(res,400,{error:'invalidData'})}}
 if(req.method==='POST'&&url.pathname==='/api/pair'){const result=pairing.pair(req.socket.remoteAddress,body.pin);return send(res,result.status,result.token?{token:result.token}:{error:result.error})}
 if(req.method==='GET'&&url.pathname==='/api/info')return send(res,200,{states:STATES,platforms:[...new Set(['Nintendo Switch','Nintendo Switch 2',...Object.keys(providers.platforms),'PlayStation 3','PlayStation 4','PlayStation 5','Xbox','Xbox 360','Xbox One','Xbox Series','PC','Other'])],urls:local?addresses():[],scanUrls:local?scanAddresses():[],fingerprint:local?certificates?.fingerprint:undefined,tls:!!certificates,pin:local?pairing.pin:undefined});
 if(req.method==='GET'&&url.pathname==='/api/qr'){
 if(!local)return send(res,403,{error:'localOnly'});
 const index=Number(url.searchParams.get('index')),address=addresses()[index];if(!address||!Number.isInteger(index))return send(res,400,{error:'noNetwork'});
 const image=await QRCode.toBuffer(address,{type:'png',errorCorrectionLevel:'M',margin:4,scale:8,color:{dark:'#252525',light:'#ffffff'}});res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});return res.end(image);
 }
 if(req.method==='GET'&&url.pathname==='/api/copies')return send(res,200,store.list());
 if(req.method==='GET'&&url.pathname==='/api/export'){res.setHeader('Content-Disposition','attachment; filename="gameoteca.json"');return send(res,200,{exported:new Date().toISOString(),copies:store.list()})}
 if(req.method==='POST'&&url.pathname==='/api/copies'){store.save(body);return send(res,201,{ok:true})}
 const artworkMatch=url.pathname.match(/^\/api\/copies\/(\d+)\/artwork$/);
 if(artworkMatch&&req.method==='POST'){
 const copy=store.list().find(copy=>copy.id===Number(artworkMatch[1]));if(!copy)throw Error('copyMissing');
 const artwork=await findCopyArtwork(copy,providerOptions(url));const cover=await downloadArtwork(artwork.url,dataDir);store.setArtwork(copy.id,cover,artwork.source);return send(res,200,{cover,source:artwork.source});
 }
 const match=url.pathname.match(/^\/api\/copies\/(\d+)$/);if(match&&req.method==='PUT'){store.save(body,Number(match[1]));return send(res,200,{ok:true})}if(match&&req.method==='DELETE'){store.remove(Number(match[1]));return send(res,200,{ok:true})}
 if(req.method==='GET'&&url.pathname==='/api/search'){const q=url.searchParams.get('q')||'';if(q.trim().length<2)throw Error('searchShort');return send(res,200,await providers.search(q,url.searchParams.get('platform'),providerOptions(url)))}
 if(req.method==='GET'&&url.pathname==='/api/barcode'){const code=url.searchParams.get('code')||'';if(!/^\d{8,14}$/.test(code))throw Error('barcodeInvalid');return send(res,200,await lookupBarcode(code,providerOptions(url)))}
 if(req.method==='POST'&&url.pathname==='/api/cover'){
 return send(res,200,{cover:await downloadArtwork(body.url,dataDir)});
 }return send(res,404,{error:'notFound'});
 }
 let file;if(url.pathname.startsWith('/covers/')){if(!/^\/covers\/[a-f0-9]+\.(png|jpg|webp)$/.test(url.pathname))return send(res,404,{error:'notFound'});file=path.join(dataDir,url.pathname)}
 else if(/^\/icons\/gameoteca-(16|32|48|180|192|256|512)\.png$/.test(url.pathname)){file=path.join(__dirname,'../public',url.pathname)}
 else {const assets={'/':'public/index.html','/favicon.ico':'public/icons/favicon.ico','/site.webmanifest':'public/site.webmanifest','/app.js':'public/app.js','/scanner.js':'public/scanner.js','/i18n.js':'public/i18n.js','/ui-icons.svg':'public/ui-icons.svg','/style.css':'public/style.css','/bootstrap.css':'node_modules/bootstrap/dist/css/bootstrap.min.css','/zxing.js':'node_modules/@zxing/library/umd/index.min.js'};if(!assets[url.pathname])return send(res,404,{});file=path.join(__dirname,'..',assets[url.pathname])}
 const data=await fs.promises.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.jpg':'image/jpeg','.webp':'image/webp'})[path.extname(file)]});res.end(data);
 }catch(e){send(res,e.code==='ENOENT'?404:400,{error:/^[a-zA-Z]+$/.test(e.message)?e.message:'unexpectedError'})}};
 server=http.createServer(handle);if(certificates)secureServer=https.createServer({key:certificates.key,cert:certificates.cert,minVersion:'TLSv1.2'},handle);
 const listen=(instance,number)=>new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(number,'0.0.0.0',resolve)});
 const stop=instance=>new Promise(resolve=>{if(instance?.listening)instance.close(resolve);else resolve()});
 try{await listen(server,port);if(secureServer)await listen(secureServer,httpsPort)}catch(e){await stop(server);await stop(secureServer);store.close();throw e}
 return {server,secureServer,store,port:server.address().port,httpsPort:secureServer?.address().port,ca:certificates?.ca,close:async()=>{await Promise.all([stop(server),stop(secureServer)]);store.close()}};
}
if(require.main===module)start().then(s=>console.log(`Gameoteca: http://localhost:${s.port}`)).catch(e=>{console.error(e);process.exitCode=1});module.exports={start};
