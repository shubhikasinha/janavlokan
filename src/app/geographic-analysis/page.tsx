"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";
import IndiaMap from "@/components/IndiaMap";
import ZonalRiskView from "@/components/ZonalRiskView";

interface DistrictRisk {
    residence_district: string;
    anomaly_count: number;
}

export default function GeographicAnalysisPage() {
    const { currentScheme, schemeConfig } = useScheme();
    const [selectedDistrict, setSelectedDistrict] = useState<DistrictRisk | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleDistrictClick = (district: DistrictRisk) => {
        setSelectedDistrict(district);
    };

    const handleRefreshComplete = () => {
        setRefreshKey((prev) => prev + 1);
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
                                Geographic Analysis
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Regional risk distribution and district-level heatmaps • {schemeConfig.fullName}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="w-full sm:w-auto h-11 mt-[7px]"><BatchRefreshButton onRefreshComplete={handleRefreshComplete} className="h-full md:min-w-[80px] text-xs" /></div>
                            <div className="flex-1 h-11"><SchemeSwitcher className="h-full whitespace-nowrap" /></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-6">
                <div className="max-w-7xl mx-auto px-4">
                    {/* India Map Overview */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                            <div>
                                <h2 className="text-xl font-heading font-semibold text-gray-900">
                                    National Risk Overview
                                </h2>
                                <p className="text-sm text-gray-500">
                                    District-wise risk concentration across India • {schemeConfig.fullName}
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
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <IndiaMap
                                key={`india-map-${currentScheme}-${refreshKey}`}
                                title={`${schemeConfig.name} National Risk Heatmap`}
                                height="400px"
                                onDistrictClick={handleDistrictClick}
                            />
                        </div>
                    </div>

                    <div className="mb-8">
                        <ZonalRiskView key={`zonal-${currentScheme}-${refreshKey}`} />
                    </div>

                    {/* Info Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="font-medium text-blue-800 mb-1">How It Works</p>
                            <p className="text-sm text-blue-700">
                                Districts are grouped into regional zones. Risk levels are calculated from flagged {schemeConfig.entityNamePlural.toLowerCase()}.
                            </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="font-medium text-amber-800 mb-1">Data Source</p>
                            <p className="text-sm text-amber-700">
                                Real-time aggregation from BigQuery. High and Medium risk {schemeConfig.entityNamePlural.toLowerCase()} are counted as flagged.
                            </p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="font-medium text-green-800 mb-1">Use Case</p>
                            <p className="text-sm text-green-700">
                                Identify regional patterns and allocate audit resources to high-concentration zones.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

