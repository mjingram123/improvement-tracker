/* Improvement Tracker - Night screen pure logic (wave 1 N1). Works as a browser
   script (window.ITLogicNight) and under node require (module.exports). Additive
   day-object fields (d.night) are not yet part of defaultDay()/normalize() in
   logic.js, so every reader here defaults them inline - per CONTRACTS.md, screens
   read additive fields with defaults rather than requiring a normalize change. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicNight = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NIGHT_CHECK_DEFAULT = { washed: false, tape: false };

  // d.night = { washed, tape }, read with defaults (N1).
  function nightChecks(d) {
    const n = d && d.night;
    return { washed: !!(n && n.washed), tape: !!(n && n.tape) };
  }
  // Short "Rated: curiosity 4 · story 3 ..." summary for the Night summary's Mind
  // row, or null when nothing has been rated yet (caller shows "Not rated yet").
  function ratingsSummaryText(d, RATINGS) {
    const on = RATINGS.filter((r) => d.ratings[r.key] > 0);
    if (!on.length) return null;
    return 'Rated: ' + on.map((r) => `${r.key} ${d.ratings[r.key]}`).join(' · ');
  }

  return { NIGHT_CHECK_DEFAULT, nightChecks, ratingsSummaryText };
});
