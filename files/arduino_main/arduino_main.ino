/*
 * Arduino Sensor Node — Smart Air Quality Monitor
 * Sensors : DHT11 (temp + humidity)
 *           GP2Y1010AU0F (dust / smoke — analog)
 *           MQ-135 (gas — analog)
 * Output  : JSON string sent to ESP32 every 10 s via hardware Serial TX
 *
 * Wiring summary
 * ──────────────────────────────────────────────────────
 * DHT11
 *   VCC  → 5V
 *   GND  → GND
 *   DATA → D2   (+ 10 kΩ pull-up to 5V)
 *
 * GP2Y1010AU0F
 *   Pin 1 (V-LED)  → 150 Ω resistor → 5V  (+ 220 µF cap across 5V & GND)
 *   Pin 2 (LED-GND)→ GND
 *   Pin 3 (LED)    → D7   (LED drive — set LOW to measure)
 *   Pin 4 (S-GND)  → GND
 *   Pin 5 (Vo)     → A1   (analog output)
 *   Pin 6 (Vcc)    → 5V
 *
 * MQ-135
 *   VCC  → 5V
 *   GND  → GND
 *   AOUT → A0
 *
 * Arduino TX (pin 1) → 1 kΩ → ESP32 GPIO16
 *                              junction → 2 kΩ → GND   (voltage divider 5V→3.3V)
 * Arduino GND        → ESP32 GND
 *
 * Libraries needed (Arduino Library Manager)
 *   DHT sensor library  — Adafruit
 *   Adafruit Unified Sensor — Adafruit
 *   ArduinoJson         — Benoit Blanchon
 */

#include <DHT.h>
#include <ArduinoJson.h>

// ── DHT11 ──────────────────────────────────────────────────────────────────
#define DHT_PIN       2
#define DHT_TYPE      DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// ── GP2Y1010AU0F ────────────────────────────────────────────────────────────
#define DUST_LED_PIN  7       // LED drive pin (digital)
#define DUST_VO_PIN   A1      // analog output
// Timing from datasheet: pulse LED LOW for 280 µs, read, then HIGH
#define DUST_SAMPLING_TIME   280
#define DUST_DELTA_TIME      40
#define DUST_SLEEP_TIME      9680

// ── MQ-135 ──────────────────────────────────────────────────────────────────
#define MQ135_PIN     A0
#define MQ135_RL      10.0    // load resistance kΩ
#define MQ135_R0      76.63   // clean-air baseline kΩ — calibrate before deployment

// ── Timing ──────────────────────────────────────────────────────────────────
#define SEND_INTERVAL 10000   // ms

unsigned long lastSend = 0;

// ── GP2Y1010AU0F: read dust density (µg/m³) ─────────────────────────────────
float readDustDensity() {
  digitalWrite(DUST_LED_PIN, LOW);          // LED ON
  delayMicroseconds(DUST_SAMPLING_TIME);    // wait 280 µs

  int rawADC = analogRead(DUST_VO_PIN);     // sample

  delayMicroseconds(DUST_DELTA_TIME);       // wait 40 µs
  digitalWrite(DUST_LED_PIN, HIGH);         // LED OFF
  delayMicroseconds(DUST_SLEEP_TIME);       // wait 9680 µs (complete 10 ms cycle)

  // Convert ADC → voltage (5V ref, 10-bit ADC)
  float voltage = rawADC * (5.0 / 1023.0);

  // Datasheet linear equation: density (µg/m³) = 0.17 * V - 0.1
  // Clamp to 0 minimum
  float density = (0.17 * voltage - 0.1) * 1000.0;  // mg/m³ → µg/m³ × 1000
  // Note: coefficient varies per unit. Calibrate with a known reference if needed.
  // Common simplified formula: density = 170 * voltage - 100  (µg/m³)
  density = 170.0 * voltage - 100.0;
  if (density < 0) density = 0;

  return density;
}

// ── MQ-135: read CO2-equivalent PPM ─────────────────────────────────────────
float readMQ135() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(MQ135_PIN);
    delay(5);
  }
  float raw = sum / 10.0;

  float voltage = raw * (5.0 / 1023.0);
  if (voltage < 0.01) voltage = 0.01;

  float RS    = ((5.0 - voltage) / voltage) * MQ135_RL;
  float ratio = RS / MQ135_R0;
  float ppm   = pow(10.0, -0.42 * log10(ratio) + 1.92);

  return ppm;
}

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  // Serial to ESP32 (TX pin 1) — baud must match ESP32 Serial2.begin()
  Serial.begin(9600);
  
  delay(1000);  // Wait for serial to stabilize
  
  // Debug output (note: this goes to the same TX pin as data!)
  // Recommend: Uncomment only for initial testing, comment out for production
  // Serial.println("\n[ARDUINO] Booting...");
  // Serial.println("[ARDUINO] Starting sensor readings...\n");

  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);  // LED off initially

  dht.begin();
  delay(2000);  // DHT11 stabilise
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();

    // Read DHT11
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      // DHT read failed — skip this cycle
      return;
    }

    // Read GP2Y1010AU0F
    float dustDensity = readDustDensity();

    // Read MQ-135
    float gasPPM = readMQ135();

    // Build JSON — field names match what backend server.js expects
    StaticJsonDocument<200> doc;
    doc["temperature"] = serialized(String(temperature, 1));
    doc["humidity"]    = serialized(String(humidity, 1));
    doc["pm2_5"]       = serialized(String(dustDensity, 1));  // GP2Y → PM2.5 proxy
    doc["pm10"]        = serialized(String(dustDensity * 1.3, 1)); // estimated PM10
    doc["gas"]         = serialized(String(gasPPM, 1));

    // Send JSON line to ESP32 via TX
    // The \n at the end is critical — ESP32 uses it to detect end-of-message
    serializeJson(doc, Serial);
    Serial.println();
    
    // DEBUG: Confirmation that data was sent
    // Note: These debug messages are also sent to ESP32 via TX pin!
    // Uncomment the lines below ONLY for testing on a separate serial monitor
    /*
    Serial.println("[ARDUINO] ✅ Data sent:");
    Serial.printf("   🌡️  Temp: %.1f°C, 💧 Hum: %.1f%%\n", temperature, humidity);
    Serial.printf("   🌫️  Dust: %.1f, 🔬 Gas: %.1f PPM\n", dustDensity, gasPPM);
    */
  }
}
