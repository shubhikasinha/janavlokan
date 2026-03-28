'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuditReport, REPORT_TEMPLATES, ReportTemplateType } from '@/types/report';
import {
    getStoredReports,
    createNewReport,
    saveReport,
    deleteReport as deleteReportFromStorage,
    duplicateReport
} from '@/lib/reportStorage';
import { exportToPDF, exportToDOCX } from '@/lib/reportExport';

const ReportsPage = () => {
    const router = useRouter();
    const [reports, setReports] = useState<AuditReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    useEffect(() => {
        setReports(getStoredReports());
        setIsLoading(false);
    }, []);

    const handleCreateFromTemplate = (templateType: ReportTemplateType) => {
        const template = REPORT_TEMPLATES.find(t => t.type === templateType);
        const newReport = createNewReport(
            template?.schemeDefault || 'LPG_SUBSIDY',
            templateType
        );
        saveReport(newReport);
        setShowTemplateModal(false);
        router.push(`/reports/${newReport.id}`);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this report?')) {
            deleteReportFromStorage(id);
            setReports(getStoredReports());
        }
    };

    const handleDuplicate = (id: string) => {
        const duplicated = duplicateReport(id);
        if (duplicated) {
            setReports(getStoredReports());
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'in_review': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'final': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getSchemeLabel = (scheme: string) => {
        return scheme === 'LPG_SUBSIDY' ? 'LPG Subsidy' : 'Mid-Day Meal';
    };

    return (
        <main className="min-h-screen bg-neutral-lightest">
            {/* Header Section */}
            <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <nav className="text-sm text-accent-light mb-2">
                                <Link href="/" className="hover:underline">Home</Link>
                                <span className="mx-2">/</span>
                                <span>Audit Reports</span>
                            </nav>
                            <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
                                Audit Report Builder
                            </h1>
                            <p className="text-accent-light text-lg">
                                Create, edit, and export professional audit reports with pre-built templates
                            </p>
                        </div>

                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="bg-accent hover:bg-accent-light text-primary font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Report
                        </button>
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Reports List */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <h2 className="text-xl font-heading font-semibold text-primary mb-6">
                        Your Reports
                    </h2>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-700 mb-2">
                                No reports yet
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Create your first audit report using a professional template
                            </p>
                            <button
                                onClick={() => setShowTemplateModal(true)}
                                className="bg-primary hover:bg-primary-dark text-white font-medium py-3 px-6 rounded-lg shadow-md transition-all duration-200"
                            >
                                Choose a Template
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reports.map((report) => (
                                <div
                                    key={report.id}
                                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary/30 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium text-gray-900 truncate">
                                                {report.title || 'Untitled Report'}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                <span>{getSchemeLabel(report.schemeType)}</span>
                                                <span>•</span>
                                                <span>
                                                    Updated {new Date(report.updatedAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                {report.reportNumber && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-mono text-xs">{report.reportNumber}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                                            {report.status.replace('_', ' ').toUpperCase()}
                                        </span>

                                        <div className="flex items-center gap-1">
                                            <Link
                                                href={`/reports/${report.id}`}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => handleDuplicate(report.id)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Duplicate"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>

                                            {/* Export Dropdown */}
                                            <div className="relative group">
                                                <button
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Export"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </button>
                                                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                                    <button
                                                        onClick={() => exportToPDF(report)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                        </svg>
                                                        Export as PDF
                                                    </button>
                                                    <button
                                                        onClick={() => exportToDOCX(report)}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg transition-colors flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                        </svg>
                                                        Export as DOCX
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                {reports.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {reports.filter(r => r.status === 'draft').length}
                                    </p>
                                    <p className="text-sm text-gray-500">Drafts</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {reports.filter(r => r.status === 'in_review').length}
                                    </p>
                                    <p className="text-sm text-gray-500">In Review</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {reports.filter(r => r.status === 'final').length}
                                    </p>
                                    <p className="text-sm text-gray-500">Finalized</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Selection Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowTemplateModal(false)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-heading font-bold text-gray-900">Choose a Report Template</h2>
                                    <p className="text-sm text-gray-500 mt-1">Select a template to get started with pre-filled professional content</p>
                                </div>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {REPORT_TEMPLATES.map((template) => (
                                <button
                                    key={template.type}
                                    onClick={() => handleCreateFromTemplate(template.type)}
                                    className={`text-left p-5 rounded-xl border-2 border-gray-200 hover:border-primary/50 hover:shadow-lg transition-all duration-200 group ${template.color}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {template.icon && <div className="text-3xl">{template.icon}</div>}
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                                                {template.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {template.description}
                                            </p>
                                            {template.type !== 'blank' && (
                                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="px-2 py-0.5 bg-white/80 rounded-full border border-gray-200">
                                                        {template.schemeDefault === 'LPG_SUBSIDY' ? 'LPG Subsidy' : 'Mid-Day Meal'}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-white/80 rounded-full border border-gray-200">
                                                        3 pre-filled findings
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <svg className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ReportsPage;
