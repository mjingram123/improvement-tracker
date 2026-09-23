/* Improvement Tracker - More screen (backup/restore, snapshot restore, storage
   health, schedule, reminders). */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, fmtLong } = IT.ui;
const { dayEndOptions, keyOf } = window.ITLogic;
// Guarded: js/logic-more.js is a separate <script> tag (added to index.html/sw.js
// SHELL by the Mind builder per CONTRACTS.md M1); fall back to inline copies so
// this screen still works if that wiring lands after this file does.
const { recentSnapshotKeys, snapshotDateKey } = window.ITLogicMore || {
  recentSnapshotKeys: (keys, limit) => (keys || []).map(String).filter((k) => k.startsWith('snap:')).sort().reverse().slice(0, limit || 7),
  snapshotDateKey: (k) => String(k).slice(5),
};

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat

// ---------- IndexedDB reader (own, small; same DB/store names as js/core.js) ----------
const IDB_NAME = 'improvement-tracker';
const IDB_STORE = 'kv';
function idbAvailable() { return 'indexedDB' in window; }
function idbOpenMore() {
  return new Promise((resolve, reject) => {
    if (!idbAvailable()) return reject(new Error('no idb'));
    const req = indexedDB.open(IDB_NAME, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // No onupgradeneeded: this screen never creates the DB, only reads it.
    // If it does not exist yet, the store will be missing and reads fail,
    // which snapshotSection treats the same as "no snapshots".
  });
}
async function idbKeysMore() {
  const db = await idbOpenMore();
  return new Promise((resolve, reject) => {
    let tx;
    try { tx = db.transaction(IDB_STORE, 'readonly'); } catch (e) { return reject(e); }
    const r = tx.objectStore(IDB_STORE).getAllKeys();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGetMore(key) {
  const db = await idbOpenMore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const r = tx.objectStore(IDB_STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

// Snapshot restore (R1) UI state: which key (if any) is armed for a confirming
// second tap. Module-level so it survives the re-render after arming, but resets
// whenever the More screen is left (tab switch re-renders from scratch anyway).
let snapshotKeys = null; // null = not loaded yet; [] = loaded, none found
let armedSnapshotKey = null;
function loadSnapshotKeys() {
  if (!idbAvailable()) { snapshotKeys = []; return; }
  idbKeysMore().then((keys) => {
    snapshotKeys = recentSnapshotKeys(keys, 7);
    IT.render();
  }).catch(() => { snapshotKeys = []; IT.render(); });
}
function renderSnapshotRestore() {
  if (!idbAvailable()) return '';
  if (snapshotKeys === null) { loadSnapshotKeys(); return ''; }
  if (!snapshotKeys.length) return '';
  const rows = snapshotKeys.map((key) => {
    const label = fmtLong(snapshotDateKey(key));
    if (key === armedSnapshotKey) {
      return `<div class="row" style="align-items:center"><span class="label">${esc(label)}</span>
        <button class="btn primary" type="button" data-action="snapshot-merge" data-arg="${esc(key)}">Merge this snapshot</button></div>`;
    }
    return `<button class="row" type="button" data-action="snapshot-pick" data-arg="${esc(key)}" aria-label="${esc(label)}">
      <span class="label">${esc(label)}</span></button>`;
  }).join('');
  return `<div class="field-group" style="margin-top:14px"><span class="field-label">Restore from a daily snapshot</span>${rows}</div>`;
}
function renderMore() {
  const s = IT.state.settings;
  const last = s.lastExport ? new Date(s.lastExport) : null;
  const daysLogged = Object.keys(IT.state.days).length;
  const standalone = window.navigator && window.navigator.standalone === true;
  const storageHealth = IT.storageHealth;
  const dot = (ok) => `<span class="status-dot${ok ? '' : ' warn'}"></span>`;
  const chips = (label, arr, action) => `<div class="chipgroup"><div class="label">${esc(label)}</div><div class="daychips">${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<button type="button" data-action="${action}" data-arg="${wd}" aria-pressed="${arr.includes(wd)}"><span>${DAY_LETTERS[wd]}</span></button>`).join('')}</div></div>`;
  const dayEnd = dayEndOptions(s.rolloverHour);

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
    ${renderSnapshotRestore()}
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
  <section class="card"><h2>Schedule</h2>
    <div style="display:flex;flex-direction:column;gap:16px;margin-top:14px">
      ${chips('Hangover prompt days', s.hangoverDays, 'set-hangover')}
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
    <p class="muted small" style="margin-top:6px">Anyone who guesses the topic can read it, so keep it long and random.</p>
    <div class="btn-row" style="margin-top:10px"><button class="btn" type="button" data-action="ntfy-test" ${s.ntfyTopic ? '' : 'disabled'}>Send test</button></div>
    ${toggleRow({ label: 'Timer pings', hint: 'Pings 15 or 10 minutes after a timer starts. Cancelling the timer cannot recall the ping.', checked: s.ntfyTimers, action: 'settings-bool', arg: 'ntfyTimers' })}
  </section>
  ${IT.onboarding.renderSetupInMore()}
  </div>`;
}

IT.registerScreen('more', { render: renderMore });

function doMergeFrom(txt) {
  try { const r = IT.mergeImport(txt); IT.toast(`Merged ${r.daysMerged} days, ${r.urgesMerged} urges.`); IT.render(); }
  catch { IT.toast('That does not look like a backup.'); }
}
function setDays(arrName, wd) {
  const arr = IT.state.settings[arrName];
  const i = arr.indexOf(wd);
  if (i >= 0) arr.splice(i, 1); else arr.push(wd);
  IT.save(); IT.render();
}

IT.registerActions({
  'share': () => IT.share(),
  'copy': () => IT.copy(),
  'download': () => IT.download(),
  'import-text': () => {
    const txt = document.querySelector('#import-text')?.value || '';
    doMergeFrom(txt);
  },
  'set-hangover': (arg) => setDays('hangoverDays', Number(arg)),
  'set-dinner': (arg) => setDays('dinnerDays', Number(arg)),
  'rollover': (arg) => { IT.state.settings.rolloverHour = Number(arg); IT.save(); IT.render(); },
  'ntfy-test': () => IT.ntfyTest(),
  'snapshot-pick': (arg) => { armedSnapshotKey = arg; IT.render(); },
  'snapshot-merge': (arg) => {
    idbGetMore(arg).then((snapshot) => {
      armedSnapshotKey = null;
      snapshotKeys = null; // force a fresh read on the next render
      if (!snapshot) { IT.toast('That snapshot is gone.'); IT.render(); return; }
      doMergeFrom(JSON.stringify(snapshot));
    }).catch(() => { armedSnapshotKey = null; snapshotKeys = null; IT.toast('Could not read that snapshot.'); IT.render(); });
  },
});
IT.registerChange({
  'settings-bool': (checked, arg) => { IT.state.settings[arg] = checked; IT.save(); IT.render(); },
  'ntfy-topic': (value) => { IT.state.settings.ntfyTopic = value.trim(); IT.save(); IT.render(); },
  'import-file': (files) => {
    const f = files && files[0]; if (!f) return;
    f.text().then((txt) => doMergeFrom(txt));
  },
});
IT.registerInput({
  'ntfy-topic': (value) => { IT.state.settings.ntfyTopic = value.trim(); IT.saveSoon(); },
});
})();
