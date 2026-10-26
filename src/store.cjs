// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const { DatabaseSync } = require('node:sqlite');
const STATES = ['sealed', 'new', 'likeNew', 'good', 'acceptable', 'damaged'];
const LEGACY_STATES = ['Precintado', 'Nuevo / sin estrenar', 'Usado · como nuevo', 'Usado · buen estado', 'Usado · aceptable', 'Deteriorado'];
function openStore(file) {
 const db = new DatabaseSync(file);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS games(id INTEGER PRIMARY KEY, title TEXT NOT NULL, platform TEXT NOT NULL, barcode TEXT NOT NULL DEFAULT '', cover TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '', UNIQUE(title,platform,barcode));
 CREATE TABLE IF NOT EXISTS copies(id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL REFERENCES games(id), state TEXT NOT NULL, edition TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
 db.exec('BEGIN');
 try {
   LEGACY_STATES.forEach((value, index) => db.prepare('UPDATE copies SET state=? WHERE state=?').run(STATES[index], value));
   for (const old of db.prepare("SELECT * FROM games WHERE platform='Otra'").all()) {
     const existing = db.prepare("SELECT id FROM games WHERE title=? AND platform='Other' AND barcode=?").get(old.title, old.barcode);
     if (existing) {
       db.prepare('UPDATE copies SET game_id=? WHERE game_id=?').run(existing.id, old.id);
       db.prepare('DELETE FROM games WHERE id=?').run(old.id);
     } else db.prepare("UPDATE games SET platform='Other' WHERE id=?").run(old.id);
   }
   db.exec('COMMIT');
 } catch (error) { db.exec('ROLLBACK'); throw error; }
 return {db, list(){return db.prepare('SELECT copies.*,games.title,games.platform,games.barcode,games.cover,games.source FROM copies JOIN games ON games.id=copies.game_id ORDER BY copies.id DESC').all()},
 save(input,id){
 const {title,platform,barcode='',cover='',source='',state,edition='',notes=''}=input;
 if(typeof title!=='string'||!title.trim()||typeof platform!=='string'||!platform.trim()||!STATES.includes(state)) throw Error('requiredFields');
 for(const value of [title,platform,barcode,cover,source,edition,notes]) if(typeof value!=='string'||value.length>5000) throw Error('invalidData');
 if(cover && !/^\/covers\/[a-f0-9]+\.(png|jpg|webp)$/.test(cover)) throw Error('invalidCover');
 db.exec('BEGIN'); try {
 db.prepare('INSERT INTO games(title,platform,barcode,cover,source) VALUES(?,?,?,?,?) ON CONFLICT(title,platform,barcode) DO UPDATE SET cover=CASE WHEN excluded.cover<>\'\' THEN excluded.cover ELSE games.cover END,source=CASE WHEN excluded.source<>\'\' THEN excluded.source ELSE games.source END').run(title.trim(),platform.trim(),barcode,cover,source);
 const game=db.prepare('SELECT id FROM games WHERE title=? AND platform=? AND barcode=?').get(title.trim(),platform.trim(),barcode);
 if(id){if(!db.prepare('UPDATE copies SET game_id=?,state=?,edition=?,notes=? WHERE id=?').run(game.id,state,edition,notes,id).changes) throw Error('copyMissing');}
 else db.prepare('INSERT INTO copies(game_id,state,edition,notes) VALUES(?,?,?,?)').run(game.id,state,edition,notes);
 db.exec('COMMIT'); } catch(e){db.exec('ROLLBACK');throw e}
 }, setArtwork(copyId,cover,source){
   if(!/^\/covers\/[a-f0-9]+\.(png|jpg|webp)$/.test(cover)||typeof source!=='string'||source.length>5000)throw Error('invalidCover');
   if(!db.prepare('UPDATE games SET cover=?,source=? WHERE id=(SELECT game_id FROM copies WHERE id=?)').run(cover,source,copyId).changes)throw Error('copyMissing');
 }, remove(id){return db.prepare('DELETE FROM copies WHERE id=?').run(id)}, close(){db.close()} };
}
module.exports={openStore,STATES};
