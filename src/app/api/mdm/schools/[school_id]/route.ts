import { getBigQueryClient, MDMSchoolDetail, generateMDMReasonsFromFlags } from '@/lib/bigquery';
import { generateMDMGeminiExplanation, mdmFlagsToReasonCodes, getMDMStaticExplanations, DEFAULT_LANGUAGE, type SupportedLanguage } from '@/lib/gemini';
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
  { params }: { params: Promise<{ school_id: string }> }
) {
  try {
    const { school_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const language = validateLanguage(searchParams.get('lang'));

    if (!school_id) {
      return NextResponse.json(
        { success: false, error: 'school_id is required' },
        { status: 400 }
      );
    }

    const bigquery = getBigQueryClient();

    let row: any = null;

    // Try primary query with mdm_fraud_with_explanations + mdm_school_master
    try {
      const query = `
        SELECT
          f.school_id,
          f.school_name,
          f.district,
          f.risk_level,
          f.anomaly_score,
          f.flag_ghost_meals,
          f.flag_ingredient_inflation,
          f.flag_fund_overclaim,
          f.flag_cook_anomaly,
          f.total_meals_reported,
          s.block,
          s.village,
          s.school_type,
          s.management,
          s.total_enrolled_students,
          s.avg_attendance_rate,
          s.kitchen_type,
          s.cook_count,
          s.last_inspection_score
        FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
        LEFT JOIN \`gfg-fot.lpg_fraud_detection.mdm_school_master\` s
        ON f.school_id = s.school_id
        WHERE f.school_id = @school_id
      `;

      const [job] = await bigquery.createQueryJob({
        query,
        params: { school_id: parseInt(school_id, 10) }
      });
      const [rows] = await job.getQueryResults();

      if (rows.length > 0) {
        row = rows[0];
      }
    } catch (_primaryError) {
      console.log('Primary MDM school detail query failed, trying without school master join...');
    }

    if (!row) {
      try {
        const fallbackQuery = `
          SELECT
            f.school_id,
            f.school_name,
            f.district,
            f.risk_level,
            f.anomaly_score,
            f.flag_ghost_meals,
            f.flag_ingredient_inflation,
            f.flag_fund_overclaim,
            f.flag_cook_anomaly,
            f.total_meals_reported,
            NULL as block,
            NULL as village,
            NULL as school_type,
            NULL as management,
            NULL as total_enrolled_students,
            NULL as avg_attendance_rate,
            NULL as kitchen_type,
            NULL as cook_count,
            NULL as last_inspection_score
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          WHERE f.school_id = @school_id
        `;

        const [fallbackJob] = await bigquery.createQueryJob({
          query: fallbackQuery,
          params: { school_id: parseInt(school_id, 10) }
        });
        const [fallbackRows] = await fallbackJob.getQueryResults();

        if (fallbackRows.length > 0) {
          row = fallbackRows[0];
        }
      } catch (_fallbackError) {
        console.log('Fallback MDM school detail query also failed');
      }
    }

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'School not found' },
        { status: 404 }
      );
    }

    const flags = {
      ghost_meals: Boolean(row.flag_ghost_meals),
      ingredient_inflation: Boolean(row.flag_ingredient_inflation),
      fund_overclaim: Boolean(row.flag_fund_overclaim),
      cook_anomaly: Boolean(row.flag_cook_anomaly),
    };

    const reasons = generateMDMReasonsFromFlags(flags);

    const reasonCodes = mdmFlagsToReasonCodes({
      flag_ghost_meals: flags.ghost_meals,
      flag_ingredient_inflation: flags.ingredient_inflation,
      flag_fund_overclaim: flags.fund_overclaim,
      flag_cook_anomaly: flags.cook_anomaly,
    });

    const riskBreakdown = calculateMDMRiskBreakdown(flags, Number(row.anomaly_score) || 0);

    let geminiExplanation: string;
    try {
      geminiExplanation = await generateMDMGeminiExplanation(
        row.risk_level,
        reasonCodes,
        language
      );
    } catch (geminiError) {
      console.error('MDM Gemini explanation failed:', geminiError instanceof Error ? geminiError.message : 'Unknown error');
      geminiExplanation = getMDMStaticExplanations(reasonCodes, language).join(' ');
    }

    const result: MDMSchoolDetail & { risk_breakdown: MDMRiskBreakdown } = {
      school_id: Number(row.school_id),
      school_name: row.school_name || 'Unknown School',
      district: row.district || 'Unknown',
      block: row.block || 'Unknown',
      village: row.village || 'Unknown',
      school_type: row.school_type || 'Unknown',
      management: row.management || 'Unknown',
      total_enrolled_students: Number(row.total_enrolled_students) || 0,
      avg_attendance_rate: Number(row.avg_attendance_rate) || 0,
      kitchen_type: row.kitchen_type || 'Unknown',
      cook_count: Number(row.cook_count) || 0,
      last_inspection_score: Number(row.last_inspection_score) || 0,
      risk_level: row.risk_level || 'UNKNOWN',
      anomaly_score: Number(row.anomaly_score) || 0,
      flags,
      reasons,
      gemini_explanation: geminiExplanation,
      risk_breakdown: riskBreakdown,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('MDM School Detail Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// MDM Risk Breakdown Calculator
interface MDMRiskBreakdown {
  total_risk_score: number;
  factors: {
    factor: string;
    contribution: number;
    percentage: number;
    description: string;
  }[];
}

function calculateMDMRiskBreakdown(
  flags: {
    ghost_meals: boolean;
    ingredient_inflation: boolean;
    fund_overclaim: boolean;
    cook_anomaly: boolean;
  },
  anomalyScore: number
): MDMRiskBreakdown {
  // Weight assignments for MDM fraud indicators
  const weights = {
    ghost_meals: 35,           // 35% - highest risk indicator
    ingredient_inflation: 25,  // 25%
    fund_overclaim: 25,        // 25%
    cook_anomaly: 10,          // 10%
    anomaly_contribution: 5,   // 5% from raw score
  };

  const factors: MDMRiskBreakdown['factors'] = [];
  let totalScore = 0;

  if (flags.ghost_meals) {
    factors.push({
      factor: 'Ghost Meals',
      contribution: weights.ghost_meals,
      percentage: 0,
      description: 'Students reported served > actual attendance (potential fund misuse)'
    });
    totalScore += weights.ghost_meals;
  }

  if (flags.ingredient_inflation) {
    factors.push({
      factor: 'Ingredient Inflation',
      contribution: weights.ingredient_inflation,
      percentage: 0,
      description: 'Ingredient usage exceeds MDM norms for student count'
    });
    totalScore += weights.ingredient_inflation;
  }

  if (flags.fund_overclaim) {
    factors.push({
      factor: 'Fund Overclaim',
      contribution: weights.fund_overclaim,
      percentage: 0,
      description: 'Claimed funds significantly higher than expected'
    });
    totalScore += weights.fund_overclaim;
  }

  if (flags.cook_anomaly) {
    factors.push({
      factor: 'Cook Anomaly',
      contribution: weights.cook_anomaly,
      percentage: 0,
      description: 'Meal served without cook present - operational irregularity'
    });
    totalScore += weights.cook_anomaly;
  }

  // Anomaly score contribution (normalized)
  const anomalyContribution = Math.min(anomalyScore * 0.5, weights.anomaly_contribution);
  if (anomalyContribution > 0) {
    factors.push({
      factor: 'Anomaly Score',
      contribution: anomalyContribution,
      percentage: 0,
      description: 'ML model reconstruction error indicating deviation from norms'
    });
    totalScore += anomalyContribution;
  }

  // Calculate percentages
  factors.forEach(f => {
    f.percentage = totalScore > 0 ? Math.round((f.contribution / totalScore) * 100) : 0;
  });

  return {
    total_risk_score: Math.round(totalScore),
    factors: factors.sort((a, b) => b.contribution - a.contribution)
  };
}
