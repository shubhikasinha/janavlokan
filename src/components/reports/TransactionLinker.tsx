'use client';

import React, { useState, useEffect } from 'react';
import { LinkedTransaction } from '@/types/report';

interface BeneficiaryData {
    beneficiary_id: string;
    risk_level: string;
    mean_squared_error: number;
    flag_high_recent_activity: boolean;
    flag_multiple_dealers: boolean;
    flag_cross_district: boolean;
    flag_high_lifetime_usage: boolean;
}

interface TransactionLinkerProps {
    isOpen: boolean;
    onClose: () => void;
    onLink: (transactions: LinkedTransaction[]) => void;
    existingLinks: string[];
    schemeType: 'LPG_SUBSIDY' | 'MID_DAY_MEAL';
}

const TransactionLinker: React.FC<TransactionLinkerProps> = ({
    isOpen,
    onClose,
    onLink,
    existingLinks,
    schemeType,
}) => {
    const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchBeneficiaries();
        }
    }, [isOpen, schemeType]);

    const fetchBeneficiaries = async () => {
        setLoading(true);
        setError(null);

        try {
            const endpoint = schemeType === 'LPG_SUBSIDY'
                ? '/api/beneficiaries/high-risk?limit=50'
                : '/api/mdm/beneficiaries/high-risk?limit=50';

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            // Handle both array and object response formats
            let fetchedBeneficiaries = Array.isArray(data) ? data : (data.beneficiaries || []);

            // Fallback to mock data if API returns empty (for development/demo)
            if (fetchedBeneficiaries.length === 0) {
                console.warn('No beneficiaries found from API, using mock data for demonstration');
                fetchedBeneficiaries = [
                    {
                        beneficiary_id: 'BEN-LPG-2024-001',
                        risk_level: 'HIGH',
                        mean_squared_error: 0.89,
                        flag_high_recent_activity: true,
                        flag_multiple_dealers: true,
                        flag_cross_district: false,
                        flag_high_lifetime_usage: true
                    },
                    {
                        beneficiary_id: 'BEN-LPG-2024-002',
                        risk_level: 'HIGH',
                        mean_squared_error: 0.78,
                        flag_high_recent_activity: true,
                        flag_multiple_dealers: false,
                        flag_cross_district: true,
                        flag_high_lifetime_usage: false
                    },
                    {
                        beneficiary_id: 'BEN-LPG-2024-003',
                        risk_level: 'MEDIUM',
                        mean_squared_error: 0.65,
                        flag_high_recent_activity: false,
                        flag_multiple_dealers: true,
                        flag_cross_district: false,
                        flag_high_lifetime_usage: true
                    },
                    {
                        beneficiary_id: 'BEN-LPG-2024-004',
                        risk_level: 'MEDIUM',
                        mean_squared_error: 0.55,
                        flag_high_recent_activity: true,
                        flag_multiple_dealers: false,
                        flag_cross_district: false,
                        flag_high_lifetime_usage: false
                    },
                    {
                        beneficiary_id: 'BEN-LPG-2024-005',
                        risk_level: 'LOW',
                        mean_squared_error: 0.32,
                        flag_high_recent_activity: false,
                        flag_multiple_dealers: false,
                        flag_cross_district: false,
                        flag_high_lifetime_usage: true
                    }
                ];
            }

            setBeneficiaries(fetchedBeneficiaries);
        } catch (err) {
            console.error(err);
            // Don't show error to user, just show empty state or mock could be added here too
            setError('Failed to load beneficiaries. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (beneficiaryId: string) => {
        const newSelected = new Set(selected);
        if (newSelected.has(beneficiaryId)) {
            newSelected.delete(beneficiaryId);
        } else {
            newSelected.add(beneficiaryId);
        }
        setSelected(newSelected);
    };

    const selectAll = () => {
        const filtered = getFilteredBeneficiaries();
        const newSelected = new Set(selected);
        filtered.forEach(b => newSelected.add(b.beneficiary_id));
        setSelected(newSelected);
    };

    const clearSelection = () => {
        setSelected(new Set());
    };

    const handleLink = () => {
        const transactions: LinkedTransaction[] = Array.from(selected).map(beneficiaryId => {
            const beneficiary = beneficiaries.find(b => b.beneficiary_id === beneficiaryId);
            const flags: string[] = [];

            if (beneficiary?.flag_high_recent_activity) flags.push('High Recent Activity');
            if (beneficiary?.flag_multiple_dealers) flags.push('Multiple Dealers');
            if (beneficiary?.flag_cross_district) flags.push('Cross District');
            if (beneficiary?.flag_high_lifetime_usage) flags.push('High Lifetime Usage');

            return {
                transactionId: beneficiaryId,
                beneficiaryId: beneficiaryId,
                riskScore: beneficiary?.mean_squared_error || 0,
                amount: 0,
                flags,
                aiExplanation: `Risk Level: ${beneficiary?.risk_level || 'Unknown'}. Flagged for: ${flags.join(', ') || 'No specific flags'}.`,
                dateAdded: new Date().toISOString(),
            };
        });

        onLink(transactions);
        setSelected(new Set());
        onClose();
    };

    const getFilteredBeneficiaries = () => {
        return beneficiaries.filter(b => {
            const matchesRisk = riskFilter === 'all' || b.risk_level === riskFilter;
            const matchesSearch = !searchQuery ||
                b.beneficiary_id.toLowerCase().includes(searchQuery.toLowerCase());
            const notAlreadyLinked = !existingLinks.includes(b.beneficiary_id);
            return matchesRisk && matchesSearch && notAlreadyLinked;
        });
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
            case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (!isOpen) return null;

    const filteredBeneficiaries = getFilteredBeneficiaries();

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                ></div>

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex-shrink-0 bg-gradient-to-r from-primary to-primary-light text-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-heading font-semibold">
                                    Link Transactions to Finding
                                </h2>
                                <p className="text-accent-light text-sm mt-1">
                                    Select high-risk beneficiaries from the dashboard to link as evidence
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by beneficiary ID..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                            </div>
                            <select
                                value={riskFilter}
                                onChange={(e) => setRiskFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                                <option value="all">All Risk Levels</option>
                                <option value="HIGH">High Risk Only</option>
                                <option value="MEDIUM">Medium Risk Only</option>
                                <option value="LOW">Low Risk Only</option>
                            </select>
                            <button
                                onClick={selectAll}
                                className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors text-sm font-medium"
                            >
                                Select All
                            </button>
                            <button
                                onClick={clearSelection}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12">
                                <p className="text-red-500 mb-4">{error}</p>
                                <button
                                    onClick={fetchBeneficiaries}
                                    className="text-primary hover:underline"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : filteredBeneficiaries.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <p className="text-gray-900 font-medium mb-1">No beneficiaries found</p>
                                <p className="text-sm text-gray-500">Try adjusting your filters or search query</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredBeneficiaries.map((beneficiary) => (
                                    <div
                                        key={beneficiary.beneficiary_id}
                                        onClick={() => toggleSelect(beneficiary.beneficiary_id)}
                                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${selected.has(beneficiary.beneficiary_id)
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-primary/30 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selected.has(beneficiary.beneficiary_id)
                                            ? 'bg-primary border-primary'
                                            : 'border-gray-300'
                                            }`}>
                                            {selected.has(beneficiary.beneficiary_id) && (
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {beneficiary.beneficiary_id}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getRiskColor(beneficiary.risk_level)}`}>
                                                    {beneficiary.risk_level}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                <span>Risk Score: {beneficiary.mean_squared_error.toFixed(4)}</span>
                                                {beneficiary.flag_high_recent_activity && (
                                                    <span className="px-1.5 py-0.5 bg-accent-light text-primary rounded">Recent Activity</span>
                                                )}
                                                {beneficiary.flag_multiple_dealers && (
                                                    <span className="px-1.5 py-0.5 bg-secondary-light text-primary rounded">Multi Dealer</span>
                                                )}
                                                {beneficiary.flag_cross_district && (
                                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Cross District</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-900">
                                                {beneficiary.mean_squared_error.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-gray-500">Anomaly Score</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                {selected.size} beneficiary(s) selected
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLink}
                                    disabled={selected.size === 0}
                                    className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Link Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionLinker;
