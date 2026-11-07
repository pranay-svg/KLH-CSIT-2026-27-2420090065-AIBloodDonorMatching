"""
Geographic Distance and Travel-Time Service.

ACADEMIC DEMONSTRATION NOTICE:
Calculates great-circle distance (Haversine formula) and estimated arrival time
for academic simulation and donor coordination demonstration.
Traffic patterns and road networks are approximated.
"""

import math
from typing import Tuple

# Mean radius of Earth in kilometers
EARTH_RADIUS_KM = 6371.0

# Average urban transit speed in km/h for simulation
DEFAULT_URBAN_SPEED_KMH = 30.0
# Base mobilization / dispatch buffer time in minutes (prep time, parking, triage check-in)
DEFAULT_DISPATCH_BUFFER_MINS = 5.0


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Computes the great-circle distance between two geographical points on Earth using Haversine formula.

    Inputs:
    - lat1, lon1: Coordinates of Point 1 (e.g., Hospital)
    - lat2, lon2: Coordinates of Point 2 (e.g., Donor)

    Output:
    - distance_km: Distance in kilometers, rounded to 2 decimal places.
    """
    # Convert latitude and longitude from degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance_km = EARTH_RADIUS_KM * c

    return round(distance_km, 2)


def estimate_travel_time_mins(
    distance_km: float,
    urban_speed_kmh: float = DEFAULT_URBAN_SPEED_KMH,
    dispatch_buffer_mins: float = DEFAULT_DISPATCH_BUFFER_MINS
) -> float:
    """
    Computes an estimated travel/arrival time in minutes.

    NOTICE:
    This ETA is an academic simulation approximation based on an average urban
    transit speed and dispatch buffer. It does not reflect live traffic or road conditions.
    """
    if distance_km <= 0:
        return round(dispatch_buffer_mins, 1)

    transit_time_hours = distance_km / max(urban_speed_kmh, 1.0)
    transit_time_mins = transit_time_hours * 60.0
    total_eta_mins = transit_time_mins + dispatch_buffer_mins

    return round(total_eta_mins, 1)


def calculate_distance_and_eta(
    hospital_lat: float,
    hospital_lon: float,
    donor_lat: float,
    donor_lon: float
) -> Tuple[float, float]:
    """
    Convenience wrapper returning (distance_km, estimated_arrival_mins).
    """
    dist_km = calculate_haversine_distance(hospital_lat, hospital_lon, donor_lat, donor_lon)
    eta_mins = estimate_travel_time_mins(dist_km)
    return dist_km, eta_mins
