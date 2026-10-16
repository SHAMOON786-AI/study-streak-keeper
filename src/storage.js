const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'sessions.json');

// Default initial sample data if file is newly created
const SAMPLE_SESSIONS = [
  {
    id: 'seed-session-1',
    subject: 'Data Structures & Algorithms',
    duration: 60,
    date: getOffsetDateString(-3),
    notes: 'Practiced Binary Trees and Graph Traversals',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'seed-session-2',
    subject: 'Operating Systems',
    duration: 45,
    date: getOffsetDateString(-2),
    notes: 'Studied Memory Management and Virtual Memory',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'seed-session-3',
    subject: 'Web Development',
    duration: 90,
    date: getOffsetDateString(-1),
    notes: 'Built REST APIs and front-end dashboard components',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'seed-session-4',
    subject: 'Database Systems',
    duration: 50,
    date: getOffsetDateString(0),
    notes: 'SQL indexing and query optimization',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ensureStorageExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SAMPLE_SESSIONS, null, 2), 'utf-8');
  }
}

function getAllSessions() {
  ensureStorageExists();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading sessions.json:', err);
    return [];
  }
}

function saveAllSessions(sessions) {
  ensureStorageExists();
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

function getSessionById(id) {
  const sessions = getAllSessions();
  return sessions.find((s) => s.id === id) || null;
}

function createSession({ subject, duration, date, notes = '' }) {
  const sessions = getAllSessions();
  const now = new Date().toISOString();
  const newSession = {
    id: crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    subject: String(subject).trim(),
    duration: Number(duration),
    date: String(date).trim(),
    notes: String(notes || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  sessions.push(newSession);
  saveAllSessions(sessions);
  return newSession;
}

function updateSession(id, updates) {
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) {
    return null;
  }

  const existing = sessions[index];
  const updated = {
    ...existing,
    subject: updates.subject !== undefined ? String(updates.subject).trim() : existing.subject,
    duration: updates.duration !== undefined ? Number(updates.duration) : existing.duration,
    date: updates.date !== undefined ? String(updates.date).trim() : existing.date,
    notes: updates.notes !== undefined ? String(updates.notes).trim() : existing.notes,
    updatedAt: new Date().toISOString()
  };

  sessions[index] = updated;
  saveAllSessions(sessions);
  return updated;
}

function deleteSession(id) {
  const sessions = getAllSessions();
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) {
    return false;
  }
  sessions.splice(index, 1);
  saveAllSessions(sessions);
  return true;
}

const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');

const DEFAULT_PROFILE = {
  weeklyGoalMinutes: 600, // 10 hours target
  streakFreezesAvailable: 1,
  freezeHistory: []
};

function getUserProfile() {
  ensureStorageExists();
  if (!fs.existsSync(PROFILE_FILE)) {
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2), 'utf-8');
    return { ...DEFAULT_PROFILE };
  }
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function updateUserProfile(updates) {
  const current = getUserProfile();
  const updated = {
    ...current,
    ...updates
  };
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

function activateStreakFreeze(freezeDate) {
  const profile = getUserProfile();
  if (profile.streakFreezesAvailable <= 0) {
    return { success: false, error: 'No streak freezes currently available. Earn freezes through consistent study.' };
  }
  profile.streakFreezesAvailable -= 1;
  profile.freezeHistory.push({
    date: freezeDate,
    activatedAt: new Date().toISOString()
  });
  updateUserProfile(profile);
  return { success: true, profile };
}

function importAllSessions(newSessions) {
  if (!Array.isArray(newSessions)) {
    throw new Error('Import data must be a valid array of sessions.');
  }
  saveAllSessions(newSessions);
  return newSessions.length;
}

module.exports = {
  getAllSessions,
  saveAllSessions,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  getUserProfile,
  updateUserProfile,
  activateStreakFreeze,
  importAllSessions
};
