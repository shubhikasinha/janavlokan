"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/Button";
import BatchRefreshButton from "@/components/BatchRefreshButton";
import { useScheme } from "@/context/SchemeContext";
import SchemeSwitcher from "@/components/SchemeSwitcher";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

// Chart colors - Government theme
const RISK_COLORS: Record<string, string> = {
    HIGH: "#830f00",   // Dark Red (Critical)
    MEDIUM: "#e18700", // Orange (Warning)
    LOW: "#008319",    // Green (Safe)
    UNKNOWN: "#f8fafc", // Slate-50
};

interface RiskDistribution {
    risk_level: string;
    count: number;
}

interface EntityItem {
    risk_level: string;
    beneficiary_id?: string;
    mean_squared_error?: number;
    school_id?: number;
    school_name?: string;
    anomaly_score?: number;
}

// Scheme-specific slider configurations
const SLIDER_CONFIG = {
    LPG: {
        min: 0,
        max: 35,
        step: 0.5,
        default: 7.3,
        unit: "MSE",
        highMultiplier: 2, // HIGH = score > threshold * 2
    },
    MDM: {
        min: 0,
        max: 0.8,
        step: 0.01,
        default: 0.52,
        unit: "Score",
        highMultiplier: 1.2, // HIGH = score > threshold * 2
    },
};

export default function RiskDistributionPage() {
    const { currentScheme, schemeConfig } = useScheme();
    const [refreshKey, setRefreshKey] = useState(0);
    const [distribution, setDistribution] = useState<RiskDistribution[]>([]);

    // slider config for current scheme
    const sliderConfig = SLIDER_CONFIG[currentScheme as keyof typeof SLIDER_CONFIG] || SLIDER_CONFIG.LPG;

    // Dynamic Threshold Slider State - initialize with scheme default
    const [threshold, setThreshold] = useState<number>(sliderConfig.default);
    const [sliderLoading, setSliderLoading] = useState<boolean>(false);
    const [dynamicResults, setDynamicResults] = useState<EntityItem[]>([]);

    // Reset threshold when scheme changes
    useEffect(() => {
        const newConfig = SLIDER_CONFIG[currentScheme as keyof typeof SLIDER_CONFIG] || SLIDER_CONFIG.LPG;
        setThreshold(newConfig.default);
    }, [currentScheme]);

    const getApiBase = useCallback(() => {
        return currentScheme === 'MDM' ? '/api/mdm' : '/api';
    }, [currentScheme]);

    useEffect(() => {
        async function fetchDistribution() {
            try {
                const apiBase = getApiBase();
                const res = await fetch(`${apiBase}/dashboard/distribution`);
                if (res.ok) {
                    const data = await res.json();
                    setDistribution(data);
                }
            } catch (err) {
                console.error("Error fetching distribution:", err);
            }
        }
        fetchDistribution();
    }, [refreshKey, currentScheme, getApiBase]);

    useEffect(() => {
        const fetchDynamicData = async () => {
            setSliderLoading(true);
            try {
                const apiBase = getApiBase();
                const endpoint = currentScheme === 'MDM'
                    ? `${apiBase}/schools/high-risk?limit=50&dynamic=true&threshold=${threshold}`
                    : `${apiBase}/beneficiaries/high-risk?limit=50&dynamic=true&threshold=${threshold}`;

                const res = await fetch(endpoint);
                if (res.ok) {
                    const data = await res.json();
                    setDynamicResults(data);
                }
            } catch (err) {
                console.error("Error fetching dynamic data:", err);
            } finally {
                setSliderLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchDynamicData, 300);
        return () => clearTimeout(timeoutId);
    }, [threshold, currentScheme, getApiBase]);

    const handleRefreshComplete = () => {
        setRefreshKey((prev) => prev + 1);
    };

    // Get entity score based on scheme
    const getEntityScore = (entity: EntityItem): number => {
        if (currentScheme === 'MDM') {
            return entity.anomaly_score || 0;
        }
        return entity.mean_squared_error || 0;
    };

    // Calculate dynamic risk counts based on threshold with scheme-specific multipliers
    const dynamicCounts = {
        high: dynamicResults.filter(e => getEntityScore(e) > threshold * sliderConfig.highMultiplier).length,
        medium: dynamicResults.filter(e => getEntityScore(e) > threshold && getEntityScore(e) <= threshold * sliderConfig.highMultiplier).length,
        low: dynamicResults.filter(e => getEntityScore(e) <= threshold).length,
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <section className="bg-white py-6 md:py-8 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{schemeConfig.icon}</span>
                                <span className="text-xs font-medium text-primary uppercase tracking-wide px-2 py-0.5 bg-primary/10 rounded-full">
                                    {schemeConfig.name}
                                </span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-1">
                                Risk Distribution
                            </h1>
                            <p className="text-gray-600 text-sm">
                                Risk breakdown charts • Dynamic sensitivity control • {schemeConfig.fullName}
                            </p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-5 w-full md:w-auto">
                            <div className="w-full md:w-auto h-11 mt-[7px]"><BatchRefreshButton onRefreshComplete={handleRefreshComplete} className="h-full md:min-w-[80px] text-xs" /></div>
                            <div className="flex-1 h-11"><SchemeSwitcher className="h-full whitespace-nowrap" /></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-6">
                <div className="max-w-7xl mx-auto px-4">
                    {/* Risk Distribution Charts */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                        {/* Pie Chart */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h2 className="font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#008319' }}></div>
                                {schemeConfig.name} Risk Distribution (Pie)
                            </h2>
                            <div className="h-64 min-h-[256px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={distribution}
                                            dataKey="count"
                                            nameKey="risk_level"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={({ name, percent }) =>
                                                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                                            }
                                        >
                                            {distribution.map((entry) => (
                                                <Cell
                                                    key={entry.risk_level}
                                                    fill={RISK_COLORS[entry.risk_level] || RISK_COLORS.UNKNOWN}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value), "Count"]}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                            <h2 className="font-heading font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#e18700' }}></div>
                                Risk Breakdown (Bar)
                            </h2>
                            <div className="h-64 min-h-[256px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribution}>
                                        <XAxis dataKey="risk_level" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : String(value), schemeConfig.entityNamePlural]}
                                        />
                                        <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                                            {distribution.map((entry) => (
                                                <Cell
                                                    key={entry.risk_level}
                                                    fill={RISK_COLORS[entry.risk_level] || RISK_COLORS.UNKNOWN}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                System is balanced — not flagging everyone as HIGH risk
                            </p>
                        </div>
                    </div>

                    {/* Dynamic Threshold Slider */}
                    <div className="border rounded-xl p-6 mb-8" style={{ backgroundColor: '#ffffffff', borderColor: '#2f040040' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2f0400' }}></div>
                                <h3 className="text-lg font-heading font-semibold text-gray-900">
                                    Dynamic Sensitivity Control
                                </h3>
                                <span className="px-2 py-0.5 text-xs rounded-full uppercase tracking-wider" style={{ backgroundColor: '#2f040015', color: '#2f0400' }}>
                                    Interactive Demo
                                </span>
                            </div>
                            {sliderLoading && (
                                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#2f040040', borderTopColor: '#2f0400' }}></div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label htmlFor="threshold-slider" className="text-gray-700 text-sm">
                                    {sliderConfig.unit} Threshold:
                                </label>
                                <span className="font-mono font-bold text-xl" style={{ color: '#2f0400' }}>
                                    {threshold.toFixed(currentScheme === 'MDM' ? 2 : 1)}
                                </span>
                            </div>

                            <div className="relative">
                                <input
                                    id="threshold-slider"
                                    type="range"
                                    min={sliderConfig.min}
                                    max={sliderConfig.max}
                                    step={sliderConfig.step}
                                    value={threshold}
                                    onChange={(e) => setThreshold(Number(e.target.value))}
                                    title={`Adjust ${sliderConfig.unit.toLowerCase()} threshold`}
                                    className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                                    style={{ backgroundColor: '#2f040030', accentColor: '#2f0400' }}
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>More Sensitive ({sliderConfig.min})</span>
                                    <span>Less Sensitive ({sliderConfig.max})</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="rounded-lg p-3" style={{ backgroundColor: '#830f0015', border: '1px solid #830f0030' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#830f00' }}>{dynamicCounts.high}</div>
                                    <div className="text-xs font-medium" style={{ color: '#830f00' }}>HIGH RISK</div>
                                    <div className="text-gray-500 text-[10px]">
                                        {sliderConfig.unit} &gt; {(threshold * sliderConfig.highMultiplier).toFixed(currentScheme === 'MDM' ? 2 : 1)}
                                    </div>
                                </div>
                                <div className="rounded-lg p-3" style={{ backgroundColor: '#e1870015', border: '1px solid #e1870030' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#e18700' }}>{dynamicCounts.medium}</div>
                                    <div className="text-xs font-medium" style={{ color: '#e18700' }}>MEDIUM RISK</div>
                                    <div className="text-gray-500 text-[10px]">
                                        {sliderConfig.unit} &gt; {threshold.toFixed(currentScheme === 'MDM' ? 2 : 1)}
                                    </div>
                                </div>
                                <div className="rounded-lg p-3" style={{ backgroundColor: '#00831915', border: '1px solid #00831930' }}>
                                    <div className="text-2xl font-bold" style={{ color: '#008319' }}>{dynamicCounts.low}</div>
                                    <div className="text-xs font-medium" style={{ color: '#008319' }}>LOW RISK</div>
                                    <div className="text-gray-500 text-[10px]">
                                        {sliderConfig.unit} ≤ {threshold.toFixed(currentScheme === 'MDM' ? 2 : 1)}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-gray-600 text-center">
                                Move the slider to adjust {currentScheme === 'MDM' ? 'school fraud' : 'fraud'} detection sensitivity in real-time.
                                Lower threshold = more sensitive (catches more potential issues, but may have false positives)
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
