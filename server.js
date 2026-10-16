const express = require('express');
const cors = require('cors');
const path = require('path');
const storage = require('./src/storage');
const {
  calculateStreaks,
  calculateWeeklySubjectTotals,
  calculateDailyTotals,
  formatSessionsToCsv,
  toDateKey
} = require('./src/streak');
const ml = require('./src/ml');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// REST API Endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/sessions
 * List all sessions, optionally sorted by date (newest first).
 */
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = storage.getAllSessions();
    const sorted = [...sessions].sort((a, b) => {
      const dateA = toDateKey(a.date);
      const dateB = toDateKey(b.date);
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    res.json({ success: true, count: sorted.length, data: sorted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/sessions
 * Log a new study session.
 * Body: { subject, duration, date, notes }
 */
app.post('/api/sessions', (req, res) => {
  try {
    const { subject, duration, date, notes } = req.body;

    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return res.status(400).json({ success: false, error: 'Subject is required.' });
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return res.status(400).json({ success: false, error: 'Duration must be a positive number in minutes.' });
    }

    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required.' });
    }

    // Validate date format
    let normalizedDate;
    try {
      normalizedDate = toDateKey(date);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid date provided.' });
    }

    const newSession = storage.createSession({
      subject: subject.trim(),
      duration: durationNum,
      date: normalizedDate,
      notes: (notes || '').trim()
    });

    res.status(201).json({ success: true, message: 'Session logged successfully.', data: newSession });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/sessions/:id
 * Retrieve a single study session.
 */
app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = storage.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/sessions/:id
 * Edit a past study session.
 */
app.put('/api/sessions/:id', (req, res) => {
  try {
    const { subject, duration, date, notes } = req.body;
    const existing = storage.getSessionById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }

    const updates = {};
    if (subject !== undefined) {
      if (typeof subject !== 'string' || subject.trim() === '') {
        return res.status(400).json({ success: false, error: 'Subject cannot be empty.' });
      }
      updates.subject = subject.trim();
    }

    if (duration !== undefined) {
      const dur = Number(duration);
      if (isNaN(dur) || dur <= 0) {
        return res.status(400).json({ success: false, error: 'Duration must be a positive number.' });
      }
      updates.duration = dur;
    }

    if (date !== undefined) {
      try {
        updates.date = toDateKey(date);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid date.' });
      }
    }

    if (notes !== undefined) {
      updates.notes = String(notes).trim();
    }

    const updated = storage.updateSession(req.params.id, updates);
    res.json({ success: true, message: 'Session updated successfully.', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a past study session.
 */
app.delete('/api/sessions/:id', (req, res) => {
  try {
    const success = storage.deleteSession(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Session not found.' });
    }
    res.json({ success: true, message: 'Session deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/stats
 * Get computed streak analytics, current week per-subject totals, and chart data.
 */
app.get('/api/stats', (req, res) => {
  try {
    const sessions = storage.getAllSessions();
    const streaks = calculateStreaks(sessions);
    const weekly = calculateWeeklySubjectTotals(sessions);
    const dailyTrend = calculateDailyTotals(sessions, 14);

    // Calculate overall totals
    let totalMinutes = 0;
    const subjectDistribution = {};
    for (const s of sessions) {
      const dur = Number(s.duration || 0);
      if (dur > 0) {
        totalMinutes += dur;
        const sub = (s.subject || 'General').trim();
        subjectDistribution[sub] = (subjectDistribution[sub] || 0) + dur;
      }
    }

    const mlInsights = ml.generateMlInsights(sessions, streaks.currentStreak);

    res.json({
      success: true,
      data: {
        currentStreak: streaks.currentStreak,
        longestStreak: streaks.longestStreak,
        totalSessions: sessions.length,
        totalMinutes,
        weekly,
        dailyTrend,
        subjectDistribution,
        mlInsights
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ml/insights
 * Returns ML churn prediction, time-series forecasting, recommendations & clusters.
 */
app.get('/api/ml/insights', (req, res) => {
  try {
    const sessions = storage.getAllSessions();
    const streaks = calculateStreaks(sessions);
    const insights = ml.generateMlInsights(sessions, streaks.currentStreak);
    res.json({ success: true, data: insights });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ml/predict-subject
 * NLP inference: predicts subject category from natural language notes.
 * Body: { notes: string }
 */
app.post('/api/ml/predict-subject', (req, res) => {
  try {
    const { notes } = req.body;
    const prediction = ml.predictSubjectFromNotes(notes || '');
    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/export/csv
 * Export all logged study sessions as a downloadable CSV file.
 */
app.get('/api/export/csv', (req, res) => {
  try {
    const sessions = storage.getAllSessions();
    const csvData = formatSessionsToCsv(sessions);
    const filename = `study-sessions-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvData);
  } catch (err) {
    res.status(500).send('Error generating CSV: ' + err.message);
  }
});

// Fallback to index.html for SPA/Web App routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Study Streak Keeper server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
