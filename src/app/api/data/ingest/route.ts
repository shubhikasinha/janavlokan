import { NextRequest, NextResponse } from 'next/server';
import {
    getBigQueryClient,
    TABLE_SCHEMAS,
    validateRowsAgainstSchema,
    coerceRow,
} from '@/lib/bigquery';

const MAX_ROWS = 10000;
const BATCH_SIZE = 500;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { targetTable, rows, columnMapping } = body as {
            targetTable: string;
            rows: Record<string, string>[];
            columnMapping: Record<string, string>; // csvHeader -> bqColumn
        };

        // 1. Validate target table
        const schema = TABLE_SCHEMAS[targetTable];
        if (!schema) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid target table "${targetTable}". Valid options: ${Object.keys(TABLE_SCHEMAS).join(', ')}`,
                },
                { status: 400 }
            );
        }

        // 2. Validate row count
        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No rows provided' },
                { status: 400 }
            );
        }

        if (rows.length > MAX_ROWS) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Row count ${rows.length} exceeds maximum of ${MAX_ROWS}. Please split your CSV into smaller files.`,
                },
                { status: 400 }
            );
        }

        // 3. Apply column mapping — remap CSV headers to BigQuery columns
        const mappedRows: Record<string, string>[] = rows.map(row => {
            const mapped: Record<string, string> = {};
            for (const [csvHeader, value] of Object.entries(row)) {
                const bqColumn = columnMapping[csvHeader];
                if (bqColumn && bqColumn !== '__skip__') {
                    mapped[bqColumn] = value;
                }
            }
            return mapped;
        });

        // 4. Validate against schema
        const validationErrors = validateRowsAgainstSchema(mappedRows, schema);
        if (validationErrors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    validationErrors: validationErrors.slice(0, 50),
                    totalErrors: validationErrors.length,
                },
                { status: 400 }
            );
        }

        // 5. Insert into BigQuery in batches
        const bigquery = getBigQueryClient();
        const [datasetId, tableId] = parseTableRef(schema.tableRef);

        let insertedCount = 0;
        let failedCount = 0;
        const batchErrors: { batch: number; error: string }[] = [];

        for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
            const batch = mappedRows.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

            try {
                const coercedBatch = batch.map(row => coerceRow(row, schema));

                await bigquery
                    .dataset(datasetId)
                    .table(tableId)
                    .insert(coercedBatch);

                insertedCount += batch.length;
            } catch (err) {
                const error = err as { errors?: { row: unknown; errors: { message: string }[] }[] };

                if (error.errors) {
                    // Partial failure — some rows may have been inserted
                    failedCount += error.errors.length;
                    insertedCount += batch.length - error.errors.length;
                    batchErrors.push({
                        batch: batchNumber,
                        error: `${error.errors.length} rows failed: ${error.errors[0]?.errors?.[0]?.message || 'Unknown error'}`,
                    });
                } else {
                    failedCount += batch.length;
                    batchErrors.push({
                        batch: batchNumber,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            insertedCount,
            failedCount,
            totalRows: mappedRows.length,
            batchErrors: batchErrors.slice(0, 10),
            targetTable: schema.displayName,
        });
    } catch (error) {
        console.error('[Ingest API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}

/**
 * Parse a full BigQuery table reference like "project.dataset.table"
 * into [dataset, table] for the client library.
 */
function parseTableRef(tableRef: string): [string, string] {
    const parts = tableRef.split('.');
    if (parts.length === 3) {
        return [parts[1], parts[2]];
    }
    // Fallback
    return [parts[0], parts[1] || parts[0]];
}
