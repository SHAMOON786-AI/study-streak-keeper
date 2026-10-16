const assert = require('assert');
const {
  predictStreakChurn,
  forecastStudyTime,
  recommendNextSubject,
  clusterStudyHabits,
  predictSubjectFromNotes
} = require('../src/ml');

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
console.log('       STUDY STREAK KEEPER - AI/ML TEST SUITE         ');
console.log('======================================================\n');

// 1. Churn Prediction Model
console.log('🤖 Test Group 1: Streak Churn Risk Predictor (Logistic Regression)');

runTest('Churn model outputs calibrated probability between 0 and 1', () => {
  const sessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-15' },
    { subject: 'OS', duration: 45, date: '2026-10-16' }
  ];
  const res = predictStreakChurn(sessions, 2, new Date('2026-10-16T12:00:00Z'));
  assert.ok(res.churnProbability >= 0 && res.churnProbability <= 1);
  assert.ok(res.churnPercentage >= 0 && res.churnPercentage <= 100);
  assert.ok(['Low', 'Moderate', 'Elevated', 'Critical'].includes(res.riskLevel));
});

runTest('High recency (missed days) yields higher churn probability than active study', () => {
  const activeSessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-16' }
  ];
  const staleSessions = [
    { subject: 'DSA', duration: 60, date: '2026-10-10' }
  ];
  const activeRes = predictStreakChurn(activeSessions, 1, new Date('2026-10-16T12:00:00Z'));
  const staleRes = predictStreakChurn(staleSessions, 0, new Date('2026-10-16T12:00:00Z'));

  assert.ok(staleRes.churnProbability > activeRes.churnProbability, 'Stale study history should have higher churn risk');
});

// 2. Time-Series Forecasting
console.log('\n🤖 Test Group 2: Study Time Forecaster (Time-Series Regression)');

runTest('Forecaster projects N future days with positive durations and valid confidence intervals', () => {
  const sessions = [
    { subject: 'DSA', duration: 45, date: '2026-10-14' },
    { subject: 'DSA', duration: 60, date: '2026-10-15' },
    { subject: 'DSA', duration: 50, date: '2026-10-16' }
  ];
  const res = forecastStudyTime(sessions, 3, '2026-10-16');
  assert.strictEqual(res.forecast.length, 3);
  assert.ok(res.projectedTomorrowMinutes > 0);
  res.forecast.forEach((f) => {
    assert.ok(f.predictedMinutes > 0);
    assert.ok(f.confidenceUpper >= f.confidenceLower);
  });
});

// 3. Subject Recommender
console.log('\n🤖 Test Group 3: Spaced Repetition Subject Recommender');

runTest('Recommender prioritizes neglected subject over recently studied subject', () => {
  const sessions = [
    { subject: 'Mathematics', duration: 60, date: '2026-10-10' }, // 6 days ago
    { subject: 'Web Dev', duration: 60, date: '2026-10-16' }       // Today
  ];
  const res = recommendNextSubject(sessions, '2026-10-16');
  assert.strictEqual(res.recommendedSubject, 'Mathematics', 'Should recommend the subject neglected for 6 days');
  assert.ok(res.suggestedDuration >= 25);
});

// 4. Habit Clustering
console.log('\n🤖 Test Group 4: Unsupervised Habit Clustering (K-Means, k=3)');

runTest('K-Means partitions sessions into 3 archetypes and distribution sums to 100%', () => {
  const sessions = [
    { subject: 'A', duration: 25, date: '2026-10-10' },
    { subject: 'B', duration: 50, date: '2026-10-11' },
    { subject: 'C', duration: 90, date: '2026-10-12' },
    { subject: 'D', duration: 30, date: '2026-10-13' }
  ];
  const res = clusterStudyHabits(sessions);
  assert.ok(['Sprint Learner', 'Steady Pacer', 'Deep-Work Marathoner'].includes(res.dominantPersona));
  const sumPct = Object.values(res.distribution).reduce((a, b) => a + b, 0);
  assert.ok(sumPct >= 99 && sumPct <= 101, 'Percentage distribution must sum to approximately 100%');
});

// 5. NLP Topic Classifier
console.log('\n🤖 Test Group 5: NLP Notes Subject Classifier (TF-IDF + Naive Bayes)');

runTest('NLP accurately identifies Data Structures & Algorithms from tree/graph notes', () => {
  const res = predictSubjectFromNotes('practiced binary search tree and Dijkstra shortest path graph traversal');
  assert.strictEqual(res.predictedSubject, 'Data Structures & Algorithms');
  assert.ok(res.confidence > 25);
});

runTest('NLP accurately identifies Operating Systems from concurrency/memory notes', () => {
  const res = predictSubjectFromNotes('studied virtual memory paging and thread deadlock semaphore mutex');
  assert.strictEqual(res.predictedSubject, 'Operating Systems');
  assert.ok(res.confidence > 25);
});

runTest('NLP accurately identifies Web Development from React/Express notes', () => {
  const res = predictSubjectFromNotes('built express rest api endpoints with react frontend components');
  assert.strictEqual(res.predictedSubject, 'Web Development');
  assert.ok(res.confidence > 25);
});

console.log('\n======================================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
