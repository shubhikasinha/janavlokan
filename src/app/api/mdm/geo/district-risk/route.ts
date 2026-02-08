import { getMDMService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/mdm/geo/district-risk
 * Returns district-level risk data for MDM heatmap
 * Uses caching via MDMService
 * 
 * Transforms MDM response to match IndiaMap expected format
 * (residence_district instead of district)
 */
export async function GET() {
    try {
        const mdmService = getMDMService();
        const districtRisk = await mdmService.getDistrictRisk();

        // Transform to match IndiaMap expected interface
        // IndiaMap expects: { residence_district, anomaly_count }
        const transformed = districtRisk.map(d => ({
            residence_district: d.district,
            anomaly_count: d.anomaly_count,
            total_schools: d.total_schools,
            high_risk_schools: d.high_risk_schools,
        }));

        return NextResponse.json(transformed);
    } catch (error) {
        console.error('MDM District Risk Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
