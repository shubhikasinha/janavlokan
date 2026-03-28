import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

// ============================================
// CENTRALIZED TABLE REFERENCES
// All BigQuery table names in one place
// ============================================
export const TABLES = {
  // LPG Scheme Tables
  LPG_FRAUD: 'gfg-fot.lpg_fraud_detection.fraud_with_explanations',
  LPG_TRANSACTIONS: 'gfg-fot.lpg_fraud_detection.transactions',
  LPG_FEATURES: 'gfg-fot.lpg_fraud_detection.lpg_features_with_id',
  LPG_BENEFICIARIES: 'gfg-fot.lpg_fraud_detection.Beneficiaries',

  // MDM Scheme Tables
  MDM_FRAUD: 'gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations',
  MDM_DAILY_RECORDS: 'gfg-fot.lpg_fraud_detection.mdm_daily_records',

  // Shared Tables
  AUDIT_TRAIL: 'gfg-fot.lpg_fraud_detection.audit_trail',
  INVESTIGATIONS: 'gfg-fot.lpg_fraud_detection.investigations',
} as const;

// ============================================
// INGESTABLE TABLE SCHEMAS
// Column definitions for tables that support bulk CSV ingestion
// ============================================
export interface ColumnSchema {
  name: string;
  type: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP';
  required: boolean;
  description: string;
}

export interface TableSchema {
  tableRef: string;
  displayName: string;
  description: string;
  columns: ColumnSchema[];
}

export const TABLE_SCHEMAS: Record<string, TableSchema> = {
  LPG_TRANSACTIONS: {
    tableRef: TABLES.LPG_TRANSACTIONS,
    displayName: 'LPG Subsidy Transactions',
    description: 'Individual LPG cylinder refill transactions per beneficiary',
    columns: [
      { name: 'beneficiary_id', type: 'STRING', required: true, description: 'Unique beneficiary identifier' },
      { name: 'transaction_date', type: 'DATE', required: true, description: 'Date of the transaction (YYYY-MM-DD)' },
      { name: 'amount', type: 'FLOAT', required: true, description: 'Transaction amount in INR' },
      { name: 'dealer_id', type: 'STRING', required: false, description: 'LPG dealer identifier' },
      { name: 'district', type: 'STRING', required: false, description: 'District where transaction occurred' },
      { name: 'state', type: 'STRING', required: false, description: 'State of the transaction' },
      { name: 'cylinder_type', type: 'STRING', required: false, description: 'Type of cylinder (domestic/commercial)' },
      { name: 'payment_mode', type: 'STRING', required: false, description: 'Mode of payment' },
    ],
  },
  MDM_DAILY_RECORDS: {
    tableRef: TABLES.MDM_DAILY_RECORDS,
    displayName: 'Mid-Day Meal Daily Records',
    description: 'Daily meal distribution records per school',
    columns: [
      { name: 'record_id', type: 'STRING', required: true, description: 'Unique record identifier' },
      { name: 'school_id', type: 'INTEGER', required: true, description: 'School identifier' },
      { name: 'date', type: 'DATE', required: true, description: 'Date of record (YYYY-MM-DD)' },
      { name: 'actual_attendance', type: 'INTEGER', required: true, description: 'Actual student attendance' },
      { name: 'reported_students_served', type: 'INTEGER', required: true, description: 'Students reported as served' },
      { name: 'menu_type', type: 'STRING', required: false, description: 'Type of menu served' },
      { name: 'cook_present', type: 'BOOLEAN', required: false, description: 'Whether cook was present' },
      { name: 'meal_served_flag', type: 'BOOLEAN', required: false, description: 'Whether meal was served' },
      { name: 'rice_kg_used', type: 'FLOAT', required: false, description: 'Rice consumed in kg' },
      { name: 'dal_kg_used', type: 'FLOAT', required: false, description: 'Dal consumed in kg' },
      { name: 'vegetables_kg_used', type: 'FLOAT', required: false, description: 'Vegetables consumed in kg' },
      { name: 'oil_liters_used', type: 'FLOAT', required: false, description: 'Oil consumed in liters' },
      { name: 'eggs_count', type: 'INTEGER', required: false, description: 'Number of eggs used' },
      { name: 'fund_claimed_inr', type: 'FLOAT', required: false, description: 'Fund amount claimed in INR' },
      { name: 'fund_released_inr', type: 'FLOAT', required: false, description: 'Fund amount released in INR' },
    ],
  },
  AUDIT_TRAIL: {
    tableRef: TABLES.AUDIT_TRAIL,
    displayName: 'Audit Trail',
    description: 'Audit log entries for compliance tracking',
    columns: [
      { name: 'audit_id', type: 'STRING', required: true, description: 'Unique audit entry ID' },
      { name: 'beneficiary_id', type: 'STRING', required: true, description: 'Entity being audited' },
      { name: 'action', type: 'STRING', required: true, description: 'Action taken (REVIEWED, FLAGGED, CLEARED, etc.)' },
      { name: 'officer_id', type: 'STRING', required: false, description: 'Officer performing the action' },
      { name: 'officer_name', type: 'STRING', required: false, description: 'Name of the officer' },
      { name: 'notes', type: 'STRING', required: false, description: 'Additional notes' },
      { name: 'previous_risk_level', type: 'STRING', required: false, description: 'Risk level before action' },
      { name: 'new_status', type: 'STRING', required: false, description: 'Status after action' },
      { name: 'scheme_type', type: 'STRING', required: false, description: 'Scheme (LPG or MDM)' },
      { name: 'created_at', type: 'TIMESTAMP', required: false, description: 'Timestamp of the entry' },
    ],
  },
};

export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

/**
 * Validate a batch of rows against a table schema.
 * Returns an array of validation errors (empty = all valid).
 */
export function validateRowsAgainstSchema(
  rows: Record<string, string>[],
  schema: TableSchema
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requiredColumns = schema.columns.filter(c => c.required).map(c => c.name);
  const columnMap = new Map(schema.columns.map(c => [c.name, c]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check required columns
    for (const reqCol of requiredColumns) {
      if (!row[reqCol] && row[reqCol] !== '0') {
        errors.push({ row: i + 1, column: reqCol, message: `Required column "${reqCol}" is missing or empty` });
      }
    }

    // Type validation for present columns
    for (const [key, value] of Object.entries(row)) {
      const colDef = columnMap.get(key);
      if (!colDef || !value) continue;

      switch (colDef.type) {
        case 'INTEGER':
          if (!/^-?\d+$/.test(value.trim())) {
            errors.push({ row: i + 1, column: key, message: `Expected integer, got "${value}"` });
          }
          break;
        case 'FLOAT':
          if (isNaN(parseFloat(value.trim()))) {
            errors.push({ row: i + 1, column: key, message: `Expected number, got "${value}"` });
          }
          break;
        case 'BOOLEAN':
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(value.trim().toLowerCase())) {
            errors.push({ row: i + 1, column: key, message: `Expected boolean, got "${value}"` });
          }
          break;
        case 'DATE':
          if (isNaN(Date.parse(value.trim()))) {
            errors.push({ row: i + 1, column: key, message: `Expected date, got "${value}"` });
          }
          break;
      }
    }

    // Cap errors per batch to prevent flooding
    if (errors.length > 100) {
      errors.push({ row: -1, column: '', message: 'Too many validation errors — showing first 100' });
      break;
    }
  }

  return errors;
}

/**
 * Coerce a row's string values to the correct types for BigQuery insert.
 */
export function coerceRow(row: Record<string, string>, schema: TableSchema): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  const columnMap = new Map(schema.columns.map(c => [c.name, c]));

  for (const [key, value] of Object.entries(row)) {
    const colDef = columnMap.get(key);
    if (!colDef || !value) {
      coerced[key] = value || null;
      continue;
    }

    switch (colDef.type) {
      case 'INTEGER':
        coerced[key] = parseInt(value.trim(), 10);
        break;
      case 'FLOAT':
        coerced[key] = parseFloat(value.trim());
        break;
      case 'BOOLEAN': {
        const lower = value.trim().toLowerCase();
        coerced[key] = lower === 'true' || lower === '1' || lower === 'yes';
        break;
      }
      default:
        coerced[key] = value.trim();
    }
  }

  return coerced;
}

// ============================================
// QUERY RESULT INTERFACE
// ============================================
export interface QueryResult<T> {
  rows: T[];
  executionTimeMs: number;
  cached: boolean;
}

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

// ============================================
// QUERY EXECUTION WITH TIMING
// ============================================
export async function executeQuery<T>(
  query: string,
  params?: Record<string, unknown>
): Promise<QueryResult<T>> {
  const startTime = Date.now();
  const bigquery = getBigQueryClient();

  const [job] = await bigquery.createQueryJob({ query, params });
  const [rows] = await job.getQueryResults();

  const executionTimeMs = Date.now() - startTime;

  // Log slow queries for debugging
  if (executionTimeMs > 2000) {
    console.warn(`[BigQuery] Slow query (${executionTimeMs}ms):`, query.substring(0, 100));
  }

  return {
    rows: rows as T[],
    executionTimeMs,
    cached: false,
  };
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
