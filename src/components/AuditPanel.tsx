"use client";

import { useState, useEffect } from "react";
import { useScheme } from "@/context/SchemeContext";

interface AuditPanelProps {
  beneficiaryId: string;  // For MDM this will be school_id
  riskLevel: string;
  onAuditComplete?: () => void;
}

type AuditAction = "REVIEWED" | "FLAGGED" | "CLEARED" | "NOTE_ADDED" | "VERIFIED" | "FEEDBACK_TRUE_POSITIVE" | "FEEDBACK_FALSE_POSITIVE";

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
  const { currentScheme, schemeConfig } = useScheme();
  const [notes, setNotes] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: Feedback stats state
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

  // Fetch feedback stats on mount
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

  const handleAuditAction = async (action: AuditAction) => {
    if (!officerName.trim()) {
      setError("Please enter your name/ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // Determine new_status based on action (Human decision)
    const getNewStatus = (action: AuditAction): string => {
      switch (action) {
        case "CLEARED":
          return "GENUINE";           // Human says: Not fraud, false positive
        case "FLAGGED":
          return "CONFIRMED_FRAUD";   // Human says: Yes, this is fraud
        case "VERIFIED":
          return "VERIFIED_FRAUD";    // Human says: Verified fraud, action taken
        case "REVIEWED":
          return "UNDER_REVIEW";      // Human says: Needs more investigation
        case "NOTE_ADDED":
          return riskLevel;           // No status change, just adding notes
        case "FEEDBACK_TRUE_POSITIVE":
          return "TRUE_POSITIVE";     // Human says: Model was correct
        case "FEEDBACK_FALSE_POSITIVE":
          return "FALSE_POSITIVE";    // Human says: Model was wrong
        default:
          return riskLevel;
      }
    };

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiary_id: beneficiaryId,
          action: action.startsWith("FEEDBACK_") ? "FEEDBACK" : action,
          officer_name: officerName.trim(),
          officer_id: officerName.trim().replace(/\s+/g, "_").toUpperCase(),
          notes: notes.trim(),
          new_status: getNewStatus(action),
          scheme_type: currentScheme,  // Add scheme type
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record audit action");
      }

      // Refresh feedback stats after feedback action
      if (action.startsWith("FEEDBACK_")) {
        fetchFeedbackStats();
        setSuccess(`Feedback recorded: ${action === "FEEDBACK_TRUE_POSITIVE" ? "True Positive (Correct)" : "False Positive (Wrong)"}`);
      } else {
        setSuccess(`Action "${action}" recorded successfully!`);
      }

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
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 shadow-sm">
      <h4 className="font-heading font-semibold text-white mb-3 flex items-center gap-2">
        Audit Actions
        <span className="text-xs font-normal text-white/50">
          (Human-in-the-loop)
        </span>
      </h4>

      {/* ============================================ */}
      {/* NEW: Quick Feedback Buttons for ML Training */}
      {/* ============================================ */}
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-purple-400 flex items-center gap-2">
            Model Feedback
            <span className="text-[10px] text-purple-400/70">(Train Future Models)</span>
          </h5>
          {feedbackStats && !feedbackLoading && (
            <div className="text-[10px] text-white/50">
              Accuracy: <span className="text-emerald-400 font-bold">{feedbackStats.accuracy_rate.toFixed(1)}%</span>
            </div>
          )}
        </div>
        <p className="text-xs text-white/50 mb-3">
          Is the model&apos;s risk prediction for this beneficiary correct?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAuditAction("FEEDBACK_TRUE_POSITIVE")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            Correct
            <span className="text-[10px] text-emerald-400/70">(True Positive)</span>
          </button>
          <button
            onClick={() => handleAuditAction("FEEDBACK_FALSE_POSITIVE")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            Wrong
            <span className="text-[10px] text-red-400/70">(False Positive)</span>
          </button>
        </div>

        {/* Feedback Stats Mini Display */}
        {feedbackStats && !feedbackLoading && feedbackStats.total_feedback > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-white">{feedbackStats.total_feedback}</div>
              <div className="text-[10px] text-white/40">Total Feedback</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-400">{feedbackStats.true_positives}</div>
              <div className="text-[10px] text-white/40">Correct</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">{feedbackStats.false_positives}</div>
              <div className="text-[10px] text-white/40">Wrong</div>
            </div>
          </div>
        )}
      </div>

      {/* Officer Name Input */}
      <div className="mb-3">
        <label className="block text-sm text-white/60 mb-1">
          Officer Name/ID <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={officerName}
          onChange={(e) => setOfficerName(e.target.value)}
          placeholder="e.g., Rajesh Kumar / AO-12345"
          className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      {/* Notes Input */}
      <div className="mb-3">
        <label className="block text-sm text-white/60 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations, findings, or justification..."
          rows={3}
          className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
        />
      </div>

      {/* Action Buttons - Dark Theme */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleAuditAction("REVIEWED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Mark Reviewed
        </button>
        <button
          onClick={() => handleAuditAction("VERIFIED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-sm font-medium hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Verify Fraud
        </button>
        <button
          onClick={() => handleAuditAction("FLAGGED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm font-medium hover:bg-red-500/30 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Confirm Fraud
        </button>
        <button
          onClick={() => handleAuditAction("CLEARED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Clear (Genuine)
        </button>
        <button
          onClick={() => handleAuditAction("NOTE_ADDED")}
          disabled={loading || !notes.trim() || !officerName.trim()}
          className="col-span-2 px-3 py-2 min-h-[42px] bg-white/5 text-white/70 border border-white/10 rounded text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Add Note Only
        </button>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        className="w-full px-3 py-2 bg-emerald-500 text-white rounded text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
      >
        Export Report (CSV)
      </button>

      {/* Status Messages - Dark Theme */}
      {loading && (
        <div className="mt-3 p-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          Recording action...
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-sm">
          {error}
        </div>
      )}

      {/* Info Box - Dark Theme */}
      <div className="mt-3 p-2 bg-white/5 border border-white/10 rounded text-xs text-white/50">
        <p className="font-medium mb-1 text-white/70">Audit Trail</p>
        <p>All actions are logged with timestamp, officer ID, and notes for compliance and accountability.</p>
      </div>
    </div>
  );
}
