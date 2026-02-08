import { getMDMService, getAuditService } from '@/lib/services';
import { SupportedLanguage } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{
    school_id: string;
  }>;
}

/**
 * GET /api/mdm/schools/[school_id]
 * Returns detailed school information with Gemini explanation
 * Uses caching via MDMService
 * 
 * Query params:
 * - lang: 'en' | 'hi' | 'hinglish' (default 'en')
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { school_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const language = (searchParams.get('lang') || 'en') as SupportedLanguage;

    const schoolIdNum = Number(school_id);
    if (isNaN(schoolIdNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    const mdmService = getMDMService();
    const detail = await mdmService.getSchoolById(schoolIdNum, language);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    // Log the view for audit
    try {
      const auditService = getAuditService();
      await auditService.logPredictionView(school_id, 'MDM');
    } catch {
      console.log('[API] Audit logging skipped');
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('MDM School Detail Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
