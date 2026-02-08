/**
 * Beneficiary Service
 * 
 * Centralizes all LPG beneficiary-related queries with caching.
 */

import {
    executeQuery,
    TABLES,
    HighRiskBeneficiary,
    BeneficiaryDetail,
    DistrictRisk,
    generateReasonsFromFlags,
} from '@/lib/bigquery';
import { generateGeminiExplanation, flagsToReasonCodes, SupportedLanguage } from '@/lib/gemini';
import { getCacheService, cacheKey, CACHE_TTL } from '@/lib/cache';

export interface HighRiskQueryOptions {
    limit?: number;
    riskLevel?: string;
    threshold?: number;
    useDynamic?: boolean;
}

export class BeneficiaryService {
    private cache = getCacheService();

    /**
     * Get high-risk beneficiaries list
     */
    async getHighRisk(options: HighRiskQueryOptions = {}): Promise<HighRiskBeneficiary[]> {
        const { limit = 50, riskLevel, threshold = 0, useDynamic = false } = options;
        const safeLimit = Math.min(limit, 100);

        // Don't cache dynamic threshold queries
        if (!useDynamic && threshold === 0) {
            const key = cacheKey('beneficiaries', 'high-risk', riskLevel || 'all', safeLimit);
            const cached = this.cache.get<HighRiskBeneficiary[]>(key);
            if (cached) {
                console.log(`[BeneficiaryService] Cache HIT for ${key}`);
                return cached;
            }
        }

        let query: string;
        const params: Record<string, unknown> = { limit: safeLimit };

        if (useDynamic && threshold > 0) {
            // Dynamic mode: calculate risk level on-the-fly
            query = `
        SELECT
          beneficiary_id,
          CASE 
            WHEN mean_squared_error > @threshold * 2 THEN 'HIGH'
            WHEN mean_squared_error > @threshold THEN 'MEDIUM'
            ELSE 'LOW'
          END AS risk_level,
          mean_squared_error,
          flag_high_recent_activity,
          flag_multiple_dealers,
          flag_cross_district,
          flag_high_lifetime_usage
        FROM \`${TABLES.LPG_FRAUD}\`
        WHERE mean_squared_error >= @threshold
        ORDER BY mean_squared_error DESC
        LIMIT @limit
      `;
            params.threshold = threshold;
        } else {
            // Static mode: use pre-computed risk_level
            query = `
        SELECT
          beneficiary_id,
          risk_level,
          mean_squared_error,
          flag_high_recent_activity,
          flag_multiple_dealers,
          flag_cross_district,
          flag_high_lifetime_usage
        FROM \`${TABLES.LPG_FRAUD}\`
      `;

            if (riskLevel && ['HIGH', 'MEDIUM', 'LOW'].includes(riskLevel.toUpperCase())) {
                query += `WHERE risk_level = @riskLevel\n`;
                params.riskLevel = riskLevel.toUpperCase();
            }

            query += `ORDER BY mean_squared_error DESC LIMIT @limit`;
        }

        const result = await executeQuery<HighRiskBeneficiary>(query, params);

        const beneficiaries: HighRiskBeneficiary[] = result.rows.map(row => ({
            beneficiary_id: row.beneficiary_id,
            risk_level: row.risk_level || 'UNKNOWN',
            mean_squared_error: Number(row.mean_squared_error) || 0,
            flag_high_recent_activity: Boolean(row.flag_high_recent_activity),
            flag_multiple_dealers: Boolean(row.flag_multiple_dealers),
            flag_cross_district: Boolean(row.flag_cross_district),
            flag_high_lifetime_usage: Boolean(row.flag_high_lifetime_usage),
        }));

        // Cache static queries
        if (!useDynamic && threshold === 0) {
            const key = cacheKey('beneficiaries', 'high-risk', riskLevel || 'all', safeLimit);
            this.cache.set(key, beneficiaries, CACHE_TTL.HIGH_RISK_LIST);
        }

        return beneficiaries;
    }

    /**
     * Get beneficiary detail with Gemini explanation
     */
    async getById(
        beneficiaryId: string,
        language: SupportedLanguage = 'en'
    ): Promise<BeneficiaryDetail | null> {
        const key = cacheKey('beneficiary', beneficiaryId, language);

        const cached = this.cache.get<BeneficiaryDetail>(key);
        if (cached) {
            console.log(`[BeneficiaryService] Cache HIT for ${key}`);
            return cached;
        }

        const query = `
      SELECT
        beneficiary_id,
        risk_level,
        mean_squared_error,
        flag_high_recent_activity,
        flag_multiple_dealers,
        flag_cross_district,
        flag_high_lifetime_usage
      FROM \`${TABLES.LPG_FRAUD}\`
      WHERE beneficiary_id = @beneficiary_id
    `;

        const result = await executeQuery<{
            beneficiary_id: string;
            risk_level: string;
            mean_squared_error: number;
            flag_high_recent_activity: boolean;
            flag_multiple_dealers: boolean;
            flag_cross_district: boolean;
            flag_high_lifetime_usage: boolean;
        }>(query, { beneficiary_id: beneficiaryId });

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        const flags = {
            high_recent_activity: Boolean(row.flag_high_recent_activity),
            multiple_dealers: Boolean(row.flag_multiple_dealers),
            cross_district: Boolean(row.flag_cross_district),
            high_lifetime_usage: Boolean(row.flag_high_lifetime_usage),
        };

        const reasons = generateReasonsFromFlags(flags);
        const reasonCodes = flagsToReasonCodes({
            flag_high_recent_activity: flags.high_recent_activity,
            flag_multiple_dealers: flags.multiple_dealers,
            flag_cross_district: flags.cross_district,
            flag_high_lifetime_usage: flags.high_lifetime_usage,
        });

        // Generate Gemini explanation
        const geminiExplanation = await generateGeminiExplanation(
            row.risk_level,
            reasonCodes,
            language
        );

        const detail: BeneficiaryDetail = {
            beneficiary_id: row.beneficiary_id,
            risk_level: row.risk_level || 'UNKNOWN',
            mean_squared_error: Number(row.mean_squared_error) || 0,
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
    async getDistrictRisk(): Promise<DistrictRisk[]> {
        const key = cacheKey('beneficiaries', 'district-risk');

        const cached = this.cache.get<DistrictRisk[]>(key);
        if (cached) {
            console.log(`[BeneficiaryService] Cache HIT for ${key}`);
            return cached;
        }

        // JOIN fraud_with_explanations with Beneficiaries table to get residence_district
        const query = `
          SELECT
            b.residence_district,
            COUNT(*) AS anomaly_count
          FROM \`${TABLES.LPG_FRAUD}\` fraud
          JOIN \`${TABLES.LPG_BENEFICIARIES}\` b ON fraud.beneficiary_id = b.beneficiary_id
          WHERE fraud.risk_level IN ('HIGH', 'MEDIUM')
          GROUP BY b.residence_district
          ORDER BY anomaly_count DESC
        `;

        const result = await executeQuery<DistrictRisk>(query);

        const districts: DistrictRisk[] = result.rows.map(row => ({
            residence_district: row.residence_district,
            anomaly_count: Number(row.anomaly_count),
        }));

        this.cache.set(key, districts, CACHE_TTL.DISTRICT_RISK);

        return districts;
    }

    /**
     * Invalidate beneficiary cache
     */
    invalidateCache(): void {
        this.cache.invalidate('beneficiar*');
        console.log('[BeneficiaryService] Cache invalidated');
    }
}

// Singleton instance
let beneficiaryServiceInstance: BeneficiaryService | null = null;

export function getBeneficiaryService(): BeneficiaryService {
    if (!beneficiaryServiceInstance) {
        beneficiaryServiceInstance = new BeneficiaryService();
    }
    return beneficiaryServiceInstance;
}
