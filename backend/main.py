import os
import io
import time
import base64
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import firebase_admin
from firebase_admin import auth, credentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from ultralytics import YOLO

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

# ==========================================
# LOAD YOLOv8 MODEL
# ==========================================
YOLO_MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolov8_silkworm.pt")
yolo_model = None
if os.path.exists(YOLO_MODEL_PATH):
    print("Loading YOLOv8 silkworm model...")
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
        print(f"YOLOv8 model loaded. Classes: {yolo_model.names}")
    except Exception as e:
        print(f"YOLOv8 load failed: {e}")
        yolo_model = None
else:
    print(f"Warning: YOLOv8 model not found at {YOLO_MODEL_PATH}")


class DetectionItem(BaseModel):
    class_name: str
    confidence: float
    bbox: list  # [x1, y1, x2, y2]


class PredictionResponse(BaseModel):
    detections: list
    counts: dict
    total: int
    annotated_image: str  # base64 PNG with boxes drawn
    timestamp: float
    result: str = "Healthy"
    confidence: float = 95.0


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
    return {"status": "Secure API is running", "model_loaded": yolo_model is not None}


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
    """Returns model info."""
    if yolo_model is None:
        return {"error": "YOLOv8 model not loaded"}
    return {
        "model": "YOLOv8s",
        "classes": yolo_model.names,
        "model_loaded": True
    }


def apply_nms_deduplication(boxes, scores, cls_list, iou_thresh=0.35):
    """
    Applies Non-Maximum Suppression to remove duplicate/overlapping bounding box proposals
    for the same silkworm.
    """
    if not boxes:
        return [], [], []
    import torch
    from torchvision.ops import nms
    boxes_t = torch.tensor(boxes, dtype=torch.float32)
    scores_t = torch.tensor(scores, dtype=torch.float32)
    keep = nms(boxes_t, scores_t, iou_threshold=iou_thresh)
    keep_indices = keep.tolist()
    return [boxes[i] for i in keep_indices], [scores[i] for i in keep_indices], [cls_list[i] for i in keep_indices]


def run_sliced_inference(model, image_np, win_size=320, stride=160, conf_threshold=0.25, iou_threshold=0.25):
    """
    Universal Slicing-Aided Hyper Inference (SAHI) with resolution normalization.
    Normalizes low-res & high-res tray photos so silkworm features match macro training scale.
    Calibrated with conf=0.25 to eliminate false Grasserie classifications.
    """
    import torch
    import cv2
    from torchvision.ops import nms

    orig_h, orig_w, _ = image_np.shape

    # Normalize resolution so silkworms reach optimal feature extraction scale
    target_w = max(1800, orig_w)
    target_h = int(orig_h * (target_w / orig_w))
    norm_img = cv2.resize(image_np, (target_w, target_h), interpolation=cv2.INTER_CUBIC)
    h, w, _ = norm_img.shape

    all_boxes, all_scores, all_cls = [], [], []

    y_steps = list(range(0, max(1, h - win_size + 1), stride))
    if len(y_steps) > 0 and y_steps[-1] + win_size < h:
        y_steps.append(h - win_size)

    x_steps = list(range(0, max(1, w - win_size + 1), stride))
    if len(x_steps) > 0 and x_steps[-1] + win_size < w:
        x_steps.append(w - win_size)

    for y in y_steps:
        for x in x_steps:
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(w, x1 + win_size)
            y2 = min(h, y1 + win_size)
            crop = norm_img[y1:y2, x1:x2]
            res = model(crop, conf=conf_threshold, verbose=False)[0]

            scale_x = orig_w / w
            scale_y = orig_h / h

            for box in res.boxes:
                b = box.xyxy[0].cpu().numpy()
                x1_orig = (b[0] + x1) * scale_x
                y1_orig = (b[1] + y1) * scale_y
                x2_orig = (b[2] + x1) * scale_x
                y2_orig = (b[3] + y1) * scale_y
                all_boxes.append([x1_orig, y1_orig, x2_orig, y2_orig])
                all_scores.append(float(box.conf[0]))
                all_cls.append(int(box.cls[0]))

    if not all_boxes:
        return [], {}, 0, image_np

    final_boxes, final_scores, final_cls = apply_nms_deduplication(all_boxes, all_scores, all_cls, iou_thresh=iou_threshold)

    detections = []
    counts = {}
    annotated_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

    for box, score, cls_idx in zip(final_boxes, final_scores, final_cls):
        cls_name = model.names[cls_idx]
        x1, y1, x2, y2 = [int(v) for v in box]
        detections.append({
            "class_name": cls_name,
            "confidence": round(float(score), 4),
            "bbox": [x1, y1, x2, y2]
        })
        counts[cls_name] = counts.get(cls_name, 0) + 1

        color = (0, 0, 255) if cls_name == "Grasserie" else (0, 255, 0)
        cv2.rectangle(annotated_bgr, (x1, y1), (x2, y2), color, 2)
        label = f"{cls_name} {int(score * 100)}%"
        cv2.putText(annotated_bgr, label, (x1, max(15, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

    annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
    return detections, counts, len(detections), annotated_rgb


@app.post("/predict", response_model=PredictionResponse)
@limiter.limit("300/minute")
async def predict_disease(
    request: Request,
    file: UploadFile = File(...),
):
    if yolo_model is None:
        raise HTTPException(status_code=500, detail="YOLOv8 model is not loaded.")

    allowed_extensions = ["jpg", "jpeg", "png"]
    ext = file.filename.split(".")[-1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG and PNG allowed.")

    try:
        contents = await file.read()

        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

        # Open image
        pil_image = Image.open(io.BytesIO(contents))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        image_np = np.array(pil_image)  # RGB numpy array

        # 1. First run standard YOLOv8 inference
        results = yolo_model(pil_image, verbose=False)[0]

        raw_boxes = []
        raw_scores = []
        raw_cls = []
        for box in results.boxes:
            b = box.xyxy[0].cpu().numpy()
            raw_boxes.append([float(b[0]), float(b[1]), float(b[2]), float(b[3])])
            raw_scores.append(float(box.conf[0]))
            raw_cls.append(int(box.cls[0]))

        # Deduplicate single image predictions to avoid multiple overlapping boxes per worm
        clean_boxes, clean_scores, clean_cls = apply_nms_deduplication(raw_boxes, raw_scores, raw_cls, iou_thresh=0.35)

        detections = []
        counts = {}
        for box, conf, cls_idx in zip(clean_boxes, clean_scores, clean_cls):
            cls_name = yolo_model.names[cls_idx]
            x1, y1, x2, y2 = box
            detections.append({
                "class_name": cls_name,
                "confidence": round(conf, 4),
                "bbox": [round(x1), round(y1), round(x2), round(y2)]
            })
            counts[cls_name] = counts.get(cls_name, 0) + 1

        # Render clean annotated image for standard inference
        annotated_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        for d in detections:
            x1, y1, x2, y2 = d["bbox"]
            color = (0, 0, 255) if d["class_name"] == "Grasserie" else (0, 255, 0)
            cv2.rectangle(annotated_np, (x1, y1), (x2, y2), color, 2)
            label = f"{d['class_name']} {int(d['confidence'] * 100)}%"
            cv2.putText(annotated_np, label, (x1, max(15, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # 2. If standard inference yields few detections (meaning a wide tray photo with tiny silkworms), run High-Density SAHI
        if len(detections) <= 3:
            sliced_dets, sliced_counts, sliced_total, sliced_annotated = run_sliced_inference(
                yolo_model, image_np
            )
            if sliced_total > len(detections):
                detections = sliced_dets
                counts = sliced_counts
                annotated_np = sliced_annotated

        annotated_pil = Image.fromarray(annotated_np)
        buf = io.BytesIO()
        annotated_pil.save(buf, format="PNG")
        annotated_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        has_grasserie = counts.get("Grasserie", 0) > 0
        disease_result = "Grasserie" if has_grasserie else "Healthy"
        max_conf = max([d["confidence"] for d in detections], default=0.95)

        return PredictionResponse(
            detections=detections,
            counts=counts,
            total=len(detections),
            annotated_image=annotated_b64,
            timestamp=time.time(),
            result=disease_result,
            confidence=round(max_conf * 100, 1),
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")
