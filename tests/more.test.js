'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/logic-more.js');

test('recentSnapshotKeys: keeps only snap: keys, sorted descending, capped at 7', () => {
  const keys = [
    'current', 'snap:2026-09-01', 'snap:2026-09-05', 'snap:2026-09-03',
    'snap:2026-08-31', 'snap:2026-09-04', 'snap:2026-09-02', 'snap:2026-09-06',
    'snap:2026-09-07', 'snap:2026-09-08', 'it:state:v1',
  ];
  assert.deepEqual(M.recentSnapshotKeys(keys, 7), [
    'snap:2026-09-08', 'snap:2026-09-07', 'snap:2026-09-06', 'snap:2026-09-05',
    'snap:2026-09-04', 'snap:2026-09-03', 'snap:2026-09-02',
  ]);
});

test('recentSnapshotKeys: fewer than the limit returns them all, still descending', () => {
  const keys = ['snap:2026-09-02', 'snap:2026-09-01'];
  assert.deepEqual(M.recentSnapshotKeys(keys, 7), ['snap:2026-09-02', 'snap:2026-09-01']);
});

test('recentSnapshotKeys: no snapshot keys returns an empty array', () => {
  assert.deepEqual(M.recentSnapshotKeys(['current', 'it:state:v1'], 7), []);
});

test('recentSnapshotKeys: empty/undefined input returns an empty array', () => {
  assert.deepEqual(M.recentSnapshotKeys([], 7), []);
  assert.deepEqual(M.recentSnapshotKeys(undefined, 7), []);
});

test('snapshotDateKey: strips the snap: prefix to leave a plain date key', () => {
  assert.equal(M.snapshotDateKey('snap:2026-09-08'), '2026-09-08');
});
