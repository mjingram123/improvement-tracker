/* Improvement Tracker - pure logic for the More screen's snapshot restore
   (R1). No DOM, no IndexedDB access here - just the sort/slice/format math so
   it can be unit tested. Works as a browser script (window.ITLogicMore) and
   under node require (module.exports), matching js/logic.js's pattern. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicMore = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SNAP_PREFIX = 'snap:';

  // Filters an arbitrary list of IndexedDB keys down to snapshot keys, sorts
  // them descending (most recent day first - keys are YYYY-MM-DD after the
  // prefix, so a plain string sort is a date sort), and keeps at most `limit`.
  function recentSnapshotKeys(allKeys, limit) {
    limit = typeof limit === 'number' ? limit : 7;
    return (allKeys || [])
      .map(String)
      .filter((k) => k.startsWith(SNAP_PREFIX))
      .sort()
      .reverse()
      .slice(0, limit);
  }

  // The YYYY-MM-DD date part of a snapshot key, for passing to ITLogic.fmtLong.
  function snapshotDateKey(snapKey) {
    return String(snapKey).slice(SNAP_PREFIX.length);
  }

  return { SNAP_PREFIX, recentSnapshotKeys, snapshotDateKey };
});
