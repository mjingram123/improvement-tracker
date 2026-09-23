'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const N = require('../js/logic-night.js');

// ---------- nightChecks (N1) ----------
test('nightChecks: defaults washed/tape to false with no d.night at all', () => {
  assert.deepEqual(N.nightChecks({}), { washed: false, tape: false, magnesium: false });
});
test('nightChecks: reads washed/tape when present', () => {
  assert.deepEqual(N.nightChecks({ night: { washed: true, tape: false, magnesium: false } }), { washed: true, tape: false, magnesium: false });
});
test('nightChecks: a partial d.night object still defaults the missing key', () => {
  assert.deepEqual(N.nightChecks({ night: { tape: true, magnesium: false } }), { washed: false, tape: true, magnesium: false });
});

// ---------- ratingsSummaryText ----------
test('ratingsSummaryText: null when nothing has been rated', () => {
  const d = L.defaultDay();
  assert.equal(N.ratingsSummaryText(d, L.RATINGS), null);
});
test('ratingsSummaryText: lists only the rated dimensions, in RATINGS order', () => {
  const d = L.defaultDay();
  d.ratings.story = 3; d.ratings.curiosity = 4;
  assert.equal(N.ratingsSummaryText(d, L.RATINGS), 'Rated: curiosity 4 · story 3');
});
test('ratingsSummaryText: a zero rating does not count as rated', () => {
  const d = L.defaultDay();
  d.ratings.pauses = 0; d.ratings.present = 5;
  assert.equal(N.ratingsSummaryText(d, L.RATINGS), 'Rated: present 5');
});

// ---------- lapseHelp (N2) ----------
test('lapseHelp: defaults to empty strings for scroll/porn/nag with no d.lapseHelp', () => {
  assert.deepEqual(N.lapseHelp({}), { scroll: '', porn: '', nag: '' });
});
test('lapseHelp: reads whatever is present and defaults the rest', () => {
  assert.deepEqual(N.lapseHelp({ lapseHelp: { scroll: 'put phone in another room' } }),
    { scroll: 'put phone in another room', porn: '', nag: '' });
});

// ---------- scrollMinutes (N2) ----------
test('scrollMinutes: null when d.scrollMinutes is absent', () => {
  assert.equal(N.scrollMinutes({}), null);
});
test('scrollMinutes: null when d.scrollMinutes is not a number (e.g. corrupted import)', () => {
  assert.equal(N.scrollMinutes({ scrollMinutes: 'oops' }), null);
});
test('scrollMinutes: returns the stored number, including zero', () => {
  assert.equal(N.scrollMinutes({ scrollMinutes: 0 }), 0);
  assert.equal(N.scrollMinutes({ scrollMinutes: 45 }), 45);
});

// ---------- parseScrollMinutes ----------
test('parseScrollMinutes: empty input becomes null', () => {
  assert.equal(N.parseScrollMinutes(''), null);
});
test('parseScrollMinutes: digit string becomes a number', () => {
  assert.equal(N.parseScrollMinutes('45'), 45);
});
test('parseScrollMinutes: strips non-digit characters before parsing', () => {
  assert.equal(N.parseScrollMinutes('~40 min'), 40);
});
test('parseScrollMinutes: an all-non-digit string becomes null', () => {
  assert.equal(N.parseScrollMinutes('a lot'), null);
});
