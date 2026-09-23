/* Improvement Tracker - Mind screen: Prepare (today's focus) and Reflect (how I
   showed up, a moment today, intentions editing, weekly review) halves. */
(() => {
'use strict';
const IT = window.IT;
const { esc, checkRow } = IT.ui;
const { RATINGS } = window.ITLogic;
const { mindDefaultHalf, eligibleReviewWeek } = window.ITLogicMind;

const INTENTION_PLACEHOLDERS = {
  curiosity: 'ask the second question',
  story: "let it be someone else's story too",
  pauses: 'count to five before responding',
  present: 'put the phone in the other room',
};

// ---------- Prepare/Reflect half - persisted per day in sessionStorage, same
// pattern as night.js's step tracking, so it survives re-renders but resets to
// the clock default on a new day. ----------
const MIND_UI_KEY = 'it:mindUi';
function loadMindUi() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(MIND_UI_KEY) || 'null'); } catch {}
  const key = IT.todayKey();
  if (!st || st.day !== key) st = { day: key, half: null };
  return st;
}
function saveMindUi(st) {
  try { sessionStorage.setItem(MIND_UI_KEY, JSON.stringify(st)); } catch {}
}

// ---------- weekly review UI (per-week "force edit" flag, mirrors night.js's
// forceFlow pattern) ----------
const MIND_REVIEW_UI_KEY = 'it:mindReviewUi';
function loadReviewUi(weekStartKey) {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(MIND_REVIEW_UI_KEY) || 'null'); } catch {}
  if (!st || st.week !== weekStartKey) st = { week: weekStartKey, editing: false };
  return st;
}
function saveReviewUi(st) {
  try { sessionStorage.setItem(MIND_REVIEW_UI_KEY, JSON.stringify(st)); } catch {}
}

// ---------- Prepare half ----------
function renderPrepare(d) {
  const intentions = IT.state.settings.intentions;
  const rows = RATINGS.map((r) => {
    const checked = d.mindFocus === r.key;
    let detail = '';
    if (checked) {
      const note = (intentions.notes[r.key] || '').trim();
      const why = (intentions.why || '').trim();
      if (note) {
        detail = `<div class="sub-rows mind-focus-detail">
          <p class="mind-focus-note">${esc(intentions.notes[r.key])}</p>
          ${why ? `<p class="meta">${esc(intentions.why)}</p>` : ''}
        </div>`;
      } else {
        detail = `<div class="sub-rows mind-focus-detail"><p class="meta">Write your intentions below so they show up here.</p></div>`;
      }
    }
    return `<div>${checkRow({ label: r.label, checked, action: 'mind-focus', arg: r.key })}${detail}</div>`;
  }).join('');
  return `<section class="card list"><h2>Today's focus</h2>${rows}</section>
  ${renderIntentionsEditor(intentions)}`;
}

// ---------- Reflect half ----------
// Local rating row, identical markup to IT.ui.ratingRow, but with its own
// data-action so it does not collide with night.js's 'rate' handler while both
// screens still render d.ratings during the merge window (see CONTRACTS.md).
function mindRatingRow({ label, value, arg, note }) {
  const showNote = note && note.trim();
  return `<div class="rating-row"><div style="display:flex;flex-direction:column;gap:2px"><span class="label">${esc(label)}</span>${showNote ? `<span class="meta">${esc(note)}</span>` : ''}</div><div class="rating" role="group" aria-label="${esc(label)}">
    ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-action="mind-rate" data-arg="${arg}:${n}" aria-pressed="${value === n}">${n}</button>`).join('')}
  </div></div>`;
}
function renderHowIShowedUp(d) {
  const notes = IT.state.settings.intentions.notes;
  return `<section class="card"><h2>How I showed up</h2>
    <div style="display:flex;flex-direction:column;gap:18px;margin-top:12px">
      ${RATINGS.map((r) => mindRatingRow({ label: r.label, value: d.ratings[r.key], arg: r.key, note: notes[r.key] })).join('')}
    </div></section>`;
}
function renderMoment(d) {
  return `<section class="card"><div class="field-group"><span class="field-label">A moment today where I...</span>
    <textarea class="field" rows="4" data-action="mind-moment" placeholder="Noticed, chose, held back.">${esc(d.mindMoment || '')}</textarea></div></section>`;
}
function renderIntentionsEditor(intentions) {
  let fields = `<div class="field-group" style="margin-top:12px"><span class="field-label">Why I'm doing this</span>
    <textarea class="field" rows="3" data-action="mind-intention-why" placeholder="What this is for, in your own words.">${esc(intentions.why)}</textarea></div>`;
  for (const r of RATINGS) {
    fields += `<div class="field-group" style="margin-top:12px"><span class="field-label">${esc(r.label)}</span>
      <input class="field" type="text" data-action="mind-intention-note" data-arg="${r.key}" value="${esc(intentions.notes[r.key])}" placeholder="${esc(INTENTION_PLACEHOLDERS[r.key])}"></div>`;
  }
  return `<details class="card mind-intentions"><summary>Edit intentions</summary>${fields}</details>`;
}
function reviewsStore() {
  if (!IT.state.reviews) IT.state.reviews = {};
  return IT.state.reviews;
}
function renderWeeklyReview(now, todayKey) {
  const weekStartKey = eligibleReviewWeek(now, todayKey);
  if (!weekStartKey) return '';
  const reviews = reviewsStore();
  const r = reviews[weekStartKey] || { worked: '', inTheWay: '', next: '', at: null };
  const hasText = !!((r.worked && r.worked.trim()) || (r.inTheWay && r.inTheWay.trim()) || (r.next && r.next.trim()));
  const ui = loadReviewUi(weekStartKey);
  if (hasText && !ui.editing) {
    return `<section class="card"><div class="row" style="min-height:auto;cursor:default">
      <h2>Weekly review</h2>
      <button class="btn text" type="button" data-action="mind-review-edit" data-arg="${weekStartKey}">Edit</button>
    </div></section>`;
  }
  return `<section class="card"><h2>Weekly review</h2>
    <div class="field-group" style="margin-top:12px"><span class="field-label">What worked</span>
      <textarea class="field" rows="2" data-action="mind-review-worked" data-arg="${weekStartKey}">${esc(r.worked)}</textarea></div>
    <div class="field-group" style="margin-top:12px"><span class="field-label">What got in the way</span>
      <textarea class="field" rows="2" data-action="mind-review-intheway" data-arg="${weekStartKey}">${esc(r.inTheWay)}</textarea></div>
    <div class="field-group" style="margin-top:12px"><span class="field-label">One thing for next week</span>
      <textarea class="field" rows="2" data-action="mind-review-next" data-arg="${weekStartKey}">${esc(r.next)}</textarea></div>
  </section>`;
}
function renderReflect(d) {
  const now = new Date();
  const todayKey = IT.todayKey();
  return `${renderHowIShowedUp(d)}${renderMoment(d)}${renderWeeklyReview(now, todayKey)}`;
}

// ---------- screen ----------
function renderMind() {
  const key = IT.todayKey();
  const d = IT.day(key);
  const st = loadMindUi();
  if (!st.half) { st.half = mindDefaultHalf(new Date(), IT.state.settings.rolloverHour); saveMindUi(st); }
  const body = st.half === 'reflect' ? renderReflect(d) : renderPrepare(d);
  return `<div class="screen-14">
    <div class="screen-head"><h1 class="title">Mind</h1></div>
    <div class="mind-segmented" role="group" aria-label="Prepare or reflect">
      <button type="button" data-action="mind-half" data-arg="prepare" aria-pressed="${st.half === 'prepare'}">Prepare</button>
      <button type="button" data-action="mind-half" data-arg="reflect" aria-pressed="${st.half === 'reflect'}">Reflect</button>
    </div>
    ${body}
  </div>`;
}

IT.registerScreen('mind', { render: renderMind });

IT.registerActions({
  'mind-half': (arg) => { const st = loadMindUi(); st.half = arg; saveMindUi(st); IT.render(); },
  'mind-focus': (arg) => {
    const d = IT.day();
    d.mindFocus = d.mindFocus === arg ? '' : arg;
    IT.touch(); IT.save(); IT.render();
  },
  'mind-rate': (arg) => {
    const d = IT.day();
    const [k, n] = arg.split(':');
    d.ratings[k] = d.ratings[k] === Number(n) ? 0 : Number(n);
    IT.touch(); IT.save(); IT.render();
  },
  'mind-review-edit': (arg) => { saveReviewUi({ week: arg, editing: true }); IT.render(); },
});
IT.registerInput({
  'mind-moment': (value) => { const d = IT.day(); d.mindMoment = value; IT.touch(); IT.saveSoon(); },
  'mind-intention-why': (value) => { IT.state.settings.intentions.why = value; IT.saveSoon(); },
  'mind-intention-note': (value, arg) => { IT.state.settings.intentions.notes[arg] = value; IT.saveSoon(); },
  'mind-review-worked': (value, arg) => { const r = reviewsStore(); r[arg] = { ...(r[arg] || { worked: '', inTheWay: '', next: '' }), worked: value, at: Date.now() }; IT.saveSoon(); },
  'mind-review-intheway': (value, arg) => { const r = reviewsStore(); r[arg] = { ...(r[arg] || { worked: '', inTheWay: '', next: '' }), inTheWay: value, at: Date.now() }; IT.saveSoon(); },
  'mind-review-next': (value, arg) => { const r = reviewsStore(); r[arg] = { ...(r[arg] || { worked: '', inTheWay: '', next: '' }), next: value, at: Date.now() }; IT.saveSoon(); },
});
})();
