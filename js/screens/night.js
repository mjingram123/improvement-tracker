/* Improvement Tracker - Night screen (wind-down, slips, one sentence - a 3-step
   flow the first time each day, a summary once all steps are visited). Ratings
   (d.ratings) moved to the Mind tab in wave 1 (N1): this screen no longer renders
   or edits them, only reads them for the summary's Mind row.

   js/logic-night.js is a separate additive helper file the Mind builder wires up
   in index.html as window.ITLogicNight; until that merge lands, fall back to
   inline copies of the same helpers so this screen keeps working standalone. */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, checkRow, ring, doneCircleSvg, mmss, fmtLong } = IT.ui;
const { LAPSES, RATINGS, nightCardDone, firstIncompleteNightStep } = window.ITLogic;

const NightLogic = window.ITLogicNight || {
  nightChecks(d) { const n = d && d.night; return { washed: !!(n && n.washed), tape: !!(n && n.tape) }; },
  ratingsSummaryText(d, ratings) {
    const on = ratings.filter((r) => d.ratings[r.key] > 0);
    if (!on.length) return null;
    return 'Rated: ' + on.map((r) => `${r.key} ${d.ratings[r.key]}`).join(' · ');
  },
  lapseHelp(d) { const h = (d && d.lapseHelp) || {}; return { scroll: h.scroll || '', porn: h.porn || '', nag: h.nag || '' }; },
  scrollMinutes(d) { const v = d && d.scrollMinutes; return typeof v === 'number' && !Number.isNaN(v) ? v : null; },
  parseScrollMinutes(text) { const digits = String(text == null ? '' : text).replace(/[^0-9]/g, ''); return digits === '' ? null : Number(digits); },
};

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
  const checks = NightLogic.nightChecks(d);
  const checksHtml = `<div class="night-checks">
    ${checkRow({ label: 'Washed up', checked: checks.washed, action: 'night-check', arg: 'washed' })}
    ${checkRow({ label: 'Mouth tape and vaseline', checked: checks.tape, action: 'night-check', arg: 'tape' })}
  </div>`;
  if (wd.done) {
    return `<div class="card-done-line" style="font-size:1.125rem">${doneCircleSvg(24)}15 minutes, done</div><div class="meta">phone down, wash up, mouth tape</div>${checksHtml}`;
  }
  if (wd.endsAt) {
    const left = wd.endsAt - Date.now();
    return `${ring({ id: 'winddown-ring', size: 240, leftMs: left, totalMs: IT.WIND_DOWN_MIN * 60000, clockText: mmss(left), clockClass: 'md' })}
      <button class="btn" type="button" data-action="winddown-cancel">Cancel</button>
      <div class="meta">phone down, wash up, mouth tape</div>${checksHtml}`;
  }
  const scLink = '';
  return `<button class="btn primary big block" style="min-height:64px" type="button" data-action="winddown-start">Start 15:00</button>${scLink}
    <div class="meta">phone down, wash up, mouth tape</div>${checksHtml}`;
}
function nightStepSlips(d) {
  const help = NightLogic.lapseHelp(d);
  const minutes = NightLogic.scrollMinutes(d);
  let out = '';
  for (const l of LAPSES) {
    out += `<div>${toggleRow({ label: l.label, hint: l.hint, checked: d.lapses[l.key], action: 'lapse', arg: l.key })}`;
    if (d.lapses[l.key]) {
      out += `<div class="sub-rows field-group"><span class="field-label">What was happening right before?</span>
        <input class="field" type="text" data-action="lapse-note" data-arg="${l.key}" value="${esc(d.lapseNotes[l.key])}" placeholder="waiting for the kettle"></div>`;
      out += `<div class="sub-rows field-group"><span class="field-label">What would help next time?</span>
        <input class="field" type="text" data-action="lapse-help" data-arg="${l.key}" value="${esc(help[l.key])}" placeholder="optional"></div>`;
      if (l.key === 'scroll') {
        out += `<div class="sub-rows field-group"><span class="field-label">Minutes over, if you know</span>
          <input class="field" style="font-size:16px" type="text" inputmode="numeric" pattern="[0-9]*" data-action="scroll-minutes" value="${minutes == null ? '' : minutes}" placeholder="optional"></div>`;
      }
    }
    out += `</div>`;
  }
  return out;
}
function nightStepNote(d) {
  return `<div class="field-group"><span class="field-label">Reflection</span><textarea class="field" id="night-note" rows="4" data-action="note" placeholder="About today.">${esc(d.note)}</textarea></div>`;
}
const NIGHT_STEP_TITLES = ['Wind-down', 'Slips', 'One sentence'];
const NIGHT_STEP_COUNT = NIGHT_STEP_TITLES.length;
function renderNightFlow(d, st) {
  const step = st.step;
  const dots = Array.from({ length: NIGHT_STEP_COUNT }, (_, i) => i)
    .map((i) => `<button type="button" class="step-dot${i <= step ? ' on' : ''}" data-action="night-goto" data-arg="${i}" aria-label="Go to step ${i + 1}"></button>`).join('');
  const isCard = step === 0 ? ' step-content-card' : '';
  const body = step === 0 ? nightStepWinddown(d) : step === 1 ? nightStepSlips(d) : nightStepNote(d);
  const bodyCard = step === 1 ? `<section class="card list">${body}</section>` : `<section class="card${isCard}">${body}</section>`;
  const nextLabel = step === NIGHT_STEP_COUNT - 1 ? 'Done' : 'Next';
  const backToSummary = st.forceFlow ? `<button class="btn text block" type="button" data-action="night-summary">Back to summary</button>` : '';
  return `<div class="night-flow">
    <div>
      <div class="step-head"><span class="step-dots" role="group" aria-label="Steps">${dots}</span><span class="meta" aria-live="polite">Step ${step + 1} of ${NIGHT_STEP_COUNT}</span></div>
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
function windDownSummaryText(d) {
  const checks = NightLogic.nightChecks(d);
  const parts = [];
  if (d.windDown.done) parts.push('15 minutes, done');
  else if (d.windDown.endsAt) parts.push(`In progress, ${mmss(d.windDown.endsAt - Date.now())} left`);
  if (checks.washed) parts.push('Washed up');
  if (checks.tape) parts.push('Mouth tape and vaseline');
  return parts.length ? parts.join(' · ') : null;
}
function mindRow(ratingsText) {
  // The Mind tab (owner of d.ratings) may not exist yet on this build - guard by
  // checking the actual tab-bar button rather than assuming.
  const mindTabExists = !!document.querySelector('.tab[data-tab="mind"]');
  const tag = mindTabExists ? 'button' : 'div';
  const attrs = mindTabExists ? ' type="button" data-tab="mind"' : '';
  return `<${tag} class="summary-row"${attrs}>
    <span class="body"><span class="kicker-caps">Mind</span><span class="body-val${ratingsText ? '' : ' skip'}">${ratingsText ? esc(ratingsText) : 'Not rated yet'}</span></span>
    <span class="edit">Open Mind</span>
  </${tag}>`;
}
function renderNightSummary(d, key) {
  const windText = windDownSummaryText(d);
  const onSlips = LAPSES.filter((l) => d.lapses[l.key]);
  const slipsText = onSlips.length ? onSlips.map((l) => esc(l.label)).join(', ') : 'None';
  const noteText = d.note && d.note.trim() ? esc(d.note) : null;
  const ratingsText = NightLogic.ratingsSummaryText(d, RATINGS);
  const row = (title, value, step, skippedText) => `<button class="summary-row" type="button" data-action="night-edit" data-arg="${step}">
    <span class="body"><span class="kicker-caps">${esc(title)}</span><span class="body-val${value == null ? ' skip' : ''}">${value == null ? esc(skippedText || 'Skipped') : value}</span></span>
    <span class="edit">Edit</span></button>`;
  return `<div class="screen-18">
    <div class="screen-head"><span class="kicker">tonight</span><h1 class="title">Night check-in</h1></div>
    <section class="card list">
      ${row('Wind-down', windText, 0)}
      ${row('Slips', slipsText === 'None' ? 'None' : slipsText, 1)}
      ${row('One sentence', noteText, 2)}
      ${mindRow(ratingsText)}
      <div class="summary-logged">Logged for ${esc(fmtLong(key))}.</div>
    </section>
  </div>`;
}
function renderNight() {
  const key = IT.todayKey();
  const d = IT.day(key);
  const st = loadNightUi();
  const allVisited = d.nightVisited.slice(0, NIGHT_STEP_COUNT).every(Boolean);
  const showSummary = !st.forceFlow && (allVisited || nightCardDone(d));
  if (showSummary) return renderNightSummary(d, key);
  if (st.step == null) { st.step = firstIncompleteNightStep(d); saveNightUi(st); }
  return renderNightFlow(d, st);
}

IT.registerScreen('night', { render: renderNight });

IT.registerActions({
  'winddown-start': () => { const d = IT.day(); d.windDown.endsAt = Date.now() + IT.WIND_DOWN_MIN * 60000; d.windDown.done = false; IT.touch(); IT.save(); IT.render(); IT.ntfyTimerPing('15m'); },
  'winddown-cancel': () => { const d = IT.day(); d.windDown.endsAt = null; IT.touch(); IT.save(); IT.render(); },
  'night-check': (arg) => { const d = IT.day(); if (!d.night) d.night = { washed: false, tape: false }; d.night[arg] = !d.night[arg]; IT.touch(); IT.save(); IT.render(); },
  'night-goto': (arg) => { const st = loadNightUi(); st.step = Number(arg); saveNightUi(st); IT.render(); },
  'night-next': () => {
    const d = IT.day();
    const st = loadNightUi();
    d.nightVisited[st.step] = true; IT.touch(); IT.save();
    if (st.step < NIGHT_STEP_COUNT - 1) st.step += 1; else st.forceFlow = false;
    saveNightUi(st); IT.render();
  },
  'night-skip': () => {
    const d = IT.day();
    const st = loadNightUi();
    d.nightVisited[st.step] = true; IT.touch(); IT.save();
    if (st.step < NIGHT_STEP_COUNT - 1) st.step += 1; else st.forceFlow = false;
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
  'lapse-help': (value, arg) => { const d = IT.day(); if (!d.lapseHelp) d.lapseHelp = { scroll: '', porn: '', nag: '' }; d.lapseHelp[arg] = value; IT.touch(); IT.saveSoon(); },
  'scroll-minutes': (value) => { const d = IT.day(); d.scrollMinutes = NightLogic.parseScrollMinutes(value); IT.touch(); IT.saveSoon(); },
});
})();
