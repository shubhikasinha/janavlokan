"use client";

import { useState } from "react";

interface AuditPanelProps {
  beneficiaryId: string;
  riskLevel: string;
  onAuditComplete?: () => void;
}

type AuditAction = "REVIEWED" | "FLAGGED" | "CLEARED" | "NOTE_ADDED";

export default function AuditPanel({
  beneficiaryId,
  riskLevel,
  onAuditComplete,
}: AuditPanelProps) {
  const [notes, setNotes] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuditAction = async (action: AuditAction) => {
    if (!officerName.trim()) {
      setError("Please enter your name/ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiary_id: beneficiaryId,
          action,
          officer_name: officerName.trim(),
          officer_id: officerName.trim().replace(/\s+/g, "_").toUpperCase(),
          notes: notes.trim(),
          new_status: action === "CLEARED" ? "LOW" : riskLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record audit action");
      }

      setSuccess(`Action "${action}" recorded successfully!`);
      setNotes("");
      onAuditComplete?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record action");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Open CSV download in new tab
      window.open(
        `/api/audit/export?format=csv&risk_level=${riskLevel}`,
        "_blank"
      );
    } catch (err) {
      setError("Failed to export report");
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
        Audit Actions
        <span className="text-xs font-normal text-gray-500">
          (Human-in-the-loop)
        </span>
      </h4>

      {/* Officer Name Input */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">
          Officer Name/ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
          placeholder="e.g., Rajesh Kumar / AO-12345"
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Notes Input */}
      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations, findings, or justification..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleAuditAction("REVIEWED")}
          disabled={loading}
          className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200 disabled:opacity-50 transition-colors"
        >
          Mark Reviewed
        </button>
        <button
          onClick={() => handleAuditAction("FLAGGED")}
          disabled={loading}
          className="px-3 py-2 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          Flag for Action
        </button>
        <button
          onClick={() => handleAuditAction("CLEARED")}
          disabled={loading}
          className="px-3 py-2 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
        >
          Clear / False Positive
        </button>
        <button
          onClick={() => handleAuditAction("NOTE_ADDED")}
          disabled={loading || !notes.trim()}
          className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Add Note Only
        </button>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="w-full px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        Export Report (CSV)
      </button>

      {/* Status Messages */}
      {loading && (
        <div className="mt-3 p-2 bg-blue-50 text-blue-700 rounded text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
          Recording action...
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-green-50 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        <p className="font-medium mb-1">Audit Trail</p>
        <p>All actions are logged with timestamp, officer ID, and notes for compliance and accountability.</p>
      </div>
    </div>
  );
}
