// LocalStorage helpers for Audit Reports

import { AuditReport, createEmptyReport, createReportFromTemplate, SchemeType, ReportTemplateType } from '@/types/report';

const STORAGE_KEY = 'janavlokan_audit_reports';

export function getStoredReports(): AuditReport[] {
    if (typeof window === 'undefined') return [];

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        console.error('Failed to parse stored reports');
        return [];
    }
}

export function saveReports(reports: AuditReport[]): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    } catch (error) {
        console.error('Failed to save reports:', error);
    }
}

export function getReportById(id: string): AuditReport | null {
    const reports = getStoredReports();
    return reports.find(r => r.id === id) || null;
}

export function createNewReport(schemeType: SchemeType = 'LPG_SUBSIDY', templateType?: ReportTemplateType): AuditReport {
    const now = new Date().toISOString();
    const template = templateType
        ? createReportFromTemplate(templateType)
        : createEmptyReport(schemeType);

    return {
        ...template,
        id: `report-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
    };
}

export function saveReport(report: AuditReport): void {
    const reports = getStoredReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);

    const updatedReport = {
        ...report,
        updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
        reports[existingIndex] = updatedReport;
    } else {
        reports.unshift(updatedReport);
    }

    saveReports(reports);
}

export function deleteReport(id: string): void {
    const reports = getStoredReports();
    saveReports(reports.filter(r => r.id !== id));
}

export function duplicateReport(id: string): AuditReport | null {
    const original = getReportById(id);
    if (!original) return null;

    const now = new Date().toISOString();
    const duplicate: AuditReport = {
        ...original,
        id: `report-${Date.now()}`,
        title: `${original.title} (Copy)`,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
    };

    const reports = getStoredReports();
    reports.unshift(duplicate);
    saveReports(reports);

    return duplicate;
}
