import { getBeneficiaryService } from '@/lib/services';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/beneficiaries/high-risk
 * Returns high-risk beneficiaries list
 * Uses caching via BeneficiaryService
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 * - risk_level: 'HIGH' | 'MEDIUM' | 'LOW' (optional filter)
 * - threshold: number (for dynamic mode)
 * - dynamic: 'true' (use dynamic threshold calculation)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const riskLevel = searchParams.get('risk_level') || undefined;
    const threshold = Number(searchParams.get('threshold')) || 0;
    const useDynamic = searchParams.get('dynamic') === 'true';

    const beneficiaryService = getBeneficiaryService();
    const beneficiaries = await beneficiaryService.getHighRisk({
      limit,
      riskLevel,
      threshold,
      useDynamic,
    });

    return NextResponse.json(beneficiaries);
  } catch (error) {
    console.error('High-Risk Beneficiaries Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
