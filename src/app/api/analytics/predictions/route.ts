import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

// Predictive Budgeting API
// Based on historical fraud patterns, predict:
// 1. Expected wastage/leakage per district for next month
// 2. Resource allocation recommendations
// 3. Seasonal adjustments (festivals, elections)

interface DistrictPrediction {
  district: string;
  current_high_risk_count: number;
  historical_fraud_rate: number;  // % of high-risk cases confirmed as fraud
  predicted_wastage_units: number;
  predicted_wastage_amount: number;  // In INR
  confidence_score: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  recommended_action: string;
}

interface MonthlyPrediction {
  month: string;
  total_predicted_wastage: number;
  total_predicted_amount: number;
  high_risk_districts: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = Math.min(Number(searchParams.get('months')) || 3, 12);
    const district = searchParams.get('district');

    const bigquery = getBigQueryClient();

    // Analysis: Get district-wise risk concentration and historical patterns
    const districtQuery = `
      WITH district_stats AS (
        SELECT 
          b.district,
          COUNT(DISTINCT b.beneficiary_id) as total_beneficiaries,
          COUNTIF(f.risk_level = 'HIGH') as high_risk_count,
          COUNTIF(f.risk_level = 'MEDIUM') as medium_risk_count,
          AVG(f.mean_squared_error) as avg_mse,
          -- Estimate based on audit trail confirmations
          COUNTIF(a.new_status = 'CONFIRMED_FRAUD') as confirmed_frauds,
          COUNTIF(a.new_status IN ('TRUE_POSITIVE', 'CONFIRMED_FRAUD')) as true_positives,
          COUNTIF(a.new_status IN ('FALSE_POSITIVE', 'GENUINE')) as false_positives
        FROM \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
        LEFT JOIN \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
          ON b.beneficiary_id = f.beneficiary_id
        LEFT JOIN \`gfg-fot.lpg_fraud_detection.audit_trail\` a
          ON b.beneficiary_id = a.beneficiary_id
        WHERE b.district IS NOT NULL
        ${district ? 'AND b.district = @district' : ''}
        GROUP BY b.district
        HAVING total_beneficiaries >= 5
      )
      SELECT 
        district,
        total_beneficiaries,
        high_risk_count,
        medium_risk_count,
        ROUND(avg_mse, 4) as avg_mse,
        confirmed_frauds,
        true_positives,
        false_positives,
        -- Historical fraud rate (if we have audit data)
        CASE 
          WHEN (true_positives + false_positives) > 0 
          THEN ROUND(SAFE_DIVIDE(true_positives, true_positives + false_positives) * 100, 2)
          ELSE 75.0  -- Default assumption: 75% accuracy
        END as fraud_rate,
        -- Risk score for prioritization
        ROUND(
          (SAFE_DIVIDE(high_risk_count, total_beneficiaries) * 100) + 
          (avg_mse * 2),
          2
        ) as risk_score
      FROM district_stats
      ORDER BY risk_score DESC
      LIMIT 50
    `;

    const params: Record<string, unknown> = {};
    if (district) params.district = district;

    const [job] = await bigquery.createQueryJob({ query: districtQuery, params });
    const [rows] = await job.getQueryResults();

    // LPG cylinder cost assumptions
    const SUBSIDY_PER_CYLINDER = 200;  // Government subsidy per cylinder
    // Note: Full cylinder cost is ~₹900, but wastage = subsidy loss

    // Generate predictions
    const predictions: DistrictPrediction[] = rows.map((row) => {
      const fraudRate = Number(row.fraud_rate) || 75;
      const highRiskCount = Number(row.high_risk_count) || 0;
      const mediumRiskCount = Number(row.medium_risk_count) || 0;
      
      // Predicted fraud cases (high risk * fraud rate + medium risk * 0.3)
      const predictedFraudCases = Math.round(
        (highRiskCount * (fraudRate / 100)) + 
        (mediumRiskCount * 0.3)
      );
      
      // Assume each fraud case = 2 extra cylinders per month on average
      const wastedCylinders = predictedFraudCases * 2;
      const wastedAmount = wastedCylinders * SUBSIDY_PER_CYLINDER;

      // Trend calculation based on risk score
      const riskScore = Number(row.risk_score) || 0;
      let trend: DistrictPrediction['trend'] = 'STABLE';
      if (riskScore > 30) trend = 'INCREASING';
      else if (riskScore < 10) trend = 'DECREASING';

      // Confidence score based on data availability
      const totalAuditData = Number(row.true_positives || 0) + Number(row.false_positives || 0);
      const confidence = Math.min(50 + (totalAuditData * 5), 95);

      // Recommended action
      let action = 'Continue monitoring';
      if (highRiskCount > 10 && fraudRate > 70) {
        action = 'Immediate field investigation recommended';
      } else if (highRiskCount > 5) {
        action = 'Increase surveillance and spot checks';
      } else if (trend === 'INCREASING') {
        action = 'Watch closely - rising risk trend';
      }

      return {
        district: row.district,
        current_high_risk_count: highRiskCount,
        historical_fraud_rate: fraudRate,
        predicted_wastage_units: wastedCylinders,
        predicted_wastage_amount: wastedAmount,
        confidence_score: confidence,
        trend,
        recommended_action: action
      };
    });

    // Generate monthly forecast
    const monthlyPredictions: MonthlyPrediction[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    for (let i = 1; i <= months; i++) {
      const targetMonth = (currentMonth + i) % 12;
      
      // Seasonal adjustment factors
      let seasonalFactor = 1.0;
      // Winter months (Nov-Feb) have higher LPG usage
      if ([10, 11, 0, 1].includes(targetMonth)) seasonalFactor = 1.2;
      // Festival months (Oct, Nov) - Diwali season
      if ([9, 10].includes(targetMonth)) seasonalFactor = 1.3;
      // Summer months
      if ([3, 4, 5].includes(targetMonth)) seasonalFactor = 0.9;

      const totalWastage = predictions.reduce((sum, p) => sum + p.predicted_wastage_units, 0) * seasonalFactor;
      const totalAmount = predictions.reduce((sum, p) => sum + p.predicted_wastage_amount, 0) * seasonalFactor;
      
      const highRiskDistricts = predictions
        .filter(p => p.trend === 'INCREASING' || p.current_high_risk_count > 5)
        .slice(0, 5)
        .map(p => p.district);

      monthlyPredictions.push({
        month: monthNames[targetMonth] + ' 2026',
        total_predicted_wastage: Math.round(totalWastage),
        total_predicted_amount: Math.round(totalAmount),
        high_risk_districts: highRiskDistricts
      });
    }

    // Summary stats
    const totalPredictedWastage = predictions.reduce((sum, p) => sum + p.predicted_wastage_units, 0);
    const totalPredictedAmount = predictions.reduce((sum, p) => sum + p.predicted_wastage_amount, 0);
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence_score, 0) / (predictions.length || 1);

    return NextResponse.json({
      success: true,
      summary: {
        total_districts_analyzed: predictions.length,
        total_predicted_monthly_wastage: totalPredictedWastage,
        total_predicted_monthly_amount: totalPredictedAmount,
        average_confidence: Math.round(avgConfidence),
        currency: 'INR',
        assumptions: {
          subsidy_per_cylinder: SUBSIDY_PER_CYLINDER,
          avg_extra_cylinders_per_fraud: 2
        }
      },
      district_predictions: predictions,
      monthly_forecast: monthlyPredictions,
      insights: generateBudgetInsights(predictions, totalPredictedAmount)
    });

  } catch (error) {
    console.error('Predictive Budgeting Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

function generateBudgetInsights(predictions: DistrictPrediction[], totalAmount: number): string[] {
  const insights: string[] = [];

  // Top wastage districts
  const topDistricts = predictions.slice(0, 3);
  if (topDistricts.length > 0) {
    insights.push(
      `💰 Top 3 districts account for ₹${topDistricts.reduce((sum, p) => sum + p.predicted_wastage_amount, 0).toLocaleString()} predicted monthly wastage`
    );
  }

  // Increasing trend warning
  const increasingDistricts = predictions.filter(p => p.trend === 'INCREASING');
  if (increasingDistricts.length > 0) {
    insights.push(
      `📈 ${increasingDistricts.length} districts show INCREASING fraud trend - prioritize for intervention`
    );
  }

  // High confidence predictions
  const highConfidence = predictions.filter(p => p.confidence_score > 80);
  if (highConfidence.length > 0) {
    insights.push(
      `✅ ${highConfidence.length} districts have >80% prediction confidence (sufficient audit data)`
    );
  }

  // Budget recommendation
  const quarterlyBudget = totalAmount * 3;
  insights.push(
    `📊 Recommended quarterly anti-fraud budget: ₹${quarterlyBudget.toLocaleString()} (based on predicted wastage recovery)`
  );

  // Resource allocation suggestion
  const criticalDistricts = predictions.filter(p => p.current_high_risk_count > 10);
  if (criticalDistricts.length > 0) {
    insights.push(
      `👥 Deploy additional field officers to: ${criticalDistricts.map(p => p.district).join(', ')}`
    );
  }

  return insights;
}
