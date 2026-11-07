"""
Synthetic Dataset Generator for Donor Response Modeling.

ACADEMIC DEMONSTRATION NOTICE:
This dataset is completely SYNTHETIC and generated exclusively for academic research
and software demonstration of the AI-Adaptive Blood Donor Matching System.
It does NOT represent actual patient or donor medical records and must NOT be used
for clinical transfusion or diagnostic decisions.
"""

import os
import numpy as np
import pandas as pd

def generate_synthetic_donor_data(
    num_samples: int = 1500,
    random_seed: int = 42,
    output_filepath: str = None
) -> pd.DataFrame:
    """
    Generates a realistic synthetic dataset simulating donor responses to emergency calls.

    Features:
    - distance_km: Distance from donor location to hospital (0.5 to 35.0 km)
    - donation_count: Total prior successful donations (0 to 25)
    - historical_acceptance_rate: Prior fraction of emergency requests accepted (0.20 to 0.99)
    - avg_response_time_mins: Average minutes taken by donor to acknowledge dispatch (3.0 to 90.0 mins)
    - days_since_last_donation: Days elapsed since last blood donation (10 to 365 days)
    - urgency_level: Emergency triage tier ('Routine', 'Urgent', 'Critical')
    - time_of_day: Hour of the day contact was initiated (0 to 23)

    Target:
    - responded: Binary indicator (1 = donor responded/accepted, 0 = donor did not respond/declined)
    """
    np.random.seed(random_seed)

    # 1. Geographic distance (km) - skewed towards closer donors (Gamma/Exponential-like)
    distance_km = np.clip(np.random.exponential(scale=7.5, size=num_samples) + 0.5, 0.5, 35.0)

    # 2. Total previous donations (count)
    donation_count = np.random.poisson(lam=4.5, size=num_samples)
    donation_count = np.clip(donation_count, 0, 30)

    # 3. Historical acceptance rate (0.20 to 0.99)
    # Experienced donors tend to have higher acceptance rates
    base_acceptance = np.random.beta(a=6.0, b=2.0, size=num_samples)
    historical_acceptance_rate = np.clip(base_acceptance, 0.20, 0.99)

    # 4. Average response time in minutes (3.0 to 90.0 mins) - Log-normal distribution
    avg_response_time_mins = np.clip(np.random.lognormal(mean=2.3, sigma=0.6, size=num_samples), 3.0, 90.0)

    # 5. Days since last donation (10 to 365 days)
    days_since_last_donation = np.random.randint(10, 366, size=num_samples)

    # 6. Urgency level of the emergency request
    urgency_choices = ["Routine", "Urgent", "Critical"]
    urgency_probs = [0.35, 0.45, 0.20]
    urgency_level = np.random.choice(urgency_choices, size=num_samples, p=urgency_probs)

    # 7. Time of day (hour: 0-23) - peak hospital activity between 8am and 21pm
    hour_probs = np.ones(24)
    # Daytime hours (08:00 - 20:00) have higher frequency of requests
    hour_probs[8:21] = 2.5
    hour_probs = hour_probs / hour_probs.sum()
    time_of_day = np.random.choice(np.arange(24), size=num_samples, p=hour_probs)

    # Calculate realistic log-odds of positive response based on domain principles:
    # - Closer distance increases likelihood of response
    # - High historical acceptance strongly increases likelihood
    # - Low response time increases likelihood
    # - Experienced donors (higher donation count) more likely to respond
    # - Recent donation (< 56 days) reduces response due to fatigue / temporary ineligibility
    # - Critical emergencies invoke altruistic promptness
    # - Nighttime hours (23:00 - 06:00) decrease availability
    urgency_boost = np.where(urgency_level == "Critical", 1.2, np.where(urgency_level == "Urgent", 0.5, 0.0))
    time_penalty = np.where((time_of_day >= 23) | (time_of_day <= 5), -1.1, 0.2)
    fatigue_penalty = np.where(days_since_last_donation < 56, -1.4, np.where(days_since_last_donation > 120, 0.3, 0.0))
    
    log_odds = (
        -0.5
        + 3.2 * (historical_acceptance_rate - 0.5)
        - 0.08 * distance_km
        - 0.03 * (avg_response_time_mins - 15.0)
        + 0.06 * np.minimum(donation_count, 15)
        + urgency_boost
        + time_penalty
        + fatigue_penalty
    )

    # Sigmoid function to derive true underlying probability
    prob_responded = 1.0 / (1.0 + np.exp(-log_odds))
    # Sample binary outcome with stochastic realism
    responded = np.random.binomial(n=1, p=prob_responded)

    df = pd.DataFrame({
        "distance_km": np.round(distance_km, 2),
        "donation_count": donation_count,
        "historical_acceptance_rate": np.round(historical_acceptance_rate, 4),
        "avg_response_time_mins": np.round(avg_response_time_mins, 2),
        "days_since_last_donation": days_since_last_donation,
        "urgency_level": urgency_level,
        "time_of_day": time_of_day,
        "responded": responded
    })

    if output_filepath:
        os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
        df.to_csv(output_filepath, index=False)

    return df

if __name__ == "__main__":
    default_path = os.path.join(os.path.dirname(__file__), "data", "synthetic_donor_responses.csv")
    df = generate_synthetic_donor_data(num_samples=1500, output_filepath=default_path)
    print(f"Generated {len(df)} synthetic donor records.")
    print(f"Response rate in synthetic dataset: {df['responded'].mean():.2%}")
    print(f"Saved synthetic dataset to: {default_path}")
