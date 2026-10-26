// Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<svg class="ui-icon" aria-hidden="true"><use href="/ui-icons.svg#${name}"></use></svg>`;
let copies = [], info, selectedPlatforms = new Set();
let view = ['list','small','medium','large'].includes(localStorage.getItem('view')) ? localStorage.getItem('view') : 'medium';
let editing = null, duplicateMode = false, cover = '', source = '', candidateItems = [], candidateAction, networkIndex = 0;
const scanMode = new URLSearchParams(location.search).has('scan');
let lookupGeneration = 0;
let camera;
const pendingArtwork = new Set();
function status(element, key, values = {}) {
  element.dataset.statusKey = key || '';
  element.dataset.statusValues = JSON.stringify(values);
  element.textContent = key ? t(key, values) : '';
}
function report(error, element = $('#notice')) { status(element, error.code || 'unexpectedError'); }
async function api(url, method = 'GET', body) {
  let response;
  try {
    response = await fetch('/api/' + url, { method, headers: {'Content-Type':'application/json', 'X-Pair-Token':sessionStorage.getItem('pairToken') || ''}, body:body ? JSON.stringify(body) : undefined });
  } catch { const error = Error('connectionError'); error.code = 'connectionError'; throw error; }
  const data = await response.json();
  if (!response.ok) {
    if (data.error === 'pairRequired' && !$('#pair').open) $('#pair').showModal();
    const error = Error(data.error); error.code = data.error || 'unexpectedError'; throw error;
  }
  return data;
}
const platformLabel = platform => platform === 'Other' ? t('other') : platform;
async function refresh() { copies = await api('copies'); render(); }
function render() {
  $('#count').textContent = copies.length;
  $('#unique').textContent = new Set(copies.map(c => c.game_id)).size;
  $('#platformCount').textContent = new Set(copies.map(c => c.platform)).size;
  const platforms = [...new Set(copies.map(c => c.platform))].sort((a,b) => platformLabel(a).localeCompare(platformLabel(b), language));
  $('#platforms').innerHTML = `<button data-platform="" class="${selectedPlatforms.size ? '' : 'active'}">${esc(t('allPlatforms'))}</button>` +
    platforms.map(p => `<button data-platform="${esc(p)}" class="${selectedPlatforms.has(p) ? 'active' : ''}" aria-pressed="${selectedPlatforms.has(p)}">${esc(platformLabel(p))}</button>`).join('');
  const query = $('#search').value.toLocaleLowerCase(language);
  const rows = copies.filter(c => (!selectedPlatforms.size || selectedPlatforms.has(c.platform)) && [c.title,c.barcode,c.edition].some(v => v.toLocaleLowerCase(language).includes(query)));
  const sort = $('#sort').value;
  rows.sort((a,b) => sort === 'recent' ? b.id-a.id : sort === 'za' ? b.title.localeCompare(a.title,language) : sort === 'platform' ? platformLabel(a.platform).localeCompare(platformLabel(b.platform),language) || a.title.localeCompare(b.title,language) : sort === 'state' ? t(a.state).localeCompare(t(b.state),language) : a.title.localeCompare(b.title,language));
  $('#resultCount').textContent = (rows.length === 1 ? t('resultOne') : t('results',{count:rows.length})) + (selectedPlatforms.size ? ' · '+t('filtered') : '');
  $('#collection').className = view;
  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); b.setAttribute('aria-pressed', b.dataset.view === view); });
  $('#collection').innerHTML = rows.length ? rows.map(c => `<article class="game"><div class="cover">${c.cover ? `<img src="${esc(c.cover)}" alt="${esc(t('coverAlt',{title:c.title}))}" loading="lazy">` : `<div class="placeholder-cover" role="img" aria-label="${esc(t('noCover'))}">${icon('game')}</div>`}</div><div class="game-body"><div class="platform-tag">${esc(platformLabel(c.platform))}</div><h3>${esc(c.title)}</h3><span class="state">${esc(t(c.state))}</span><div class="edition">${esc(c.edition || t('standard'))}</div><div class="actions"><button data-edit="${c.id}">${icon('edit')}${esc(t('edit'))}</button><button data-copy="${c.id}">${icon('plus')}${esc(t('another'))}</button><button data-delete="${c.id}">${icon('trash')}${esc(t('delete'))}</button></div></div></article>`).join('') :
    `<div class="empty"><div class="placeholder-cover">${icon('game')}</div><h2>${esc(t(copies.length?'emptyFiltered':'empty'))}</h2><p class="text-secondary">${esc(t(copies.length?'emptyFilteredHelp':'emptyHelp'))}</p></div>`;
  for (const copy of rows.filter(copy => !copy.cover)) {
    const actions = $(`[data-edit="${copy.id}"]`)?.parentElement;
    if (!actions) continue;
    const button = document.createElement('button');
    button.dataset.artwork = copy.id; button.disabled = pendingArtwork.has(copy.id);
    button.innerHTML = icon('download') + esc(t(button.disabled ? 'fetchingCover' : 'fetchCover'));
    actions.insertBefore(button,actions.lastChild);
  }
}
function populateOptions() {
  if (!info) return;
  const platform = $('#platform').value, state = $('#state').value;
  $('#platform').innerHTML = '<option value="">'+esc(t('selectPlatform'))+'</option>' + info.platforms.map(p => `<option value="${esc(p)}">${esc(platformLabel(p))}</option>`).join('');
  $('#state').innerHTML = info.states.map(s => `<option value="${esc(s)}">${esc(t(s))}</option>`).join('');
  if (info.platforms.includes(platform)) $('#platform').value = platform;
  if (info.states.includes(state)) $('#state').value = state;
}
function editorTitle() { $('#editorTitle').textContent = t(editing ? 'editCopy' : duplicateMode ? 'addCopy' : 'add'); }
function openEditor(copy, duplicate = false) {
  lookupGeneration++;
  $('#save').disabled = false; $('#lookup').disabled = false; $('#findCover').disabled = false;
  $('#gameForm').reset(); editing = duplicate ? null : copy?.id || null; duplicateMode = duplicate;
  $('#scanBarcode').hidden = !!editing;
  cover = copy?.cover || ''; source = copy?.source || '';
  for (const key of ['title','platform','barcode','state','edition','notes']) if (copy?.[key]) $('#'+key).value = copy[key];
  editorTitle(); status($('#editorNotice'), ''); candidates([], null); showCover();
  if (!$('#editor').open) $('#editor').showModal();
}
function showCover() {
  $('#selectedCover').innerHTML = cover ? `<img src="${esc(cover)}" alt="${esc(t('selectedCover'))}"><span class="small text-secondary ms-2">${esc(source)} · ${esc(t('savedLocal'))}</span>` : '';
}
function candidates(items, onSelect) { candidateItems = items; candidateAction = onSelect; renderCandidates(); }
function renderCandidates() {
  $('#candidates').innerHTML = '';
  for (const item of candidateItems) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = `${item.title} · ${item.platform ? platformLabel(item.platform) : t('confirmPlatform')} · ${item.source || t('localCollection')}${item.region?' · '+item.region:''}`;
    button.onclick = () => candidateAction(item); $('#candidates').append(button);
  }
}
function renderConnection() {
  $('#pinPanel').hidden = !info?.pin;
  $('#pairCode').textContent = info?.pin || '';
  if (networkIndex >= (info?.urls.length || 0)) networkIndex = 0;
  const url = info?.urls[networkIndex];
  $('#addresses').innerHTML = !info?.pin ? `<p>${esc(t('viewOnPC'))}</p>` : url ?
    (info.urls.length > 1 ? `<label for="networkSelect" class="form-label mt-3">${esc(t('networkAddress'))}</label><select id="networkSelect" class="form-select">${info.urls.map((address,index) => `<option value="${index}" ${index===networkIndex?'selected':''}>${esc(address)}</option>`).join('')}</select>` : '') +
    `<div class="qr-card"><img src="/api/qr?index=${networkIndex}" alt="${esc(t('qrAlt'))}" width="216" height="216"><div><strong>${icon('qr')}${esc(t('scanQR'))}</strong><a href="${esc(url)}">${esc(url)}</a>${info.tls ? `<p class="small mt-2">${esc(t('firstSetup'))}</p><a href="${esc(info.scanUrls[networkIndex])}">${esc(t('secureScannerLink'))}</a>` : ''}</div></div>${info.fingerprint ? `<details class="mt-3"><summary>${esc(t('fingerprint'))}</summary><code class="certificate-fingerprint">${esc(info.fingerprint)}</code></details>` : ''}` : `<p>${esc(t('noNetwork'))}</p>`;
  if ($('#networkSelect')) $('#networkSelect').onchange = event => { networkIndex = Number(event.target.value); renderConnection(); };
}
function changeLanguage(event) {
  language = event.target.value; localStorage.setItem('language',language);
  translatePage(); populateOptions(); editorTitle(); showCover(); renderCandidates(); render(); renderConnection();
  document.querySelectorAll('[data-status-key]').forEach(el => status(el,el.dataset.statusKey,JSON.parse(el.dataset.statusValues || '{}')));
}
document.querySelectorAll('[data-language-select]').forEach(select => select.onchange = changeLanguage);
$('#add').onclick = () => scanMode ? openScanner() : openEditor();
document.querySelectorAll('.close-dialog').forEach(button => button.onclick = () => button.closest('dialog').close());
$('#search').oninput = render; $('#sort').onchange = render;
$('.views').onclick = event => { const button = event.target.closest('[data-view]'); if (button) { view = button.dataset.view; localStorage.setItem('view',view); render(); } };
$('#platforms').onclick = event => { const button = event.target.closest('[data-platform]'); if (!button) return; const platform = button.dataset.platform; if (!platform) selectedPlatforms.clear(); else if (selectedPlatforms.has(platform)) selectedPlatforms.delete(platform); else selectedPlatforms.add(platform); render(); };
$('#collection').onclick = async event => {
  const button = event.target.closest('button'); if (!button) return;
  const id = Number(button.dataset.edit || button.dataset.copy || button.dataset.delete || button.dataset.artwork), copy = copies.find(c => c.id === id);
  if (button.dataset.artwork) {
    if (pendingArtwork.has(id)) return;
    pendingArtwork.add(id); render(); status($('#notice'),'fetchingCover');
    try { await api('copies/'+id+'/artwork?'+new URLSearchParams({language}),'POST',{}); await refresh(); status($('#notice'),'artworkSaved'); }
    catch (error) { report(error); }
    finally { pendingArtwork.delete(id); render(); }
    return;
  }
  if (button.dataset.delete) {
    if (confirm(t('deleteConfirm',{title:copy.title}))) try { await api('copies/'+id,'DELETE'); await refresh(); } catch (error) { report(error); }
  } else openEditor(copy,!!button.dataset.copy);
};
$('#gameForm').onsubmit = async event => {
  event.preventDefault();
  if (!$('#title').value.trim() || !$('#platform').value || !$('#gameForm').checkValidity()) { status($('#editorNotice'),'requiredFields'); return; }
  $('#save').disabled = true;
  try {
    await api('copies'+(editing?'/'+editing:''),editing?'PUT':'POST',{...Object.fromEntries(new FormData(event.target)),cover,source});
    $('#editor').close(); await refresh(); status($('#notice'),'saved');
    if (scanMode) { await openScanner(); status($('#scanStatus'),'scanAnother'); }
  } catch (error) { report(error,$('#editorNotice')); } finally { $('#save').disabled = false; }
};
async function applyBarcodeItem(item, generation) {
  if (generation !== lookupGeneration) return;
  $('#title').value = item.title;
  $('#platform').value = info.platforms.includes(item.platform) ? item.platform : '';
  cover = ''; source = item.source || ''; showCover(); candidates([],null);
  if (item.artworkUrl) {
    status($('#editorNotice'),'downloading');
    try {
      const data = await api('cover','POST',{url:item.artworkUrl});
      if (generation !== lookupGeneration) return;
      cover = data.cover; source = [item.source,item.artworkSource].filter((value,index,values) => value && values.indexOf(value)===index).join(' / '); showCover();
    } catch { if (generation === lookupGeneration) status($('#editorNotice'),'artworkMissing'); return; }
  }
  if (generation === lookupGeneration) status($('#editorNotice'),!$('#platform').value?'scanIncomplete':cover?'scanReady':'artworkMissing');
}
$('#lookup').onclick = async () => {
  const generation = ++lookupGeneration;
  $('#lookup').disabled = true; status($('#editorNotice'),'lookingUp');
  try {
    const items = await api('barcode?'+new URLSearchParams({code:$('#barcode').value.trim(),language}));
    if (generation !== lookupGeneration) return;
    if (!items.length) { status($('#editorNotice'),'barcodeMissing'); return; }
    const choose = async item => {
      $('#save').disabled = true;
      try { await applyBarcodeItem(item,generation); }
      finally { if (generation === lookupGeneration) $('#save').disabled = false; }
    };
    if (items.length === 1) await choose(items[0]); else { candidates(items,choose); status($('#editorNotice'),'chooseMatch'); }
  } catch (error) { if (generation === lookupGeneration) report(error,$('#editorNotice')); } finally { $('#lookup').disabled = false; }
};
$('#findCover').onclick = async () => {
  const generation = lookupGeneration;
  $('#findCover').disabled = true; status($('#editorNotice'),'searchingCovers');
  try {
    const items = await api('search?'+new URLSearchParams({q:$('#title').value,platform:$('#platform').value,language}));
    if (generation !== lookupGeneration) return;
    candidates(items,async item => {
      if ($('#findCover').disabled || generation !== lookupGeneration) return;
      $('#findCover').disabled = true;
      try {
        status($('#editorNotice'),'downloading');
        if (!item.url) { status($('#editorNotice'),'noFront'); return; }
        const data = await api('cover','POST',{url:item.url});
        if (generation !== lookupGeneration) return;
        cover = data.cover; source = item.source;
        showCover(); candidates([],null); status($('#editorNotice'),'downloaded');
      } catch (error) { if (generation === lookupGeneration) report(error,$('#editorNotice')); } finally { if (generation === lookupGeneration) $('#findCover').disabled = false; }
    });
    status($('#editorNotice'),items.length?'chooseRegion':'noMatches');
  } catch (error) { if (generation === lookupGeneration) report(error,$('#editorNotice')); } finally { if (generation === lookupGeneration) $('#findCover').disabled = false; }
};
$('#photo').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  status($('#editorNotice'),'readingPhoto'); const object = URL.createObjectURL(file);
  try { const reader = new ZXing.BrowserMultiFormatReader(); const result = await reader.decodeFromImageUrl(object); const code = BarcodeScanning.normalizeBarcode(result.getText(),result.getBarcodeFormat()===ZXing.BarcodeFormat.UPC_E?'upc_e':''); if (!code) throw Error('barcodeInvalid'); $('#barcode').value = code; $('#lookup').click(); }
  catch { status($('#editorNotice'),'photoFailed'); } finally { URL.revokeObjectURL(object); event.target.value = ''; }
};
$('#connect').onclick = async () => { try { info = await api('info'); renderConnection(); $('#connection').showModal(); } catch (error) { report(error); } };
$('#export').onclick = async () => {
  try { const data = await api('export'), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download = 'gameoteca.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href),1000); }
  catch (error) { report(error); }
};
$('#pairForm').onsubmit = async event => {
  event.preventDefault();
  if (!/^\d{4}$/.test($('#pairInput').value)) { status($('#pairError'),'pairInvalid'); return; }
  $('#pairSubmit').disabled = true;
  try { const data = await api('pair','POST',{pin:$('#pairInput').value}); sessionStorage.setItem('pairToken',data.token); $('#pairInput').value = ''; status($('#pairError'),''); $('#pair').close(); await init(); status($('#notice'),''); }
  catch (error) { report(error,$('#pairError')); } finally { $('#pairSubmit').disabled = false; }
};
async function showMobileSetup() {
  camera?.stop();
  if ($('#editor').open) $('#editor').close();
  if ($('#liveScan').open) $('#liveScan').close();
  if (!$('#mobileSetup').open) $('#mobileSetup').showModal();
  try {
    const response = await fetch('/mobile/setup');
    const data = await response.json();
    if (!response.ok) { status($('#setupStatus'),data.error); return; }
    $('#downloadCA').href = data.certificateUrl;
    $('#setupFingerprint').textContent = data.fingerprint;
    $('#openSecureScanner').href = data.secureUrl;
    status($('#setupStatus'),'');
  } catch { status($('#setupStatus'),'connectionError'); }
}
function cameraButtons(running) {
  $('#startCamera').disabled = running;
  $('#stopCamera').disabled = !running;
}
function stopCamera() { camera?.stop(); cameraButtons(false); }
function cameraError(error) {
  stopCamera();
  const key = error.code || (error.name === 'NotAllowedError' ? 'cameraDenied' : error.name === 'NotFoundError' ? 'cameraMissing' : error.name === 'SecurityError' ? 'cameraSecure' : 'cameraBusy');
  status($('#scanStatus'),key);
}
async function openScanner() {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { await showMobileSetup(); return; }
  if ($('#editor').open) $('#editor').close();
  stopCamera(); status($('#scanStatus'),'cameraStopped');
  if (!$('#liveScan').open) $('#liveScan').showModal();
}
$('#startCamera').onclick = async () => {
  cameraButtons(true); status($('#scanStatus'),'cameraStarting');
  camera ||= new BarcodeScanning.LiveBarcodeScanner({ video:$('#scannerVideo'), onError:cameraError, onDetected:code => {
    $('#liveScan').close();
    openEditor(); $('#barcode').value = code;
    navigator.vibrate?.(80);
    $('#lookup').click();
  }});
  try { if (await camera.start()) status($('#scanStatus'),'cameraScanning'); }
  catch (error) { if ($('#liveScan').open) cameraError(error); }
};
$('#stopCamera').onclick = () => { stopCamera(); status($('#scanStatus'),'cameraStopped'); };
$('#scanBarcode').onclick = openScanner;
$('#scanManual').onclick = () => { stopCamera(); $('#liveScan').close(); openEditor(); $('#barcode').focus(); };
$('#liveScan').addEventListener('close',stopCamera);
$('#liveScan').addEventListener('cancel',stopCamera);
document.addEventListener('visibilitychange',() => { if (document.hidden) { stopCamera(); status($('#scanStatus'),'cameraStopped'); } });
window.addEventListener('pagehide',stopCamera);
async function init() {
  if (new URLSearchParams(location.search).has('setup') || (scanMode && !window.isSecureContext)) { await showMobileSetup(); return; }
  info = await api('info'); populateOptions(); await refresh();
  if (scanMode && !$('#editor').open) {
    $('#add [data-i18n]').dataset.i18n = 'liveScanner'; $('#add [data-i18n]').textContent = t('liveScanner');
    await openScanner();
  }
}
translatePage(); init().catch(error => { if (error.code !== 'pairRequired') report(error); });
setInterval(() => { if (info && !$('#editor').open && !$('#pair').open) refresh().catch(() => {}); },10000);
