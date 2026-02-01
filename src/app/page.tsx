import React from 'react';
import { Button } from '../components';

/* ---------------- Types ---------------- */

type QuickStat = {
    value: string;
    label: string;
};

/* ---------------- Data ---------------- */

// Key stats for quick display
const quickStats: QuickStat[] = [
    { value: '4.2 Cr', label: 'Beneficiaries Monitored' },
    { value: '12', label: 'Welfare Schemes' },
    { value: '28', label: 'States Covered' },
    { value: '18,450 Cr', label: 'Transactions This Month' },
];

/* ---------------- Component ---------------- */

const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="py-12 md:py-16 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <img
                        src="/logojan.jpeg"
                        alt="JanAvlokan Logo"
                        className="h-32 md:h-40 w-auto mx-auto mb-6"
                    />

                    <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-3">
                        Welfare Intelligence Platform
                    </h1>

                    <p className="text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
                        AI-powered decision support system for transparent subsidy delivery.
                        JanAvlokan analyzes welfare transaction patterns to flag potential
                        leakage while ensuring genuine beneficiaries receive uninterrupted support.
                    </p>
                </div>
            </section>

            {/* Quick Stats */}
            <section className="py-6 bg-gray-50 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickStats.map((stat, index) => (
                        <div
                            key={index}
                            className="text-center p-4 bg-white rounded-lg border border-gray-200"
                        >
                            <div className="text-xl md:text-2xl font-heading font-bold text-primary">
                                {stat.value}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomePage;
