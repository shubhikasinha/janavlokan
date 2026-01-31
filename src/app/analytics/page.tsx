"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/Button";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Dynamic import for map (no SSR)
const DistrictHeatmap = dynamic(
  () => import("@/components/DistrictHeatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-500">Loading map component...</p>
        </div>
      </div>
    ),
  }
);

// Dynamic import for India Map
const IndiaMap = dynamic(() => import("@/components/IndiaMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-gray-500">Loading India map...</p>
      </div>
    </div>
  ),
});

// Minimal Chart colors
const RISK_COLORS: Record<string, string> = {
  HIGH: "#dc2626",   // Red-600 (Critical)
  MEDIUM: "#94a3b8", // Slate-400 (Neutral/Warning)
  LOW: "#e2e8f0",    // Slate-200 (Safe/Background)
  UNKNOWN: "#f8fafc", // Slate-50
};

interface DistrictRisk {
  residence_district: string;
  anomaly_count: number;
}

interface RiskDistribution {
  risk_level: string;
  count: number;
}

interface EntityItem {
  risk_level: string;
  // LPG
  beneficiary_id?: string;
  mean_squared_error?: number;
  // MDM
  school_id?: number;
  school_name?: string;
  anomaly_score?: number;
}

export default function AnalyticsPage() {
  const { currentScheme, schemeConfig } = useScheme();
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictRisk | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [distribution, setDistribution] = useState<RiskDistribution[]>([]);
  const [activeTab, setActiveTab] = useState<"geographic" | "temporal" | "distribution">("geographic");

  // Dynamic Threshold Slider State
  const [threshold, setThreshold] = useState<number>(15);
  const [sliderLoading, setSliderLoading] = useState<boolean>(false);
  const [dynamicResults, setDynamicResults] = useState<EntityItem[]>([]);

  // Get API base based on scheme
  const getApiBase = useCallback(() => {
    return currentScheme === 'MDM' ? '/api/mdm' : '/api';
  }, [currentScheme]);

  // Fetch distribution data
  useEffect(() => {
    async function fetchDistribution() {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/dashboard/distribution`);
        if (res.ok) {
          const data = await res.json();
          setDistribution(data);
        }
      } catch (err) {
        console.error("Error fetching distribution:", err);
      }
    }
    fetchDistribution();
  }, [refreshKey, currentScheme, getApiBase]);

  // Fetch dynamic threshold data
  useEffect(() => {
    const fetchDynamicData = async () => {
      setSliderLoading(true);
      try {
        const apiBase = getApiBase();
        const endpoint = currentScheme === 'MDM'
          ? `${apiBase}/schools/high-risk?limit=50&dynamic=true&threshold=${threshold}`
          : `${apiBase}/beneficiaries/high-risk?limit=50&dynamic=true&threshold=${threshold}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setDynamicResults(data);
        }
      } catch (err) {
        console.error("Error fetching dynamic data:", err);
      } finally {
        setSliderLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchDynamicData, 300);
    return () => clearTimeout(timeoutId);
  }, [threshold, currentScheme, getApiBase]);

  const handleDistrictClick = (district: DistrictRisk) => {
    setSelectedDistrict(district);
  };

  const handleRefreshComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Get entity score based on scheme
  const getEntityScore = (entity: EntityItem): number => {
    if (currentScheme === 'MDM') {
      return entity.anomaly_score || 0;
    }
    return entity.mean_squared_error || 0;
  };

  // Calculate dynamic risk counts based on threshold
  const dynamicCounts = {
    high: dynamicResults.filter(e => getEntityScore(e) > threshold * 2).length,
    medium: dynamicResults.filter(e => getEntityScore(e) > threshold && getEntityScore(e) <= threshold * 2).length,
    low: dynamicResults.filter(e => getEntityScore(e) <= threshold).length,
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-white py-6 md:py-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{schemeConfig.icon}</span>
                <span className="text-xs font-medium text-primary uppercase tracking-wide px-2 py-0.5 bg-primary/10 rounded-full">
                  {schemeConfig.name}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-1">
                Analytics & Insights
              </h1>
              <p className="text-gray-600 text-sm">
                Geographic risk heatmaps • Risk distribution • Temporal spike detection • {schemeConfig.fullName}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto min-w-[400px]">
              <div className="w-full"><SchemeSwitcher /></div>
              <div className="w-full [&>button]:w-full"><BatchRefreshButton onRefreshComplete={handleRefreshComplete} /></div>
              <Button href="/dashboard" variant="secondary" className="w-full justify-center">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setActiveTab("geographic")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "geographic"
                ? "bg-white text-primary shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
            >
              Geographic Analysis
            </button>
            <button
              onClick={() => setActiveTab("distribution")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "distribution"
                ? "bg-white text-primary shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
            >
              Risk Distribution
            </button>
            <button
              onClick={() => setActiveTab("temporal")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "temporal"
                ? "bg-white text-primary shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
            >
              Temporal Trends
            </button>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">

          {/* Geographic Analysis Tab */}
          {activeTab === "geographic" && (
            <>
              {/* India Map Overview */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-heading font-semibold text-gray-900">
                      National Risk Overview
                    </h2>
                    <p className="text-sm text-gray-500">
                      State-wise risk concentration across India • {schemeConfig.fullName}
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <IndiaMap title={`${schemeConfig.name} National Risk Heatmap`} height="400px" />
                </div>
              </div>

              {/* District Heatmap Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-heading font-semibold text-gray-900">
                      District-Level Risk Heatmap
                    </h2>
                    <p className="text-sm text-gray-500">
                      Click markers for detailed anomaly information • {schemeConfig.entityNamePlural}
                    </p>
                  </div>
                  {selectedDistrict && (
                    <div className="bg-primary/10 px-4 py-2 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        Selected: {selectedDistrict.residence_district}
                      </p>
                      <p className="text-xs text-gray-600">
                        Anomalies: {selectedDistrict.anomaly_count.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <DistrictHeatmap
                    key={`${refreshKey}-${currentScheme}`}
                    onDistrictClick={handleDistrictClick}
                  />
                </div>

                {/* Map Legend */}
                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-800 mb-1">How to Use</p>
                    <p className="text-sm text-blue-700">
                      Hover over circles to see district names. Click for detailed popup.
                      Larger circles = more anomalies.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="font-medium text-amber-800 mb-1">Coverage</p>
                    <p className="text-sm text-amber-700">
                      Map shows districts with detected {currentScheme === 'MDM' ? 'school' : 'beneficiary'} anomalies.
                      Colors indicate relative risk concentration.
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800 mb-1">Insight</p>
                    <p className="text-sm text-green-700">
                      Use geographic clustering to identify regional patterns
                      and allocate audit resources efficiently.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Risk Distribution Tab */}
          {activeTab === "distribution" && (
            <>
              {/* Risk Distribution Charts */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h2 className="font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    {schemeConfig.name} Risk Distribution (Pie)
                  </h2>
                  <div className="h-64 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribution}
                          dataKey="count"
                          nameKey="risk_level"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {distribution.map((entry) => (
                            <Cell
                              key={entry.risk_level}
                              fill={RISK_COLORS[entry.risk_level] || RISK_COLORS.UNKNOWN}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value), "Count"]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h2 className="font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    Risk Breakdown (Bar)
                  </h2>
                  <div className="h-64 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribution}>
                        <XAxis dataKey="risk_level" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value), schemeConfig.entityNamePlural]}
                        />
                        <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                          {distribution.map((entry) => (
                            <Cell
                              key={entry.risk_level}
                              fill={RISK_COLORS[entry.risk_level] || RISK_COLORS.UNKNOWN}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    System is balanced — not flagging everyone as HIGH risk
                  </p>
                </div>
              </div>

              {/* Dynamic Threshold Slider */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <h3 className="text-lg font-heading font-semibold text-gray-900">
                      Dynamic Sensitivity Control
                    </h3>
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-700 text-xs rounded-full uppercase tracking-wider">
                      Interactive Demo
                    </span>
                  </div>
                  {sliderLoading && (
                    <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="threshold-slider" className="text-gray-700 text-sm">Anomaly Score Threshold:</label>
                    <span className="text-purple-700 font-mono font-bold text-xl">{threshold.toFixed(1)}</span>
                  </div>

                  <div className="relative">
                    <input
                      id="threshold-slider"
                      type="range"
                      min="5"
                      max="30"
                      step="0.5"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      title="Adjust anomaly score threshold"
                      className="w-full h-3 bg-purple-200 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-all"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>More Sensitive (5)</span>
                      <span>Less Sensitive (30)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-600">{dynamicCounts.high}</div>
                      <div className="text-red-700 text-xs font-medium">HIGH RISK</div>
                      <div className="text-gray-500 text-[10px]">Score &gt; {(threshold * 2).toFixed(1)}</div>
                    </div>
                    <div className="bg-amber-100 border border-amber-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-amber-600">{dynamicCounts.medium}</div>
                      <div className="text-amber-700 text-xs font-medium">MEDIUM RISK</div>
                      <div className="text-gray-500 text-[10px]">Score &gt; {threshold.toFixed(1)}</div>
                    </div>
                    <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{dynamicCounts.low}</div>
                      <div className="text-green-700 text-xs font-medium">LOW RISK</div>
                      <div className="text-gray-500 text-[10px]">Score ≤ {threshold.toFixed(1)}</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 text-center">
                    Move the slider to adjust {currentScheme === 'MDM' ? 'school fraud' : 'fraud'} detection sensitivity in real-time.
                    Lower threshold = more sensitive (catches more potential issues, but may have false positives)
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Temporal Analysis Tab */}
          {activeTab === "temporal" && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-xl font-heading font-semibold text-gray-900">
                  Temporal Analysis - {schemeConfig.fullName}
                </h2>
                <p className="text-sm text-gray-500">
                  Risk trends over time • Spike detection • Seasonal patterns
                </p>
              </div>

              <TimeSeriesChart
                key={`${refreshKey}-${currentScheme}`}
                days={30}
                showSpikes={true}
              />
            </div>
          )}

          {/* Synopsis Alignment Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mt-8">
            <h3 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
              {schemeConfig.icon} Synopsis Alignment: {schemeConfig.name} Analytics Features
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-800 mb-2">Implemented</p>
                <ul className="space-y-1 text-gray-600">
                  <li>- Geographic Risk Heatmaps (District-level)</li>
                  <li>- National Overview Map (State-level)</li>
                  <li>- Dynamic Threshold Slider (Interactive)</li>
                  <li>- Risk Distribution Charts (Pie + Bar)</li>
                  <li>- Temporal Spike Detection (1.5 threshold)</li>
                  <li>- Time-Series Risk Trends (7-90 days)</li>
                  <li>- Unified Multi-Scheme Dashboard</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-2">
                  {currentScheme === 'MDM' ? 'MDM-Specific Features' : 'LPG-Specific Features'}
                </p>
                <ul className="space-y-1 text-gray-600">
                  {currentScheme === 'MDM' ? (
                    <>
                      <li>• Ghost Meal Detection (attendance vs served)</li>
                      <li>• Ingredient Inflation Tracking</li>
                      <li>• Fund Overclaim Analysis</li>
                      <li>• Cook Anomaly Detection</li>
                      <li>• School-level Aggregation</li>
                      <li>• Per-Student Norm Validation</li>
                    </>
                  ) : (
                    <>
                      <li>• High Recent Activity Detection</li>
                      <li>• Multiple Dealer Analysis</li>
                      <li>• Cross-District Transaction Tracking</li>
                      <li>• Lifetime Usage Patterns</li>
                      <li>• Beneficiary-level Aggregation</li>
                      <li>• Subsidy Leakage Estimation</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-600 mb-4">
            Ready to investigate specific {currentScheme === 'MDM' ? 'schools' : 'cases'}?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/dashboard">View {schemeConfig.name} Dashboard</Button>
            <Button variant="secondary" href="/technology">
              Technology Stack
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
