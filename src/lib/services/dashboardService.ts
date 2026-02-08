/**
 * Dashboard Service
 * 
 * Centralizes all dashboard-related queries with caching.
 * Supports both LPG and MDM schemes.
 */

import {
    executeQuery,
    TABLES,
    SchemeType,
    DashboardSummary,
    RiskDistribution,
    MDMDashboardSummary,
} from '@/lib/bigquery';
import { getCacheService, cacheKey, CACHE_TTL } from '@/lib/cache';

export class DashboardService {
    private cache = getCacheService();

    /**
     * Get dashboard summary (total beneficiaries/schools, risk counts)
     */
    async getSummary(scheme: SchemeType): Promise<DashboardSummary | MDMDashboardSummary> {
        const key = cacheKey('dashboard', 'summary', scheme);

        // Check cache first
        const cached = this.cache.get<DashboardSummary | MDMDashboardSummary>(key);
        if (cached) {
            console.log(`[DashboardService] Cache HIT for ${key}`);
            return cached;
        }

        console.log(`[DashboardService] Cache MISS for ${key}, querying BigQuery`);

        if (scheme === 'MDM') {
            return this.getMDMSummary(key);
        }

        return this.getLPGSummary(key);
    }

    private async getLPGSummary(cacheKeyStr: string): Promise<DashboardSummary> {
        const query = `
      SELECT
        COUNT(*) AS total_beneficiaries,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk
      FROM \`${TABLES.LPG_FRAUD}\`
    `;

        const result = await executeQuery<{
            total_beneficiaries: number;
            high_risk: number;
            medium_risk: number;
            low_risk: number;
        }>(query);

        const summary: DashboardSummary = result.rows[0] ? {
            total_beneficiaries: Number(result.rows[0].total_beneficiaries),
            high_risk: Number(result.rows[0].high_risk),
            medium_risk: Number(result.rows[0].medium_risk),
            low_risk: Number(result.rows[0].low_risk),
        } : {
            total_beneficiaries: 0,
            high_risk: 0,
            medium_risk: 0,
            low_risk: 0,
        };

        // Cache the result
        this.cache.set(cacheKeyStr, summary, CACHE_TTL.DASHBOARD_SUMMARY);

        return summary;
    }

    private async getMDMSummary(cacheKeyStr: string): Promise<MDMDashboardSummary> {
        const query = `
      SELECT
        COUNT(*) AS total_schools,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk,
        SUM(total_meals_reported) AS total_meals_reported
      FROM \`${TABLES.MDM_FRAUD}\`
    `;

        const result = await executeQuery<{
            total_schools: number;
            high_risk: number;
            medium_risk: number;
            low_risk: number;
            total_meals_reported: number;
        }>(query);

        const summary: MDMDashboardSummary = result.rows[0] ? {
            total_schools: Number(result.rows[0].total_schools),
            high_risk: Number(result.rows[0].high_risk),
            medium_risk: Number(result.rows[0].medium_risk),
            low_risk: Number(result.rows[0].low_risk),
            total_meals_reported: Number(result.rows[0].total_meals_reported) || 0,
        } : {
            total_schools: 0,
            high_risk: 0,
            medium_risk: 0,
            low_risk: 0,
            total_meals_reported: 0,
        };

        this.cache.set(cacheKeyStr, summary, CACHE_TTL.DASHBOARD_SUMMARY);

        return summary;
    }

    /**
     * Get risk distribution for pie chart
     */
    async getDistribution(scheme: SchemeType): Promise<RiskDistribution[]> {
        const key = cacheKey('dashboard', 'distribution', scheme);

        const cached = this.cache.get<RiskDistribution[]>(key);
        if (cached) {
            console.log(`[DashboardService] Cache HIT for ${key}`);
            return cached;
        }

        console.log(`[DashboardService] Cache MISS for ${key}, querying BigQuery`);

        const table = scheme === 'MDM' ? TABLES.MDM_FRAUD : TABLES.LPG_FRAUD;

        const query = `
      SELECT 
        risk_level, 
        COUNT(*) AS count
      FROM \`${table}\`
      GROUP BY risk_level
      ORDER BY 
        CASE risk_level 
          WHEN 'HIGH' THEN 1 
          WHEN 'MEDIUM' THEN 2 
          WHEN 'LOW' THEN 3 
          ELSE 4 
        END
    `;

        const result = await executeQuery<{ risk_level: string; count: number }>(query);

        const distribution: RiskDistribution[] = result.rows.map(row => ({
            risk_level: row.risk_level || 'UNKNOWN',
            count: Number(row.count),
        }));

        this.cache.set(key, distribution, CACHE_TTL.DISTRIBUTION);

        return distribution;
    }

    /**
     * Invalidate all dashboard cache (called after batch refresh)
     */
    invalidateCache(): void {
        this.cache.invalidate('dashboard:*');
        console.log('[DashboardService] Cache invalidated');
    }
}

// Singleton instance
let dashboardServiceInstance: DashboardService | null = null;

export function getDashboardService(): DashboardService {
    if (!dashboardServiceInstance) {
        dashboardServiceInstance = new DashboardService();
    }
    return dashboardServiceInstance;
}
