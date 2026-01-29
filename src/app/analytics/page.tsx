"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/Button";
import TimeSeriesChart from "@/components/TimeSeriesChart";
import BatchRefreshButton from "@/components/BatchRefreshButton";

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

interface DistrictRisk {
  residence_district: string;
  anomaly_count: number;
}

export default function AnalyticsPage() {
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
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-1">
                Analytics & Insights
              </h1>
              <p className="text-gray-600 text-sm">
                Geographic risk heatmaps • Temporal spike detection • Trend analysis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <BatchRefreshButton onRefreshComplete={handleRefreshComplete} />
              <Button href="/dashboard" variant="secondary">
                ← Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          {/* Geographic Heatmap Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-heading font-semibold text-gray-900">
                  Geographic Risk Heatmap
                </h2>
                <p className="text-sm text-gray-500">
                  District-wise anomaly concentration • Click markers for details
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
                key={refreshKey}
                onDistrictClick={handleDistrictClick}
              />
            </div>

            {/* Map Legend & Info */}
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
                  Map shows districts with detected anomalies.
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

          {/* Time Series Section */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-heading font-semibold text-gray-900">
                Temporal Analysis
              </h2>
              <p className="text-sm text-gray-500">
                Risk trends over time • Spike detection • Seasonal patterns
              </p>
            </div>

            <TimeSeriesChart key={refreshKey} days={30} showSpikes={true} />
          </div>

          {/* Synopsis Alignment Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">
              Synopsis Alignment: Analytics Features
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-800 mb-2">Implemented</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Geographic Risk Heatmaps (District-level)</li>
                  <li>• Temporal Spike Detection (1.5σ threshold)</li>
                  <li>• Time-Series Risk Trends (7-90 days)</li>
                  <li>• Stacked Area Charts (Risk distribution)</li>
                  <li>• Interactive Map with Tooltips</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-2">Synopsis Claims Covered</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• &quot;Aggregated risk scores visualized at district levels&quot;</li>
                  <li>• &quot;Regional concentrations of anomalous behavior&quot;</li>
                  <li>• &quot;Allocate audit resources efficiently&quot;</li>
                  <li>• &quot;Temporal spike indicators&quot;</li>
                  <li>• &quot;Seasonal calibration&quot; (via time range filter)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section >

      {/* CTA */}
      < section className="py-6 bg-white border-t border-gray-200" >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Button href="/dashboard">View Risk Dashboard</Button>
            <Button variant="secondary" href="/technology">
              Technology Stack
            </Button>
          </div>
        </div>
      </section >
    </div >
  );
}
