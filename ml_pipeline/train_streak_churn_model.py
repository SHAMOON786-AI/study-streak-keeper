"""
Machine Learning Model Training: Streak Churn / Drop-off Predictor
Compares Logistic Regression, Random Forest, and Gradient Boosting models
to predict whether a student will miss their study streak tomorrow.
"""

import os
import sys
import pandas as pd
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score, confusion_matrix
import joblib

DATASET_PATH = os.path.join(os.path.dirname(__file__), "student_streak_dataset.csv")
MODEL_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "streak_churn_model.pkl")

def train_churn_model():
    if not os.path.exists(DATASET_PATH):
        from generate_dataset import generate_dataset
        generate_dataset()

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset: {df.shape[0]} samples, {df.shape[1]} columns.\n")

    # Feature Engineering
    df["rolling_avg_3d"] = df["duration"].rolling(window=3, min_periods=1).mean()
    df["rolling_std_3d"] = df["duration"].rolling(window=3, min_periods=1).std().fillna(0)
    df["momentum_ratio"] = df["rolling_avg_3d"] / (df["duration"].mean() + 1e-5)

    feature_cols = [
        "streak_before",
        "duration",
        "is_weekend",
        "day_of_week",
        "rolling_avg_3d",
        "rolling_std_3d",
        "momentum_ratio"
    ]

    X = df[feature_cols]
    y = df["churn_next_day"]

    print("Class Distribution:")
    print(y.value_counts(normalize=True).round(3).rename({0: "Retained (0)", 1: "Churned (1)"}))
    print("-" * 55)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=80, learning_rate=0.08, random_state=42)
    }

    best_model = None
    best_auc = -1
    best_name = ""

    print("\n--- Model Benchmark Results ---")
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="roc_auc")

        print(f"\nModel: {name}")
        print(f"  Accuracy:  {acc * 100:.2f}%")
        print(f"  ROC-AUC:   {auc:.4f} (5-fold CV Mean AUC: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f})")
        print(f"  Confusion Matrix:\n{confusion_matrix(y_test, y_pred)}")

        if auc > best_auc:
            best_auc = auc
            best_model = model
            best_name = name

    print("\n" + "=" * 55)
    print(f">> Best Model: {best_name} with ROC-AUC = {best_auc:.4f}")
    print("=" * 55)

    # Feature Importance for tree-based or regression coefficients
    if hasattr(best_model, "feature_importances_"):
        print("\nFeature Importances:")
        importances = pd.Series(best_model.feature_importances_, index=feature_cols).sort_values(ascending=False)
        for feat, imp in importances.items():
            print(f"  - {feat:16s}: {imp * 100:.1f}%")

    # Save trained model artifact
    joblib.dump(best_model, MODEL_OUTPUT_PATH)
    print(f"\nSaved trained model artifact to {MODEL_OUTPUT_PATH}")

if __name__ == "__main__":
    train_churn_model()
