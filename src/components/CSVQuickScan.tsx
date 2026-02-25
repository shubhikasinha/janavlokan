'use client';

import React, { useState, useCallback } from 'react';

interface ScanResult {
    beneficiary_id: string;
    risk_level: string;
    risk_score: number;
    flags: string[];
}

interface ScanSummary {
    total: number;
    high_risk: number;
    medium_risk: number;
    low_risk: number;
}

interface ScanResponse {
    success: boolean;
    mode?: string;
    summary?: ScanSummary;
    results?: ScanResult[];
    total_processed?: number;
    error?: string;
    expected_columns?: string[];
}

export default function CSVQuickScan() {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [results, setResults] = useState<ScanResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^\ufeff/, '').toLowerCase().replace(/['"]/g, ''));

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
            const record: Record<string, string> = {};
            headers.forEach((header, idx) => {
                record[header] = values[idx] || '';
            });
            return record;
        });
    };

    const processFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setError(null);
        setResults(null);
        setFileName(file.name);

        try {
            const text = await file.text();
            const records = parseCSV(text);

            if (records.length === 0) {
                setError('No valid records found in CSV');
                setIsProcessing(false);
                return;
            }

            const response = await fetch('/api/predict/quick-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ records }),
            });

            const data: ScanResponse = await response.json();

            if (!data.success) {
                setError(data.error || 'Scan failed');
                if (data.expected_columns) {
                    setError(`${data.error}\n\nExpected columns: ${data.expected_columns.join(', ')}`);
                }
            } else {
                setResults(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process file');
        } finally {
            setIsProcessing(false);
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
        if (file) {
            processFile(file);
        }
    }, [processFile]);

    const getRiskBadgeStyle = (level: string) => {
        switch (level) {
            case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
            case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const resetScan = () => {
        setResults(null);
        setError(null);
        setFileName(null);
    };

    return (
        <div className="bg-white border-2 border-dashed border-[#830f0030] rounded-xl p-6 transition-all hover:border-[#830f0050]">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#830f0010] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#830f00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-heading font-bold text-[#2f0400]">CSV Quick Scan</h3>
                    <p className="text-xs text-gray-500">Real-time fraud detection using AI</p>
                </div>
            </div>

            {!results ? (
                <>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
              ${isDragging ? 'border-[#830f00] bg-[#830f0005]' : 'border-gray-300 hover:border-[#830f0050]'}
              ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isProcessing}
                        />

                        {isProcessing ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#830f00] border-t-transparent"></div>
                                <p className="text-sm text-gray-600">Analyzing {fileName}...</p>
                            </div>
                        ) : (
                            <>
                                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm font-medium text-gray-700 mb-1">
                                    Drop CSV file here or click to upload
                                </p>
                                <p className="text-xs text-gray-500">
                                    Supports LPG beneficiary transaction data
                                </p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                        </div>
                    )}

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-600 mb-2">Expected CSV Format:</p>
                        <code className="text-[10px] text-gray-500 block overflow-x-auto">
                            beneficiary_id, avg_amount, cross_district_txns, total_txns, txns_last_30d, unique_dealers
                        </code>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-gray-900">{results.summary?.total}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Total</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-red-600">{results.summary?.high_risk}</div>
                            <div className="text-[10px] text-red-600 uppercase">High Risk</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-amber-600">{results.summary?.medium_risk}</div>
                            <div className="text-[10px] text-amber-600 uppercase">Medium</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-green-600">{results.summary?.low_risk}</div>
                            <div className="text-[10px] text-green-600 uppercase">Low Risk</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                            {results.mode === 'vertex_ai' ? '⚡ Vertex AI' : '🔧 Rule-Based'}
                        </span>
                        <button
                            onClick={resetScan}
                            className="text-xs text-[#830f00] hover:underline"
                        >
                            Scan Another File
                        </button>
                    </div>

                    {results.results && results.results.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">ID</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">Risk</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-600">Flags</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.results.slice(0, 10).map((r, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2 font-mono">{r.beneficiary_id}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getRiskBadgeStyle(r.risk_level)}`}>
                                                    {r.risk_level}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-500">
                                                {r.flags.length > 0 ? r.flags.join(', ') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {results.results.length > 10 && (
                                <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                                    Showing 10 of {results.results.length} results
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
