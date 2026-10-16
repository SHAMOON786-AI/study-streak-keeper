"""
Unsupervised Machine Learning: Study Habit Persona Clustering
Performs K-Means clustering on student study session features
to detect distinct behavioral archetypes and computes silhouette scores.
"""

import os
import sys
import pandas as pd
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

DATASET_PATH = os.path.join(os.path.dirname(__file__), "student_streak_dataset.csv")

def cluster_study_habits():
    if not os.path.exists(DATASET_PATH):
        from generate_dataset import generate_dataset
        generate_dataset()

    df = pd.read_csv(DATASET_PATH)
    active_sessions = df[df["duration"] > 0].copy()

    # Features: duration, day_of_week, streak_before
    X = active_sessions[["duration", "streak_before", "is_weekend"]]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Evaluate silhouette scores for k=2..5
    print("--- Silhouette Analysis for Optimal Clusters (k) ---")
    for k in range(2, 6):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        sil = silhouette_score(X_scaled, labels)
        print(f"  k = {k}: Silhouette Score = {sil:.4f}")

    # Optimal k=3 clusters
    k_opt = 3
    kmeans = KMeans(n_clusters=k_opt, random_state=42, n_init=10)
    active_sessions["cluster"] = kmeans.fit_predict(X_scaled)

    # Map clusters to meaningful archetype names based on duration
    summary = active_sessions.groupby("cluster").agg(
        avg_duration=("duration", "mean"),
        avg_streak=("streak_before", "mean"),
        count=("duration", "count")
    ).reset_index().sort_values("avg_duration")

    archetype_labels = ["Sprint Learner", "Steady Pacer", "Deep-Work Marathoner"]
    mapping = {row["cluster"]: archetype_labels[idx] for idx, (_, row) in enumerate(summary.iterrows())}
    active_sessions["persona"] = active_sessions["cluster"].map(mapping)

    print("\n--- Discovered Study Personas (k=3) ---")
    for idx, (_, row) in enumerate(summary.iterrows()):
        cluster_id = row["cluster"]
        persona_name = archetype_labels[idx]
        print(f"\nArchetype: {persona_name}")
        print(f"  Average Session Duration: {row['avg_duration']:.1f} minutes")
        print(f"  Average Active Streak:    {row['avg_streak']:.1f} days")
        print(f"  Total Sessions in Group:  {int(row['count'])} ({row['count'] / len(active_sessions) * 100:.1f}%)")

if __name__ == "__main__":
    cluster_study_habits()
