/* Improvement Tracker - onboarding checklist, shared by Day (top card until
   dismissed) and More (moved there once dismissed, so it stays reachable). Not a
   tab of its own; exposed via IT.onboarding for day.js and more.js to call. */
(() => {
'use strict';
const IT = window.IT;
const { checkRow } = IT.ui;

const FRAMING_LINE = 'A private notebook for the habits and mindset you are working on. Nothing leaves this phone.';

const ONBOARDING_ITEMS = [
  { key: 'home', label: 'Add to Home Screen', hint: 'Share button in Safari, then Add to Home Screen. Open it from the icon from now on, that is where your data lives.' },
  { key: 'shortcuts', label: 'Turn on nudges', hint: 'Install the ntfy app, subscribe to the topic in More > Reminders. Two pushes a day, 9:00 and 22:00, generic wording.' },
  { key: 'backup', label: 'First backup', hint: 'More > Share file, save it to Notes.' },
];
function onboardingRows() {
  const o = IT.state.settings.onboarding;
  return ONBOARDING_ITEMS.map((it) => checkRow({ label: it.label, hint: it.hint, checked: !!o[it.key], action: 'onboard-check', arg: it.key, small: true })).join('');
}
// Top card on Day until dismissed.
function renderOnboarding() {
  if (IT.state.settings.onboarded) return '';
  return `<section class="card list"><h2 style="padding:12px 0 0">Getting set up</h2>
    <p class="muted small" style="padding:2px 0 0">${FRAMING_LINE}</p>${onboardingRows()}
    <div class="btn-row" style="padding:12px 0"><button class="btn" type="button" data-action="onboard-done">Done, hide this</button></div></section>`;
}
// Moves to More once dismissed.
function renderSetupInMore() {
  if (!IT.state.settings.onboarded) return '';
  return `<section class="card"><h2>Getting set up</h2><div style="margin-top:6px">${onboardingRows()}</div></section>`;
}

IT.onboarding = { renderOnboarding, renderSetupInMore };

IT.registerActions({
  'onboard-check': (arg) => { IT.state.settings.onboarding[arg] = !IT.state.settings.onboarding[arg]; IT.save(); IT.render(); },
  'onboard-done': () => { IT.state.settings.onboarded = true; IT.save(); IT.render(); },
});
})();
