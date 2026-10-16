const { predictStreakChurn } = require('./churnModel');
const { forecastStudyTime } = require('./forecaster');
const { recommendNextSubject } = require('./recommender');
const { clusterStudyHabits } = require('./clusterer');
const { predictSubjectFromNotes } = require('./nlpClassifier');

function generateMlInsights(sessions, currentStreak) {
  const churnAnalysis = predictStreakChurn(sessions, currentStreak);
  const forecastAnalysis = forecastStudyTime(sessions, 3);
  const recommendation = recommendNextSubject(sessions);
  const habitClusters = clusterStudyHabits(sessions);

  return {
    churnRisk: churnAnalysis,
    forecast: forecastAnalysis,
    recommendation,
    habitClusters
  };
}

module.exports = {
  predictStreakChurn,
  forecastStudyTime,
  recommendNextSubject,
  clusterStudyHabits,
  predictSubjectFromNotes,
  generateMlInsights
};
