import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

// Identifies suspicious patterns in Mid Day Meal scheme like:
// 1. Districts with high concentration of high-risk schools
// 2. Clusters of schools with similar anomaly patterns (potential collusion)
// 3. Schools with multiple flagged indicators

interface MDMDistrictRiskProfile {
  district: string;
  total_schools: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  high_risk_percentage: number;
  avg_anomaly_score: number;
  total_meals_reported: number;
  risk_score: number;  // Composite score for ranking
}

interface MDMSchoolCluster {
  school_id: number;
  school_name: string;
  district: string;
  flag_count: number;
  flags: string[];
  anomaly_score: number;
  total_meals_reported: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type') || 'district_risk';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const minHighRisk = Number(searchParams.get('min_high_risk')) || 2;

    const bigquery = getBigQueryClient();

    if (analysisType === 'district_risk') {
      // Analysis 1: Find districts with disproportionate high-risk schools
      let results: MDMDistrictRiskProfile[] = [];

      try {
        const query = `
          WITH district_stats AS (
            SELECT 
              f.district,
              COUNT(DISTINCT f.school_id) as total_schools,
              COUNTIF(f.risk_level = 'HIGH') as high_risk_count,
              COUNTIF(f.risk_level = 'MEDIUM') as medium_risk_count,
              COUNTIF(f.risk_level = 'LOW') as low_risk_count,
              AVG(f.anomaly_score) as avg_anomaly_score,
              SUM(f.total_meals_reported) as total_meals_reported
            FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
            WHERE f.district IS NOT NULL
            GROUP BY f.district
            HAVING high_risk_count >= @min_high_risk
          )
          SELECT 
            district,
            total_schools,
            high_risk_count,
            medium_risk_count,
            low_risk_count,
            ROUND(SAFE_DIVIDE(high_risk_count, total_schools) * 100, 2) as high_risk_percentage,
            ROUND(avg_anomaly_score, 4) as avg_anomaly_score,
            total_meals_reported,
            -- Composite risk score: weighted combination
            ROUND(
              (SAFE_DIVIDE(high_risk_count, total_schools) * 50) +
              (avg_anomaly_score * 20) +
              (SAFE_DIVIDE(total_meals_reported, 100000) * 5),
              2
            ) as risk_score
          FROM district_stats
          ORDER BY risk_score DESC
          LIMIT @limit
        `;

        const [job] = await bigquery.createQueryJob({
          query,
          params: { limit, min_high_risk: minHighRisk }
        });
        const [rows] = await job.getQueryResults();

        results = rows.map((row) => ({
          district: row.district,
          total_schools: Number(row.total_schools) || 0,
          high_risk_count: Number(row.high_risk_count) || 0,
          medium_risk_count: Number(row.medium_risk_count) || 0,
          low_risk_count: Number(row.low_risk_count) || 0,
          high_risk_percentage: Number(row.high_risk_percentage) || 0,
          avg_anomaly_score: Number(row.avg_anomaly_score) || 0,
          total_meals_reported: Number(row.total_meals_reported) || 0,
          risk_score: Number(row.risk_score) || 0
        }));
      } catch (_primaryError) {
        console.log('Primary MDM network query failed, using fallback...');

        const fallbackQuery = `
          WITH school_stats AS (
            SELECT 
              s.district,
              d.school_id,
              SUM(d.reported_students_served) as total_meals,
              COALESCE(
                ABS(AVG(d.reported_students_served) - (SELECT AVG(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`)) 
                / NULLIF((SELECT STDDEV(reported_students_served) FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\`), 0),
                0
              ) AS anomaly_score
            FROM \`gfg-fot.lpg_fraud_detection.mdm_daily_record\` d
            LEFT JOIN \`gfg-fot.lpg_fraud_detection.mdm_school_master\` s ON d.school_id = s.school_id
            GROUP BY s.district, d.school_id
          ),
          district_stats AS (
            SELECT 
              COALESCE(district, 'Unknown') AS district,
              COUNT(DISTINCT school_id) as total_schools,
              COUNTIF(anomaly_score > 2) as high_risk_count,
              COUNTIF(anomaly_score > 1 AND anomaly_score <= 2) as medium_risk_count,
              COUNTIF(anomaly_score <= 1) as low_risk_count,
              AVG(anomaly_score) as avg_anomaly_score,
              SUM(total_meals) as total_meals_reported
            FROM school_stats
            GROUP BY district
            HAVING high_risk_count >= @min_high_risk
          )
          SELECT 
            district,
            total_schools,
            high_risk_count,
            medium_risk_count,
            low_risk_count,
            ROUND(SAFE_DIVIDE(high_risk_count, total_schools) * 100, 2) as high_risk_percentage,
            ROUND(avg_anomaly_score, 4) as avg_anomaly_score,
            total_meals_reported,
            ROUND(
              (SAFE_DIVIDE(high_risk_count, total_schools) * 50) +
              (avg_anomaly_score * 20),
              2
            ) as risk_score
          FROM district_stats
          ORDER BY risk_score DESC
          LIMIT @limit
        `;

        const [fallbackJob] = await bigquery.createQueryJob({
          query: fallbackQuery,
          params: { limit, min_high_risk: minHighRisk }
        });
        const [fallbackRows] = await fallbackJob.getQueryResults();

        results = fallbackRows.map((row) => ({
          district: row.district,
          total_schools: Number(row.total_schools) || 0,
          high_risk_count: Number(row.high_risk_count) || 0,
          medium_risk_count: Number(row.medium_risk_count) || 0,
          low_risk_count: Number(row.low_risk_count) || 0,
          high_risk_percentage: Number(row.high_risk_percentage) || 0,
          avg_anomaly_score: Number(row.avg_anomaly_score) || 0,
          total_meals_reported: Number(row.total_meals_reported) || 0,
          risk_score: Number(row.risk_score) || 0
        }));
      }

      return NextResponse.json({
        success: true,
        analysis_type: 'district_risk',
        description: 'Districts ranked by concentration of high-risk schools in MDM scheme',
        data: results,
        insights: generateMDMDistrictInsights(results)
      });

    } else if (analysisType === 'multi_flag_schools') {
      // Analysis 2: Schools with multiple flagged indicators (potential organized fraud)
      let results: MDMSchoolCluster[] = [];

      try {
        const query = `
          SELECT 
            f.school_id,
            f.school_name,
            f.district,
            (CAST(f.flag_ghost_meals AS INT64) + 
             CAST(f.flag_ingredient_inflation AS INT64) + 
             CAST(f.flag_fund_overclaim AS INT64) + 
             CAST(f.flag_cook_anomaly AS INT64)) as flag_count,
            ARRAY_CONCAT(
              IF(f.flag_ghost_meals, ['ghost_meals'], []),
              IF(f.flag_ingredient_inflation, ['ingredient_inflation'], []),
              IF(f.flag_fund_overclaim, ['fund_overclaim'], []),
              IF(f.flag_cook_anomaly, ['cook_anomaly'], [])
            ) as flags,
            f.anomaly_score,
            f.total_meals_reported
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          WHERE (CAST(f.flag_ghost_meals AS INT64) + 
                 CAST(f.flag_ingredient_inflation AS INT64) + 
                 CAST(f.flag_fund_overclaim AS INT64) + 
                 CAST(f.flag_cook_anomaly AS INT64)) >= 2
          ORDER BY flag_count DESC, f.anomaly_score DESC
          LIMIT @limit
        `;

        const [job] = await bigquery.createQueryJob({ query, params: { limit } });
        const [rows] = await job.getQueryResults();

        results = rows.map((row) => ({
          school_id: Number(row.school_id),
          school_name: row.school_name || 'Unknown School',
          district: row.district || 'Unknown',
          flag_count: Number(row.flag_count),
          flags: row.flags || [],
          anomaly_score: Number(row.anomaly_score) || 0,
          total_meals_reported: Number(row.total_meals_reported) || 0
        }));
      } catch (_error) {
        console.log('Multi-flag schools query not available');
      }

      return NextResponse.json({
        success: true,
        analysis_type: 'multi_flag_schools',
        description: 'Schools with multiple fraud indicators - potential organized irregularities',
        data: results,
        insights: generateMultiFlagInsights(results)
      });

    } else if (analysisType === 'ghost_meal_clusters') {
      // Analysis 3: Schools with ghost meal patterns (reported > attendance)
      let results: any[] = [];

      try {
        const query = `
          SELECT 
            f.school_id,
            f.school_name,
            f.district,
            f.anomaly_score,
            f.total_meals_reported,
            f.flag_ghost_meals,
            f.flag_fund_overclaim
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          WHERE f.flag_ghost_meals = TRUE
          ORDER BY f.anomaly_score DESC
          LIMIT @limit
        `;

        const [job] = await bigquery.createQueryJob({ query, params: { limit } });
        const [rows] = await job.getQueryResults();

        results = rows.map((row) => ({
          school_id: Number(row.school_id),
          school_name: row.school_name,
          district: row.district,
          anomaly_score: Number(row.anomaly_score)?.toFixed(4),
          total_meals_reported: Number(row.total_meals_reported),
          combined_fund_fraud: Boolean(row.flag_fund_overclaim)
        }));
      } catch (_error) {
        console.log('Ghost meal clusters query not available');
      }

      return NextResponse.json({
        success: true,
        analysis_type: 'ghost_meal_clusters',
        description: 'Schools with ghost meal patterns (students served > actual attendance)',
        data: results
      });

    } else if (analysisType === 'summary') {
      // Summary statistics for MDM network analysis
      let summaryData: any = null;

      try {
        const query = `
          SELECT 
            COUNT(DISTINCT f.district) as total_districts,
            COUNT(DISTINCT f.school_id) as total_schools,
            COUNT(DISTINCT CASE WHEN f.risk_level = 'HIGH' THEN f.district END) as districts_with_high_risk,
            COUNTIF(f.flag_ghost_meals) as ghost_meal_cases,
            COUNTIF(f.flag_ingredient_inflation) as ingredient_inflation_cases,
            COUNTIF(f.flag_fund_overclaim) as fund_overclaim_cases,
            COUNTIF(f.flag_cook_anomaly) as cook_anomaly_cases,
            ROUND(AVG(CASE WHEN f.risk_level = 'HIGH' THEN f.anomaly_score END), 4) as avg_high_risk_score,
            SUM(f.total_meals_reported) as total_meals_reported
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
        `;

        const [job] = await bigquery.createQueryJob({ query });
        const [rows] = await job.getQueryResults();

        if (rows[0]) {
          summaryData = {
            total_districts: Number(rows[0].total_districts) || 0,
            total_schools: Number(rows[0].total_schools) || 0,
            districts_with_high_risk: Number(rows[0].districts_with_high_risk) || 0,
            ghost_meal_cases: Number(rows[0].ghost_meal_cases) || 0,
            ingredient_inflation_cases: Number(rows[0].ingredient_inflation_cases) || 0,
            fund_overclaim_cases: Number(rows[0].fund_overclaim_cases) || 0,
            cook_anomaly_cases: Number(rows[0].cook_anomaly_cases) || 0,
            avg_high_risk_score: Number(rows[0].avg_high_risk_score) || 0,
            total_meals_reported: Number(rows[0].total_meals_reported) || 0
          };
        }
      } catch (_error) {
        console.log('MDM summary query not available');
      }

      return NextResponse.json({
        success: true,
        analysis_type: 'summary',
        data: summaryData
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid analysis type. Use: district_risk, multi_flag_schools, ghost_meal_clusters, or summary' },
      { status: 400 }
    );

  } catch (error) {
    console.error('MDM Network Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Generate human-readable insights from district risk data
function generateMDMDistrictInsights(profiles: MDMDistrictRiskProfile[]): string[] {
  const insights: string[] = [];

  if (profiles.length === 0) {
    return ['No suspicious district-level patterns detected in MDM data'];
  }

  // Top risky district
  const topDistrict = profiles[0];
  insights.push(
    `ALERT: District ${topDistrict.district} has ${topDistrict.high_risk_percentage.toFixed(1)}% high-risk schools (${topDistrict.high_risk_count}/${topDistrict.total_schools})`
  );

  // High concentration districts
  const highConcentration = profiles.filter(p => p.high_risk_percentage > 40);
  if (highConcentration.length > 0) {
    insights.push(
      `WARNING: ${highConcentration.length} districts have >40% high-risk schools - physical inspections recommended`
    );
  }

  // Total meals at risk
  const totalMealsAtRisk = profiles.reduce((sum, p) => sum + p.total_meals_reported, 0);
  insights.push(
    `${totalMealsAtRisk.toLocaleString()} total meals reported across flagged districts`
  );

  // Average stats
  const avgHighRisk = profiles.reduce((sum, p) => sum + p.high_risk_count, 0) / profiles.length;
  insights.push(
    `Average high-risk schools per flagged district: ${avgHighRisk.toFixed(1)}`
  );

  return insights;
}

// Generate insights for multi-flag schools
function generateMultiFlagInsights(schools: MDMSchoolCluster[]): string[] {
  const insights: string[] = [];

  if (schools.length === 0) {
    return ['No schools with multiple fraud indicators detected'];
  }

  // Count by flag combinations
  const ghostAndFund = schools.filter(s =>
    s.flags.includes('ghost_meals') && s.flags.includes('fund_overclaim')
  ).length;

  if (ghostAndFund > 0) {
    insights.push(
      `CRITICAL: ${ghostAndFund} schools have BOTH ghost meals AND fund overclaim - highest fraud risk`
    );
  }

  // Schools with 3+ flags
  const multipleFlags = schools.filter(s => s.flag_count >= 3);
  if (multipleFlags.length > 0) {
    insights.push(
      `${multipleFlags.length} schools have 3 or more fraud indicators - immediate investigation needed`
    );
  }

  // District distribution
  const districts = [...new Set(schools.map(s => s.district))];
  insights.push(
    `Multi-flag schools spread across ${districts.length} districts: ${districts.slice(0, 5).join(', ')}${districts.length > 5 ? '...' : ''}`
  );

  return insights;
}
