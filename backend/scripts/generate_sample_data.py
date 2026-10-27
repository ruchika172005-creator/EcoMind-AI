"""
Script to generate realistic synthetic hourly energy consumption data for EcoMind AI demonstrations.
Models a commercial campus building with:
- Baseload (night/off-hours equipment)
- Diurnal working hour patterns (8 AM - 6 PM weekday surges)
- Weekend low-occupancy levels
- Seasonal temperature and HVAC cooling/heating correlation
- Realistic anomalous spikes for testing anomaly detection
"""
import os
import math
import random
from datetime import datetime, timedelta

def generate_energy_dataset(output_path: str, days: int = 365, seed: int = 42):
    random.seed(seed)
    start_date = datetime(2024, 1, 1, 0, 0, 0)
    
    records = []
    headers = ["timestamp", "energy_consumption_kwh", "building_id", "temperature_c", "occupancy_pct"]
    
    total_hours = days * 24
    
    for h in range(total_hours):
        current_time = start_date + timedelta(hours=h)
        day_of_year = current_time.timetuple().tm_yday
        hour = current_time.hour
        weekday = current_time.weekday() # 0 = Monday, 6 = Sunday
        is_weekend = weekday >= 5
        
        # 1. Temperature model (Seasonal + daily cycle in Celsius)
        # Seasonal: min around day 20 (Jan), max around day 200 (Jul)
        seasonal_temp = 18 + 14 * math.sin(2 * math.pi * (day_of_year - 105) / 365)
        # Diurnal temp cycle: min at 5 AM, max at 3 PM
        daily_temp_cycle = 4 * math.sin(2 * math.pi * (hour - 9) / 24)
        temp_c = round(seasonal_temp + daily_temp_cycle + random.gauss(0, 1.2), 1)
        
        # 2. Occupancy model
        if is_weekend:
            occupancy_pct = max(0, min(15, int(random.gauss(5, 2))))
        else:
            if 8 <= hour <= 17:
                # Working hours
                occupancy_pct = max(40, min(100, int(75 + 15 * math.sin(math.pi * (hour - 8) / 9) + random.gauss(0, 5))))
            elif 6 <= hour < 8 or 18 <= hour <= 20:
                occupancy_pct = max(10, min(40, int(25 + random.gauss(0, 4))))
            else:
                occupancy_pct = max(0, min(10, int(4 + random.gauss(0, 2))))
                
        # 3. Base electrical consumption (servers, security, baseload HVAC)
        baseload = 85.0 + random.gauss(0, 3.0)
        
        # 4. Occupancy-driven load (lighting, plug loads, computers)
        occupancy_load = (occupancy_pct / 100.0) * 180.0
        
        # 5. HVAC load based on temperature deviation from 21°C comfort setpoint
        temp_diff = abs(temp_c - 21.0)
        hvac_load = max(0.0, temp_diff * 6.5) * (0.6 + 0.4 * (occupancy_pct / 100.0))
        
        consumption = baseload + occupancy_load + hvac_load + random.gauss(0, 4.0)
        
        # 6. Inject a few realistic anomalies (approx 1% of points)
        # Anomaly Type A: Weekend HVAC left running at full power (e.g. Day 45, 115, 210)
        if day_of_year in [45, 115, 210, 280] and is_weekend and 10 <= hour <= 18:
            consumption += 220.0 # Significant anomalous surge
            
        # Anomaly Type B: Late night chiller malfunction / power surge (e.g. Day 82, 160, 240, 320 at 2 AM)
        if day_of_year in [82, 160, 240, 320] and hour in [1, 2, 3]:
            consumption += 190.0
            
        # Anomaly Type C: Sudden drop / power outage / sensor fault (Day 195, 290)
        if day_of_year in [195, 290] and 12 <= hour <= 15:
            consumption = max(15.0, consumption * 0.15)
            
        consumption = max(10.0, round(consumption, 2))
        
        records.append([
            current_time.strftime("%Y-%m-%d %H:%M:%S"),
            f"{consumption:.2f}",
            "HQ-BLDG-01",
            f"{temp_c:.1f}",
            str(occupancy_pct)
        ])
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(",".join(headers) + "\n")
        for r in records:
            f.write(",".join(r) + "\n")
            
    print(f"Generated {len(records)} records into {output_path}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out = os.path.abspath(os.path.join(script_dir, "..", "..", "data", "sample", "commercial_campus_energy_hourly.csv"))
    generate_energy_dataset(out, days=365)
