'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const U = require('../js/logic-urge.js');

function makeState(rolloverHour = 4) {
  const s = L.defaultState();
  s.settings.rolloverHour = rolloverHour;
  return s;
}

// ---------- applyGaveIn ----------
test('applyGaveIn: sets the lapse flag for the urge kind', () => {
  const s = makeState();
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 20, 0, 0).toISOString(), kind: 'scroll', trigger: 'bored' };
  const key = U.applyGaveIn(s, urge);
  assert.equal(key, '2026-09-12');
  assert.equal(s.days[key].lapses.scroll, true);
});

test('applyGaveIn: creates the day when it does not exist yet', () => {
  const s = makeState();
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 20, 0, 0).toISOString(), kind: 'porn', trigger: 'tired' };
  assert.equal(Object.keys(s.days).length, 0);
  const key = U.applyGaveIn(s, urge);
  assert.ok(s.days[key]);
  assert.equal(s.days[key].lapses.porn, true);
});

test('applyGaveIn: copies the trigger into the lapse note when the note is empty', () => {
  const s = makeState();
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 20, 0, 0).toISOString(), kind: 'scroll', trigger: 'bored, tired' };
  const key = U.applyGaveIn(s, urge);
  assert.equal(s.days[key].lapseNotes.scroll, 'bored, tired');
});

test('applyGaveIn: preserves an existing lapse note instead of overwriting it', () => {
  const s = makeState();
  const key = '2026-09-12';
  s.days[key] = { ...L.defaultDay(), lapseNotes: { ...L.defaultDay().lapseNotes, scroll: 'already have a note' } };
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 20, 0, 0).toISOString(), kind: 'scroll', trigger: 'new trigger' };
  U.applyGaveIn(s, urge);
  assert.equal(s.days[key].lapseNotes.scroll, 'already have a note');
});

test('applyGaveIn: uses the urge day key (rollover hour), not the calendar date of "now"', () => {
  const s = makeState(4);
  // 1:30am local counts as the previous day when rolloverHour is 4.
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 1, 30, 0).toISOString(), kind: 'porn', trigger: 'late' };
  const key = U.applyGaveIn(s, urge);
  assert.equal(key, '2026-09-11');
  assert.equal(s.days['2026-09-11'].lapses.porn, true);
  assert.equal(s.days['2026-09-12'], undefined);
});

test('applyGaveIn: leaves the nag lapse and note untouched', () => {
  const s = makeState();
  const key = '2026-09-12';
  s.days[key] = { ...L.defaultDay(), lapses: { ...L.defaultDay().lapses, nag: true }, lapseNotes: { ...L.defaultDay().lapseNotes, nag: 'dishes' } };
  const urge = { id: 'u1', at: new Date(2026, 8, 12, 20, 0, 0).toISOString(), kind: 'scroll', trigger: 'bored' };
  U.applyGaveIn(s, urge);
  assert.equal(s.days[key].lapses.nag, true);
  assert.equal(s.days[key].lapseNotes.nag, 'dishes');
  assert.equal(s.days[key].lapses.scroll, true);
});

// ---------- topTriggers ----------
function urgeAt(date, trigger) {
  return { id: Math.random().toString(36), at: date.toISOString(), kind: 'scroll', trigger };
}

test('topTriggers: ranks by frequency, most used first', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const urges = [
    urgeAt(new Date(2026, 8, 18), 'bored'),
    urgeAt(new Date(2026, 8, 18), 'bored'),
    urgeAt(new Date(2026, 8, 19), 'lonely'),
  ];
  const top = U.topTriggers(urges, now);
  assert.equal(top[0], 'bored');
  assert.ok(top.includes('lonely'));
});

test('topTriggers: splits on commas and spaces, lowercases', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const urges = [urgeAt(new Date(2026, 8, 18), 'Bored, Tired  lonely')];
  const top = U.topTriggers(urges, now);
  assert.ok(top.includes('bored'));
  assert.ok(top.includes('tired'));
  assert.ok(top.includes('lonely'));
});

test('topTriggers: drops words under 3 letters', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const urges = [urgeAt(new Date(2026, 8, 18), 'ok, no, bored')];
  const top = U.topTriggers(urges, now);
  assert.ok(!top.includes('ok'));
  assert.ok(!top.includes('no'));
  assert.ok(top.includes('bored'));
});

test('topTriggers: ignores urges older than 28 days', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const urges = [urgeAt(new Date(2026, 6, 1), 'ancient')];
  const top = U.topTriggers(urges, now);
  assert.ok(!top.includes('ancient'));
});

test('topTriggers: pads with defaults, no duplicates, capped at six', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const urges = [urgeAt(new Date(2026, 8, 18), 'bored')];
  const top = U.topTriggers(urges, now);
  assert.equal(top.length, 6);
  assert.equal(new Set(top).size, 6);
  assert.equal(top[0], 'bored');
  for (const w of ['tired', 'alone', 'stressed', 'late', 'drinking']) assert.ok(top.includes(w));
});

test('topTriggers: with no urges at all, returns exactly the six defaults', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const top = U.topTriggers([], now);
  assert.deepEqual(top, U.DEFAULT_TRIGGERS);
});
