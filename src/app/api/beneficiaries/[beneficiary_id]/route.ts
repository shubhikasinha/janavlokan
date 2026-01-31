import { getBigQueryClient, BeneficiaryDetail, generateReasonsFromFlags } from '@/lib/bigquery';
import { generateGeminiExplanation, flagsToReasonCodes, getStaticExplanations, DEFAULT_LANGUAGE, type SupportedLanguage } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

// Allowlist for valid language codes
const ALLOWED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'hi', 'hinglish'] as const;

function validateLanguage(lang: string | null): SupportedLanguage {
  if (lang && ALLOWED_LANGUAGES.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ beneficiary_id: string }> }
) {
  try {
    const { beneficiary_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const language = validateLanguage(searchParams.get('lang'));

    if (!beneficiary_id) {
      return NextResponse.json(
        { success: false, error: 'beneficiary_id is required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();

    // Get all data from fraud_with_explanations (single source of truth)
    const query = `
      SELECT
        beneficiary_id,
        risk_level,
        mean_squared_error,
        flag_high_recent_activity,
        flag_multiple_dealers,
        flag_cross_district,
        flag_high_lifetime_usage
      FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
      WHERE beneficiary_id = @beneficiary_id
    `;

    const [job] = await bigquery.createQueryJob({ 
      query, 
      params: { beneficiary_id } 
    });
    const [rows] = await job.getQueryResults();

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Beneficiary not found' },
        { status: 404 }
      );
    }

    const row = rows[0];
    
    // Extract flags (deterministic - from BigQuery)
    const flags = {
      high_recent_activity: Boolean(row.flag_high_recent_activity),
      multiple_dealers: Boolean(row.flag_multiple_dealers),
      cross_district: Boolean(row.flag_cross_district),
      high_lifetime_usage: Boolean(row.flag_high_lifetime_usage),
    };

    // Generate deterministic reasons from flags
    const reasons = generateReasonsFromFlags(flags);

    // Generate AI-polished explanation via Gemini (optional, with fallback)
    const reasonCodes = flagsToReasonCodes({
      flag_high_recent_activity: flags.high_recent_activity,
      flag_multiple_dealers: flags.multiple_dealers,
      flag_cross_district: flags.cross_district,
      flag_high_lifetime_usage: flags.high_lifetime_usage,
    });
    
    // ============================================
    // NEW: Calculate Risk Breakdown (Explainability)
    // Shows percentage contribution of each flag to risk
    // ============================================
    const riskBreakdown = calculateRiskBreakdown(flags, Number(row.mean_squared_error) || 0);
    
    // Wrap Gemini call in try-catch to handle failures/timeouts gracefully
    let geminiExplanation: string;
    try {
      geminiExplanation = await generateGeminiExplanation(
        row.risk_level,
        reasonCodes,
        language
      );
    } catch (geminiError) {
      // Log error but don't crash the request - use deterministic fallback
      console.error('Gemini explanation failed:', geminiError instanceof Error ? geminiError.message : 'Unknown error');
      // Fallback: use static explanations derived from reasonCodes
      geminiExplanation = getStaticExplanations(reasonCodes, language).join(' ');
    }

    const result: BeneficiaryDetail & { risk_breakdown: RiskBreakdown } = {
      beneficiary_id: row.beneficiary_id,
      risk_level: row.risk_level || 'UNKNOWN',
      mean_squared_error: Number(row.mean_squared_error) || 0,
      flags,
      reasons,
      gemini_explanation: geminiExplanation,
      risk_breakdown: riskBreakdown,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Beneficiary Detail Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// ============================================
// Risk Breakdown Calculator (SHAP-like values)
// ============================================
interface RiskBreakdown {
  total_risk_score: number;
  factors: {
    factor: string;
    contribution: number;
    percentage: number;
    description: string;
  }[];
}

function calculateRiskBreakdown(
  flags: {
    high_recent_activity: boolean;
    multiple_dealers: boolean;
    cross_district: boolean;
    high_lifetime_usage: boolean;
  },
  mse: number
): RiskBreakdown {
  // Weight assignments (simulated SHAP values)
  // In a real system, these would come from model interpretation
  const weights = {
    high_recent_activity: 25,   // 25% weight
    multiple_dealers: 20,       // 20% weight
    cross_district: 30,         // 30% weight - highest risk indicator
    high_lifetime_usage: 15,    // 15% weight
    mse_contribution: 10,       // 10% from raw MSE
  };

  const factors: RiskBreakdown['factors'] = [];
  let totalScore = 0;

  // Calculate each factor's contribution
  if (flags.high_recent_activity) {
    factors.push({
      factor: 'High Recent Activity',
      contribution: weights.high_recent_activity,
      percentage: 0, // Will calculate after
      description: 'Unusually high transaction frequency in last 6 months'
    });
    totalScore += weights.high_recent_activity;
  }

  if (flags.multiple_dealers) {
    factors.push({
      factor: 'Multiple Dealers',
      contribution: weights.multiple_dealers,
      percentage: 0,
      description: 'Transactions with 2+ different dealers'
    });
    totalScore += weights.multiple_dealers;
  }

  if (flags.cross_district) {
    factors.push({
      factor: 'Cross District',
      contribution: weights.cross_district,
      percentage: 0,
      description: 'Transactions across multiple districts (potential diversion)'
    });
    totalScore += weights.cross_district;
  }

  if (flags.high_lifetime_usage) {
    factors.push({
      factor: 'High Lifetime Usage',
      contribution: weights.high_lifetime_usage,
      percentage: 0,
      description: 'Total usage exceeds 95th percentile of all beneficiaries'
    });
    totalScore += weights.high_lifetime_usage;
  }

  // MSE contribution (normalized)
  const mseContribution = Math.min(mse * 0.5, weights.mse_contribution);
  if (mseContribution > 0) {
    factors.push({
      factor: 'Anomaly Score (MSE)',
      contribution: Math.round(mseContribution * 10) / 10,
      percentage: 0,
      description: 'Deviation from normal behavior pattern'
    });
    totalScore += mseContribution;
  }

  // Calculate percentages
  factors.forEach(f => {
    f.percentage = totalScore > 0 ? Math.round((f.contribution / totalScore) * 100) : 0;
  });

  // Sort by contribution (highest first)
  factors.sort((a, b) => b.contribution - a.contribution);

  return {
    total_risk_score: Math.round(totalScore),
    factors
  };
}
