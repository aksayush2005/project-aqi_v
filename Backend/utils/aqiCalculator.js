// utils/aqiCalculator.js
//
// Dual-pollutant AQI calculation:
//   1. PM2.5 sub-index  — from GP2Y1010AU0F dust sensor  (µg/m³)
//   2. Gas sub-index    — from MQ-135 gas sensor         (CO₂-equiv PPM)
//
// EPA standard rule: final AQI = MAX of all individual sub-indices.
// The pollutant with the higher sub-index "dominates" and sets the category.
// Both sub-indices are returned so the frontend can display them separately.

// ── PM2.5 breakpoints (EPA standard) ─────────────────────────────────────────
// Source: EPA AQI Technical Assistance Document, Table 1
const PM25_BREAKPOINTS = [
  { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00e400' },
  { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'Moderate',                       color: '#ffff00' },
  { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200, category: 'Unhealthy',                      color: '#ff0000' },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy',                 color: '#8f3f97' },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous',                      color: '#7e0023' },
];

// ── CO₂ / gas PPM breakpoints (MQ-135 CO₂-equivalent) ────────────────────────
// The MQ-135 outputs an approximate CO₂-equivalent PPM.
// Mapped to AQI bands using indoor air quality standards:
//   400–1000 ppm  = normal indoor / good outdoor
//   1000–2000 ppm = moderate — ventilation recommended
//   2000–5000 ppm = unhealthy — poor ventilation
//   5000+         = hazardous — immediately dangerous
//
// These breakpoints are not EPA-official (EPA tracks CO separately),
// but they give a meaningful AQI contribution from the MQ-135 reading.
const GAS_BREAKPOINTS = [
  { cLow: 0,    cHigh: 400,   iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00e400' },
  { cLow: 401,  cHigh: 1000,  iLow: 51,  iHigh: 100, category: 'Moderate',                       color: '#ffff00' },
  { cLow: 1001, cHigh: 2000,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLow: 2001, cHigh: 5000,  iLow: 151, iHigh: 200, category: 'Unhealthy',                      color: '#ff0000' },
  { cLow: 5001, cHigh: 10000, iLow: 201, iHigh: 300, category: 'Very Unhealthy',                 color: '#8f3f97' },
  { cLow: 10001,cHigh: 50000, iLow: 301, iHigh: 500, category: 'Hazardous',                      color: '#7e0023' },
];

// ── AQI category metadata ─────────────────────────────────────────────────────
const CATEGORY_META = {
  'Good':                          { color: '#00e400' },
  'Moderate':                      { color: '#ffff00' },
  'Unhealthy for Sensitive Groups':{ color: '#ff7e00' },
  'Unhealthy':                     { color: '#ff0000' },
  'Very Unhealthy':                { color: '#8f3f97' },
  'Hazardous':                     { color: '#7e0023' },
};

// ── Core interpolation function ───────────────────────────────────────────────
// Applies the EPA linear interpolation formula to any pollutant breakpoint table.
// Returns { subIndex, category, color } or null if value is out of range.
function interpolate(value, breakpoints) {
  if (value < 0) value = 0;

  const bp = breakpoints.find(b => value >= b.cLow && value <= b.cHigh);

  if (!bp) {
    // Above the highest breakpoint — clamp to maximum
    const last = breakpoints[breakpoints.length - 1];
    return { subIndex: last.iHigh, category: last.category, color: last.color };
  }

  // EPA formula: AQI = round( ((Ih - Il) / (Bph - Bpl)) * (Cp - Bpl) + Il )
  const subIndex = Math.round(
    ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (value - bp.cLow) + bp.iLow
  );

  return { subIndex, category: bp.category, color: bp.color };
}

// ── Main exported function ────────────────────────────────────────────────────
/**
 * Calculate AQI from both PM2.5 (µg/m³) and gas/CO₂-equiv (PPM).
 *
 * @param {number} pm25  - PM2.5 concentration in µg/m³ from GP2Y1010AU0F
 * @param {number} gasPpm - CO₂-equivalent PPM from MQ-135
 *
 * @returns {object} {
 *   aqi           : number  — final AQI (max of both sub-indices)
 *   category      : string  — AQI category name
 *   color         : string  — hex color for the category
 *   pm25SubIndex  : number  — PM2.5 contribution alone
 *   gasSubIndex   : number  — gas/CO₂ contribution alone
 *   dominantPollutant : string — which sensor drove the final AQI
 * }
 */
function calculateAQI(pm25, gasPpm) {
  // Sanitise inputs — treat missing/invalid as 0
  const safePM25 = (typeof pm25  === 'number' && isFinite(pm25)  && pm25  >= 0) ? pm25  : 0;
  const safeGas  = (typeof gasPpm === 'number' && isFinite(gasPpm) && gasPpm >= 0) ? gasPpm : 0;

  // Calculate each sub-index independently
  const pm25Result = interpolate(safePM25, PM25_BREAKPOINTS);
  const gasResult  = interpolate(safeGas,  GAS_BREAKPOINTS);

  const pm25SubIndex = pm25Result.subIndex;
  const gasSubIndex  = gasResult.subIndex;

  // EPA rule: final AQI = highest individual sub-index
  const finalAQI = Math.max(pm25SubIndex, gasSubIndex);

  // The dominant pollutant determines the category and color
  let dominantPollutant, category, color;
  if (gasSubIndex > pm25SubIndex) {
    dominantPollutant = 'gas';
    category          = gasResult.category;
    color             = gasResult.color;
  } else {
    dominantPollutant = 'pm2_5';
    category          = pm25Result.category;
    color             = pm25Result.color;
  }

  return {
    aqi:               finalAQI,
    category,
    color,
    pm25SubIndex,
    gasSubIndex,
    dominantPollutant,
  };
}

// ── Health recommendations ────────────────────────────────────────────────────
/**
 * Returns a health recommendation string for a given AQI category.
 */
function getRecommendation(category) {
  const recommendations = {
    'Good':
      'Air quality is satisfactory. Enjoy outdoor activities.',
    'Moderate':
      'Air quality is acceptable. Unusually sensitive individuals should limit prolonged outdoor exertion.',
    'Unhealthy for Sensitive Groups':
      'Members of sensitive groups may experience health effects. General public is not affected.',
    'Unhealthy':
      'Everyone may begin to experience health effects. Sensitive groups should limit outdoor activity.',
    'Very Unhealthy':
      'Health alert: everyone may experience serious health effects. Avoid outdoor activities.',
    'Hazardous':
      'Health warning — emergency conditions. Everyone should avoid all outdoor activities.',
  };
  return recommendations[category] || 'No recommendation available.';
}

/**
 * Calculate AQI from both PM2.5 (µg/m³) and MQ135 gas sensor (PPM).
 * @param {number} pm25  - PM2.5 concentration in µg/m³.
 * @param {number} mq135 - MQ135 gas sensor reading in PPM.
 * @returns {object} AQI breakdown and dominant pollutant.
 */
function calculateAQI(pm25, mq135) {
    const pm25Breakpoints = [0, 12, 35.4, 55.4, 150.4, 250.4, 500.4];
    const mq135Breakpoints = [0, 50, 100, 150, 200, 300, 500];

    const pm25Index = calculateSubIndex(pm25, pm25Breakpoints);
    const mq135Index = calculateSubIndex(mq135, mq135Breakpoints);

    const dominantPollutant = pm25Index >= mq135Index ? 'pm2_5' : 'mq135';
    const aqi = Math.max(pm25Index, mq135Index);

    return {
        aqi,
        dominantPollutant,
        breakdown: {
            pm25: pm25Index,
            mq135: mq135Index,
        },
    };
}

/**
 * Helper function to calculate sub-index for a pollutant.
 */
function calculateSubIndex(concentration, breakpoints) {
    for (let i = 0; i < breakpoints.length - 1; i++) {
        if (concentration >= breakpoints[i] && concentration <= breakpoints[i + 1]) {
            const [low, high] = [breakpoints[i], breakpoints[i + 1]];
            const [indexLow, indexHigh] = [i * 50, (i + 1) * 50];
            return ((concentration - low) / (high - low)) * (indexHigh - indexLow) + indexLow;
        }
    }
    return 500; // Default to max AQI if out of range.
}

module.exports = { calculateAQI, getRecommendation };