import { getBigQueryClient, TABLES } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

// Network/Collusion Analysis API
// Uses LPG_TRANSACTIONS to link Beneficiaries to Dealers
// Uses LPG_BENEFICIARIES for district info
// Uses LPG_FRAUD for risk scores

interface DealerRiskProfile {
  dealer_id: string; // We map dealer_hash to this in the response
  total_beneficiaries: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  high_risk_percentage: number;
  avg_mse: number;
  districts_served: number;
  risk_score: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type') || 'dealer_risk';
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const minHighRisk = Number(searchParams.get('min_high_risk')) || 3;

    const bigquery = getBigQueryClient();

    if (analysisType === 'dealer_risk') {
      // Analysis 1: Dealer Risk Profiling using dealer_hash
      const query = `
        WITH dealer_map AS (
          SELECT DISTINCT dealer_hash, beneficiary_id
          FROM \`${TABLES.LPG_TRANSACTIONS}\`
          WHERE dealer_hash IS NOT NULL
        ),
        dealer_stats AS (
          SELECT 
            dm.dealer_hash,
            COUNT(DISTINCT dm.beneficiary_id) as total_beneficiaries,
            COUNTIF(f.risk_level = 'HIGH') as high_risk_count,
            COUNTIF(f.risk_level = 'MEDIUM') as medium_risk_count,
            COUNTIF(f.risk_level = 'LOW') as low_risk_count,
            AVG(f.mean_squared_error) as avg_mse,
            COUNT(DISTINCT b.residence_district) as districts_served
          FROM dealer_map dm
          JOIN \`${TABLES.LPG_BENEFICIARIES}\` b ON dm.beneficiary_id = b.beneficiary_id
          LEFT JOIN \`${TABLES.LPG_FRAUD}\` f ON dm.beneficiary_id = f.beneficiary_id
          GROUP BY dm.dealer_hash
          HAVING high_risk_count >= @min_high_risk
        )
        SELECT 
          dealer_hash as dealer_id,
          total_beneficiaries,
          high_risk_count,
          medium_risk_count,
          low_risk_count,
          ROUND(SAFE_DIVIDE(high_risk_count, total_beneficiaries) * 100, 2) as high_risk_percentage,
          ROUND(avg_mse, 4) as avg_mse,
          districts_served,
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
        dealer_id: row.dealer_id, // This is actually dealer_hash
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
        data: dealerProfiles,
        insights: generateDealerInsights(dealerProfiles)
      });

    } else if (analysisType === 'cross_district') {
      // Analysis 2: Cross District Patterns using transaction_district and dealer_hash
      const query = `
        SELECT 
          t.dealer_hash as dealer_id,
          b.residence_district as beneficiary_district,
          COUNT(DISTINCT t.beneficiary_id) as beneficiary_count,
          AVG(f.mean_squared_error) as avg_mse,
          COUNTIF(f.risk_level = 'HIGH') as high_risk_count
        FROM \`${TABLES.LPG_TRANSACTIONS}\` t
        JOIN \`${TABLES.LPG_BENEFICIARIES}\` b ON t.beneficiary_id = b.beneficiary_id
        LEFT JOIN \`${TABLES.LPG_FRAUD}\` f ON t.beneficiary_id = f.beneficiary_id
        WHERE f.flag_cross_district = TRUE
        GROUP BY t.dealer_hash, b.residence_district
        HAVING beneficiary_count >= 2
        ORDER BY high_risk_count DESC
        LIMIT @limit
      `;

      const [job] = await bigquery.createQueryJob({ query, params: { limit } });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'cross_district',
        data: rows.map((row) => ({
          dealer_id: row.dealer_id,
          beneficiary_district: row.beneficiary_district,
          beneficiary_count: Number(row.beneficiary_count),
          avg_mse: Number(row.avg_mse)?.toFixed(4),
          high_risk_count: Number(row.high_risk_count)
        }))
      });

    } else if (analysisType === 'multiple_dealer') {
      // Analysis 3: Multi-dealer beneficiaries using dealer_hash
      const query = `
        SELECT 
          f.beneficiary_id,
          f.risk_level,
          f.mean_squared_error,
          -- Get dealer list from transactions
          (SELECT COUNT(DISTINCT dealer_hash) FROM \`${TABLES.LPG_TRANSACTIONS}\` t WHERE t.beneficiary_id = f.beneficiary_id) as dealer_count,
          ARRAY(SELECT DISTINCT dealer_hash FROM \`${TABLES.LPG_TRANSACTIONS}\` t WHERE t.beneficiary_id = f.beneficiary_id LIMIT 5) as dealers
        FROM \`${TABLES.LPG_FRAUD}\` f
        WHERE f.flag_multiple_dealers = TRUE
        ORDER BY f.mean_squared_error DESC
        LIMIT @limit
      `;

      const [job] = await bigquery.createQueryJob({ query, params: { limit } });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'multiple_dealer',
        data: rows.map((row) => ({
          beneficiary_id: row.beneficiary_id,
          risk_level: row.risk_level,
          mean_squared_error: Number(row.mean_squared_error)?.toFixed(4),
          dealer_count: Number(row.dealer_count),
          dealers: row.dealers || []
        }))
      });

    } else if (analysisType === 'summary') {
      const query = `
        SELECT 
          COUNT(DISTINCT dealer_hash) as total_dealers
        FROM \`${TABLES.LPG_TRANSACTIONS}\`
      `;
      // Simple summary for valid checking
      const [job] = await bigquery.createQueryJob({ query });
      const [rows] = await job.getQueryResults();

      return NextResponse.json({
        success: true,
        analysis_type: 'summary',
        data: {
          total_dealers: Number(rows[0]?.total_dealers) || 0
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid analysis type' }, { status: 400 });

  } catch (error) {
    console.error('Network Analysis Error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

function generateDealerInsights(profiles: DealerRiskProfile[]): string[] {
  if (profiles.length === 0) return ['No suspicious patterns detected'];
  const top = profiles[0];
  return [`Top alert: Dealer ${top.dealer_id} has ${top.high_risk_percentage}% high-risk beneficiaries`];
}
