// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const executable=path.resolve('release/win-unpacked/Mi Gameoteca.exe');
const entry=path.resolve('release/win-unpacked/resources/app.asar/src/tls.cjs');
const code=`
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gameoteca-runtime-'));
require(${JSON.stringify(entry)}).loadTLS(directory,['192.168.1.5']).then(async cert=>{
 if(!new crypto.X509Certificate(cert.ca).ca)throw Error('Invalid root certificate');
 console.log('PACKED_TLS_OK: Electron '+process.versions.electron);
 const service=await require(${JSON.stringify(path.join(path.dirname(entry),'server.cjs'))}).start({port:0,httpsPort:0,dataDir:directory});
 await service.close();
 console.log('PACKED_SERVER_OK');
}).catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{
 if(path.dirname(path.resolve(directory))!==path.resolve(os.tmpdir()))throw Error('Unsafe temporary path');
 fs.rmSync(directory,{recursive:true});
});`;
const result=spawnSync(executable,['-e',code],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},encoding:'utf8',timeout:30000,windowsHide:true});
if(result.stdout)process.stdout.write(result.stdout);
if(result.stderr)process.stderr.write(result.stderr);
if(result.status!==0||!result.stdout?.includes('PACKED_TLS_OK')||!result.stdout?.includes('PACKED_SERVER_OK'))throw result.error||Error('Packaged runtime check failed');
