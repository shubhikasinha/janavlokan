import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

// Network/Collusion Analysis API
// 1. Dealers with high concentration of high-risk beneficiaries
// 2. Groups of beneficiaries sharing the same dealer with anomalies
// 3. Cross-district transaction patterns

interface DealerRiskProfile {
  dealer_id: string;
  total_beneficiaries: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  high_risk_percentage: number;
  avg_mse: number;
  districts_served: number;
  risk_score: number;  // Composite score for ranking
}

// Future: Collusion cluster detection
// interface CollusionCluster {
//   cluster_id: string;
//   dealer_ids: string[];
//   beneficiary_count: number;
//   common_patterns: string[];
//   risk_level: string;
// }

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type') || 'dealer_risk';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const minHighRisk = Number(searchParams.get('min_high_risk')) || 3;

    const bigquery = getBigQueryClient();

    if (analysisType === 'dealer_risk') {
      // Analysis 1: Find dealers with disproportionate high-risk beneficiaries
      const query = `
        WITH dealer_stats AS (
          SELECT 
            b.dealer_id,
            COUNT(DISTINCT b.beneficiary_id) as total_beneficiaries,
            COUNTIF(f.risk_level = 'HIGH') as high_risk_count,
            COUNTIF(f.risk_level = 'MEDIUM') as medium_risk_count,
            COUNTIF(f.risk_level = 'LOW') as low_risk_count,
            AVG(f.mean_squared_error) as avg_mse,
            COUNT(DISTINCT b.district) as districts_served
          FROM \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
          LEFT JOIN \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
            ON b.beneficiary_id = f.beneficiary_id
          WHERE b.dealer_id IS NOT NULL
          GROUP BY b.dealer_id
          HAVING high_risk_count >= @min_high_risk
        )
        SELECT 
          dealer_id,
          total_beneficiaries,
          high_risk_count,
          medium_risk_count,
          low_risk_count,
          ROUND(SAFE_DIVIDE(high_risk_count, total_beneficiaries) * 100, 2) as high_risk_percentage,
          ROUND(avg_mse, 4) as avg_mse,
          districts_served,
          -- Composite risk score: weighted combination
          ROUND(
            (SAFE_DIVIDE(high_risk_count, total_beneficiaries) * 50) +
            (avg_mse * 2) +
            (districts_served * 5),
            2
          ) as risk_score
        FROM dealer_stats
        ORDER BY risk_score DESC
        LIMIT @limit
      `;

      const [job] = await bigquery.createQueryJob({
        query,
        params: { limit, min_high_risk: minHighRisk }
      });
      const [rows] = await job.getQueryResults();

      const dealerProfiles: DealerRiskProfile[] = rows.map((row) => ({
        dealer_id: row.dealer_id,
        total_beneficiaries: Number(row.total_beneficiaries) || 0,
        high_risk_count: Number(row.high_risk_count) || 0,
        medium_risk_count: Number(row.medium_risk_count) || 0,
        low_risk_count: Number(row.low_risk_count) || 0,
        high_risk_percentage: Number(row.high_risk_percentage) || 0,
        avg_mse: Number(row.avg_mse) || 0,
        districts_served: Number(row.districts_served) || 0,
        risk_score: Number(row.risk_score) || 0
      }));

      return NextResponse.json({
        success: true,
        analysis_type: 'dealer_risk',
        description: 'Dealers ranked by concentration of high-risk beneficiaries',
        data: dealerProfiles,
        insights: generateDealerInsights(dealerProfiles)
      });

    } else if (analysisType === 'cross_district') {
      // Analysis 2: Cross-district transaction patterns
      const query = `
        SELECT 
          b.dealer_id,
          b.district as beneficiary_district,
          COUNT(DISTINCT b.beneficiary_id) as beneficiary_count,
          AVG(f.mean_squared_error) as avg_mse,
          COUNTIF(f.risk_level = 'HIGH') as high_risk_count
        FROM \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
        JOIN \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
          ON b.beneficiary_id = f.beneficiary_id
        WHERE f.flag_cross_district = TRUE
        GROUP BY b.dealer_id, b.district
        HAVING beneficiary_count >= 2
        ORDER BY high_risk_count DESC, avg_mse DESC
        LIMIT @limit
      `;

      const [job] = await bigquery.createQueryJob({ query, params: { limit } });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'cross_district',
        description: 'Cross-district transaction patterns (potential diversion)',
        data: rows.map((row) => ({
          dealer_id: row.dealer_id,
          beneficiary_district: row.beneficiary_district,
          beneficiary_count: Number(row.beneficiary_count),
          avg_mse: Number(row.avg_mse)?.toFixed(4),
          high_risk_count: Number(row.high_risk_count)
        }))
      });

    } else if (analysisType === 'multiple_dealer') {
      // Analysis 3: Beneficiaries using multiple dealers (suspicious behavior)
      const query = `
        SELECT 
          f.beneficiary_id,
          f.risk_level,
          f.mean_squared_error,
          COUNT(DISTINCT b.dealer_id) as dealer_count,
          ARRAY_AGG(DISTINCT b.dealer_id) as dealers
        FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
        JOIN \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
          ON f.beneficiary_id = b.beneficiary_id
        WHERE f.flag_multiple_dealers = TRUE
        GROUP BY f.beneficiary_id, f.risk_level, f.mean_squared_error
        HAVING dealer_count >= 2
        ORDER BY dealer_count DESC, mean_squared_error DESC
        LIMIT @limit
      `;

      const [job] = await bigquery.createQueryJob({ query, params: { limit } });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'multiple_dealer',
        description: 'Beneficiaries transacting with multiple dealers',
        data: rows.map((row) => ({
          beneficiary_id: row.beneficiary_id,
          risk_level: row.risk_level,
          mean_squared_error: Number(row.mean_squared_error)?.toFixed(4),
          dealer_count: Number(row.dealer_count),
          dealers: row.dealers || []
        }))
      });

    } else if (analysisType === 'summary') {
      // Summary statistics for network analysis
      const query = `
        SELECT 
          COUNT(DISTINCT b.dealer_id) as total_dealers,
          COUNT(DISTINCT CASE WHEN f.risk_level = 'HIGH' THEN b.dealer_id END) as dealers_with_high_risk,
          COUNTIF(f.flag_cross_district) as cross_district_cases,
          COUNTIF(f.flag_multiple_dealers) as multiple_dealer_cases,
          ROUND(AVG(CASE WHEN f.risk_level = 'HIGH' THEN f.mean_squared_error END), 4) as avg_high_risk_mse
        FROM \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
        LEFT JOIN \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
          ON b.beneficiary_id = f.beneficiary_id
      `;

      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'summary',
        data: rows[0] ? {
          total_dealers: Number(rows[0].total_dealers) || 0,
          dealers_with_high_risk: Number(rows[0].dealers_with_high_risk) || 0,
          cross_district_cases: Number(rows[0].cross_district_cases) || 0,
          multiple_dealer_cases: Number(rows[0].multiple_dealer_cases) || 0,
          avg_high_risk_mse: Number(rows[0].avg_high_risk_mse) || 0
        } : null
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid analysis type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Network Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Generate human-readable insights from dealer risk data
function generateDealerInsights(profiles: DealerRiskProfile[]): string[] {
  const insights: string[] = [];

  if (profiles.length === 0) {
    return ['No suspicious dealer patterns detected'];
  }

  // Top risky dealer
  const topDealer = profiles[0];
  insights.push(
    `ALERT: Dealer ${topDealer.dealer_id} has ${topDealer.high_risk_percentage.toFixed(1)}% high-risk beneficiaries (${topDealer.high_risk_count}/${topDealer.total_beneficiaries})`
  );

  // Multi-district dealers
  const multiDistrict = profiles.filter(p => p.districts_served > 1);
  if (multiDistrict.length > 0) {
    insights.push(
      `${multiDistrict.length} dealers serve multiple districts - potential diversion risk`
    );
  }

  // High concentration clusters
  const highConcentration = profiles.filter(p => p.high_risk_percentage > 50);
  if (highConcentration.length > 0) {
    insights.push(
      `WARNING: ${highConcentration.length} dealers have >50% high-risk beneficiaries - investigation recommended`
    );
  }

  // Average stats
  const avgHighRisk = profiles.reduce((sum, p) => sum + p.high_risk_count, 0) / profiles.length;
  insights.push(
    `Average high-risk beneficiaries per suspicious dealer: ${avgHighRisk.toFixed(1)}`
  );

  return insights;
}
