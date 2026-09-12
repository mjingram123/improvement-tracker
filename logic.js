/* Improvement Tracker - pure logic, no DOM. Works as a browser script (window.ITLogic)
   and under node require (module.exports). Behavior must match app.js exactly. */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogic = mod;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- constants ----------
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const LAPSES = [
    { key: 'scroll', label: 'Scrolled past limits' },
    { key: 'porn', label: 'Porn' },
    { key: 'nag', label: 'Nagged someone', hint: 'cars, dishes, whatever' },
  ];
  const RATINGS = [
    { key: 'curiosity', label: 'Curious in conversation' },
    { key: 'story', label: 'Stayed in my story, detached from outcomes' },
    { key: 'pauses', label: 'Pushed through pauses' },
    { key: 'present', label: 'Committed to where I was' },
  ];
  const HANGOVER = [
    { key: 'lmnt', label: 'LMNT' },
    { key: 'food', label: 'Food' },
    { key: 'ibuprofen', label: 'Ibuprofen' },
    { key: 'walk', label: 'Walk' },
  ];

  // ---------- date helpers ----------
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (key, n) => { const d = dateOf(key); d.setDate(d.getDate() + n); return keyOf(d); };
  const weekdayOf = (key) => dateOf(key).getDay();
  const weekStart = (key) => { // Monday
    const wd = weekdayOf(key);
    return addDays(key, wd === 0 ? -6 : 1 - wd);
  };
  const fmtLong = (key) => { const d = dateOf(key); return `${DAY_NAMES[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const fmtShort = (key) => { const d = dateOf(key); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };

  function todayKeyFor(now, rolloverHour) {
    const d = new Date(now.getTime());
    if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
    return keyOf(d);
  }
  function urgeDayKeyFor(isoAt, rolloverHour) {
    const d = new Date(isoAt);
    if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
    return keyOf(d);
  }
  function allWeekKeys(start) { return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }

  // ---------- state shape ----------
  function defaultState() {
    return {
      version: 1,
      days: {},
      urges: [],
      settings: {
        rolloverHour: 4, hangoverDays: [5, 6, 0], waterPoloDays: [2, 0], dinnerDays: [0], lastExport: null,
        onboarded: false, onboarding: { home: false, shortcuts: false, backup: false },
        useShortcutTimers: false,
      },
      meta: { updatedAt: 0, createdAt: Date.now() },
    };
  }
  function defaultDay() {
    return {
      u: 0,
      stretched: false, hungover: false, hangover: { lmnt: false, food: false, ibuprofen: false, walk: false },
      gym: false, waterPolo: false, dinnerOut: false,
      lapses: { scroll: false, porn: false, nag: false }, lapseNotes: { scroll: '', porn: '', nag: '' },
      ratings: { curiosity: 0, story: 0, pauses: 0, present: 0 },
      note: '', windDown: { endsAt: null, done: false },
    };
  }
  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = { ...d, ...s };
    out.settings = { ...d.settings, ...(s.settings || {}) };
    out.settings.onboarding = { ...d.settings.onboarding, ...((s.settings && s.settings.onboarding) || {}) };
    out.meta = { ...d.meta, ...(s.meta || {}) };
    out.days = {};
    for (const [k, v] of Object.entries(s.days || {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
      const dd = defaultDay();
      out.days[k] = {
        ...dd, ...v,
        hangover: { ...dd.hangover, ...(v.hangover || {}) },
        lapses: { ...dd.lapses, ...(v.lapses || {}) },
        lapseNotes: { ...dd.lapseNotes, ...(v.lapseNotes || {}) },
        ratings: { ...dd.ratings, ...(v.ratings || {}) },
        windDown: { ...dd.windDown, ...(v.windDown || {}) },
      };
    }
    out.urges = Array.isArray(s.urges) ? s.urges.filter((u) => u && u.id && u.at) : [];
    return out;
  }

  // ---------- week stats ----------
  function weekStats(state, start, todayKey) {
    const keys = allWeekKeys(start).filter((k) => k <= todayKey);
    const days = keys.map((k) => state.days[k]).filter(Boolean);
    const n = keys.length;
    const count = (fn) => keys.filter((k) => state.days[k] && fn(state.days[k])).length;
    const urges = state.urges.filter((u) => {
      const k = urgeDayKeyFor(u.at, state.settings.rolloverHour);
      return k >= start && k <= addDays(start, 6);
    });
    const ratingAvg = (k) => { const vals = days.map((d) => d.ratings[k]).filter((v) => v > 0); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null; };
    const dayAvg = allWeekKeys(start).map((k) => {
      const d = state.days[k]; if (!d) return null;
      const vals = RATINGS.map((r) => d.ratings[r.key]).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    return {
      n, keys, logged: days.length,
      lapses: Object.fromEntries(LAPSES.map((l) => [l.key, count((d) => d.lapses[l.key])])),
      stretched: count((d) => d.stretched), windDown: count((d) => d.windDown.done), gym: count((d) => d.gym),
      waterPolo: count((d) => d.waterPolo), waterPoloPossible: keys.filter((k) => state.settings.waterPoloDays.includes(weekdayOf(k))).length,
      dinner: count((d) => d.dinnerOut), dinnerPossible: keys.filter((k) => state.settings.dinnerDays.includes(weekdayOf(k))).length,
      rode: urges.filter((u) => u.outcome === 'rode').length, gave: urges.filter((u) => u.outcome === 'gave').length,
      ratingAvg: Object.fromEntries(RATINGS.map((r) => [r.key, ratingAvg(r.key)])), dayAvg,
    };
  }

  function lastLapse(state, kind) {
    const keys = Object.keys(state.days).filter((k) => state.days[k].lapses[kind]).sort();
    return keys.length ? keys[keys.length - 1] : null;
  }

  // ---------- merge / import ----------
  function parseSafe(json) {
    if (!json) return null;
    try { const v = JSON.parse(json); return v && typeof v === 'object' ? v : null; } catch { return null; }
  }
  function mergeInto(state, rawText) {
    const parsed = parseSafe(rawText);
    const inc = parsed && parsed.state ? parsed.state : parsed;
    if (!inc || (!inc.days && !inc.urges)) throw new Error('not a tracker export');
    const incoming = normalize(inc);
    let daysMerged = 0, urgesMerged = 0;
    for (const [k, v] of Object.entries(incoming.days)) {
      const cur = state.days[k];
      if (!cur || (v.u || 0) > (cur.u || 0)) { state.days[k] = v; daysMerged++; }
    }
    const ids = new Set(state.urges.map((u) => u.id));
    for (const u of incoming.urges) if (!ids.has(u.id)) { state.urges.push(u); urgesMerged++; }
    state.urges.sort((a, b) => new Date(a.at) - new Date(b.at));
    if (!state.settings.lastExport && incoming.settings.lastExport) state.settings.lastExport = incoming.settings.lastExport;
    return { daysMerged, urgesMerged };
  }

  // ---------- backup nag ----------
  function backupDueDays(state, now) {
    const daysLogged = Object.keys(state.days).length;
    if (daysLogged < 3) return 0;
    const last = state.settings.lastExport || state.meta.createdAt || now;
    const days = Math.floor((now - last) / 86400000);
    return days >= 7 ? days : 0;
  }

  // ---------- tab bar ----------
  // Night after 15:00, or before the day's rollover hour (late-night use); Day otherwise.
  function defaultTab(now, rolloverHour) {
    const h = now.getHours();
    return (h >= 15 || h < rolloverHour) ? 'night' : 'day';
  }

  // ---------- night flow ----------
  // The existing partial-done rule: the night card counts as finished with any partial input.
  function nightCardDone(d) {
    return !!(d.windDown.done || RATINGS.some((r) => d.ratings[r.key] > 0) || (d.note && d.note.trim().length > 0));
  }
  // Step completeness for the 4-step flow. `visited` is the sessionStorage-tracked
  // array of 4 booleans (step 1, Slips, has no data-only signal: turning zero slips on
  // is a valid, complete answer, so it relies on the visited flag instead).
  function nightStepDone(d, visited, i) {
    switch (i) {
      case 0: return !!(d.windDown && d.windDown.done);
      case 1: return !!(visited && visited[1]);
      case 2: return RATINGS.some((r) => d.ratings[r.key] > 0);
      case 3: return !!(d.note && d.note.trim().length > 0);
      default: return false;
    }
  }
  function firstIncompleteNightStep(d, visited) {
    for (let i = 0; i < 4; i++) if (!nightStepDone(d, visited, i)) return i;
    return 0;
  }

  // ---------- schedule / more ----------
  // 12-hour label for an hour-of-day integer, e.g. 0 -> "12 am", 13 -> "1 pm".
  function fmtHour12(h) {
    const ap = h < 12 ? 'am' : 'pm';
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${hh} ${ap}`;
  }
  // The "Day ends at" segmented control shows 12/2/4/6 am by default; if the saved
  // rolloverHour is some other value, that value is kept in the list (sorted), selected.
  function dayEndOptions(rolloverHour) {
    const base = [0, 2, 4, 6];
    const hours = base.includes(rolloverHour) ? base.slice() : base.concat([rolloverHour]).sort((a, b) => a - b);
    return hours.map((h) => ({ hour: h, label: fmtHour12(h) }));
  }
  // ---------- urges ----------
  function recentUrges(state, n) {
    return state.urges.slice().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, n);
  }
  function fmtTime(iso) {
    const d = new Date(iso);
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12; if (h === 0) h = 12;
    return `${h}:${m}${ap}`;
  }

  return {
    LAPSES, RATINGS, HANGOVER, DAY_NAMES, MONTHS,
    pad, keyOf, dateOf, addDays, weekdayOf, weekStart, fmtLong, fmtShort, mmss,
    todayKeyFor, urgeDayKeyFor,
    defaultState, defaultDay, normalize,
    weekStats, lastLapse, mergeInto, backupDueDays,
    defaultTab, nightCardDone, nightStepDone, firstIncompleteNightStep,
    recentUrges, fmtTime, fmtHour12, dayEndOptions,
  };
});
