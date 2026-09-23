/* Improvement Tracker - Mind screen pure logic (weekly review eligibility window,
   default Prepare/Reflect half). No DOM access. Works as a browser global
   (window.ITLogicMind) and under node require (module.exports). Self-contained:
   duplicates the handful of date helpers it needs from logic.js rather than
   depending on load order, since this file is only guaranteed to load after
   logic.js, not to be able to require it under node. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicMind = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- date helpers (kept local; see file header) ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (key, n) => { const d = dateOf(key); d.setDate(d.getDate() + n); return keyOf(d); };
  const weekdayOf = (key) => dateOf(key).getDay();
  // Monday of the Mon-Sun week containing key. Matches logic.js weekStart() so a
  // review's weekStartKey lines up with the Week screen's own week keys.
  const weekStartMonday = (key) => { const wd = weekdayOf(key); return addDays(key, wd === 0 ? -6 : 1 - wd); };

  // ---------- Prepare / Reflect default half ----------
  // Same clock rule as the app's default tab (Day before 15:00 and after the
  // rollover hour, Night otherwise): Prepare before 15:00 and after the rollover
  // hour, Reflect from 15:00 through the rollover hour.
  function mindDefaultHalf(now, rolloverHour) {
    const h = now.getHours();
    return (h >= 15 || h < rolloverHour) ? 'reflect' : 'prepare';
  }

  // ---------- weekly review eligibility ----------
  // weekStartKey is the Monday (YYYY-MM-DD) of the week being reviewed, matching
  // logic.js weekStart()'s convention. That week runs Monday..Sunday, so its
  // Sunday is weekStartKey+6 and the following Tuesday is weekStartKey+8.
  // Eligible from that Sunday at 15:00 local through that Tuesday at 23:59:59.999 local.
  function isReviewWindow(now, weekStartKey) {
    if (!weekStartKey || !/^\d{4}-\d{2}-\d{2}$/.test(weekStartKey)) return false;
    const start = dateOf(addDays(weekStartKey, 6));
    start.setHours(15, 0, 0, 0);
    const end = dateOf(addDays(weekStartKey, 8));
    end.setHours(23, 59, 59, 999);
    const t = now.getTime();
    return t >= start.getTime() && t <= end.getTime();
  }

  // The weekStartKey (current or previous week's Monday) whose review window is
  // open right now, or null if neither is. todayKey is the app's own day key
  // (already rollover-adjusted by the caller via todayKeyFor).
  function eligibleReviewWeek(now, todayKey) {
    const current = weekStartMonday(todayKey);
    if (isReviewWindow(now, current)) return current;
    const previous = addDays(current, -7);
    if (isReviewWindow(now, previous)) return previous;
    return null;
  }

  return {
    mindDefaultHalf, isReviewWindow, eligibleReviewWeek, weekStartMonday,
  };
});
