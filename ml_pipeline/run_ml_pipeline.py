import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("=" * 65)
print("     STUDY STREAK KEEPER - MACHINE LEARNING PIPELINE     ")
print("=" * 65)

start_time = time.time()

# 1. Dataset Generation
print("\n[Step 1/4] Generating Synthetic Student Study Dataset...")
from generate_dataset import generate_dataset
generate_dataset()

# 2. Supervised Learning: Streak Churn Classification
print("\n[Step 2/4] Training Supervised Streak Churn Predictor...")
from train_streak_churn_model import train_churn_model
train_churn_model()

# 3. Unsupervised Learning: K-Means Habit Clustering
print("\n[Step 3/4] Performing Unsupervised K-Means Study Persona Clustering...")
from cluster_study_personas import cluster_study_habits
cluster_study_habits()

# 4. Natural Language Processing: Note Subject Classification
print("\n[Step 4/4] Training NLP Note Subject Classifier (TF-IDF + Naive Bayes)...")
from nlp_note_classifier import train_nlp_classifier
train_nlp_classifier()

elapsed = time.time() - start_time
print("\n" + "=" * 65)
print(f"[SUCCESS] Complete ML Pipeline Executed Successfully in {elapsed:.2f} seconds!")
print("=" * 65)
