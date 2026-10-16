const assert = require('assert');
const {
  BADGES_DEFINITIONS,
  evaluateAchievements,
  generateActivityHeatmap
} = require('../src/gamification');

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
console.log('   STUDY STREAK KEEPER - GAMIFICATION & HEATMAP TESTS ');
console.log('======================================================\n');

// 1. Badges & Achievements
console.log('🏆 Test Group 1: Milestone & Badge Evaluator');

runTest('Evaluates exactly 8 milestone badges with valid metadata', () => {
  const stats = { currentStreak: 3, longestStreak: 3, totalMinutes: 180 };
  const sessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-14' },
    { subject: 'OS', duration: 60, date: '2026-10-15' },
    { subject: 'DBMS', duration: 60, date: '2026-10-16' }
  ];
  const res = evaluateAchievements(stats, sessions);
  assert.strictEqual(res.totalBadges, 8);
  assert.ok(res.badges.some((b) => b.id === 'streak_3' && b.unlocked));
  assert.ok(res.badges.some((b) => b.id === 'streak_7' && !b.unlocked));
});

runTest('Polymath badge unlocks only when user studies at least 4 distinct subjects', () => {
  const stats = { currentStreak: 4, longestStreak: 4, totalMinutes: 200 };
  const threeSubjects = [
    { subject: 'DSA', duration: 50, date: '2026-10-13' },
    { subject: 'OS', duration: 50, date: '2026-10-14' },
    { subject: 'Web Dev', duration: 50, date: '2026-10-15' }
  ];
  const fourSubjects = [
    ...threeSubjects,
    { subject: 'Calculus', duration: 50, date: '2026-10-16' }
  ];

  const res3 = evaluateAchievements(stats, threeSubjects);
  const res4 = evaluateAchievements(stats, fourSubjects);

  const poly3 = res3.badges.find((b) => b.id === 'polymath');
  const poly4 = res4.badges.find((b) => b.id === 'polymath');

  assert.strictEqual(poly3.unlocked, false);
  assert.strictEqual(poly4.unlocked, true);
});

// 2. 90-Day Contribution Heatmap
console.log('\n📅 Test Group 2: 90-Day Activity Heatmap Matrix');

runTest('Generates exactly 91 contiguous days with correct intensity levels (0-4)', () => {
  const sessions = [
    { subject: 'DSA', duration: 25, date: '2026-10-15' },   // level 1 (1-30m)
    { subject: 'OS', duration: 45, date: '2026-10-16' },    // level 2 (31-60m)
    { subject: 'DBMS', duration: 75, date: '2026-10-14' },  // level 3 (61-90m)
    { subject: 'Math', duration: 120, date: '2026-10-13' }  // level 4 (>90m)
  ];

  const heatmap = generateActivityHeatmap(sessions, '2026-10-16');
  assert.strictEqual(heatmap.length, 91, 'Must contain 91 days (13 full weeks)');

  const day13 = heatmap.find((d) => d.date === '2026-10-13');
  const day14 = heatmap.find((d) => d.date === '2026-10-14');
  const day15 = heatmap.find((d) => d.date === '2026-10-15');
  const day16 = heatmap.find((d) => d.date === '2026-10-16');
  const unstudiedDay = heatmap.find((d) => d.date === '2026-09-01');

  assert.strictEqual(day13.level, 4);
  assert.strictEqual(day14.level, 3);
  assert.strictEqual(day15.level, 1);
  assert.strictEqual(day16.level, 2);
  assert.strictEqual(unstudiedDay.level, 0);
});

console.log('\n======================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
