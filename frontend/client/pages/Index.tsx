import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, TrendingUp, Droplets, Thermometer, MapPin } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";

function getAQIColor(value: number) {
  if (value <= 50) return "text-aqi-good";
  if (value <= 100) return "text-aqi-fair";
  if (value <= 150) return "text-aqi-moderate";
  if (value <= 200) return "text-aqi-poor";
  return "text-aqi-very-poor";
}

function getAQILabel(value: number) {
  if (value <= 50) return "Good";
  if (value <= 100) return "Fair";
  if (value <= 150) return "Moderate";
  if (value <= 200) return "Poor";
  return "Very Poor";
}

function getAQIBgColor(value: number) {
  if (value <= 50) return "bg-aqi-good/10";
  if (value <= 100) return "bg-aqi-fair/10";
  if (value <= 150) return "bg-aqi-moderate/10";
  if (value <= 200) return "bg-aqi-poor/10";
  return "bg-aqi-very-poor/10";
}

export default function Index() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [currentAQI, setCurrentAQI] = useState(0);
  const [currentTemp, setCurrentTemp] = useState(0);
  const [currentHumidity, setCurrentHumidity] = useState(0);

  const [aqiTrendData, setAqiTrendData] = useState<any[]>([]);
  const [tempTrendData, setTempTrendData] = useState<any[]>([]);
  const [humidityTrendData, setHumidityTrendData] = useState<any[]>([]);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchSummary = async () => {
    try {
      const res = await axios.get("/api/summary");
      setNodes(res.data);
      if (res.data.length > 0 && !selectedNode) {
        setSelectedNode(res.data[0].nodeId);
      }
    } catch (err) {
      console.error("Summary fetch error:", err);
    }
  };

  const fetchHistory = async () => {
    if (!selectedNode) return;
    try {
      const res = await axios.get(`/api/nodes/${selectedNode}/data?range=24h`);
      const history = res.data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const aqiData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.aqi
      }));
      const tempData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.temperature
      }));
      const humData = history.map((r: any) => ({
        time: new Date(r.timestamp).getTime(),
        value: r.humidity
      }));

      setAqiTrendData(aqiData);
      setTempTrendData(tempData);
      setHumidityTrendData(humData);

      if (history.length > 0) {
        const latest = history[history.length - 1];
        setCurrentAQI(latest.aqi);
        setCurrentTemp(latest.temperature);
        setCurrentHumidity(latest.humidity);
        setLastUpdated(new Date(latest.timestamp));
      }
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  const aqiLabel = getAQILabel(currentAQI);

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-80px-180px)] overflow-hidden">
        <AnimatedBackground 
          aqi={currentAQI} 
          temperature={currentTemp} 
          humidity={currentHumidity} 
        />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between">
            <div>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                AQI Monitoring System
              </h2>
              <p className="text-muted-foreground text-lg">
                Real-time air quality index, temperature, and humidity monitoring
              </p>
            </div>
            
            {nodes.length > 0 && (
              <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <MapPin className="w-5 h-5 text-slate-500" />
                <select 
                  className="bg-transparent border-none text-foreground outline-none font-medium p-1 cursor-pointer"
                  value={selectedNode || ""}
                  onChange={(e) => setSelectedNode(e.target.value)}
                >
                  {nodes.map(n => (
                    <option key={n.nodeId} value={n.nodeId}>{n.nodeId} - {n.name || 'Sensor'}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Alert Banner */}
          {currentAQI > 150 && (
            <div className="mb-8 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900 dark:text-orange-300">
                  Air Quality Alert
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-400 mt-1">
                  Air quality is currently in the {aqiLabel} range. Please take
                  necessary precautions.
                </p>
              </div>
            </div>
          )}

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* AQI Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Air Quality Index</h3>
                  <p className="stat-value mt-2">{currentAQI}</p>
                </div>
                <div className="text-3xl">🌍</div>
              </div>
              <div className="inline-block">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    currentAQI <= 50
                      ? "bg-aqi-good/20 text-aqi-good"
                      : currentAQI <= 100
                        ? "bg-aqi-fair/20 text-aqi-fair"
                        : currentAQI <= 150
                          ? "bg-aqi-moderate/20 text-aqi-moderate"
                          : currentAQI <= 200
                            ? "bg-aqi-poor/20 text-aqi-poor"
                            : "bg-aqi-very-poor/20 text-aqi-very-poor"
                  }`}
                >
                  {aqiLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>

            {/* Temperature Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Temperature</h3>
                  <p className="stat-value mt-2 text-orange-600">
                    {currentTemp}°C
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
                  <Thermometer className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Feels like</span>
                  <span className="font-semibold text-foreground">
                    {(currentTemp - 2).toFixed(1)}°C
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>

            {/* Humidity Card */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="stat-label">Humidity</h3>
                  <p className="stat-value mt-2 text-blue-600">
                    {currentHumidity}%
                  </p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                  <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dew point</span>
                  <span className="font-semibold text-foreground">
                    {Math.round(currentTemp * 0.8)}°C
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* AQI Chart */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  AQI Trend
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aqiTrendData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1.5}
                    horizontal={true}
                    vertical={true}
                  />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke="var(--foreground)"
                    style={{ fontSize: "12px" }}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={['dataMin - 10', 'dataMax + 10']}
                    allowDecimals={false}
                    stroke="var(--foreground)"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value} AQI`, "Index"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#dc2626"
                    dot={false}
                    activeDot={{ r: 5 }}
                    strokeWidth={3}
                    isAnimationActive={true}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Chart */}
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-6">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-foreground">
                  Temperature Trend
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tempTrendData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeWidth={1.5}
                    horizontal={true}
                    vertical={true}
                  />
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke="var(--foreground)"
                    style={{ fontSize: "12px" }}
                    minTickGap={60}
                  />
                  <YAxis
                    domain={['dataMin - 4', 'dataMax + 4']}
                    tickCount={5}
                    allowDecimals={false}
                    stroke="var(--foreground)"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    formatter={(value) => [`${value}°C`, "Temperature"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#ea580c"
                    dot={false}
                    activeDot={{ r: 5 }}
                    strokeWidth={3}
                    isAnimationActive={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700 mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Droplets className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-foreground">
                Humidity Trend
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={humidityTrendData}>
                <CartesianGrid
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5}
                  horizontal={true}
                  vertical={true}
                />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--foreground)"
                  style={{ fontSize: "12px" }}
                  minTickGap={60}
                />
                <YAxis
                  domain={['dataMin - 8', 'dataMax + 8']}
                  tickCount={5}
                  allowDecimals={false}
                  stroke="var(--foreground)"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [`${value}%`, "Humidity"]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  dot={false}
                  activeDot={{ r: 5 }}
                  strokeWidth={3}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                AQI Scale
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-aqi-good/10 rounded-lg border border-aqi-good/20">
                  <span className="text-sm font-medium">Good</span>
                  <span className="text-xs text-muted-foreground">0 - 50</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-fair/10 rounded-lg border border-aqi-fair/20">
                  <span className="text-sm font-medium">Fair</span>
                  <span className="text-xs text-muted-foreground">51 - 100</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-moderate/10 rounded-lg border border-aqi-moderate/20">
                  <span className="text-sm font-medium">Moderate</span>
                  <span className="text-xs text-muted-foreground">
                    101 - 150
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-poor/10 rounded-lg border border-aqi-poor/20">
                  <span className="text-sm font-medium">Poor</span>
                  <span className="text-xs text-muted-foreground">
                    151 - 200
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-aqi-very-poor/10 rounded-lg border border-aqi-very-poor/20">
                  <span className="text-sm font-medium">Very Poor</span>
                  <span className="text-xs text-muted-foreground">
                    200+
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card bg-orange-50/50 dark:bg-slate-800/50 border-2 border-orange-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Quick Facts
              </h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">
                    What is AQI?
                  </p>
                  <p className="text-foreground">
                    The Air Quality Index is a measure of how clean or polluted
                    the air is in your area.
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    Why does it matter?
                  </p>
                  <p className="text-foreground">
                    Poor air quality can cause respiratory issues, especially
                    for vulnerable populations.
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    Update frequency
                  </p>
                  <p className="text-foreground">
                    Data refreshes every 10 seconds for real-time monitoring.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
