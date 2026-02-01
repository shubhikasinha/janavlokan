'use client';

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface RiskBreakdown {
    category: string;
    percentage: number;
    color: string;
}

const FraudTrendChart: React.FC = () => {
    // Risk breakdown data
    const riskData: RiskBreakdown[] = [
        { category: 'Unusual Activity', percentage: 32, color: '#830f00' },
        { category: 'Suspicious Locations', percentage: 24, color: '#c67b3e' },
        { category: 'Scheme Overlaps', percentage: 18, color: '#d4a574' },
        { category: 'Beneficiary Clusters', percentage: 15, color: '#e8cdb0' },
        { category: 'Repeat Withdrawals', percentage: 11, color: '#f5e6d3' },
    ];

    // Trend data for recent weeks
    const trendData = [
        { week: 'Week 1', value: 25 },
        { week: 'Week 2', value: 28 },
        { week: 'Week 3', value: 32 },
        { week: 'Week 4', value: 30 },
    ];

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-gray-900">Recent Trend</h3>
                <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded font-medium">
                    ▲ 7% Weekly Increase
                </span>
            </div>

            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                    <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis hide />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#830f00"
                        strokeWidth={2}
                        dot={{ fill: '#830f00', r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Trend Legend */}
            <div className="mt-4 space-y-1.5">
                {riskData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-gray-600">{item.category}</span>
                    </div>
                ))}
            </div>

            {/* View Full Report Link */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <a
                    href="/risk-distribution"
                    className="block text-center text-sm font-medium text-[#830f00] hover:text-[#830f00]/80 transition-colors"
                >
                    View Full Report →
                </a>
            </div>
        </div>
    );
};

export default FraudTrendChart;
