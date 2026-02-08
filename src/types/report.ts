// Audit Report Types for JanAvlokan

export type ReportStatus = 'draft' | 'in_review' | 'final';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'open' | 'resolved' | 'disputed';
export type SchemeType = 'LPG_SUBSIDY' | 'MID_DAY_MEAL';

export interface AuditReport {
    id: string;
    reportNumber: string;
    title: string;
    schemeType: SchemeType;
    status: ReportStatus;
    createdAt: string;
    updatedAt: string;
    author: string;

    // Audit period
    auditPeriod: {
        startDate: string;
        endDate: string;
    };

    // Region info
    auditRegion: {
        state?: string;
        district?: string;
    };

    // CAG-style sections (TipTap JSON content)
    sections: ReportSections;

    // Linked data from dashboard
    linkedTransactions: LinkedTransaction[];
}

export interface ReportSections {
    preface: string;
    executiveSummary: string;
    introduction: string;
    methodology: string;
    findings: AuditFinding[];
    recommendations: string;
    conclusion: string;
    annexures: Annexure[];
}

export interface AuditFinding {
    id: string;
    paraNumber: string; // e.g., "2.1", "2.2"
    title: string;
    background: string; // TipTap JSON - Criteria/Rules expected
    observation: string; // TipTap JSON - What was found
    amountInvolved?: number;
    impact: string; // TipTap JSON
    departmentalResponse?: string;
    recommendation: string; // TipTap JSON
    severity: FindingSeverity;
    status: FindingStatus;
    linkedTransactionIds: string[];
}

export interface LinkedTransaction {
    transactionId: string;
    beneficiaryId: string;
    riskScore: number;
    amount: number;
    flags: string[];
    aiExplanation: string;
    dateAdded: string;
}

export interface Annexure {
    id: string;
    title: string;
    type: 'table' | 'chart' | 'document' | 'image';
    content: string; // JSON for tables, base64 for images
}

// Section metadata for sidebar navigation
export interface SectionMeta {
    key: keyof ReportSections | 'metadata';
    label: string;
    icon: string;
    description: string;
}

export const REPORT_SECTIONS: SectionMeta[] = [
    { key: 'metadata', label: 'Report Details', icon: 'info', description: 'Basic report information' },
    { key: 'preface', label: 'Preface', icon: 'file-text', description: 'Audit authority and scope' },
    { key: 'executiveSummary', label: 'Executive Summary', icon: 'clipboard', description: 'Key findings overview' },
    { key: 'introduction', label: 'Introduction', icon: 'book-open', description: 'Scheme background and objectives' },
    { key: 'methodology', label: 'Methodology', icon: 'settings', description: 'Audit approach and sampling' },
    { key: 'findings', label: 'Audit Findings', icon: 'alert-triangle', description: 'Detailed observations' },
    { key: 'recommendations', label: 'Recommendations', icon: 'check-circle', description: 'Suggested actions' },
    { key: 'conclusion', label: 'Conclusion', icon: 'flag', description: 'Summary and closing' },
    { key: 'annexures', label: 'Annexures', icon: 'paperclip', description: 'Supporting documents' },
];

// Default empty report template
export function createEmptyReport(schemeType: SchemeType = 'LPG_SUBSIDY'): Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        reportNumber: '',
        title: '',
        schemeType,
        status: 'draft',
        author: '',
        auditPeriod: {
            startDate: '',
            endDate: '',
        },
        auditRegion: {},
        sections: {
            preface: '',
            executiveSummary: '',
            introduction: '',
            methodology: '',
            findings: [],
            recommendations: '',
            conclusion: '',
            annexures: [],
        },
        linkedTransactions: [],
    };
}

// CAG-style default template content
export const CAG_TEMPLATE_PREFACE = `This Report for the period ending March [YEAR] has been prepared for submission to the Governor of [STATE] under Article 151 of the Constitution of India.

This Report contains significant results of the compliance audit of the Departments/Offices of the Government of [STATE] including Public Sector Undertakings.

The instances mentioned in this Report are among those which came to notice in the course of test audit for the period [PERIOD] as well as those which came to notice in earlier years but could not be reported in the previous Audit Reports.`;

export const CAG_TEMPLATE_INTRO = `1.1 About the Scheme

[Describe the welfare scheme being audited, its objectives, implementing agency, and beneficiary count]

1.2 Audit Objectives

The audit was conducted with the following objectives:
- To assess the effectiveness of the scheme implementation
- To verify compliance with prescribed rules and regulations
- To identify instances of financial irregularities or leakages
- To evaluate the internal control mechanisms

1.3 Audit Scope and Methodology

The audit covered the period from [START_DATE] to [END_DATE]. The methodology included:
- Review of policy documents and guidelines
- Analysis of transaction data from JanAvlokan platform
- Sample verification of beneficiary records
- Field visits to selected districts

1.4 Acknowledgement

The cooperation extended by the Department during the audit is acknowledged.`;
