'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AuditFinding, LinkedTransaction } from '@/types/report';

const TipTapEditor = dynamic(() => import('./TipTapEditor'), {
    ssr: false,
    loading: () => (
        <div className="border border-gray-200 rounded-lg bg-gray-50 h-[150px] animate-pulse"></div>
    ),
});

interface FindingCardProps {
    finding: AuditFinding;
    onUpdate: (updated: AuditFinding) => void;
    onDelete: () => void;
    onLinkTransactions: () => void;
    linkedTransactions: LinkedTransaction[];
}

const severityColors = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', button: 'bg-gray-500' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300', button: 'bg-yellow-500' },
    high: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300', button: 'bg-orange-500' },
    critical: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-300', button: 'bg-red-500' },
};

const FindingCard: React.FC<FindingCardProps> = ({
    finding,
    onUpdate,
    onDelete,
    onLinkTransactions,
    linkedTransactions,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const colors = severityColors[finding.severity];

    const findingTransactions = linkedTransactions.filter(
        tx => finding.linkedTransactionIds.includes(tx.transactionId)
    );

    return (
        <div className={`border rounded-lg overflow-hidden ${colors.border} ${colors.bg}`}>
            {/* Header */}
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">Para</span>
                            <input
                                type="text"
                                value={finding.paraNumber}
                                onChange={(e) => onUpdate({ ...finding, paraNumber: e.target.value })}
                                className="w-16 px-1 py-0.5 text-lg font-semibold text-primary font-mono bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none"
                            />
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                            {finding.severity.toUpperCase()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${finding.status === 'open' ? 'bg-secondary/20 text-secondary-dark' :
                            finding.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {finding.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete finding"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                <input
                    type="text"
                    value={finding.title}
                    onChange={(e) => onUpdate({ ...finding, title: e.target.value })}
                    placeholder="Finding title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-lg font-medium"
                />

                {/* Quick controls */}
                <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Severity:</span>
                        <div className="flex gap-1">
                            {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                                <button
                                    key={sev}
                                    onClick={() => onUpdate({ ...finding, severity: sev })}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${finding.severity === sev
                                        ? `${severityColors[sev].button} text-white`
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {sev[0].toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Status:</span>
                        <select
                            value={finding.status}
                            onChange={(e) => onUpdate({ ...finding, status: e.target.value as 'open' | 'resolved' | 'disputed' })}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                        >
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="disputed">Disputed</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Amount:</span>
                        <input
                            type="number"
                            value={finding.amountInvolved || ''}
                            onChange={(e) => onUpdate({ ...finding, amountInvolved: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="0"
                            className="w-32 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Linked Transactions Summary */}
            <div className="px-4 py-3 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="text-sm text-gray-600">
                            {findingTransactions.length} linked transaction(s)
                        </span>
                        {findingTransactions.length > 0 && (
                            <span className="text-sm text-primary font-medium">
                                Avg Risk: {(findingTransactions.reduce((sum, tx) => sum + tx.riskScore, 0) / findingTransactions.length).toFixed(2)}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onLinkTransactions}
                        className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Link Transactions
                    </button>
                </div>

                {findingTransactions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {findingTransactions.slice(0, 5).map((tx) => (
                            <span
                                key={tx.transactionId}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-lg"
                            >
                                <span className="font-mono">{tx.beneficiaryId.slice(0, 8)}...</span>
                                <span className={`px-1 rounded ${tx.riskScore > 15 ? 'bg-red-500 text-white' :
                                    tx.riskScore > 5 ? 'bg-orange-500 text-white' :
                                        'bg-gray-500 text-white'
                                    }`}>
                                    {tx.riskScore.toFixed(2)}
                                </span>
                            </span>
                        ))}
                        {findingTransactions.length > 5 && (
                            <span className="text-xs text-gray-500">+{findingTransactions.length - 5} more</span>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 bg-white space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Background / Criteria
                        </label>
                        <TipTapEditor
                            content={finding.background}
                            onChange={(content) => onUpdate({ ...finding, background: content })}
                            placeholder="Describe the rules, policies, or criteria that were expected to be followed..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Audit Observation
                        </label>
                        <TipTapEditor
                            content={finding.observation}
                            onChange={(content) => onUpdate({ ...finding, observation: content })}
                            placeholder="Describe what was actually found during the audit..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Impact
                        </label>
                        <TipTapEditor
                            content={finding.impact}
                            onChange={(content) => onUpdate({ ...finding, impact: content })}
                            placeholder="Describe the financial or operational impact..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Departmental Response
                        </label>
                        <TipTapEditor
                            content={finding.departmentalResponse || ''}
                            onChange={(content) => onUpdate({ ...finding, departmentalResponse: content })}
                            placeholder="Response from the department (if any)..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Recommendation
                        </label>
                        <TipTapEditor
                            content={finding.recommendation}
                            onChange={(content) => onUpdate({ ...finding, recommendation: content })}
                            placeholder="Suggested corrective action..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

interface FindingsPanelProps {
    findings: AuditFinding[];
    linkedTransactions: LinkedTransaction[];
    onUpdate: (findings: AuditFinding[]) => void;
    onOpenTransactionLinker: (findingId: string) => void;
}

const FindingsPanel: React.FC<FindingsPanelProps> = ({
    findings,
    linkedTransactions,
    onUpdate,
    onOpenTransactionLinker,
}) => {
    const handleAddFinding = () => {
        const newFinding: AuditFinding = {
            id: `finding-${Date.now()}`,
            paraNumber: `2.${findings.length + 1}`,
            title: '',
            background: '',
            observation: '',
            impact: '',
            recommendation: '',
            severity: 'medium',
            status: 'open',
            linkedTransactionIds: [],
        };
        onUpdate([...findings, newFinding]);
    };

    const handleUpdateFinding = (index: number, updated: AuditFinding) => {
        const newFindings = [...findings];
        newFindings[index] = updated;
        onUpdate(newFindings);
    };

    const handleDeleteFinding = (index: number) => {
        if (confirm('Delete this finding?')) {
            onUpdate(findings.filter((_, i) => i !== index));
        }
    };

    // Calculate summary stats
    const stats = {
        total: findings.length,
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        totalAmount: findings.reduce((sum, f) => sum + (f.amountInvolved || 0), 0),
        linkedCount: linkedTransactions.length,
    };

    return (
        <div className="space-y-6">
            {/* Summary Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-primary">{stats.total}</p>
                            <p className="text-xs text-gray-500">Total Findings</p>
                        </div>
                        <div className="h-10 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-3">
                            {stats.critical > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                                    {stats.critical} Critical
                                </span>
                            )}
                            {stats.high > 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded">
                                    {stats.high} High
                                </span>
                            )}
                            {stats.medium > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">
                                    {stats.medium} Medium
                                </span>
                            )}
                            {stats.low > 0 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded">
                                    {stats.low} Low
                                </span>
                            )}
                        </div>
                        <div className="h-10 w-px bg-gray-200"></div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-accent">{stats.linkedCount}</p>
                            <p className="text-xs text-gray-500">Linked Transactions</p>
                        </div>
                        {stats.totalAmount > 0 && (
                            <>
                                <div className="h-10 w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-red-600">
                                        {stats.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-xs text-gray-500">Amount Involved</p>
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={handleAddFinding}
                        className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Finding
                    </button>
                </div>
            </div>

            {/* Findings List */}
            {findings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mb-2">No audit findings recorded yet</p>
                    <p className="text-sm text-gray-400 mb-4">
                        Add findings to document observations from your audit
                    </p>
                    <button
                        onClick={handleAddFinding}
                        className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-all"
                    >
                        Add First Finding
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {findings.map((finding, index) => (
                        <FindingCard
                            key={finding.id}
                            finding={finding}
                            onUpdate={(updated) => handleUpdateFinding(index, updated)}
                            onDelete={() => handleDeleteFinding(index)}
                            onLinkTransactions={() => onOpenTransactionLinker(finding.id)}
                            linkedTransactions={linkedTransactions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FindingsPanel;
