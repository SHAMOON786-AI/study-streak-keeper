/**
 * Normalizes any date string or ISO timestamp to a local YYYY-MM-DD calendar date string.
 * This handles midnight boundary cases cleanly when given either 'YYYY-MM-DD' or full timestamps.
 */
function toDateKey(dateInput) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the difference in calendar days between two 'YYYY-MM-DD' strings (dateB - dateA).
 */
function diffInDays(dateKeyA, dateKeyB) {
  const [yA, mA, dA] = dateKeyA.split('-').map(Number);
  const [yB, mB, dB] = dateKeyB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates currentStreak and longestStreak (in days) from a list of study sessions.
 * 
 * Rules:
 * 1. Multiple sessions on the same calendar day count as only ONE streak day.
 * 2. Missed days reset the running streak to 0 or 1 upon resuming, while the historical
 *    longest streak is always preserved.
 * 3. A current streak is active if the user has studied today (0 days ago) OR yesterday (1 day ago),
 *    giving the user until the end of today to log their study session.
 * 4. Sessions occurring across midnight (e.g. 23:59 vs 00:01) belong to their respective
 *    calendar days and count as consecutive days.
 * 
 * @param {Array<{date: string, duration: number, subject: string}>} sessions
 * @param {string} [referenceToday] - Optional 'YYYY-MM-DD' for deterministic testing (defaults to today)
 */
function calculateStreaks(sessions, referenceToday = toDateKey(new Date())) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Filter valid sessions with positive duration and a valid date
  const validSessions = sessions.filter((s) => s && Number(s.duration) > 0 && s.date);
  if (validSessions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Deduplicate multiple sessions on the same calendar day and sort ascending
  const uniqueDates = Array.from(
    new Set(validSessions.map((s) => toDateKey(s.date)))
  ).sort();

  // 1. Calculate Longest Streak historically
  let longestStreak = 1;
  let runningStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const gap = diffInDays(uniqueDates[i - 1], uniqueDates[i]);
    if (gap === 1) {
      runningStreak += 1;
      if (runningStreak > longestStreak) {
        longestStreak = runningStreak;
      }
    } else if (gap > 1) {
      runningStreak = 1; // Missed day resets running streak
    }
  }

  // 2. Calculate Current Streak relative to today
  const todayKey = toDateKey(referenceToday);
  // Exclude accidental future dates when computing current streak
  const datesUpToToday = uniqueDates.filter((d) => diffInDays(d, todayKey) >= 0);

  if (datesUpToToday.length === 0) {
    return { currentStreak: 0, longestStreak };
  }

  const lastStudyDate = datesUpToToday[datesUpToToday.length - 1];
  const daysSinceLastStudy = diffInDays(lastStudyDate, todayKey);

  // Streak is considered broken if the last study date was more than 1 day ago (missed yesterday and today)
  if (daysSinceLastStudy > 1) {
    return { currentStreak: 0, longestStreak };
  }

  let currentStreak = 1;
  for (let i = datesUpToToday.length - 1; i > 0; i--) {
    const gap = diffInDays(datesUpToToday[i - 1], datesUpToToday[i]);
    if (gap === 1) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculates total study time (in minutes) per subject for the current week (Monday - Sunday).
 * @param {Array} sessions 
 * @param {string} [referenceToday] 
 */
function calculateWeeklySubjectTotals(sessions, referenceToday = toDateKey(new Date())) {
  if (!Array.isArray(sessions)) sessions = [];
  const todayKey = toDateKey(referenceToday);
  const [y, m, d] = todayKey.split('-').map(Number);
  const refDate = new Date(Date.UTC(y, m - 1, d));

  // Get Monday of the current week (ISO week: Monday = 1 ... Sunday = 0 -> 7)
  const dayOfWeek = refDate.getUTCDay() || 7;
  const mondayUTC = new Date(refDate);
  mondayUTC.setUTCDate(refDate.getUTCDate() - dayOfWeek + 1);

  const sundayUTC = new Date(mondayUTC);
  sundayUTC.setUTCDate(mondayUTC.getUTCDate() + 6);

  const startOfWeek = mondayUTC.toISOString().slice(0, 10);
  const endOfWeek = sundayUTC.toISOString().slice(0, 10);

  const totalsBySubject = {};
  let totalWeeklyMinutes = 0;

  for (const session of sessions) {
    if (!session || !session.date || !session.subject) continue;
    const sessionDuration = Number(session.duration || 0);
    if (sessionDuration <= 0) continue;

    const sessionDate = toDateKey(session.date);
    if (sessionDate >= startOfWeek && sessionDate <= endOfWeek) {
      const subject = session.subject.trim();
      totalsBySubject[subject] = (totalsBySubject[subject] || 0) + sessionDuration;
      totalWeeklyMinutes += sessionDuration;
    }
  }

  return {
    weekStart: startOfWeek,
    weekEnd: endOfWeek,
    totalsBySubject,
    totalWeeklyMinutes
  };
}

/**
 * Aggregates daily study minutes over the last N days (for charts).
 */
function calculateDailyTotals(sessions, days = 14, referenceToday = toDateKey(new Date())) {
  if (!Array.isArray(sessions)) sessions = [];
  const todayKey = toDateKey(referenceToday);
  const [y, m, d] = todayKey.split('-').map(Number);

  // Build array of dates from (today - days + 1) to today
  const dailyMap = {};
  const dateList = [];
  for (let i = days - 1; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - i);
    const dateStr = dt.toISOString().slice(0, 10);
    dateList.push(dateStr);
    dailyMap[dateStr] = {
      date: dateStr,
      minutes: 0,
      sessionsCount: 0,
      subjects: {}
    };
  }

  for (const session of sessions) {
    if (!session || !session.date || Number(session.duration) <= 0) continue;
    const sessionDate = toDateKey(session.date);
    if (dailyMap[sessionDate]) {
      const duration = Number(session.duration);
      dailyMap[sessionDate].minutes += duration;
      dailyMap[sessionDate].sessionsCount += 1;
      const sub = (session.subject || 'General').trim();
      dailyMap[sessionDate].subjects[sub] = (dailyMap[sessionDate].subjects[sub] || 0) + duration;
    }
  }

  return dateList.map((d) => dailyMap[d]);
}

/**
 * Converts sessions to a formatted CSV string.
 */
function formatSessionsToCsv(sessions) {
  const headers = ['ID', 'Date', 'Subject', 'Duration (Minutes)', 'Notes', 'Created At'];
  const rows = [headers.join(',')];

  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  for (const s of sessions) {
    rows.push([
      escapeCsvCell(s.id),
      escapeCsvCell(s.date),
      escapeCsvCell(s.subject),
      escapeCsvCell(s.duration),
      escapeCsvCell(s.notes || ''),
      escapeCsvCell(s.createdAt || '')
    ].join(','));
  }

  return rows.join('\r\n');
}

module.exports = {
  toDateKey,
  diffInDays,
  calculateStreaks,
  calculateWeeklySubjectTotals,
  calculateDailyTotals,
  formatSessionsToCsv
};
