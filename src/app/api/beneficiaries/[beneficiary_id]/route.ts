import { getBeneficiaryService, getAuditService } from '@/lib/services';
import { SupportedLanguage } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    beneficiary_id: string;
  }>;
}

/**
 * GET /api/beneficiaries/[beneficiary_id]
 * Returns detailed beneficiary information with Gemini explanation
 * Uses caching via BeneficiaryService
 * 
 * Query params:
 * - lang: 'en' | 'hi' | 'hinglish' (default 'en')
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { beneficiary_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const language = (searchParams.get('lang') || 'en') as SupportedLanguage;

    const beneficiaryService = getBeneficiaryService();
    const detail = await beneficiaryService.getById(beneficiary_id, language);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    // Log the view for audit
    try {
      const auditService = getAuditService();
      await auditService.logPredictionView(beneficiary_id, 'LPG');
    } catch {
      // Don't fail the request if audit logging fails
      console.log('[API] Audit logging skipped');
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('Beneficiary Detail Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
