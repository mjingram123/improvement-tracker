'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/logic-day.js');

// ---------- defaultMorning / getMorning ----------
test('defaultMorning: all false when no legacy stretched value', () => {
  assert.deepEqual(D.defaultMorning(undefined), { up: false, pushups: false, stretched: false, shower: false });
});
test('defaultMorning: seeds stretched from the legacy flag', () => {
  assert.deepEqual(D.defaultMorning(true), { up: false, pushups: false, stretched: true, shower: false });
});
test('getMorning: builds defaults when d.morning is missing, carrying over legacy stretched', () => {
  const d = { stretched: true };
  assert.deepEqual(D.getMorning(d), { up: false, pushups: false, stretched: true, shower: false });
});
test('getMorning: returns d.morning merged over defaults when present', () => {
  const d = { stretched: false, morning: { up: true, pushups: true } };
  assert.deepEqual(D.getMorning(d), { up: true, pushups: true, stretched: false, shower: false });
});
test('getMorning: ignores a corrupt non-object d.morning', () => {
  const d = { stretched: true, morning: 'oops' };
  assert.deepEqual(D.getMorning(d), { up: false, pushups: false, stretched: true, shower: false });
});
test('getMorning: is pure, does not mutate d', () => {
  const d = { stretched: true };
  D.getMorning(d);
  assert.equal(d.morning, undefined);
});

// ---------- morningAllChecked ----------
test('morningAllChecked: false until every one of the four is checked', () => {
  assert.equal(D.morningAllChecked({ up: true, pushups: true, stretched: true, shower: false }), false);
  assert.equal(D.morningAllChecked({ up: true, pushups: true, stretched: true, shower: true }), true);
});

// ---------- morningCardDone ----------
test('morningCardDone: done when all four checked and hangover row not active', () => {
  const morning = { up: true, pushups: true, stretched: true, shower: true };
  assert.equal(D.morningCardDone(morning, false, false), true);
});
test('morningCardDone: not done if any of the four is unchecked, even with no hangover row', () => {
  const morning = { up: true, pushups: true, stretched: true, shower: false };
  assert.equal(D.morningCardDone(morning, false, false), false);
});
test('morningCardDone: requires kit complete when hangover row is shown and on', () => {
  const morning = { up: true, pushups: true, stretched: true, shower: true };
  assert.equal(D.morningCardDone(morning, true, false), false);
  assert.equal(D.morningCardDone(morning, true, true), true);
});
test('morningCardDone: kit completeness is irrelevant when hangover is not active', () => {
  const morning = { up: true, pushups: true, stretched: true, shower: true };
  assert.equal(D.morningCardDone(morning, false, false), true);
});

// ---------- MORNING_ITEMS ----------
test('MORNING_ITEMS: four items, matching contract keys', () => {
  assert.deepEqual(D.MORNING_ITEMS.map((i) => i.key), ['up', 'pushups', 'stretched', 'shower']);
});
