/* Improvement Tracker - Day screen. */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, checkRow, checkSvg, doneCircleSvg, bannerSvg, fmtLong } = IT.ui;
const { HANGOVER, weekdayOf } = window.ITLogic;

// Pure morning-checklist helpers (D1). Kept inline so day.js works standalone
// even before js/logic-day.js is wired into index.html/sw.js by the Mind
// builder (CONTRACTS.md); mirrored in js/logic-day.js for node tests.
const MORNING_ITEMS = [
  { key: 'up', label: 'Up on time' },
  { key: 'pushups', label: '30 push ups' },
  { key: 'stretched', label: 'Stretched' },
  { key: 'shower', label: 'Shower and shave' },
];
function isPlainObject(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function defaultMorning(stretched) { return { up: false, pushups: false, stretched: !!stretched, shower: false }; }
function getMorning(d) {
  const base = defaultMorning(d && d.stretched);
  const m = d && isPlainObject(d.morning) ? d.morning : {};
  return { ...base, ...m };
}
function morningAllChecked(morning) { return MORNING_ITEMS.every((item) => !!morning[item.key]); }
function morningCardDone(morning, hangoverActive, hangoverKitComplete) {
  return morningAllChecked(morning) && (!hangoverActive || !!hangoverKitComplete);
}

function kitChip({ label, checked, action, arg }) {
  return `<button class="kitchip" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}">
    <span class="dot">${checkSvg(12)}</span>${esc(label)}</button>`;
}

function renderDay() {
  const key = IT.todayKey();
  const d = IT.day(key);
  const wd = weekdayOf(key);
  const s = IT.state.settings;

  const morning = getMorning(d);
  const hangoverShown = s.hangoverDays.includes(wd);
  const hangoverActive = hangoverShown && d.hungover;
  const hangoverKitComplete = HANGOVER.every((h) => d.hangover[h.key]);
  const morningDone = morningCardDone(morning, hangoverActive, hangoverKitComplete);

  let card = `<section class="card list${morningDone ? ' done' : ''}">`;
  card += MORNING_ITEMS.map((item) => checkRow({ label: item.label, checked: morning[item.key], action: 'morning-check', arg: item.key })).join('');
  if (hangoverShown) {
    card += toggleRow({ label: 'Hungover?', hint: 'Fri, Sat, Sun', checked: d.hungover, action: 'day-bool', arg: 'hungover' });
    if (d.hungover) {
      card += `<div class="kitchips">` + HANGOVER.map((h) => kitChip({ label: h.label, checked: d.hangover[h.key], action: 'hangover', arg: h.key })).join('') + `</div>`;
    }
  }
  if (morningDone) card += `<div class="card-done-line">${doneCircleSvg(18)}Morning done</div>`;
  card += `</section>`;

  const rows = [];
  if (s.dinnerDays.includes(wd)) rows.push(checkRow({ label: 'Dinner out', checked: d.dinnerOut, action: 'day-bool', arg: 'dinnerOut' }));
  rows.push(checkRow({ label: 'Gym', hint: 'log it when it happens', checked: d.gym, action: 'day-bool', arg: 'gym' }));
  const commit = `<div class="kicker-caps" style="padding:0 4px">Commitments</div><section class="card list">${rows.join('')}</section>`;

  const onboarding = IT.onboarding.renderOnboarding();
  const restoredFrom = IT.restoredFrom;
  const banner = restoredFrom ? `<div class="banner ok">${bannerSvg}Restored your data from the ${esc(restoredFrom)}. Consider making a backup in More.</div>` : '';
  const header = `<div class="screen-head"><h1 class="title">${esc(fmtLong(key))}</h1></div>`;
  return `<div class="screen-18">${onboarding}${header}${banner}${card}${commit}</div>`;
}

IT.registerScreen('day', { render: renderDay });

IT.registerActions({
  'day-bool': (arg, el) => { if (el.tagName === 'BUTTON') { const d = IT.day(); d[arg] = !d[arg]; IT.touch(); IT.save(); IT.render(); } },
  'hangover': (arg) => { const d = IT.day(); d.hangover[arg] = !d.hangover[arg]; IT.touch(); IT.save(); IT.render(); },
  'morning-check': (arg) => {
    const d = IT.day();
    const m = getMorning(d);
    m[arg] = !m[arg];
    d.morning = m;
    d.stretched = m.stretched;
    IT.touch(); IT.save(); IT.render();
  },
});
IT.registerChange({
  'day-bool': (checked, arg) => {
    const d = IT.day();
    d[arg] = checked;
    if (arg === 'hungover' && !checked) HANGOVER.forEach((h) => d.hangover[h.key] = false);
    IT.touch(); IT.save(); IT.render();
  },
});
})();
