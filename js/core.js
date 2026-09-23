/* Improvement Tracker - core runtime. Owns state, persistence, timers, the render
   loop, tab switching, and the global event listeners. Screens register themselves
   against window.IT; core dispatches to them and keeps no per-screen cases. */
(() => {
'use strict';

// ---------- logic (dates, state shape, week stats, merge) ----------
const {
  todayKeyFor, defaultState, defaultDay, normalize,
  mergeInto, mergeStates, defaultTab, parseSafe,
  mmss, fmtLong, fmtShort, fmtTime, fmtHour12,
} = window.ITLogic;

// ---------- constants ----------
const LS_KEY = 'it:state:v1';
const LS_PREV = 'it:state:v1:prev';
const IDB_NAME = 'improvement-tracker';
const IDB_STORE = 'kv';
const SNAP_KEEP = 60;
const WIND_DOWN_MIN = 15;
const URGE_MIN = 10;
const RING_R = 104;
const RING_C = 2 * Math.PI * RING_R;

// ---------- utils ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function todayKey() { return todayKeyFor(new Date(), state.settings.rolloverHour); }

// ---------- icons (shared by 2+ screens via IT.ui) ----------
const checkSvg = (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>`;
const doneCircleSvg = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>`;
const bannerSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`;

// ---------- state ----------
let state = defaultState();
let tab = 'day';
let restoredFrom = null;
let storageHealth = { ls: 'unknown', idb: 'unknown', snaps: 0, persisted: 'unknown' };
let tickHandle = null;

function day(key = todayKey()) {
  if (!state.days[key]) state.days[key] = defaultDay();
  return state.days[key];
}
function touch(key) { const d = day(key); d.u = Date.now(); state.meta.updatedAt = d.u; }

// ---------- IndexedDB mirror ----------
function idbOpen() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbKeys() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const r = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAllKeys();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbPut(entries) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const st = tx.objectStore(IDB_STORE);
    for (const [k, v] of entries) st.put(v, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDelete(keys) {
  if (!keys.length) return;
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const st = tx.objectStore(IDB_STORE);
    for (const k of keys) st.delete(k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- persistence ----------
async function loadState() {
  let ls = null, prev = null, idb = null;
  try { ls = parseSafe(localStorage.getItem(LS_KEY)); prev = parseSafe(localStorage.getItem(LS_PREV)); storageHealth.ls = 'ok'; }
  catch { storageHealth.ls = 'unavailable'; }
  try { idb = await idbGet('current'); storageHealth.idb = 'ok'; }
  catch { storageHealth.idb = 'unavailable'; }
  try { const keys = await idbKeys(); storageHealth.snaps = keys.filter((k) => String(k).startsWith('snap:')).length; } catch {}

  const candidates = [
    { src: null, s: ls }, { src: 'previous save', s: prev }, { src: 'backup mirror', s: idb },
  ].filter((c) => c.s);
  candidates.sort((a, b) => (b.s.meta?.updatedAt || 0) - (a.s.meta?.updatedAt || 0));
  const best = candidates[0];
  if (best) {
    state = normalize(best.s);
    if (best.src && best.s !== ls) restoredFrom = best.src;
  }
  lastWrittenAt = state.meta.updatedAt || 0;
  try { navigator.storage?.persist?.(); } catch {}
  try {
    if (navigator.storage?.persisted) storageHealth.persisted = (await navigator.storage.persisted()) ? 'granted' : 'not granted';
    else storageHealth.persisted = 'unknown';
  } catch { storageHealth.persisted = 'unknown'; }
}
// Toast at most once every 10 minutes when a write fails; the Storage health row
// (More > Storage health) always shows the latest error text regardless.
let lastFailToastAt = 0;
function reportWriteFailure() {
  const now = Date.now();
  if (now - lastFailToastAt > 10 * 60 * 1000) {
    lastFailToastAt = now;
    toast('Could not save. Back up now from More.');
  }
}
// The updatedAt this page last wrote to (or loaded from) localStorage. Used by
// save() to detect that another same-origin tab has written since, so its edits
// get merged in rather than clobbered by this page's full-state overwrite.
let lastWrittenAt = 0;
let saveTimer = null;
function save() {
  state.meta.updatedAt = Math.max(state.meta.updatedAt || 0, Date.now());
  let cur = null;
  try { cur = localStorage.getItem(LS_KEY); } catch {}
  const curState = parseSafe(cur);
  if (curState && curState.meta && (curState.meta.updatedAt || 0) > lastWrittenAt) {
    state = mergeStates(state, normalize(curState));
    state.meta.updatedAt = Math.max(state.meta.updatedAt || 0, Date.now());
  }
  const json = JSON.stringify(state);
  try {
    if (cur && cur !== json) localStorage.setItem(LS_PREV, cur);
    localStorage.setItem(LS_KEY, json);
    storageHealth.ls = 'ok';
  } catch (err) { storageHealth.ls = String((err && err.message) || err || 'write failed'); reportWriteFailure(); }
  lastWrittenAt = state.meta.updatedAt;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => mirror(json), 400);
}
// Shared debounce timer for typed input (note/lapse-note/ntfy-topic/intentions).
// A single timer across all of them matches the original app.js exactly: typing
// in one field cancels another field's pending debounced save.
let inputSaveTimer = null;
function saveSoon(delay = 300) {
  clearTimeout(inputSaveTimer);
  inputSaveTimer = setTimeout(save, delay);
}
async function mirror(json) {
  try {
    const snapKey = `snap:${todayKeyFor(new Date(), state.settings.rolloverHour)}`;
    await idbPut([['current', JSON.parse(json)], [snapKey, JSON.parse(json)]]);
    storageHealth.idb = 'ok';
    const keys = (await idbKeys()).filter((k) => String(k).startsWith('snap:')).sort();
    storageHealth.snaps = keys.length;
    if (keys.length > SNAP_KEEP) await idbDelete(keys.slice(0, keys.length - SNAP_KEEP));
  } catch (err) { storageHealth.idb = String((err && err.message) || err || 'write failed'); reportWriteFailure(); }
}

// ---------- export / import ----------
function exportPayload() {
  return JSON.stringify({ app: 'improvement-tracker', exportedAt: new Date().toISOString(), state }, null, 1);
}
function exportName() { return `improvement-tracker-${window.ITLogic.keyOf(new Date())}.json`; }
function markExported() { state.settings.lastExport = Date.now(); state.settings.onboarding.backup = true; save(); }
async function doCopy() {
  try { await navigator.clipboard.writeText(exportPayload()); markExported(); toast('Copied. Paste into Notes to keep it.'); render(); }
  catch { toast('Copy failed. Try Share or Download.'); }
}
async function doShare() {
  const file = new File([exportPayload()], exportName(), { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Improvement Tracker backup' });
      markExported(); toast('Shared.'); render();
    } else { doDownload(); }
  } catch (e) { if (e && e.name !== 'AbortError') toast('Share failed. Try Download.'); }
}
function doDownload() {
  const blob = new Blob([exportPayload()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = exportName(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  markExported(); toast('Downloading.'); render();
}
function mergeImport(raw) {
  const r = mergeInto(state, raw);
  save();
  return r;
}

// ---------- ntfy (T39): fixed generic payloads, fire-and-forget, 5s timeout ----------
async function ntfyPost(topic, body, headers) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, { method: 'POST', body, headers, signal: ctrl.signal });
    return true;
  } catch { return false; }
  finally { clearTimeout(timer); }
}
function ntfyTest() {
  const topic = (state.settings.ntfyTopic || '').trim();
  if (!topic) { toast('Add an ntfy topic first.'); return; }
  ntfyPost(topic, 'Nudges are connected.', {}).then((ok) => toast(ok ? 'Sent' : 'Could not send'));
}
// Silent: fires when a wind-down or urge timer starts. Cancelling the timer cannot recall it.
function ntfyTimerPing(delayLabel) {
  const topic = (state.settings.ntfyTopic || '').trim();
  if (!state.settings.ntfyTimers || !topic) return;
  ntfyPost(topic, 'Time.', { Title: 'Timer', Delay: delayLabel }).catch(() => {});
}

// ---------- shared rendering helpers (IT.ui) ----------
function toggleRow({ label, hint, checked, action, arg }) {
  return `<label class="row"><span class="label">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>
    <span class="switch"><input type="checkbox" data-action="${action}" data-arg="${esc(arg || '')}" ${checked ? 'checked' : ''}><span></span></span></label>`;
}
function checkRow({ label, hint, checked, action, arg, small }) {
  return `<button class="check-row" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}" aria-label="${esc(label)}">
    <span class="check${small ? ' sm' : ''}">${checkSvg(14)}</span>
    <span class="label${checked ? ' done' : ''}">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span></button>`;
}
function ratingRow({ label, value, arg, note }) {
  const showNote = note && note.trim();
  return `<div class="rating-row"><div style="display:flex;flex-direction:column;gap:2px"><span class="label">${esc(label)}</span>${showNote ? `<span class="meta">${esc(note)}</span>` : ''}</div><div class="rating" role="group" aria-label="${esc(label)}">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-action="rate" data-arg="${arg}:${n}" aria-pressed="${value === n}">${n}</button>`).join('')}
  </div></div>`;
}
function ring({ id, size, leftMs, totalMs, clockText, clockClass }) {
  const totalSec = totalMs / 1000;
  const leftSec = Math.max(0, Math.min(totalSec, leftMs / 1000));
  const elapsed = totalSec > 0 ? (totalSec - leftSec) / totalSec : 1;
  const dashoffset = (RING_C * elapsed).toFixed(2);
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 240 240" aria-hidden="true">
      <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d9cf0"/><stop offset="1" stop-color="#3aad3f"/></linearGradient></defs>
      <circle cx="120" cy="120" r="${RING_R}" fill="none" stroke="var(--card2)" stroke-width="14"/>
      <circle id="${id}" cx="120" cy="120" r="${RING_R}" fill="none" stroke="url(#${id}g)" stroke-width="14" stroke-linecap="round"
        stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${dashoffset}" transform="rotate(-90 120 120)" style="transition:stroke-dashoffset 1s linear"/>
    </svg>
    <div class="ring-clock ${clockClass}" id="${id}-clock">${clockText}</div>
  </div>`;
}

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// ---------- screen registry ----------
const screens = {};
const actionHandlers = {};
const inputHandlers = {};
const changeHandlers = {};
function registerScreen(name, def) { screens[name] = def; }
function registerActions(map) { Object.assign(actionHandlers, map); }
function registerInput(map) { Object.assign(inputHandlers, map); }
function registerChange(map) { Object.assign(changeHandlers, map); }
function inputValue(el) {
  if (el.type === 'checkbox') return el.checked;
  if (el.type === 'file') return el.files;
  return el.value;
}

// ---------- urge overlay (shell: shown/hidden/focused by core; content owned by the urge screen) ----------
function renderUrgeOverlayContent() {
  const screen = screens.urge;
  if (!screen) return;
  const el = $('#urge-overlay');
  if (el) el.innerHTML = screen.render();
}
function openUrgeOverlay() {
  renderUrgeOverlayContent();
  const el = $('#urge-overlay');
  el.hidden = false;
  setTimeout(() => $('#urge-trigger')?.focus(), 50);
}
function closeUrgeOverlay() { const el = $('#urge-overlay'); el.hidden = true; el.innerHTML = ''; }

// ---------- render ----------
function updateUrgeButton() {
  const ub = $('.urge-btn');
  if (!ub) return;
  const label = $('.urge-label', ub);
  const u = state.urges.find((x) => !x.outcome) || null;
  if (u) {
    const left = u.endsAt - Date.now();
    label.textContent = left > 0 ? `Riding it out · ${mmss(left)}` : 'Riding it out';
    ub.classList.add('running');
  } else {
    label.textContent = 'Urge';
    ub.classList.remove('running');
  }
}
function render(ctx) {
  ctx = ctx || {};
  const view = $('#view');
  const scrollY = window.scrollY;
  const screen = screens[tab];
  view.innerHTML = screen ? screen.render(ctx) : '';
  document.querySelectorAll('.tab').forEach((b) => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  updateUrgeButton();
  window.scrollTo(0, scrollY);
  ensureTick();
  autosize();
}
function autosize() {
  document.querySelectorAll('textarea.field').forEach((t) => { t.style.height = 'auto'; t.style.height = Math.max(48, t.scrollHeight) + 'px'; });
}
function ensureTick() {
  const active = (day().windDown.endsAt && !day().windDown.done) || state.urges.some((u) => !u.outcome && u.endsAt > Date.now());
  if (active && !tickHandle) tickHandle = setInterval(tick, 1000);
  if (!active && tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}
function updateRing(id, leftMs, totalMs) {
  const circle = document.getElementById(id);
  const clock = document.getElementById(`${id}-clock`);
  if (!circle && !clock) return false;
  const totalSec = totalMs / 1000;
  const leftSec = Math.max(0, Math.min(totalSec, leftMs / 1000));
  const elapsed = totalSec > 0 ? (totalSec - leftSec) / totalSec : 1;
  if (circle) circle.setAttribute('stroke-dashoffset', (RING_C * elapsed).toFixed(2));
  if (clock) clock.textContent = mmss(leftMs);
  return true;
}
function tick() {
  const d = day();
  if (d.windDown.endsAt && !d.windDown.done) {
    const left = d.windDown.endsAt - Date.now();
    if (left <= 0) { d.windDown.done = true; d.windDown.endsAt = null; touch(); save(); toast('Wind-down complete.'); render(); return; }
    updateRing('winddown-ring', left, WIND_DOWN_MIN * 60000);
  }
  let rerender = false;
  state.urges.forEach((u) => {
    if (u.outcome) return;
    const left = u.endsAt - Date.now();
    if (left <= 0) rerender = true; else updateRing('urge-ring', left, URGE_MIN * 60000);
  });
  updateUrgeButton();
  const overlayEl = $('#urge-overlay');
  if (rerender && overlayEl && !overlayEl.hidden) renderUrgeOverlayContent();
  if (rerender) render();
  ensureTick();
}

// ---------- events ----------
// The click/change listeners call day() unconditionally before dispatch, exactly
// matching the original single-IIFE app.js (which computed `const d = day();`
// once at the top of each listener, before its switch/if-chain) - creating
// today's day record as a side effect of clicking or changing *anything* with a
// data-action, regardless of which one. Preserved here for identical behavior.
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action],[data-tab]');
  if (!t) return;
  if (t.dataset.tab) {
    tab = t.dataset.tab;
    render({ entering: true });
    window.scrollTo(0, 0);
    return;
  }
  day();
  const handler = actionHandlers[t.dataset.action];
  if (handler) handler(t.dataset.arg, t, e);
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  day();
  const handler = changeHandlers[t.dataset.action];
  if (handler) handler(inputValue(t), t.dataset.arg, t);
});
document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const handler = inputHandlers[t.dataset.action];
  if (handler) handler(inputValue(t), t.dataset.arg, t);
  if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = Math.max(48, t.scrollHeight) + 'px'; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#urge-overlay').hidden) closeUrgeOverlay(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { render(); }
  else {
    clearTimeout(inputSaveTimer); save();
    clearTimeout(saveTimer); mirror(JSON.stringify(state)); // eager mirror flush; pagehide below is a second, later safety net
  }
});
window.addEventListener('pagehide', () => { clearTimeout(inputSaveTimer); save(); clearTimeout(saveTimer); mirror(JSON.stringify(state)); });

// ---------- cross-instance sync (another same-origin tab/window wrote it:state:v1) ----------
function isTextFieldFocused() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}
let pendingRenderOnBlur = false;
window.addEventListener('storage', (e) => {
  if (e.key !== LS_KEY || !e.newValue) return;
  const incoming = parseSafe(e.newValue);
  if (!incoming) return;
  state = mergeStates(state, normalize(incoming));
  if (isTextFieldFocused()) pendingRenderOnBlur = true;
  else render();
});
document.addEventListener('blur', (e) => {
  const t = e.target;
  if (pendingRenderOnBlur && t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
    pendingRenderOnBlur = false;
    render();
  }
}, true);

// ---------- public API ----------
const IT = {
  day, touch, save, saveSoon, render, toast, todayKey,
  registerScreen, registerActions, registerInput, registerChange,
  storageHealth,
  openUrgeOverlay, closeUrgeOverlay, refreshUrgeOverlay: renderUrgeOverlayContent,
  share: doShare, copy: doCopy, download: doDownload, mergeImport,
  ntfyTest, ntfyTimerPing,
  WIND_DOWN_MIN, URGE_MIN,
  ui: { esc, toggleRow, checkRow, ratingRow, ring, checkSvg, doneCircleSvg, bannerSvg, mmss, fmtLong, fmtShort, fmtTime, fmtHour12 },
};
Object.defineProperty(IT, 'state', { get() { return state; } });
Object.defineProperty(IT, 'restoredFrom', { get() { return restoredFrom; } });
window.IT = IT;

// ---------- boot ----------
// Runs on DOMContentLoaded so every screen script (loaded after this one, before
// the closing </body>) has already registered itself via IT.registerScreen /
// IT.registerActions / IT.registerInput / IT.registerChange.
function boot() {
  loadState().then(() => {
    tab = defaultTab(new Date(), state.settings.rolloverHour);
    render({ entering: true });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
