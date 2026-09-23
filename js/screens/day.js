/* Improvement Tracker - Day screen. */
(() => {
'use strict';
const IT = window.IT;
const { esc, toggleRow, checkRow, checkSvg, doneCircleSvg, bannerSvg, fmtLong } = IT.ui;
const { HANGOVER, weekdayOf } = window.ITLogic;

function kitChip({ label, checked, action, arg }) {
  return `<button class="kitchip" type="button" data-action="${action}" data-arg="${esc(arg || '')}" aria-pressed="${checked}">
    <span class="dot">${checkSvg(12)}</span>${esc(label)}</button>`;
}

function renderDay() {
  const key = IT.todayKey();
  const d = IT.day(key);
  const wd = weekdayOf(key);
  const s = IT.state.settings;

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

  const onboarding = IT.onboarding.renderOnboarding();
  const restoredFrom = IT.restoredFrom;
  const banner = restoredFrom ? `<div class="banner ok">${bannerSvg}Restored your data from the ${esc(restoredFrom)}. Consider making a backup in More.</div>` : '';
  const header = `<div class="screen-head"><h1 class="title">${esc(fmtLong(key))}</h1></div>`;
  return `<div class="screen-18">${onboarding}${header}${banner}${morning}${commit}</div>`;
}

IT.registerScreen('day', { render: renderDay });

IT.registerActions({
  'day-bool': (arg, el) => { if (el.tagName === 'BUTTON') { const d = IT.day(); d[arg] = !d[arg]; IT.touch(); IT.save(); IT.render(); } },
  'hangover': (arg) => { const d = IT.day(); d.hangover[arg] = !d.hangover[arg]; IT.touch(); IT.save(); IT.render(); },
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
