import { getMDMService } from '@/lib/services';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/mdm/schools/high-risk
 * Returns high-risk schools list
 * Uses caching via MDMService
 * 
 * Query params:
 * - limit: number (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    const mdmService = getMDMService();
    const schools = await mdmService.getHighRiskSchools(limit);

    return NextResponse.json(schools);
  } catch (error) {
    console.error('MDM High-Risk Schools Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
