'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/logic-mind.js');

// ---------- mindDefaultHalf (same clock rule as the app's default tab) ----------
test('mindDefaultHalf: mid-afternoon before 15:00 and after rollover is Prepare', () => {
  const now = new Date(2026, 8, 12, 14, 0, 0);
  assert.equal(M.mindDefaultHalf(now, 4), 'prepare');
});
test('mindDefaultHalf: exactly 15:00 is Reflect', () => {
  const now = new Date(2026, 8, 12, 15, 0, 0);
  assert.equal(M.mindDefaultHalf(now, 4), 'reflect');
});
test('mindDefaultHalf: late evening is Reflect', () => {
  const now = new Date(2026, 8, 12, 23, 30, 0);
  assert.equal(M.mindDefaultHalf(now, 4), 'reflect');
});
test('mindDefaultHalf: after midnight before the rollover hour is still Reflect', () => {
  const now = new Date(2026, 8, 12, 2, 0, 0);
  assert.equal(M.mindDefaultHalf(now, 4), 'reflect');
});
test('mindDefaultHalf: at or after the rollover hour, before 15:00, is Prepare', () => {
  const now = new Date(2026, 8, 12, 4, 0, 0);
  assert.equal(M.mindDefaultHalf(now, 4), 'prepare');
});

// ---------- isReviewWindow ----------
// weekStartKey 2026-09-07 is a Monday; that week's Sunday is 2026-09-13 and the
// following Tuesday is 2026-09-15.
const WEEK = '2026-09-07';
test('isReviewWindow: just before Sunday 15:00 is not eligible', () => {
  const now = new Date(2026, 8, 13, 14, 59, 59, 999);
  assert.equal(M.isReviewWindow(now, WEEK), false);
});
test('isReviewWindow: exactly Sunday 15:00 is eligible', () => {
  const now = new Date(2026, 8, 13, 15, 0, 0, 0);
  assert.equal(M.isReviewWindow(now, WEEK), true);
});
test('isReviewWindow: Monday mid-day is eligible', () => {
  const now = new Date(2026, 8, 14, 12, 0, 0);
  assert.equal(M.isReviewWindow(now, WEEK), true);
});
test('isReviewWindow: Tuesday 23:59:59.999 is eligible (the last instant)', () => {
  const now = new Date(2026, 8, 15, 23, 59, 59, 999);
  assert.equal(M.isReviewWindow(now, WEEK), true);
});
test('isReviewWindow: Wednesday midnight is not eligible', () => {
  const now = new Date(2026, 8, 16, 0, 0, 0, 0);
  assert.equal(M.isReviewWindow(now, WEEK), false);
});
test('isReviewWindow: a week earlier is not eligible for this week\'s window', () => {
  const now = new Date(2026, 8, 6, 16, 0, 0);
  assert.equal(M.isReviewWindow(now, WEEK), false);
});
test('isReviewWindow: falsy or malformed weekStartKey is never eligible', () => {
  const now = new Date(2026, 8, 14, 12, 0, 0);
  assert.equal(M.isReviewWindow(now, null), false);
  assert.equal(M.isReviewWindow(now, ''), false);
  assert.equal(M.isReviewWindow(now, 'not-a-key'), false);
});

// ---------- eligibleReviewWeek ----------
test('eligibleReviewWeek: Monday after a reviewed week resolves to the previous week\'s Monday', () => {
  const now = new Date(2026, 8, 14, 10, 0, 0); // Monday 2026-09-14
  assert.equal(M.eligibleReviewWeek(now, '2026-09-14'), '2026-09-07');
});
test('eligibleReviewWeek: the following Sunday resolves to the current week\'s Monday', () => {
  const now = new Date(2026, 8, 20, 16, 0, 0); // Sunday 2026-09-20, 4pm
  assert.equal(M.eligibleReviewWeek(now, '2026-09-20'), '2026-09-14');
});
test('eligibleReviewWeek: mid-week with no open window returns null', () => {
  const now = new Date(2026, 8, 17, 12, 0, 0); // Thursday
  assert.equal(M.eligibleReviewWeek(now, '2026-09-17'), null);
});
