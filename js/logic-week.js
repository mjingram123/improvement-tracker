/* Improvement Tracker - Week screen pure logic, no DOM. Works as a browser script
   (window.ITLogicWeek) and under node require (module.exports). week.js only renders;
   every computation for the Week screen's cards lives here so it can be unit tested. */
(function (root, factory) {
  const ITLogic = (typeof module === 'object' && module.exports) ? require('../logic.js') : root.ITLogic;
  const mod = factory(ITLogic);
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  } else {
    root.ITLogicWeek = mod;
  }
})(typeof self !== 'undefined' ? self : this, function (ITLogic) {
  'use strict';

  const {
    LAPSES, RATINGS, addDays, weekdayOf, weekStart, urgeDayKeyFor, allWeekKeys, nightCardDone, dateOf,
  } = ITLogic;

  // ---------- word extraction (W1a) ----------
  // Deliberately small and explicit rather than a generic stopword library - "home" is
  // dropped (too common to be a signal), "alone" is kept (it is one of the more useful
  // trigger words this app hopes to surface).
  const STOPWORDS = new Set([
    'the', 'and', 'was', 'with', 'just', 'after', 'before', 'when', 'felt', 'feel', 'had',
    'for', 'from', 'that', 'this', 'then', 'than', 'but', 'not', 'out', 'about', 'been',
    'being', 'into', 'over', 'very', 'some', 'like', 'home',
  ]);
  function wordsFromText(text) {
    if (!text) return [];
    return String(text).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  }
  function topWords(words, limit) {
    const counts = new Map();
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
    return Array.from(counts, ([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, limit);
  }

  // ---------- 28-day window ----------
  // Last 28 days ending today (inclusive), rollover-aware: `todayKey` is already the
  // rollover-adjusted "today" produced by todayKeyFor, so this just walks day keys.
  function windowKeys(todayKey, days) {
    days = days || 28;
    return Array.from({ length: days }, (_, i) => addDays(todayKey, i - (days - 1)));
  }

  function windowUrges(state, todayKey, days) {
    const keys = new Set(windowKeys(todayKey, days));
    const rollover = state.settings.rolloverHour;
    return state.urges.filter((u) => keys.has(urgeDayKeyFor(u.at, rollover)));
  }

  // ---------- W1a: top trigger words per slip type ----------
  function triggerWords(state, todayKey) {
    const keys = windowKeys(todayKey, 28);
    const urges = windowUrges(state, todayKey, 28);
    const out = {};
    for (const l of LAPSES) {
      const words = [];
      for (const u of urges) if (u.kind === l.key) words.push(...wordsFromText(u.trigger));
      for (const k of keys) {
        const d = state.days[k];
        if (d && d.lapseNotes && d.lapseNotes[l.key]) words.push(...wordsFromText(d.lapseNotes[l.key]));
      }
      out[l.key] = topWords(words, 5);
    }
    return out;
  }

  // ---------- W1b: urges by time-of-day bucket ----------
  // Buckets use the urge's own local hour (not rollover-shifted): morning 4-12,
  // afternoon 12-17, evening 17-22, late 22-4 (wraps past midnight).
  function timeBucketFor(hour) {
    if (hour >= 4 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'late';
  }
  function urgeTimeBuckets(state, todayKey) {
    const buckets = { morning: 0, afternoon: 0, evening: 0, late: 0 };
    for (const u of windowUrges(state, todayKey, 28)) {
      buckets[timeBucketFor(new Date(u.at).getHours())]++;
    }
    return buckets;
  }

  // ---------- W1c: slips by weekday ----------
  // One 7-count array per slip type, index 0 = Sunday .. 6 = Saturday (matches
  // ITLogic.DAY_NAMES / Date#getDay ordering), single hue, small multiples.
  function weekdaySlips(state, todayKey) {
    const out = {};
    for (const l of LAPSES) out[l.key] = [0, 0, 0, 0, 0, 0, 0];
    for (const k of windowKeys(todayKey, 28)) {
      const d = state.days[k];
      if (!d) continue;
      const wd = weekdayOf(k);
      for (const l of LAPSES) if (d.lapses[l.key]) out[l.key][wd]++;
    }
    return out;
  }

  // ---------- W1d: four-week strip ----------
  // Four identical blocks, oldest first, aligned to the same Monday-start weeks the
  // rest of Week navigates through (so the most recent block matches whatever the
  // Slips/Routines cards show for the current week).
  function weekBlock(state, start, todayKey) {
    const keys = allWeekKeys(start).filter((k) => k <= todayKey);
    const days = keys.map((k) => state.days[k]).filter(Boolean);
    const lapses = {};
    for (const l of LAPSES) lapses[l.key] = days.filter((d) => d.lapses[l.key]).length;
    const nights = days.filter((d) => nightCardDone(d)).length;
    const dayAvgs = days.map((d) => {
      const vals = RATINGS.map((r) => d.ratings[r.key]).filter((v) => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }).filter((v) => v != null);
    const avgRating = dayAvgs.length ? dayAvgs.reduce((a, b) => a + b, 0) / dayAvgs.length : null;
    return { start, end: addDays(start, 6), logged: days.length, lapses, nights, avgRating };
  }
  function fourWeekStrip(state, todayKey) {
    const thisWeekStart = weekStart(todayKey);
    const starts = [addDays(thisWeekStart, -21), addDays(thisWeekStart, -14), addDays(thisWeekStart, -7), thisWeekStart];
    return starts.map((s) => weekBlock(state, s, todayKey));
  }

  // ---------- W1: patterns card ----------
  function slipDaysInWindow(state, todayKey) {
    let n = 0;
    for (const k of windowKeys(todayKey, 28)) {
      const d = state.days[k];
      if (d && LAPSES.some((l) => d.lapses[l.key])) n++;
    }
    return n;
  }
  function patterns(state, todayKey) {
    const urgeCount = windowUrges(state, todayKey, 28).length;
    const slipDays = slipDaysInWindow(state, todayKey);
    if (urgeCount + slipDays < 3) {
      return { ready: false, message: 'Patterns appear after a few entries.' };
    }
    return {
      ready: true,
      message: null,
      triggerWords: triggerWords(state, todayKey),
      timeBuckets: urgeTimeBuckets(state, todayKey),
      weekdaySlips: weekdaySlips(state, todayKey),
      fourWeekStrip: fourWeekStrip(state, todayKey),
    };
  }

  // ---------- W2: overall card ----------
  function daysAgoText(state, todayKey, kind, label) {
    const key = ITLogic.lastLapse(state, kind);
    if (!key) return `No ${label} logged yet.`;
    const since = Math.round((dateOf(todayKey) - dateOf(key)) / 86400000);
    const when = since === 0 ? 'today' : `${since} ${since === 1 ? 'day' : 'days'} ago`;
    return `Last ${label} logged ${when}.`;
  }
  function overallLines(state, todayKey) {
    return {
      porn: daysAgoText(state, todayKey, 'porn', 'porn slip'),
      scroll: daysAgoText(state, todayKey, 'scroll', 'scrolling slip'),
    };
  }

  // ---------- W3: insight sentences ----------
  const SLIP_LABELS = { scroll: 'scrolling', porn: 'porn' };
  function slipsInsight(cur, prev) {
    if (prev.logged) {
      for (const kind of ['scroll', 'porn']) {
        const curN = cur.lapses[kind], prevN = prev.lapses[kind];
        if (curN !== prevN) {
          const cmp = curN < prevN ? 'Fewer' : 'More';
          return `${cmp} ${SLIP_LABELS[kind]} slip days than last week (${curN} vs ${prevN}).`;
        }
      }
    }
    const total = cur.rode + cur.gave;
    if (total > 0) return `${cur.rode} of ${total} urges ridden out.`;
    return null;
  }
  const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Only worth naming a "best" day once there are at least two rated days to pick
  // among - with a single rated day it is trivially "best" and tells nothing.
  function bestRatedDayInsight(cur, start) {
    const rated = cur.dayAvg.filter((v) => v != null).length;
    if (rated < 2) return null;
    let best = -1, bestVal = null;
    cur.dayAvg.forEach((v, i) => { if (v != null && (bestVal == null || v > bestVal)) { bestVal = v; best = i; } });
    return `Best-rated day was ${FULL_DAY_NAMES[weekdayOf(addDays(start, best))]}.`;
  }
  function mindsetInsight(cur, prev, start) {
    const best = bestRatedDayInsight(cur, start);
    if (best) return best;
    if (prev.logged) {
      for (const r of RATINGS) {
        const curV = cur.ratingAvg[r.key], prevV = prev.ratingAvg[r.key];
        if (curV != null && prevV != null && Math.abs(curV - prevV) >= 1) {
          return `${r.label} moved from ${prevV.toFixed(1)} to ${curV.toFixed(1)} versus last week.`;
        }
      }
    }
    return null;
  }
  function insights(state, weekStartKey, todayKey) {
    const cur = ITLogic.weekStats(state, weekStartKey, todayKey);
    const prev = ITLogic.weekStats(state, addDays(weekStartKey, -7), todayKey);
    return { slips: slipsInsight(cur, prev), mindset: mindsetInsight(cur, prev, weekStartKey) };
  }

  return {
    STOPWORDS, wordsFromText, topWords,
    windowKeys, windowUrges,
    triggerWords, urgeTimeBuckets, timeBucketFor, weekdaySlips, fourWeekStrip, weekBlock, patterns,
    overallLines, daysAgoText,
    insights, slipsInsight, mindsetInsight, bestRatedDayInsight,
  };
});
