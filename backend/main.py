import os
import io
import time
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import keras
import keras.layers
import tensorflow as tf
try:
    import tf_keras as tf_keras_compat
except ImportError:
    tf_keras_compat = None
from PIL import Image
import numpy as np
import firebase_admin
from firebase_admin import auth, credentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Patch layers to ignore unknown kwargs from newer Keras versions (e.g. quantization_config)
_UNKNOWN_KWARGS = {"renorm", "renorm_clipping", "renorm_momentum", "quantization_config"}

def _make_patched_init(original_init):
    def _patched_init(self, *args, **kwargs):
        for k in _UNKNOWN_KWARGS:
            kwargs.pop(k, None)
        original_init(self, *args, **kwargs)
    return _patched_init

for _layer_cls in [
    keras.layers.BatchNormalization,
    keras.layers.Dense,
    keras.layers.Conv2D,
    keras.layers.DepthwiseConv2D,
    keras.layers.SeparableConv2D,
]:
    _layer_cls.__init__ = _make_patched_init(_layer_cls.__init__)

# ==========================================
# LAYER 3 & 5 SECURITY: API Backend
# ==========================================

# 1. Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SilkSphere Secure API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Firebase Auth (optional — only if serviceAccountKey.json exists)
cred_path = os.path.join(os.path.dirname(__file__), "..", "serviceAccountKey.json")
if os.path.exists(cred_path):
    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

# 4. Load AI Model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "silkworm_disease_model.keras")
model = None
if os.path.exists(MODEL_PATH):
    print("Loading AI model...")
    try:
        # Try tf_keras first (compatibility layer for Keras 2.x models)
        if tf_keras_compat:
            model = tf_keras_compat.models.load_model(MODEL_PATH, compile=False)
            print("Model loaded via tf_keras (compatibility mode).")
        else:
            model = keras.models.load_model(MODEL_PATH, compile=False)
            print("Model loaded via keras.")
    except Exception as e:
        print(f"Keras load failed ({e}), trying TF SavedModel format...")
        try:
            model = tf.keras.models.load_model(MODEL_PATH, compile=False)
            print("Model loaded via tf.keras.")
        except Exception as e2:
            print(f"All load attempts failed: {e2}")
            model = None
else:
    print(f"Warning: Model not found at {MODEL_PATH}")


class PredictionResponse(BaseModel):
    class_name: str
    confidence: float
    timestamp: float


class SensorReading(BaseModel):
    temp: float
    humidity: float
    co2: float
    timestamp: float = None


class ArduinoSensorData(BaseModel):
    temperature: float
    humidity: float
    co2: float
    timestamp: float = None
    node_id: str = "unknown"
    zones: dict = None


class BatchStateRequest(BaseModel):
    current_stage: str
    days_in_stage: float
    sensor_history: list[SensorReading]
    ai_health_score: float = 100.0


class PredictionResponseData(BaseModel):
    predicted_stage_24h: str
    predicted_progress_24h: float
    predicted_stage_48h: str
    predicted_progress_48h: float
    expected_cocoon_grade: str
    env_compliance_score: float


STAGES = ['Egg', 'Instar 1', 'Instar 2', 'Instar 3', 'Instar 4', 'Instar 5', 'Spinning', 'Cocoon']

IDEALS = {
    # Instar I-III (young larvae): Temp 26-28°C, Humidity 80-85%, CO2 300-400ppm
    'Egg':      {'temp': 27.0, 'humidity': 82.0, 'co2': 350.0, 'duration_days': 10,
                 'tempMin': 24.0, 'tempMax': 30.0, 'humMin': 70.0, 'humMax': 90.0, 'co2Max': 1500.0},
    'Instar 1': {'temp': 27.0, 'humidity': 82.0, 'co2': 350.0, 'duration_days': 3,
                 'tempMin': 24.0, 'tempMax': 30.0, 'humMin': 70.0, 'humMax': 90.0, 'co2Max': 1500.0},
    'Instar 2': {'temp': 27.0, 'humidity': 82.0, 'co2': 350.0, 'duration_days': 3,
                 'tempMin': 24.0, 'tempMax': 30.0, 'humMin': 70.0, 'humMax': 90.0, 'co2Max': 1500.0},
    'Instar 3': {'temp': 27.0, 'humidity': 82.0, 'co2': 350.0, 'duration_days': 3,
                 'tempMin': 24.0, 'tempMax': 30.0, 'humMin': 70.0, 'humMax': 90.0, 'co2Max': 1500.0},
    # Instar IV-V (late larvae): Temp 22-26°C, Humidity 70-80%, CO2 300-400ppm
    'Instar 4': {'temp': 24.0, 'humidity': 75.0, 'co2': 350.0, 'duration_days': 4,
                 'tempMin': 20.0, 'tempMax': 28.0, 'humMin': 55.0, 'humMax': 90.0, 'co2Max': 1500.0},
    'Instar 5': {'temp': 24.0, 'humidity': 75.0, 'co2': 350.0, 'duration_days': 5,
                 'tempMin': 20.0, 'tempMax': 28.0, 'humMin': 55.0, 'humMax': 90.0, 'co2Max': 1500.0},
    # Cocoon/Pupal: Temp 23-25°C, Humidity 65-75%, CO2 300-400ppm
    'Spinning': {'temp': 24.0, 'humidity': 70.0, 'co2': 350.0, 'duration_days': 4,
                 'tempMin': 20.0, 'tempMax': 28.0, 'humMin': 60.0, 'humMax': 85.0, 'co2Max': 1500.0},
    'Cocoon':   {'temp': 24.0, 'humidity': 70.0, 'co2': 350.0, 'duration_days': 3,
                 'tempMin': 20.0, 'tempMax': 28.0, 'humMin': 60.0, 'humMax': 85.0, 'co2Max': 1500.0},
}


def predict_advancement(stage: str, days_in: float, hours: float, growth_factor: float):
    days_to_add = (hours / 24.0) * growth_factor
    total_days = days_in + days_to_add
    
    curr_stage = stage
    try:
        stage_idx = STAGES.index(curr_stage)
    except ValueError:
        stage_idx = 3  # default to Instar 3
        curr_stage = STAGES[stage_idx]
        
    while stage_idx < len(STAGES):
        duration = IDEALS[curr_stage]['duration_days']
        if total_days <= duration:
            progress_pct = (total_days / duration) * 100.0
            return curr_stage, round(min(100.0, progress_pct), 1)
        else:
            total_days -= duration
            stage_idx += 1
            if stage_idx < len(STAGES):
                curr_stage = STAGES[stage_idx]
            else:
                return 'Cocoon', 100.0
    return 'Cocoon', 100.0


@app.post("/predict-batch-state", response_model=PredictionResponseData)
def predict_batch_state(req: BatchStateRequest):
    current_stage = req.current_stage
    days_in_stage = req.days_in_stage
    sensor_history = req.sensor_history
    ai_health_score = req.ai_health_score
    
    n = len(sensor_history)
    if n == 0:
        ideal = IDEALS.get(current_stage, IDEALS['Instar 3'])
        avg_temp = ideal['temp']
        avg_humidity = ideal['humidity']
        avg_co2 = ideal['co2']
    else:
        avg_temp = sum(r.temp for r in sensor_history) / n
        avg_humidity = sum(r.humidity for r in sensor_history) / n
        avg_co2 = sum(r.co2 for r in sensor_history) / n
        
    ideal = IDEALS.get(current_stage, IDEALS['Instar 3'])
    temp_drift = abs(avg_temp - ideal['temp'])
    hum_drift = abs(avg_humidity - ideal['humidity'])
    co2_drift = max(0.0, avg_co2 - ideal['co2'])
    
    temp_score = max(0.0, 100.0 - (temp_drift * 15.0))
    hum_score = max(0.0, 100.0 - (hum_drift * 5.0))
    co2_score = max(0.0, 100.0 - (co2_drift * 0.1))
    
    env_compliance_score = (temp_score + hum_score + co2_score) / 3.0
    growth_factor = max(0.1, env_compliance_score / 100.0)
    
    predicted_stage_24h, predicted_progress_24h = predict_advancement(
        current_stage, days_in_stage, 24.0, growth_factor
    )
    predicted_stage_48h, predicted_progress_48h = predict_advancement(
        current_stage, days_in_stage, 48.0, growth_factor
    )
    
    overall_score = (env_compliance_score * 0.4) + (ai_health_score * 0.6)
    if overall_score >= 85.0:
        expected_cocoon_grade = 'A'
    elif overall_score >= 70.0:
        expected_cocoon_grade = 'B'
    elif overall_score >= 50.0:
        expected_cocoon_grade = 'C'
    else:
        expected_cocoon_grade = 'D'
        
    # Apply severe current condition penalty if applicable
    has_severe_anomaly = False
    if n > 0:
        latest = sensor_history[-1]
        if latest.temp > 31.0 or latest.temp < 19.0 or latest.humidity < 55.0 or latest.co2 > 1300:
            has_severe_anomaly = True
            
    if has_severe_anomaly:
        grades = ['A', 'B', 'C', 'D']
        idx = grades.index(expected_cocoon_grade)
        if idx < 3:
            expected_cocoon_grade = grades[idx + 1]
            
    return PredictionResponseData(
        predicted_stage_24h=predicted_stage_24h,
        predicted_progress_24h=predicted_progress_24h,
        predicted_stage_48h=predicted_stage_48h,
        predicted_progress_48h=predicted_progress_48h,
        expected_cocoon_grade=expected_cocoon_grade,
        env_compliance_score=round(env_compliance_score, 1)
    )


@app.get("/")
def health_check():
    return {"status": "Secure API is running", "model_loaded": model is not None}


# ==========================================
# ARDUINO SENSOR DATA ENDPOINT
# ==========================================
@app.post("/sensor-data")
@limiter.limit("120/minute")  # Allow frequent updates from Arduino
async def receive_sensor_data(request: Request, data: ArduinoSensorData):
    """
    Endpoint to receive real-time sensor data from Arduino/ESP32
    
    Example payload:
    {
        "temperature": 25.5,
        "humidity": 78.0,
        "co2": 950,
        "timestamp": 1234567890,
        "node_id": "ESP32-001",
        "zones": {
            "Zone A": {"temperature": 25.5, "humidity": 78.0, "co2": 950},
            "Zone B": {"temperature": 26.0, "humidity": 77.0, "co2": 920}
        }
    }
    """
    try:
        # You can store this in a database, Firebase, or file
        print(f"[SENSOR DATA] Node: {data.node_id} | Temp: {data.temperature}°C | "
              f"Humidity: {data.humidity}% | CO2: {data.co2} ppm")
        
        # Optional: Write to a file for persistent storage
        sensor_log_path = os.path.join(os.path.dirname(__file__), "sensor_log.txt")
        with open(sensor_log_path, "a") as f:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"{timestamp},{data.node_id},{data.temperature},{data.humidity},{data.co2}\n")
        
        return {
            "status": "success",
            "message": "Sensor data received",
            "data": data.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing sensor data: {e}")


@app.get("/sensor-data/history")
async def get_sensor_history(hours: int = 24):
    """
    Get sensor history from sensor_log.txt for the last N hours
    Used by frontend Environment page to show real history charts
    """
    try:
        import datetime
        sensor_log_path = os.path.join(os.path.dirname(__file__), "sensor_log.txt")
        
        if not os.path.exists(sensor_log_path):
            return {"history": [], "message": "No history yet"}
        
        history = []
        cutoff = datetime.datetime.now() - datetime.timedelta(hours=hours)
        
        with open(sensor_log_path, "r") as f:
            lines = f.readlines()
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            parts = line.split(",")
            if len(parts) < 5:
                continue
            try:
                data_time = datetime.datetime.strptime(parts[0], "%Y-%m-%d %H:%M:%S")
                if data_time >= cutoff:
                    history.append({
                        "time": data_time.strftime("%H:%M"),
                        "date": data_time.strftime("%Y-%m-%d %H:%M"),
                        "temp": float(parts[2]),
                        "humidity": float(parts[3]),
                        "co2": int(float(parts[4])),
                        "node_id": parts[1]
                    })
            except:
                continue
        
        return {
            "history": history,
            "count": len(history),
            "hours": hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading history: {e}")


@app.get("/sensor-data/latest")
async def get_latest_sensor_data():
    """
    Get the most recent sensor reading
    AUTO-GENERATES realistic data if no real hardware connected
    """
    try:
        sensor_log_path = os.path.join(os.path.dirname(__file__), "sensor_log.txt")
        
        # Check if we have recent real data (within last 30 seconds)
        if os.path.exists(sensor_log_path):
            with open(sensor_log_path, "r") as f:
                lines = f.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    parts = last_line.split(",")
                    if len(parts) >= 5:
                        # Check if data is recent
                        import datetime
                        try:
                            timestamp_str = parts[0]
                            data_time = datetime.datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                            now = datetime.datetime.now()
                            age_seconds = (now - data_time).total_seconds()
                            
                            # If data is less than 30 seconds old, use it
                            if age_seconds < 30:
                                return {
                                    "temperature": float(parts[2]),
                                    "humidity": float(parts[3]),
                                    "co2": int(float(parts[4])),
                                    "nodeStatus": "Online - Real Hardware",
                                    "node_id": parts[1],
                                    "timestamp": time.time()
                                }
                        except:
                            pass
        
        # Generate realistic mock data
        import random
        import math
        
        # Use time-based variation for realistic changes
        t = time.time() / 60  # Minutes
        
        # Temperature: 24-28°C with smooth sine wave variation
        base_temp = 26.0
        temp_variation = 2.0 * math.sin(t / 30)  # 30-minute cycle
        temperature = round(base_temp + temp_variation + random.uniform(-0.3, 0.3), 1)
        
        # Humidity: 70-85% with inverse correlation to temp
        base_humidity = 78.0
        humidity_variation = -2.0 * math.sin(t / 30)  # Inverse of temperature
        humidity = round(base_humidity + humidity_variation + random.uniform(-2, 2), 1)
        
        # CO2: 850-950 ppm with slight random walk
        co2 = int(900 + 50 * math.sin(t / 45) + random.randint(-20, 20))
        
        return {
            "temperature": temperature,
            "humidity": humidity,
            "co2": co2,
            "nodeStatus": "Simulated - Smart Mock Data",
            "node_id": "MOCK-GENERATOR",
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


# Motor control state
motor_control_state = {
    "motor_enabled": False,
    "manual_override": False,
    "timestamp": time.time()
}


@app.get("/motor-control")
async def get_motor_control():
    """
    ESP32 polls this endpoint to get motor control commands
    """
    return motor_control_state


@app.post("/motor-control")
async def set_motor_control(request: Request):
    """
    Frontend sends motor control commands here
    """
    global motor_control_state
    try:
        data = await request.json()
        motor_control_state = {
            "motor_enabled": data.get("motor_enabled", False),
            "manual_override": data.get("manual_override", False),
            "timestamp": time.time()
        }
        print(f"[MOTOR CONTROL] Updated: {motor_control_state}")
        return {"status": "success", "state": motor_control_state}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {e}")


@app.get("/debug")
def debug_predict():
    """Returns raw model output on test inputs to diagnose threshold."""
    if model is None:
        return {"error": "model not loaded"}
    results = {}
    for name, arr_raw in [
        ("all_zeros", np.zeros((224, 224, 3), dtype=np.float32)),
        ("all_128",   np.full((224, 224, 3), 128, dtype=np.float32)),
        ("random",    np.random.randint(0, 255, (224, 224, 3)).astype(np.float32)),
    ]:
        arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr_raw)
        arr = np.expand_dims(arr, axis=0)
        raw = float(model.predict(arr, verbose=0)[0][0])
        results[name] = {"raw": round(raw, 6), "label": "Healthy" if raw > 0.5 else "Grasserie"}
    return results


@app.post("/predict", response_model=PredictionResponse)
@limiter.limit("30/minute")
def predict_disease(
    request: Request,
    file: UploadFile = File(...),
):
    if model is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")

    allowed_extensions = ["jpg", "jpeg", "png"]
    ext = file.filename.split(".")[-1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG and PNG allowed.")

    try:
        contents = file.file.read()

        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

        image = Image.open(io.BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")

        image = image.resize((224, 224))

        # MobileNetV2 preprocessing: scale pixels to [-1, 1]
        img_array = tf.keras.applications.mobilenet_v2.preprocess_input(
            np.array(image, dtype=np.float32)
        )
        img_array = np.expand_dims(img_array, axis=0)

        prediction = model.predict(img_array, verbose=0)[0][0]

        # sigmoid output: 0 = Grasserie (infected), 1 = Healthy
        class_name = "Healthy" if prediction > 0.5 else "Grasserie"
        confidence = float(prediction) if prediction > 0.5 else float(1.0 - prediction)

        return PredictionResponse(
            class_name=class_name,
            confidence=confidence,
            timestamp=time.time()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")
