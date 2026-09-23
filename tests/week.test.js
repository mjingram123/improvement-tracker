'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const W = require('../js/logic-week.js');

function makeState() {
  const s = L.defaultState();
  s.settings.rolloverHour = 4;
  return s;
}
function setDay(s, key, patch) {
  s.days[key] = { ...L.defaultDay(), ...patch };
  return s.days[key];
}
function urge(at, kind, trigger, outcome) {
  return { id: at + kind, at: new Date(at).toISOString(), kind, trigger, endsAt: 0, outcome: outcome || null };
}

// ---------- wordsFromText ----------
test('wordsFromText: lowercases, splits on non-letters, drops short words and stopwords', () => {
  assert.deepEqual(W.wordsFromText("Bored, tired... it's late at night!"), ['bored', 'tired', 'late', 'night']);
});
test('wordsFromText: "alone" is kept, "home" is dropped', () => {
  assert.deepEqual(W.wordsFromText('alone at home'), ['alone']);
});
test('wordsFromText: empty/undefined text yields no words', () => {
  assert.deepEqual(W.wordsFromText(''), []);
  assert.deepEqual(W.wordsFromText(undefined), []);
});

// ---------- topWords ----------
test('topWords: counts, sorts by count desc then alphabetically, limits', () => {
  const words = ['bored', 'tired', 'bored', 'alone', 'tired', 'bored'];
  assert.deepEqual(W.topWords(words, 2), [{ word: 'bored', count: 3 }, { word: 'tired', count: 2 }]);
});

// ---------- windowKeys ----------
test('windowKeys: 28 days ending today, inclusive, oldest first', () => {
  const keys = W.windowKeys('2026-09-22', 28);
  assert.equal(keys.length, 28);
  assert.equal(keys[0], '2026-08-26');
  assert.equal(keys[27], '2026-09-22');
});

// ---------- triggerWords ----------
test('triggerWords: combines urge triggers (by kind) and lapse notes (by key), top 5 with counts', () => {
  const s = makeState();
  const today = '2026-09-22';
  s.urges = [
    urge('2026-09-20T10:00:00', 'scroll', 'bored bored'),
    urge('2026-09-21T10:00:00', 'scroll', 'tired'),
    urge('2026-09-21T10:00:00', 'porn', 'stressed'),
  ];
  setDay(s, '2026-09-19', { lapses: { scroll: true, porn: false, nag: false }, lapseNotes: { scroll: 'bored again', porn: '', nag: '' } });
  setDay(s, '2026-09-18', { lapses: { scroll: false, porn: false, nag: true }, lapseNotes: { scroll: '', porn: '', nag: 'dishes piling up' } });
  const tw = W.triggerWords(s, today);
  assert.deepEqual(tw.scroll, [{ word: 'bored', count: 3 }, { word: 'again', count: 1 }, { word: 'tired', count: 1 }]);
  assert.deepEqual(tw.porn, [{ word: 'stressed', count: 1 }]);
  assert.deepEqual(tw.nag, [{ word: 'dishes', count: 1 }, { word: 'piling', count: 1 }]);
});
test('triggerWords: outside the 28-day window is excluded', () => {
  const s = makeState();
  const today = '2026-09-22';
  s.urges = [urge('2026-08-01T10:00:00', 'scroll', 'oldtrigger')];
  const tw = W.triggerWords(s, today);
  assert.deepEqual(tw.scroll, []);
});

// ---------- urge time buckets ----------
test('urgeTimeBuckets: buckets by local hour, including the late wrap past midnight', () => {
  const s = makeState();
  const today = '2026-09-22';
  s.urges = [
    urge('2026-09-20T04:00:00', 'scroll', ''), // morning boundary
    urge('2026-09-20T11:59:00', 'scroll', ''), // morning
    urge('2026-09-20T12:00:00', 'scroll', ''), // afternoon boundary
    urge('2026-09-20T16:59:00', 'scroll', ''), // afternoon
    urge('2026-09-20T17:00:00', 'scroll', ''), // evening boundary
    urge('2026-09-20T21:59:00', 'scroll', ''), // evening
    urge('2026-09-20T22:00:00', 'scroll', ''), // late boundary
    urge('2026-09-20T02:00:00', 'scroll', ''), // late (past midnight)
  ];
  assert.deepEqual(W.urgeTimeBuckets(s, today), { morning: 2, afternoon: 2, evening: 2, late: 2 });
});

// ---------- weekdaySlips ----------
test('weekdaySlips: counts lapse days per weekday per slip type within the window', () => {
  const s = makeState();
  const today = '2026-09-22'; // Tuesday
  setDay(s, '2026-09-20', { lapses: { scroll: true, porn: false, nag: false } }); // Sunday
  setDay(s, '2026-09-13', { lapses: { scroll: true, porn: false, nag: false } }); // Sunday (prior week)
  setDay(s, '2026-09-21', { lapses: { scroll: false, porn: true, nag: false } }); // Monday
  const ws = W.weekdaySlips(s, today);
  assert.equal(ws.scroll[0], 2); // Sunday index 0
  assert.equal(ws.porn[1], 1); // Monday index 1
  assert.equal(ws.nag.reduce((a, b) => a + b, 0), 0);
});

// ---------- fourWeekStrip ----------
test('fourWeekStrip: four Monday-aligned blocks oldest first, with lapses/nights/avgRating', () => {
  const s = makeState();
  const today = '2026-09-22'; // Tuesday, this week starts Monday 2026-09-21
  setDay(s, '2026-09-21', { lapses: { scroll: true, porn: false, nag: false }, ratings: { curiosity: 4, story: 4, pauses: 4, present: 4 } });
  setDay(s, '2026-08-31', { lapses: { scroll: false, porn: true, nag: false } }); // 3 weeks back Monday
  const strip = W.fourWeekStrip(s, today);
  assert.equal(strip.length, 4);
  assert.equal(strip[3].start, '2026-09-21');
  assert.equal(strip[3].lapses.scroll, 1);
  assert.equal(strip[3].avgRating, 4);
  assert.equal(strip[3].nights, 1); // the rated day also counts via nightCardDone
  assert.equal(strip[0].start, '2026-08-31');
  assert.equal(strip[0].lapses.porn, 1);
});

// ---------- patterns ----------
test('patterns: under 3 total (urges + slip days) shows the not-ready message', () => {
  const s = makeState();
  const today = '2026-09-22';
  setDay(s, '2026-09-20', { lapses: { scroll: true, porn: false, nag: false } });
  s.urges = [urge('2026-09-21T10:00:00', 'scroll', 'bored')];
  const p = W.patterns(s, today);
  assert.equal(p.ready, false);
  assert.equal(p.message, 'Patterns appear after a few entries.');
});
test('patterns: at or above 3 total returns full data', () => {
  const s = makeState();
  const today = '2026-09-22';
  setDay(s, '2026-09-20', { lapses: { scroll: true, porn: false, nag: false } });
  setDay(s, '2026-09-19', { lapses: { scroll: true, porn: false, nag: false } });
  s.urges = [urge('2026-09-21T10:00:00', 'scroll', 'bored')];
  const p = W.patterns(s, today);
  assert.equal(p.ready, true);
  assert.ok(p.triggerWords && p.timeBuckets && p.weekdaySlips && p.fourWeekStrip);
});

// ---------- overallLines ----------
test('overallLines: no slips ever logged', () => {
  const s = makeState();
  const lines = W.overallLines(s, '2026-09-22');
  assert.equal(lines.porn, 'No porn slip logged yet.');
  assert.equal(lines.scroll, 'No scrolling slip logged yet.');
});
test('overallLines: today, one day ago, and several days ago phrasing', () => {
  const s = makeState();
  setDay(s, '2026-09-22', { lapses: { scroll: false, porn: true, nag: false } });
  setDay(s, '2026-09-21', { lapses: { scroll: true, porn: false, nag: false } });
  let lines = W.overallLines(s, '2026-09-22');
  assert.equal(lines.porn, 'Last porn slip logged today.');
  assert.equal(lines.scroll, 'Last scrolling slip logged 1 day ago.');
  setDay(s, '2026-09-15', { lapses: { scroll: true, porn: false, nag: false } });
  s.days['2026-09-21'] = { ...L.defaultDay(), lapses: { scroll: false, porn: false, nag: false } };
  lines = W.overallLines(s, '2026-09-22');
  assert.equal(lines.scroll, 'Last scrolling slip logged 7 days ago.');
});

// ---------- insights: slips ----------
test('insights.slips: fewer scrolling days than last week, both numbers shown', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20'; // full week
  for (const k of L.allWeekKeys(start)) setDay(s, k, {});
  s.days['2026-09-14'].lapses.scroll = true; // 1 this week
  for (const k of L.allWeekKeys('2026-09-07')) setDay(s, k, {});
  s.days['2026-09-07'].lapses.scroll = true;
  s.days['2026-09-08'].lapses.scroll = true;
  s.days['2026-09-09'].lapses.scroll = true; // 3 last week
  const r = W.insights(s, start, today);
  assert.equal(r.slips, 'Fewer scrolling slip days than last week (1 vs 3).');
});
test('insights.slips: more porn days than last week when scroll is unchanged', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  for (const k of L.allWeekKeys(start)) setDay(s, k, {});
  s.days['2026-09-14'].lapses.porn = true;
  s.days['2026-09-15'].lapses.porn = true;
  for (const k of L.allWeekKeys('2026-09-07')) setDay(s, k, {});
  const r = W.insights(s, start, today);
  assert.equal(r.slips, 'More porn slip days than last week (2 vs 0).');
});
test('insights.slips: no comparison when last week has no logged days, falls back to urges ridden out', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-14', {});
  s.urges = [
    urge('2026-09-14T10:00:00', 'scroll', '', 'rode'),
    urge('2026-09-15T10:00:00', 'scroll', '', 'rode'),
    urge('2026-09-16T10:00:00', 'scroll', '', 'gave'),
  ];
  const r = W.insights(s, start, today);
  assert.equal(r.slips, '2 of 3 urges ridden out.');
});
test('insights.slips: null when nothing to say', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-14', {});
  const r = W.insights(s, start, today);
  assert.equal(r.slips, null);
});

// ---------- insights: mindset ----------
test('insights.mindset: best-rated day wins over a dimension move', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-14', { ratings: { curiosity: 5, story: 5, pauses: 5, present: 5 } }); // Monday
  setDay(s, '2026-09-16', { ratings: { curiosity: 2, story: 2, pauses: 2, present: 2 } }); // Wednesday
  const r = W.insights(s, start, today);
  assert.equal(r.mindset, 'Best-rated day was Monday.');
});
test('insights.mindset: dimension moved by >= 1.0 versus last week when only one day is rated this week', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-07', { ratings: { curiosity: 4, story: 0, pauses: 0, present: 0 } });
  setDay(s, '2026-09-14', { ratings: { curiosity: 2.5, story: 0, pauses: 0, present: 0 } });
  const r = W.insights(s, start, today);
  assert.equal(r.mindset, 'Curious in conversation moved from 4.0 to 2.5 versus last week.');
});
test('insights.mindset: null when no ratings and no qualifying move', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-14', {});
  const r = W.insights(s, start, today);
  assert.equal(r.mindset, null);
});
test('insights.mindset: a move under 1.0 does not qualify', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-20';
  setDay(s, '2026-09-14', { ratings: { curiosity: 3, story: 0, pauses: 0, present: 0 } });
  setDay(s, '2026-09-07', { ratings: { curiosity: 3.5, story: 0, pauses: 0, present: 0 } });
  const r = W.insights(s, start, today);
  assert.equal(r.mindset, null);
});

// ---------- morningDone ----------
test('morningDone: true only when d.morning has all four checks', () => {
  assert.equal(W.morningDone({ morning: { up: true, pushups: true, stretched: true, shower: true, supplements: true } }), true);
  assert.equal(W.morningDone({ morning: { up: true, pushups: true, stretched: true, shower: false, supplements: false } }), false);
  assert.equal(W.morningDone({ stretched: true }), false); // legacy shape, no d.morning
  assert.equal(W.morningDone({}), false);
});

// ---------- routines ----------
test('routines: n of m counts for morning, wind-down, night check-ins, gym, dinner', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-16'; // Mon-Wed, n = 3
  s.settings.dinnerDays = [3]; // Wednesday only, matches weekdayOf('2026-09-16')
  setDay(s, '2026-09-14', { morning: { up: true, pushups: true, stretched: true, shower: true, supplements: true }, windDown: { done: true, endsAt: null }, gym: true });
  setDay(s, '2026-09-15', { stretched: true }); // legacy-only, should not count as morning done
  setDay(s, '2026-09-16', { note: 'wrote something', dinnerOut: true });
  const r = W.routines(s, start, today);
  assert.deepEqual(r.morning, { n: 1, m: 3 });
  assert.deepEqual(r.windDown, { n: 1, m: 3 });
  assert.deepEqual(r.nightCheckins, { n: 2, m: 3 }); // the wind-down day and the note-only day both count via nightCardDone
  assert.deepEqual(r.gym, { k: 1 });
  assert.deepEqual(r.dinner, { n: 1, m: 1 });
});

// ---------- weeklyReview ----------
test('weeklyReview: null when missing or all-empty, populated when any field has text', () => {
  const s = makeState();
  assert.equal(W.weeklyReview(s, '2026-09-14'), null);
  s.reviews = { '2026-09-14': { worked: '', inTheWay: '', next: '', at: 1 } };
  assert.equal(W.weeklyReview(s, '2026-09-14'), null);
  s.reviews['2026-09-14'].next = 'sleep earlier';
  assert.deepEqual(W.weeklyReview(s, '2026-09-14'), { worked: '', inTheWay: '', next: 'sleep earlier' });
});

// ---------- journalEntries ----------
test('journalEntries: includes note, mind-moment-only days, and slip notes with help, newest first', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-16';
  setDay(s, '2026-09-14', { note: 'first day' });
  setDay(s, '2026-09-15', { mindMoment: 'noticed I paused before replying' });
  setDay(s, '2026-09-16', {
    lapses: { scroll: true, porn: false, nag: false },
    lapseNotes: { scroll: 'waiting for the kettle', porn: '', nag: '' },
    lapseHelp: { scroll: 'put the phone in another room', porn: '', nag: '' },
  });
  const entries = W.journalEntries(s, start, today);
  assert.equal(entries.length, 3);
  assert.equal(entries[0].key, '2026-09-16');
  assert.equal(entries[0].lapses[0].help, 'put the phone in another room');
  assert.equal(entries[1].mindMoment, 'noticed I paused before replying');
  assert.equal(entries[2].note, 'first day');
});
test('journalEntries: a day with a lapse flag but no note text is not included for that lapse', () => {
  const s = makeState();
  const start = '2026-09-14', today = '2026-09-14';
  setDay(s, '2026-09-14', { lapses: { scroll: true, porn: false, nag: false }, lapseNotes: { scroll: '', porn: '', nag: '' } });
  assert.deepEqual(W.journalEntries(s, start, today), []);
});
