/* Improvement Tracker - local-only. Nudges/timer-pings are opt-in ntfy POSTs (T39); no other network calls. */
(() => {
'use strict';

// ---------- logic (dates, state shape, week stats, merge) ----------
const {
  LAPSES, RATINGS, HANGOVER, DAY_NAMES,
  keyOf, dateOf, addDays, weekdayOf, weekStart, fmtLong, fmtShort, mmss,
  todayKeyFor, defaultState, defaultDay, normalize,
  weekStats: weekStatsPure, lastLapse: lastLapsePure, mergeInto, mergeStates, backupDueDays,
  defaultTab, nightCardDone, nightStepDone, firstIncompleteNightStep,
  recentUrges, fmtTime, dayEndOptions, shortcutsUiVisible,
  allWeekKeys, parseSafe,
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
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat

// ---------- utils ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function todayKey() { return todayKeyFor(new Date(), state.settings.rolloverHour); }

// ---------- icons ----------
const checkSvg = (size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>`;
const doneCircleSvg = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>`;
const closeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const chevronSvg = (dir) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}"/></svg>`;
const bannerSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`;

// ---------- state ----------
let state = defaultState();
let tab = 'day';
let weekCursor = null; // week start key being viewed
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
function exportName() { return `improvement-tracker-${keyOf(new Date())}.json`; }
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

// ---------- rendering helpers ----------
function toggleRow({ label, hint, checked, action, arg }) {
  return `<label class="row"><span class="label">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>
    <span class="switch"><input type="checkbox" data-action="${action}" data-arg="${esc(arg || '')}" ${checked ? 'checked' : ''}><span></span></span></label>`;
}
function checkRow({ label, hint, checked, action, arg, small }) {
  return `<button class="check-row" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}" aria-label="${esc(label)}">
    <span class="check${small ? ' sm' : ''}">${checkSvg(14)}</span>
    <span class="label${checked ? ' done' : ''}">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span></button>`;
}
function kitChip({ label, checked, action, arg }) {
  return `<button class="kitchip" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}">
    <span class="dot">${checkSvg(12)}</span>${esc(label)}</button>`;
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

// ---------- Onboarding checklist ----------
const ONBOARDING_ITEMS = [
  { key: 'home', label: 'Add to Home Screen', hint: 'Share button in Safari, then Add to Home Screen. Open it from the icon from now on, that is where your data lives.' },
  { key: 'shortcuts', label: 'Turn on nudges', hint: 'Install the ntfy app, subscribe to the topic in More > Reminders. Two pushes a day, 9:00 and 22:00, generic wording.' },
  { key: 'backup', label: 'First backup', hint: 'More > Share file, save it to Notes.' },
];
function onboardingRows() {
  const o = state.settings.onboarding;
  return ONBOARDING_ITEMS.map((it) => checkRow({ label: it.label, hint: it.hint, checked: !!o[it.key], action: 'onboard-check', arg: it.key, small: true })).join('');
}
// Top card on Day until dismissed.
function renderOnboarding() {
  if (state.settings.onboarded) return '';
  return `<section class="card list"><h2 style="padding:12px 0 0">Getting set up</h2>${onboardingRows()}
    <div class="btn-row" style="padding:12px 0"><button class="btn" type="button" data-action="onboard-done">Done, hide this</button></div></section>`;
}
// Moves to More once dismissed, so the instructions stay reachable.
function renderSetupInMore() {
  if (!state.settings.onboarded) return '';
  return `<section class="card"><h2>Getting set up</h2><div style="margin-top:6px">${onboardingRows()}</div></section>`;
}

// ---------- Day ----------
function renderDay() {
  const key = todayKey();
  const d = day(key);
  const wd = weekdayOf(key);
  const s = state.settings;

  const morningDone = d.stretched && (!d.hungover || HANGOVER.every((h) => d.hangover[h.key]));
  let morning = `<section class="card list${morningDone ? ' done' : ''}">`;
  morning += toggleRow({ label: 'Stretched', checked: d.stretched, action: 'day-bool', arg: 'stretched' });
  if (s.hangoverDays.includes(wd)) {
    morning += toggleRow({ label: 'Hungover?', hint: 'Fri, Sat, Sun', checked: d.hungover, action: 'day-bool', arg: 'hungover' });
    if (d.hungover) {
      morning += `<div class="kitchips">` + HANGOVER.map((h) => kitChip({ label: h.label, checked: d.hangover[h.key], action: 'hangover', arg: h.key })).join('') + `</div>`;
    }
  }
  if (morningDone) morning += `<div class="card-done-line">${doneCircleSvg(18)}Morning done</div>`;
  morning += `</section>`;

  const rows = [];
  if (s.waterPoloDays.includes(wd)) rows.push(checkRow({ label: 'Water polo', checked: d.waterPolo, action: 'day-bool', arg: 'waterPolo' }));
  if (s.dinnerDays.includes(wd)) rows.push(checkRow({ label: 'Dinner out', checked: d.dinnerOut, action: 'day-bool', arg: 'dinnerOut' }));
  rows.push(checkRow({ label: 'Gym', hint: 'log it when it happens', checked: d.gym, action: 'day-bool', arg: 'gym' }));
  const commit = `<div class="kicker-caps" style="padding:0 4px">Commitments</div><section class="card list">${rows.join('')}</section>`;

  const onboarding = renderOnboarding();
  const banner = restoredFrom ? `<div class="banner ok">${bannerSvg}Restored your data from the ${esc(restoredFrom)}. Consider making a backup in More.</div>` : '';
  const header = `<div class="screen-head"><h1 class="title">${esc(fmtLong(key))}</h1></div>`;
  return `<div class="screen-18">${onboarding}${header}${banner}${morning}${commit}</div>`;
}

// ---------- Night ----------
// Only the current step index and the "forced flow" (editing from summary) flag
// live here; which steps are complete lives on the day object (d.nightVisited) so
// it survives an iOS process eviction/relaunch, not just a fresh sessionStorage.
const NIGHT_UI_KEY = 'it:nightUi';
function loadNightUi() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(NIGHT_UI_KEY) || 'null'); } catch {}
  const key = todayKey();
  if (!st || st.day !== key) st = { day: key, step: null, forceFlow: false };
  return st;
}
function saveNightUi(st) {
  try { sessionStorage.setItem(NIGHT_UI_KEY, JSON.stringify(st)); } catch {}
}

function nightStepWinddown(d) {
  const wd = d.windDown;
  if (wd.done) {
    return `<div class="card-done-line" style="font-size:1.125rem">${doneCircleSvg(24)}15 minutes, done</div><div class="meta">phone down, wash up, mouth tape</div>`;
  }
  if (wd.endsAt) {
    const left = wd.endsAt - Date.now();
    return `${ring({ id: 'winddown-ring', size: 240, leftMs: left, totalMs: WIND_DOWN_MIN * 60000, clockText: mmss(left), clockClass: 'md' })}
      <button class="btn" type="button" data-action="winddown-cancel">Cancel</button>
      <div class="meta">phone down, wash up, mouth tape</div>`;
  }
  const scLink = shortcutsUiVisible(state.settings) && state.settings.useShortcutTimers ? '<a class="btn" href="shortcuts://run-shortcut?name=Wind%20Down">Start iPhone timer</a>' : '';
  return `<button class="btn primary big block" style="min-height:64px" type="button" data-action="winddown-start">Start 15:00</button>${scLink}
    <div class="meta">phone down, wash up, mouth tape</div>`;
}
function nightStepSlips(d) {
  let out = '';
  for (const l of LAPSES) {
    out += `<div>${toggleRow({ label: l.label, hint: l.hint, checked: d.lapses[l.key], action: 'lapse', arg: l.key })}`;
    if (d.lapses[l.key]) {
      out += `<div class="sub-rows field-group"><span class="field-label">What was happening right before?</span>
        <input class="field" type="text" data-action="lapse-note" data-arg="${l.key}" value="${esc(d.lapseNotes[l.key])}" placeholder="waiting for the kettle"></div>`;
    }
    out += `</div>`;
  }
  return out;
}
function nightStepRatings(d) {
  const notes = state.settings.intentions.notes;
  return `<div style="display:flex;flex-direction:column;gap:18px">${RATINGS.map((r) => ratingRow({ label: r.label, value: d.ratings[r.key], arg: r.key, note: notes[r.key] })).join('')}</div>`;
}
function nightStepNote(d) {
  return `<div class="field-group"><span class="field-label">Reflection</span><textarea class="field" id="night-note" rows="4" data-action="note" placeholder="About today.">${esc(d.note)}</textarea></div>`;
}
const NIGHT_STEP_TITLES = ['Wind-down', 'Slips', 'How I showed up', 'One sentence'];
function renderNightFlow(d, st) {
  const step = st.step;
  const dots = [0, 1, 2, 3].map((i) => `<button type="button" class="step-dot${i <= step ? ' on' : ''}" data-action="night-goto" data-arg="${i}" aria-label="Go to step ${i + 1}"></button>`).join('');
  const isCard = step === 0 ? ' step-content-card' : '';
  const body = step === 0 ? nightStepWinddown(d) : step === 1 ? nightStepSlips(d) : step === 2 ? nightStepRatings(d) : nightStepNote(d);
  const bodyCard = step === 1 || step === 2 || step === 3 ? `<section class="card${step === 1 ? ' list' : ''}">${body}</section>` : `<section class="card${isCard}">${body}</section>`;
  const nextLabel = step === 3 ? 'Done' : 'Next';
  const backToSummary = st.forceFlow ? `<button class="btn text block" type="button" data-action="night-summary">Back to summary</button>` : '';
  return `<div class="night-flow">
    <div>
      <div class="step-head"><span class="step-dots" role="group" aria-label="Steps">${dots}</span><span class="meta" aria-live="polite">Step ${step + 1} of 4</span></div>
      <h1 class="title" style="margin-top:10px">${esc(NIGHT_STEP_TITLES[step])}</h1>
    </div>
    ${bodyCard}
    <div class="night-actions">
      <button class="btn primary big block" type="button" data-action="night-next">${nextLabel}</button>
      <button class="btn text block" type="button" data-action="night-skip">Skip</button>
      ${backToSummary}
    </div>
  </div>`;
}
function renderNightSummary(d, key) {
  const windText = d.windDown.done ? '15 minutes, done' : d.windDown.endsAt ? `In progress, ${mmss(d.windDown.endsAt - Date.now())} left` : 'Skipped';
  const onSlips = LAPSES.filter((l) => d.lapses[l.key]);
  const slipsText = onSlips.length ? onSlips.map((l) => esc(l.label)).join(', ') : 'None';
  const onRatings = RATINGS.filter((r) => d.ratings[r.key] > 0);
  const ratingsText = onRatings.length ? onRatings.map((r) => `${esc(r.label)}: ${d.ratings[r.key]}`).join(' · ') : null;
  const noteText = d.note && d.note.trim() ? esc(d.note) : null;
  const row = (title, value, step, skippedText) => `<button class="summary-row" type="button" data-action="night-edit" data-arg="${step}">
    <span class="body"><span class="kicker-caps">${esc(title)}</span><span class="body-val${value == null ? ' skip' : ''}">${value == null ? esc(skippedText || 'Skipped') : value}</span></span>
    <span class="edit">Edit</span></button>`;
  return `<div class="screen-18">
    <div class="screen-head"><span class="kicker">tonight</span><h1 class="title">Night check-in</h1></div>
    <section class="card list">
      ${row('Wind-down', windText === 'Skipped' ? null : windText, 0)}
      ${row('Slips', slipsText === 'None' ? 'None' : slipsText, 1)}
      ${row('How I showed up', ratingsText, 2)}
      ${row('One sentence', noteText, 3)}
      <div class="summary-logged">Logged for ${esc(fmtLong(key))}.</div>
    </section>
  </div>`;
}
function renderNight() {
  const key = todayKey();
  const d = day(key);
  const st = loadNightUi();
  const allVisited = d.nightVisited.every(Boolean);
  const showSummary = !st.forceFlow && (allVisited || nightCardDone(d));
  if (showSummary) return renderNightSummary(d, key);
  if (st.step == null) { st.step = firstIncompleteNightStep(d); saveNightUi(st); }
  return renderNightFlow(d, st);
}

// ---------- Week ----------
function weekStats(start) { return weekStatsPure(state, start, todayKey()); }
function lastLapse(kind) { return lastLapsePure(state, kind); }
function spark(vals) {
  const w = 314, h = 64, padX = 10, padY = 8;
  const pts = vals.map((v, i) => v == null ? null : [padX + (i * (w - 2 * padX)) / 6, h - padY - ((v - 1) / 4) * (h - 2 * padY)]);
  const segs = []; let cur = [];
  for (const p of pts) { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  const paths = segs.filter((s) => s.length > 1).map((s) => `<path d="M${s.map((p) => p.map((x) => x.toFixed(1)).join(',')).join('L')}" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const dots = pts.filter(Boolean).map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="var(--green)"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${paths}${dots}</svg>`;
}
function renderWeek() {
  const today = todayKey();
  if (!weekCursor) weekCursor = weekStart(today);
  const start = weekCursor, end = addDays(start, 6);
  const cur = weekStats(start), prev = weekStats(addDays(start, -7));
  const isThis = start === weekStart(today);
  const title = `${fmtShort(start)} – ${fmtShort(end)}`;

  const rate = (label, val, n, opts = {}) => {
    const pct = n ? (val / n) * 100 : 0;
    const cmp = opts.prev == null ? '' : `<span class="cmp">last week ${opts.prev}${opts.prevN != null ? ' of ' + opts.prevN : ''}</span>`;
    return `<div class="stat"><div class="line"><span>${esc(label)}</span><span class="val">${val}${n != null ? ` <span class="muted">of ${n}</span>` : ''}</span></div>
      ${n != null ? `<div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div>` : ''}${cmp}</div>`;
  };

  const nav = `<div class="weeknav"><button type="button" data-action="week-nav" data-arg="-1" aria-label="Previous week">${chevronSvg('l')}</button>
    <div class="weeklabel">${title}</div>
    <button type="button" data-action="week-nav" data-arg="1" aria-label="Next week" ${isThis ? 'disabled' : ''}>${chevronSvg('r')}</button></div>`;
  const why = state.settings.intentions.why;
  const whyLine = why && why.trim() ? `<div class="meta" style="text-align:center;padding:0 4px">${esc(why)}</div>` : '';

  const needBackup = backupDue();
  const banner = needBackup ? `<div class="banner">${bannerSvg}No backup in ${needBackup} days. Make one in More, it takes ten seconds.</div>` : '';

  if (cur.n === 0) return `<div class="screen-14">${nav}${whyLine}${banner}<section class="card"><p class="muted">Nothing logged yet for this week.</p></section></div>`;

  let slips = `<section class="card"><h2>Slips</h2><div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">`;
  for (const l of LAPSES) slips += rate(l.label, cur.lapses[l.key], cur.n, { prev: prev.logged ? prev.lapses[l.key] : null, prevN: prev.logged ? prev.n : null });
  slips += `<div class="card-divider"></div>
    <div style="font-size:0.9375rem">Urges ridden out: <span style="font-weight:600;color:var(--green-700)">${cur.rode} rode · ${cur.gave} gave in</span></div>`;
  const lp = lastLapse('porn');
  const since = lp ? Math.round((dateOf(today) - dateOf(lp)) / 86400000) : null;
  slips += `<p class="muted small">${lp ? `Last porn slip logged ${since === 0 ? 'today' : since + (since === 1 ? ' day ago' : ' days ago')}.` : 'No porn slips logged yet.'}</p></div></section>`;

  let showed = `<section class="card"><h2>How I showed up</h2><div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">${spark(cur.dayAvg)}
    <div class="spark-days">${allWeekKeys(start).map((k, i) => `<div><b>${cur.dayAvg[i] == null ? '·' : cur.dayAvg[i].toFixed(1)}</b><span>${DAY_NAMES[weekdayOf(k)]}</span></div>`).join('')}</div>
    <div class="card-divider"></div>`;
  for (const r of RATINGS) {
    const v = cur.ratingAvg[r.key], p = prev.ratingAvg[r.key];
    showed += `<div class="dim-row"><span class="label">${esc(r.label)}</span><span class="this">${v == null ? '–' : v.toFixed(1)}</span><span class="last">${p != null ? 'last ' + p.toFixed(1) : ''}</span></div>`;
  }
  showed += `</div></section>`;

  let routines = `<section class="card"><h2>Routines</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">`;
  routines += rate('Stretched', cur.stretched, cur.n, { prev: prev.logged ? prev.stretched : null, prevN: prev.logged ? prev.n : null });
  routines += rate('Wind-down done', cur.windDown, cur.n, { prev: prev.logged ? prev.windDown : null, prevN: prev.logged ? prev.n : null });
  routines += rate('Gym', cur.gym, null, { prev: prev.logged ? prev.gym : null });
  if (cur.waterPoloPossible) routines += rate('Water polo', cur.waterPolo, cur.waterPoloPossible);
  if (cur.dinnerPossible) routines += rate('Dinner out', cur.dinner, cur.dinnerPossible);
  routines += `</div></section>`;

  const entries = cur.keys.slice().reverse().map((k) => {
    const d = state.days[k]; if (!d) return '';
    const notes = LAPSES.filter((l) => d.lapses[l.key] && d.lapseNotes[l.key]).map((l) => `<div class="note">before ${l.key === 'scroll' ? 'scrolling' : l.key === 'nag' ? 'nagging' : 'porn'}: ${esc(d.lapseNotes[l.key])}</div>`).join('');
    if (!d.note && !notes) return '';
    return `<div class="entry"><div class="d">${esc(fmtLong(k))}</div>${d.note ? `<div class="q">${esc(d.note)}</div>` : ''}${notes}</div>`;
  }).join('');
  const journal = `<section class="card"><h2>Journal</h2><div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">${entries || '<p class="muted small">Nothing written yet.</p>'}</div></section>`;

  return `<div class="screen-14">${nav}${whyLine}${banner}${slips}${showed}${routines}${journal}</div>`;
}
function backupDue() { return backupDueDays(state, Date.now()); }

// ---------- More ----------
const INTENTION_PLACEHOLDERS = {
  curiosity: 'ask the second question',
  story: "let it be someone else's story too",
  pauses: 'count to five before responding',
  present: 'put the phone in the other room',
};
function renderIntentions() {
  const it = state.settings.intentions;
  let out = `<section class="card"><h2>Intentions</h2>
    <div class="field-group" style="margin-top:12px"><span class="field-label">Why I'm doing this</span>
      <textarea class="field" rows="3" data-action="intention-why" placeholder="What this is for, in your own words.">${esc(it.why)}</textarea></div>`;
  for (const r of RATINGS) {
    out += `<div class="field-group" style="margin-top:12px"><span class="field-label">${esc(r.label)}</span>
      <input class="field" type="text" data-action="intention-note" data-arg="${r.key}" value="${esc(it.notes[r.key])}" placeholder="${esc(INTENTION_PLACEHOLDERS[r.key])}"></div>`;
  }
  out += `</section>`;
  return out;
}
function renderMore() {
  const s = state.settings;
  const last = s.lastExport ? new Date(s.lastExport) : null;
  const daysLogged = Object.keys(state.days).length;
  const standalone = window.navigator && window.navigator.standalone === true;
  const dot = (ok) => `<span class="status-dot${ok ? '' : ' warn'}"></span>`;
  const chips = (label, arr, action) => `<div class="chipgroup"><div class="label">${esc(label)}</div><div class="daychips">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<button type="button" data-action="${action}" data-arg="${wd}" aria-pressed="${arr.includes(wd)}"><span>${DAY_LETTERS[wd]}</span></button>`).join('')}</div></div>`;
  const dayEnd = dayEndOptions(s.rolloverHour);
  const scVisible = shortcutsUiVisible(s);

  return `<div class="screen-14">
  <h1 class="title">More</h1>
  <section class="card"><h2>Backup</h2>
    <p class="muted small" style="margin-top:10px">Everything lives only on this device. A backup is a file you keep somewhere you control, like Notes or Files. Nothing is uploaded by this app.</p>
    <div style="display:flex;gap:24px;font-size:0.875rem;margin-top:10px"><span><span class="muted">Last backup</span> ${last ? `${fmtLong(keyOf(last))}` : 'never'}</span><span><span class="muted">Days logged</span> ${daysLogged}</span></div>
    <div class="btn-row" style="margin-top:12px"><button class="btn primary" type="button" data-action="share">Share file</button><button class="btn" type="button" data-action="copy">Copy text</button></div>
    ${standalone ? '' : '<div class="btn-row" style="margin-top:8px"><button class="btn" type="button" data-action="download">Download file</button></div>'}
  </section>
  <section class="card"><h2>Restore</h2>
    <p class="muted small" style="margin-top:10px">Merges a backup into what is here. Newer entries win, nothing is deleted.</p>
    <div style="margin-top:12px"><label class="btn outline" for="import-file">Choose file</label><input id="import-file" class="sr" type="file" accept="application/json,.json,text/plain" data-action="import-file"></div>
    <div class="field-group" style="margin-top:12px"><span class="field-label">Or paste backup text</span>
      <textarea class="field" id="import-text" rows="2" placeholder="{&quot;days&quot;: [ ... ]}"></textarea></div>
    <div class="btn-row" style="margin-top:10px;align-items:center"><button class="btn" type="button" data-action="import-text">Merge</button><span class="muted small">Newer entries win, nothing is deleted.</span></div>
  </section>
  <section class="card"><h2>Storage health</h2>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <div class="status-row"><span>Primary store</span><span class="status-val">${dot(storageHealth.ls === 'ok')}${esc(storageHealth.ls)}</span></div>
      <div class="status-row"><span>Backup mirror</span><span class="status-val">${dot(storageHealth.idb === 'ok')}${esc(storageHealth.idb)}</span></div>
      <div class="status-row"><span>Daily snapshots kept</span><span class="status-val">${dot(true)}${storageHealth.snaps}</span></div>
      <div class="status-row"><span>Persistent storage</span><span class="status-val">${dot(storageHealth.persisted === 'granted')}${esc(storageHealth.persisted)}</span></div>
    </div>
    <p class="muted small" style="margin-top:10px">Two independent stores on the device plus a previous-save copy. If one is lost the app restores from another on next open. Still, keep a backup file.</p>
  </section>
  ${renderIntentions()}
  <section class="card"><h2>Schedule</h2>
    <div style="display:flex;flex-direction:column;gap:16px;margin-top:14px">
      ${chips('Hangover prompt days', s.hangoverDays, 'set-hangover')}
      ${chips('Water polo days', s.waterPoloDays, 'set-waterpolo')}
      ${chips('Dinner out days', s.dinnerDays, 'set-dinner')}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <span style="font-size:0.9375rem">Day ends at</span>
        <div class="segmented-neutral">${dayEnd.map((o) => `<button type="button" data-action="rollover" data-arg="${o.hour}" aria-pressed="${s.rolloverHour === o.hour}">${o.label}</button>`).join('')}</div>
      </div>
    </div>
  </section>
  <section class="card"><h2>Reminders</h2>
    <p class="muted small" style="margin-top:10px">This app never sends notifications on its own. Two daily nudges come from a scheduled ntfy push, not the app; wind-down and urge timers can also ping your phone directly, even locked.</p>
    <div class="field-group" style="margin-top:12px"><span class="field-label">ntfy topic</span>
      <input class="field" type="text" id="ntfy-topic" data-action="ntfy-topic" value="${esc(s.ntfyTopic)}" placeholder="improve-yourname-1234"></div>
    <div class="btn-row" style="margin-top:10px"><button class="btn" type="button" data-action="ntfy-test" ${s.ntfyTopic ? '' : 'disabled'}>Send test</button></div>
    ${toggleRow({ label: 'Timer pings', hint: 'Pings 15 or 10 minutes after a timer starts. Cancelling the timer cannot recall the ping.', checked: s.ntfyTimers, action: 'settings-bool', arg: 'ntfyTimers' })}
    ${scVisible ? `<div style="margin-top:6px">${toggleRow({ label: 'Shortcut timers', hint: 'If you make Shortcuts named Wind Down and Ride It Out that start a 15 and 10 minute timer, the app can launch them.', checked: s.useShortcutTimers, action: 'settings-bool', arg: 'useShortcutTimers' })}</div>` : ''}
  </section>
  ${renderSetupInMore()}
  </div>`;
}

// ---------- urge overlay ----------
let urgeKind = 'scroll';
function pendingUrge() { return state.urges.find((u) => !u.outcome) || null; }
function renderUrgeLog() {
  const stats = weekStats(weekStart(todayKey()));
  const recent = recentUrges(state, 4);
  const rows = recent.map((u) => {
    const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
    const outClass = u.outcome === 'rode' ? 'rode' : u.outcome === 'gave' ? 'gave' : '';
    const outcome = u.outcome === 'rode' ? 'rode it out' : u.outcome === 'gave' ? 'gave in' : 'in progress';
    return `<div class="urge-log-row"><span class="t">${esc(fmtTime(u.at))}</span><span>${esc(kind)}</span><span class="trig">${esc(u.trigger || '')}</span><span class="out ${outClass}">${esc(outcome)}</span></div>`;
  }).join('');
  return `<div class="urge-log-divider"></div><div class="urge-log">
    <div style="font-size:0.875rem">This week: <span style="font-weight:600;color:var(--green-700)">${stats.rode} rode · ${stats.gave} gave in</span></div>
    ${rows || '<p class="muted small">No urges logged yet.</p>'}
  </div>`;
}
function renderUrgeIdle() {
  const scLink = shortcutsUiVisible(state.settings) && state.settings.useShortcutTimers ? '<a class="btn" href="shortcuts://run-shortcut?name=Ride%20It%20Out">Start iPhone timer</a>' : '';
  return `<h1 class="title">Which pull is it?</h1>
    <div class="segmented-blue"><button type="button" data-action="urge-kind" data-arg="scroll" aria-pressed="${urgeKind === 'scroll'}">Scrolling</button><button type="button" data-action="urge-kind" data-arg="porn" aria-pressed="${urgeKind === 'porn'}">Porn</button></div>
    <div class="field-group"><span class="field-label">Trigger</span><input class="field" id="urge-trigger" placeholder="two words: bored, tired, alone"></div>
    <div class="btn-stack">${scLink}<button class="btn primary huge block" type="button" data-action="urge-start">Start 10 minutes</button></div>
    ${renderUrgeLog()}`;
}
function renderUrgeRunning(u) {
  const left = new Date(u.endsAt).getTime() - Date.now();
  const over = left <= 0;
  const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
      ${ring({ id: 'urge-ring', size: 260, leftMs: left, totalMs: URGE_MIN * 60000, clockText: over ? '00:00' : mmss(left), clockClass: 'lg' })}
      <div class="muted" style="font-size:0.9375rem">${esc(kind)}${u.trigger ? ' · ' + esc(u.trigger) : ''}</div>
    </div>
    <button class="btn primary huge block" type="button" data-action="urge-outcome" data-arg="${u.id}:rode" ${over ? '' : 'disabled'}>Rode it out</button>
    <button class="btn warn block" type="button" data-action="urge-outcome" data-arg="${u.id}:gave">Gave in</button>
    <p class="muted small" style="text-align:center;margin-top:-8px">Wait it out. Rode it out unlocks when the timer ends.</p>
    ${renderUrgeLog()}`;
}
function renderUrgeOverlay() {
  const el = $('#urge-overlay');
  const u = pendingUrge();
  const kicker = u ? 'riding it out' : 'urge';
  const body = u ? renderUrgeRunning(u) : renderUrgeIdle();
  el.innerHTML = `<div class="overlay-inner" role="dialog" aria-label="Urge">
    <div class="overlay-top"><span class="kicker">${kicker}</span><button class="overlay-close" type="button" data-action="urge-close" aria-label="Close">${closeSvg}</button></div>
    ${body}
  </div>`;
}
function openUrgeOverlay() {
  urgeKind = 'scroll';
  renderUrgeOverlay();
  const el = $('#urge-overlay');
  el.hidden = false;
  setTimeout(() => $('#urge-trigger')?.focus(), 50);
}
function closeUrgeOverlay() { const el = $('#urge-overlay'); el.hidden = true; el.innerHTML = ''; }

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

// ---------- render ----------
function updateUrgeButton() {
  const ub = $('.urge-btn');
  if (!ub) return;
  const label = $('.urge-label', ub);
  const u = pendingUrge();
  if (u) {
    const left = new Date(u.endsAt).getTime() - Date.now();
    label.textContent = left > 0 ? `Riding it out · ${mmss(left)}` : 'Riding it out';
    ub.classList.add('running');
  } else {
    label.textContent = 'Urge';
    ub.classList.remove('running');
  }
}
function render() {
  const view = $('#view');
  const scrollY = window.scrollY;
  view.innerHTML = tab === 'day' ? renderDay() : tab === 'week' ? renderWeek() : tab === 'night' ? renderNight() : renderMore();
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
  const active = (day().windDown.endsAt && !day().windDown.done) || state.urges.some((u) => !u.outcome && new Date(u.endsAt).getTime() > Date.now());
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
    const left = new Date(u.endsAt).getTime() - Date.now();
    if (left <= 0) rerender = true; else updateRing('urge-ring', left, URGE_MIN * 60000);
  });
  updateUrgeButton();
  const overlayEl = $('#urge-overlay');
  if (rerender && overlayEl && !overlayEl.hidden) renderUrgeOverlay();
  if (rerender) render();
  ensureTick();
}

// ---------- events ----------
function setDays(arrName, wd) {
  const arr = state.settings[arrName];
  const i = arr.indexOf(wd);
  if (i >= 0) arr.splice(i, 1); else arr.push(wd);
  save(); render();
}
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action],[data-tab]');
  if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; if (tab === 'week') weekCursor = weekStart(todayKey()); render(); window.scrollTo(0, 0); return; }
  const a = t.dataset.action, arg = t.dataset.arg;
  const d = day();
  switch (a) {
    case 'day-bool': if (t.tagName === 'BUTTON') { d[arg] = !d[arg]; touch(); save(); render(); } break;
    case 'hangover': d.hangover[arg] = !d.hangover[arg]; touch(); save(); render(); break;
    case 'rate': { const [k, n] = arg.split(':'); d.ratings[k] = d.ratings[k] === Number(n) ? 0 : Number(n); touch(); save(); render(); break; }
    case 'winddown-start': d.windDown.endsAt = Date.now() + WIND_DOWN_MIN * 60000; d.windDown.done = false; touch(); save(); render(); ntfyTimerPing('15m'); break;
    case 'winddown-cancel': d.windDown.endsAt = null; touch(); save(); render(); break;
    case 'winddown-reset': d.windDown.done = false; touch(); save(); render(); break;
    case 'night-goto': { const st = loadNightUi(); st.step = Number(arg); saveNightUi(st); render(); break; }
    case 'night-next':
    case 'night-skip': {
      const st = loadNightUi();
      d.nightVisited[st.step] = true; touch(); save();
      if (st.step < 3) st.step += 1; else st.forceFlow = false;
      saveNightUi(st); render(); break;
    }
    case 'night-back': { const st = loadNightUi(); if (st.step > 0) st.step -= 1; saveNightUi(st); render(); break; }
    case 'night-edit': { const st = loadNightUi(); st.step = Number(arg); st.forceFlow = true; saveNightUi(st); render(); break; }
    case 'night-summary': { const st = loadNightUi(); st.forceFlow = false; saveNightUi(st); render(); break; }
    case 'urge-open': openUrgeOverlay(); break;
    case 'urge-close': closeUrgeOverlay(); break;
    case 'urge-kind': urgeKind = arg; document.querySelectorAll('[data-action="urge-kind"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arg === arg))); break;
    case 'urge-start': {
      const trigger = ($('#urge-trigger')?.value || '').trim().slice(0, 80);
      const now = Date.now();
      state.urges.push({ id: uid(), at: new Date(now).toISOString(), kind: urgeKind, trigger, endsAt: new Date(now + URGE_MIN * 60000).toISOString(), outcome: null });
      state.meta.updatedAt = now; save(); renderUrgeOverlay(); render(); ntfyTimerPing('10m'); break;
    }
    case 'urge-outcome': {
      const [id, outcome] = arg.split(':');
      const u = state.urges.find((x) => x.id === id);
      if (u) {
        u.outcome = outcome; u.resolvedAt = new Date().toISOString(); state.meta.updatedAt = Date.now();
        save();
        toast(outcome === 'rode' ? 'Rode it out. Logged.' : 'Logged.');
        closeUrgeOverlay();
        render();
      }
      break;
    }
    case 'week-nav': weekCursor = addDays(weekCursor, 7 * Number(arg)); render(); window.scrollTo(0, 0); break;
    case 'share': doShare(); break;
    case 'copy': doCopy(); break;
    case 'download': doDownload(); break;
    case 'import-text': {
      const txt = $('#import-text')?.value || '';
      try { const r = mergeImport(txt); toast(`Merged ${r.daysMerged} days, ${r.urgesMerged} urges.`); render(); }
      catch { toast('That does not look like a backup.'); }
      break;
    }
    case 'set-hangover': setDays('hangoverDays', Number(arg)); break;
    case 'set-waterpolo': setDays('waterPoloDays', Number(arg)); break;
    case 'set-dinner': setDays('dinnerDays', Number(arg)); break;
    case 'onboard-check': state.settings.onboarding[arg] = !state.settings.onboarding[arg]; save(); render(); break;
    case 'onboard-done': state.settings.onboarded = true; save(); render(); break;
    case 'rollover': state.settings.rolloverHour = Number(arg); save(); render(); break;
    case 'ntfy-test': ntfyTest(); break;
  }
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action, arg = t.dataset.arg;
  const d = day();
  if (a === 'day-bool' && t.type === 'checkbox') { d[arg] = t.checked; if (arg === 'hungover' && !t.checked) HANGOVER.forEach((h) => d.hangover[h.key] = false); touch(); save(); render(); }
  else if (a === 'lapse') { d.lapses[arg] = t.checked; touch(); save(); render(); }
  else if (a === 'settings-bool') { state.settings[arg] = t.checked; save(); render(); }
  else if (a === 'ntfy-topic') { state.settings.ntfyTopic = t.value.trim(); save(); render(); }
  else if (a === 'import-file') {
    const f = t.files && t.files[0]; if (!f) return;
    f.text().then((txt) => { try { const r = mergeImport(txt); toast(`Merged ${r.daysMerged} days, ${r.urgesMerged} urges.`); render(); } catch { toast('That does not look like a backup.'); } });
  }
});
let noteTimer = null;
document.addEventListener('input', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action, arg = t.dataset.arg;
  if (a === 'note' || a === 'lapse-note') {
    const d = day();
    if (a === 'note') d.note = t.value; else d.lapseNotes[arg] = t.value;
    touch();
    if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = Math.max(48, t.scrollHeight) + 'px'; }
    clearTimeout(noteTimer); noteTimer = setTimeout(save, 300);
  } else if (a === 'ntfy-topic') {
    clearTimeout(noteTimer); noteTimer = setTimeout(() => { state.settings.ntfyTopic = t.value.trim(); save(); }, 300);
  } else if (a === 'intention-why' || a === 'intention-note') {
    if (a === 'intention-why') state.settings.intentions.why = t.value; else state.settings.intentions.notes[arg] = t.value;
    if (t.tagName === 'TEXTAREA') { t.style.height = 'auto'; t.style.height = Math.max(48, t.scrollHeight) + 'px'; }
    clearTimeout(noteTimer); noteTimer = setTimeout(save, 300);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#urge-overlay').hidden) closeUrgeOverlay(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { render(); }
  else {
    clearTimeout(noteTimer); save();
    clearTimeout(saveTimer); mirror(JSON.stringify(state)); // eager mirror flush; pagehide below is a second, later safety net
  }
});
window.addEventListener('pagehide', () => { clearTimeout(noteTimer); save(); clearTimeout(saveTimer); mirror(JSON.stringify(state)); });

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

// ---------- boot ----------
loadState().then(() => {
  tab = defaultTab(new Date(), state.settings.rolloverHour);
  if (tab === 'week') weekCursor = weekStart(todayKey());
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
})();
