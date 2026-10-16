"""
Generates synthetic student study streak dataset for training ML models.
Includes 600 records with realistic temporal features and ground-truth churn labels.
"""

import os
import csv
import random
from datetime import datetime, timedelta

DATASET_FILE = os.path.join(os.path.dirname(__file__), "student_streak_dataset.csv")

SUBJECTS = [
    "Data Structures & Algorithms",
    "Operating Systems",
    "Web Development",
    "Database Systems",
    "Calculus & Mathematics",
    "Computer Networks"
]

NOTES_SAMPLES = {
    "Data Structures & Algorithms": [
        "Implemented binary search tree and AVL rotations",
        "Practiced graph BFS DFS traversals on LeetCode",
        "Solved dynamic programming knapsack problem",
        "Learned heap sort and priority queues"
    ],
    "Operating Systems": [
        "Studied virtual memory paging and page replacement algorithms",
        "Implemented multithreading and mutex semaphore locks",
        "Reviewed CPU scheduling algorithms SJF and Round Robin",
        "Deadlock detection and Banker algorithm notes"
    ],
    "Web Development": [
        "Built responsive UI with React and Tailwind CSS",
        "Constructed Express REST API endpoints with authentication",
        "Learned DOM manipulation and async await fetch calls",
        "Created fullstack dashboard with Chart.js visualization"
    ],
    "Database Systems": [
        "Wrote complex SQL joins, grouping and aggregations",
        "Database normalization from 1NF to BCNF",
        "Studied B-tree indexing and query optimizer plans",
        "Practiced ACID transactions and isolation levels"
    ],
    "Calculus & Mathematics": [
        "Solved partial derivatives and gradient descent vectors",
        "Double and triple integrals in polar coordinates",
        "Differential equations and eigenvalue decomposition",
        "Limit theorems and Taylor series expansions"
    ],
    "Computer Networks": [
        "Analyzed TCP three-way handshake and connection teardown",
        "Subnetting IP address calculation and CIDR notation",
        "OSI model layer protocols and packet encapsulation",
        "Congestion control algorithms and socket programming"
    ]
}

def generate_dataset(num_records=600):
    random.seed(42)
    records = []
    
    start_date = datetime.now() - timedelta(days=num_records)
    
    current_streak = 0
    
    for i in range(num_records):
        date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
        day_of_week = (start_date + timedelta(days=i)).weekday() # 5=Sat, 6=Sun
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Decide if student studied on this day
        # Habit dynamics: higher streak makes studying more likely, weekends slightly lower
        prob_study = 0.72 + (0.01 * min(current_streak, 15)) - (0.15 * is_weekend)
        prob_study = max(0.2, min(0.95, prob_study))
        
        studied = 1 if random.random() < prob_study else 0
        
        if studied:
            current_streak += 1
            subject = random.choice(SUBJECTS)
            duration = int(random.gauss(55, 20))
            duration = max(15, min(180, duration))
            notes = random.choice(NOTES_SAMPLES[subject])
        else:
            current_streak = 0
            subject = "None"
            duration = 0
            notes = "Missed study day"
        
        # Ground-truth churn label for tomorrow: will the user break their streak tomorrow?
        # Churn occurs if next day studied == 0
        records.append({
            "session_id": f"rec_{i+1:04d}",
            "date": date,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "subject": subject,
            "duration": duration,
            "streak_before": current_streak,
            "studied_today": studied,
            "notes": notes
        })
        
    # Assign target labels (churn_next_day: 1 if tomorrow is missed, 0 if studied)
    for i in range(len(records) - 1):
        records[i]["churn_next_day"] = 1 if records[i+1]["studied_today"] == 0 else 0
    records[-1]["churn_next_day"] = 0

    with open(DATASET_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=records[0].keys())
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} records in {DATASET_FILE}")

if __name__ == "__main__":
    generate_dataset()
