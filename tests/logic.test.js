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
test('normalize: bad day keys are dropped', () => {
  const out = L.normalize({ days: { 'not-a-date': { stretched: true }, '2026/09/07': {}, '2026-9-7': {}, '2026-09-07': { stretched: true } } });
  assert.deepEqual(Object.keys(out.days), ['2026-09-07']);
});
test('normalize: junk urges (missing id/at) are filtered out', () => {
  const out = L.normalize({ urges: [{ id: 'a', at: '2026-09-07T10:00:00.000Z' }, { at: '2026-09-07T10:00:00.000Z' }, { id: 'b' }, null, 'junk'] });
  assert.equal(out.urges.length, 1);
  assert.equal(out.urges[0].id, 'a');
});
test('normalize: partial settings.onboarding merges with defaults', () => {
  const out = L.normalize({ settings: { onboarding: { home: true } } });
  assert.deepEqual(out.settings.onboarding, { home: true, shortcuts: false, backup: false });
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
