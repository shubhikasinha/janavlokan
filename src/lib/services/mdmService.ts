/**
 * MDM (Mid-Day Meal) Service
 * 
 * Centralizes all MDM school-related queries with caching.
 */

import {
    executeQuery,
    TABLES,
    MDMHighRiskSchool,
    MDMSchoolDetail,
    MDMDistrictRisk,
    generateMDMReasonsFromFlags,
} from '@/lib/bigquery';
import { generateMDMGeminiExplanation, mdmFlagsToReasonCodes, SupportedLanguage } from '@/lib/gemini';
import { getCacheService, cacheKey, CACHE_TTL } from '@/lib/cache';

export class MDMService {
    private cache = getCacheService();

    /**
     * Get high-risk schools list
     */
    async getHighRiskSchools(limit: number = 50): Promise<MDMHighRiskSchool[]> {
        const safeLimit = Math.min(limit, 100);
        const key = cacheKey('mdm', 'high-risk', safeLimit);

        const cached = this.cache.get<MDMHighRiskSchool[]>(key);
        if (cached) {
            console.log(`[MDMService] Cache HIT for ${key}`);
            return cached;
        }

        const query = `
      SELECT
        school_id,
        school_name,
        district,
        risk_level,
        anomaly_score,
        flag_ghost_meals,
        flag_ingredient_inflation,
        flag_fund_overclaim,
        flag_cook_anomaly,
        total_meals_reported
      FROM \`${TABLES.MDM_FRAUD}\`
      ORDER BY anomaly_score DESC
      LIMIT @limit
    `;

        const result = await executeQuery<MDMHighRiskSchool>(query, { limit: safeLimit });

        const schools: MDMHighRiskSchool[] = result.rows.map(row => ({
            school_id: Number(row.school_id),
            school_name: row.school_name || 'Unknown School',
            district: row.district || 'Unknown',
            risk_level: row.risk_level || 'UNKNOWN',
            anomaly_score: Number(row.anomaly_score) || 0,
            flag_ghost_meals: Boolean(row.flag_ghost_meals),
            flag_ingredient_inflation: Boolean(row.flag_ingredient_inflation),
            flag_fund_overclaim: Boolean(row.flag_fund_overclaim),
            flag_cook_anomaly: Boolean(row.flag_cook_anomaly),
            total_meals_reported: Number(row.total_meals_reported) || 0,
        }));

        this.cache.set(key, schools, CACHE_TTL.HIGH_RISK_LIST);

        return schools;
    }

    /**
     * Get school detail with Gemini explanation
     */
    async getSchoolById(
        schoolId: number,
        language: SupportedLanguage = 'en'
    ): Promise<MDMSchoolDetail | null> {
        const key = cacheKey('mdm', 'school', schoolId, language);

        const cached = this.cache.get<MDMSchoolDetail>(key);
        if (cached) {
            console.log(`[MDMService] Cache HIT for ${key}`);
            return cached;
        }

        const query = `
      SELECT *
      FROM \`${TABLES.MDM_FRAUD}\`
      WHERE school_id = @school_id
    `;

        // Define raw query result type (matches BigQuery columns)
        interface RawSchoolRow {
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
            flag_ghost_meals: boolean;
            flag_ingredient_inflation: boolean;
            flag_fund_overclaim: boolean;
            flag_cook_anomaly: boolean;
        }

        const result = await executeQuery<RawSchoolRow>(query, { school_id: schoolId });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
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

        // Generate Gemini explanation
        const geminiExplanation = await generateMDMGeminiExplanation(
            row.risk_level,
            reasonCodes,
            language
        );

        const detail: MDMSchoolDetail = {
            school_id: Number(row.school_id),
            school_name: row.school_name || 'Unknown School',
            district: row.district || 'Unknown',
            block: row.block || '',
            village: row.village || '',
            school_type: row.school_type || '',
            management: row.management || '',
            total_enrolled_students: Number(row.total_enrolled_students) || 0,
            avg_attendance_rate: Number(row.avg_attendance_rate) || 0,
            kitchen_type: row.kitchen_type || '',
            cook_count: Number(row.cook_count) || 0,
            last_inspection_score: Number(row.last_inspection_score) || 0,
            risk_level: row.risk_level || 'UNKNOWN',
            anomaly_score: Number(row.anomaly_score) || 0,
            flags,
            reasons,
            gemini_explanation: geminiExplanation,
        };

        this.cache.set(key, detail, CACHE_TTL.ENTITY_DETAIL);

        return detail;
    }

    /**
     * Get district-level risk data for heatmap
     */
    async getDistrictRisk(): Promise<MDMDistrictRisk[]> {
        const key = cacheKey('mdm', 'district-risk');

        const cached = this.cache.get<MDMDistrictRisk[]>(key);
        if (cached) {
            console.log(`[MDMService] Cache HIT for ${key}`);
            return cached;
        }

        const query = `
      SELECT
        district,
        COUNT(*) AS anomaly_count,
        COUNT(*) AS total_schools,
        COUNTIF(risk_level = 'HIGH') AS high_risk_schools
      FROM \`${TABLES.MDM_FRAUD}\`
      WHERE risk_level IN ('HIGH', 'MEDIUM')
      GROUP BY district
      ORDER BY anomaly_count DESC
    `;

        const result = await executeQuery<MDMDistrictRisk>(query);

        const districts: MDMDistrictRisk[] = result.rows.map(row => ({
            district: row.district,
            anomaly_count: Number(row.anomaly_count),
            total_schools: Number(row.total_schools),
            high_risk_schools: Number(row.high_risk_schools),
        }));

        this.cache.set(key, districts, CACHE_TTL.DISTRICT_RISK);

        return districts;
    }

    /**
     * Invalidate MDM cache
     */
    invalidateCache(): void {
        this.cache.invalidate('mdm:*');
        console.log('[MDMService] Cache invalidated');
    }
}

// Singleton instance
let mdmServiceInstance: MDMService | null = null;

export function getMDMService(): MDMService {
    if (!mdmServiceInstance) {
        mdmServiceInstance = new MDMService();
    }
    return mdmServiceInstance;
}
