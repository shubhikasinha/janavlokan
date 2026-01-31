"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import AuditPanel from "@/components/AuditPanel";
import BatchRefreshButton from "@/components/BatchRefreshButton";

// Chart colors for inline distribution display
const RISK_COLORS: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#22c55e",
  UNKNOWN: "#6b7280",
};

// Types
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

interface Beneficiary {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flag_high_recent_activity: boolean;
  flag_multiple_dealers: boolean;
  flag_cross_district: boolean;
  flag_high_lifetime_usage: boolean;
}

interface RiskFactor {
  factor: string;
  contribution: number;
  percentage: number;
  description: string;
}

interface RiskBreakdown {
  total_risk_score: number;
  factors: RiskFactor[];
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
  risk_breakdown?: RiskBreakdown;
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

  // Fetch filtered data when risk filter changes
  useEffect(() => {
    const fetchFilteredData = async () => {
      try {
        const url =
          riskFilter === "ALL"
            ? "/api/beneficiaries/high-risk?limit=50"
            : `/api/beneficiaries/high-risk?limit=50&risk_level=${riskFilter}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch filtered data");
        const data = await res.json();
        setBeneficiaries(data);
      } catch (err) {
        console.error("Error fetching filtered beneficiaries:", err);
      }
    };

    fetchFilteredData();
  }, [riskFilter]);

  // Fetch beneficiary detail on click (with language param)
  const handleBeneficiaryClick = async (beneficiaryId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/beneficiaries/${beneficiaryId}?lang=${language}`
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

  // Calculate max MSE for bar scaling
  const maxMSE = Math.max(
    ...beneficiaries.map((b) => b.mean_squared_error),
    0.001
  );

  // Loading state - Light theme
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">
            Loading Dashboard from BigQuery...
          </p>
        </div>
      </div>
    );
  }

  // Error state - Light theme
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Light Theme */}
      <section className="bg-white py-6 md:py-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                  Live System
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-1">
                Risk Intelligence Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Operational view for investigating flagged beneficiaries •
                Real-time data from BigQuery
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BatchRefreshButton onRefreshComplete={handleRefreshComplete} />
              <Button href="/analytics" variant="secondary">
                📊 Analytics
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-heading font-bold text-gray-900 tabular-nums">
                {summary?.total_beneficiaries?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                Total Beneficiaries
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-heading font-bold text-red-600 tabular-nums">
                {summary?.high_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-red-600/80 mt-1 uppercase tracking-wide">
                High Risk
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-heading font-bold text-amber-600 tabular-nums">
                {summary?.medium_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-amber-600/80 mt-1 uppercase tracking-wide">
                Medium Risk
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-heading font-bold text-green-600 tabular-nums">
                {summary?.low_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-green-600/80 mt-1 uppercase tracking-wide">
                Low Risk
              </div>
            </div>
          </div>

          {/* Quick Risk Distribution Bar */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <h3 className="font-medium text-gray-700 text-sm">
                  Risk Distribution:
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {distribution.map((d) => (
                    <div key={d.risk_level} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            RISK_COLORS[d.risk_level] || RISK_COLORS.UNKNOWN,
                        }}
                      />
                      <span className="text-xs text-gray-600">
                        {d.risk_level}: {d.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <Button href="/analytics" variant="secondary" className="text-xs py-1 px-3">
                View Full Analysis →
              </Button>
            </div>
          </div>

          {/* Main Content: Table + Detail Panel */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Flagged Beneficiaries Table */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-semibold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Flagged Beneficiaries
                    </h2>
                    <select
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="ALL">All Risks</option>
                      <option value="HIGH">High Only</option>
                      <option value="MEDIUM">Medium Only</option>
                      <option value="LOW">Low Only</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Beneficiary ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Risk Score (MSE)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {beneficiaries.map((b) => (
                        <tr
                          key={b.beneficiary_id}
                          onClick={() => handleBeneficiaryClick(b.beneficiary_id)}
                          className={`cursor-pointer transition-colors ${
                            selectedBeneficiary?.beneficiary_id ===
                            b.beneficiary_id
                              ? "bg-primary/5 border-l-4 border-l-primary"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {b.beneficiary_id}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadgeStyle(
                                b.risk_level
                              )}`}
                            >
                              {b.risk_level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded overflow-hidden">
                                <div
                                  className={`h-full ${
                                    b.risk_level === "HIGH"
                                      ? "bg-red-500"
                                      : b.risk_level === "MEDIUM"
                                      ? "bg-amber-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${(b.mean_squared_error / maxMSE) * 100}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="font-mono text-xs text-gray-600">
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

            {/* Detail Panel - Explainability */}
            <div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm sticky top-24">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-gray-900">
                    {selectedBeneficiary
                      ? "Case Investigation"
                      : "Select a Beneficiary"}
                  </h3>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-gray-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                      <div className="w-8 h-8 border-2 border-primary/20 rounded-full animate-spin border-t-primary mx-auto"></div>
                      <p className="text-gray-500 text-sm mt-2">Loading...</p>
                    </div>
                  ) : selectedBeneficiary ? (
                    <div>
                      {/* ID & Risk Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-heading font-bold text-gray-900">
                          {selectedBeneficiary.beneficiary_id}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadgeStyle(
                            selectedBeneficiary.risk_level
                          )}`}
                        >
                          {selectedBeneficiary.risk_level}
                        </span>
                      </div>

                      {/* Risk Score */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            Anomaly Score (MSE)
                          </span>
                          <span className="font-mono font-semibold text-gray-900">
                            {selectedBeneficiary.mean_squared_error.toFixed(6)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className={`h-full ${
                              selectedBeneficiary.risk_level === "HIGH"
                                ? "bg-red-500"
                                : selectedBeneficiary.risk_level === "MEDIUM"
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                (selectedBeneficiary.mean_squared_error /
                                  maxMSE) *
                                  100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Flag Indicators */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Detected Flags
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div
                            className={`p-2 rounded-lg border ${
                              selectedBeneficiary.flags.high_recent_activity
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.high_recent_activity
                                  ? "text-red-700"
                                  : "text-gray-400"
                              }
                            >
                              {selectedBeneficiary.flags.high_recent_activity
                                ? "✓"
                                : "○"}{" "}
                              High Recent Activity
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${
                              selectedBeneficiary.flags.multiple_dealers
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.multiple_dealers
                                  ? "text-red-700"
                                  : "text-gray-400"
                              }
                            >
                              {selectedBeneficiary.flags.multiple_dealers
                                ? "✓"
                                : "○"}{" "}
                              Multiple Dealers
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${
                              selectedBeneficiary.flags.cross_district
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.cross_district
                                  ? "text-red-700"
                                  : "text-gray-400"
                              }
                            >
                              {selectedBeneficiary.flags.cross_district
                                ? "✓"
                                : "○"}{" "}
                              Cross District
                            </span>
                          </div>
                          <div
                            className={`p-2 rounded-lg border ${
                              selectedBeneficiary.flags.high_lifetime_usage
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <span
                              className={
                                selectedBeneficiary.flags.high_lifetime_usage
                                  ? "text-red-700"
                                  : "text-gray-400"
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

                      {/* Risk Breakdown */}
                      {selectedBeneficiary.risk_breakdown &&
                        selectedBeneficiary.risk_breakdown.factors.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              📊 Risk Breakdown
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                Score:{" "}
                                {selectedBeneficiary.risk_breakdown.total_risk_score}
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {selectedBeneficiary.risk_breakdown.factors.map(
                                (factor, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-50 border border-gray-200 rounded-lg p-2"
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs text-gray-700">
                                        {factor.factor}
                                      </span>
                                      <span className="text-xs font-bold text-amber-600">
                                        {factor.percentage}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-amber-400 to-red-500 rounded-full"
                                        style={{ width: `${factor.percentage}%` }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">
                                      {factor.description}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* Reason Bullets */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Observations
                        </h4>
                        <ul className="space-y-1">
                          {selectedBeneficiary.reasons.map((reason, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span className="text-gray-600">{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Gemini Explanation */}
                      {selectedBeneficiary.gemini_explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
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
                          <p className="text-sm text-blue-700 leading-relaxed whitespace-pre-line">
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
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">
                        Click on a beneficiary from the table to view detailed
                        risk analysis and AI-generated explanations.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              How It Works
            </p>
            <p className="text-sm text-blue-700">
              <strong>Autoencoder reconstructs normal behavior.</strong> High
              reconstruction error (Mean Squared Error) indicates deviation from
              expected patterns → potential fraud signal. Risk banding: HIGH
              (&gt;95th percentile), MEDIUM (75-95th), LOW (&lt;75th).
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-600 mb-4">
            Want to explore patterns, trends, and geographic insights?
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/analytics">📊 View Analytics & Insights</Button>
            <Button href="/technology" variant="secondary">
              Explore Technology
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
