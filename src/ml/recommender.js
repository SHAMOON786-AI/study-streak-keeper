/**
 * Machine Learning Model 3: Smart Subject Recommender & Curriculum Balancer
 * 
 * Uses Multi-Attribute Utility & Time-Decay Scoring to prioritize which
 * subject the user should study next to prevent knowledge decay and maintain balanced learning.
 */

const { toDateKey, diffInDays } = require('../streak');

/**
 * Recommends the next subject to study and the suggested duration.
 */
function recommendNextSubject(sessions, referenceToday = toDateKey(new Date())) {
  const validSessions = (sessions || []).filter((s) => s && Number(s.duration) > 0 && s.subject);

  if (validSessions.length === 0) {
    return {
      recommendedSubject: 'Data Structures & Algorithms',
      suggestedDuration: 45,
      reason: 'Standard core foundational subject to start building your streak.',
      rankedSubjects: []
    };
  }

  // Group stats by subject
  const subjectStats = {};
  for (const s of validSessions) {
    const sub = s.subject.trim();
    if (!subjectStats[sub]) {
      subjectStats[sub] = {
        name: sub,
        totalMinutes: 0,
        sessionCount: 0,
        lastDate: s.date
      };
    }
    subjectStats[sub].totalMinutes += Number(s.duration);
    subjectStats[sub].sessionCount += 1;
    if (toDateKey(s.date) > toDateKey(subjectStats[sub].lastDate)) {
      subjectStats[sub].lastDate = s.date;
    }
  }

  const subjects = Object.values(subjectStats);
  const totalAllMinutes = subjects.reduce((a, b) => a + b.totalMinutes, 0);
  const avgMinutesPerSubject = totalAllMinutes / subjects.length;

  // Calculate Urgency Score for each subject:
  // Score = w_decay * TimeDecay(daysSince) + w_deficit * UnderstudyRatio
  const ranked = subjects.map((sub) => {
    const daysSince = diffInDays(toDateKey(sub.lastDate), referenceToday);
    
    // Exponential forgetting curve proxy: R = 1 - exp(-0.25 * daysSince)
    const decayScore = 1 - Math.exp(-0.25 * Math.max(0, daysSince));

    // Understudied deficit score (1 if studied much less than average, 0 if well ahead)
    const deficitScore = Math.max(0, (avgMinutesPerSubject - sub.totalMinutes) / (avgMinutesPerSubject || 1));

    // Combined Priority Score (0 to 1 scale)
    const priorityScore = 0.65 * decayScore + 0.35 * Math.min(1, deficitScore);

    // Calculate personalized optimal session duration (rounded to nearest 5 mins)
    const avgSession = Math.round(sub.totalMinutes / sub.sessionCount);
    const suggestedDuration = Math.max(25, Math.min(90, Math.round(avgSession / 5) * 5));

    return {
      subject: sub.name,
      priorityScore: Number(priorityScore.toFixed(3)),
      daysSinceLastStudied: Math.max(0, daysSince),
      totalMinutes: sub.totalMinutes,
      suggestedDuration,
      decayLevel: daysSince >= 3 ? 'High' : daysSince >= 1 ? 'Moderate' : 'Low'
    };
  });

  // Sort descending by priority score
  ranked.sort((a, b) => b.priorityScore - a.priorityScore);

  const top = ranked[0];
  let reason = '';
  if (top.daysSinceLastStudied >= 3) {
    reason = `You haven't reviewed ${top.subject} in ${top.daysSinceLastStudied} days. Spaced repetition recommends refreshing this topic now!`;
  } else if (top.totalMinutes < avgMinutesPerSubject) {
    reason = `${top.subject} is currently under-represented compared to your other subjects. Balancing this will optimize your overall progress.`;
  } else {
    reason = `Consistent practice on ${top.subject} will solidify your active learning momentum.`;
  }

  return {
    recommendedSubject: top.subject,
    suggestedDuration: top.suggestedDuration,
    reason,
    rankedSubjects: ranked
  };
}

module.exports = {
  recommendNextSubject
};
