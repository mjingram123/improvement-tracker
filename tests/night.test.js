'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');
const N = require('../js/logic-night.js');

// ---------- nightChecks (N1) ----------
test('nightChecks: defaults washed/tape to false with no d.night at all', () => {
  assert.deepEqual(N.nightChecks({}), { washed: false, tape: false });
});
test('nightChecks: reads washed/tape when present', () => {
  assert.deepEqual(N.nightChecks({ night: { washed: true, tape: false } }), { washed: true, tape: false });
});
test('nightChecks: a partial d.night object still defaults the missing key', () => {
  assert.deepEqual(N.nightChecks({ night: { tape: true } }), { washed: false, tape: true });
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
