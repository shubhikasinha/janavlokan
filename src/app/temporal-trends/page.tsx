"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";

export default function TemporalTrendsPage() {
    const { currentScheme, schemeConfig } = useScheme();
    const [refreshKey, setRefreshKey] = useState(0);

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
                                Temporal Trends
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Risk trends over time • Spike detection • Seasonal patterns • {schemeConfig.fullName}
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
                    <div className="mb-4">
                        <h2 className="text-xl font-heading font-semibold text-gray-900">
                            Temporal Analysis - {schemeConfig.fullName}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Visualize risk trends, detect spikes, and identify seasonal patterns in {schemeConfig.entityNamePlural}
                        </p>
                    </div>

                    <TimeSeriesChart
                        key={`${refreshKey}-${currentScheme}`}
                        days={30}
                        showSpikes={true}
                    />

                    {/* Info Cards */}
                    <div className="mt-8 grid md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h3 className="font-heading font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#830f00' }}></span>
                                High Risk Spikes
                            </h3>
                            <p className="text-sm text-gray-600">
                                Days with anomaly counts significantly above baseline (1.5σ+) are highlighted for investigation.
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h3 className="font-heading font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e18700' }}></span>
                                Trend Analysis
                            </h3>
                            <p className="text-sm text-gray-600">
                                Track how risk levels change over time to identify emerging patterns and seasonal trends.
                            </p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <h3 className="font-heading font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#008319' }}></span>
                                Affected Districts
                            </h3>
                            <p className="text-sm text-gray-600">
                                See which districts are most affected during spike periods for targeted interventions.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
