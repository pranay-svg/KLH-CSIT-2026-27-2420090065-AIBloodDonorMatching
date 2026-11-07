# Machine Learning & MLOps Pipeline Specification

**AI-Adaptive Blood Donor Matching System**

---

> [!IMPORTANT]
> **Academic Demonstration & Synthetic Data Notice**  
> Because clinical donor registries are protected by healthcare data regulations (HIPAA, GDPR, DISHA), all training records in this system are generated via an algorithmic behavioral model (`app/ml/synthetic_data_generator.py`). This synthetic data demonstrates machine learning lifecycle management and donor response estimation. It does NOT represent actual patient medical history.

---

## 1. Problem Formulation & Predictor Role

When a hospital issues an urgent blood request, contacting registered donors who are geographically distant or historically unresponsive delays critical emergency mobilization. The donor response model calculates an empirical acceptance probability:

$$P(\text{responded} = 1 \mid \mathbf{x}) \in [0.0, 1.0]$$

This predicted probability feeds directly into the Multi-Criteria Decision Making (MCDM) priority ranking engine alongside biological compatibility, transit distance, and donor rest/fatigue penalties.

---

## 2. Synthetic Dataset Characteristics

- **Path**: `backend/app/ml/data/synthetic_donor_responses.csv`
- **Total Records**: 1,500 historical donor mobilization simulations
- **Class Balance**: 60.93% positive response rate
- **Features**:
  - `distance_km`: Great-circle distance between donor location and hospital (0.5 to 35.0 km)
  - `donation_count`: Total prior whole-blood donations (0 to 30)
  - `historical_acceptance_rate`: Prior acceptance fraction (0.20 to 0.99)
  - `avg_response_time_mins`: Historical response latency (3.0 to 90.0 mins)
  - `days_since_last_donation`: Days elapsed since last donation (10 to 365 days)
  - `urgency_level`: Triage level (`Routine`, `Urgent`, `Critical`)
  - `time_of_day`: Hour of dispatch notification (0 to 23)
- **Target**: `responded` ($1 = \text{Accepted}$, $0 = \text{Declined / No Response}$)

---

## 3. Model Architecture & Pipeline

- **Classifier**: `RandomForestClassifier`
  - `n_estimators`: 100
  - `max_depth`: 6 (constrained depth to promote explainability and prevent overfitting)
  - `min_samples_split`: 5
  - `min_samples_leaf`: 2
  - `class_weight`: `"balanced"`
  - `random_state`: 42 (ensures deterministic repeatability)
- **Preprocessing Pipeline**:
  - Continuous numerical features: `StandardScaler`
  - Categorical urgency level: `OneHotEncoder(categories=[["Routine", "Urgent", "Critical"]])`
- **Serialization**: `joblib.dump(pipeline, "donor_response_model.joblib")`

---

## 4. Honest Verified Evaluation Metrics

Evaluated on 300 held-out test samples (80% train / 20% test stratified split):

| Metric | Measured Value | Percentage | Description |
| :--- | :---: | :---: | :--- |
| **Accuracy** | 0.6533 | 65.33% | Proportion of all response outcomes predicted correctly |
| **Precision** | 0.7232 | 72.32% | Accuracy of positive dispatch acceptance predictions |
| **Recall** | 0.6995 | 69.95% | Fraction of actual willing donors successfully identified |
| **F1-Score** | 0.7111 | 71.11% | Harmonic mean of precision and recall |
| **ROC-AUC** | 0.7178 | 0.7178 | Discrimination power across varying classification thresholds |

---

## 5. DVC Data Version Control Pipeline

Configured in `dvc.yaml` at the root of the repository:

```yaml
stages:
  generate_synthetic_dataset:
    cmd: python backend/app/ml/synthetic_data_generator.py
    deps:
      - backend/app/ml/synthetic_data_generator.py
    outs:
      - backend/app/ml/data/synthetic_donor_responses.csv:
          cache: true

  train_donor_response_model:
    cmd: python -m app.ml.train_model
    deps:
      - backend/app/ml/data/synthetic_donor_responses.csv
      - backend/app/ml/train_model.py
    outs:
      - backend/app/ml/donor_response_model.joblib:
          cache: true
    metrics:
      - backend/app/ml/model_metrics.json:
          cache: false
```

---

## 6. MLflow Experiment Tracking

The training script `backend/app/ml/train_model.py` automatically initializes an MLflow experiment run:
- **Experiment Name**: `blood_donor_matching_mlops`
- **Run Name**: `RandomForest_Response_Predictor`
- **Backend**: SQLite database (`sqlite:///mlflow.db`)
- **Logged Parameters**:
  - `model_type`, `n_estimators`, `max_depth`, `min_samples_split`, `min_samples_leaf`, `random_state`, `class_weight`, `test_split`, `train_sample_count`, `test_sample_count`, `features`
- **Logged Metrics**:
  - `accuracy` (0.6533), `precision` (0.7232), `recall` (0.6995), `f1_score` (0.7111), `roc_auc` (0.7178)
- **Logged Artifacts**:
  - Scikit-learn Pipeline model packaged as MLflow Model artifact (`donor_response_model`)
