'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RiskBreakdown {
    category: string;
    percentage: number;
    color: string;
}

const FraudRiskPieChart: React.FC = () => {
    // Risk breakdown data matching the image
    const riskData: RiskBreakdown[] = [
        { category: 'Unusual Activity', percentage: 32, color: '#830f00' },
        { category: 'Suspicious Locations', percentage: 24, color: '#c67b3e' },
        { category: 'Scheme Overlaps', percentage: 18, color: '#d4a574' },
        { category: 'Beneficiary Clusters', percentage: 15, color: '#e8cdb0' },
        { category: 'Repeat Withdrawals', percentage: 11, color: '#f5e6d3' },
    ];

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full">
            <h3 className="text-lg font-heading font-semibold text-gray-900 mb-4">
                Fraud Risk Breakdown
            </h3>

            {/* Pie Chart */}
            <div>
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={riskData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.percentage}%`}
                            outerRadius={85}
                            fill="#8884d8"
                            dataKey="percentage"
                        >
                            {riskData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-4 space-y-2">
                    {riskData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                ></div>
                                <span className="text-gray-700">{item.category}</span>
                            </div>
                            <span className="font-semibold text-gray-900">{item.percentage}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FraudRiskPieChart;
