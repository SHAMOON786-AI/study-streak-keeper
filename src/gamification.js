/**
 * Gamification & Achievement Engine for Study Streak Keeper
 * Evaluates user study milestones, streaks, subject diversity, and assigns unlockable badges.
 */

const { toDateKey, diffInDays } = require('./streak');

const BADGES_DEFINITIONS = [
  {
    id: 'streak_3',
    title: 'Bronze Flame',
    icon: '🥉',
    category: 'Streak',
    description: 'Maintained a 3-day study streak',
    threshold: 3,
    evaluate: (stats) => stats.longestStreak >= 3
  },
  {
    id: 'streak_7',
    title: 'Silver Momentum',
    icon: '🥈',
    category: 'Streak',
    description: 'Maintained a 7-day study streak',
    threshold: 7,
    evaluate: (stats) => stats.longestStreak >= 7
  },
  {
    id: 'streak_14',
    title: 'Golden Consistency',
    icon: '🥇',
    category: 'Streak',
    description: 'Maintained an unbroken 14-day study streak',
    threshold: 14,
    evaluate: (stats) => stats.longestStreak >= 14
  },
  {
    id: 'streak_30',
    title: 'Diamond Discipline',
    icon: '💎',
    category: 'Streak',
    description: 'Achieved an epic 30-day streak milestone',
    threshold: 30,
    evaluate: (stats) => stats.longestStreak >= 30
  },
  {
    id: 'century_session',
    title: 'Century Club',
    icon: '⚡',
    category: 'Dedication',
    description: 'Logged a single study session of 100+ minutes',
    threshold: 100,
    evaluate: (stats, sessions) => sessions.some((s) => Number(s.duration) >= 100)
  },
  {
    id: 'polymath',
    title: 'Polymath Learner',
    icon: '🧠',
    category: 'Diversity',
    description: 'Studied at least 4 distinct academic subjects',
    threshold: 4,
    evaluate: (stats, sessions) => {
      const uniqueSubjects = new Set(sessions.map((s) => s.subject.trim()));
      return uniqueSubjects.size >= 4;
    }
  },
  {
    id: 'ten_hours',
    title: 'Mastery Novice',
    icon: '⏱️',
    category: 'Hours',
    description: 'Accumulated over 10 hours (600 mins) of total study time',
    threshold: 600,
    evaluate: (stats) => stats.totalMinutes >= 600
  },
  {
    id: 'night_owl',
    title: 'Night Owl Scholar',
    icon: '🦉',
    category: 'Dedication',
    description: 'Logged a late-night study session (after 10:00 PM)',
    threshold: 1,
    evaluate: (stats, sessions) => {
      return sessions.some((s) => {
        if (!s.createdAt) return false;
        const hr = new Date(s.createdAt).getHours();
        return hr >= 22 || hr < 4;
      });
    }
  }
];

/**
 * Evaluates all badges and returns unlock statuses and overall progress.
 */
function evaluateAchievements(stats, sessions) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const badges = BADGES_DEFINITIONS.map((b) => {
    const isUnlocked = b.evaluate(stats, safeSessions);
    return {
      id: b.id,
      title: b.title,
      icon: b.icon,
      category: b.category,
      description: b.description,
      unlocked: Boolean(isUnlocked)
    };
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const completionPercentage = Math.round((unlockedCount / badges.length) * 100);

  return {
    badges,
    unlockedCount,
    totalBadges: badges.length,
    completionPercentage
  };
}

/**
 * Builds a 90-day GitHub-style calendar activity heatmap.
 * Returns an array of 90 daily objects with date, minutes, level (0 to 4), and sessionsCount.
 */
function generateActivityHeatmap(sessions, referenceToday = toDateKey(new Date())) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const [y, m, d] = referenceToday.split('-').map(Number);

  const daysCount = 91; // 13 weeks of 7 days
  const dailyMap = {};
  const heatmapDays = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - i);
    const dateStr = dt.toISOString().slice(0, 10);
    dailyMap[dateStr] = {
      date: dateStr,
      minutes: 0,
      sessionsCount: 0,
      subjects: []
    };
    heatmapDays.push(dateStr);
  }

  for (const s of safeSessions) {
    if (!s || !s.date || Number(s.duration) <= 0) continue;
    const dateStr = toDateKey(s.date);
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].minutes += Number(s.duration);
      dailyMap[dateStr].sessionsCount += 1;
      if (s.subject && !dailyMap[dateStr].subjects.includes(s.subject)) {
        dailyMap[dateStr].subjects.push(s.subject);
      }
    }
  }

  return heatmapDays.map((dateStr) => {
    const item = dailyMap[dateStr];
    // Assign intensity level (0 = none, 1 = 1-30m, 2 = 31-60m, 3 = 61-90m, 4 = >90m)
    let level = 0;
    if (item.minutes > 90) level = 4;
    else if (item.minutes > 60) level = 3;
    else if (item.minutes > 30) level = 2;
    else if (item.minutes > 0) level = 1;

    return {
      date: dateStr,
      minutes: item.minutes,
      sessionsCount: item.sessionsCount,
      subjects: item.subjects,
      level
    };
  });
}

module.exports = {
  BADGES_DEFINITIONS,
  evaluateAchievements,
  generateActivityHeatmap
};
