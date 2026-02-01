"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/Button";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";

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
                                State and district-level risk heatmaps • {schemeConfig.fullName}
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="w-full md:w-auto h-11 mt-[2px]"><BatchRefreshButton onRefreshComplete={handleRefreshComplete} className="h-full md:min-w-[160px]" /></div>
                            <div className="flex-1 h-11"><SchemeSwitcher className="h-full whitespace-nowrap" /></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-6">
                <div className="max-w-7xl mx-auto px-4">
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
                </div>
            </section>
        </div>
    );
}
