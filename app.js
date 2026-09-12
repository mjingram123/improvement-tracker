/* Improvement Tracker - local-only, no network, no analytics. */
(() => {
'use strict';

// ---------- logic (dates, state shape, week stats, merge) ----------
const {
  LAPSES, RATINGS, HANGOVER, DAY_NAMES,
  keyOf, dateOf, addDays, weekdayOf, weekStart, fmtLong, fmtShort, mmss,
  todayKeyFor, defaultState, defaultDay, normalize,
  weekStats: weekStatsPure, lastLapse: lastLapsePure, mergeInto, backupDueDays,
  defaultTab, nightCardDone, nightStepDone, firstIncompleteNightStep,
  recentUrges, fmtTime,
} = window.ITLogic;

// ---------- constants ----------
const LS_KEY = 'it:state:v1';
const LS_PREV = 'it:state:v1:prev';
const IDB_NAME = 'improvement-tracker';
const IDB_STORE = 'kv';
const SNAP_KEEP = 60;
const WIND_DOWN_MIN = 15;
const URGE_MIN = 10;

// ---------- utils ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function todayKey() { return todayKeyFor(new Date(), state.settings.rolloverHour); }
function weekKeys(start) { return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }

// ---------- state ----------
let state = defaultState();
let tab = 'day';
let weekCursor = null; // week start key being viewed
let restoredFrom = null;
let storageHealth = { ls: 'unknown', idb: 'unknown', snaps: 0 };
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
function parseSafe(json) {
  if (!json) return null;
  try { const v = JSON.parse(json); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
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
  try { navigator.storage?.persist?.(); } catch {}
}
let saveTimer = null;
function save() {
  state.meta.updatedAt = Math.max(state.meta.updatedAt || 0, Date.now());
  const json = JSON.stringify(state);
  try {
    const cur = localStorage.getItem(LS_KEY);
    if (cur && cur !== json) localStorage.setItem(LS_PREV, cur);
    localStorage.setItem(LS_KEY, json);
    storageHealth.ls = 'ok';
  } catch { storageHealth.ls = 'write failed'; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => mirror(json), 400);
}
async function mirror(json) {
  try {
    const snapKey = `snap:${keyOf(new Date())}`;
    await idbPut([['current', JSON.parse(json)], [snapKey, JSON.parse(json)]]);
    storageHealth.idb = 'ok';
    const keys = (await idbKeys()).filter((k) => String(k).startsWith('snap:')).sort();
    storageHealth.snaps = keys.length;
    if (keys.length > SNAP_KEEP) await idbDelete(keys.slice(0, keys.length - SNAP_KEEP));
  } catch { storageHealth.idb = 'write failed'; }
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

// ---------- rendering helpers ----------
function toggleRow({ label, hint, checked, action, arg, warn }) {
  return `<label class="row"><span class="label">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>
    <span class="switch${warn ? ' warn' : ''}"><input type="checkbox" data-action="${action}" data-arg="${esc(arg || '')}" ${checked ? 'checked' : ''}><span></span></span></label>`;
}
function checkRow({ label, hint, checked, action, arg }) {
  return `<div class="row"><span class="label">${esc(label)}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</span>
    <button class="check" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}" aria-label="${esc(label)}">&#10003;</button></div>`;
}
function ratingRow({ label, value, arg }) {
  return `<div class="row rating-row"><span class="label">${esc(label)}</span><div class="rating" role="group" aria-label="${esc(label)}">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-action="rate" data-arg="${arg}:${n}" aria-pressed="${value === n}">${n}</button>`).join('')}
  </div></div>`;
}

// ---------- Onboarding checklist ----------
const ONBOARDING_ITEMS = [
  { key: 'home', label: 'Add to Home Screen', hint: 'Share button in Safari, then Add to Home Screen. Open it from the icon from now on, that is where your data lives.' },
  { key: 'shortcuts', label: 'Two reminders', hint: 'Shortcuts app > Automation > Time of Day, 9:00 AM and 10:00 PM, action Open App > Improve. Turn off Ask Before Running.' },
  { key: 'backup', label: 'First backup', hint: 'More > Share file, save it to Notes.' },
];
function onboardingRows() {
  const o = state.settings.onboarding;
  return ONBOARDING_ITEMS.map((it) => checkRow({ label: it.label, hint: it.hint, checked: !!o[it.key], action: 'onboard-check', arg: it.key })).join('');
}
// Top card on Day until dismissed.
function renderOnboarding() {
  if (state.settings.onboarded) return '';
  return `<section class="card"><div class="card-head"><h2>Getting set up</h2></div>${onboardingRows()}
    <div class="btn-row"><button class="btn" type="button" data-action="onboard-done">Done, hide this</button></div></section>`;
}
// Moves to More once dismissed, so the instructions stay reachable.
function renderSetupInMore() {
  if (!state.settings.onboarded) return '';
  return `<section class="card"><div class="card-head"><h2>Getting set up</h2></div>${onboardingRows()}</section>`;
}

// ---------- Day ----------
function renderDay() {
  const key = todayKey();
  const d = day(key);
  const wd = weekdayOf(key);
  const s = state.settings;

  const morningDone = d.stretched && (!d.hungover || HANGOVER.every((h) => d.hangover[h.key]));
  let morning = `<section class="card${morningDone ? ' done' : ''}"><div class="card-head"><h2>Morning</h2>${morningDone ? '<span class="badge">done</span>' : ''}</div>`;
  morning += toggleRow({ label: 'Stretched', checked: d.stretched, action: 'day-bool', arg: 'stretched' });
  if (s.hangoverDays.includes(wd)) {
    morning += toggleRow({ label: 'Hungover?', hint: 'weekend mornings only', checked: d.hungover, action: 'day-bool', arg: 'hungover' });
    if (d.hungover) {
      morning += `<div class="sub-rows">` + HANGOVER.map((h) => checkRow({ label: h.label, checked: d.hangover[h.key], action: 'hangover', arg: h.key })).join('') + `</div>`;
    }
  }
  morning += `</section>`;

  const rows = [];
  if (s.waterPoloDays.includes(wd)) rows.push(checkRow({ label: 'Water polo', checked: d.waterPolo, action: 'day-bool', arg: 'waterPolo' }));
  if (s.dinnerDays.includes(wd)) rows.push(checkRow({ label: 'Dinner out', checked: d.dinnerOut, action: 'day-bool', arg: 'dinnerOut' }));
  rows.push(checkRow({ label: 'Gym', hint: 'log it when it happens', checked: d.gym, action: 'day-bool', arg: 'gym' }));
  const commit = `<section class="card"><div class="card-head"><h2>Commitments</h2></div>${rows.join('')}</section>`;

  const onboarding = renderOnboarding();
  const banner = restoredFrom ? `<div class="banner ok">Restored your data from the ${esc(restoredFrom)}. Consider making a backup in More.</div>` : '';
  const header = `<div class="header"><h1>${esc(fmtLong(key))}</h1><span class="sub">morning</span></div>`;
  return onboarding + header + banner + morning + commit;
}

// ---------- Night ----------
const NIGHT_UI_KEY = 'it:nightUi';
function loadNightUi() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(NIGHT_UI_KEY) || 'null'); } catch {}
  const key = todayKey();
  if (!st || st.day !== key || !Array.isArray(st.visited) || st.visited.length !== 4) {
    st = { day: key, visited: [false, false, false, false], step: null, forceFlow: false };
  }
  return st;
}
function saveNightUi(st) {
  try { sessionStorage.setItem(NIGHT_UI_KEY, JSON.stringify(st)); } catch {}
}

function nightStepWinddown(d) {
  const wd = d.windDown;
  if (wd.done) {
    return `<div class="row"><span class="label">Wind-down<span class="hint">15 minutes, done</span></span><button class="check" type="button" data-action="winddown-reset" aria-pressed="true" aria-label="Wind-down done, tap to reset">&#10003;</button></div>`;
  }
  if (wd.endsAt) {
    return `<div class="timer-wrap"><div><div class="muted small">Wind-down</div><div class="timer" id="winddown-timer">${mmss(wd.endsAt - Date.now())}</div></div>
      <button class="btn" type="button" data-action="winddown-cancel">Cancel</button></div>`;
  }
  return `<div class="row"><span class="label">Wind-down<span class="hint">phone down, wash up, mouth tape</span></span>
      <span style="display:flex;gap:8px;align-items:center">${state.settings.useShortcutTimers ? '<a class="btn" href="shortcuts://run-shortcut?name=Wind%20Down">Start iPhone timer</a>' : ''}<button class="btn primary" type="button" data-action="winddown-start">Start 15:00</button></span></div>`;
}
function nightStepSlips(d) {
  let out = '';
  for (const l of LAPSES) {
    out += toggleRow({ label: l.label, hint: l.hint, checked: d.lapses[l.key], action: 'lapse', arg: l.key, warn: true });
    if (d.lapses[l.key]) {
      out += `<div class="sub-rows"><textarea class="field" rows="1" data-action="lapse-note" data-arg="${l.key}" placeholder="What was happening right before?">${esc(d.lapseNotes[l.key])}</textarea></div>`;
    }
  }
  return out;
}
function nightStepRatings(d) {
  return RATINGS.map((r) => ratingRow({ label: r.label, value: d.ratings[r.key], arg: r.key })).join('');
}
function nightStepNote(d) {
  return `<textarea class="field" rows="3" data-action="note" placeholder="About today.">${esc(d.note)}</textarea>`;
}
const NIGHT_STEP_TITLES = ['Wind-down', 'Slips', 'How I showed up', 'One sentence'];
function renderNightFlow(d, st) {
  const step = st.step;
  const dots = [0, 1, 2, 3].map((i) => `<button type="button" class="step-dot${i === step ? ' current' : ''}${nightStepDone(d, st.visited, i) ? ' done' : ''}" data-action="night-goto" data-arg="${i}" aria-label="${esc(NIGHT_STEP_TITLES[i])}" aria-current="${i === step ? 'step' : 'false'}"></button>`).join('');
  const body = step === 0 ? nightStepWinddown(d) : step === 1 ? nightStepSlips(d) : step === 2 ? nightStepRatings(d) : nightStepNote(d);
  const backBtn = step > 0 ? `<button class="btn" type="button" data-action="night-back">Back</button>` : '';
  const nextLabel = step === 3 ? 'Done' : 'Next';
  const backToSummary = st.forceFlow ? `<button class="btn-text" type="button" data-action="night-summary">Back to summary</button>` : '';
  return `<div class="step-dots" role="tablist" aria-label="Night steps">${dots}</div>
    <section class="card"><h3>${esc(NIGHT_STEP_TITLES[step])}</h3>${body}</section>
    <div class="btn-row">${backBtn}<button class="btn primary" type="button" data-action="night-next">${nextLabel}</button></div>
    <button class="btn-text" type="button" data-action="night-skip">Skip</button>
    ${backToSummary}`;
}
function renderNightSummary(d) {
  const windText = d.windDown.done ? '15 minutes, done' : 'Skipped';
  const onSlips = LAPSES.filter((l) => d.lapses[l.key]);
  const slipsText = onSlips.length ? onSlips.map((l) => esc(l.label)).join(', ') : 'None';
  const onRatings = RATINGS.filter((r) => d.ratings[r.key] > 0);
  const ratingsText = onRatings.length ? onRatings.map((r) => `${esc(r.label)}: ${d.ratings[r.key]}`).join(' · ') : 'Skipped';
  const noteText = d.note && d.note.trim() ? esc(d.note) : 'No note';
  const row = (label, value, step) => `<div class="row"><span class="label">${esc(label)}<span class="hint">${value}</span></span><button class="btn" type="button" data-action="night-edit" data-arg="${step}">Edit</button></div>`;
  return `<section class="card done"><div class="card-head"><h2>Tonight</h2><span class="badge">done</span></div>
    ${row('Wind-down', windText, 0)}
    ${row('Slips', slipsText, 1)}
    ${row('How I showed up', ratingsText, 2)}
    ${row('One sentence', noteText, 3)}
  </section>`;
}
function renderNight() {
  const key = todayKey();
  const d = day(key);
  const header = `<div class="header"><h1>${esc(fmtLong(key))}</h1><span class="sub">evening</span></div>`;
  const st = loadNightUi();
  const allVisited = st.visited.every(Boolean);
  const showSummary = !st.forceFlow && (allVisited || nightCardDone(d));
  if (showSummary) return header + renderNightSummary(d);
  if (st.step == null) { st.step = firstIncompleteNightStep(d, st.visited); saveNightUi(st); }
  return header + renderNightFlow(d, st);
}

// ---------- Week ----------
function weekStats(start) { return weekStatsPure(state, start, todayKey()); }
function lastLapse(kind) { return lastLapsePure(state, kind); }
function spark(vals) {
  const w = 300, h = 64, padX = 12, padY = 10;
  const pts = vals.map((v, i) => v == null ? null : [padX + (i * (w - 2 * padX)) / 6, h - padY - ((v - 1) / 4) * (h - 2 * padY)]);
  const segs = []; let cur = [];
  for (const p of pts) { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  const paths = segs.filter((s) => s.length > 1).map((s) => `<path d="M${s.map((p) => p.map((x) => x.toFixed(1)).join(',')).join('L')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const dots = pts.filter(Boolean).map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="var(--accent)" stroke="var(--card)" stroke-width="2"/>`).join('');
  const grid = [1, 3, 5].map((v) => { const y = h - padY - ((v - 1) / 4) * (h - 2 * padY); return `<line x1="${padX}" x2="${w - padX}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`; }).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${grid}${paths}${dots}</svg>`;
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
      ${n != null ? `<div class="bar${opts.warn ? ' warn' : ''}"><i style="width:${pct.toFixed(0)}%"></i></div>` : ''}${cmp}</div>`;
  };

  let out = `<div class="header"><h1>Week</h1><span class="sub">${isThis ? 'this week' : ''}</span></div>
    <div class="weeknav"><button type="button" data-action="week-nav" data-arg="-1" aria-label="Previous week">&#8249;</button><strong>${title}</strong>
    <button type="button" data-action="week-nav" data-arg="1" aria-label="Next week" ${isThis ? 'disabled' : ''}>&#8250;</button></div>`;

  const needBackup = backupDue();
  if (needBackup) out += `<div class="banner">No backup in ${needBackup} days. Make one in More, it takes ten seconds.</div>`;

  if (cur.n === 0) return out + `<section class="card"><p class="muted">Nothing logged yet for this week.</p></section>`;

  out += `<section class="card"><div class="card-head"><h2>Slips</h2><span class="muted small">days out of ${cur.n}</span></div>`;
  for (const l of LAPSES) out += rate(l.label, cur.lapses[l.key], cur.n, { warn: true, prev: prev.n ? prev.lapses[l.key] : null, prevN: prev.n || null });
  out += `<div class="stat"><div class="line"><span>Urges ridden out</span><span class="val">${cur.rode} <span class="muted">rode</span> · ${cur.gave} <span class="muted">gave in</span></span></div>
    ${prev.n ? `<span class="cmp">last week ${prev.rode} rode · ${prev.gave} gave in</span>` : ''}</div>`;
  const lp = lastLapse('porn');
  const since = lp ? Math.round((dateOf(today) - dateOf(lp)) / 86400000) : null;
  out += `<p class="muted small" style="margin-top:10px">${lp ? `Last porn slip logged ${since === 0 ? 'today' : since + (since === 1 ? ' day ago' : ' days ago')}.` : 'No porn slips logged yet.'}</p></section>`;

  out += `<section class="card"><div class="card-head"><h2>How I showed up</h2></div>${spark(cur.dayAvg)}
    <div class="spark-days">${weekKeys(start).map((k, i) => `<span>${DAY_NAMES[weekdayOf(k)]}<b>${cur.dayAvg[i] == null ? '·' : cur.dayAvg[i].toFixed(1)}</b></span>`).join('')}</div>`;
  for (const r of RATINGS) {
    const v = cur.ratingAvg[r.key], p = prev.ratingAvg[r.key];
    out += `<div class="stat"><div class="line"><span>${esc(r.label)}</span><span class="val">${v == null ? '<span class="muted">–</span>' : v.toFixed(1)}</span></div>
      ${p != null ? `<span class="cmp">last week ${p.toFixed(1)}</span>` : ''}</div>`;
  }
  out += `</section>`;

  out += `<section class="card"><div class="card-head"><h2>Routines</h2></div>`;
  out += rate('Stretched', cur.stretched, cur.n, { prev: prev.n ? prev.stretched : null, prevN: prev.n || null });
  out += rate('Wind-down done', cur.windDown, cur.n, { prev: prev.n ? prev.windDown : null, prevN: prev.n || null });
  out += rate('Gym', cur.gym, null, { prev: prev.n ? prev.gym : null });
  if (cur.waterPoloPossible) out += rate('Water polo', cur.waterPolo, cur.waterPoloPossible);
  if (cur.dinnerPossible) out += rate('Dinner out', cur.dinner, cur.dinnerPossible);
  out += `</section>`;

  const entries = cur.keys.slice().reverse().map((k) => {
    const d = state.days[k]; if (!d) return '';
    const notes = LAPSES.filter((l) => d.lapses[l.key] && d.lapseNotes[l.key]).map((l) => `<div class="q">before ${l.key === 'scroll' ? 'scrolling' : l.key === 'nag' ? 'nagging' : 'porn'}: <b>${esc(d.lapseNotes[l.key])}</b></div>`).join('');
    if (!d.note && !notes) return '';
    return `<div class="entry"><div class="d">${esc(fmtLong(k))}</div>${d.note ? `<div>${esc(d.note)}</div>` : ''}${notes}</div>`;
  }).join('');
  out += `<section class="card"><div class="card-head"><h2>Journal</h2></div>${entries || '<p class="muted">No sentences yet this week.</p>'}</section>`;
  return out;
}
function backupDue() { return backupDueDays(state, Date.now()); }

// ---------- More ----------
function renderMore() {
  const s = state.settings;
  const last = s.lastExport ? new Date(s.lastExport) : null;
  const daysLogged = Object.keys(state.days).length;
  const standalone = window.navigator && window.navigator.standalone === true;
  const chips = (label, arr, action) => `<div class="row" style="display:block"><span class="label">${label}</span><div class="daychips">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<button type="button" data-action="${action}" data-arg="${wd}" aria-pressed="${arr.includes(wd)}">${DAY_NAMES[wd]}</button>`).join('')}</div></div>`;
  return `<div class="header"><h1>More</h1></div>
  <section class="card"><div class="card-head"><h2>Backup</h2></div>
    <p class="muted small">Everything lives only on this device. A backup is a file you keep somewhere you control, like Notes or Files. Nothing is uploaded by this app.</p>
    <div class="kv" style="margin-top:8px"><span>Last backup</span><span>${last ? `${fmtLong(keyOf(last))}` : 'never'}</span></div>
    <div class="kv"><span>Days logged</span><span>${daysLogged}</span></div>
    <div class="btn-row"><button class="btn primary" type="button" data-action="share">Share file</button><button class="btn" type="button" data-action="copy">Copy text</button></div>
    ${standalone ? '' : '<div class="btn-row"><button class="btn" type="button" data-action="download">Download file</button></div>'}
  </section>
  <section class="card"><div class="card-head"><h2>Restore</h2></div>
    <p class="muted small">Merges a backup into what is here. Newer entries win, nothing is deleted.</p>
    <div class="btn-row"><label class="btn block" for="import-file">Choose backup file</label><input id="import-file" class="sr" type="file" accept="application/json,.json,text/plain" data-action="import-file"></div>
    <textarea class="field" id="import-text" rows="2" placeholder="Or paste backup text here"></textarea>
    <div class="btn-row"><button class="btn" type="button" data-action="import-text">Merge pasted text</button></div>
  </section>
  <section class="card"><div class="card-head"><h2>Storage health</h2></div>
    <div class="kv"><span>Primary store</span><span>${esc(storageHealth.ls)}</span></div>
    <div class="kv"><span>Backup mirror</span><span>${esc(storageHealth.idb)}</span></div>
    <div class="kv"><span>Daily snapshots kept</span><span>${storageHealth.snaps}</span></div>
    <p class="muted small" style="margin-top:8px">Two independent stores on the device plus a previous-save copy. If one is lost the app restores from another on next open. Still, keep a backup file.</p>
  </section>
  <section class="card"><div class="card-head"><h2>Schedule</h2></div>
    ${chips('Hangover prompt days', s.hangoverDays, 'set-hangover')}
    ${chips('Water polo days', s.waterPoloDays, 'set-waterpolo')}
    ${chips('Dinner out days', s.dinnerDays, 'set-dinner')}
    <div class="row"><span class="label">Day ends at<span class="hint">late nights count toward the day before</span></span>
      <select class="field" data-action="rollover">${[0, 1, 2, 3, 4, 5, 6].map((h) => `<option value="${h}" ${s.rolloverHour === h ? 'selected' : ''}>${h === 0 ? 'midnight' : h + ' am'}</option>`).join('')}</select></div>
  </section>
  <section class="card"><div class="card-head"><h2>Reminders</h2></div>
    <p class="muted small">This app never sends notifications. To get nudged, add a Shortcuts automation: at 9:00 am and 10:00 pm, Open App → Improve. Or set two plain alarms called "check in".</p>
    ${toggleRow({ label: 'Shortcut timers', hint: 'If you make Shortcuts named Wind Down and Ride It Out that start a 15 and 10 minute timer, the app can launch them.', checked: s.useShortcutTimers, action: 'settings-bool', arg: 'useShortcutTimers' })}
  </section>
  ${renderSetupInMore()}`;
}

// ---------- urge overlay ----------
let urgeKind = 'scroll';
function pendingUrge() { return state.urges.find((u) => !u.outcome) || null; }
function renderUrgeTallySection() {
  const stats = weekStats(weekStart(todayKey()));
  const recent = recentUrges(state, 5);
  const rows = recent.map((u) => {
    const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
    const outcome = u.outcome === 'rode' ? 'rode it out' : u.outcome === 'gave' ? 'gave in' : 'in progress';
    return `<div class="entry"><div class="d">${esc(fmtTime(u.at))} · ${esc(kind)}${u.trigger ? ' · ' + esc(u.trigger) : ''}</div><div class="q">${esc(outcome)}</div></div>`;
  }).join('');
  return `<section class="card"><div class="card-head"><h2>This week</h2></div>
    <p>${stats.rode} rode &middot; ${stats.gave} gave in</p>
    ${rows || '<p class="muted small">No urges logged yet.</p>'}
  </section>`;
}
function renderUrgeIdle() {
  return `<h2>What is pulling?</h2>
    <div class="choice"><button type="button" data-action="urge-kind" data-arg="scroll" aria-pressed="${urgeKind === 'scroll'}">Scrolling</button><button type="button" data-action="urge-kind" data-arg="porn" aria-pressed="${urgeKind === 'porn'}">Porn</button></div>
    <input class="field" id="urge-trigger" placeholder="Trigger, two words (bored, tired, alone)">
    <div class="btn-row">${state.settings.useShortcutTimers ? '<a class="btn" href="shortcuts://run-shortcut?name=Ride%20It%20Out">Start iPhone timer</a>' : ''}<button class="btn primary block" type="button" data-action="urge-start">Start 10 minutes</button></div>
    ${renderUrgeTallySection()}`;
}
function renderUrgeRunning(u) {
  const left = new Date(u.endsAt).getTime() - Date.now();
  const over = left <= 0;
  const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
  return `<h2>${esc(kind)}${u.trigger ? ' · ' + esc(u.trigger) : ''}</h2>
    <div class="timer" id="urge-timer" data-timer="${u.id}" data-ends="${new Date(u.endsAt).getTime()}">${over ? '00:00' : mmss(left)}</div>
    <div class="btn-row">
      <button class="btn primary" type="button" data-action="urge-outcome" data-arg="${u.id}:rode" ${over ? '' : 'disabled'}>Rode it out</button>
      <button class="btn warn" type="button" data-action="urge-outcome" data-arg="${u.id}:gave">Gave in</button>
    </div>
    <p class="muted small" style="margin-top:8px">Wait it out. Rode it out unlocks when the timer ends.</p>
    ${renderUrgeTallySection()}`;
}
function renderUrgeOverlay() {
  const el = $('#urge-overlay');
  const u = pendingUrge();
  const body = u ? renderUrgeRunning(u) : renderUrgeIdle();
  el.innerHTML = `<div class="overlay-inner" role="dialog" aria-label="Urge">
    <button class="overlay-close" type="button" data-action="urge-close" aria-label="Close">&times;</button>
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
  const u = pendingUrge();
  if (u) {
    const left = new Date(u.endsAt).getTime() - Date.now();
    ub.textContent = left > 0 ? `Riding it out · ${mmss(left)}` : 'Riding it out';
    ub.classList.add('urge-active');
  } else {
    ub.textContent = 'I feel an urge';
    ub.classList.remove('urge-active');
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
  document.querySelectorAll('textarea.field').forEach((t) => { t.style.height = 'auto'; t.style.height = Math.max(44, t.scrollHeight) + 'px'; });
}
function ensureTick() {
  const active = (day().windDown.endsAt && !day().windDown.done) || state.urges.some((u) => !u.outcome && new Date(u.endsAt).getTime() > Date.now());
  if (active && !tickHandle) tickHandle = setInterval(tick, 1000);
  if (!active && tickHandle) { clearInterval(tickHandle); tickHandle = null; }
}
function tick() {
  const d = day();
  if (d.windDown.endsAt && !d.windDown.done) {
    const left = d.windDown.endsAt - Date.now();
    if (left <= 0) { d.windDown.done = true; d.windDown.endsAt = null; touch(); save(); toast('Wind-down complete.'); render(); return; }
    const el = $('#winddown-timer'); if (el) el.textContent = mmss(left);
  }
  let rerender = false;
  document.querySelectorAll('[data-timer]').forEach((el) => {
    const left = Number(el.dataset.ends) - Date.now();
    if (left <= 0) rerender = true; else el.textContent = mmss(left);
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
    case 'winddown-start': d.windDown.endsAt = Date.now() + WIND_DOWN_MIN * 60000; d.windDown.done = false; touch(); save(); render(); break;
    case 'winddown-cancel': d.windDown.endsAt = null; touch(); save(); render(); break;
    case 'winddown-reset': d.windDown.done = false; touch(); save(); render(); break;
    case 'night-goto': { const st = loadNightUi(); st.step = Number(arg); saveNightUi(st); render(); break; }
    case 'night-next':
    case 'night-skip': {
      const st = loadNightUi();
      st.visited[st.step] = true;
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
      state.meta.updatedAt = now; save(); renderUrgeOverlay(); render(); break;
    }
    case 'urge-outcome': {
      const [id, outcome] = arg.split(':');
      const u = state.urges.find((x) => x.id === id);
      if (u) {
        u.outcome = outcome; u.resolvedAt = new Date().toISOString(); state.meta.updatedAt = Date.now();
        save();
        toast(outcome === 'rode' ? 'That counts.' : 'Logged. Tomorrow is a new day.');
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
  }
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const a = t.dataset.action, arg = t.dataset.arg;
  const d = day();
  if (a === 'day-bool' && t.type === 'checkbox') { d[arg] = t.checked; if (arg === 'hungover' && !t.checked) HANGOVER.forEach((h) => d.hangover[h.key] = false); touch(); save(); render(); }
  else if (a === 'lapse') { d.lapses[arg] = t.checked; touch(); save(); render(); }
  else if (a === 'rollover') { state.settings.rolloverHour = Number(t.value); save(); render(); }
  else if (a === 'settings-bool') { state.settings[arg] = t.checked; save(); render(); }
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
    t.style.height = 'auto'; t.style.height = Math.max(44, t.scrollHeight) + 'px';
    clearTimeout(noteTimer); noteTimer = setTimeout(save, 300);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#urge-overlay').hidden) closeUrgeOverlay(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); else { clearTimeout(noteTimer); save(); } });
window.addEventListener('pagehide', () => { clearTimeout(noteTimer); save(); clearTimeout(saveTimer); mirror(JSON.stringify(state)); });

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
