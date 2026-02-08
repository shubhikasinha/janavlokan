"use client";

import { useState, useEffect } from "react";
import { useScheme } from "@/context/SchemeContext";

interface AuditPanelProps {
  beneficiaryId: string;  // For MDM this will be school_id
  riskLevel: string;
  onAuditComplete?: () => void;
}

type AuditAction = "REVIEWED" | "VERIFIED" | "CLEARED" | "NOTE_ADDED";

interface FeedbackStats {
  total_feedback: number;
  true_positives: number;
  false_positives: number;
  accuracy_rate: number;
}

export default function AuditPanel({
  beneficiaryId,
  riskLevel,
  onAuditComplete,
}: AuditPanelProps) {
  const { currentScheme } = useScheme();
  const [notes, setNotes] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackStats();
  }, [currentScheme]);

  const fetchFeedbackStats = async () => {
    try {
      const res = await fetch(`/api/audit/feedback-stats?scheme_type=${currentScheme}`);
      const data = await res.json();
      if (data.success) {
        setFeedbackStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching feedback stats:", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAuditAction = async (action: AuditAction, isModelCorrect?: boolean) => {
    if (!officerName.trim()) {
      setError("Please enter your name/ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Map action to status with integrated feedback
    const getNewStatus = (action: AuditAction, isCorrect?: boolean): string => {
      switch (action) {
        case "VERIFIED":
          return "VERIFIED_FRAUD";    // Human confirms fraud = Model was CORRECT
        case "CLEARED":
          return "FALSE_POSITIVE";    // Human says genuine = Model was WRONG
        case "REVIEWED":
          return "UNDER_REVIEW";      // Needs more investigation
        case "NOTE_ADDED":
          return riskLevel;           // No status change
        default:
          return riskLevel;
      }
    };

    // Determine feedback action for ML training
    const feedbackAction = action === "VERIFIED" ? "FEEDBACK_TRUE_POSITIVE"
      : action === "CLEARED" ? "FEEDBACK_FALSE_POSITIVE"
        : null;

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiary_id: beneficiaryId,
          action: feedbackAction || action,
          officer_name: officerName.trim(),
          officer_id: officerName.trim().replace(/\s+/g, "_").toUpperCase(),
          notes: notes.trim(),
          new_status: getNewStatus(action, isModelCorrect),
          scheme_type: currentScheme,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record audit action");
      }

      const actionLabels: Record<AuditAction, string> = {
        VERIFIED: "✅ Confirmed as Fraud (Model Correct)",
        CLEARED: "❌ Marked as Genuine (Model Wrong)",
        REVIEWED: "📋 Marked for Review",
        NOTE_ADDED: "📝 Note Added",
      };

      setSuccess(actionLabels[action] || `Action recorded!`);

      // Refresh stats if model feedback was given
      if (feedbackAction) {
        fetchFeedbackStats();
      }

      setNotes("");
      onAuditComplete?.();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record action");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      window.open(
        `/api/audit/export?format=csv&risk_level=${riskLevel}`,
        "_blank"
      );
    } catch (_err) {
      setError("Failed to export report");
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2">
        Officer Decision
        <span className="text-xs font-normal text-gray-500">
          (Human-in-the-loop)
        </span>
      </h4>

      {/* Model Accuracy Stats */}
      {feedbackStats && !feedbackLoading && feedbackStats.total_feedback > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-800">Model Performance</span>
            <span className="text-lg font-bold text-blue-700">{feedbackStats.accuracy_rate.toFixed(1)}%</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-bold text-gray-700">{feedbackStats.total_feedback}</div>
              <div className="text-gray-500">Total</div>
            </div>
            <div>
              <div className="font-bold text-green-600">{feedbackStats.true_positives}</div>
              <div className="text-gray-500">Correct</div>
            </div>
            <div>
              <div className="font-bold text-red-600">{feedbackStats.false_positives}</div>
              <div className="text-gray-500">Wrong</div>
            </div>
          </div>
        </div>
      )}

      {/* Officer Name Input */}
      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">
          Officer Name/ID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
          placeholder="e.g., Rajesh Kumar / AO-12345"
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Notes Input */}
      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations, findings, or justification..."
          rows={2}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Simplified Action Buttons - Merged with Model Feedback */}
      <div className="space-y-2 mb-3">
        <p className="text-xs text-gray-500 mb-2">Is this prediction correct?</p>

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAuditAction("VERIFIED")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-[#830f0015] text-[#830f00] border border-[#830f0040] rounded-lg text-sm font-medium hover:bg-[#830f0025] disabled:opacity-50 transition-colors flex flex-col items-center justify-center gap-0.5"
          >
            <span>Confirm Fraud</span>
            <span className="text-[10px] opacity-70">Model correct</span>
          </button>
          <button
            onClick={() => handleAuditAction("CLEARED")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex flex-col items-center justify-center gap-0.5"
          >
            <span>Mark Genuine</span>
            <span className="text-[10px] opacity-70">Model wrong</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAuditAction("REVIEWED")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            Needs Review
          </button>
          <button
            onClick={() => handleAuditAction("NOTE_ADDED")}
            disabled={loading || !notes.trim() || !officerName.trim()}
            className="px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Add Note Only
          </button>
        </div>
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
        <div className="mt-3 p-2 bg-gray-100 text-gray-700 rounded text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
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

      {/* Audit Info */}
      <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500">
        <p>All actions are logged for compliance & model training.</p>
      </div>
    </div>
  );
}
