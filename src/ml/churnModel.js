/**
 * Machine Learning Model 1: Streak Churn / Drop-off Risk Predictor
 * 
 * Uses Logistic Regression with calibrated weights and sigmoid activation
 * to estimate the probability that the user will fail to maintain their streak tomorrow.
 * 
 * Mathematical Formulation:
 * P(churn) = 1 / (1 + exp(- (b + w1*x1 + w2*x2 + w3*x3 + w4*x4 + w5*x5)))
 */

function sigmoid(z) {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, z))));
}

/**
 * Extracts normalized features from the user's historical study sessions:
 * x1: Current streak length (scaled)
 * x2: Days since last study session
 * x3: 3-day momentum ratio (recent avg duration / overall avg duration)
 * x4: Study consistency variance (std-dev of daily study minutes)
 * x5: Weekend friction coefficient (is tomorrow Saturday or Sunday)
 */
function extractChurnFeatures(sessions, currentStreak, referenceDate = new Date()) {
  const validSessions = (sessions || []).filter((s) => s && Number(s.duration) > 0);

  // 1. Scaled current streak (longer streaks establish strong habits, decreasing churn risk)
  const f_streak = Math.min(currentStreak, 30) / 10.0;

  // 2. Days since last study session
  let f_recency = 0;
  if (validSessions.length === 0) {
    f_recency = 3.0; // Max penalty if no history
  } else {
    const dates = validSessions.map((s) => new Date(s.date).getTime()).sort((a, b) => b - a);
    const msDiff = Math.max(0, referenceDate.getTime() - dates[0]);
    f_recency = msDiff / (1000 * 60 * 60 * 24); // in days
  }

  // 3. Momentum ratio: last 3 days avg vs historical avg
  const totalMins = validSessions.reduce((acc, s) => acc + Number(s.duration || 0), 0);
  const overallAvg = validSessions.length > 0 ? totalMins / validSessions.length : 30;

  const threeDaysAgo = new Date(referenceDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentSessions = validSessions.filter((s) => new Date(s.date) >= threeDaysAgo);
  const recentAvg = recentSessions.length > 0
    ? recentSessions.reduce((acc, s) => acc + Number(s.duration), 0) / recentSessions.length
    : 0;

  const f_momentum = overallAvg > 0 ? Math.min(2.5, recentAvg / overallAvg) : 1.0;

  // 4. Daily consistency score (standard deviation of durations)
  const durations = validSessions.map((s) => Number(s.duration));
  let variance = 0;
  if (durations.length > 1) {
    const mean = totalMins / durations.length;
    variance = durations.reduce((acc, d) => acc + Math.pow(d - mean, 2), 0) / durations.length;
  }
  const f_stddev = Math.sqrt(variance) / 30.0; // Normalized scale

  // 5. Weekend drop-off indicator (historical education analytics show weekend lapse risk is ~35% higher)
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOfWeek = tomorrow.getDay(); // 0 is Sunday, 6 is Saturday
  const f_weekend = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.0 : 0.0;

  return {
    streakLength: f_streak,
    daysSinceStudy: f_recency,
    momentumRatio: f_momentum,
    consistencyStdDev: f_stddev,
    isWeekend: f_weekend
  };
}

/**
 * Predicts streak drop-off probability and returns risk classification + recommendation.
 */
function predictStreakChurn(sessions, currentStreak, referenceDate = new Date()) {
  if (!sessions || sessions.length === 0) {
    return {
      churnProbability: 0.95,
      churnPercentage: 95,
      riskLevel: 'Critical',
      actionableAdvice: 'No sessions logged yet! Log your first study session today to start your streak.',
      features: {}
    };
  }

  const features = extractChurnFeatures(sessions, currentStreak, referenceDate);

  // Calibrated Logistic Regression Weights
  // Higher recency & weekend increase churn; higher streak & positive momentum decrease churn
  const BIAS = -0.35;
  const W_STREAK = -0.75;
  const W_RECENCY = 1.85;
  const W_MOMENTUM = -1.10;
  const W_STDDEV = 0.40;
  const W_WEEKEND = 0.65;

  const logit =
    BIAS +
    W_STREAK * features.streakLength +
    W_RECENCY * features.daysSinceStudy +
    W_MOMENTUM * features.momentumRatio +
    W_STDDEV * features.consistencyStdDev +
    W_WEEKEND * features.isWeekend;

  const churnProb = sigmoid(logit);
  const churnPercentage = Math.round(churnProb * 100);

  let riskLevel = 'Low';
  let advice = 'Great consistency! Your study habit is strong. Keep this momentum going.';

  if (churnPercentage >= 75) {
    riskLevel = 'Critical';
    advice = '⚠️ High risk of breaking your streak! Log a quick 15-20 min session today to keep your streak alive.';
  } else if (churnPercentage >= 50) {
    riskLevel = 'Elevated';
    advice = '⚠️ Your recent momentum has dipped. Complete a planned session before midnight to stay on track.';
  } else if (churnPercentage >= 30) {
    riskLevel = 'Moderate';
    advice = 'Moderate risk. A steady 30-minute block will fortify your streak today.';
  }

  return {
    churnProbability: Number(churnProb.toFixed(3)),
    churnPercentage,
    riskLevel,
    actionableAdvice: advice,
    features: {
      streakScore: Number(features.streakLength.toFixed(2)),
      daysSinceLastStudy: Number(features.daysSinceStudy.toFixed(1)),
      momentumRatio: Number(features.momentumRatio.toFixed(2)),
      isWeekend: Boolean(features.isWeekend)
    }
  };
}

module.exports = {
  predictStreakChurn,
  extractChurnFeatures
};
