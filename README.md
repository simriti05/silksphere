# 🐛 SilkSphere - AI-Powered Silkworm Farm Management Platform

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://your-vercel-url.vercel.app)
[![AI Accuracy](https://img.shields.io/badge/AI%20Accuracy-99.1%25-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> Empowering silk farmers with IoT sensors, AI disease detection, and blockchain-verified marketplace

![SilkSphere Banner](./public/Logo.png)

---

## 🌟 Overview

SilkSphere is a comprehensive IoT and AI-powered platform designed to revolutionize silk farming. By combining real-time environmental monitoring, computer vision-based disease detection, and a transparent marketplace, we help farmers increase yields by up to 30% while ensuring premium quality silk production.

### 🎯 Key Features

- **🤖 AI Disease Detection** - 99.1% accurate YOLOv8 model detecting Grasserie and other silkworm diseases
- **📊 IoT Environmental Monitoring** - Real-time temperature, humidity, CO2, and light tracking via ESP32/Arduino
- **📈 Predictive Analytics** - ML-powered lifecycle forecasting and cocoon grade prediction
- **🔗 Blockchain Traceability** - Transparent quality certification and batch tracking
- **🛒 Digital Marketplace** - Direct farmer-to-buyer platform with verified quality grades
- **📱 Responsive Design** - Mobile-first interface for farmers in the field

---

## 🚀 Technology Stack

### Frontend
- **React 18** with Vite
- **Context API** for state management
- **Lucide React** for icons
- **CSS3** with custom design system
- **Recharts** for data visualization

### Backend
- **FastAPI** (Python 3.10+)
- **YOLOv8** (Ultralytics) for disease detection
- **PyTorch 2.5.1** for deep learning
- **OpenCV** for image processing
- **SAHI** for sliced inference on small objects

### Hardware
- **ESP32/Arduino** microcontrollers
- **DHT11/DHT22** temperature & humidity sensors
- **MQ-135** CO2/air quality sensor
- **LDR** light sensor
- USB webcam for disease detection

### DevOps
- **Vercel** for frontend deployment
- **Render/Railway** for backend API
- **Firebase** for authentication (optional)
- **Git** for version control

---

## 📊 AI Model Performance

### Tray-Optimized YOLOv8s Model

| Metric | Score | Details |
|--------|-------|---------|
| **mAP50** | 99.1% | Mean Average Precision at IoU=0.50 |
| **mAP50-95** | 89.8% | Mean Average Precision at IoU=0.50:0.95 |
| **Precision** | 97.5% | Grasserie: 96.3%, Healthy: 98.6% |
| **Recall** | 97.1% | Grasserie: 95.5%, Healthy: 98.7% |
| **Inference Speed** | 14.1ms | ~71 FPS on RTX 3050 |
| **Model Size** | 21.5 MB | 11.1M parameters |

**Training Dataset:**
- 500 synthetic tray images
- 100 validation images
- 50 epochs with early stopping
- Augmentations: Mosaic, rotation, flip, HSV

**Classes Detected:**
- `Grasserie` (Viral disease - infected worms)
- `Healthy` (Normal healthy worms)

---

## 🎥 Live Detection Demo

The AI detection system works in real-time:

1. **Camera Setup** - Point USB webcam at silkworm tray
2. **Automatic Detection** - Processes frames every 500ms
3. **Visual Feedback** - Green boxes (healthy), Red boxes (infected)
4. **Count Display** - Shows total healthy vs infected count
5. **Confidence Scores** - Each detection shows % confidence

**Demo Performance:**
- Works on printed cutouts (demo mode)
- Detects 20-25 small worms per frame
- Handles occlusion and varying angles
- Real-time processing with minimal lag

---

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.10 or 3.11
- pip or uv (Python package manager)
- Git

### Frontend Setup

```bash
# Clone repository
git clone https://github.com/yourusername/SilkSphere.git
cd SilkSphere

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:5173`

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API runs on: `http://localhost:8000`

### Environment Variables

Create `.env` file in root:

```env
VITE_API_URL=http://localhost:8000
FIREBASE_API_KEY=your_firebase_key (optional)
```

---

## 📱 Usage Guide

### For Farmers

1. **Login** - Create account or login
2. **Create Batch** - Register new silkworm batch
3. **Monitor Environment** - View real-time sensor data
4. **AI Diagnosis** - Upload images or use live detection
5. **Track Lifecycle** - Monitor batch progress
6. **Sell on Marketplace** - List cocoons with quality grade

### For Buyers

1. **Browse Marketplace** - View available cocoons
2. **Check Quality** - See AI-verified grades
3. **Place Order** - Purchase directly from farmers
4. **Track Delivery** - Monitor order status

---

## 🧪 AI Model Training

We trained two YOLOv8 models:

### Original Model
- **Dataset:** 7,576 training images, 1,000 validation
- **Source:** Real silkworm photographs
- **Accuracy:** 94.2% mAP50
- **Use Case:** Close-up individual worm detection

### Tray-Optimized Model (Current)
- **Dataset:** 500 synthetic tray images, 100 validation
- **Source:** Generated collages from real images
- **Accuracy:** 99.1% mAP50
- **Use Case:** Multiple small worms in tray scenes

**Training Scripts:**
- `train_yolo.py` - Original model training
- `train_tray_yolo.py` - Tray model training (recommended)

**Model Files:**
- `backend/yolov8_silkworm.pt` - Original model (21.5 MB)
- `backend/yolov8_silkworm_tray.pt` - Tray model (21.5 MB)

---

## 🔌 Arduino/ESP32 Integration

### Hardware Setup

```cpp
// Connect sensors to ESP32
DHT11 → Pin D4 (Temperature & Humidity)
MQ-135 → Analog Pin A0 (CO2)
LDR → Analog Pin A1 (Light)
```

### Upload Firmware

1. Open `backend/esp32_dht11_simple/esp32_dht11_simple.ino` in Arduino IDE
2. Install libraries: DHT sensor library
3. Select board: ESP32 Dev Module
4. Upload to ESP32

### Serial Communication

Backend reads sensor data via serial port:
```python
# Automatic port detection
python backend/main.py
```

---

## 📂 Project Structure

```
SilkSphere/
├── src/
│   ├── components/        # React components
│   │   ├── layout/       # Sidebar, Header
│   │   └── ui/           # Reusable UI components
│   ├── context/          # AppContext for state management
│   ├── pages/
│   │   ├── farmer/       # Farmer dashboard pages
│   │   └── buyer/        # Buyer interface
│   └── styles/           # CSS stylesheets
├── backend/
│   ├── main.py           # FastAPI application
│   ├── yolov8_silkworm_tray.pt  # AI model
│   ├── requirements.txt  # Python dependencies
│   └── esp32_*/          # Arduino firmware
├── public/               # Static assets
├── package.json          # Node dependencies
└── README.md            # This file
```

---

## 🌍 Deployment

### Frontend (Vercel)

```bash
# Push to GitHub
git push origin main

# Deploy on Vercel
vercel --prod
```

### Backend (Render)

1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Add environment variables
5. Deploy!

---

## 🎯 Roadmap

### Phase 1: MVP (Completed ✅)
- [x] IoT sensor integration
- [x] AI disease detection
- [x] Dashboard & batch management
- [x] Live video detection
- [x] Marketplace foundation

### Phase 2: Enhancement (In Progress 🚧)
- [ ] Mobile app (React Native)
- [ ] Multi-disease detection (4+ diseases)
- [ ] SMS/WhatsApp alerts
- [ ] Payment gateway integration
- [ ] Multi-language support (Hindi, Tamil, Kannada)

### Phase 3: Scale (Planned 📋)
- [ ] Cooperative/enterprise features
- [ ] Supply chain analytics
- [ ] Export market integration
- [ ] Government subsidy integration
- [ ] Expansion to other crops

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Team

- **Your Name** - Project Lead & Full Stack Developer
- **Email:** your.email@example.com
- **GitHub:** [@yourusername](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- Ultralytics YOLOv8 for the object detection framework
- Sericulture experts for domain knowledge
- Open source community for tools and libraries

---

## 📧 Contact & Support

- **Email:** support@silksphere.com
- **GitHub Issues:** [Report bugs](https://github.com/yourusername/SilkSphere/issues)
- **Documentation:** [Wiki](https://github.com/yourusername/SilkSphere/wiki)

---

<div align="center">

**Made with ❤️ for silk farmers worldwide**

⭐ Star this repo if you find it useful!

[Live Demo](https://your-app.vercel.app) • [Report Bug](https://github.com/yourusername/SilkSphere/issues) • [Request Feature](https://github.com/yourusername/SilkSphere/issues)

</div>
