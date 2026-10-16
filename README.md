# 🔥 Study Streak Keeper

> **MFC VIT Technical Assessment — Task 1**  
> A full-stack web application and REST API that tracks daily study sessions, visualizes learning habits over time, and computes current and longest study streaks with edge-case resiliency.

---

## 📌 Project Overview

**Study Streak Keeper** helps students maintain consistent study habits by turning daily learning into an unbroken streak. The app logs study sessions (subject, duration, date, notes), computes real-time streak analytics, displays weekly per-subject time distributions, visualizes daily study trends, and enables full data export via CSV.

---

## ✨ Features

- 📝 **Session Logging:** Log study sessions with subject, duration (in minutes), calendar date, and optional topic notes.
- 🔄 **Full CRUD Operations:** View all past sessions, search/filter by subject, inline edit session details, or delete sessions.
- 🔥 **Intelligent Streak Engine:**
  - Calculates **Current Streak** and **Longest Streak** (in calendar days).
  - Handles **missed days** gracefully (resets current streak upon lapse while preserving all-time longest streak).
  - Handles **several sessions on the same day** (deduplicated to 1 streak day).
  - Handles **midnight boundaries** (e.g. sessions at 23:59 and 00:01 across consecutive calendar days count as a 2-day streak).
- 📊 **Current Week Subject Breakdown:** Aggregates total minutes studied per subject for the active ISO week (Monday to Sunday) with visual progress bars.
- 📈 **Visual Study Time Chart:** Interactive daily study trend chart over time (last 14 days) built with Chart.js and an automatic zero-dependency HTML5 Canvas fallback for offline environments.
- 💾 **Persistent Storage:** All session data is stored on disk in `data/sessions.json`—no in-memory data loss upon server restart.
- 📥 **CSV Export:** One-click download of all study logs in standard RFC-compliant CSV format (`/api/export/csv`).
- 🧪 **Automated Edge-Case Tests:** 12 automated unit tests covering all required streak calculation edge cases.

---

## 🧠 How the Streak is Calculated

The streak algorithm is implemented in [`src/streak.js`](src/streak.js) and adheres to these core mathematical principles:

### 1. Calendar Date Normalization (`toDateKey`)
All dates—whether entered as ISO 8601 timestamps, local date strings, or Date objects—are parsed into canonical `YYYY-MM-DD` strings.
- **Midnight Boundary:** Sessions at `23:59:00` on Day $N$ and `00:01:00` on Day $N+1$ resolve to two distinct consecutive calendar dates (`YYYY-MM-01` and `YYYY-MM-02`).
- **Same-Day Boundary:** Sessions at `00:01:00` and `23:59:00` on the *same* calendar day resolve to the identical `YYYY-MM-DD` key.

### 2. Multi-Session Deduplication
Students often study multiple subjects in a single day (e.g., 45 minutes of DSA in the morning and 60 minutes of OS in the evening).
- The sessions list is filtered for valid durations ($> 0$) and mapped to a unique `Set` of date strings.
- Multiple sessions on the same date count as exactly **1 streak day**, avoiding artificial inflation.

### 3. Longest Streak (Historical Maximum)
- The unique date keys are sorted chronologically ascending.
- The algorithm calculates the day difference between consecutive study days:
  $$\Delta = \text{diffInDays}(\text{date}_{i-1}, \text{date}_i)$$
- If $\Delta = 1$, the running streak increments by 1.
- If $\Delta > 1$ (a missed day), the running streak resets to 1.
- The maximum running streak ever reached is retained as `longestStreak`.

### 4. Current Streak (Active Run)
- Filters unique study dates up to the reference date (today).
- Checks the gap between the last study date and today:
  - If $\text{daysSinceLastStudy} = 0$: The user studied today $\rightarrow$ streak active.
  - If $\text{daysSinceLastStudy} = 1$: The user studied yesterday $\rightarrow$ streak remains active (giving the user until midnight today to log their study session).
  - If $\text{daysSinceLastStudy} > 1$: The user missed yesterday and today $\rightarrow$ streak broken, `currentStreak = 0`.
- If active, walks backward consecutively day-by-day ($\Delta = 1$) to compute the continuous uninterrupted streak.

---

## 📁 Project Architecture

```
study-streak-keeper/
├── data/
│   └── sessions.json        # Persistent JSON storage file
├── public/
│   ├── index.html           # Modern dark-mode responsive dashboard
│   ├── style.css            # Custom CSS with responsive layouts & cards
│   └── app.js               # Frontend interactive logic & chart rendering
├── src/
│   ├── storage.js           # File persistence & CRUD storage operations
│   └── streak.js            # Streak algorithm, weekly totals & CSV formatter
├── tests/
│   └── streak.test.js       # 12 automated unit tests for edge cases
├── server.js                # Express REST API & static file server
├── package.json             # NPM package scripts and dependencies
└── README.md                # Project documentation & setup instructions
```

---

## 🚀 Setup & Installation Steps

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher; tested on v24.21.0)
- [npm](https://www.npmjs.com/) (v8.0.0 or higher)

### 1. Clone or Open the Repository
```bash
cd "study-streak-keeper"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Automated Tests
Execute the comprehensive test suite to verify all streak edge cases:
```bash
npm test
```
Expected output:
```
======================================================
       STUDY STREAK KEEPER - EDGE-CASE TEST SUITE      
======================================================
📋 Test Group 1: Empty & Invalid Data Handling
  ✅ PASS: Empty session array returns streak 0 and longest streak 0
  ✅ PASS: Null or non-array returns streak 0
  ✅ PASS: Sessions with zero or negative durations are ignored
...
Results: 12 passed, 0 failed
======================================================
```

### 4. Start the Application
```bash
npm start
```
Or for auto-reloading development mode:
```bash
npm run dev
```

### 5. Access the Web App
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | Retrieve all study sessions (sorted newest first) |
| `POST` | `/api/sessions` | Create a new study session (`{ subject, duration, date, notes }`) |
| `GET` | `/api/sessions/:id` | Get single session by ID |
| `PUT` | `/api/sessions/:id` | Update an existing study session |
| `DELETE` | `/api/sessions/:id` | Delete a study session |
| `GET` | `/api/stats` | Get streak metrics, weekly subject totals, and daily trend data |
| `GET` | `/api/export/csv` | Download RFC-compliant CSV file of all sessions |

### Example Request (POST /api/sessions)
```json
{
  "subject": "Data Structures & Algorithms",
  "duration": 60,
  "date": "2026-10-16",
  "notes": "Solved dynamic programming knapsack problems"
}
```

### Example Response (GET /api/stats)
```json
{
  "success": true,
  "data": {
    "currentStreak": 4,
    "longestStreak": 4,
    "totalSessions": 4,
    "totalMinutes": 245,
    "weekly": {
      "weekStart": "2026-10-12",
      "weekEnd": "2026-10-18",
      "totalsBySubject": {
        "Data Structures & Algorithms": 60,
        "Operating Systems": 45,
        "Web Development": 90,
        "Database Systems": 50
      },
      "totalWeeklyMinutes": 245
    },
    "dailyTrend": [ ... ],
    "subjectDistribution": { ... }
  }
}
```

---

## 🧪 Edge Cases Tested

| # | Test Scenario | Expected Behavior |
|---|---|---|
| 1 | Empty session list | Returns `currentStreak: 0`, `longestStreak: 0` |
| 2 | Invalid / non-array input | Returns `currentStreak: 0`, `longestStreak: 0` |
| 3 | Duration $\le 0$ minutes | Session ignored from streak calculations |
| 4 | Missed day during active streak | Current streak resets to 1 upon resumption; historical longest streak preserved |
| 5 | Inactive for $> 1$ day (missed yesterday & today) | Current streak drops to 0; longest streak preserved |
| 6 | Studied yesterday (1 day ago) | Current streak maintained as active for today |
| 7 | Several sessions on the same calendar day | Deduplicated to 1 streak day (does not artificially multiply streak) |
| 8 | Multiple sessions on disjoint days | Streak counts consecutive days, not session count |
| 9 | Midnight boundary across consecutive days (23:59 & 00:01) | Normalized to 2 distinct consecutive calendar dates $\rightarrow$ 2-day streak |
| 10 | Midnight boundary on the same day (00:01 & 23:59) | Normalized to the same calendar date $\rightarrow$ 1-day streak |
| 11 | Weekly subject aggregation | Correctly sums durations within Monday–Sunday; excludes prior/future weeks |
| 12 | CSV Export formatting | RFC-4180 compliant escaping of quotes, commas, and newlines |

---

## 🌐 Optional Deployment

This project can be deployed to any Node.js hosting platform with zero configuration:

### Deploy to Render
1. Push code to a GitHub repository.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set **Build Command**: `npm install`.
4. Set **Start Command**: `npm start`.
5. Environment variable `PORT` is automatically managed by Render.

### Deploy to Railway / Heroku
- Railway and Heroku automatically detect Node.js from `package.json` and execute `npm start`.
