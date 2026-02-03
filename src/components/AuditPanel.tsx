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

  const handleAuditAction = async (action: AuditAction) => {
    if (!officerName.trim()) {
      setError("Please enter your name/ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    //  (Human decision)
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
          scheme_type: currentScheme,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record audit action");
      }

      if (action.startsWith("FEEDBACK_")) {
        fetchFeedbackStats();
        setSuccess(`Feedback recorded: ${action === "FEEDBACK_TRUE_POSITIVE" ? "True Positive (Correct)" : "False Positive (Wrong)"}`);
      } else {
        setSuccess(`Action "${action}" recorded successfully!`);
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
        Audit Actions
        <span className="text-xs font-normal text-gray-500">
          (Human-in-the-loop)
        </span>
      </h4>

      <div className="mb-4 p-3 bg-[#830f0008] border border-[#830f0020] rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-sm font-medium text-[#830f00] flex items-center gap-2">
            Model Feedback
            <span className="text-[10px] text-[#830f00]/70">(Train Future Models)</span>
          </h5>
          {feedbackStats && !feedbackLoading && (
            <div className="text-[10px] text-gray-600">
              Accuracy: <span className="text-[#830f00] font-bold">{feedbackStats.accuracy_rate.toFixed(1)}%</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-700 mb-3">
          Is the model&apos;s risk prediction for this beneficiary correct?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAuditAction("FEEDBACK_TRUE_POSITIVE")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-[#830f0010] text-[#830f00] border border-[#830f0030] rounded-lg text-sm font-medium hover:bg-[#830f0020] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            Correct
            <span className="text-[10px] text-[#830f00]/60">(True Positive)</span>
          </button>
          <button
            onClick={() => handleAuditAction("FEEDBACK_FALSE_POSITIVE")}
            disabled={loading || !officerName.trim()}
            className="px-3 py-2.5 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            Wrong
            <span className="text-[10px] text-gray-600/70">(False Positive)</span>
          </button>
        </div>

        {feedbackStats && !feedbackLoading && feedbackStats.total_feedback > 0 && (
          <div className="mt-3 pt-3 border-t border-[#830f0020] grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{feedbackStats.total_feedback}</div>
              <div className="text-[10px] text-gray-500">Total Feedback</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#830f00]">{feedbackStats.true_positives}</div>
              <div className="text-[10px] text-gray-500">Correct</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">{feedbackStats.false_positives}</div>
              <div className="text-[10px] text-gray-500">Wrong</div>
            </div>
          </div>
        )}
      </div>

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

      <div className="mb-3">
        <label className="block text-sm text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add observations, findings, or justification..."
          rows={3}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => handleAuditAction("REVIEWED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-[#830f0010] text-[#830f00] border border-[#830f0030] rounded text-sm font-medium hover:bg-[#830f0020] disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Mark Reviewed
        </button>
        <button
          onClick={() => handleAuditAction("VERIFIED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-[#830f0015] text-[#830f00] border border-[#830f0040] rounded text-sm font-medium hover:bg-[#830f0025] disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Verify Fraud
        </button>
        <button
          onClick={() => handleAuditAction("FLAGGED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-[#830f0020] text-[#830f00] border border-[#830f0050] rounded text-sm font-medium hover:bg-[#830f0030] disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Confirm Fraud
        </button>
        <button
          onClick={() => handleAuditAction("CLEARED")}
          disabled={loading || !officerName.trim()}
          className="px-3 py-2 min-h-[42px] h-full bg-gray-100 text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Clear (Genuine)
        </button>
        <button
          onClick={() => handleAuditAction("NOTE_ADDED")}
          disabled={loading || !notes.trim() || !officerName.trim()}
          className="col-span-2 px-3 py-2 min-h-[42px] bg-white text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center text-center"
        >
          Add Note Only
        </button>
      </div>

      <button
        onClick={handleExport}
        className="w-full px-3 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        Export Report (CSV)
      </button>

      {loading && (
        <div className="mt-3 p-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          Recording action...
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-3 p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <div className="mt-3 p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500">
        <p className="font-medium mb-1 text-gray-700">Audit Trail</p>
        <p>All actions are logged with timestamp, officer ID, and notes for compliance and accountability.</p>
      </div>
    </div>
  );
}
