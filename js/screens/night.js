/* Improvement Tracker - Night screen (wind-down, slips, ratings, note - a 4-step
   flow the first time each day, a summary once all steps are visited). */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, ratingRow, ring, doneCircleSvg, mmss, fmtLong } = IT.ui;
const { LAPSES, RATINGS, nightCardDone, firstIncompleteNightStep, shortcutsUiVisible } = window.ITLogic;

// Only the current step index and the "forced flow" (editing from summary) flag
// live here; which steps are complete lives on the day object (d.nightVisited) so
// it survives an iOS process eviction/relaunch, not just a fresh sessionStorage.
const NIGHT_UI_KEY = 'it:nightUi';
function loadNightUi() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(NIGHT_UI_KEY) || 'null'); } catch {}
  const key = IT.todayKey();
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
    return `${ring({ id: 'winddown-ring', size: 240, leftMs: left, totalMs: IT.WIND_DOWN_MIN * 60000, clockText: mmss(left), clockClass: 'md' })}
      <button class="btn" type="button" data-action="winddown-cancel">Cancel</button>
      <div class="meta">phone down, wash up, mouth tape</div>`;
  }
  const scLink = shortcutsUiVisible(IT.state.settings) && IT.state.settings.useShortcutTimers ? '<a class="btn" href="shortcuts://run-shortcut?name=Wind%20Down">Start iPhone timer</a>' : '';
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
  const notes = IT.state.settings.intentions.notes;
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
  const key = IT.todayKey();
  const d = IT.day(key);
  const st = loadNightUi();
  const allVisited = d.nightVisited.every(Boolean);
  const showSummary = !st.forceFlow && (allVisited || nightCardDone(d));
  if (showSummary) return renderNightSummary(d, key);
  if (st.step == null) { st.step = firstIncompleteNightStep(d); saveNightUi(st); }
  return renderNightFlow(d, st);
}

IT.registerScreen('night', { render: renderNight });

IT.registerActions({
  'rate': (arg) => { const d = IT.day(); const [k, n] = arg.split(':'); d.ratings[k] = d.ratings[k] === Number(n) ? 0 : Number(n); IT.touch(); IT.save(); IT.render(); },
  'winddown-start': () => { const d = IT.day(); d.windDown.endsAt = Date.now() + IT.WIND_DOWN_MIN * 60000; d.windDown.done = false; IT.touch(); IT.save(); IT.render(); IT.ntfyTimerPing('15m'); },
  'winddown-cancel': () => { const d = IT.day(); d.windDown.endsAt = null; IT.touch(); IT.save(); IT.render(); },
  'night-goto': (arg) => { const st = loadNightUi(); st.step = Number(arg); saveNightUi(st); IT.render(); },
  'night-next': () => {
    const d = IT.day();
    const st = loadNightUi();
    d.nightVisited[st.step] = true; IT.touch(); IT.save();
    if (st.step < 3) st.step += 1; else st.forceFlow = false;
    saveNightUi(st); IT.render();
  },
  'night-skip': () => {
    const d = IT.day();
    const st = loadNightUi();
    d.nightVisited[st.step] = true; IT.touch(); IT.save();
    if (st.step < 3) st.step += 1; else st.forceFlow = false;
    saveNightUi(st); IT.render();
  },
  'night-edit': (arg) => { const st = loadNightUi(); st.step = Number(arg); st.forceFlow = true; saveNightUi(st); IT.render(); },
  'night-summary': () => { const st = loadNightUi(); st.forceFlow = false; saveNightUi(st); IT.render(); },
});
IT.registerChange({
  'lapse': (checked, arg) => { const d = IT.day(); d.lapses[arg] = checked; IT.touch(); IT.save(); IT.render(); },
});
IT.registerInput({
  'note': (value) => { const d = IT.day(); d.note = value; IT.touch(); IT.saveSoon(); },
  'lapse-note': (value, arg) => { const d = IT.day(); d.lapseNotes[arg] = value; IT.touch(); IT.saveSoon(); },
});
})();
