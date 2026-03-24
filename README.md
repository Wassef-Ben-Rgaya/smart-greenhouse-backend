# 🔧 Smart Greenhouse — Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![InfluxDB](https://img.shields.io/badge/InfluxDB-22ADF6?style=for-the-badge&logo=influxdb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens)

Part of the [🌿 Smart Greenhouse System](https://github.com/Wassef-Ben-Rgaya/smart-greenhouse)

</div>

---

## 📖 Description

REST API backend for the Smart Greenhouse System. Handles authentication, real-time sensor data management, actuator control, plant profiles, KPI computation, and Firebase/InfluxDB synchronization.

---

## 🏗️ Project Structure

```
smart-greenhouse-backend/
├── config/          # Firebase & InfluxDB configuration
├── controllers/     # Business logic (sensors, actuators, users, plants)
├── influx/          # InfluxDB queries and data management
├── middleware/      # JWT authentication middleware
├── models/          # Data models and schemas
├── routes/          # API route definitions
├── services/        # Firebase sync, notifications, background tasks
├── app.js           # Application entry point
├── package.json     # Dependencies
└── .gitignore       # Ignored files (.env, node_modules, credentials)
```

---

## 🚀 Installation

### Prerequisites
- Node.js >= 16
- npm >= 8
- Firebase project (Realtime Database + Firestore)
- InfluxDB instance (local or cloud)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Wassef-Ben-Rgaya/smart-greenhouse-backend.git
cd smart-greenhouse-backend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Start the server
npm run dev       # Development
npm start         # Production
```



## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT token |
| PUT | `/api/auth/profile` | Update user profile |

### Sensors & Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sensors/latest` | Latest sensor readings |
| GET | `/api/sensors/history` | Historical data with filters |
| GET | `/api/kpis` | Key performance indicators |

### Actuators
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actuators/control` | Manual actuator control |
| GET | `/api/actuators/status` | Current actuator states |
| GET | `/api/actuators/runtime` | Runtime statistics |

### Plants & Environments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plants` | Get all plant profiles |
| POST | `/api/plants` | Create plant profile |
| PUT | `/api/plants/:id` | Update plant thresholds |
| GET | `/api/environments` | Get environment configs |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get all alerts |
| POST | `/api/alerts/settings` | Configure alert thresholds |

---

## 💾 Data Architecture

```
InfluxDB (Real-time — every 1 second)
└── measurement: sensor_data
    ├── temperature (°C)
    ├── humidity (%)
    ├── light_intensity (lux)
    └── soil_moisture (%)

Firebase Realtime Database (Cloud sync — every 5 minutes)
└── /sensor_data/{timestamp}

Firebase Firestore
└── /environnements/{id}   ← Plant environment configs & thresholds
└── /users/{id}            ← User profiles
└── /plants/{id}           ← Plant profiles
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# Actuator simulation tests
npm run test:actuators
```

---

## 🔗 Related Repositories

| Repo | Description |
|------|-------------|
| [smart-greenhouse-mobile](https://github.com/Wassef-Ben-Rgaya/smart-greenhouse-mobile) | Flutter mobile app |
| [smart-greenhouse-plant-prediction](https://github.com/Wassef-Ben-Rgaya/smart-greenhouse-plant-prediction) | AI/ML models & Flask API |
| [smart-greenhouse-iot](https://github.com/Wassef-Ben-Rgaya/smart-greenhouse-iot) | Raspberry Pi IoT scripts |

---

## 👨‍💻 Author

**Wassef BEN RGAYA** — [LinkedIn](https://www.linkedin.com/in/wassef-ben-rgaya-600817188) · [GitHub](https://github.com/Wassef-Ben-Rgaya)

© 2025 — Polytech Tunis Final Year Project
