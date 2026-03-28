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

// ============================================
// REPORT TEMPLATES
// ============================================
export type ReportTemplateType = 'blank' | 'financial_audit' | 'compliance_audit' | 'forensic_investigation';

export interface ReportTemplate {
    type: ReportTemplateType;
    name: string;
    description: string;
    icon: string; // emoji
    schemeDefault: SchemeType;
    color: string; // tailwind bg class
    factory: () => Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'>;
}

function generateFindingId(): string {
    return `finding-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ---------- Financial Audit Template ----------
function createFinancialAuditReport(): Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        reportNumber: 'FA/LPG/',
        title: 'Financial Audit Report — LPG Subsidy Disbursement',
        schemeType: 'LPG_SUBSIDY',
        status: 'draft',
        author: '',
        auditPeriod: { startDate: '', endDate: '' },
        auditRegion: {},
        sections: {
            preface: `This Financial Audit Report has been prepared in accordance with the Comptroller and Auditor General's Auditing Standards and the Financial Audit Manual (2023 Edition). The audit was conducted to provide reasonable assurance on the financial statements and utilization of funds under the LPG Subsidy Scheme.

The report presents findings on (a) the accuracy of financial records, (b) the regularity and propriety of expenditure, (c) the effectiveness of internal controls over subsidy disbursement, and (d) the adequacy of financial management practices.

The methodology accords with generally accepted government auditing principles, incorporating data analytics through the JanAvlokan AI platform to identify statistical anomalies in disbursement patterns.`,

            executiveSummary: `Key Findings:

1. Excess Expenditure: Analysis identified disbursement patterns exceeding approved budget allocations by a significant margin in select districts, requiring further examination and corrective action.

2. Unspent Balances: Substantial funds allocated for beneficiary onboarding and last-mile delivery remained unspent at the close of the financial year, indicating potential inefficiencies in fund utilization.

3. Duplicate Disbursements: AI-driven pattern analysis through JanAvlokan flagged multiple instances of potential duplicate subsidy credits to the same Aadhaar-linked bank accounts, warranting investigation.

Total financial impact of the above observations is subject to verification through detailed field audit. Immediate corrective measures have been recommended to the implementing department.`,

            introduction: `1.1 Background

The Pradhan Mantri Ujjwala Yojana (PMUY) and associated LPG subsidy programs aim to provide clean cooking fuel to eligible households across India. Subsidy amounts are directly transferred to beneficiary bank accounts upon cylinder purchase.

1.2 Audit Objectives

The financial audit was designed to:
- Examine the accuracy and completeness of financial statements related to LPG subsidy disbursement
- Assess whether expenditure was incurred in accordance with approved budgets, regulations, and government orders
- Evaluate internal controls and financial management systems governing subsidy release
- Identify irregularities in fund utilization through AI-assisted transaction analysis

1.3 Audit Scope

The audit covered transactions for the period under review, encompassing all districts within the selected state. Data analysis was performed on the full transaction dataset using JanAvlokan's BigQuery ML anomaly detection pipeline.

1.4 Audit Criteria

- General Financial Rules (GFR) 2017
- PMUY Scheme Guidelines (latest revision)
- Ministry of Petroleum and Natural Gas directives on subsidy transfer
- State government standing orders on fund management`,

            methodology: `The audit methodology combined traditional verification with advanced data analytics:

1. Data Collection: Transaction-level data was sourced from BigQuery analytical warehouse, covering beneficiary records, dealer submissions, and bank transfer confirmations.

2. AI-Assisted Analysis: JanAvlokan's unsupervised machine learning models were used to identify statistical outliers in:
   - Disbursement frequency patterns
   - Cross-district transaction anomalies
   - Beneficiary clustering by demographic and geographic attributes

3. Sample Verification: A stratified random sample of flagged transactions was selected for detailed verification against source documents.

4. Field Verification: Site visits were conducted to selected districts to validate beneficiary identity and cylinder delivery records.

5. Financial Statement Analysis: Budget vs. actual expenditure comparisons were performed at district and state levels.`,

            findings: [
                {
                    id: generateFindingId(),
                    paraNumber: '2.1',
                    title: 'Excess Expenditure Beyond Approved Budget',
                    background: 'As per General Financial Rules (GFR) 2017, Rule 56, no expenditure shall be incurred that exceeds the approved budget allocation without prior sanction from the competent authority.',
                    observation: 'Analysis of disbursement data revealed that subsidy expenditure in multiple districts exceeded the approved budget allocation. The excess was not covered by any supplementary grant or re-appropriation order. The pattern was consistent across the audit period, suggesting systemic budgeting gaps rather than isolated incidents.',
                    amountInvolved: 0,
                    impact: 'Expenditure without adequate budget provision constitutes a violation of financial propriety. It undermines fiscal discipline and may indicate weaknesses in budget estimation and monitoring processes.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) implement real-time budget monitoring dashboards, (b) ensure all expenditure is covered by valid appropriations, and (c) address the root causes of chronic budget overruns.',
                    severity: 'high',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '2.2',
                    title: 'Significant Unspent Balances at Year-End',
                    background: 'Scheme guidelines require timely utilization of allocated funds to ensure maximum beneficiary coverage. Unspent balances at year-end indicate potential shortfall in scheme delivery.',
                    observation: 'Examination of fund flow statements revealed that a notable portion of the total annual allocation remained unspent at the close of the financial year. The unspent amounts were concentrated in districts with low beneficiary enrollment rates, suggesting correlation between under-utilization and implementation challenges.',
                    amountInvolved: 0,
                    impact: 'Idle funds represent opportunity cost — eligible beneficiaries who could have received subsidies were denied access due to implementation bottlenecks. The lapsing of unspent balances further reduces the effective reach of the scheme.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) conduct district-level capacity assessments, (b) implement quarterly fund utilization reviews, and (c) establish a mechanism for timely re-allocation of idle funds to high-performing districts.',
                    severity: 'medium',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '2.3',
                    title: 'Potential Duplicate Subsidy Disbursements',
                    background: 'Direct Benefit Transfer (DBT) guidelines mandate one-to-one mapping between beneficiary Aadhaar numbers and bank accounts. Duplicate disbursements to the same account represent a potential loss to the exchequer.',
                    observation: 'JanAvlokan AI pattern analysis identified clusters of transactions where multiple subsidy credits of identical amounts were processed to the same bank account within short time windows. The flagged transactions require manual verification to distinguish between legitimate refill cycles and erroneous duplicate processing.',
                    amountInvolved: 0,
                    impact: 'If confirmed, duplicate disbursements represent direct financial loss and a weakness in the DBT payment processing pipeline. The pattern suggests potential gaps in the deduplication checks at the payment gateway level.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) implement real-time deduplication checks in the payment pipeline, (b) conduct a comprehensive reconciliation of all flagged accounts, and (c) integrate JanAvlokan anomaly alerts into the approval workflow.',
                    severity: 'critical',
                    status: 'open',
                    linkedTransactionIds: [],
                },
            ],
            recommendations: `Based on the audit findings, the following recommendations are made:

1. Budget Management: Institute a real-time budget monitoring system linked to the JanAvlokan platform to prevent excess expenditure and enable proactive fund management.

2. Fund Utilization: Establish a quarterly review mechanism for fund utilization at the district level, with automatic escalation triggers for under-performing districts.

3. Payment Controls: Strengthen the DBT payment pipeline with pre-disbursement deduplication checks and integrate AI-based anomaly detection as a preventive control.

4. Reconciliation: Conduct a comprehensive reconciliation of all transactions flagged by JanAvlokan for the audit period and take corrective action on confirmed irregularities.

5. Internal Audit: Strengthen the internal audit function with training on data analytics tools and methodology to enable continuous monitoring.`,

            conclusion: `The financial audit has highlighted areas of concern in budget management, fund utilization, and payment processing within the LPG subsidy disbursement framework. While the scheme continues to deliver substantial benefits to eligible households, the identified control weaknesses require prompt corrective action to safeguard public funds.

The integration of AI-assisted analysis through JanAvlokan has significantly enhanced the audit's ability to identify patterns and anomalies at scale, demonstrating the value of technology-augmented government auditing.

The Department's cooperation during the audit is acknowledged. Implementation of the recommended measures will be monitored in subsequent follow-up audits.`,

            annexures: [],
        },
        linkedTransactions: [],
    };
}

// ---------- Compliance Audit Template ----------
function createComplianceAuditReport(): Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        reportNumber: 'CA/MDM/',
        title: 'Compliance Audit Report — Mid-Day Meal Scheme Implementation',
        schemeType: 'MID_DAY_MEAL',
        status: 'draft',
        author: '',
        auditPeriod: { startDate: '', endDate: '' },
        auditRegion: {},
        sections: {
            preface: `This Compliance Audit Report has been prepared in accordance with the Comptroller and Auditor General's Regulations on Audit and Accounts, 2007, and the Compliance Audit Guidelines (2023). The audit examined adherence to scheme guidelines, rules, regulations, and government orders governing the implementation of the Mid-Day Meal (MDM) Scheme.

The scope encompasses operational compliance, procurement practices, reporting accuracy, and beneficiary coverage. Data-driven compliance checks were performed using the JanAvlokan AI platform's analytical capabilities.`,

            executiveSummary: `This compliance audit of the Mid-Day Meal Scheme implementation identified several areas of non-compliance with prescribed guidelines and regulations:

1. Guideline Non-Compliance: Multiple instances were identified where meal preparation, quality standards, and reporting practices deviated from the norms established by the Ministry of Education and the National Food Security Act.

2. Procurement Irregularities: Examination of procurement records revealed deviations from established procedures in the acquisition of food grains, cooking ingredients, and kitchen equipment, potentially impacting cost efficiency and quality control.

3. Delayed Implementation: Significant delays in scheme rollout and infrastructure Development were observed in select districts, resulting in reduced beneficiary coverage during the audit period.

The audit underscores the need for stronger oversight mechanisms and the adoption of technology-assisted monitoring to ensure consistent compliance across implementing agencies.`,

            introduction: `1.1 Background

The Mid-Day Meal Scheme, now integrated under PM POSHAN (Pradhan Mantri Poshan Shakti Nirman), is one of the world's largest school feeding programmes, aimed at improving nutritional outcomes, school attendance, and learning capacity among children in government and government-aided schools.

1.2 Audit Objectives

The compliance audit was conducted to assess:
- Adherence to MDM scheme guidelines, FSSAI food safety standards, and state-level implementation orders
- Regularity of procurement processes for food grains, ingredients, and kitchen infrastructure
- Accuracy of meal distribution reporting and beneficiary records
- Effectiveness of quality control and monitoring mechanisms

1.3 Regulatory Framework

The audit criteria were drawn from:
- National Food Security Act, 2013
- MDM Scheme Guidelines (revised 2022)
- PM POSHAN Implementation Framework
- FSSAI Food Safety Standards for School Kitchens
- State-level Implementation Orders and standing instructions
- Central/State Government rules on procurement and financial management`,

            methodology: `The compliance audit methodology incorporated both traditional inspection techniques and AI-driven data analysis:

1. Document Review: Examination of scheme guidelines, government orders, circulars, and implementation reports at the state, district, and school levels.

2. Data Analysis: JanAvlokan BigQuery ML models analyzed daily meal records across all schools to identify:
   - Ghost meal patterns (reported meals exceeding actual attendance)
   - Ingredient usage anomalies (consumption deviating from per-student norms)
   - Fund claim irregularities (claims disproportionate to actual distribution)
   - Cook attendance anomalies (meals reported without cook presence)

3. Field Verification: Physical inspection visits to a sample of schools to verify:
   - Kitchen infrastructure and hygiene standards
   - Meal quality and menu variety
   - Attendance and distribution registers
   - Stock registers and procurement documentation

4. Stakeholder Interactions: Discussions with Headmasters, MDM coordinators, and district officials to understand operational challenges and contextual factors.`,

            findings: [
                {
                    id: generateFindingId(),
                    paraNumber: '3.1',
                    title: 'Non-Compliance with MDM Scheme Guidelines',
                    background: 'MDM Scheme Guidelines mandate specific nutritional standards (450 calories, 12g protein for primary; 700 calories, 20g protein for upper primary), daily menu rotation including eggs/fruits, and maintenance of accurate daily reports.',
                    observation: 'Compliance analysis revealed that a substantial number of schools did not maintain the prescribed menu variety, with many serving repetitive meals without the mandated protein supplementation. Daily meal reports in a notable percentage of schools showed discrepancies between reported students served and actual attendance records, suggesting inaccurate reporting. JanAvlokan flagged these as potential ghost meal patterns requiring verification.',
                    amountInvolved: 0,
                    impact: 'Non-compliance with nutritional standards directly undermines the scheme\'s objective of improving child nutrition. Inaccurate reporting creates opacity in programme monitoring and may mask actual under-delivery of meals.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) institute monthly compliance audits at the block level, (b) implement the JanAvlokan real-time monitoring dashboard for all schools, (c) provide training to head teachers on accurate reporting requirements, and (d) establish consequences for persistent non-compliance.',
                    severity: 'high',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '3.2',
                    title: 'Procurement Irregularities in Food Grain and Ingredient Supply',
                    background: 'Government procurement rules require competitive bidding, rate contracts, and quality certification for all food grain and ingredient procurement. FSSAI standards mandate specific quality parameters for items used in school meal preparation.',
                    observation: 'Examination of procurement records in sampled districts revealed (a) instances of direct procurement without competitive bidding where the value exceeded the prescribed threshold, (b) absence of FSSAI quality testing certificates for several consignments, (c) price variations significantly exceeding the approved rate contract for identical items across neighboring blocks. JanAvlokan ingredient analysis flagged unusual per-student consumption patterns in several schools, correlating with the procurement anomalies.',
                    amountInvolved: 0,
                    impact: 'Procurement irregularities compromise both the financial efficiency and the food safety of the programme. Unverified food quality poses direct health risks to children. Price inflation in procurement represents a loss to the exchequer.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) enforce mandatory FSSAI certification for all food consignments, (b) implement an e-procurement system with automated rate comparison, (c) conduct periodic surprise inspections of food storage facilities, and (d) link JanAvlokan consumption analytics to procurement approval workflows.',
                    severity: 'high',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '3.3',
                    title: 'Delayed Scheme Implementation and Infrastructure Gaps',
                    background: 'PM POSHAN guidelines set specific timelines for kitchen construction, equipment procurement, and meal commencement. Schools are expected to commence meal distribution within 30 days of the academic session start.',
                    observation: 'A notable number of schools within the sampled districts experienced delays exceeding 60 days in commencing meal distribution due to incomplete kitchen infrastructure, delayed fund release, and administrative bottlenecks. Several schools operated without functional kitchens, relying on external suppliers. Equipment shortages (cooking vessels, storage facilities, weighing scales) were widespread.',
                    amountInvolved: 0,
                    impact: 'Implementation delays result in children going without the mandated nutritional support during critical school months. Reliance on external suppliers without adequate quality control increases food safety risks and reduces cost transparency.',
                    departmentalResponse: '',
                    recommendation: 'The Department should (a) create a real-time infrastructure readiness dashboard, (b) establish pre-academic-session readiness certification for all schools, (c) identify alternative meal preparation arrangements for schools with infrastructure gaps, and (d) prioritize pending kitchen construction works.',
                    severity: 'medium',
                    status: 'open',
                    linkedTransactionIds: [],
                },
            ],
            recommendations: `Summary of Recommendations:

1. Monitoring System: Deploy JanAvlokan as a mandatory monitoring tool across all implementing schools to enable real-time compliance tracking and early anomaly detection.

2. Procurement Reform: Migrate to a centralized e-procurement system with built-in FSSAI compliance checks and automated rate benchmarking.

3. Training Programme: Conduct mandatory annual training for all MDM coordinators, head teachers, and cooks on scheme guidelines, food safety standards, and reporting accuracy.

4. Infrastructure: Complete all pending kitchen infrastructure works within six months and establish a maintenance protocol for kitchen equipment.

5. Accountability: Establish clear accountability frameworks with defined consequences for non-compliance, procurement violations, and reporting inaccuracies.

6. Follow-up: The Department should submit an Action Taken Report (ATR) within three months, detailing steps taken on each recommendation.`,

            conclusion: `The compliance audit has revealed systemic gaps in the implementation of the Mid-Day Meal Scheme that require urgent attention from the implementing department. While the programme's objectives are vital for child nutrition and educational outcomes, the identified instances of non-compliance, procurement irregularities, and implementation delays undermine the scheme's effectiveness.

The integration of AI-assisted monitoring through the JanAvlokan platform has proven effective in identifying patterns of non-compliance at scale and should be institutionalized as part of the scheme's ongoing monitoring framework.

Prompt corrective action on the findings and recommendations is essential to ensure that the programme delivers its intended benefits to all eligible children. The Department's response and remedial measures will be reviewed in subsequent follow-up audits.`,

            annexures: [],
        },
        linkedTransactions: [],
    };
}

// ---------- Forensic Investigation Template ----------
function createForensicInvestigationReport(): Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'> {
    return {
        reportNumber: 'FI/LPG/',
        title: 'Forensic Investigation Report — Suspected Subsidy Fraud',
        schemeType: 'LPG_SUBSIDY',
        status: 'draft',
        author: '',
        auditPeriod: { startDate: '', endDate: '' },
        auditRegion: {},
        sections: {
            preface: `CONFIDENTIAL — FOR OFFICIAL USE ONLY

This Forensic Investigation Report has been prepared following intelligence referrals and AI-generated anomaly alerts from the JanAvlokan Welfare Intelligence Platform. The investigation was conducted in accordance with the CAG's Guidelines on Forensic Auditing (2022) and the Prevention of Corruption Act, 1988.

The investigation focused on suspected fraudulent subsidy claims involving ghost beneficiaries, organized collusion networks, and abnormal transaction patterns identified through advanced machine learning and network analysis. All findings are based on documented evidence and are subject to verification through formal investigation.`,

            executiveSummary: `INVESTIGATION SUMMARY

This forensic investigation was initiated based on AI-generated risk alerts from the JanAvlokan platform. Machine learning models identified statistically significant anomalies in LPG subsidy disbursement patterns that warranted detailed investigation.

Key Findings:

1. Ghost Beneficiaries: Evidence suggests the existence of fabricated beneficiary identities receiving subsidy transfers. Flagged profiles exhibit indicators including non-existent addresses, abnormal refill frequencies, and absence from other government databases.

2. Collusion Network: Network analysis through JanAvlokan identified a cluster of beneficiary accounts, dealer IDs, and Aadhaar numbers exhibiting coordinated transaction patterns indicative of organized fraud. The identified cluster spans multiple districts.

3. Abnormal Transaction Patterns: Statistically significant deviations from expected refill behavior were detected. Anomalous patterns include rapid-fire refills within hours, cross-district purchases inconsistent with residential addresses, and coordinated timing across multiple beneficiaries linked to the same dealer.

INVESTIGATION STATUS: Active — Findings have been referred to the relevant enforcement authorities for further action.`,

            introduction: `1.1 Background and Referral

This investigation was initiated following:
(a) High-risk alerts generated by the JanAvlokan AI anomaly detection system
(b) Intelligence inputs from the implementing department regarding suspected irregularities
(c) Cross-referencing of beneficiary databases revealing potential duplicate/fictitious entries

1.2 Scope of Investigation

The forensic investigation examined:
- Beneficiary identity verification against multiple government databases (Aadhaar, ration card, SECC)
- Transaction pattern analysis using JanAvlokan's BigQuery ML anomaly detection models
- Network analysis of dealer-beneficiary relationships
- Fund flow tracing from scheme allocation to ultimate disbursement
- Digital evidence collection and documentation

1.3 Legal Framework

The investigation was conducted within the framework of:
- Comptroller and Auditor General's (Duties, Powers, and Conditions of Service) Act, 1971
- Prevention of Corruption Act, 1988
- Indian Penal Code, Sections 420 (Cheating), 468 (Forgery), 471 (Using forged document)
- Information Technology Act, 2000

1.4 Limitations

This report presents findings based on available data and analysis. It does not constitute a chargesheet or legal opinion. Findings are subject to verification through formal criminal investigation by the appropriate law enforcement authorities.`,

            methodology: `The forensic investigation employed a multi-layered analytical approach:

1. Data Acquisition: Complete transaction datasets were extracted from BigQuery, encompassing beneficiary registrations, refill transactions, dealer records, and payment confirmations for the investigation period.

2. AI-Driven Anomaly Detection:
   - JanAvlokan's unsupervised learning models (Isolation Forest, DBSCAN clustering) identified transactions with anomaly scores significantly above the population mean
   - Beneficiaries flagged with multiple risk indicators were prioritized for investigation
   - Temporal analysis examined transaction sequencing for evidence of automated or coordinated submissions

3. Network Analysis:
   - Graph-based analysis mapped dealer-beneficiary relationships
   - Community detection algorithms identified tightly-connected clusters suggesting coordinated activity
   - Cross-district link analysis revealed geographically improbable connections

4. Identity Verification:
   - Flagged beneficiary Aadhaar numbers were cross-referenced against available government databases
   - Address verification through geolocation analysis and field checks
   - Demographic profiling to identify statistically improbable profiles

5. Fund Flow Analysis:
   - End-to-end tracing of subsidy disbursements from source allocation to bank account credit
   - Identification of accounts receiving multiple subsidy streams
   - Analysis of withdrawal patterns post-credit

6. Evidence Documentation:
   - All evidence was collected and documented following chain-of-custody protocols
   - Digital evidence was preserved with cryptographic hashing for integrity verification
   - Analysis results were documented with reproducible methodology`,

            findings: [
                {
                    id: generateFindingId(),
                    paraNumber: '4.1',
                    title: 'Ghost Beneficiaries — Fabricated Identity Fraud',
                    background: 'The LPG subsidy scheme requires verified Aadhaar-linked identities for beneficiary registration. Each beneficiary must have a unique, valid Aadhaar number, a verified residential address, and must not be claiming subsidies under multiple identities.',
                    observation: 'JanAvlokan AI models flagged a set of beneficiary profiles exhibiting multiple high-risk indicators simultaneously: (a) addresses that do not correspond to verifiable residential locations, (b) refill frequencies several standard deviations above district averages, (c) identical bank account details linked to multiple beneficiary IDs, and (d) registration dates clustered within narrow time windows suggesting bulk creation. Cross-referencing with available databases showed no corresponding records for a substantial portion of flagged beneficiaries, strongly indicating fabricated identities.',
                    amountInvolved: 0,
                    impact: 'Ghost beneficiaries represent direct theft of public funds. Each fabricated identity siphons subsidy amount that should reach genuine eligible households. The scale of suspected fabrication suggests organized criminal enterprise rather than isolated incidents.',
                    departmentalResponse: '',
                    recommendation: 'Immediate actions: (a) Freeze subsidy disbursements to all flagged beneficiary accounts pending physical verification, (b) Refer findings to the Anti-Fraud Unit and local law enforcement, (c) Conduct 100% Aadhaar re-verification of all beneficiaries in affected districts. Systemic actions: (d) Implement biometric verification at the point of cylinder delivery, (e) Integrate JanAvlokan ghost beneficiary detection as a pre-registration check.',
                    severity: 'critical',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '4.2',
                    title: 'Organized Collusion Network Detected',
                    background: 'Normal subsidy disbursement patterns show independent, geographically coherent beneficiary-dealer relationships. Network analysis should reveal sparse, random connections without tight clustering.',
                    observation: 'JanAvlokan network analysis identified a tightly-connected cluster of beneficiary accounts, dealer terminals, and bank accounts exhibiting coordinated behavior: (a) multiple beneficiary accounts transacting exclusively through the same small set of dealers, (b) synchronized transaction timestamps suggesting automated batch processing, (c) cross-district transactions that are geographically improbable for residential beneficiaries, and (d) fund withdrawal patterns from linked bank accounts following consistent schedules. The network structure is consistent with an organized collusion scheme involving complicit dealers and fabricated or compromised beneficiary identities.',
                    amountInvolved: 0,
                    impact: 'The identified collusion network represents a sophisticated, organized fraud operation. Its cross-district nature suggests involvement of actors with administrative access or knowledge. The estimated cumulative loss will be quantified upon completion of the formal investigation.',
                    departmentalResponse: '',
                    recommendation: 'Immediate actions: (a) Confidentially refer the identified network to law enforcement, (b) Suspend the dealer licenses under investigation, (c) Freeze disbursements through the identified network. Systemic actions: (d) Implement real-time network monitoring through JanAvlokan, (e) Establish mandatory cooling periods between dealer transfers and beneficiary changes, (f) Enable automatic alerts when transaction patterns match known fraud typologies.',
                    severity: 'critical',
                    status: 'open',
                    linkedTransactionIds: [],
                },
                {
                    id: generateFindingId(),
                    paraNumber: '4.3',
                    title: 'Abnormal Transaction Patterns Indicating Systematic Exploitation',
                    background: 'Statistical analysis of legitimate LPG refill behavior shows predictable patterns: average refill intervals of 25-35 days for domestic use, single-dealer relationships, and amounts consistent with prevailing cylinder prices. Deviations from these norms may indicate fraudulent activity.',
                    observation: 'JanAvlokan anomaly detection models identified transactions exhibiting statistically extreme behavior: (a) refill intervals as short as a few days (domestic consumption would require 25+ days per cylinder), (b) beneficiaries registered in one district but consistently transacting in distant districts, (c) transaction amounts deviating significantly from standard cylinder prices suggesting manipulation, and (d) a subset of beneficiaries exhibiting perfectly regular transaction intervals suggesting automated rather than human-initiated activity. The flagged transactions are concentrated around specific dealer locations, reinforcing the collusion hypothesis.',
                    amountInvolved: 0,
                    impact: 'Abnormal transaction patterns, when combined with the ghost beneficiary and collusion findings, paint a picture of systematic exploitation of the subsidy disbursement mechanism. The anomalies are statistically extreme and cannot be explained by normal behavioral variation.',
                    departmentalResponse: '',
                    recommendation: 'Immediate actions: (a) Implement transaction velocity limits — maximum one refill per 20 days per beneficiary, (b) Deploy geolocation matching — flag transactions where beneficiary address and dealer location are in different districts, (c) Establish amount range validation — reject transactions outside expected price range. Systemic actions: (d) Integrate JanAvlokan anomaly scores into the approval pipeline as a mandatory checkpoint, (e) Establish a dedicated fraud analytics cell within the department.',
                    severity: 'critical',
                    status: 'open',
                    linkedTransactionIds: [],
                },
            ],
            recommendations: `RECOMMENDATIONS FOR ENFORCEMENT AND PREVENTION

A. Immediate Enforcement Actions:
1. File formal complaints with local law enforcement and Anti-Corruption Bureau for the identified fraud patterns
2. Freeze all subsidybursements to flagged accounts and dealers
3. Initiate recovery proceedings for confirmed fraudulent disbursements
4. Suspend and investigate dealer licenses associated with the collusion network

B. Systemic Prevention Measures:
1. Deploy JanAvlokan as a mandatory real-time fraud detection layer in the disbursement pipeline
2. Implement biometric verification at point-of-delivery for all high-value transactions
3. Establish automated velocity and geolocation checks as pre-disbursement controls
4. Create a centralized beneficiary deduplication system across states
5. Institute periodic AI-driven re-verification of the entire beneficiary database

C. Monitoring and Follow-up:
1. Establish a dedicated fraud analytics cell with access to JanAvlokan dashboards
2. Conduct quarterly forensic reviews of transaction patterns
3. Implement whistleblower mechanisms linked to anomaly reporting
4. Share anonymized fraud typologies across states for cross-learning`,

            conclusion: `This forensic investigation, initiated through AI-generated alerts from the JanAvlokan Welfare Intelligence Platform, has uncovered evidence of organized subsidy fraud involving ghost beneficiaries, dealer collusion, and systematic exploitation of disbursement mechanisms.

The findings demonstrate the critical importance of AI-assisted monitoring in detecting fraud patterns that would be virtually impossible to identify through traditional audit methods alone. The JanAvlokan platform's machine learning models successfully identified anomalies at a scale and granularity far exceeding manual inspection capabilities.

The matter has been referred to the appropriate law enforcement authorities for formal criminal investigation. The implementing department is urged to implement the recommended prevention measures without delay to stem ongoing losses and protect the integrity of the subsidy programme.

This report is classified as CONFIDENTIAL and should be handled in accordance with the government's information security protocols.`,

            annexures: [],
        },
        linkedTransactions: [],
    };
}

// ============================================
// TEMPLATE REGISTRY
// ============================================
export const REPORT_TEMPLATES: ReportTemplate[] = [
    {
        type: 'blank',
        name: 'Blank Report',
        description: 'Start from scratch with a clean report structure',
        icon: '',
        schemeDefault: 'LPG_SUBSIDY',
        color: 'bg-gray-100',
        factory: () => createEmptyReport('LPG_SUBSIDY'),
    },
    {
        type: 'financial_audit',
        name: 'Financial Audit',
        description: 'Budget analysis, fund utilization, and expenditure irregularities',
        icon: '',
        schemeDefault: 'LPG_SUBSIDY',
        color: 'bg-blue-50',
        factory: createFinancialAuditReport,
    },
    {
        type: 'compliance_audit',
        name: 'Compliance Audit',
        description: 'Regulatory adherence, process deviations, and guideline violations',
        icon: '',
        schemeDefault: 'MID_DAY_MEAL',
        color: 'bg-green-50',
        factory: createComplianceAuditReport,
    },
    {
        type: 'forensic_investigation',
        name: 'Forensic Investigation',
        description: 'Deep-dive fraud analysis, evidence chain, and beneficiary anomalies',
        icon: '',
        schemeDefault: 'LPG_SUBSIDY',
        color: 'bg-red-50',
        factory: createForensicInvestigationReport,
    },
];

export function createReportFromTemplate(templateType: ReportTemplateType): Omit<AuditReport, 'id' | 'createdAt' | 'updatedAt'> {
    const template = REPORT_TEMPLATES.find(t => t.type === templateType);
    if (!template) return createEmptyReport('LPG_SUBSIDY');
    return template.factory();
}

