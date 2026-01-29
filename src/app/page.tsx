import React from 'react';
import { Button } from '../components';
import { Link } from 'react-router-dom';

/* ---------------- Types ---------------- */

type QuickStat = {
    value: string;
    label: string;
};

type RiskLevel = 'low' | 'medium' | 'high';

type StateMarker = {
    name: string;
    x: number;
    y: number;
    flagged: string;
    risk: RiskLevel;
};

/* ---------------- Data ---------------- */

// Key stats for quick display
const quickStats: QuickStat[] = [
    { value: '4.2 Cr', label: 'Beneficiaries Monitored' },
    { value: '12', label: 'Welfare Schemes' },
    { value: '28', label: 'States Covered' },
    { value: '₹18,450 Cr', label: 'Transactions This Month' },
];

// State data for India map
const stateMarkers: StateMarker[] = [
    { name: 'J&K', x: 175, y: 65, flagged: '1,234', risk: 'medium' },
    { name: 'Punjab', x: 175, y: 110, flagged: '2,456', risk: 'low' },
    { name: 'Rajasthan', x: 160, y: 175, flagged: '4,567', risk: 'low' },
    { name: 'Gujarat', x: 120, y: 230, flagged: '3,890', risk: 'low' },
    { name: 'Maharashtra', x: 175, y: 285, flagged: '6,789', risk: 'medium' },
    { name: 'Karnataka', x: 180, y: 350, flagged: '2,345', risk: 'low' },
    { name: 'Tamil Nadu', x: 210, y: 400, flagged: '3,456', risk: 'low' },
    { name: 'Kerala', x: 185, y: 420, flagged: '1,890', risk: 'low' },
    { name: 'UP', x: 265, y: 165, flagged: '12,847', risk: 'high' },
    { name: 'Bihar', x: 330, y: 185, flagged: '8,234', risk: 'high' },
    { name: 'MP', x: 225, y: 225, flagged: '5,123', risk: 'medium' },
    { name: 'West Bengal', x: 365, y: 230, flagged: '4,567', risk: 'medium' },
    { name: 'Odisha', x: 325, y: 275, flagged: '3,234', risk: 'medium' },
    { name: 'Assam', x: 420, y: 175, flagged: '1,567', risk: 'low' },
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

                    <div className="flex flex-wrap justify-center gap-4">
                        <Button to="/analytics">View Analytics</Button>
                        <Button variant="secondary" to="/dashboard">
                            Risk Dashboard
                        </Button>
                    </div>
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

            {/* Map Section */}
            <section className="py-10 md:py-14">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-xl md:text-2xl font-heading font-bold text-gray-900 text-center mb-6">
                        State-wise Risk Monitoring
                    </h2>

                    <div className="relative max-w-lg mx-auto">
                        <svg viewBox="0 0 500 500" className="w-full h-auto">
                            <path
                                d="M150,50 L175,40 L200,35 L230,30 L260,32 L290,40 L320,55 L350,75 L380,100 L395,130 L400,160 L395,195 L385,230 L375,265 L360,300 L340,340 L310,380 L275,420 L235,450 L195,455 L165,440 L145,400 L130,355 L115,310 L105,265 L100,220 L100,175 L105,135 L115,100 L130,70 Z"
                                fill="#FEF3C7"
                                stroke="#D97706"
                                strokeWidth={2}
                            />

                            {stateMarkers.map((state, index) => {
                                const isHigh = state.risk === 'high';
                                const isMedium = state.risk === 'medium';

                                return (
                                    <g key={index}>
                                        <circle
                                            cx={state.x}
                                            cy={state.y}
                                            r={isHigh ? 20 : isMedium ? 16 : 12}
                                            fill="none"
                                            stroke={
                                                isHigh
                                                    ? '#B91C1C'
                                                    : isMedium
                                                    ? '#D97706'
                                                    : '#059669'
                                            }
                                            strokeWidth={2}
                                            opacity={0.3}
                                        />
                                        <circle
                                            cx={state.x}
                                            cy={state.y}
                                            r={isHigh ? 14 : isMedium ? 10 : 7}
                                            fill={
                                                isHigh
                                                    ? '#B91C1C'
                                                    : isMedium
                                                    ? '#D97706'
                                                    : '#059669'
                                            }
                                        />

                                        {isHigh && (
                                            <>
                                                <line
                                                    x1={state.x + 15}
                                                    y1={state.y}
                                                    x2={state.x + 35}
                                                    y2={state.y - 15}
                                                    stroke="#374151"
                                                    strokeWidth={1}
                                                />
                                                <text
                                                    x={state.x + 38}
                                                    y={state.y - 18}
                                                    fontSize={11}
                                                    fontWeight="bold"
                                                >
                                                    {state.name}
                                                </text>
                                                <text
                                                    x={state.x + 38}
                                                    y={state.y - 6}
                                                    fontSize={10}
                                                    fill="#B91C1C"
                                                >
                                                    {state.flagged} cases
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
