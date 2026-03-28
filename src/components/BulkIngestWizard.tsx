'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ============================================
// Types (client-side mirrors of bigquery.ts)
// ============================================
interface ColumnSchema {
    name: string;
    type: 'STRING' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP';
    required: boolean;
    description: string;
}

interface TableSchema {
    displayName: string;
    description: string;
    columns: ColumnSchema[];
}

interface IngestResult {
    success: boolean;
    insertedCount?: number;
    failedCount?: number;
    totalRows?: number;
    batchErrors?: { batch: number; error: string }[];
    targetTable?: string;
    error?: string;
    validationErrors?: { row: number; column: string; message: string }[];
    totalErrors?: number;
}

// Client-side schema definitions (mirrors server-side TABLE_SCHEMAS)
const CLIENT_SCHEMAS: Record<string, TableSchema> = {
    LPG_TRANSACTIONS: {
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

// ============================================
// Step Definitions
// ============================================
const STEPS = [
    { id: 'upload', label: 'Upload CSV', icon: '1' },
    { id: 'target', label: 'Select Target', icon: '2' },
    { id: 'mapping', label: 'Map Columns', icon: '3' },
    { id: 'review', label: 'Review & Ingest', icon: '4' },
];

// ============================================
// CSV Parser
// ============================================
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h =>
        h.trim().replace(/^\ufeff/, '').replace(/['"]/g, '').toLowerCase()
    );

    const rows = lines.slice(1)
        .filter(line => line.trim().length > 0)
        .map(line => {
            const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
            const record: Record<string, string> = {};
            headers.forEach((header, idx) => {
                record[header] = values[idx] || '';
            });
            return record;
        });

    return { headers, rows };
}

// ============================================
// Main Component
// ============================================
export default function BulkIngestWizard() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number>(0);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
    const [targetTable, setTargetTable] = useState<string | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isIngesting, setIsIngesting] = useState(false);
    const [ingestResult, setIngestResult] = useState<IngestResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selectedSchema = targetTable ? CLIENT_SCHEMAS[targetTable] : null;

    // Auto-map CSV headers to BigQuery columns
    const autoMap = useCallback((headers: string[], schema: TableSchema) => {
        const mapping: Record<string, string> = {};
        for (const header of headers) {
            const normalized = header.toLowerCase().replace(/[\s_-]+/g, '_');
            const match = schema.columns.find(col => {
                const colNorm = col.name.toLowerCase();
                return colNorm === normalized
                    || normalized.includes(colNorm)
                    || colNorm.includes(normalized);
            });
            mapping[header] = match ? match.name : '__skip__';
        }
        return mapping;
    }, []);

    // Handle file upload
    const processFile = useCallback(async (file: File) => {
        setError(null);
        setIngestResult(null);
        setFileName(file.name);
        setFileSize(file.size);

        try {
            const text = await file.text();
            const { headers, rows } = parseCSV(text);

            if (rows.length === 0) {
                setError('No data rows found in CSV');
                return;
            }

            if (rows.length > 10000) {
                setError(`File contains ${rows.length.toLocaleString()} rows. Maximum allowed is 10,000. Please split your file.`);
                return;
            }

            setCsvHeaders(headers);
            setCsvRows(rows);
            setCurrentStep(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read file');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
            processFile(file);
        } else {
            setError('Please upload a CSV file');
        }
    }, [processFile]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    // Select target table
    const handleSelectTarget = useCallback((tableKey: string) => {
        setTargetTable(tableKey);
        const schema = CLIENT_SCHEMAS[tableKey];
        if (schema) {
            setColumnMapping(autoMap(csvHeaders, schema));
        }
        setCurrentStep(2);
    }, [csvHeaders, autoMap]);

    // Update column mapping
    const handleMappingChange = useCallback((csvHeader: string, bqColumn: string) => {
        setColumnMapping(prev => ({ ...prev, [csvHeader]: bqColumn }));
    }, []);

    // Required columns that are unmapped
    const unmappedRequired = useMemo(() => {
        if (!selectedSchema) return [];
        const mappedBqCols = new Set(Object.values(columnMapping).filter(v => v !== '__skip__'));
        return selectedSchema.columns
            .filter(c => c.required && !mappedBqCols.has(c.name))
            .map(c => c.name);
    }, [selectedSchema, columnMapping]);

    // Submit ingestion
    const handleIngest = async () => {
        if (!targetTable || csvRows.length === 0) return;

        setIsIngesting(true);
        setError(null);
        setIngestResult(null);

        try {
            const response = await fetch('/api/data/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetTable,
                    rows: csvRows,
                    columnMapping,
                }),
            });

            const data: IngestResult = await response.json();
            setIngestResult(data);

            if (data.success) {
                setCurrentStep(3);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ingestion failed');
        } finally {
            setIsIngesting(false);
        }
    };

    // Reset wizard
    const handleReset = () => {
        setCurrentStep(0);
        setFileName(null);
        setFileSize(0);
        setCsvHeaders([]);
        setCsvRows([]);
        setTargetTable(null);
        setColumnMapping({});
        setIngestResult(null);
        setError(null);
    };

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-6">
            {/* Step Indicator */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, idx) => (
                        <React.Fragment key={step.id}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                                    idx < currentStep
                                        ? 'bg-green-500 text-white'
                                        : idx === currentStep
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {idx < currentStep ? '✓' : step.icon}
                                </div>
                                <div className="hidden sm:block">
                                    <p className={`text-sm font-semibold ${idx <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {step.label}
                                    </p>
                                </div>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all duration-500 ${
                                    idx < currentStep ? 'bg-green-500' : 'bg-gray-200'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-red-800">{error}</p>
                        {ingestResult?.validationErrors && (
                            <div className="mt-2 max-h-40 overflow-y-auto">
                                {ingestResult.validationErrors.slice(0, 10).map((ve, i) => (
                                    <p key={i} className="text-xs text-red-600 mt-1">
                                        Row {ve.row}, Column &quot;{ve.column}&quot;: {ve.message}
                                    </p>
                                ))}
                                {(ingestResult.totalErrors || 0) > 10 && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">
                                        ...and {(ingestResult.totalErrors || 0) - 10} more errors
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* ---- STEP 0: Upload ---- */}
                {currentStep === 0 && (
                    <div className="p-8">
                        <h2 className="text-xl font-heading font-bold text-gray-900 mb-2">Upload CSV File</h2>
                        <p className="text-gray-500 text-sm mb-6">Select or drag a CSV file to begin. Maximum 10,000 rows per upload.</p>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer
                                ${isDragging
                                    ? 'border-primary bg-primary/5 scale-[1.01]'
                                    : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
                                }`}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                id="csv-upload-input"
                            />
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <p className="text-base font-semibold text-gray-800 mb-1">
                                {isDragging ? 'Drop your CSV file here' : 'Drop CSV file here or click to browse'}
                            </p>
                            <p className="text-sm text-gray-500">
                                Supports comma-separated values (.csv) up to 10,000 rows
                            </p>
                        </div>

                        {/* Format hints */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(CLIENT_SCHEMAS).map(([key, schema]) => (
                                <div key={key} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{schema.displayName}</h4>
                                    <p className="text-xs text-gray-500 mb-2">{schema.description}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">
                                        {schema.columns.filter(c => c.required).map(c => c.name).join(', ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- STEP 1: Select Target ---- */}
                {currentStep === 1 && (
                    <div className="p-8">
                        <h2 className="text-xl font-heading font-bold text-gray-900 mb-1">Select Destination Table</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Uploading <strong className="text-gray-700">{fileName}</strong> ({csvRows.length.toLocaleString()} rows, {csvHeaders.length} columns)
                        </p>

                        {/* CSV Preview */}
                        <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Data Preview (first 3 rows)</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {csvHeaders.map(h => (
                                                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {csvRows.slice(0, 3).map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                {csvHeaders.map(h => (
                                                    <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{row[h] || '-'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(CLIENT_SCHEMAS).map(([key, schema]) => (
                                <button
                                    key={key}
                                    onClick={() => handleSelectTarget(key)}
                                    className={`text-left p-5 rounded-xl border-2 transition-all duration-200 hover:shadow-md
                                        ${targetTable === key
                                            ? 'border-primary bg-primary/5 shadow-md'
                                            : 'border-gray-200 hover:border-primary/40'
                                        }`}
                                >
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                                        {key === 'LPG_TRANSACTIONS' && (
                                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        )}
                                        {key === 'MDM_DAILY_RECORDS' && (
                                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        )}
                                        {key === 'AUDIT_TRAIL' && (
                                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 mb-1">{schema.displayName}</h3>
                                    <p className="text-xs text-gray-500">{schema.description}</p>
                                    <p className="text-xs text-primary/70 mt-2 font-medium">
                                        {schema.columns.length} columns ({schema.columns.filter(c => c.required).length} required)
                                    </p>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-between">
                            <button onClick={() => setCurrentStep(0)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                ← Back to upload
                            </button>
                        </div>
                    </div>
                )}

                {/* ---- STEP 2: Column Mapping ---- */}
                {currentStep === 2 && selectedSchema && (
                    <div className="p-8">
                        <h2 className="text-xl font-heading font-bold text-gray-900 mb-1">Map Columns</h2>
                        <p className="text-gray-500 text-sm mb-6">
                            Map your CSV columns to <strong className="text-gray-700">{selectedSchema.displayName}</strong> fields. Required fields are marked with *.
                        </p>

                        {/* Mapping Table */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                <div className="col-span-3">CSV Column</div>
                                <div className="col-span-1 text-center">→</div>
                                <div className="col-span-4">BigQuery Column</div>
                                <div className="col-span-4">Sample Data</div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {csvHeaders.map(header => {
                                    const mappedTo = columnMapping[header] || '__skip__';
                                    const mappedCol = selectedSchema.columns.find(c => c.name === mappedTo);
                                    return (
                                        <div key={header} className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 transition-colors">
                                            <div className="col-span-3">
                                                <code className="text-sm font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded">{header}</code>
                                            </div>
                                            <div className="col-span-1 text-center">
                                                <span className={`text-lg ${mappedTo === '__skip__' ? 'text-gray-300' : 'text-green-500'}`}>→</span>
                                            </div>
                                            <div className="col-span-4">
                                                <select
                                                    value={mappedTo}
                                                    onChange={(e) => handleMappingChange(header, e.target.value)}
                                                    className={`w-full text-sm px-3 py-2 border rounded-lg transition-colors ${
                                                        mappedTo === '__skip__'
                                                            ? 'border-gray-200 text-gray-400 bg-gray-50'
                                                            : 'border-green-300 text-gray-800 bg-green-50'
                                                    }`}
                                                >
                                                    <option value="__skip__">— Skip this column —</option>
                                                    {selectedSchema.columns.map(col => (
                                                        <option key={col.name} value={col.name}>
                                                            {col.name} {col.required ? '*' : ''} ({col.type})
                                                        </option>
                                                    ))}
                                                </select>
                                                {mappedCol && (
                                                    <p className="text-[10px] text-gray-400 mt-1">{mappedCol.description}</p>
                                                )}
                                            </div>
                                            <div className="col-span-4">
                                                <div className="flex gap-1 flex-wrap">
                                                    {csvRows.slice(0, 3).map((row, i) => (
                                                        <span key={i} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono truncate max-w-[120px]">
                                                            {row[header] || '—'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Unmapped Required Warning */}
                        {unmappedRequired.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                                <p className="text-sm font-medium text-amber-800">
                                    ⚠️ Required columns not mapped: <strong>{unmappedRequired.join(', ')}</strong>
                                </p>
                                <p className="text-xs text-amber-600 mt-1">
                                    These columns must be mapped before ingestion can proceed.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center">
                            <button onClick={() => setCurrentStep(1)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                ← Back to target selection
                            </button>
                            <button
                                onClick={() => setCurrentStep(3)}
                                disabled={unmappedRequired.length > 0}
                                className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                Review & Ingest →
                            </button>
                        </div>
                    </div>
                )}

                {/* ---- STEP 3: Review & Ingest ---- */}
                {currentStep === 3 && selectedSchema && (
                    <div className="p-8">
                        {ingestResult?.success ? (
                            /* -- Success State -- */
                            <div className="text-center py-8">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-heading font-bold text-gray-900 mb-2">Ingestion Complete!</h2>
                                <p className="text-gray-500 mb-6">
                                    Data has been successfully loaded into {ingestResult.targetTable}.
                                </p>

                                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
                                    <div className="bg-green-50 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-green-700">{ingestResult.insertedCount?.toLocaleString()}</p>
                                        <p className="text-xs text-green-600 font-medium uppercase">Inserted</p>
                                    </div>
                                    <div className="bg-red-50 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-red-700">{ingestResult.failedCount?.toLocaleString()}</p>
                                        <p className="text-xs text-red-600 font-medium uppercase">Failed</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-4">
                                        <p className="text-2xl font-bold text-blue-700">{ingestResult.totalRows?.toLocaleString()}</p>
                                        <p className="text-xs text-blue-600 font-medium uppercase">Total</p>
                                    </div>
                                </div>

                                {ingestResult.batchErrors && ingestResult.batchErrors.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-lg mx-auto mb-6 text-left">
                                        <p className="text-sm font-medium text-amber-800 mb-2">Batch Errors:</p>
                                        {ingestResult.batchErrors.map((be, i) => (
                                            <p key={i} className="text-xs text-amber-600">Batch {be.batch}: {be.error}</p>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={handleReset}
                                    className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-sm"
                                >
                                    Ingest Another File
                                </button>
                            </div>
                        ) : (
                            /* -- Review State -- */
                            <>
                                <h2 className="text-xl font-heading font-bold text-gray-900 mb-1">Review & Ingest</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    Confirm the details below, then click &quot;Start Ingestion&quot; to load data into BigQuery.
                                </p>

                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-medium">File</p>
                                        <p className="text-sm font-semibold text-gray-800 truncate">{fileName}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Target</p>
                                        <p className="text-sm font-semibold text-gray-800">{selectedSchema.displayName}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Rows</p>
                                        <p className="text-sm font-semibold text-gray-800">{csvRows.length.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-medium">Size</p>
                                        <p className="text-sm font-semibold text-gray-800">{(fileSize / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>

                                {/* Column Mapping Summary */}
                                <div className="border border-gray-200 rounded-lg mb-6 overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Column Mapping Summary</p>
                                    </div>
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {Object.entries(columnMapping)
                                            .filter(([, bq]) => bq !== '__skip__')
                                            .map(([csv, bq]) => (
                                                <span key={csv} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-800 border border-green-200 px-2 py-1 rounded-full">
                                                    <span className="font-mono">{csv}</span>
                                                    <span className="text-green-400">→</span>
                                                    <span className="font-semibold">{bq}</span>
                                                </span>
                                            ))}
                                        {Object.entries(columnMapping)
                                            .filter(([, bq]) => bq === '__skip__')
                                            .map(([csv]) => (
                                                <span key={csv} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full line-through">
                                                    {csv}
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-between items-center">
                                    <button onClick={() => setCurrentStep(2)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                                        ← Back to column mapping
                                    </button>
                                    <button
                                        onClick={handleIngest}
                                        disabled={isIngesting}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
                                    >
                                        {isIngesting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                Ingesting {csvRows.length.toLocaleString()} rows...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Start Ingestion
                                            </>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
