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

  const DEFAULT_TRIGGERS = ['bored', 'tired', 'alone', 'stressed', 'late', 'drinking'];
  const TRIGGER_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

  // Most-used trigger words across all urges logged in the last 28 days
  // (relative to `now`, an epoch ms timestamp), lowercased, split on commas
  // and whitespace, 3 letters minimum, most frequent first (ties broken
  // alphabetically for a stable order). Padded with DEFAULT_TRIGGERS (in
  // their listed order, skipping anything already present) up to 6 entries.
  function topTriggers(urges, now) {
    const since = now - TRIGGER_WINDOW_MS;
    const counts = new Map();
    for (const u of (urges || [])) {
      const at = new Date(u.at).getTime();
      if (!(at >= since && at <= now)) continue;
      const words = String(u.trigger || '').toLowerCase().split(/[,\s]+/);
      for (const w of words) {
        const word = w.trim();
        if (word.length < 3) continue;
        counts.set(word, (counts.get(word) || 0) + 1);
      }
    }
    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([w]) => w);
    const result = [];
    for (const w of ranked) {
      if (result.length >= 6) break;
      result.push(w);
    }
    for (const w of DEFAULT_TRIGGERS) {
      if (result.length >= 6) break;
      if (!result.includes(w)) result.push(w);
    }
    return result.slice(0, 6);
  }

  return { applyGaveIn, topTriggers, DEFAULT_TRIGGERS };
});
