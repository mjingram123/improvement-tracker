/* Improvement Tracker - Day screen pure logic, no DOM. Works as a browser script
   (window.ITLogicDay) and under node require (module.exports). Mirrors the inline
   helpers kept in js/screens/day.js so day.js works standalone even before
   index.html/sw.js load this file (see BACKLOG D1/CONTRACTS.md). Keep the two in
   sync by hand: this file has no dependency on day.js and vice versa. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicDay = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MORNING_ITEMS = [
    { key: 'up', label: 'Up on time' },
    { key: 'pushups', label: '30 push ups' },
    { key: 'stretched', label: 'Stretched' },
    { key: 'shower', label: 'Shower and shave' },
  ];

  function isPlainObject(v) { return typeof v === 'object' && v !== null && !Array.isArray(v); }

  // Default morning object. `stretched` seeds from the legacy d.stretched field so
  // a day recorded before D1 shipped still shows its stretched state once read.
  function defaultMorning(stretched) {
    return { up: false, pushups: false, stretched: !!stretched, shower: false };
  }

  // Read d.morning with defaults; pure, does not mutate d.
  function getMorning(d) {
    const base = defaultMorning(d && d.stretched);
    const m = d && isPlainObject(d.morning) ? d.morning : {};
    return { ...base, ...m };
  }

  function morningAllChecked(morning) {
    return MORNING_ITEMS.every((item) => !!morning[item.key]);
  }

  // hangoverActive: the hangover row is shown today (weekday match) AND the
  // Hungover? toggle is on. hangoverKitComplete: all four kit chips are on.
  function morningCardDone(morning, hangoverActive, hangoverKitComplete) {
    return morningAllChecked(morning) && (!hangoverActive || !!hangoverKitComplete);
  }

  return { MORNING_ITEMS, defaultMorning, getMorning, morningAllChecked, morningCardDone };
});
