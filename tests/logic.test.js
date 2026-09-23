'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

// ---------- todayKeyFor ----------
test('todayKeyFor: 1am on 2026-09-12 rolls back to 09-11 with rollover 4', () => {
  const now = new Date(2026, 8, 12, 1, 0, 0);
  assert.equal(L.todayKeyFor(now, 4), '2026-09-11');
});
test('todayKeyFor: 1am on 2026-09-12 stays 09-12 with rollover 0', () => {
  const now = new Date(2026, 8, 12, 1, 0, 0);
  assert.equal(L.todayKeyFor(now, 0), '2026-09-12');
});
test('todayKeyFor: hour at or after rollover keeps the same day', () => {
  const now = new Date(2026, 8, 12, 4, 0, 0);
  assert.equal(L.todayKeyFor(now, 4), '2026-09-12');
});

// ---------- weekStart ----------
test('weekStart: every day of a week resolves to that week\'s Monday, including Sunday', () => {
  const monday = '2026-09-07';
  const keys = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'];
  for (const k of keys) assert.equal(L.weekStart(k), monday, `weekStart(${k})`);
});

// ---------- urgeDayKeyFor ----------
test('urgeDayKeyFor: rolls an early-morning urge back to the prior day', () => {
  const iso = new Date(2026, 8, 12, 2, 30, 0).toISOString();
  // urgeDayKeyFor reads local hours from the Date it constructs from the ISO string,
  // so build the iso from a local Date the same way app code does.
  const localIso = new Date(2026, 8, 12, 2, 30, 0);
  assert.equal(L.urgeDayKeyFor(localIso, 4), '2026-09-11');
});
test('urgeDayKeyFor: after rollover hour stays on the same day', () => {
  const localIso = new Date(2026, 8, 12, 9, 0, 0);
  assert.equal(L.urgeDayKeyFor(localIso, 4), '2026-09-12');
});

// ---------- weekStats ----------
function makeState() {
  const s = L.defaultState();
  s.settings.rolloverHour = 4;
  return s;
}
test('weekStats: counts and averages handle missing days and zero ratings', () => {
  const s = makeState();
  const start = '2026-09-07'; // Monday
  // Monday: full data, one rating is 0 (should be excluded from average)
  s.days['2026-09-07'] = { ...L.defaultDay(), lapses: { scroll: true, porn: false, nag: false }, ratings: { curiosity: 4, story: 0, pauses: 3, present: 5 } };
  // Tuesday: a lapse, no ratings at all (all zero -> dayAvg null)
  s.days['2026-09-08'] = { ...L.defaultDay(), lapses: { scroll: false, porn: true, nag: false } };
  // Wednesday: missing entirely (no entry in state.days)
  // "today" is Wednesday, so the week is truncated to Mon-Wed (n = 3)
  const todayKey = '2026-09-09';
  const stats = L.weekStats(s, start, todayKey);

  assert.equal(stats.n, 3);
  assert.equal(stats.keys.length, 3);
  assert.equal(stats.lapses.scroll, 1);
  assert.equal(stats.lapses.porn, 1);
  assert.equal(stats.lapses.nag, 0);
  // curiosity average across the one day with a nonzero curiosity rating
  assert.equal(stats.ratingAvg.curiosity, 4);
  // story rating was 0 on the only day that has data -> excluded -> null
  assert.equal(stats.ratingAvg.story, null);
  // dayAvg is computed over the full Mon-Sun week (7 entries), with nulls for missing/zero days
  assert.equal(stats.dayAvg.length, 7);
  assert.equal(stats.dayAvg[0], (4 + 3 + 5) / 3); // Monday: zero rating excluded from that day's own average
  assert.equal(stats.dayAvg[1], null); // Tuesday: all ratings zero
  assert.equal(stats.dayAvg[2], null); // Wednesday: no day object at all
});

// ---------- normalize ----------
test('normalize: null input returns a valid default state', () => {
  const out = L.normalize(null);
  assert.deepEqual(out.days, {});
  assert.deepEqual(out.urges, []);
  assert.equal(out.settings.rolloverHour, 4);
  assert.equal(out.settings.onboarded, false);
  assert.deepEqual(out.settings.onboarding, { home: false, shortcuts: false, backup: false });
});
test('normalize: junk input (wrong type) returns a valid default state', () => {
  for (const junk of [undefined, 42, 'hello', [], true]) {
    const out = L.normalize(junk);
    assert.deepEqual(out.days, {});
    assert.equal(out.version, 1);
  }
});
test('normalize: partial day objects get missing fields filled in', () => {
  const out = L.normalize({ days: { '2026-09-07': { stretched: true, ratings: { curiosity: 5 } } } });
  const d = out.days['2026-09-07'];
  assert.equal(d.stretched, true);
  assert.equal(d.ratings.curiosity, 5);
  assert.equal(d.ratings.story, 0); // filled from defaultDay
  assert.deepEqual(d.hangover, { lmnt: false, food: false, ibuprofen: false, walk: false });
  assert.deepEqual(d.lapses, { scroll: false, porn: false, nag: false });
});
test('normalize: a wrong-typed (string) nested day field falls back to defaults instead of index-spreading (exact repro from analysis)', () => {
  const out = L.normalize({ days: { '2026-09-07': { hangover: 'oops' } } });
  const d = out.days['2026-09-07'];
  assert.deepEqual(d.hangover, { lmnt: false, food: false, ibuprofen: false, walk: false });
});
test('normalize: a wrong-typed (array) nested day field falls back to defaults', () => {
  const out = L.normalize({ days: { '2026-09-07': { lapses: ['a', 'b'], ratings: [1, 2, 3], windDown: [] } } });
  const d = out.days['2026-09-07'];
  assert.deepEqual(d.lapses, { scroll: false, porn: false, nag: false });
  assert.deepEqual(d.ratings, { curiosity: 0, story: 0, pauses: 0, present: 0 });
  assert.deepEqual(d.windDown, { endsAt: null, done: false });
});
test('normalize: a wrong-typed (null/number) nested day field falls back to defaults', () => {
  const out = L.normalize({ days: { '2026-09-07': { hangover: null, lapseNotes: 42 } } });
  const d = out.days['2026-09-07'];
  assert.deepEqual(d.hangover, { lmnt: false, food: false, ibuprofen: false, walk: false });
  assert.deepEqual(d.lapseNotes, { scroll: '', porn: '', nag: '' });
});
test('normalize: a day value that is itself an array is dropped like any other bad day', () => {
  const out = L.normalize({ days: { '2026-09-07': ['not', 'a', 'day'] } });
  assert.deepEqual(Object.keys(out.days), []);
});
test('normalize: wrong-typed settings.onboarding/intentions fall back to defaults', () => {
  const out = L.normalize({ settings: { onboarding: 'oops', intentions: ['a'] } });
  assert.deepEqual(out.settings.onboarding, { home: false, shortcuts: false, backup: false });
  assert.deepEqual(out.settings.intentions, { why: '', notes: { curiosity: '', story: '', pauses: '', present: '' } });
});
test('normalize: an array as the whole input returns a valid default state (not just an empty array)', () => {
  const out = L.normalize(['oops', 'array']);
  assert.deepEqual(out.days, {});
  assert.equal(out.version, 1);
});
test('normalize: bad day keys are dropped', () => {
  const out = L.normalize({ days: { 'not-a-date': { stretched: true }, '2026/09/07': {}, '2026-9-7': {}, '2026-09-07': { stretched: true } } });
  assert.deepEqual(Object.keys(out.days), ['2026-09-07']);
});
test('normalize: junk urges (missing id/at) are filtered out', () => {
  const out = L.normalize({ urges: [{ id: 'a', at: '2026-09-07T10:00:00.000Z' }, { at: '2026-09-07T10:00:00.000Z' }, { id: 'b' }, null, 'junk'] });
  assert.equal(out.urges.length, 1);
  assert.equal(out.urges[0].id, 'a');
});
test('normalize: a string urge.endsAt (old format) is converted to epoch ms', () => {
  const iso = '2026-09-07T10:10:00.000Z';
  const out = L.normalize({ urges: [{ id: 'a', at: '2026-09-07T10:00:00.000Z', endsAt: iso }] });
  assert.equal(typeof out.urges[0].endsAt, 'number');
  assert.equal(out.urges[0].endsAt, new Date(iso).getTime());
});
test('normalize: a numeric urge.endsAt (current format) passes through unchanged', () => {
  const ms = 1234567890;
  const out = L.normalize({ urges: [{ id: 'a', at: '2026-09-07T10:00:00.000Z', endsAt: ms }] });
  assert.equal(out.urges[0].endsAt, ms);
});
test('normalize: urge.at and resolvedAt stay ISO strings, only endsAt is converted', () => {
  const out = L.normalize({ urges: [{ id: 'a', at: '2026-09-07T10:00:00.000Z', endsAt: '2026-09-07T10:10:00.000Z', resolvedAt: '2026-09-07T10:11:00.000Z' }] });
  assert.equal(out.urges[0].at, '2026-09-07T10:00:00.000Z');
  assert.equal(out.urges[0].resolvedAt, '2026-09-07T10:11:00.000Z');
});
test('normalize: partial settings.onboarding merges with defaults', () => {
  const out = L.normalize({ settings: { onboarding: { home: true } } });
  assert.deepEqual(out.settings.onboarding, { home: true, shortcuts: false, backup: false });
});
test('normalize: old saves with no settings.intentions get the default shape', () => {
  const out = L.normalize({ settings: { rolloverHour: 4 } });
  assert.deepEqual(out.settings.intentions, { why: '', notes: { curiosity: '', story: '', pauses: '', present: '' } });
});
test('normalize: null/undefined input still gets the default intentions shape', () => {
  const out = L.normalize(null);
  assert.deepEqual(out.settings.intentions, { why: '', notes: { curiosity: '', story: '', pauses: '', present: '' } });
});
test('normalize: partial settings.intentions deep-merges why and notes with defaults', () => {
  const out = L.normalize({ settings: { intentions: { why: 'stay present', notes: { curiosity: 'ask more' } } } });
  assert.deepEqual(out.settings.intentions, { why: 'stay present', notes: { curiosity: 'ask more', story: '', pauses: '', present: '' } });
});
test('normalize: full settings.intentions round-trips unchanged', () => {
  const intentions = { why: 'why text', notes: { curiosity: 'a', story: 'b', pauses: 'c', present: 'd' } };
  const out = L.normalize({ settings: { intentions } });
  assert.deepEqual(out.settings.intentions, intentions);
});

// ---------- mergeInto ----------
test('mergeInto: newer day (by u) overwrites older', () => {
  const s = makeState();
  s.days['2026-09-07'] = { ...L.defaultDay(), u: 100, note: 'old' };
  const raw = JSON.stringify({ state: { days: { '2026-09-07': { ...L.defaultDay(), u: 200, note: 'new' } } } });
  const r = L.mergeInto(s, raw);
  assert.equal(r.daysMerged, 1);
  assert.equal(s.days['2026-09-07'].note, 'new');
});
test('mergeInto: older day (by u) does not overwrite', () => {
  const s = makeState();
  s.days['2026-09-07'] = { ...L.defaultDay(), u: 200, note: 'keep-me' };
  const raw = JSON.stringify({ state: { days: { '2026-09-07': { ...L.defaultDay(), u: 100, note: 'stale' } } } });
  const r = L.mergeInto(s, raw);
  assert.equal(r.daysMerged, 0);
  assert.equal(s.days['2026-09-07'].note, 'keep-me');
});
test('mergeInto: urges are deduped by id and nothing is deleted', () => {
  const s = makeState();
  s.days['2026-09-07'] = { ...L.defaultDay(), u: 1 };
  s.urges = [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'rode' }];
  const raw = JSON.stringify({
    state: {
      days: { '2026-09-08': { ...L.defaultDay(), u: 1 } },
      urges: [
        { id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'rode' }, // duplicate, should not be re-added
        { id: 'u2', at: '2026-09-08T10:00:00.000Z', kind: 'porn', outcome: 'gave' },
      ],
    },
  });
  const r = L.mergeInto(s, raw);
  assert.equal(r.urgesMerged, 1);
  assert.equal(s.urges.length, 2);
  assert.ok(s.days['2026-09-07']); // original day still present, nothing deleted
  assert.ok(s.days['2026-09-08']); // new day added
});
test('mergeInto: junk text throws', () => {
  const s = makeState();
  assert.throws(() => L.mergeInto(s, 'not json at all'));
  assert.throws(() => L.mergeInto(s, JSON.stringify({ foo: 'bar' })));
  assert.throws(() => L.mergeInto(s, ''));
});
test('mergeInto: incoming urge with an outcome replaces a local one that has none (exact repro from analysis)', () => {
  const s = makeState();
  s.urges = [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: null }];
  const raw = JSON.stringify({ state: { urges: [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'gave', resolvedAt: '2026-09-07T10:11:00.000Z' }] } });
  const r = L.mergeInto(s, raw);
  assert.equal(r.urgesMerged, 1);
  assert.equal(s.urges.length, 1);
  assert.equal(s.urges[0].outcome, 'gave');
});
test('mergeInto: incoming urge with a newer resolvedAt replaces the local one even if both have an outcome', () => {
  const s = makeState();
  s.urges = [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'rode', resolvedAt: '2026-09-07T10:10:00.000Z' }];
  const raw = JSON.stringify({ state: { urges: [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'gave', resolvedAt: '2026-09-07T10:20:00.000Z' }] } });
  const r = L.mergeInto(s, raw);
  assert.equal(r.urgesMerged, 1);
  assert.equal(s.urges[0].outcome, 'gave');
});
test('mergeInto: incoming urge with an older resolvedAt does not replace the local one', () => {
  const s = makeState();
  s.urges = [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'rode', resolvedAt: '2026-09-07T10:20:00.000Z' }];
  const raw = JSON.stringify({ state: { urges: [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', kind: 'scroll', outcome: 'gave', resolvedAt: '2026-09-07T10:10:00.000Z' }] } });
  const r = L.mergeInto(s, raw);
  assert.equal(r.urgesMerged, 0);
  assert.equal(s.urges[0].outcome, 'rode');
});

// ---------- mergeStates (cross-instance merge) ----------
test('mergeStates: per-day newer u wins, days unique to either side are kept', () => {
  const local = makeState();
  local.days['2026-09-07'] = { ...L.defaultDay(), u: 100, note: 'local-old' };
  local.days['2026-09-08'] = { ...L.defaultDay(), u: 50, note: 'local-only' };
  const incoming = makeState();
  incoming.days['2026-09-07'] = { ...L.defaultDay(), u: 200, note: 'incoming-new' };
  incoming.days['2026-09-09'] = { ...L.defaultDay(), u: 10, note: 'incoming-only' };
  const out = L.mergeStates(local, incoming);
  assert.equal(out.days['2026-09-07'].note, 'incoming-new');
  assert.equal(out.days['2026-09-08'].note, 'local-only');
  assert.equal(out.days['2026-09-09'].note, 'incoming-only');
});
test('mergeStates: urges union by id, outcome preferred over null', () => {
  const local = makeState();
  local.urges = [{ id: 'u1', at: '2026-09-07T10:00:00.000Z', outcome: null }];
  const incoming = makeState();
  incoming.urges = [
    { id: 'u1', at: '2026-09-07T10:00:00.000Z', outcome: 'rode', resolvedAt: '2026-09-07T10:10:00.000Z' },
    { id: 'u2', at: '2026-09-08T10:00:00.000Z', outcome: null },
  ];
  const out = L.mergeStates(local, incoming);
  assert.equal(out.urges.length, 2);
  assert.equal(out.urges.find((u) => u.id === 'u1').outcome, 'rode');
});
test('mergeStates: settings/meta come from whichever side has the newer meta.updatedAt', () => {
  const local = makeState();
  local.meta.updatedAt = 100;
  local.settings.ntfyTopic = 'local-topic';
  const incoming = makeState();
  incoming.meta.updatedAt = 200;
  incoming.settings.ntfyTopic = 'incoming-topic';
  const out = L.mergeStates(local, incoming);
  assert.equal(out.settings.ntfyTopic, 'incoming-topic');
  assert.equal(out.meta.updatedAt, 200);

  const out2 = L.mergeStates(incoming, local); // local is now the "incoming" side but is older
  assert.equal(out2.settings.ntfyTopic, 'incoming-topic'); // incoming (base) is still newer
});
test('mergeStates: does not mutate either argument (pure function)', () => {
  const local = makeState();
  local.days['2026-09-07'] = { ...L.defaultDay(), u: 1 };
  const localSnapshot = JSON.parse(JSON.stringify(local));
  const incoming = makeState();
  incoming.days['2026-09-07'] = { ...L.defaultDay(), u: 2, note: 'newer' };
  const incomingSnapshot = JSON.parse(JSON.stringify(incoming));
  L.mergeStates(local, incoming);
  assert.deepEqual(local, localSnapshot);
  assert.deepEqual(incoming, incomingSnapshot);
});

// ---------- defaultTab ----------
test('defaultTab: before rollover hour is night', () => {
  const now = new Date(2026, 8, 12, 2, 0, 0);
  assert.equal(L.defaultTab(now, 4), 'night');
});
test('defaultTab: at or after 15:00 is night', () => {
  assert.equal(L.defaultTab(new Date(2026, 8, 12, 15, 0, 0), 4), 'night');
  assert.equal(L.defaultTab(new Date(2026, 8, 12, 21, 0, 0), 4), 'night');
});
test('defaultTab: between rollover hour and 15:00 is day', () => {
  assert.equal(L.defaultTab(new Date(2026, 8, 12, 4, 0, 0), 4), 'day');
  assert.equal(L.defaultTab(new Date(2026, 8, 12, 9, 30, 0), 4), 'day');
  assert.equal(L.defaultTab(new Date(2026, 8, 12, 14, 59, 0), 4), 'day');
});

// ---------- night flow (wave 1 N1: 3 steps, ratings moved to Mind) ----------
test('nightCardDone: false with nothing filled in', () => {
  assert.equal(L.nightCardDone(L.defaultDay()), false);
});
test('nightCardDone: true when wind-down is done', () => {
  const d = L.defaultDay(); d.windDown.done = true;
  assert.equal(L.nightCardDone(d), true);
});
test('nightCardDone: true with any nonzero rating (ratings still count even though Mind owns the UI)', () => {
  const d = L.defaultDay(); d.ratings.pauses = 2;
  assert.equal(L.nightCardDone(d), true);
});
test('nightCardDone: true with a non-blank note', () => {
  const d = L.defaultDay(); d.note = '  fine  ';
  assert.equal(L.nightCardDone(d), true);
});
test('nightCardDone: a whitespace-only note does not count', () => {
  const d = L.defaultDay(); d.note = '   ';
  assert.equal(L.nightCardDone(d), false);
});
test('nightCardDone: true when the "washed up" night check is on, with no d.night at all otherwise', () => {
  const d = L.defaultDay(); d.night = { washed: true, tape: false };
  assert.equal(L.nightCardDone(d), true);
});
test('nightCardDone: true when the "mouth tape" night check is on', () => {
  const d = L.defaultDay(); d.night = { washed: false, tape: true };
  assert.equal(L.nightCardDone(d), true);
});
test('nightCardDone: false when d.night is absent entirely (additive field, defaults false)', () => {
  const d = L.defaultDay();
  assert.equal('night' in d, false);
  assert.equal(L.nightCardDone(d), false);
});

test('nightChecksOf: defaults washed/tape to false when d.night is missing', () => {
  assert.deepEqual(L.nightChecksOf(L.defaultDay()), { washed: false, tape: false });
});
test('nightChecksOf: reads whatever is present on d.night', () => {
  assert.deepEqual(L.nightChecksOf({ night: { washed: true } }), { washed: true, tape: false });
});

test('nightStepDone: step 0 tracks wind-down.done', () => {
  const d = L.defaultDay();
  assert.equal(L.nightStepDone(d, 0), false);
  d.windDown.done = true;
  assert.equal(L.nightStepDone(d, 0), true);
});
test('nightStepDone: step 1 (slips) tracks d.nightVisited, not the lapse data', () => {
  const d = L.defaultDay(); // no slips toggled on, a legitimate "no slips" answer
  assert.equal(L.nightStepDone(d, 1), false);
  d.nightVisited[1] = true;
  assert.equal(L.nightStepDone(d, 1), true);
});
test('nightStepDone: step 2 tracks a non-blank note (ratings step is gone)', () => {
  const d = L.defaultDay();
  assert.equal(L.nightStepDone(d, 2), false);
  d.note = 'ok';
  assert.equal(L.nightStepDone(d, 2), true);
});
test('nightStepDone: an out-of-range step index (e.g. the old ratings step 3) is false', () => {
  const d = L.defaultDay(); d.ratings.curiosity = 5;
  assert.equal(L.nightStepDone(d, 3), false);
});

test('firstIncompleteNightStep: picks the first step whose data/nightVisited signal is empty', () => {
  const d = L.defaultDay();
  assert.equal(L.firstIncompleteNightStep(d), 0);
  d.windDown.done = true;
  assert.equal(L.firstIncompleteNightStep(d), 1);
  d.nightVisited[1] = true;
  assert.equal(L.firstIncompleteNightStep(d), 2);
});
test('firstIncompleteNightStep: falls back to 0 when every step is already complete', () => {
  const d = L.defaultDay();
  d.windDown.done = true; d.nightVisited = [true, true, true, true]; d.note = 'done';
  assert.equal(L.firstIncompleteNightStep(d), 0);
});
test('firstIncompleteNightStep: still accepts the existing four-element nightVisited array, ignoring index 3', () => {
  const d = L.defaultDay();
  d.windDown.done = true; d.nightVisited = [true, true, false, true]; // index 3 (old ratings step) true but irrelevant
  assert.equal(L.firstIncompleteNightStep(d), 2); // step 2 (note) still incomplete
});

// ---------- nightVisited (E4: moved off sessionStorage onto the day object) ----------
test('defaultDay: nightVisited defaults to four falses', () => {
  assert.deepEqual(L.defaultDay().nightVisited, [false, false, false, false]);
});
test('normalize: old saves with no nightVisited on a day get the default shape (additive)', () => {
  const out = L.normalize({ days: { '2026-09-07': { stretched: true } } });
  assert.deepEqual(out.days['2026-09-07'].nightVisited, [false, false, false, false]);
});
test('normalize: a saved nightVisited array is preserved', () => {
  const out = L.normalize({ days: { '2026-09-07': { nightVisited: [true, true, false, false] } } });
  assert.deepEqual(out.days['2026-09-07'].nightVisited, [true, true, false, false]);
});
test('normalize: a wrong-typed nightVisited (not an array) falls back to the default', () => {
  const out = L.normalize({ days: { '2026-09-07': { nightVisited: 'oops' } } });
  assert.deepEqual(out.days['2026-09-07'].nightVisited, [false, false, false, false]);
});

// ---------- recentUrges / fmtTime ----------
test('recentUrges: returns the newest n urges, most recent first', () => {
  const s = makeState();
  s.urges = [
    { id: 'a', at: '2026-09-07T10:00:00.000Z' },
    { id: 'b', at: '2026-09-09T10:00:00.000Z' },
    { id: 'c', at: '2026-09-08T10:00:00.000Z' },
  ];
  const out = L.recentUrges(s, 2);
  assert.deepEqual(out.map((u) => u.id), ['b', 'c']);
});
test('recentUrges: n larger than the list returns everything, still sorted', () => {
  const s = makeState();
  s.urges = [{ id: 'old', at: '2026-09-01T00:00:00.000Z' }, { id: 'new', at: '2026-09-05T00:00:00.000Z' }];
  const out = L.recentUrges(s, 5);
  assert.deepEqual(out.map((u) => u.id), ['new', 'old']);
});
test('fmtTime: formats local hours/minutes with am/pm, including noon and midnight', () => {
  assert.equal(L.fmtTime(new Date(2026, 8, 7, 0, 5)), '12:05am');
  assert.equal(L.fmtTime(new Date(2026, 8, 7, 9, 3)), '9:03am');
  assert.equal(L.fmtTime(new Date(2026, 8, 7, 12, 0)), '12:00pm');
  assert.equal(L.fmtTime(new Date(2026, 8, 7, 23, 45)), '11:45pm');
});

// ---------- backupDueDays ----------
test('backupDueDays: returns 0 with fewer than 3 logged days', () => {
  const s = makeState();
  s.days['2026-09-07'] = L.defaultDay();
  s.days['2026-09-08'] = L.defaultDay();
  const now = Date.now();
  assert.equal(L.backupDueDays(s, now), 0);
});
test('backupDueDays: returns the day count once 7+ days have passed since lastExport', () => {
  const s = makeState();
  s.days['2026-09-01'] = L.defaultDay();
  s.days['2026-09-02'] = L.defaultDay();
  s.days['2026-09-03'] = L.defaultDay();
  const now = Date.now();
  const daysAgo = 9;
  s.settings.lastExport = now - daysAgo * 86400000;
  assert.equal(L.backupDueDays(s, now), daysAgo);
});
test('backupDueDays: returns 0 with 3+ logged days but a recent export', () => {
  const s = makeState();
  s.days['2026-09-01'] = L.defaultDay();
  s.days['2026-09-02'] = L.defaultDay();
  s.days['2026-09-03'] = L.defaultDay();
  const now = Date.now();
  s.settings.lastExport = now - 2 * 86400000;
  assert.equal(L.backupDueDays(s, now), 0);
});

// ---------- fmtHour12 / dayEndOptions / shortcutsUiVisible ----------
test('fmtHour12: midnight, noon, and regular hours', () => {
  assert.equal(L.fmtHour12(0), '12 am');
  assert.equal(L.fmtHour12(2), '2 am');
  assert.equal(L.fmtHour12(4), '4 am');
  assert.equal(L.fmtHour12(6), '6 am');
  assert.equal(L.fmtHour12(12), '12 pm');
  assert.equal(L.fmtHour12(13), '1 pm');
  assert.equal(L.fmtHour12(23), '11 pm');
});
test('dayEndOptions: default hours when rolloverHour is one of the four options', () => {
  const opts = L.dayEndOptions(4);
  assert.deepEqual(opts.map((o) => o.hour), [0, 2, 4, 6]);
  assert.deepEqual(opts.map((o) => o.label), ['12 am', '2 am', '4 am', '6 am']);
});
test('dayEndOptions: an off-menu saved hour is added, sorted, and kept', () => {
  const opts = L.dayEndOptions(3);
  assert.deepEqual(opts.map((o) => o.hour), [0, 2, 3, 4, 6]);
  assert.equal(opts.find((o) => o.hour === 3).label, '3 am');
});
test('dayEndOptions: an off-menu hour past 6 sorts to the end', () => {
  const opts = L.dayEndOptions(1);
  assert.deepEqual(opts.map((o) => o.hour), [0, 1, 2, 4, 6]);
});
test('shortcutsUiVisible: visible with no ntfy topic set', () => {
  assert.equal(L.shortcutsUiVisible({ ntfyTopic: '' }), true);
  assert.equal(L.shortcutsUiVisible({ ntfyTopic: '   ' }), true);
  assert.equal(L.shortcutsUiVisible({}), true);
});
test('shortcutsUiVisible: hidden once an ntfy topic is set', () => {
  assert.equal(L.shortcutsUiVisible({ ntfyTopic: 'my-topic' }), false);
});

test('weekStats.logged counts only days with data', () => {
  const st = L.defaultState();
  st.days['2026-09-08'] = L.defaultDay();
  st.days['2026-09-09'] = L.defaultDay();
  const w = L.weekStats(st, '2026-09-07', '2026-09-11');
  assert.equal(w.n, 5);
  assert.equal(w.logged, 2);
  const empty = L.weekStats(st, '2026-08-31', '2026-09-11');
  assert.equal(empty.n, 7);
  assert.equal(empty.logged, 0);
});
