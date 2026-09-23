/* Improvement Tracker - Urge screen pure logic (no DOM). Works as a browser
   script (window.ITLogicUrge) and under node require (module.exports), same
   pattern as logic.js. NOT YET wired into index.html - the Mind builder adds
   the <script> tag at merge time. Until then, js/screens/urge.js keeps its
   own inline copy of applyGaveIn so it works standalone. Keep that copy and
   this file in sync. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicUrge = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // logic.js is always loaded first (script tag order in index.html; direct
  // require in node/tests), so its exports are available either as the
  // window.ITLogic global or via require here.
  const L = (typeof module === 'object' && module.exports) ? require('../logic.js') : self.ITLogic;
  const { urgeDayKeyFor, defaultDay } = L;

  // Sets lapses[urge.kind] = true on the day the urge's own timestamp falls on
  // (per urgeDayKeyFor + settings.rolloverHour, matching how Night logs lapses),
  // creating that day if it does not exist yet. Copies the urge's trigger into
  // that lapse's note only when the note is currently empty; an existing note
  // is left alone. Mutates `state` in place (matching mergeInto's convention in
  // logic.js) and returns the day key that was touched, for the caller to pass
  // to IT.touch()/IT.save().
  function applyGaveIn(state, urge) {
    const key = urgeDayKeyFor(urge.at, state.settings.rolloverHour);
    if (!state.days[key]) state.days[key] = defaultDay();
    const d = state.days[key];
    const kind = urge.kind;
    d.lapses[kind] = true;
    const hasNote = d.lapseNotes[kind] && d.lapseNotes[kind].trim();
    if (!hasNote) d.lapseNotes[kind] = urge.trigger || '';
    return key;
  }

  return { applyGaveIn };
});
