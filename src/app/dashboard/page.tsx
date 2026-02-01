"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/Button";
import AuditPanel from "@/components/AuditPanel";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";

// Chart colors for inline distribution display
// Minimal Chart colors
const RISK_COLORS: Record<string, string> = {
  HIGH: "#800404ff",   // Red-600
  MEDIUM: "#94a3b8", // Slate-400
  LOW: "#e2e8f0",    // Slate-200
  UNKNOWN: "#f8fafc", // Slate-50
};

// ============================================
// LPG Types
// ============================================
interface LPGDashboardSummary {
  total_beneficiaries: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

interface LPGBeneficiary {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flag_high_recent_activity: boolean;
  flag_multiple_dealers: boolean;
  flag_cross_district: boolean;
  flag_high_lifetime_usage: boolean;
}

interface LPGBeneficiaryDetail {
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

// ============================================
// MDM Types
// ============================================
interface MDMDashboardSummary {
  total_schools: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  total_meals_reported: number;
}

interface MDMSchool {
  school_id: number;
  school_name: string;
  district: string;
  risk_level: string;
  anomaly_score: number;
  flag_ghost_meals: boolean;
  flag_ingredient_inflation: boolean;
  flag_fund_overclaim: boolean;
  flag_cook_anomaly: boolean;
  total_meals_reported: number;
}

interface MDMSchoolDetail {
  school_id: number;
  school_name: string;
  district: string;
  block: string;
  village: string;
  school_type: string;
  management: string;
  total_enrolled_students: number;
  avg_attendance_rate: number;
  kitchen_type: string;
  cook_count: number;
  last_inspection_score: number;
  risk_level: string;
  anomaly_score: number;
  flags: {
    ghost_meals: boolean;
    ingredient_inflation: boolean;
    fund_overclaim: boolean;
    cook_anomaly: boolean;
  };
  reasons: string[];
  gemini_explanation?: string;
  risk_breakdown?: RiskBreakdown;
}

// ============================================
// Common Types
// ============================================
interface RiskDistribution {
  risk_level: string;
  count: number;
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

type Language = "en" | "hi" | "hinglish";

// Union types for unified handling
type DashboardSummary = LPGDashboardSummary | MDMDashboardSummary;
type EntityItem = LPGBeneficiary | MDMSchool;
type EntityDetail = LPGBeneficiaryDetail | MDMSchoolDetail;

export default function DashboardPage() {
  const { currentScheme, schemeConfig } = useScheme();

  // State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [distribution, setDistribution] = useState<RiskDistribution[]>([]);
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityDetail | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [language, setLanguage] = useState<Language>("hinglish");
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 50;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle refresh complete
  const handleRefreshComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // API base URL based on scheme
  const getApiBase = useCallback(() => {
    return currentScheme === 'MDM' ? '/api/mdm' : '/api';
  }, [currentScheme]);

  // Get entity ID
  const getEntityId = useCallback((entity: EntityItem): string => {
    if (currentScheme === 'MDM') {
      return String((entity as MDMSchool).school_id);
    }
    return (entity as LPGBeneficiary).beneficiary_id;
  }, [currentScheme]);

  // Get entity score
  const getEntityScore = useCallback((entity: EntityItem): number => {
    if (currentScheme === 'MDM') {
      return (entity as MDMSchool).anomaly_score ?? 0;
    }
    return (entity as LPGBeneficiary).mean_squared_error ?? 0;
  }, [currentScheme]);

  // Get total count from summary
  const getTotalCount = useCallback((sum: DashboardSummary | null): number => {
    if (!sum) return 0;
    if (currentScheme === 'MDM') {
      return (sum as MDMDashboardSummary).total_schools ?? 0;
    }
    return (sum as LPGDashboardSummary).total_beneficiaries ?? 0;
  }, [currentScheme]);

  // Fetch all dashboard data on mount, refresh, or scheme change
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError(null);
      setSelectedEntity(null);

      const apiBase = getApiBase();

      try {
        const [summaryRes, distributionRes, entitiesRes] = await Promise.all([
          fetch(`${apiBase}/dashboard/summary`),
          fetch(`${apiBase}/dashboard/distribution`),
          fetch(currentScheme === 'MDM'
            ? `${apiBase}/schools/high-risk?limit=${ITEMS_PER_PAGE}`
            : `${apiBase}/beneficiaries/high-risk?limit=${ITEMS_PER_PAGE}`
          ),
        ]);

        if (!summaryRes.ok || !distributionRes.ok || !entitiesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [summaryData, distributionData, entitiesData] = await Promise.all([
          summaryRes.json(),
          distributionRes.json(),
          entitiesRes.json(),
        ]);

        // Check if API returned an error object
        if (summaryData?.success === false) {
          console.error('Summary API error:', summaryData.error);
          setSummary(null);
        } else {
          setSummary(summaryData);
        }

        if (Array.isArray(distributionData)) {
          setDistribution(distributionData);
        } else {
          console.error('Distribution API error:', distributionData);
          setDistribution([]);
        }

        if (Array.isArray(entitiesData)) {
          setEntities(entitiesData);
          setCurrentPage(1);
          setHasMore(entitiesData.length >= ITEMS_PER_PAGE);
        } else {
          console.error('Entities API error:', entitiesData);
          setEntities([]);
          setHasMore(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [refreshKey, currentScheme, getApiBase]);

  // Fetch filtered data when risk filter changes
  useEffect(() => {
    const fetchFilteredData = async () => {
      const apiBase = getApiBase();
      const endpoint = currentScheme === 'MDM' ? 'schools/high-risk' : 'beneficiaries/high-risk';

      try {
        const url = riskFilter === "ALL"
          ? `${apiBase}/${endpoint}?limit=50`
          : `${apiBase}/${endpoint}?limit=50&risk_level=${riskFilter}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch filtered data");
        const data = await res.json();
        setEntities(data);
      } catch (err) {
        console.error("Error fetching filtered entities:", err);
      }
    };

    fetchFilteredData();
  }, [riskFilter, currentScheme, getApiBase]);

  // Fetch entity detail on click (with language param)
  const handleEntityClick = async (entityId: string) => {
    setDetailLoading(true);
    const apiBase = getApiBase();
    const endpoint = currentScheme === 'MDM' ? 'schools' : 'beneficiaries';

    try {
      const res = await fetch(`${apiBase}/${endpoint}/${entityId}?lang=${language}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedEntity(data);
    } catch (err) {
      console.error("Error fetching details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Refetch when language changes (if entity is selected)
  useEffect(() => {
    if (selectedEntity) {
      const entityId = currentScheme === 'MDM'
        ? String((selectedEntity as MDMSchoolDetail).school_id)
        : (selectedEntity as LPGBeneficiaryDetail).beneficiary_id;
      handleEntityClick(entityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Clear selection when scheme changes
  useEffect(() => {
    setSelectedEntity(null);
    setRiskFilter("ALL");
  }, [currentScheme]);

  // Load more entities (pagination)
  const loadMoreEntities = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const apiBase = getApiBase();
    const nextPage = currentPage + 1;
    const offset = currentPage * ITEMS_PER_PAGE;

    try {
      const endpoint = currentScheme === 'MDM' ? 'schools/high-risk' : 'beneficiaries/high-risk';
      const url = riskFilter === "ALL"
        ? `${apiBase}/${endpoint}?limit=${ITEMS_PER_PAGE}&offset=${offset}`
        : `${apiBase}/${endpoint}?limit=${ITEMS_PER_PAGE}&offset=${offset}&risk_level=${riskFilter}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load more entities");

      const newData = await res.json();

      if (Array.isArray(newData) && newData.length > 0) {
        setEntities(prev => [...prev, ...newData]);
        setCurrentPage(nextPage);
        setHasMore(newData.length >= ITEMS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more entities:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Risk level styling
  const getRiskBadgeStyle = (level: string) => {
    switch (level?.toUpperCase()) {
      case "HIGH":
        return "bg-[#830f0015] text-[#830f00] border-[#830f0040]";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "LOW":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Calculate max score for bar scaling
  const maxScore = Math.max(
    ...entities.map((e) => getEntityScore(e)),
    0.001
  );

  // Get selected entity ID for comparison
  const getSelectedEntityId = (): string | null => {
    if (!selectedEntity) return null;
    if (currentScheme === 'MDM') {
      return String((selectedEntity as MDMSchoolDetail).school_id);
    }
    return (selectedEntity as LPGBeneficiaryDetail).beneficiary_id;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin border-t-primary mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">
            Loading {schemeConfig.name} Dashboard from BigQuery...
          </p>
        </div>
      </div>
    );
  }

  // Error state
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

  // Render flags based on scheme
  const renderFlags = () => {
    if (!selectedEntity) return null;

    if (currentScheme === 'MDM') {
      const mdmEntity = selectedEntity as MDMSchoolDetail;
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2 rounded-lg border ${mdmEntity.flags.ghost_meals ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={mdmEntity.flags.ghost_meals ? "text-red-700" : "text-gray-400"}>
              {mdmEntity.flags.ghost_meals ? "Yes" : "No"} Ghost Meals
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${mdmEntity.flags.ingredient_inflation ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={mdmEntity.flags.ingredient_inflation ? "text-red-700" : "text-gray-400"}>
              {mdmEntity.flags.ingredient_inflation ? "Yes" : "No"} Ingredient Inflation
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${mdmEntity.flags.fund_overclaim ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={mdmEntity.flags.fund_overclaim ? "text-red-700" : "text-gray-400"}>
              {mdmEntity.flags.fund_overclaim ? "Yes" : "No"} Fund Overclaim
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${mdmEntity.flags.cook_anomaly ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={mdmEntity.flags.cook_anomaly ? "text-red-700" : "text-gray-400"}>
              {mdmEntity.flags.cook_anomaly ? "Yes" : "No"} Cook Anomaly
            </span>
          </div>
        </div>
      );
    } else {
      const lpgEntity = selectedEntity as LPGBeneficiaryDetail;
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className={`p-2 rounded-lg border ${lpgEntity.flags.high_recent_activity ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={lpgEntity.flags.high_recent_activity ? "text-red-700" : "text-gray-400"}>
              {lpgEntity.flags.high_recent_activity ? "Yes" : "No"} High Recent Activity
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${lpgEntity.flags.multiple_dealers ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={lpgEntity.flags.multiple_dealers ? "text-red-700" : "text-gray-400"}>
              {lpgEntity.flags.multiple_dealers ? "Yes" : "No"} Multiple Dealers
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${lpgEntity.flags.cross_district ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={lpgEntity.flags.cross_district ? "text-red-700" : "text-gray-400"}>
              {lpgEntity.flags.cross_district ? "Yes" : "No"} Cross District
            </span>
          </div>
          <div className={`p-2 rounded-lg border ${lpgEntity.flags.high_lifetime_usage ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <span className={lpgEntity.flags.high_lifetime_usage ? "text-red-700" : "text-gray-400"}>
              {lpgEntity.flags.high_lifetime_usage ? "Yes" : "No"} High Lifetime Usage
            </span>
          </div>
        </div>
      );
    }
  };

  // Get display name for entity
  const getEntityDisplayName = (entity: EntityItem): string => {
    if (currentScheme === 'MDM') {
      const mdm = entity as MDMSchool;
      return mdm.school_name || `School ${mdm.school_id}`;
    }
    return (entity as LPGBeneficiary).beneficiary_id;
  };

  // Get selected entity display info
  const getSelectedEntityInfo = () => {
    if (!selectedEntity) return { id: '', name: '', score: 0 };

    if (currentScheme === 'MDM') {
      const mdm = selectedEntity as MDMSchoolDetail;
      return {
        id: String(mdm.school_id),
        name: mdm.school_name,
        score: mdm.anomaly_score,
        extra: mdm.district,
      };
    }
    const lpg = selectedEntity as LPGBeneficiaryDetail;
    return {
      id: lpg.beneficiary_id,
      name: lpg.beneficiary_id,
      score: lpg.mean_squared_error,
    };
  };

  const selectedInfo = getSelectedEntityInfo();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="bg-white py-6 md:py-8 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                  Live System
                </span>
                <span className="text-lg">{schemeConfig.icon}</span>
                <span className="text-xs font-medium text-primary uppercase tracking-wide px-2 py-0.5 bg-primary/10 rounded-full">
                  {schemeConfig.name}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-1">
                {schemeConfig.fullName} Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Operational view for investigating flagged {schemeConfig.entityNamePlural.toLowerCase()} •
                Real-time data from BigQuery
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-5 w-full md:w-auto">
              <div className="w-full md:w-auto h-11 mt-[7px]"><BatchRefreshButton onRefreshComplete={handleRefreshComplete} className="h-full md:min-w-[80px] text-xs" /></div>
              <div className="flex-1 h-11"><SchemeSwitcher className="h-full whitespace-nowrap" /></div>
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
                {getTotalCount(summary).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                Total {schemeConfig.entityNamePlural}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-heading font-bold text-red-800 tabular-nums">
                {summary?.high_risk?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-red-800/80 mt-1 uppercase tracking-wide">
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

          {/* MDM Extra Stats */}
          {currentScheme === 'MDM' && summary && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="text-2xl">🍱</div>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Total Meals Reported: {((summary as MDMDashboardSummary).total_meals_reported || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600">
                    Across all monitored schools in the system
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <Button href="/risk-distribution" variant="secondary" className="text-xs py-1 px-3">
                View Full Analysis
              </Button>
            </div>
          </div>

          {/* Main Content: Table + Detail Panel */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Flagged Entities Table */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading font-semibold text-gray-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#830f00] animate-pulse"></span>
                      Flagged {schemeConfig.entityNamePlural}
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
                          {schemeConfig.entityName} {currentScheme === 'MDM' ? 'Name' : 'ID'}
                        </th>
                        {currentScheme === 'MDM' && (
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                            District
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          Risk Level
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                          {currentScheme === 'MDM' ? 'Anomaly Score' : 'Risk Score (MSE)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {entities.map((entity, index) => {
                        const entityId = getEntityId(entity);
                        const entityScore = getEntityScore(entity);
                        const isSelected = getSelectedEntityId() === entityId;

                        return (
                          <tr
                            key={`${entityId}-${index}`}
                            onClick={() => handleEntityClick(entityId)}
                            className={`cursor-pointer transition-colors ${isSelected
                              ? "bg-primary/5 border-l-4 border-l-primary"
                              : "hover:bg-gray-50"
                              }`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {getEntityDisplayName(entity)}
                            </td>
                            {currentScheme === 'MDM' && (
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {(entity as MDMSchool).district}
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadgeStyle(
                                  entity.risk_level
                                )}`}
                              >
                                {entity.risk_level}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-2 bg-gray-200 rounded overflow-hidden">
                                  <div
                                    className={`h-full ${entity.risk_level === "HIGH"
                                      ? "bg-[#830f00]"
                                      : entity.risk_level === "MEDIUM"
                                        ? "bg-amber-500"
                                        : "bg-green-500"
                                      }`}
                                    style={{
                                      width: `${(entityScore / maxScore) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="font-mono text-xs text-gray-600">
                                  {(entityScore ?? 0).toFixed(4)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Load More Button */}
                {hasMore && entities.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                      onClick={loadMoreEntities}
                      disabled={loadingMore}
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingMore ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <>
                          <span>Load More {schemeConfig.entityNamePlural}</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Showing {entities.length} {schemeConfig.entityNamePlural.toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Panel */}
            <div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm sticky top-24">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-gray-900">
                    {selectedEntity
                      ? "Case Investigation"
                      : `Select a ${schemeConfig.entityName}`}
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
                  ) : selectedEntity ? (
                    <div>
                      {/* ID & Risk Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-heading font-bold text-gray-900 block">
                            {selectedInfo.name}
                          </span>
                          {currentScheme === 'MDM' && selectedInfo.extra && (
                            <span className="text-xs text-gray-500">
                              {selectedInfo.extra}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadgeStyle(
                            selectedEntity.risk_level
                          )}`}
                        >
                          {selectedEntity.risk_level}
                        </span>
                      </div>

                      {/* MDM School Info */}
                      {currentScheme === 'MDM' && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-blue-600">Enrolled:</span>
                              <span className="ml-1 font-medium text-blue-800">
                                {(selectedEntity as MDMSchoolDetail).total_enrolled_students}
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-600">Attendance:</span>
                              <span className="ml-1 font-medium text-blue-800">
                                {((selectedEntity as MDMSchoolDetail).avg_attendance_rate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-600">Inspection:</span>
                              <span className="ml-1 font-medium text-blue-800">
                                {(selectedEntity as MDMSchoolDetail).last_inspection_score}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-600">Cooks:</span>
                              <span className="ml-1 font-medium text-blue-800">
                                {(selectedEntity as MDMSchoolDetail).cook_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Risk Score */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            Anomaly Score {currentScheme === 'LPG' && '(MSE)'}
                          </span>
                          <span className="font-mono font-semibold text-gray-900">
                            {selectedInfo.score.toFixed(6)}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded overflow-hidden">
                          <div
                            className={`h-full ${selectedEntity.risk_level === "HIGH"
                              ? "bg-[#830f00]"
                              : selectedEntity.risk_level === "MEDIUM"
                                ? "bg-amber-500"
                                : "bg-green-500"
                              }`}
                            style={{
                              width: `${Math.min(
                                (selectedInfo.score / maxScore) * 100,
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
                        {renderFlags()}
                      </div>

                      {/* Risk Breakdown */}
                      {selectedEntity.risk_breakdown &&
                        selectedEntity.risk_breakdown.factors.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              Risk Breakdown
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                Score: {selectedEntity.risk_breakdown.total_risk_score}
                              </span>
                            </h4>
                            <div className="space-y-2">
                              {selectedEntity.risk_breakdown.factors.map(
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
                                        className="h-full bg-[#830f00] rounded-full"
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
                          {selectedEntity.reasons.map((reason, idx) => (
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
                      {selectedEntity.gemini_explanation && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                            <span></span>
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
                            {selectedEntity.gemini_explanation}
                          </p>
                        </div>
                      )}

                      {/* Audit Panel */}
                      <AuditPanel
                        beneficiaryId={selectedInfo.id}
                        riskLevel={selectedEntity.risk_level}
                        onAuditComplete={() => { }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-3xl">{schemeConfig.icon}</span>
                      </div>
                      <p className="text-gray-500 text-sm">
                        Click on a {schemeConfig.entityName.toLowerCase()} from the table to view detailed
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
              {currentScheme === 'MDM' ? (
                <>
                  <strong>Autoencoder reconstructs normal school meal patterns.</strong> High
                  reconstruction error indicates deviation from expected norms (ghost meals, ingredient inflation, fund overclaims).
                  Risk banding: HIGH (&gt;95th percentile), MEDIUM (75-95th), LOW (&lt;75th).
                </>
              ) : (
                <>
                  <strong>Autoencoder reconstructs normal behavior.</strong> High
                  reconstruction error (Mean Squared Error) indicates deviation from
                  expected patterns - potential fraud signal. Risk banding: HIGH
                  (&gt;95th percentile), MEDIUM (75-95th), LOW (&lt;75th).
                </>
              )}
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
            <Button href="/geographic-analysis">View Analytics & Insights</Button>
            <Button href="/technology" variant="secondary">
              Explore Technology
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
