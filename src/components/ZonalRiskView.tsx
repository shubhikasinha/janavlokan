'use client';

import { useEffect, useState, useMemo } from 'react';
import { useScheme } from '@/context/SchemeContext';

interface DistrictRisk {
    residence_district: string;
    anomaly_count: number;
}

interface ZoneData {
    name: string;
    districts: string[];
    districtCount: number;
    flaggedCases: number;
    riskPercentage: number;
}

// Zone definitions - mapping districts to zones
// These are based on common regional groupings
const ZONE_DEFINITIONS: Record<string, string[]> = {
    'Eastern Region': [
        'Patna', 'Bhagalpur', 'Gaya', 'Muzaffarpur', 'Purnia', 'Darbhanga',
        'Kolkata', 'Guwahati', 'Ranchi', 'Bhubaneswar', 'Cuttack',
        'Begusarai', 'Nalanda', 'Samastipur', 'Katihar', 'Munger'
    ],
    'Central Region': [
        'Lucknow', 'Kanpur', 'Varanasi', 'Prayagraj', 'Agra', 'Gorakhpur',
        'Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Raipur',
        'Meerut', 'Aligarh', 'Bareilly', 'Moradabad'
    ],
    'Western Region': [
        'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad',
        'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Jaipur',
        'Jodhpur', 'Udaipur', 'Kota'
    ],
    'Southern Region': [
        'Chennai', 'Bangalore', 'Hyderabad', 'Coimbatore', 'Madurai',
        'Visakhapatnam', 'Vijayawada', 'Kochi', 'Thiruvananthapuram',
        'Mysore', 'Mangalore'
    ],
};

// Get risk level color based on percentage
function getRiskColor(percentage: number): { bg: string; border: string; text: string; dot: string } {
    if (percentage >= 70) {
        return {
            bg: 'bg-red-50',
            border: 'border-[#830f00]',
            text: 'text-[#830f00]',
            dot: 'bg-[#830f00]'
        };
    }
    if (percentage >= 50) {
        return {
            bg: 'bg-amber-50',
            border: 'border-amber-500',
            text: 'text-amber-600',
            dot: 'bg-amber-500'
        };
    }
    return {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-600',
        dot: 'bg-green-500'
    };
}

// Get bar color for chart
function getBarColor(percentage: number): string {
    if (percentage >= 70) return '#830f00';
    if (percentage >= 50) return '#d4a574';
    return '#22c55e';
}

export default function ZonalRiskView() {
    const { currentScheme, schemeConfig } = useScheme();
    const [districtData, setDistrictData] = useState<DistrictRisk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiEndpoint = currentScheme === 'MDM' ? '/api/mdm/geo/district-risk' : '/api/geo/district-risk';

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(apiEndpoint);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setDistrictData(data);
                } else if (data.success === false) {
                    throw new Error(data.error || 'Failed to load data');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [currentScheme, apiEndpoint]);

    // Aggregate district data into zones
    const zoneData = useMemo(() => {
        const zones: ZoneData[] = [];
        const totalFlagged = districtData.reduce((sum, d) => sum + d.anomaly_count, 0);
        const maxFlagged = Math.max(...districtData.map(d => d.anomaly_count), 1);

        for (const [zoneName, zoneDistricts] of Object.entries(ZONE_DEFINITIONS)) {
            // Find matching districts in our data
            const matchedDistricts = districtData.filter(d =>
                zoneDistricts.some(zd =>
                    d.residence_district.toLowerCase().includes(zd.toLowerCase()) ||
                    zd.toLowerCase().includes(d.residence_district.toLowerCase())
                )
            );

            const flaggedCases = matchedDistricts.reduce((sum, d) => sum + d.anomaly_count, 0);
            const districtCount = matchedDistricts.length || zoneDistricts.length;

            // Calculate risk percentage relative to max zone
            const riskPercentage = totalFlagged > 0
                ? Math.round((flaggedCases / totalFlagged) * 100)
                : 0;

            zones.push({
                name: zoneName,
                districts: matchedDistricts.map(d => d.residence_district),
                districtCount,
                flaggedCases,
                riskPercentage: Math.min(riskPercentage * 2, 100), // Scale for visibility
            });
        }

        // Sort by flagged cases descending
        return zones.sort((a, b) => b.flaggedCases - a.flaggedCases);
    }, [districtData]);

    // Max flagged for bar chart scaling
    const maxFlagged = Math.max(...zoneData.map(z => z.flaggedCases), 1);

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-8">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                    <span className="ml-3 text-gray-500">Loading zonal data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-5 gap-6">
            {/* Zone Cards - Left Side */}
            <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-heading font-semibold text-gray-900">
                            Zonal Risk Map
                        </h3>
                        <p className="text-sm text-gray-500">
                            Regional aggregation of {schemeConfig.entityNamePlural.toLowerCase()} flagged for review
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {zoneData.map((zone) => {
                        const colors = getRiskColor(zone.riskPercentage);
                        return (
                            <div
                                key={zone.name}
                                className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-4 relative`}
                            >
                                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${colors.dot}`}></div>
                                <h4 className="font-heading font-semibold text-gray-900 mb-2">
                                    {zone.name}
                                </h4>
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-600">
                                        Districts: <span className="font-medium text-gray-900">{zone.districtCount}</span>
                                    </p>
                                    <p className="text-gray-600">
                                        Flagged Cases: <span className="font-medium text-gray-900">{zone.flaggedCases.toLocaleString()}</span>
                                    </p>
                                    <p className="text-gray-600">
                                        Risk Level: <span className={`font-semibold ${colors.text}`}>{zone.riskPercentage}%</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-600 pt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#830f00]"></div>
                        <span>High Risk (≥70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span>Medium Risk (50-70%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Low Risk (&lt;50%)</span>
                    </div>
                </div>
            </div>

            {/* Right Side - Charts */}
            <div className="lg:col-span-2 space-y-6">
                {/* Zone Comparison Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="font-heading font-semibold text-gray-900 mb-4">Zone Comparison</h4>
                    <div className="space-y-3">
                        {zoneData.map((zone) => (
                            <div key={zone.name} className="flex items-center gap-3">
                                <span className="text-xs text-gray-600 w-24 truncate">{zone.name.replace(' Region', '')}</span>
                                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                                    <div
                                        className="h-full rounded transition-all duration-500"
                                        style={{
                                            width: `${(zone.flaggedCases / maxFlagged) * 100}%`,
                                            backgroundColor: getBarColor(zone.riskPercentage)
                                        }}
                                    ></div>
                                </div>
                                <span className="text-xs font-medium text-gray-700 w-12 text-right">
                                    {zone.flaggedCases.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* District Coverage */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="font-heading font-semibold text-gray-900 mb-4">District Coverage</h4>
                    <div className="space-y-3">
                        {zoneData.map((zone) => {
                            const maxDistricts = Math.max(...zoneData.map(z => z.districtCount), 1);
                            return (
                                <div key={zone.name} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{zone.name.replace(' Region', '')}</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-gray-100 rounded overflow-hidden">
                                            <div
                                                className="h-full bg-primary rounded"
                                                style={{ width: `${(zone.districtCount / maxDistricts) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 w-20 text-right">
                                            {zone.districtCount} districts
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-heading font-bold text-primary">
                                {districtData.length}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Districts Monitored</p>
                        </div>
                        <div>
                            <p className="text-2xl font-heading font-bold text-[#830f00]">
                                {districtData.reduce((sum, d) => sum + d.anomaly_count, 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Flagged</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
