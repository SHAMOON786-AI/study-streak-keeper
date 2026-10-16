# 🔥 Study Streak Keeper with AI / ML Intelligence

> **MFC VIT Technical Assessment — Task 1 (ML / JR Track)**  
> A full-stack web application, REST API, and Machine Learning intelligence suite that tracks daily study sessions, computes streak metrics with edge-case resiliency, and leverages 5 AI/ML models to predict streak drop-offs, forecast study habits, recommend subjects, and classify study topics.

---

## 📌 Project Overview

**Study Streak Keeper** is designed to transform daily study habits through consistency and machine intelligence. In addition to meeting all core requirements (CRUD, persistent storage, streak calculation, weekly subject analytics, interactive trend charts, and CSV export), this project incorporates **5 integrated Machine Learning models** available both as an in-app real-time JavaScript engine and as an enterprise Python data science pipeline (`scikit-learn`, `pandas`, `numpy`).

---

## 🤖 Machine Learning Models

### 1. 🛡️ Streak Dropout / Churn Risk Predictor (`Logistic Regression`)
- **Objective:** Predicts the probability ($0\% - 100\%$) that a student will lapse and break their study streak tomorrow.
- **Mathematical Formulation:**
  $$P(\text{churn}) = \frac{1}{1 + e^{-(\beta_0 + \sum \beta_i x_i)}}$$
- **Feature Vector:**
  - $x_1$: Current active streak length (habit strength)
  - $x_2$: Recency (days since last study session)
  - $x_3$: 3-day momentum ratio ($\bar{d}_{\text{recent}} / \bar{d}_{\text{historical}}$)
  - $x_4$: Study duration variance ($\sigma_{\text{duration}}$)
  - $x_5$: Weekend friction coefficient (indicator if tomorrow is Saturday/Sunday)
- **Output:** Calibrated churn risk score, classification tag (`Low`, `Moderate`, `Elevated`, `Critical`), and personalized preventative intervention advice.

### 2. 🔮 Time-Series Study Time Forecaster (`Holt-Winters & OLS Regression`)
- **Objective:** Forecasts projected daily study minutes for tomorrow and the upcoming 3 days.
- **Formulation:** Blends Holt's Linear Exponential Smoothing with Ordinary Least Squares (OLS) trend analysis, outputting an 80% Confidence Interval band based on historical residual standard errors.
- **Output:** Plotted directly onto the interactive dashboard chart as a dashed visual trend curve.

### 3. 💡 Smart Subject Recommender & Curriculum Balancer (`Multi-Attribute Spaced Repetition`)
- **Objective:** Recommends the optimal subject to study next and suggested target duration to prevent knowledge decay and curriculum neglect.
- **Formulation:** Evaluates subject decay using an exponential forgetting curve proxy ($R = 1 - e^{-\lambda \Delta t}$) combined with under-study deficit scoring against peer subjects.
- **Output:** Top-ranked subject with explanation and 1-click auto-fill button.

### 4. 🧬 Study Persona Archetype Discovery (`Unsupervised K-Means Clustering, k=3`)
- **Objective:** Clusters sessions into distinct study behavioral archetypes:
  1. **Sprint Learner:** Short, high-frequency focus bursts (15–30 mins).
  2. **Steady Pacer:** Balanced, sustainable daily study blocks (35–65 mins).
  3. **Deep-Work Marathoner:** Extended deep-focus marathons (70–120+ mins).
- **Evaluation:** Evaluated using Silhouette Analysis across $k=2 \dots 5$ clusters.

### 5. ✨ NLP Study Notes Subject Classifier (`TF-IDF + Multinomial Naive Bayes`)
- **Objective:** Listens in real-time as the student types notes in the UI and automatically predicts the matching academic subject with a calibrated confidence score.
- **Formulation:** Extracts unigram and bigram TF-IDF representations and applies Multinomial Naive Bayes with Laplace smoothing ($\alpha = 0.5$).
- **Benchmark:** Achieved **100% precision & recall** on academic topic classification test splits.

---

## ✨ Full Feature Checklist

- 📝 **Study Session Logging:** Log sessions with subject, duration (minutes), date picker, and notes.
- 🔄 **Full CRUD Operations:** View, search, filter by subject, edit in modals, and delete past sessions.
- 🔥 **Intelligent Streak Engine:**
  - Resilient calculation of **Current Streak** and **Longest Streak**.
  - **Missed Day Resets:** Missed days reset the running streak to 0 or 1 upon resuming, while historical longest streak is preserved.
  - **Multi-Session Deduplication:** Multiple logs on the same date count as exactly 1 streak day.
  - **Midnight Boundary Safe:** Sessions at 23:59 and 00:01 across consecutive dates count as a 2-day streak; sessions at 00:01 and 23:59 on the same date count as 1 day.
- 📊 **Weekly Subject Breakdown:** Summarizes study duration per subject for the active ISO week (Monday–Sunday) with visual progress bars.
- 📈 **Interactive Dual-Series Chart:** Visualizes past 14-day study minutes alongside the AI-projected 3-day forecast curve (Chart.js + offline HTML5 Canvas fallback).
- 💾 **Persistent File Storage:** Data is stored on disk in `data/sessions.json`—no data loss on server restart.
- 📥 **CSV Export:** Download all study sessions in standard RFC-4180 CSV format (`/api/export/csv`).
- 🧪 **20 Automated Unit Tests:** 12 tests for streak edge cases + 8 tests for machine learning models.

---

## 📁 Project Architecture

```
study-streak-keeper/
├── data/
│   └── sessions.json                 # Persistent JSON database
├── ml_pipeline/                      # Standalone Python ML Pipeline (scikit-learn)
│   ├── generate_dataset.py           # Synthetic student study dataset generator (600 records)
│   ├── student_streak_dataset.csv    # Generated ML training dataset
│   ├── train_streak_churn_model.py   # Benchmark: LogisticRegression, RandomForest, GradientBoosting
│   ├── cluster_study_personas.py     # K-Means clustering with Silhouette analysis
│   ├── nlp_note_classifier.py        # TF-IDF + Multinomial Naive Bayes classifier
│   ├── run_ml_pipeline.py            # Master runner executing all Python ML models
│   └── requirements.txt              # scikit-learn, pandas, numpy, scipy, joblib
├── public/                           # Frontend Dashboard UI
│   ├── index.html                    # HTML5 layout with AI/ML Intelligence Panel
│   ├── style.css                     # Dark cyber theme styling and animations
│   └── app.js                        # Client JS: chart rendering, CRUD, NLP listener
├── src/
│   ├── storage.js                    # Persistent JSON CRUD operations
│   ├── streak.js                     # Streak calculation engine & CSV export logic
│   └── ml/                           # Real-time In-App JavaScript ML Engine
│       ├── churnModel.js             # Logistic Regression churn model
│       ├── forecaster.js             # Time-series exponential smoothing & trend forecaster
│       ├── recommender.js            # Spaced repetition curriculum balancer
│       ├── clusterer.js              # K-Means study habit clustering
│       ├── nlpClassifier.js          # TF-IDF + Naive Bayes NLP note classifier
│       └── index.js                  # Master ML interface
├── tests/
│   ├── streak.test.js                # 12 streak edge-case automated tests
│   └── ml.test.js                    # 8 machine learning model automated tests
├── server.js                         # Express.js REST API & static file server
├── package.json                      # NPM configuration & scripts
└── README.md                         # Comprehensive project documentation
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher; tested on v24.21.0)
- [Python 3](https://www.python.org/) (v3.10+; tested on v3.13 with `scikit-learn`, `pandas`, `numpy`)

### 1. Install Node.js Dependencies
```bash
cd "study-streak-keeper"
npm install
```

### 2. Run All Automated Tests (Streak + AI/ML)
```bash
npm test
```
Runs both test suites (20 tests in total):
- `npm run test:streak` (12 streak edge-case tests)
- `npm run test:ml` (8 machine learning model unit tests)

### 3. Run the Python ML Data Science Pipeline
```bash
npm run ml:pipeline
```
Or directly:
```bash
python ml_pipeline/run_ml_pipeline.py
```
This script runs in ~3 seconds and:
1. Generates 600 synthetic student study sessions with ground-truth labels.
2. Trains and benchmarks **Logistic Regression**, **Random Forest**, and **Gradient Boosting** with 5-fold cross-validation and ROC-AUC metrics, exporting `streak_churn_model.pkl`.
3. Performs **K-Means clustering** with Silhouette analysis ($k=2 \dots 5$) discovering 3 habit archetypes.
4. Trains an **NLP Classifier (TF-IDF + Naive Bayes)** and runs live inference on study note queries.

### 4. Launch the Web Application
```bash
npm start
```
Open your browser at:
```
http://localhost:3000
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | Retrieve all sessions (sorted newest first) |
| `POST` | `/api/sessions` | Log a new study session (`{ subject, duration, date, notes }`) |
| `GET` | `/api/sessions/:id` | Get session details by ID |
| `PUT` | `/api/sessions/:id` | Update an existing study session |
| `DELETE` | `/api/sessions/:id` | Delete a study session |
| `GET` | `/api/stats` | Retrieve streak analytics, weekly subject totals, and ML insights |
| `GET` | `/api/ml/insights` | Dedicated endpoint for churn risk, forecasting, recommendations & clusters |
| `POST` | `/api/ml/predict-subject` | NLP endpoint predicting subject from natural language notes |
| `GET` | `/api/export/csv` | Download RFC-4180 compliant CSV export file |

---

## 🧪 Edge Cases Tested

| # | Test Scenario | Category | Expected Behavior |
|---|---|---|---|
| 1 | Empty session list | Streak | `currentStreak: 0`, `longestStreak: 0` |
| 2 | Invalid / non-array input | Streak | `currentStreak: 0`, `longestStreak: 0` |
| 3 | Duration $\le 0$ minutes | Streak | Ignored from streak calculations |
| 4 | Missed day during active streak | Streak | Current streak resets to 1 upon resumption; historical longest preserved |
| 5 | Inactive for $> 1$ day | Streak | Current streak drops to 0; longest streak preserved |
| 6 | Studied yesterday (1 day ago) | Streak | Current streak maintained active for today |
| 7 | Several sessions on same day | Streak | Deduplicated to 1 streak day |
| 8 | Multiple sessions on disjoint days | Streak | Counts consecutive days, not session count |
| 9 | Midnight boundary across consecutive days | Streak | Normalized to 2 distinct days $\rightarrow$ 2-day streak |
| 10 | Midnight boundary on same day | Streak | Normalized to same date $\rightarrow$ 1-day streak |
| 11 | Weekly subject aggregation | Streak | Sums durations within Monday–Sunday ISO week |
| 12 | CSV Export formatting | Export | RFC-4180 compliant escaping of quotes, commas, newlines |
| 13 | Churn probability boundaries | AI/ML | Calibrated between $0.0$ and $1.0$ |
| 14 | Inactivity recency penalty | AI/ML | Stale study history yields higher churn probability |
| 15 | Time-series forecasting | AI/ML | Future projection with valid confidence intervals |
| 16 | Spaced repetition prioritization | AI/ML | Recommends neglected subject over recently studied |
| 17 | K-Means persona clustering | AI/ML | Partitions sessions into archetypes summing to 100% |
| 18 | NLP DSA keyword classification | AI/ML | Predicts "Data Structures & Algorithms" from tree/graph notes |
| 19 | NLP OS keyword classification | AI/ML | Predicts "Operating Systems" from memory/process notes |
| 20 | NLP Web Dev keyword classification | AI/ML | Predicts "Web Development" from React/Express notes |
