import { getBeneficiaryService } from '@/lib/services';
import { NextResponse } from 'next/server';

/**
 * GET /api/geo/district-risk
 * Returns district-level risk data for LPG heatmap
 * Uses caching via BeneficiaryService
 */
export async function GET() {
    try {
        const beneficiaryService = getBeneficiaryService();
        const districtRisk = await beneficiaryService.getDistrictRisk();

        return NextResponse.json(districtRisk);
    } catch (error) {
        console.error('District Risk Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
