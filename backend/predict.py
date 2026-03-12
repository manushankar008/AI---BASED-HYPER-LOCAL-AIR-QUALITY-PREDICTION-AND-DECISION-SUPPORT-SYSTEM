import joblib
import pandas as pd

# Load saved model
model = joblib.load("aqi_model.pkl")

# Example input (change values to test)
sample_data = pd.DataFrame([{
    "City": "Delhi",
    "PM2.5": 150,
    "PM10": 200,
    "NO": 40,
    "NO2": 60,
    "NOx": 80,
    "NH3": 30,
    "CO": 2,
    "SO2": 20,
    "O3": 50,
    "Benzene": 5,
    "Toluene": 10
}])

prediction = model.predict(sample_data)

print("Predicted AQI:", prediction[0])
