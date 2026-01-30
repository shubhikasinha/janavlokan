"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";

interface TimeSeriesDataPoint {
  date: string;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_anomalies: number;
}

interface TemporalSpike {
  date: string;
  spike_type: string;
  anomaly_count: number;
  avg_baseline: number;
  deviation_percentage: number;
  affected_districts: string[];
}

interface TimeSeriesChartProps {
  days?: number;
  showSpikes?: boolean;
}

export default function TimeSeriesChart({ days = 30, showSpikes = true }: TimeSeriesChartProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [spikesData, setSpikesData] = useState<TemporalSpike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(days);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [timeSeriesRes, spikesRes] = await Promise.all([
          fetch(`/api/analytics/time-series?days=${selectedDays}`),
          showSpikes ? fetch("/api/analytics/temporal-spikes") : Promise.resolve(null),
        ]);

        if (!timeSeriesRes.ok) {
          throw new Error(`Time series API error: ${timeSeriesRes.status}`);
        }

        const timeSeriesJson = await timeSeriesRes.json();
        setTimeSeriesData(Array.isArray(timeSeriesJson) ? timeSeriesJson : []);

        if (spikesRes && spikesRes.ok) {
          const spikesJson = await spikesRes.json();
          setSpikesData(Array.isArray(spikesJson) ? spikesJson : []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedDays, showSpikes]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-500">Loading time series data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Series Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-gray-900">
              Risk Trends Over Time
            </h3>
            <p className="text-sm text-gray-500">Daily anomaly distribution</p>
          </div>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Select time range"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        <div className="h-80 min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={280}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="high_risk_count"
                stackId="1"
                stroke="#ef4444"
                fill="#fecaca"
                name="High Risk"
              />
              <Area
                type="monotone"
                dataKey="medium_risk_count"
                stackId="1"
                stroke="#f59e0b"
                fill="#fef3c7"
                name="Medium Risk"
              />
              <Area
                type="monotone"
                dataKey="low_risk_count"
                stackId="1"
                stroke="#22c55e"
                fill="#dcfce7"
                name="Low Risk"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Temporal Spikes Section */}
      {showSpikes && spikesData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-gray-900 mb-4">
            Detected Temporal Spikes
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Days with anomaly counts significantly above baseline (1.5σ+)
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Severity</th>
                  <th className="px-4 py-2 text-left font-semibold">Anomalies</th>
                  <th className="px-4 py-2 text-left font-semibold">vs Baseline</th>
                  <th className="px-4 py-2 text-left font-semibold">Affected Districts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {spikesData.map((spike, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{formatDate(spike.date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          spike.spike_type === "CRITICAL"
                            ? "bg-red-100 text-red-800"
                            : spike.spike_type === "HIGH"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {spike.spike_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">{spike.anomaly_count}</td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-medium">
                        +{spike.deviation_percentage}%
                      </span>
                      <span className="text-gray-400 ml-1 text-xs">
                        (avg: {spike.avg_baseline})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {spike.affected_districts.slice(0, 3).join(", ")}
                      {spike.affected_districts.length > 3 && (
                        <span className="text-gray-400">
                          {" "}+{spike.affected_districts.length - 3} more
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend Line Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-heading font-semibold text-gray-900 mb-4">
          Total Anomalies Trend
        </h3>
        <div className="h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              <Line
                type="monotone"
                dataKey="total_anomalies"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 3 }}
                name="Total Anomalies (High+Medium)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
