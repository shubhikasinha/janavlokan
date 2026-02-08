'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    AuditReport,
    REPORT_SECTIONS,
    SectionMeta,
    CAG_TEMPLATE_PREFACE,
    CAG_TEMPLATE_INTRO,
    AuditFinding,
    LinkedTransaction
} from '@/types/report';
import { getReportById, saveReport } from '@/lib/reportStorage';
import FindingsPanel from './FindingsPanel';
import TransactionLinker from './TransactionLinker';

const CollaborativeEditor = dynamic(() => import('./CollaborativeEditor'), {
    ssr: false,
    loading: () => (
        <div className="border border-gray-200 rounded-lg bg-white h-[400px] animate-pulse flex items-center justify-center">
            <span className="text-gray-400">Loading collaborative editor...</span>
        </div>
    ),
});

const TipTapEditor = dynamic(() => import('./TipTapEditor'), {
    ssr: false,
    loading: () => (
        <div className="border border-gray-200 rounded-lg bg-white h-[300px] animate-pulse flex items-center justify-center">
            <span className="text-gray-400">Loading editor...</span>
        </div>
    ),
});

interface ReportBuilderProps {
    reportId: string;
}

// Icon components
const Icons: Record<string, React.FC<{ className?: string }>> = {
    'info': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    'file-text': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    'clipboard': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
    ),
    'book-open': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    ),
    'settings': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    'alert-triangle': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    'check-circle': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    'flag': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
    ),
    'paperclip': ({ className }) => (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
    ),
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({ reportId }) => {
    const router = useRouter();
    const [report, setReport] = useState<AuditReport | null>(null);
    const [activeSection, setActiveSection] = useState<string>('metadata');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [linkerOpen, setLinkerOpen] = useState(false);
    const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
    const [collaborativeMode, setCollaborativeMode] = useState(false);

    // Load report
    useEffect(() => {
        const loaded = getReportById(reportId);
        if (loaded) {
            setReport(loaded);
        }
    }, [reportId]);

    // Auto-save function
    const handleSave = useCallback(() => {
        if (!report) return;

        setIsSaving(true);
        saveReport(report);
        setLastSaved(new Date());
        setIsSaving(false);
    }, [report]);

    // Auto-save on changes (debounced)
    useEffect(() => {
        if (!report) return;

        const timer = setTimeout(() => {
            handleSave();
        }, 2000);

        return () => clearTimeout(timer);
    }, [report, handleSave]);

    const updateReportField = <K extends keyof AuditReport>(field: K, value: AuditReport[K]) => {
        if (!report) return;
        setReport({ ...report, [field]: value });
    };

    const updateSection = (sectionKey: string, content: string) => {
        if (!report) return;
        setReport({
            ...report,
            sections: {
                ...report.sections,
                [sectionKey]: content,
            },
        });
    };

    const applyTemplate = (sectionKey: string) => {
        if (sectionKey === 'preface') {
            updateSection('preface', CAG_TEMPLATE_PREFACE);
        } else if (sectionKey === 'introduction') {
            updateSection('introduction', CAG_TEMPLATE_INTRO);
        }
    };

    if (!report) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading report...</p>
                </div>
            </div>
        );
    }

    const renderIcon = (iconName: string, className: string = 'w-5 h-5') => {
        const IconComponent = Icons[iconName];
        return IconComponent ? <IconComponent className={className} /> : null;
    };

    const renderMetadataSection = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Number</label>
                    <input
                        type="text"
                        value={report.reportNumber}
                        onChange={(e) => updateReportField('reportNumber', e.target.value)}
                        placeholder="e.g., CA/LPG/2024-25/01"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scheme Type</label>
                    <select
                        value={report.schemeType}
                        onChange={(e) => updateReportField('schemeType', e.target.value as 'LPG_SUBSIDY' | 'MID_DAY_MEAL')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    >
                        <option value="LPG_SUBSIDY">LPG Subsidy Scheme</option>
                        <option value="MID_DAY_MEAL">Mid-Day Meal Scheme</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Title</label>
                <input
                    type="text"
                    value={report.title}
                    onChange={(e) => updateReportField('title', e.target.value)}
                    placeholder="e.g., Compliance Audit Report on LPG Subsidy Scheme"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                <input
                    type="text"
                    value={report.author}
                    onChange={(e) => updateReportField('author', e.target.value)}
                    placeholder="e.g., Senior Audit Officer"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audit Period Start</label>
                    <input
                        type="date"
                        value={report.auditPeriod.startDate}
                        onChange={(e) => updateReportField('auditPeriod', { ...report.auditPeriod, startDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Audit Period End</label>
                    <input
                        type="date"
                        value={report.auditPeriod.endDate}
                        onChange={(e) => updateReportField('auditPeriod', { ...report.auditPeriod, endDate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                        type="text"
                        value={report.auditRegion.state || ''}
                        onChange={(e) => updateReportField('auditRegion', { ...report.auditRegion, state: e.target.value })}
                        placeholder="e.g., Maharashtra"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">District (Optional)</label>
                    <input
                        type="text"
                        value={report.auditRegion.district || ''}
                        onChange={(e) => updateReportField('auditRegion', { ...report.auditRegion, district: e.target.value })}
                        placeholder="e.g., Pune"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex gap-3">
                    {(['draft', 'in_review', 'final'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => updateReportField('status', status)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${report.status === status
                                ? status === 'draft' ? 'bg-yellow-500 text-white'
                                    : status === 'in_review' ? 'bg-blue-500 text-white'
                                        : 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const handleOpenLinker = (findingId: string) => {
        setActiveFindingId(findingId);
        setLinkerOpen(true);
    };

    const handleLinkTransactions = (transactions: LinkedTransaction[]) => {
        if (!report || !activeFindingId) return;

        // Add new transactions to report
        const newLinkedTransactions = [...report.linkedTransactions];
        transactions.forEach(tx => {
            if (!newLinkedTransactions.find(t => t.transactionId === tx.transactionId)) {
                newLinkedTransactions.push(tx);
            }
        });

        // Link transaction IDs to the active finding
        const updatedFindings = report.sections.findings.map(f => {
            if (f.id === activeFindingId) {
                const newIds = [...f.linkedTransactionIds];
                transactions.forEach(tx => {
                    if (!newIds.includes(tx.transactionId)) {
                        newIds.push(tx.transactionId);
                    }
                });
                return { ...f, linkedTransactionIds: newIds };
            }
            return f;
        });

        setReport({
            ...report,
            linkedTransactions: newLinkedTransactions,
            sections: {
                ...report.sections,
                findings: updatedFindings,
            },
        });
    };

    const handleUpdateFindings = (findings: AuditFinding[]) => {
        if (!report) return;
        setReport({
            ...report,
            sections: {
                ...report.sections,
                findings,
            },
        });
    };

    const renderTextSection = (sectionKey: string, section: SectionMeta) => {
        const content = report.sections[sectionKey as keyof typeof report.sections];
        if (typeof content !== 'string') return null;

        const hasTemplate = sectionKey === 'preface' || sectionKey === 'introduction';

        return (
            <div className="space-y-4">
                {hasTemplate && !content && (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                        <p className="text-sm text-gray-700 mb-3">
                            Use the CAG-style template to get started quickly
                        </p>
                        <button
                            onClick={() => applyTemplate(sectionKey)}
                            className="bg-accent hover:bg-accent-light text-primary font-medium py-2 px-4 rounded-lg transition-all text-sm"
                        >
                            Apply Template
                        </button>
                    </div>
                )}
                {collaborativeMode ? (
                    <CollaborativeEditor
                        roomId={`${reportId}-${sectionKey}`}
                        userName="Auditor"
                        placeholder={`Write ${section.label.toLowerCase()} content...`}
                    />
                ) : (
                    <TipTapEditor
                        content={content}
                        onChange={(newContent) => updateSection(sectionKey, newContent)}
                        placeholder={`Write ${section.label.toLowerCase()} content...`}
                    />
                )}
            </div>
        );
    };

    const renderActiveContent = () => {
        if (activeSection === 'metadata') {
            return renderMetadataSection();
        }

        if (activeSection === 'findings') {
            return (
                <FindingsPanel
                    findings={report.sections.findings}
                    linkedTransactions={report.linkedTransactions}
                    onUpdate={handleUpdateFindings}
                    onOpenTransactionLinker={handleOpenLinker}
                />
            );
        }

        if (activeSection === 'annexures') {
            return (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Annexures section coming in Phase 3</p>
                </div>
            );
        }

        const section = REPORT_SECTIONS.find(s => s.key === activeSection);
        if (section) {
            return renderTextSection(activeSection, section);
        }

        return null;
    };

    return (
        <>
            <div className="flex h-full min-h-[calc(100vh-200px)]">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="font-heading font-semibold text-primary text-sm uppercase tracking-wide">
                            Report Sections
                        </h3>
                    </div>
                    <nav className="p-2">
                        {REPORT_SECTIONS.map((section) => (
                            <button
                                key={section.key}
                                onClick={() => setActiveSection(section.key)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-1 ${activeSection === section.key
                                    ? 'bg-primary text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {renderIcon(section.icon, 'w-5 h-5 flex-shrink-0')}
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{section.label}</p>
                                </div>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Section Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-heading font-semibold text-gray-900">
                                {REPORT_SECTIONS.find(s => s.key === activeSection)?.label || 'Report Details'}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {REPORT_SECTIONS.find(s => s.key === activeSection)?.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {lastSaved && (
                                <span className="text-sm text-gray-500">
                                    Saved {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={() => setCollaborativeMode(!collaborativeMode)}
                                className={`flex items-center gap-2 py-2 px-4 rounded-lg transition-all border ${collaborativeMode
                                    ? 'bg-green-50 border-green-500 text-green-700'
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                                title={collaborativeMode ? 'Disable collaborative mode' : 'Enable collaborative mode'}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {collaborativeMode ? 'Collaborating' : 'Collaborate'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => router.push('/reports')}
                                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 py-2 px-4 rounded-lg transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Section Content */}
                    <div className="flex-1 p-6 bg-neutral-lightest overflow-y-auto">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            {renderActiveContent()}
                        </div>
                    </div>
                </div>
            </div>
            {/* Transaction Linker Modal */}
            <TransactionLinker
                isOpen={linkerOpen}
                onClose={() => setLinkerOpen(false)}
                onLink={handleLinkTransactions}
                existingLinks={report.linkedTransactions.map(t => t.transactionId)}
                schemeType={report.schemeType}
            />
        </>
    );
};

export default ReportBuilder;
