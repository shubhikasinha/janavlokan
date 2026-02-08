'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import HighPriorityAlerts from '../components/HighPriorityAlerts';
import FraudRiskPieChart from '../components/FraudRiskPieChart';
import FraudTrendChart from '../components/FraudTrendChart';

const CSVQuickScan = dynamic(() => import('../components/CSVQuickScan'), {
    ssr: false,
    loading: () => (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="h-32 bg-gray-100 rounded-lg"></div>
        </div>
    )
});


type QuickStat = {
    value: string;
    label: string;
};


const quickStats: QuickStat[] = [
    { value: '4.2 Cr', label: 'Beneficiaries Monitored' },
    { value: '12', label: 'Welfare Schemes' },
    { value: '28', label: 'States Covered' },
    { value: '18,450 Cr', label: 'Transactions This Month' },
];


const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-white">

            <section className="py-12 md:py-16 border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <Image
                        src="/logojan.jpeg"
                        alt="JanAvlokan Logo"
                        width={160}
                        height={160}
                        className="mx-auto mb-6"
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

            <section className="py-8 bg-white border-b border-[#830f0010] mt-8 mb-15">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6 text-center">
                        Monitored Welfare Schemes
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border-2 border-[#830f0020] rounded-lg p-6 shadow-sm hover:border-[#830f0040] transition-colors">
                            <h3 className="text-xl font-heading font-bold text-[#2f0400] mb-4 pb-3 border-b border-[#830f0020]">
                                Mid-Day Meal Scheme
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-semibold text-[#2f0400]">PM POSHAN</span>
                                    <span className="text-gray-600 text-xs ml-1">(est. 1995, revamped 2021)</span>
                                </div>

                                <p className="text-gray-700 leading-relaxed">
                                    Provides free cooked meals to children in Classes I–VIII in government schools,
                                    improving nutrition and school attendance.
                                </p>

                                <div className="bg-[#830f0005] border-l-3 border-[#830f00] pl-3 py-2">
                                    <p className="text-xs text-gray-700">
                                        <strong>Coverage:</strong> ~450 cal & 12g protein (Primary),
                                        ~700 cal & 20g protein (Upper Primary)
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Reduces Malnutrition</span>
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Lowers Dropout Rates</span>
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Encourages Enrollment</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border-2 border-[#830f0020] rounded-lg p-6 shadow-sm hover:border-[#830f0040] transition-colors">
                            <h3 className="text-xl font-heading font-bold text-[#2f0400] mb-4 pb-3 border-b border-[#830f0020]">
                                LPG Subsidy Scheme
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-semibold text-[#2f0400]">PMUY + PAHAL</span>
                                    <span className="text-gray-600 text-xs ml-1">(2014, 2016)</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="bg-[#830f0005] rounded p-2">
                                        <p className="font-semibold text-gray-900 text-xs mb-1">PMUY (2016)</p>
                                        <p className="text-xs text-gray-700">
                                            Free LPG connections for BPL/SECC households to promote clean cooking fuel.
                                        </p>
                                    </div>

                                    <div className="bg-[#830f0005] rounded p-2">
                                        <p className="font-semibold text-gray-900 text-xs mb-1">PAHAL (2014)</p>
                                        <p className="text-xs text-gray-700">
                                            Direct subsidy transfer to bank accounts via Aadhaar, eliminating fake connections.
                                        </p>
                                    </div>
                                </div>

                                <div className="border-l-3 border-[#830f00] pl-3 py-1">
                                    <p className="text-xs text-gray-700">
                                        <strong>How it works:</strong> Buy LPG at market price → Subsidy credited to your account
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Prevents Duplicates</span>
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Saves Expenditure</span>
                                    <span className="text-xs px-2 py-1 bg-[#830f0010] text-[#830f00] rounded">Improves Transparency</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-8 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                            Quick Fraud Detection
                        </h2>
                        <p className="text-gray-600 text-sm max-w-xl mx-auto">
                            Upload transaction data for instant AI-powered fraud analysis.
                            Get real-time risk assessment without affecting your database.
                        </p>
                    </div>

                    <div className="max-w-xl mx-auto">
                        <CSVQuickScan />
                    </div>
                </div>
            </section>

            <section className="py-8 bg-gray-50 mt-15">
                <h2 className="text-2xl font-heading font-bold text-[#2f0400] mb-4 pb-3 border-b border-[#830f0020] text-center py-10">
                    High Priority Alerts & Fraud Risk Breakdown
                </h2>
                <div className="max-w-7xl mx-auto px-4 mt-10 mb-10">
                    <div className="grid md:grid-cols-3 gap-6">
                        <FraudRiskPieChart />
                        <FraudTrendChart />
                        <HighPriorityAlerts />
                    </div>
                </div>
            </section>


        </div>
    );
};

export default HomePage;
