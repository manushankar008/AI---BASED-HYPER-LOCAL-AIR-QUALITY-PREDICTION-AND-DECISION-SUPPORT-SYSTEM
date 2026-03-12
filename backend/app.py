from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pandas as pd
import joblib
import time

app = Flask(__name__)
CORS(app)

API_KEY = "0bfc81d7d4cd848c927cd0259df04eae"

# Load ML model (optional hybrid layer)
try:
    model = joblib.load("aqi_model.pkl")
except:
    model = None


# -------------------------------
# CPCB BREAKPOINTS
# -------------------------------

PM25_BP = [
    (0, 30, 0, 50),
    (31, 60, 51, 100),
    (61, 90, 101, 200),
    (91, 120, 201, 300),
    (121, 250, 301, 400),
    (251, 500, 401, 500),
]

PM10_BP = [
    (0, 50, 0, 50),
    (51, 100, 51, 100),
    (101, 250, 101, 200),
    (251, 350, 201, 300),
    (351, 430, 301, 400),
    (431, 600, 401, 500),
]

NO2_BP = [
    (0, 40, 0, 50),
    (41, 80, 51, 100),
    (81, 180, 101, 200),
    (181, 280, 201, 300),
    (281, 400, 301, 400),
    (401, 1000, 401, 500),
]


# -------------------------------
# AQI Calculation
# -------------------------------

def calculate_subindex(C, breakpoints):
    for C_low, C_high, I_low, I_high in breakpoints:
        if C_low <= C <= C_high:
            return ((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low
    return 0


def calculate_aqi(components):
    sub = {}

    sub["PM2.5"] = calculate_subindex(components["PM2.5"], PM25_BP)
    sub["PM10"] = calculate_subindex(components["PM10"], PM10_BP)
    sub["NO2"] = calculate_subindex(components["NO2"], NO2_BP)

    final_aqi = max(sub.values())
    dominant = max(sub, key=sub.get)

    return round(final_aqi, 2), dominant, sub


# -------------------------------
# Risk Engine
# -------------------------------

def risk_level(aqi):
    if aqi is None:
        return "Unknown", "Gray"

    if aqi <= 50:
        risk = "Good"
        color = "Green"
    elif aqi <= 100:
        risk = "Moderate"
        color = "Yellow"
    elif aqi <= 150:
        risk = "Unhealthy for Sensitive Groups"
        color = "Orange"
    elif aqi <= 200:
        risk = "Unhealthy"
        color = "Red"
    elif aqi <= 300:
        risk = "Very Unhealthy"
        color = "Purple"
    else:
        risk = "Hazardous"
        color = "Maroon"

    return risk, color
    


def health_advisory(aqi):
    if aqi <= 50:
        return "Outdoor sports safe. No mask needed."
    elif aqi <= 100:
        return "Sensitive individuals limit prolonged outdoor exposure."
    elif aqi <= 200:
        return "Limit outdoor sports. Mask recommended."
    else:
        return "Avoid outdoor activity. Postpone campus events."


# -------------------------------
# External API Calls
# -------------------------------

def get_lat_lon(city):
    geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={API_KEY}"
    response = requests.get(geo_url).json()

    if not response:
        return None, None

    return response[0]["lat"], response[0]["lon"]


def get_current_pollution(lat, lon):
    url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={API_KEY}"
    data = requests.get(url).json()

    comp = data["list"][0]["components"]

    return {
        "PM2.5": comp.get("pm2_5", 0),
        "PM10": comp.get("pm10", 0),
        "NO2": comp.get("no2", 0),
        "CO": comp.get("co", 0),
        "SO2": comp.get("so2", 0),
        "O3": comp.get("o3", 0),
    }


def get_historical_pollution(lat, lon, days=3):
    end = int(time.time())
    start = end - days * 86400

    url = f"http://api.openweathermap.org/data/2.5/air_pollution/history?lat={lat}&lon={lon}&start={start}&end={end}&appid={API_KEY}"
    data = requests.get(url).json()

    return data.get("list", [])


def average_pollutants(history):
    if not history:
        return {"PM2.5": 0, "PM10": 0, "NO2": 0}

    avg = {"PM2.5": 0, "PM10": 0, "NO2": 0}

    for item in history:
        comp = item["components"]
        avg["PM2.5"] += comp.get("pm2_5", 0)
        avg["PM10"] += comp.get("pm10", 0)
        avg["NO2"] += comp.get("no2", 0)

    for key in avg:
        avg[key] /= len(history)

    return avg


# -------------------------------
# API ROUTE
# -------------------------------

@app.route("/api/aqi", methods=["POST"])
def get_aqi():
    data = request.json
    city = data.get("city")

    if not city:
        return jsonify({"error": "City is required"}), 400

    lat, lon = get_lat_lon(city)
    if lat is None:
        return jsonify({"error": "City not found"}), 404

    # Current AQI
    current_components = get_current_pollution(lat, lon)
    current_aqi, dominant, sub = calculate_aqi(current_components)

    # Historical Prediction
    history = get_historical_pollution(lat, lon)
    avg_components = average_pollutants(history)
    formula_prediction, _, _ = calculate_aqi(avg_components)

    hybrid_prediction = formula_prediction

    print("Hybrid prediction:", hybrid_prediction, type(hybrid_prediction))

    if model:
        df = pd.DataFrame([{
            "City": city,
            "PM2.5": avg_components["PM2.5"],
            "PM10": avg_components["PM10"],
            "NO": 0,
            "NO2": avg_components["NO2"],
            "NOx": avg_components["NO2"],
            "NH3": 0,
            "CO": 0,
            "SO2": 0,
            "O3": 0,
            "Benzene": 0,
            "Toluene": 0
        }])

        ml_prediction = model.predict(df)[0]
        hybrid_prediction = round(0.7 * formula_prediction + 0.3 * ml_prediction, 2)

    risk, color = risk_level(hybrid_prediction)
    advisory = health_advisory(hybrid_prediction)

    return jsonify({
        "city": city,
        "current_aqi": round(current_aqi, 2),
        "predicted_aqi": round(hybrid_prediction, 2),
        "risk": risk,
        "color": color,
        "dominant_pollutant": dominant,
        "advisory": advisory,
        "pollutants": {
            "pm25": current_components["PM2.5"],
            "pm10": current_components["PM10"],
            "no2": current_components["NO2"],
            "co": current_components["CO"],
            "so2": current_components["SO2"],
            "o3": current_components["O3"]
            },
        "trend": [
            {"date": "Yesterday", "aqi": round(current_aqi - 10, 2)},
            {"date": "Today", "aqi": round(current_aqi, 2)},
            {"date": "Tomorrow", "aqi": round(hybrid_prediction, 2)}
        ]
    })


if __name__ == "__main__":
    app.run(debug=True)