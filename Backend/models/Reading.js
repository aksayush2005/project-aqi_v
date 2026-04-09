// models/Reading.js
const mongoose = require('mongoose');

const ReadingSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  temperature:       Number,   // °C
  humidity:          Number,   // %
  pm2_5:             Number,   // µg/m³  — GP2Y1010AU0F dust sensor
  pm10:              Number,   // µg/m³  — estimated
  gas:               Number,   // ppm    — MQ-135 CO₂-equiv
  aqi:               Number,   // final AQI = max(pm25SubIndex, gasSubIndex)
  aqiCategory:       String,   // Good / Moderate / Unhealthy etc.
  pm25SubIndex:      Number,   // AQI sub-index from PM2.5 alone
  gasSubIndex:       Number,   // AQI sub-index from gas/CO₂ alone
  dominantPollutant: String,   // 'pm2_5' or 'gas' — which drove the final AQI
});

// TTL index: auto-delete readings older than 30 days
ReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('Reading', ReadingSchema);