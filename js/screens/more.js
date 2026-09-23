/* Improvement Tracker - More screen (backup/restore, storage health, intentions,
   schedule, reminders). */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, fmtLong } = IT.ui;
const { RATINGS, dayEndOptions, shortcutsUiVisible, keyOf } = window.ITLogic;

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // Sun..Sat

const INTENTION_PLACEHOLDERS = {
  curiosity: 'ask the second question',
  story: "let it be someone else's story too",
  pauses: 'count to five before responding',
  present: 'put the phone in the other room',
};
function renderIntentions() {
  const it = IT.state.settings.intentions;
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
  const s = IT.state.settings;
  const last = s.lastExport ? new Date(s.lastExport) : null;
  const daysLogged = Object.keys(IT.state.days).length;
  const standalone = window.navigator && window.navigator.standalone === true;
  const storageHealth = IT.storageHealth;
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
    <p class="muted small" style="margin-top:6px">Anyone who guesses the topic can read it, so keep it long and random.</p>
    <div class="btn-row" style="margin-top:10px"><button class="btn" type="button" data-action="ntfy-test" ${s.ntfyTopic ? '' : 'disabled'}>Send test</button></div>
    ${toggleRow({ label: 'Timer pings', hint: 'Pings 15 or 10 minutes after a timer starts. Cancelling the timer cannot recall the ping.', checked: s.ntfyTimers, action: 'settings-bool', arg: 'ntfyTimers' })}
    ${scVisible ? `<div style="margin-top:6px">${toggleRow({ label: 'Shortcut timers', hint: 'If you make Shortcuts named Wind Down and Ride It Out that start a 15 and 10 minute timer, the app can launch them.', checked: s.useShortcutTimers, action: 'settings-bool', arg: 'useShortcutTimers' })}</div>` : ''}
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
  'set-waterpolo': (arg) => setDays('waterPoloDays', Number(arg)),
  'set-dinner': (arg) => setDays('dinnerDays', Number(arg)),
  'rollover': (arg) => { IT.state.settings.rolloverHour = Number(arg); IT.save(); IT.render(); },
  'ntfy-test': () => IT.ntfyTest(),
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
  'intention-why': (value) => { IT.state.settings.intentions.why = value; IT.saveSoon(); },
  'intention-note': (value, arg) => { IT.state.settings.intentions.notes[arg] = value; IT.saveSoon(); },
});
})();
