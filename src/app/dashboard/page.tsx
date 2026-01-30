"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/Button";
import AuditPanel from "@/components/AuditPanel";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import HeatmapBackground from "@/components/HeatmapBackground";
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

// Dynamically import map to avoid SSR issues
const IndiaMap = dynamic(() => import("@/components/IndiaMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-white/40 text-xs tracking-widest uppercase">
      Initializing Map Engine...
    </div>
  ),
});

// Chart colors
const RISK_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
  UNKNOWN: "#6b7280",
};

// Types matching API responses (NEW: with flag columns)
interface DashboardSummary {
  total_beneficiaries: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

interface RiskDistribution {
  risk_level: string;
  count: number;
}

// NEW: Updated to include flag columns from fraud_with_explanations
interface Beneficiary {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flag_high_recent_activity: boolean;
  flag_multiple_dealers: boolean;
  flag_cross_district: boolean;
  flag_high_lifetime_usage: boolean;
}

interface BeneficiaryDetail {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flags: {
    high_recent_activity: boolean;
    multiple_dealers: boolean;
    cross_district: boolean;
    high_lifetime_usage: boolean;
  };
  reasons: string[];
  gemini_explanation?: string;
}

type Language = "en" | "hi" | "hinglish";

export default function DashboardPage() {
  // State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<RiskDistribution[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<BeneficiaryDetail | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [refreshKey, setRefreshKey] = useState(0);
  
  // NEW: Dynamic Threshold Slider State
  const [threshold, setThreshold] = useState<number>(0.05);  // Default MSE threshold
  const [useStaticRisk, setUseStaticRisk] = useState<boolean>(true);  // Toggle between static/dynamic
  const [sliderLoading, setSliderLoading] = useState<boolean>(false);  // Loading state for slider updates

  // Loading states
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle refresh complete
  const handleRefreshComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Fetch all dashboard data on mount or refresh
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);

      try {
        const [summaryRes, distributionRes, beneficiariesRes] =
          await Promise.all([
            fetch("/api/dashboard/summary"),
            fetch("/api/dashboard/distribution"),
            fetch("/api/beneficiaries/high-risk?limit=50"),
          ]);

        if (!summaryRes.ok || !distributionRes.ok || !beneficiariesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [summaryData, distributionData, beneficiariesData] =
          await Promise.all([
            summaryRes.json(),
            distributionRes.json(),
            beneficiariesRes.json(),
          ]);

        setSummary(summaryData);
        setDistribution(distributionData);
        setBeneficiaries(beneficiariesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [refreshKey]);

  // Fetch filtered data when risk filter OR threshold changes (with debounce for slider)
  useEffect(() => {
    const fetchFilteredData = async () => {
      setSliderLoading(true);
      try {
        let url: string;
        
        if (!useStaticRisk && threshold > 0) {
          // DYNAMIC MODE: Use threshold slider
          url = `/api/beneficiaries/high-risk?limit=50&dynamic=true&threshold=${threshold}`;
        } else if (riskFilter === "ALL") {
          // STATIC MODE: All risks
          url = "/api/beneficiaries/high-risk?limit=50";
        } else {
          // STATIC MODE: Filtered by risk level
          url = `/api/beneficiaries/high-risk?limit=50&risk_level=${riskFilter}`;
        }

        console.log('Fetching with URL:', url);  // Debug log
        const res = await fetch(url);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch filtered data`);
        }

        const data = await res.json();
        console.log('Received data count:', data.length);  // Debug log
        setBeneficiaries(data);
      } catch (err) {
        console.error('Error fetching filtered beneficiaries:', err);
      } finally {
        setSliderLoading(false);
      }
    };

    // Debounce slider changes to prevent too many API calls
    const timeoutId = setTimeout(() => {
      fetchFilteredData();
    }, 300);  // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [riskFilter, threshold, useStaticRisk]);

  // Fetch beneficiary detail on click (with language param)
  const handleBeneficiaryClick = async (beneficiaryId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/beneficiaries/${beneficiaryId}?lang=${language}`,
      );
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedBeneficiary(data);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Refetch when language changes (if beneficiary is selected)
  useEffect(() => {
    if (selectedBeneficiary) {
      handleBeneficiaryClick(selectedBeneficiary.beneficiary_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Risk level styling
  const getRiskBadgeStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-300";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "LOW":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getRiskBarColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return "bg-red-500";
      case "MEDIUM":
        return "bg-amber-500";
      case "LOW":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Calculate max MSE for bar scaling
  const maxMSE = Math.max(
    ...beneficiaries.map((b) => b.mean_squared_error),
    0.001,
  );

  // Loading state - Premium dark theme
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <HeatmapBackground opacity={0.1} />
        <div className="text-center relative z-10">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-500/20 rounded-full animate-spin border-t-emerald-500 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-xs font-mono uppercase tracking-[0.3em] text-white/40 animate-pulse">
            Loading Dashboard from BigQuery...
          </p>
        </div>
      </div>
    );
  }

  // Error state - Premium dark theme
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <HeatmapBackground opacity={0.1} />
        <div className="text-center max-w-md relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Error Loading Data
          </h2>
          <p className="text-white/60 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated Heatmap Background */}
      <HeatmapBackground opacity={0.12} />
      
      {/* Header - Premium Dark Theme */}
      <section className="relative z-10 py-6 md:py-8 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">Live System</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1">
                Risk Intelligence Dashboard
              </h1>
              <p className="text-white/50 text-sm">
                AI-powered anomaly detection • Pre-computed risk tables from BigQuery
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BatchRefreshButton onRefreshComplete={handleRefreshComplete} />
              <Button href="/analytics" variant="secondary">
                Analytics
              </Button>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-400 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Live BigQuery
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          
          {/* ============================================ */}
          {/* Premium Map Section - Like Urban Carbon Twin */}
          {/* ============================================ */}
          <div className="mb-6">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Spatial Risk Concentration Map</h3>
                </div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Real-time District Analysis</span>
              </div>
              <div className="h-[450px]">
                <IndiaMap 
                  title="District Risk Heatmap"
                  height="100%"
                />
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* KPIs - Summary Cards (Premium Dark Theme) */}
          {/* ============================================ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center shadow-2xl group hover:border-white/20 transition-all">
              <div className="text-3xl font-heading font-bold text-white tabular-nums">
                {summary?.total_beneficiaries?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-white/50 mt-1 uppercase tracking-wider">
                Total Beneficiaries
              </div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-red-500/30 rounded-xl p-5 text-center shadow-2xl group hover:border-red-500/50 transition-all">
              <div className="text-3xl font-heading font-bold text-red-400 tabular-nums">
                {summary?.high_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-red-400/70 mt-1 uppercase tracking-wider">High Risk</div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-amber-500/30 rounded-xl p-5 text-center shadow-2xl group hover:border-amber-500/50 transition-all">
              <div className="text-3xl font-heading font-bold text-amber-400 tabular-nums">
                {summary?.medium_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-amber-400/70 mt-1 uppercase tracking-wider">Medium Risk</div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-5 text-center shadow-2xl group hover:border-emerald-500/50 transition-all">
              <div className="text-3xl font-heading font-bold text-emerald-400 tabular-nums">
                {summary?.low_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-emerald-400/70 mt-1 uppercase tracking-wider">Low Risk</div>
            </div>
          </div>

          {/* ============================================ */}
          {/* Dynamic Threshold Slider - Interactive Demo Feature */}
          {/* ============================================ */}
          <div className="bg-black/40 backdrop-blur-xl border border-purple-500/30 rounded-xl p-5 mb-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dynamic Sensitivity Control</h3>
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full uppercase tracking-wider">Interactive</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50">Mode:</span>
                <button
                  onClick={() => setUseStaticRisk(!useStaticRisk)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    useStaticRisk 
                      ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' 
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {useStaticRisk ? '📊 Static (Pre-computed)' : '🎚️ Dynamic (Slider)'}
                </button>
              </div>
            </div>
            
            {!useStaticRisk && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">MSE Threshold:</span>
                  <div className="flex items-center gap-2">
                    {sliderLoading && (
                      <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    )}
                    <span className="text-purple-400 font-mono font-bold text-lg">{threshold.toFixed(3)}</span>
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type="range"
                    min="0.01"
                    max="0.5"
                    step="0.01"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    aria-label="MSE Threshold Slider"
                    title="Adjust MSE threshold for fraud detection sensitivity"
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                      [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full 
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-purple-500/50 [&::-webkit-slider-thumb]:transition-all
                      [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                    <span>More Sensitive (0.01)</span>
                    <span>Less Sensitive (0.50)</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <div className="text-red-400 text-xs font-medium">HIGH</div>
                    <div className="text-white/50 text-[10px]">MSE &gt; {(threshold * 2).toFixed(3)}</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                    <div className="text-amber-400 text-xs font-medium">MEDIUM</div>
                    <div className="text-white/50 text-[10px]">MSE &gt; {threshold.toFixed(3)}</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                    <div className="text-green-400 text-xs font-medium">LOW</div>
                    <div className="text-white/50 text-[10px]">MSE &lt; {threshold.toFixed(3)}</div>
                  </div>
                </div>
                
                {/* Results count indicator */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">
                    🎯 Move slider to adjust fraud detection sensitivity in real-time.
                  </span>
                  <span className="text-purple-400 font-medium">
                    {beneficiaries.length} results
                  </span>
                </div>
              </div>
            )}
            
            {useStaticRisk && (
              <p className="text-white/40 text-xs text-center">
                📊 Using pre-computed risk levels from BigQuery. Click &quot;Dynamic (Slider)&quot; to enable real-time threshold adjustment.
              </p>
            )}
          </div>

          {/* ============================================ */}
          {/* Risk Distribution Charts (Pie + Bar) - Dark Theme */}
          {/* ============================================ */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Pie Chart */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl">
              <h2 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                Risk Distribution
              </h2>
              <div className="h-64">
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
                      labelLine={{ stroke: 'rgba(255,255,255,0.3)' }}
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
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ color: 'white' }}
                      formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl">
              <h2 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                Risk Breakdown
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <XAxis 
                      dataKey="risk_level" 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    />
                    <Tooltip
                      formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value), "Beneficiaries"]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white'
                      }}
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
              <p className="text-xs text-white/40 mt-2 text-center">
                System is balanced — not flagging everyone as HIGH risk
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ============================================ */}
            {/* Main Table - High Risk Beneficiaries (Dark Theme) */}
            {/* ============================================ */}
            <div className="lg:col-span-2">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-semibold text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      Flagged Beneficiaries
                    </h2>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="ALL">All Risks</option>
                      <option value="HIGH">High Only</option>
                      <option value="MEDIUM">Medium Only</option>
                      <option value="LOW">Low Only</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-black/80 backdrop-blur-sm">
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white/70">
                          Beneficiary ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white/70">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-white/70">
                          Risk Score (MSE)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {beneficiaries.map((b) => (
                        <tr
                          key={b.beneficiary_id}
                          onClick={() =>
                            handleBeneficiaryClick(b.beneficiary_id)
                          }
                          className={`cursor-pointer transition-colors ${selectedBeneficiary?.beneficiary_id ===
                            b.beneficiary_id
                            ? "bg-emerald-500/10"
                            : "hover:bg-white/5"
                            }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-white">
                            {b.beneficiary_id}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                b.risk_level === 'HIGH' 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : b.risk_level === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {b.risk_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-white/10 rounded overflow-hidden">
                                <div
                                  className={`h-full ${
                                    b.risk_level === 'HIGH' ? 'bg-red-500' 
                                    : b.risk_level === 'MEDIUM' ? 'bg-amber-500' 
                                    : 'bg-emerald-500'
                                  }`}
                                  style={{
                                    width: `${(b.mean_squared_error / maxMSE) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="font-mono text-xs text-white/70">
                                {b.mean_squared_error.toFixed(4)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* Detail Panel - Explainability (Dark Theme) */}
            {/* ============================================ */}
            <div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-white">
                    {selectedBeneficiary
                      ? "Case Detail"
                      : "Select a Beneficiary"}
                  </h3>
                  {/* Language Selector */}
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="px-2 py-1 rounded-lg bg-black/50 border border-white/10 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    aria-label="Select explanation language"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="hinglish">Hinglish</option>
                  </select>
                </div>
                <div className="p-4">
                  {detailLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-emerald-500/20 rounded-full animate-spin border-t-emerald-500 mx-auto"></div>
                      <p className="text-white/40 text-sm mt-2">Loading...</p>
                    </div>
                  ) : selectedBeneficiary ? (
                    <div>
                      {/* ID & Risk Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-heading font-bold text-white">
                          {selectedBeneficiary.beneficiary_id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedBeneficiary.risk_level === 'HIGH' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : selectedBeneficiary.risk_level === 'MEDIUM'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {selectedBeneficiary.risk_level}
                        </span>
                      </div>

                      {/* Risk Score */}
                      <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white/60">
                            Anomaly Score (MSE)
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {selectedBeneficiary.mean_squared_error.toFixed(6)}
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded overflow-hidden">
                          <div
                            className={`h-full ${
                              selectedBeneficiary.risk_level === 'HIGH' ? 'bg-red-500' 
                              : selectedBeneficiary.risk_level === 'MEDIUM' ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min((selectedBeneficiary.mean_squared_error / maxMSE) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Flag Indicators (Visual) - Dark Theme */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/70 mb-2">
                          Detected Flags
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div
                            className={`p-2 rounded-lg border ${selectedBeneficiary.flags.high_recent_activity ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.high_recent_activity
                                  ? "text-red-400"
                                  : "text-white/30"
                              }
                            >
                              {selectedBeneficiary.flags.high_recent_activity
                                ? "✓"
                                : "○"}{" "}
                              High Recent Activity
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${selectedBeneficiary.flags.multiple_dealers ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.multiple_dealers
                                  ? "text-red-400"
                                  : "text-white/30"
                              }
                            >
                              {selectedBeneficiary.flags.multiple_dealers
                                ? "✓"
                                : "○"}{" "}
                              Multiple Dealers
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${selectedBeneficiary.flags.cross_district ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.cross_district
                                  ? "text-red-400"
                                  : "text-white/30"
                              }
                            >
                              {selectedBeneficiary.flags.cross_district
                                ? "✓"
                                : "○"}{" "}
                              Cross District
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${selectedBeneficiary.flags.high_lifetime_usage ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.high_lifetime_usage
                                  ? "text-red-400"
                                  : "text-white/30"
                              }
                            >
                              {selectedBeneficiary.flags.high_lifetime_usage
                                ? "✓"
                                : "○"}{" "}
                              High Lifetime Usage
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reason Bullets */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-white/70 mb-2">
                          Observations
                        </h4>
                        <ul className="space-y-1">
                          {selectedBeneficiary.reasons.map((reason, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span className="text-white/70">{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Gemini Explanation - Dark Theme */}
                      {selectedBeneficiary.gemini_explanation && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1">
                            <span>✨</span>
                            <span>
                              AI Explanation (
                              {language === "hi"
                                ? "हिंदी"
                                : language === "hinglish"
                                  ? "Hinglish"
                                  : "English"}
                              )
                            </span>
                          </h4>
                          <p className="text-sm text-blue-300/80 leading-relaxed whitespace-pre-line">
                            {selectedBeneficiary.gemini_explanation}
                          </p>
                        </div>
                      )}

                      {/* Audit Panel */}
                      <AuditPanel
                        beneficiaryId={selectedBeneficiary.beneficiary_id}
                        riskLevel={selectedBeneficiary.risk_level}
                        onAuditComplete={() => {}}
                      />
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Click on a beneficiary from the table to view detailed
                      risk analysis and AI-generated explanations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* How It Works - Dark Theme */}
          {/* ============================================ */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 backdrop-blur-xl">
            <p className="font-medium text-blue-400 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How It Works
            </p>
            <p className="text-sm text-blue-300/70">
              <strong className="text-blue-300">Autoencoder reconstructs normal behavior.</strong> High
              reconstruction error (Mean Squared Error) indicates deviation from
              expected patterns → potential fraud signal. Risk banding: HIGH
              (&gt;95th percentile), MEDIUM (75-95th), LOW (&lt;75th).
            </p>
            <p className="text-xs text-blue-400/50 mt-2">
              The frontend consumes pre-computed risk tables from BigQuery.
              ML inference runs offline; the UI only visualizes risk signals and
              explanations.
            </p>
          </div>
        </div>
      </section>

      {/* CTA - Dark Theme */}
      <section className="py-6 relative z-10 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/analytics">View Analytics</Button>
            <Button href="/technology" variant="secondary">Explore Technology</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
