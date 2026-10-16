// State
let allSessions = [];
let chartInstance = null;

// DOM Elements
const metricCurrentStreak = document.getElementById('metricCurrentStreak');
const metricLongestStreak = document.getElementById('metricLongestStreak');
const metricWeeklyTime = document.getElementById('metricWeeklyTime');
const metricWeekRange = document.getElementById('metricWeekRange');
const metricTotalTime = document.getElementById('metricTotalTime');
const metricTotalSessions = document.getElementById('metricTotalSessions');
const streakStatusBadge = document.getElementById('streakStatusBadge');

const weeklySubjectList = document.getElementById('weeklySubjectList');
const weeklyRangeLabel = document.getElementById('weeklyRangeLabel');

const sessionForm = document.getElementById('sessionForm');
const inputSubject = document.getElementById('inputSubject');
const inputDuration = document.getElementById('inputDuration');
const inputDate = document.getElementById('inputDate');
const inputNotes = document.getElementById('inputNotes');
const btnSubmitSession = document.getElementById('btnSubmitSession');

const sessionsTableBody = document.getElementById('sessionsTableBody');
const searchInput = document.getElementById('searchInput');
const filterSubject = document.getElementById('filterSubject');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnOpenLogModal = document.getElementById('btnOpenLogModal');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editSessionId = document.getElementById('editSessionId');
const editSubject = document.getElementById('editSubject');
const editDuration = document.getElementById('editDuration');
const editDate = document.getElementById('editDate');
const editNotes = document.getElementById('editNotes');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelEdit = document.getElementById('btnCancelEdit');

const toastContainer = document.getElementById('toastContainer');

// Utility: Format today's date YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility: Format minutes to Xh Ym
function formatMinutes(mins) {
  const m = Number(mins) || 0;
  const hours = Math.floor(m / 60);
  const remainingMins = m % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMins}m`;
  }
  return `${remainingMins}m`;
}

// Show Toast
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠️'}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch and Render Dashboard Data
async function loadDashboard() {
  try {
    const [statsRes, sessionsRes] = await Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/sessions').then((r) => r.json())
    ]);

    if (statsRes.success) {
      renderStats(statsRes.data);
      renderChart(statsRes.data.dailyTrend, statsRes.data.mlInsights?.forecast);
      renderWeeklyBreakdown(statsRes.data.weekly);
      if (statsRes.data.mlInsights) {
        renderMlInsights(statsRes.data.mlInsights);
      }
    }

    if (sessionsRes.success) {
      allSessions = sessionsRes.data;
      updateSubjectFilterOptions(allSessions);
      renderSessionsTable();
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    showToast('Failed to connect to server.', 'error');
  }
}

// Render Header & Top Metrics
function renderStats(stats) {
  metricCurrentStreak.textContent = stats.currentStreak;
  metricLongestStreak.textContent = stats.longestStreak;
  metricTotalTime.textContent = formatMinutes(stats.totalMinutes);
  metricTotalSessions.textContent = `${stats.totalSessions} logged session${stats.totalSessions === 1 ? '' : 's'}`;

  // Streak status badge
  if (stats.currentStreak > 0) {
    streakStatusBadge.className = 'status-badge status-active';
    streakStatusBadge.textContent = 'Active Streak 🔥';
  } else {
    streakStatusBadge.className = 'status-badge status-inactive';
    streakStatusBadge.textContent = 'Streak Inactive';
  }

  // Weekly stats
  if (stats.weekly) {
    metricWeeklyTime.textContent = formatMinutes(stats.weekly.totalWeeklyMinutes);
    metricWeekRange.textContent = `${stats.weekly.weekStart} to ${stats.weekly.weekEnd}`;
    weeklyRangeLabel.textContent = `Week of ${stats.weekly.weekStart} – ${stats.weekly.weekEnd}`;
  }
}

// Render Weekly Subject Breakdown
function renderWeeklyBreakdown(weekly) {
  if (!weekly || !weekly.totalsBySubject || Object.keys(weekly.totalsBySubject).length === 0) {
    weeklySubjectList.innerHTML = '<div class="empty-state">No study sessions recorded for the current week yet.</div>';
    return;
  }

  const entries = Object.entries(weekly.totalsBySubject).sort((a, b) => b[1] - a[1]);
  const maxMins = Math.max(...entries.map((e) => e[1])) || 1;

  weeklySubjectList.innerHTML = entries
    .map(([subject, mins]) => {
      const percentage = Math.min(100, Math.round((mins / maxMins) * 100));
      return `
        <div class="subject-item">
          <div class="subject-header-row">
            <span class="subject-name">${escapeHtml(subject)}</span>
            <span class="subject-duration">${formatMinutes(mins)}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Render Daily Study Time Chart (Chart.js with Canvas Fallback & ML Forecast)
function renderChart(dailyTrend, forecastData) {
  if (!dailyTrend || dailyTrend.length === 0) return;

  const canvas = document.getElementById('studyChart');
  const ctx = canvas.getContext('2d');
  
  const labels = dailyTrend.map((d) => {
    const parts = d.date.split('-');
    return `${parts[1]}/${parts[2]}`;
  });
  const actualData = dailyTrend.map((d) => d.minutes);

  // Append ML forecast points if available
  let forecastDataPoints = new Array(actualData.length).fill(null);
  if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
    // Connect continuous point from last actual day
    forecastDataPoints[actualData.length - 1] = actualData[actualData.length - 1];
    forecastData.forecast.forEach((fc) => {
      const parts = fc.date.split('-');
      labels.push(`${parts[1]}/${parts[2]} (FC)`);
      actualData.push(null);
      forecastDataPoints.push(fc.predictedMinutes);
    });
  }

  // If Chart.js is loaded
  if (typeof Chart !== 'undefined') {
    if (chartInstance) {
      chartInstance.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(255, 120, 40, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 120, 40, 0.0)');

    const datasets = [
      {
        label: 'Recorded Study Minutes',
        data: actualData,
        fill: true,
        backgroundColor: gradient,
        borderColor: '#ff7828',
        borderWidth: 2.5,
        pointBackgroundColor: '#ff7828',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35
      }
    ];

    if (forecastData && forecastData.forecast && forecastData.forecast.length > 0) {
      datasets.push({
        label: 'ML Forecast (Predicted)',
        data: forecastDataPoints,
        fill: false,
        borderColor: '#06b6d4',
        borderWidth: 2,
        borderDash: [5, 5],
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35
      });
    }

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                return ` ${label}: ${context.parsed.y} mins`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: function (val) {
                return val + 'm';
              }
            }
          }
        }
      }
    });
  } else {
    // Pure Canvas fallback renderer if Chart.js CDN is unavailable
    renderCanvasFallback(canvas, labels, actualData.filter((x) => x !== null));
  }
}

// Fallback HTML5 Canvas Chart
function renderCanvasFallback(canvas, labels, data) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width || 600;
  const height = canvas.height || 230;
  ctx.clearRect(0, 0, width, height);

  const maxVal = Math.max(...data, 60);
  const padding = 40;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  // Draw axis
  ctx.strokeStyle = '#233149';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw line
  ctx.strokeStyle = '#ff7828';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const stepX = chartW / (data.length - 1 || 1);
  data.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (val / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw points
  data.forEach((val, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (val / maxVal) * chartH;
    ctx.fillStyle = '#ff7828';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Update Subject Filter Dropdown
function updateSubjectFilterOptions(sessions) {
  const currentVal = filterSubject.value;
  const subjects = Array.from(new Set(sessions.map((s) => s.subject).filter(Boolean))).sort();

  filterSubject.innerHTML = '<option value="all">All Subjects</option>';
  subjects.forEach((sub) => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    if (sub === currentVal) opt.selected = true;
    filterSubject.appendChild(opt);
  });
}

// Render Past Sessions Table
function renderSessionsTable() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedSubject = filterSubject.value;

  const filtered = allSessions.filter((s) => {
    const matchesSubject = selectedSubject === 'all' || s.subject === selectedSubject;
    const matchesQuery =
      !query ||
      (s.subject && s.subject.toLowerCase().includes(query)) ||
      (s.notes && s.notes.toLowerCase().includes(query)) ||
      (s.date && s.date.includes(query));
    return matchesSubject && matchesQuery;
  });

  if (filtered.length === 0) {
    sessionsTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No matching study sessions found.</td>
      </tr>
    `;
    return;
  }

  sessionsTableBody.innerHTML = filtered
    .map((s) => {
      return `
        <tr data-id="${s.id}">
          <td class="session-date-col">${s.date}</td>
          <td><span class="session-subject-badge">${escapeHtml(s.subject)}</span></td>
          <td><span class="session-duration-tag">${s.duration} min</span> <small style="color:var(--text-muted)">(${formatMinutes(s.duration)})</small></td>
          <td class="session-notes" title="${escapeHtml(s.notes || '')}">${s.notes ? escapeHtml(s.notes) : '<em style="color:var(--text-muted)">No notes</em>'}</td>
          <td class="text-right">
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm btn-edit" data-id="${s.id}">Edit</button>
              <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${s.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // Attach event listeners to Edit and Delete buttons
  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => confirmDeleteSession(btn.dataset.id));
  });
}

// Log New Session Form Submission
sessionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    subject: inputSubject.value.trim(),
    duration: Number(inputDuration.value),
    date: inputDate.value,
    notes: inputNotes.value.trim()
  };

  btnSubmitSession.disabled = true;
  btnSubmitSession.textContent = 'Saving...';

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast('Study session logged successfully!');
      inputSubject.value = '';
      inputDuration.value = '';
      inputNotes.value = '';
      inputDate.value = getTodayString();
      await loadDashboard();
    } else {
      showToast(result.error || 'Failed to save session.', 'error');
    }
  } catch (err) {
    showToast('Network error while saving session.', 'error');
  } finally {
    btnSubmitSession.disabled = false;
    btnSubmitSession.innerHTML = '<span>Save Session</span>';
  }
});

// Edit Session Modal Functions
function openEditModal(sessionId) {
  const session = allSessions.find((s) => s.id === sessionId);
  if (!session) return;

  editSessionId.value = session.id;
  editSubject.value = session.subject;
  editDuration.value = session.duration;
  editDate.value = session.date;
  editNotes.value = session.notes || '';

  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
}

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editSessionId.value;
  const payload = {
    subject: editSubject.value.trim(),
    duration: Number(editDuration.value),
    date: editDate.value,
    notes: editNotes.value.trim()
  };

  try {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast('Session updated successfully!');
      closeEditModal();
      await loadDashboard();
    } else {
      showToast(result.error || 'Failed to update session.', 'error');
    }
  } catch (err) {
    showToast('Network error while updating session.', 'error');
  }
});

btnCloseModal.addEventListener('click', closeEditModal);
btnCancelEdit.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Delete Session
async function confirmDeleteSession(sessionId) {
  const session = allSessions.find((s) => s.id === sessionId);
  const msg = session
    ? `Delete session for "${session.subject}" on ${session.date}?`
    : 'Are you sure you want to delete this session?';

  if (!confirm(msg)) return;

  try {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (result.success) {
      showToast('Session deleted.');
      await loadDashboard();
    } else {
      showToast(result.error || 'Failed to delete session.', 'error');
    }
  } catch (err) {
    showToast('Error deleting session.', 'error');
  }
}

// Quick Chip Handlers
document.querySelectorAll('#subjectChips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    inputSubject.value = chip.dataset.subject;
    inputDuration.focus();
  });
});

document.querySelectorAll('#durationChips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    inputDuration.value = chip.dataset.duration;
  });
});

// Export CSV
btnExportCsv.addEventListener('click', () => {
  window.location.href = '/api/export/csv';
  showToast('Downloading CSV export...');
});

// Scroll to Quick Log form when header Log Session button is clicked
btnOpenLogModal.addEventListener('click', () => {
  document.getElementById('logSection').scrollIntoView({ behavior: 'smooth' });
  inputSubject.focus();
});

// Search & Filter event listeners
searchInput.addEventListener('input', renderSessionsTable);
filterSubject.addEventListener('change', renderSessionsTable);

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Render AI / ML Intelligence Panel
function renderMlInsights(ml) {
  if (!ml) return;

  // 1. Churn Risk
  if (ml.churnRisk) {
    const churn = ml.churnRisk;
    const churnPctEl = document.getElementById('mlChurnPercentage');
    const churnBadgeEl = document.getElementById('mlChurnRiskBadge');
    const churnProgressEl = document.getElementById('mlChurnProgress');
    const churnAdviceEl = document.getElementById('mlChurnAdvice');

    if (churnPctEl) churnPctEl.textContent = `${churn.churnPercentage}%`;
    if (churnProgressEl) {
      churnProgressEl.style.width = `${churn.churnPercentage}%`;
      churnProgressEl.style.background =
        churn.churnPercentage >= 70 ? 'linear-gradient(90deg, #f43f5e, #e11d48)' :
        churn.churnPercentage >= 40 ? 'linear-gradient(90deg, #f59e0b, #d97706)' :
        'linear-gradient(90deg, #10b981, #059669)';
    }

    if (churnBadgeEl) {
      churnBadgeEl.textContent = `${churn.riskLevel} Risk`;
      churnBadgeEl.className = 'status-badge ' + (
        churn.churnPercentage >= 70 ? 'status-inactive' :
        churn.churnPercentage >= 40 ? 'status-moderate' :
        'status-active'
      );
    }

    if (churnAdviceEl) churnAdviceEl.textContent = churn.actionableAdvice;
  }

  // 2. Tomorrow's Forecast
  if (ml.forecast) {
    const fc = ml.forecast;
    const tomEl = document.getElementById('mlForecastTomorrow');
    const trendEl = document.getElementById('mlTrendDirection');
    const confEl = document.getElementById('mlForecastConfidence');

    if (tomEl) tomEl.textContent = `${fc.projectedTomorrowMinutes} min`;
    if (trendEl) {
      trendEl.textContent = fc.trendDirection === 'increasing' ? '↗ Increasing' :
                            fc.trendDirection === 'decreasing' ? '↘ Decreasing' : '→ Stable';
      trendEl.className = 'status-badge ' + (fc.trendDirection === 'increasing' ? 'status-active' : 'status-moderate');
    }
    if (confEl && fc.forecast && fc.forecast[0]) {
      confEl.textContent = `Confidence: ${fc.forecast[0].confidenceLower} – ${fc.forecast[0].confidenceUpper} mins (80% CI)`;
    }
  }

  // 3. Subject Recommendation
  if (ml.recommendation) {
    const rec = ml.recommendation;
    const recSubEl = document.getElementById('mlRecSubject');
    const recReasonEl = document.getElementById('mlRecReason');

    if (recSubEl) recSubEl.textContent = rec.recommendedSubject;
    if (recReasonEl) recReasonEl.textContent = rec.reason;

    const btnApply = document.getElementById('btnApplyRecommendation');
    if (btnApply) {
      btnApply.onclick = () => {
        inputSubject.value = rec.recommendedSubject;
        inputDuration.value = rec.suggestedDuration;
        document.getElementById('logSection').scrollIntoView({ behavior: 'smooth' });
        showToast(`Applied ${rec.recommendedSubject} (${rec.suggestedDuration}m) to form`);
      };
    }
  }

  // 4. Study Persona
  if (ml.habitClusters) {
    const cl = ml.habitClusters;
    const personaEl = document.getElementById('mlPersonaName');
    const personaDescEl = document.getElementById('mlPersonaDescription');
    const personaDistEl = document.getElementById('mlPersonaDist');

    if (personaEl) personaEl.textContent = cl.dominantPersona;
    if (personaDescEl) personaDescEl.textContent = cl.personaDescription;
    if (personaDistEl && cl.distribution) {
      personaDistEl.innerHTML = Object.entries(cl.distribution)
        .map(([name, pct]) => `<span style="color:var(--text-muted); font-size: 0.72rem; margin-right: 8px;">${name}: <strong>${pct}%</strong></span>`)
        .join('');
    }
  }
}

// Real-time NLP Note Subject Detector
let nlpDebounceTimer = null;
const aiNlpSuggestion = document.getElementById('aiNlpSuggestion');
const aiDetectedSubject = document.getElementById('aiDetectedSubject');
const aiConfidenceVal = document.getElementById('aiConfidenceVal');
const btnApplyNlpSubject = document.getElementById('btnApplyNlpSubject');

if (inputNotes) {
  inputNotes.addEventListener('input', () => {
    clearTimeout(nlpDebounceTimer);
    const text = inputNotes.value.trim();
    if (text.length < 5) {
      if (aiNlpSuggestion) aiNlpSuggestion.classList.add('hidden');
      return;
    }

    nlpDebounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/ml/predict-subject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: text })
        });
        const data = await res.json();
        if (data.success && data.data && data.data.predictedSubject) {
          aiDetectedSubject.textContent = data.data.predictedSubject;
          aiConfidenceVal.textContent = `${data.data.confidence}%`;
          aiNlpSuggestion.classList.remove('hidden');

          btnApplyNlpSubject.onclick = () => {
            inputSubject.value = data.data.predictedSubject;
            aiNlpSuggestion.classList.add('hidden');
            showToast(`Applied subject: ${data.data.predictedSubject}`);
          };
        } else {
          if (aiNlpSuggestion) aiNlpSuggestion.classList.add('hidden');
        }
      } catch {
        // quiet error handling
      }
    }, 350);
  });
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  inputDate.value = getTodayString();
  loadDashboard();
});
