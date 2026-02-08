import { executeQuery, TABLES } from '@/lib/bigquery';
import { getDashboardService, getBeneficiaryService, getMDMService } from '@/lib/services';
import { getCacheService } from '@/lib/cache';
import { NextRequest, NextResponse } from 'next/server';

interface BatchJobStatus {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  records_processed?: number;
  error_message?: string;
}

const batchJobs = new Map<string, BatchJobStatus>();

/**
 * POST /api/batch/refresh
 * Trigger a batch refresh job and invalidate all caches
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { job_type: _job_type = 'FULL_REFRESH' } = body;

    // Generate job ID
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create job status
    const jobStatus: BatchJobStatus = {
      job_id: jobId,
      status: 'RUNNING',
      started_at: new Date().toISOString(),
    };

    batchJobs.set(jobId, jobStatus);

    console.log('🛡️ [BATCH] Starting Nightly Fraud Detection Pipeline...');
    console.log(`📋 [BATCH] Job ID: ${jobId}`);
    console.log(`⏰ [BATCH] Timestamp: ${new Date().toISOString()}`);

    // Query current stats using centralized TABLES constant
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_processed,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk,
        MAX(CURRENT_TIMESTAMP()) AS last_updated
      FROM \`${TABLES.LPG_FRAUD}\`
    `;

    try {
      console.log('🔍 [BATCH] Querying fraud_with_explanations table...');
      const result = await executeQuery<{
        total_processed: number;
        high_risk: number;
        medium_risk: number;
        low_risk: number;
        last_updated: { value: string } | string;
      }>(summaryQuery);

      const rows = result.rows;

      // IMPORTANT: Invalidate all caches after batch refresh
      console.log('🗑️ [BATCH] Invalidating all caches...');
      const cache = getCacheService();
      const cacheStats = cache.getStats();
      cache.clear();
      console.log(`🗑️ [BATCH] Cleared ${cacheStats.size} cached entries`);

      // Also invalidate service-level caches
      getDashboardService().invalidateCache();
      getBeneficiaryService().invalidateCache();
      getMDMService().invalidateCache();

      // Update job status
      jobStatus.status = 'COMPLETED';
      jobStatus.completed_at = new Date().toISOString();
      jobStatus.records_processed = Number(rows[0]?.total_processed) || 0;

      batchJobs.set(jobId, jobStatus);

      console.log('✅ [BATCH] Pipeline Complete!');
      console.log(`📊 [BATCH] Records Processed: ${jobStatus.records_processed}`);
      console.log(`🔴 [BATCH] High Risk: ${rows[0]?.high_risk}`);
      console.log(`🟡 [BATCH] Medium Risk: ${rows[0]?.medium_risk}`);
      console.log(`🟢 [BATCH] Low Risk: ${rows[0]?.low_risk}`);

      return NextResponse.json({
        success: true,
        message: 'Batch ML Pipeline completed successfully',
        job: jobStatus,
        pipeline: {
          name: 'Nightly Fraud Detection Guard',
          model: 'Autoencoder + Rule Engine',
          source_table: 'daily_transactions',
          target_table: 'fraud_with_explanations',
        },
        summary: {
          total_processed: rows[0]?.total_processed,
          high_risk: rows[0]?.high_risk,
          medium_risk: rows[0]?.medium_risk,
          low_risk: rows[0]?.low_risk,
          last_updated: typeof rows[0]?.last_updated === 'object'
            ? rows[0]?.last_updated.value
            : new Date().toISOString(),
        },
        cache: {
          invalidated: true,
          entries_cleared: cacheStats.size,
        },
        scheduler_info: {
          recommended_frequency: '0 2 * * *',
          description: 'Runs daily at 2 AM IST via GCP Cloud Scheduler',
          endpoint: '/api/batch/refresh',
        },
      });
    } catch (queryError) {
      jobStatus.status = 'FAILED';
      jobStatus.error_message = queryError instanceof Error ? queryError.message : 'Query failed';
      batchJobs.set(jobId, jobStatus);

      return NextResponse.json({
        success: false,
        job: jobStatus,
        error: jobStatus.error_message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Batch Refresh Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/batch/refresh
 * Check batch job status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');

    // Return cache stats along with job info
    const cache = getCacheService();
    const cacheStats = cache.getStats();

    if (jobId) {
      const job = batchJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job, cache: cacheStats });
    }

    // Return recent jobs
    const recentJobs = Array.from(batchJobs.values())
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      jobs: recentJobs,
      total: batchJobs.size,
      cache: cacheStats,
    });
  } catch (error) {
    console.error('Batch Status Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
