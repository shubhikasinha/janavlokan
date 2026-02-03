import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

// Singleton BigQuery client
let bigqueryClient: BigQuery | null = null;

export function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    const projectId = process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;

    if (!projectId) {
      throw new Error('Missing GOOGLE_PROJECT_ID environment variable. Check .env.local file.');
    }

    // Support both file-based auth (gcp-key.json) and inline credentials from env vars
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (keyFilename) {
      // Use service account key file
      bigqueryClient = new BigQuery({
        projectId,
        keyFilename: path.join(process.cwd(), keyFilename),
      });
    } else if (clientEmail && privateKey) {
      // Use inline credentials from environment variables
      bigqueryClient = new BigQuery({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } else {
      bigqueryClient = new BigQuery({
        projectId,
        keyFilename: path.join(process.cwd(), 'gcp-key.json'),
      });
    }
  }
  return bigqueryClient;
}

export type SchemeType = 'LPG' | 'MDM';

export interface DashboardSummary {
  total_beneficiaries: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface RiskDistribution {
  risk_level: string;
  count: number;
}

export interface HighRiskBeneficiary {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flag_high_recent_activity: boolean;
  flag_multiple_dealers: boolean;
  flag_cross_district: boolean;
  flag_high_lifetime_usage: boolean;
}

export interface BeneficiaryDetail {
  beneficiary_id: string;
  risk_level: string;
  mean_squared_error: number;
  flags: {
    high_recent_activity: boolean;
    multiple_dealers: boolean;
    cross_district: boolean;
    high_lifetime_usage: boolean;
  };
  reasons: string[];
  gemini_explanation?: string;
}

export interface DistrictRisk {
  residence_district: string;
  anomaly_count: number;
}

export interface MDMDashboardSummary {
  total_schools: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  total_meals_reported: number;
}

export interface MDMHighRiskSchool {
  school_id: number;
  school_name: string;
  district: string;
  risk_level: string;
  anomaly_score: number;
  flag_ghost_meals: boolean;
  flag_ingredient_inflation: boolean;
  flag_fund_overclaim: boolean;
  flag_cook_anomaly: boolean;
  total_meals_reported: number;
}

export interface MDMSchoolDetail {
  school_id: number;
  school_name: string;
  district: string;
  block: string;
  village: string;
  school_type: string;
  management: string;
  total_enrolled_students: number;
  avg_attendance_rate: number;
  kitchen_type: string;
  cook_count: number;
  last_inspection_score: number;
  risk_level: string;
  anomaly_score: number;
  flags: {
    ghost_meals: boolean;
    ingredient_inflation: boolean;
    fund_overclaim: boolean;
    cook_anomaly: boolean;
  };
  reasons: string[];
  gemini_explanation?: string;
}

export interface MDMDistrictRisk {
  district: string;
  anomaly_count: number;
  total_schools: number;
  high_risk_schools: number;
}

export interface MDMDailyRecord {
  record_id: string;
  school_id: number;
  date: string;
  actual_attendance: number;
  reported_students_served: number;
  menu_type: string;
  cook_present: boolean;
  meal_served_flag: boolean;
  rice_kg_used: number;
  dal_kg_used: number;
  vegetables_kg_used: number;
  oil_liters_used: number;
  eggs_count: number;
  fund_claimed_inr: number;
  fund_released_inr: number;
}

export function generateMDMReasonsFromFlags(flags: {
  ghost_meals: boolean;
  ingredient_inflation: boolean;
  fund_overclaim: boolean;
  cook_anomaly: boolean;
}): string[] {
  const reasons: string[] = [];

  if (flags.ghost_meals) {
    reasons.push('Reported students served exceeds actual attendance (Ghost Meals detected)');
  }

  if (flags.ingredient_inflation) {
    reasons.push('Ingredient usage exceeds expected norms per student');
  }

  if (flags.fund_overclaim) {
    reasons.push('Funds claimed significantly higher than expected for student count');
  }

  if (flags.cook_anomaly) {
    reasons.push('Meal served without cook present - operational anomaly');
  }

  if (reasons.length === 0) {
    reasons.push('School operations align with expected norms and standards');
  }

  return reasons;
}

export function generateReasonsFromFlags(flags: {
  high_recent_activity: boolean;
  multiple_dealers: boolean;
  cross_district: boolean;
  high_lifetime_usage: boolean;
}): string[] {
  const reasons: string[] = [];

  if (flags.high_recent_activity) {
    reasons.push('Unusually high number of LPG refills in the last 30 days');
  }

  if (flags.multiple_dealers) {
    reasons.push('Refills taken from multiple dealers');
  }

  if (flags.cross_district) {
    reasons.push('LPG refills detected across districts');
  }

  if (flags.high_lifetime_usage) {
    reasons.push('Higher-than-expected lifetime refill count');
  }

  if (reasons.length === 0) {
    reasons.push('Refill behavior aligns with historical and regional norms');
  }

  return reasons;
}
