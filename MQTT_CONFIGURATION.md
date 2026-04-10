# MQTT Broker Configuration Guide

## Overview
This guide explains how to configure the MQTT broker for **local development** vs **Vercel production deployment**.

---

## **LOCAL DEVELOPMENT (localhost)**

### Installation & Setup

**Windows:**
```bash
# Install Mosquitto using WSL or Docker
# Option 1: Using Docker
docker run -d -p 1883:1883 -p 9001:9001 eclipse-mosquitto:latest

# Option 2: Download from https://mosquitto.org/download/
```

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

### Configuration

**Local `.env` file:**
```env
MQTT_BROKER=mqtt://localhost:1883
MQTT_USER=
MQTT_PASS=
```

### Testing Locally

**Subscribe to sensor data:**
```bash
mosquitto_sub -h localhost -t "sensors/+/data"
```

**Publish test data:**
```bash
mosquitto_pub -h localhost -t "sensors/Node1/data" \
  -m '{"pm2_5": 35.5, "gas": 450, "temperature": 25.5, "humidity": 60, "pm10": 50}'
```

---

## **PRODUCTION (Vercel)**

### Why Localhost Won't Work on Vercel

❌ **Issues:**
- Vercel functions are **stateless** and **ephemeral**
- MQTT requires **persistent connections**
- Functions have a **30-60 second timeout** (MQTT subscriptions timeout)
- Functions cannot access **localhost** from Vercel servers

✅ **Solution:** Use a **cloud-hosted MQTT broker**

### Recommended Cloud MQTT Services

| Service | Plan | URL | Notes |
|---------|------|-----|-------|
| **HiveMQ Cloud** | Free | `mqtt://broker.hivemq.com:1883` | Easy setup, reliable |
| **AWS IoT Core** | Free tier | Requires custom config | More complex but powerful |
| **DigitalOcean** | Paid | `mqtt://broker-region.digitalocean.com:1883` | Part of their platform |
| **Self-hosted VPS** | Varies | `mqtt://your-domain.com:1883` | Full control, more setup |
| **Mosquitto on EC2** | Low-cost | Any AWS region | Control, scalability |

### Setup for HiveMQ Cloud (Recommended for Beginners)

1. **Create Account:** https://www.hivemq.com/mqtt-cloud/
2. **Create a Cluster** (free tier available)
3. **Get Connection Details:** Public MQTT Broker URL (usually `mqtt://yourusername-abc123.s1.eu.hivemq.net:1883`)
4. **Create Credentials** if needed for authentication

### Configuration for Vercel

**Vercel Project Settings → Environment Variables:**

```env
MQTT_BROKER=mqtt://yourusername-abc123.s1.eu.hivemq.net:1883
MQTT_USER=your-username
MQTT_PASS=your-password
AQI_ALERT_THRESHOLD=100
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aqi_db
```

### Architecture on Vercel

```
IoT Devices (ESP32/Arduino)
           ↓
    [Cloud MQTT Broker] ← Persistent connection
           ↓
  Direct write to MongoDB
           ↓
  Vercel API Routes → Query MongoDB
           ↓
  Frontend Dashboard
```

**Important:** IoT devices publish directly to the cloud MQTT broker, not to Vercel!

---

## **Configuration Summary**

### Local Development
```javascript
// Backend automatically detects environment
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const IS_SERVERLESS = process.env.VERCEL === '1';

if (!IS_SERVERLESS) {
  // Connect to MQTT and listen for messages
  mqttClient = mqtt.connect(MQTT_BROKER, mqttOptions);
}
```

### Health Check Endpoint
```bash
# Check if backend is working
curl http://localhost:5000/api/health
# Response:
# {
#   "status": "ok",
#   "message": "AQI Backend is running",
#   "environment": "local",
#   "mqtt": "enabled",
#   "broker": "mqtt://localhost:1883"
# }
```

When on Vercel:
```bash
curl https://your-vercel-app.vercel.app/api/health
# Response:
# {
#   "status": "ok",
#   "message": "AQI Backend is running",
#   "environment": "vercel",
#   "mqtt": "disabled (serverless)",
#   "broker": "mqtt://..."
# }
```

---

## **Deployment Checklist**

- [ ] Set up cloud MQTT broker account
- [ ] Get MQTT broker URL, username, and password
- [ ] Add environment variables to Vercel project settings
- [ ] Update IoT device code to publish to cloud MQTT
- [ ] Test with `curl /api/health`
- [ ] Verify MongoDB connection
- [ ] Test sensor data flow from IoT → MQTT → MongoDB → API → Frontend

---

## **Troubleshooting**

### "Connection refused" error
- **Local:** Is Mosquitto running? `mosquitto -v`
- **Vercel:** Is cloud broker URL correct? Does it have proper auth credentials?

### "No data coming in"
- Check IoT device MQTT topic and payload format
- Verify MQTT broker credentials are correct
- Check MongoDB connection is working

### Timeouts on Vercel
- MQTT subscriptions will timeout - this is expected
- Ensure IoT devices publish to MQTT (not Vercel function)
- Backend only provides API endpoints on Vercel

---

For more help, see: https://mqtt.org/getting-started
