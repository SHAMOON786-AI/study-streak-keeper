const assert = require('assert');
const {
  toDateKey,
  diffInDays,
  calculateStreaks,
  calculateWeeklySubjectTotals,
  calculateDailyTotals,
  formatSessionsToCsv
} = require('../src/streak');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error('     Reason:', err.message);
    failed++;
  }
}

console.log('\n======================================================');
console.log('       STUDY STREAK KEEPER - EDGE-CASE TEST SUITE      ');
console.log('======================================================\n');

// ---------------------------------------------------------------------------
// 1. Edge Case: Empty & Invalid Sessions
// ---------------------------------------------------------------------------
console.log('📋 Test Group 1: Empty & Invalid Data Handling');

runTest('Empty session array returns streak 0 and longest streak 0', () => {
  const result = calculateStreaks([]);
  assert.strictEqual(result.currentStreak, 0);
  assert.strictEqual(result.longestStreak, 0);
});

runTest('Null or non-array returns streak 0', () => {
  const result = calculateStreaks(null);
  assert.strictEqual(result.currentStreak, 0);
  assert.strictEqual(result.longestStreak, 0);
});

runTest('Sessions with zero or negative durations are ignored', () => {
  const sessions = [
    { subject: 'Math', duration: 0, date: '2026-10-15' },
    { subject: 'Math', duration: -10, date: '2026-10-16' }
  ];
  const result = calculateStreaks(sessions, '2026-10-16');
  assert.strictEqual(result.currentStreak, 0);
  assert.strictEqual(result.longestStreak, 0);
});

// ---------------------------------------------------------------------------
// 2. Edge Case: Missed Day & Streak Preservation
// ---------------------------------------------------------------------------
console.log('\n📋 Test Group 2: Missed Day Handling');

runTest('Missed day resets current streak to 1 when resuming, while preserving longest streak', () => {
  const sessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-10' },
    { subject: 'DSA', duration: 45, date: '2026-10-11' },
    { subject: 'OS', duration: 50, date: '2026-10-12' },
    { subject: 'DBMS', duration: 30, date: '2026-10-13' },
    // 2026-10-14 is MISSED
    { subject: 'DSA', duration: 90, date: '2026-10-15' },
    { subject: 'CN', duration: 40, date: '2026-10-16' }
  ];

  const result = calculateStreaks(sessions, '2026-10-16');
  assert.strictEqual(result.currentStreak, 2, 'Current streak should be 2 days after resuming post-miss');
  assert.strictEqual(result.longestStreak, 4, 'Longest streak must preserve the historical 4 days');
});

runTest('Missed yesterday and today drops current streak to 0 while preserving longest streak', () => {
  const sessions = [
    { subject: 'Calculus', duration: 60, date: '2026-10-10' },
    { subject: 'Calculus', duration: 60, date: '2026-10-11' },
    { subject: 'Calculus', duration: 60, date: '2026-10-12' }
  ];

  const result = calculateStreaks(sessions, '2026-10-16');
  assert.strictEqual(result.currentStreak, 0, 'Current streak must be 0 if inactive for >1 day');
  assert.strictEqual(result.longestStreak, 3, 'Longest streak must remain 3');
});

runTest('Studied yesterday (1 day ago) keeps current streak active for today', () => {
  const sessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-14' },
    { subject: 'DSA', duration: 60, date: '2026-10-15' }
  ];

  const result = calculateStreaks(sessions, '2026-10-16');
  assert.strictEqual(result.currentStreak, 2, 'Streak is still active if last study was yesterday');
  assert.strictEqual(result.longestStreak, 2);
});

// ---------------------------------------------------------------------------
// 3. Edge Case: Several Sessions in One Day
// ---------------------------------------------------------------------------
console.log('\n📋 Test Group 3: Several Sessions in One Day (Deduplication)');

runTest('Several sessions in one day count as a single streak day', () => {
  const sessions = [
    { subject: 'Python', duration: 30, date: '2026-10-15' },
    { subject: 'Web Dev', duration: 45, date: '2026-10-15' },
    { subject: 'DSA', duration: 60, date: '2026-10-15' },
    { subject: 'Python', duration: 50, date: '2026-10-16' },
    { subject: 'Calculus', duration: 40, date: '2026-10-16' }
  ];

  const result = calculateStreaks(sessions, '2026-10-16');
  assert.strictEqual(result.currentStreak, 2, 'Multiple sessions across 2 days must equal a 2-day streak');
  assert.strictEqual(result.longestStreak, 2, 'Longest streak must be 2, not 5');
});

runTest('Multiple sessions on disjoint days do not multiply streak count', () => {
  const sessions = [
    { subject: 'A', duration: 15, date: '2026-10-01' },
    { subject: 'B', duration: 15, date: '2026-10-01' },
    { subject: 'C', duration: 15, date: '2026-10-01' },
    { subject: 'D', duration: 15, date: '2026-10-05' },
    { subject: 'E', duration: 15, date: '2026-10-05' }
  ];

  const result = calculateStreaks(sessions, '2026-10-05');
  assert.strictEqual(result.currentStreak, 1);
  assert.strictEqual(result.longestStreak, 1);
});

// ---------------------------------------------------------------------------
// 4. Edge Case: Midnight Boundary
// ---------------------------------------------------------------------------
console.log('\n📋 Test Group 4: Midnight Boundary Handling');

runTest('Midnight boundary: sessions at 23:59 and 00:01 on consecutive dates count as a 2-day streak', () => {
  const beforeMidnight = new Date(2026, 9, 15, 23, 59, 0); // Oct 15, 2026, 23:59:00 local
  const afterMidnight = new Date(2026, 9, 16, 0, 1, 0);    // Oct 16, 2026, 00:01:00 local

  const sessions = [
    { subject: 'Physics', duration: 30, date: beforeMidnight.toISOString() },
    { subject: 'Physics', duration: 30, date: afterMidnight.toISOString() }
  ];

  const result = calculateStreaks(sessions, toDateKey(afterMidnight));
  assert.strictEqual(result.currentStreak, 2, '23:59 and 00:01 across midnight must form a 2-day streak');
  assert.strictEqual(result.longestStreak, 2);
});

runTest('Midnight boundary: sessions at 00:01 and 23:59 on the SAME calendar day count as 1 day', () => {
  const justAfterMidnight = new Date(2026, 9, 16, 0, 1, 0);   // Oct 16, 2026, 00:01:00 local
  const justBeforeMidnight = new Date(2026, 9, 16, 23, 59, 0); // Oct 16, 2026, 23:59:00 local

  const sessions = [
    { subject: 'Chemistry', duration: 25, date: justAfterMidnight.toISOString() },
    { subject: 'Chemistry', duration: 45, date: justBeforeMidnight.toISOString() }
  ];

  const result = calculateStreaks(sessions, toDateKey(justBeforeMidnight));
  assert.strictEqual(result.currentStreak, 1, 'Two sessions at opposite ends of the same day count as 1 day');
  assert.strictEqual(result.longestStreak, 1);
});

// ---------------------------------------------------------------------------
// 5. Weekly Subject Aggregation
// ---------------------------------------------------------------------------
console.log('\n📋 Test Group 5: Weekly Subject Aggregation');

runTest('Weekly subject totals accurately sum durations within the current Monday-Sunday week', () => {
  // 2026-10-16 is a Friday. Monday was 2026-10-12, Sunday is 2026-10-18.
  const sessions = [
    { subject: 'DSA', duration: 40, date: '2026-10-12' },    // Monday of target week
    { subject: 'DSA', duration: 50, date: '2026-10-15' },    // Thursday of target week
    { subject: 'Web Dev', duration: 60, date: '2026-10-16' },// Friday of target week
    { subject: 'DSA', duration: 120, date: '2026-10-05' },   // Previous week (excluded)
    { subject: 'AI', duration: 90, date: '2026-10-25' }      // Future week (excluded)
  ];

  const weekly = calculateWeeklySubjectTotals(sessions, '2026-10-16');
  assert.strictEqual(weekly.totalsBySubject['DSA'], 90, 'DSA total for current week should be 90 mins');
  assert.strictEqual(weekly.totalsBySubject['Web Dev'], 60, 'Web Dev total for current week should be 60 mins');
  assert.strictEqual(weekly.totalsBySubject['AI'], undefined, 'Future week session must not be included');
  assert.strictEqual(weekly.totalWeeklyMinutes, 150, 'Total weekly minutes should be 150');
});

// ---------------------------------------------------------------------------
// 6. CSV Export & Formatting
// ---------------------------------------------------------------------------
console.log('\n📋 Test Group 6: CSV Export Generation');

runTest('formatSessionsToCsv outputs valid RFC-compliant CSV with escaped commas and quotes', () => {
  const sessions = [
    {
      id: 'sess-1',
      date: '2026-10-16',
      subject: 'Math, Calculus',
      duration: 60,
      notes: 'Solved "integrals" problem set',
      createdAt: '2026-10-16T10:00:00Z'
    }
  ];

  const csv = formatSessionsToCsv(sessions);
  assert.ok(csv.includes('ID,Date,Subject,Duration (Minutes),Notes,Created At'));
  assert.ok(csv.includes('"sess-1"'));
  assert.ok(csv.includes('"Math, Calculus"'));
  assert.ok(csv.includes('"Solved ""integrals"" problem set"'));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
