# Elderly Care Monitoring System

An IoT-based solution for elderly safety, featuring a web dashboard for caregivers and a wearable device for patients.

## 🚀 Features
- **Fall Detection Simulation:** Trigger alerts from the web app or wearable sensors.
- **Medication Reminders:** Automated alerts sent to the wearable device at scheduled times.
- **Telegram Integration:** Instant emergency notifications via Telegram Bot API.
- **Real-time Monitoring:** Cloud-based data sync using Adafruit IO (MQTT).

## 🛠 Hardware Requirements
- **Microcontroller:** ESP8266 (NodeMCU or Wemos D1 Mini)
- **Display:** Nokia 5110 LCD (84x48)
- **Connectivity:** Active Wi-Fi Connection

## 💻 Software Stack
- **Frontend:** React.js, Vite, Tailwind CSS, Lucide Icons
- **Cloud/MQTT:** Adafruit IO
- **Communication:** MQTT.js, Telegram Bot API
- **Firmware:** C++ (Arduino IDE)

## 🔧 Installation

### Web Application
1. Clone the repository.
2. Create a `.env` file in the root directory:
   ```env
   VITE_TELEGRAM_BOT_TOKEN=your_bot_token
   VITE_ADAFRUIT_USER=your_adafruit_user
   VITE_ADAFRUIT_KEY=your_aio_key