'use client';

import { useEffect, useState } from 'react';
import { useScheme } from '../context/SchemeContext';

interface HighAlert {
    beneficiary_id: string;
    risk_level: string;
    risk_score: number;
    alert_type: string;
    timestamp: string;
}

const HighPriorityAlerts: React.FC = () => {
    const { currentScheme, schemeConfig } = useScheme();
    const [alerts, setAlerts] = useState<HighAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlerts();
    }, [currentScheme]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/data/high-priority-alerts?scheme=${currentScheme}&limit=10`);
            if (response.ok) {
                const data = await response.json();
                setAlerts(data.alerts || []);
            }
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-16 bg-gray-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#830f00] animate-pulse"></span>
                <h3 className="text-lg font-heading font-semibold text-gray-900">
                    High Priority Alerts
                </h3>
                <span className="ml-auto text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded-full font-medium">
                    {alerts.length} Active
                </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {alerts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No high-priority alerts at this time
                    </div>
                ) : (
                    alerts.map((alert, index) => (
                        <div
                            key={index}
                            className="border border-[#830f0020] hover:border-[#830f0040] bg-[#830f0005] hover:bg-[#830f0008] rounded-lg p-3 transition-all cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono font-semibold text-[#830f00] truncate">
                                            {alert.beneficiary_id}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-[#830f00] text-white rounded font-medium">
                                            {alert.risk_level}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">
                                        {alert.alert_type}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#830f00] rounded-full"
                                                style={{ width: `${Math.min(alert.risk_score * 10, 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-gray-500">
                                            {alert.risk_score.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                    {new Date(alert.timestamp).toLocaleString('en-IN', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {alerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                        href="/dashboard"
                        className="block text-center text-sm font-medium text-[#830f00] hover:text-[#830f00]/80 transition-colors"
                    >
                        View All on Dashboard →
                    </a>
                </div>
            )}
        </div>
    );
};

export default HighPriorityAlerts;
