import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

// Based on historical fraud patterns in Mid Day Meal scheme, predict:
// 1. Expected wastage/leakage per district for next month
// 2. Resource allocation recommendations
// 3. Seasonal adjustments (school calendar, vacations)

interface MDMDistrictPrediction {
  district: string;
  current_high_risk_schools: number;
  total_schools: number;
  historical_fraud_rate: number;
  predicted_wastage_meals: number;
  predicted_wastage_amount: number;
  confidence_score: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  recommended_action: string;
}

interface MDMMonthlyPrediction {
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

    let rows: any[] = [];

    try {
      const districtQuery = `
        WITH district_stats AS (
          SELECT 
            f.district,
            COUNT(DISTINCT f.school_id) as total_schools,
            COUNTIF(f.risk_level = 'HIGH') as high_risk_count,
            COUNTIF(f.risk_level = 'MEDIUM') as medium_risk_count,
            AVG(f.anomaly_score) as avg_anomaly_score,
            SUM(f.total_meals_reported) as total_meals,
            -- Estimate based on audit trail confirmations if available
            COUNTIF(a.new_status = 'CONFIRMED_FRAUD') as confirmed_frauds,
            COUNTIF(a.new_status IN ('TRUE_POSITIVE', 'CONFIRMED_FRAUD')) as true_positives,
            COUNTIF(a.new_status IN ('FALSE_POSITIVE', 'GENUINE')) as false_positives
          FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\` f
          LEFT JOIN \`gfg-fot.lpg_fraud_detection.audit_trail\` a
            ON CAST(f.school_id AS STRING) = a.beneficiary_id
            AND a.scheme_type = 'MDM'
          WHERE f.district IS NOT NULL
          ${district ? 'AND f.district = @district' : ''}
          GROUP BY f.district
          HAVING total_schools >= 2
        )
        SELECT 
          district,
          total_schools,
          high_risk_count,
          medium_risk_count,
          ROUND(avg_anomaly_score, 4) as avg_anomaly_score,
          total_meals,
          confirmed_frauds,
          true_positives,
          false_positives,
          -- Historical fraud rate (if we have audit data)
          CASE 
            WHEN (true_positives + false_positives) > 0 
            THEN ROUND(SAFE_DIVIDE(true_positives, true_positives + false_positives) * 100, 2)
            ELSE 70.0  -- Default assumption: 70% accuracy for MDM
          END as fraud_rate,
          -- Risk score for prioritization
          ROUND(
            (SAFE_DIVIDE(high_risk_count, total_schools) * 100) + 
            (avg_anomaly_score * 10),
            2
          ) as risk_score
        FROM district_stats
        ORDER BY risk_score DESC
        LIMIT 50
      `;

      const params: Record<string, unknown> = {};
      if (district) params.district = district;

      const [job] = await bigquery.createQueryJob({ query: districtQuery, params });
      const [result] = await job.getQueryResults();
      rows = result;
    } catch (_primaryError) {
      console.log('Primary MDM predictions table not found, using fallback...');

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
        school_risk AS (
          SELECT
            COALESCE(district, 'Unknown') AS district,
            school_id,
            total_meals,
            anomaly_score,
            CASE 
              WHEN anomaly_score > 2 THEN 'HIGH'
              WHEN anomaly_score > 1 THEN 'MEDIUM'
              ELSE 'LOW'
            END AS risk_level
          FROM school_stats
        )
        SELECT 
          district,
          COUNT(DISTINCT school_id) as total_schools,
          COUNTIF(risk_level = 'HIGH') as high_risk_count,
          COUNTIF(risk_level = 'MEDIUM') as medium_risk_count,
          ROUND(AVG(anomaly_score), 4) as avg_anomaly_score,
          SUM(total_meals) as total_meals,
          0 as confirmed_frauds,
          0 as true_positives,
          0 as false_positives,
          70.0 as fraud_rate,
          ROUND(
            (SAFE_DIVIDE(COUNTIF(risk_level = 'HIGH'), COUNT(DISTINCT school_id)) * 100) + 
            (AVG(anomaly_score) * 10),
            2
          ) as risk_score
        FROM school_risk
        WHERE district IS NOT NULL
        GROUP BY district
        HAVING total_schools >= 2
        ORDER BY risk_score DESC
        LIMIT 50
      `;

      const [fallbackJob] = await bigquery.createQueryJob({ query: fallbackQuery });
      const [fallbackResult] = await fallbackJob.getQueryResults();
      rows = fallbackResult;
    }

    // MDM cost assumptions (per meal)
    const COST_PER_MEAL = Number(process.env.MDM_COST_PER_MEAL) || 8;  // Government cost per meal in INR

    // predictions
    const predictions: MDMDistrictPrediction[] = rows.map((row) => {
      const fraudRate = Number(row.fraud_rate) || 70;
      const highRiskCount = Number(row.high_risk_count) || 0;
      const mediumRiskCount = Number(row.medium_risk_count) || 0;
      const totalMeals = Number(row.total_meals) || 0;

      // Predicted fraud cases (high risk * fraud rate + medium risk * 0.25)
      const predictedFraudSchools = Math.round(
        (highRiskCount * (fraudRate / 100)) +
        (mediumRiskCount * 0.25)
      );

      // Assume each fraud school reports ~20% extra meals on average
      const avgMealsPerSchool = totalMeals / (Number(row.total_schools) || 1);
      const wastedMeals = Math.round(predictedFraudSchools * avgMealsPerSchool * 0.2);
      const wastedAmount = wastedMeals * COST_PER_MEAL;

      // Trend calculation based on risk score
      const riskScore = Number(row.risk_score) || 0;
      let trend: MDMDistrictPrediction['trend'] = 'STABLE';
      if (riskScore > 25) trend = 'INCREASING';
      else if (riskScore < 8) trend = 'DECREASING';

      // Confidence score based on data availability
      const totalAuditData = Number(row.true_positives || 0) + Number(row.false_positives || 0);
      const confidence = Math.min(45 + (totalAuditData * 5), 90);

      // Recommended action
      let action = 'Continue monitoring';
      if (highRiskCount > 5 && fraudRate > 65) {
        action = 'Immediate physical inspection recommended';
      } else if (highRiskCount > 3) {
        action = 'Increase surprise inspections';
      } else if (trend === 'INCREASING') {
        action = 'Watch closely - rising risk trend';
      }

      return {
        district: row.district,
        current_high_risk_schools: highRiskCount,
        total_schools: Number(row.total_schools) || 0,
        historical_fraud_rate: fraudRate,
        predicted_wastage_meals: wastedMeals,
        predicted_wastage_amount: wastedAmount,
        confidence_score: confidence,
        trend,
        recommended_action: action
      };
    });

    // Generate monthly forecast (adjusted for school calendar)
    const monthlyPredictions: MDMMonthlyPrediction[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    for (let i = 1; i <= months; i++) {
      const targetMonth = (currentMonth + i) % 12;

      // Seasonal adjustment factors (school calendar)
      let seasonalFactor = 1.0;
      // Summer vacation (May-Jun) - reduced meals
      if ([4, 5].includes(targetMonth)) seasonalFactor = 0.3;
      // Diwali/winter vacation (late Oct, early Nov)
      if (targetMonth === 10) seasonalFactor = 0.7;
      // Winter vacation (late Dec)
      if (targetMonth === 11) seasonalFactor = 0.6;
      // Regular school months
      if ([6, 7, 8, 9, 0, 1, 2, 3].includes(targetMonth)) seasonalFactor = 1.0;

      const totalWastage = predictions.reduce((sum, p) => sum + p.predicted_wastage_meals, 0) * seasonalFactor;
      const totalAmount = predictions.reduce((sum, p) => sum + p.predicted_wastage_amount, 0) * seasonalFactor;

      const highRiskDistricts = predictions
        .filter(p => p.trend === 'INCREASING' || p.current_high_risk_schools > 3)
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
    const totalPredictedWastage = predictions.reduce((sum, p) => sum + p.predicted_wastage_meals, 0);
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
          cost_per_meal: COST_PER_MEAL,
          avg_ghost_meal_percentage: 20
        }
      },
      district_predictions: predictions,
      monthly_forecast: monthlyPredictions,
      insights: generateMDMBudgetInsights(predictions, totalPredictedAmount)
    });

  } catch (error) {
    console.error('MDM Predictive Budgeting Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

function generateMDMBudgetInsights(predictions: MDMDistrictPrediction[], totalAmount: number): string[] {
  const insights: string[] = [];

  // Top wastage districts
  const topDistricts = predictions.slice(0, 3);
  if (topDistricts.length > 0) {
    insights.push(
      `Top 3 districts account for Rs.${topDistricts.reduce((sum, p) => sum + p.predicted_wastage_amount, 0).toLocaleString()} predicted monthly wastage in MDM funds`
    );
  }

  // Increasing trend warning
  const increasingDistricts = predictions.filter(p => p.trend === 'INCREASING');
  if (increasingDistricts.length > 0) {
    insights.push(
      `${increasingDistricts.length} districts show INCREASING ghost meal trend - prioritize for physical inspections`
    );
  }

  // High confidence predictions
  const highConfidence = predictions.filter(p => p.confidence_score > 75);
  if (highConfidence.length > 0) {
    insights.push(
      `${highConfidence.length} districts have >75% prediction confidence (sufficient audit data)`
    );
  }

  // Budget recommendation
  const quarterlyBudget = totalAmount * 3;
  insights.push(
    `Recommended quarterly MDM audit budget: Rs.${quarterlyBudget.toLocaleString()} (based on predicted wastage recovery)`
  );

  // Ghost meals warning
  const ghostMealDistricts = predictions.filter(p => p.current_high_risk_schools > 3);
  if (ghostMealDistricts.length > 0) {
    insights.push(
      `ALERT: ${ghostMealDistricts.length} districts have multiple schools with ghost meal indicators`
    );
  }

  // Resource allocation suggestion
  const criticalDistricts = predictions.filter(p => p.current_high_risk_schools > 5);
  if (criticalDistricts.length > 0) {
    insights.push(
      `Deploy MDM inspectors to: ${criticalDistricts.map(p => p.district).join(', ')}`
    );
  }

  return insights;
}
