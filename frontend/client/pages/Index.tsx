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

export default function Index() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [currentAQI, setCurrentAQI] = useState(0);
  const [aqiTrendData, setAqiTrendData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/api/nodes");
        setNodes(res.data);
      } catch (err) {
        console.error("Error fetching nodes:", err);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold">Air Quality Index</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="metric-card">
            <h2 className="text-lg font-semibold">Current AQI</h2>
            <p className="text-2xl font-bold">{currentAQI}</p>
          </div>
          <div className="metric-card">
            <h2 className="text-lg font-semibold">AQI Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={aqiTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
