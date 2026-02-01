import { getBigQueryClient } from '@/lib/bigquery';
import { NextRequest, NextResponse } from 'next/server';

interface BatchJobStatus {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  records_processed?: number;
  error_message?: string;
}

// Simulated batch job status storage (in production, use Redis or DB)
const batchJobs = new Map<string, BatchJobStatus>();

// POST: Trigger a batch refresh job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { job_type: _job_type = 'FULL_REFRESH' } = body;

    const bigquery = getBigQueryClient();

    // Generate job ID
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create job status
    const jobStatus: BatchJobStatus = {
      job_id: jobId,
      status: 'RUNNING',
      started_at: new Date().toISOString(),
    };

    batchJobs.set(jobId, jobStatus);

    // In a real system, this would trigger:
    // 1. Dataflow pipeline to process new transactions
    // 2. Vertex AI batch prediction job
    // 3. Update fraud_with_explanations table

    // For demo: Run a simple aggregation query to simulate processing
    const simulationQuery = `
      -- Simulated batch job: Recompute risk statistics
      -- In production, this would be a full ML pipeline
      SELECT
        COUNT(*) AS total_processed,
        COUNTIF(risk_level = 'HIGH') AS high_risk,
        COUNTIF(risk_level = 'MEDIUM') AS medium_risk,
        COUNTIF(risk_level = 'LOW') AS low_risk,
        CURRENT_TIMESTAMP() AS last_updated
      FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
    `;

    try {
      const [job] = await bigquery.createQueryJob({ query: simulationQuery });
      const [rows] = await job.getQueryResults();

      // Update job status
      jobStatus.status = 'COMPLETED';
      jobStatus.completed_at = new Date().toISOString();
      jobStatus.records_processed = Number(rows[0]?.total_processed) || 0;

      batchJobs.set(jobId, jobStatus);

      return NextResponse.json({
        success: true,
        message: 'Batch refresh completed',
        job: jobStatus,
        summary: {
          total_processed: rows[0]?.total_processed,
          high_risk: rows[0]?.high_risk,
          medium_risk: rows[0]?.medium_risk,
          low_risk: rows[0]?.low_risk,
          last_updated: rows[0]?.last_updated?.value || new Date().toISOString(),
        },
        note: 'In production, this triggers Vertex AI batch prediction pipeline',
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

// GET: Check batch job status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('job_id');

    if (jobId) {
      const job = batchJobs.get(jobId);
      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job });
    }

    // Return recent jobs
    const recentJobs = Array.from(batchJobs.values())
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      jobs: recentJobs,
      total: batchJobs.size,
    });
  } catch (error) {
    console.error('Batch Status Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
