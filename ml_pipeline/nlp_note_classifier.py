"""
Natural Language Processing (NLP) Model: Study Notes Subject Classifier
Extracts TF-IDF features from text notes and classifies into academic domains
using Multinomial Naive Bayes and Linear SVM.
"""

import os
import sys
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import SGDClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score

DATASET_PATH = os.path.join(os.path.dirname(__file__), "student_streak_dataset.csv")

def train_nlp_classifier():
    if not os.path.exists(DATASET_PATH):
        from generate_dataset import generate_dataset
        generate_dataset()

    df = pd.read_csv(DATASET_PATH)
    active = df[df["subject"].notna() & df["notes"].notna() & (df["subject"] != "None")].copy()
    active = active[active["subject"].astype(str).str.strip() != ""]

    X = active["notes"]
    y = active["subject"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    pipeline_nb = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english")),
        ("clf", MultinomialNB(alpha=0.5))
    ])

    pipeline_nb.fit(X_train, y_train)
    y_pred_nb = pipeline_nb.predict(X_test)
    acc_nb = accuracy_score(y_test, y_pred_nb)

    print("--- NLP Subject Classifier (Multinomial Naive Bayes) ---")
    print(f"Accuracy: {acc_nb * 100:.2f}%\n")
    print(classification_report(y_test, y_pred_nb))

    # Test sample inference queries
    sample_queries = [
        "Inverted binary tree and solved graph dfs",
        "Configured Express route handlers and React state",
        "Wrote nested SQL queries with group by having clause",
        "Calculated partial derivatives and gradient vector field",
        "Deadlock Banker algorithm and page replacement FIFO"
    ]

    print("\n--- Sample Live Predictions ---")
    for q in sample_queries:
        pred = pipeline_nb.predict([q])[0]
        prob = max(pipeline_nb.predict_proba([q])[0]) * 100
        print(f"Notes: '{q}'")
        print(f"  -> Predicted: {pred} (Confidence: {prob:.1f}%)\n")

if __name__ == "__main__":
    train_nlp_classifier()
