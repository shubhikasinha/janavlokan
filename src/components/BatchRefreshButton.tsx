"use client";

import { useState } from "react";

interface BatchRefreshButtonProps {
  onRefreshComplete?: () => void;
}

interface RefreshResult {
  success: boolean;
  message?: string;
  summary?: {
    total_processed: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
    last_updated: string;
  };
  error?: string;
}

export default function BatchRefreshButton({ onRefreshComplete }: BatchRefreshButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/batch/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_type: "FULL_REFRESH" }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        onRefreshComplete?.();
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Failed to trigger refresh",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Main Button */}
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all ${loading
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/90"
          }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh Data</span>
          </>
        )}
      </button>

      {/* Result Popup */}
      {result && (
        <div
          className={`absolute top-full right-0 mt-2 w-72 p-4 rounded-lg shadow-lg z-50 ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span
              className={`text-sm font-medium ${result.success ? "text-green-800" : "text-red-800"
                }`}
            >
              {result.success ? "Refresh Complete" : "Refresh Failed"}
            </span>
            <button
              onClick={() => setResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              X
            </button>
          </div>

          {result.success && result.summary && (
            <div className="text-sm">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-white/50 p-2 rounded">
                  <p className="text-gray-500 text-xs">Total</p>
                  <p className="font-bold text-gray-900">
                    {result.summary.total_processed?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <p className="text-gray-500 text-xs">High Risk</p>
                  <p className="font-bold text-red-600">
                    {result.summary.high_risk?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <p className="text-gray-500 text-xs">Medium Risk</p>
                  <p className="font-bold text-amber-600">
                    {result.summary.medium_risk?.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/50 p-2 rounded">
                  <p className="text-gray-500 text-xs">Low Risk</p>
                  <p className="font-bold text-green-600">
                    {result.summary.low_risk?.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Updated: {new Date(result.summary.last_updated).toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {result.error && (
            <p className="text-sm text-red-700">{result.error}</p>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700 mt-2"
          >
            {showDetails ? "Hide details" : "Show details"}
          </button>

          {showDetails && (
            <div className="mt-2 p-2 bg-white/50 rounded text-xs text-gray-600">
              <p className="font-medium mb-1">How it works:</p>
              <p>
                In production, this triggers a Vertex AI batch prediction pipeline
                that reprocesses transactions through the ML model and updates
                risk scores in BigQuery.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
