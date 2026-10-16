/**
 * Machine Learning Model 4: Study Habit Persona Clustering (K-Means, k=3)
 * 
 * Unsupervised clustering of study sessions based on duration and intensity,
 * revealing the student's primary study archetype:
 * - Cluster 0: "Sprint Learner" (Short, focused 15-30m bursts)
 * - Cluster 1: "Steady Pacer" (Balanced 35-65m focus blocks)
 * - Cluster 2: "Deep-Work Marathoner" (Intense 70-120m deep dives)
 */

function clusterStudyHabits(sessions) {
  const valid = (sessions || []).filter((s) => s && Number(s.duration) > 0);

  if (valid.length < 3) {
    return {
      dominantPersona: 'Steady Pacer',
      personaDescription: 'Consistent, balanced study blocks ideal for daily streak retention.',
      distribution: { 'Sprint Learner': 0, 'Steady Pacer': 100, 'Deep-Work Marathoner': 0 },
      clusters: []
    };
  }

  // Extract 1D/2D feature vectors: [duration]
  const data = valid.map((s) => Number(s.duration));

  // Initialize centroids
  let centroids = [25, 50, 90]; // Sprint, Steady, Marathon initial seeds
  const k = 3;
  let assignments = new Array(data.length).fill(0);

  // K-Means iterations (converges quickly for 1D duration features)
  for (let iter = 0; iter < 10; iter++) {
    // Expectation Step: assign each session to closest centroid
    for (let i = 0; i < data.length; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = Math.abs(data[i] - centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      assignments[i] = bestCluster;
    }

    // Maximization Step: recalculate centroids
    const sums = [0, 0, 0];
    const counts = [0, 0, 0];
    for (let i = 0; i < data.length; i++) {
      const c = assignments[i];
      sums[c] += data[i];
      counts[c] += 1;
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c] = Math.round(sums[c] / counts[c]);
      }
    }
  }

  // Sort centroids so index 0 = lowest duration (Sprint), 1 = mid (Steady), 2 = highest (Deep)
  const labeledCentroids = centroids
    .map((val, idx) => ({ centroid: val, originalIndex: idx }))
    .sort((a, b) => a.centroid - b.centroid);

  const archetypeNames = ['Sprint Learner', 'Steady Pacer', 'Deep-Work Marathoner'];
  const clusterMapping = {};
  labeledCentroids.forEach((item, sortedIdx) => {
    clusterMapping[item.originalIndex] = archetypeNames[sortedIdx];
  });

  // Calculate cluster breakdown
  const counts = { 'Sprint Learner': 0, 'Steady Pacer': 0, 'Deep-Work Marathoner': 0 };
  assignments.forEach((c) => {
    const name = clusterMapping[c];
    counts[name] = (counts[name] || 0) + 1;
  });

  const total = assignments.length;
  const distribution = {
    'Sprint Learner': Math.round((counts['Sprint Learner'] / total) * 100),
    'Steady Pacer': Math.round((counts['Steady Pacer'] / total) * 100),
    'Deep-Work Marathoner': Math.round((counts['Deep-Work Marathoner'] / total) * 100)
  };

  // Determine dominant persona
  let dominantPersona = 'Steady Pacer';
  let maxCount = -1;
  for (const [name, cnt] of Object.entries(counts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      dominantPersona = name;
    }
  }

  const descriptions = {
    'Sprint Learner': 'You thrive on quick, high-frequency study bursts (Pomodoro style) that fit flexibly into busy schedules.',
    'Steady Pacer': 'You excel at balanced, sustainable sessions (40-60 mins), the most effective rhythm for long-term streak longevity.',
    'Deep-Work Marathoner': 'You are a deep-focus specialist, immersing yourself in extensive uninterrupted blocks to conquer complex material.'
  };

  return {
    dominantPersona,
    personaDescription: descriptions[dominantPersona],
    distribution,
    centroids: labeledCentroids.map((c, i) => ({
      archetype: archetypeNames[i],
      averageDurationMinutes: c.centroid,
      sessionsCount: counts[archetypeNames[i]]
    }))
  };
}

module.exports = {
  clusterStudyHabits
};
