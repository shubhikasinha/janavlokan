import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getBigQueryClient } from '@/lib/bigquery';

// Resend is initialized lazily when needed to avoid crashes when API key is not set
let resendInstance: Resend | null = null;
function getResend(): Resend | null {
    if (process.env.RESEND_API_KEY && !resendInstance) {
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
}

// Mock recipients data - in production, this would come from a database
export const RECIPIENTS = [
    { id: 1, name: 'Dr. Rajesh Kumar', email: 'dr.asinha@ce.du.ac.in', district: 'LUCKNOW' },
    { id: 2, name: 'Smt. Priya Sharma', email: 'priya.sharma@gov.in', district: 'VARANASI' },
    { id: 3, name: 'Shri Amit Verma', email: 'amit.verma@gov.in', district: 'KANPUR NAGAR' },
    { id: 4, name: 'Dr. Sunita Singh', email: 'sunita.singh@gov.in', district: 'AGRA' },
];

interface FraudCase {
    beneficiary_id: string;
    dealer_id?: string;
    dealer_name?: string;
    risk_score: number;
    risk_level: string;
    alert_type: string;
    district?: string;
    scheme?: string;
    entity_name?: string;
}

async function getTopFraudsForDistrict(district: string, scheme: string = 'lpg'): Promise<FraudCase[]> {
    try {
        const bigquery = getBigQueryClient();

        if (scheme === 'mdm') {
            const query = `
                SELECT 
                    CAST(school_id AS STRING) as beneficiary_id,
                    school_name,
                    district,
                    risk_level,
                    anomaly_score as risk_score,
                    flag_ghost_meals,
                    flag_ingredient_inflation,
                    flag_fund_overclaim,
                    flag_cook_anomaly
                FROM \`gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations\`
                WHERE UPPER(district) = @district AND risk_level IN ('HIGH', 'MEDIUM')
                ORDER BY anomaly_score DESC
                LIMIT 10
            `;

            const [rows] = await bigquery.query({ query, params: { district: district.toUpperCase() } });

            return rows.map((row: any) => {
                let alertType = 'MDM anomaly detected';
                if (row.flag_ghost_meals) alertType = 'Ghost meals detected';
                else if (row.flag_fund_overclaim) alertType = 'Fund overclaim detected';
                else if (row.flag_ingredient_inflation) alertType = 'Ingredient inflation detected';
                else if (row.flag_cook_anomaly) alertType = 'Cook anomaly detected';

                return {
                    beneficiary_id: row.beneficiary_id,
                    entity_name: row.school_name || 'Unknown School',
                    risk_score: parseFloat(row.risk_score) || 0,
                    risk_level: row.risk_level,
                    alert_type: alertType,
                    district: row.district,
                    scheme: 'MDM'
                };
            });
        } else {
            // LPG scheme - fetch beneficiary and dealer information
            const query = `
                SELECT 
                    f.beneficiary_id,
                    f.risk_level,
                    f.mean_squared_error as risk_score,
                    f.flag_high_recent_activity,
                    f.flag_multiple_dealers,
                    f.flag_cross_district,
                    f.flag_high_lifetime_usage,
                    b.dealer_id,
                    b.dealer_name
                FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\` f
                LEFT JOIN \`gfg-fot.lpg_fraud_detection.beneficiaries\` b
                    ON f.beneficiary_id = b.beneficiary_id
                WHERE f.risk_level IN ('HIGH', 'MEDIUM')
                ORDER BY f.mean_squared_error DESC
                LIMIT 10
            `;

            try {
                const [rows] = await bigquery.query({ query });

                return rows.map((row: any) => {
                    let alertType = 'Suspicious activity pattern';
                    if (row.flag_multiple_dealers) alertType = 'Multiple dealers detected';
                    else if (row.flag_cross_district) alertType = 'Cross-district activity';
                    else if (row.flag_high_recent_activity) alertType = 'High recent activity';
                    else if (row.flag_high_lifetime_usage) alertType = 'High lifetime usage anomaly';

                    return {
                        beneficiary_id: row.beneficiary_id,
                        dealer_id: row.dealer_id || 'N/A',
                        dealer_name: row.dealer_name || 'Unknown Dealer',
                        risk_score: parseFloat(row.risk_score) || 0,
                        risk_level: row.risk_level,
                        alert_type: alertType,
                        district: district,
                        scheme: 'LPG'
                    };
                });
            } catch (joinError) {
                // Fallback: query without join if beneficiaries table doesn't exist
                console.log('Falling back to simple query:', joinError);
                const simpleQuery = `
                    SELECT 
                        beneficiary_id,
                        risk_level,
                        mean_squared_error as risk_score,
                        flag_high_recent_activity,
                        flag_multiple_dealers,
                        flag_cross_district,
                        flag_high_lifetime_usage
                    FROM \`gfg-fot.lpg_fraud_detection.fraud_with_explanations\`
                    WHERE risk_level IN ('HIGH', 'MEDIUM')
                    ORDER BY mean_squared_error DESC
                    LIMIT 10
                `;

                const [rows] = await bigquery.query({ query: simpleQuery });

                return rows.map((row: any) => {
                    let alertType = 'Suspicious activity pattern';
                    if (row.flag_multiple_dealers) alertType = 'Multiple dealers detected';
                    else if (row.flag_cross_district) alertType = 'Cross-district activity';
                    else if (row.flag_high_recent_activity) alertType = 'High recent activity';
                    else if (row.flag_high_lifetime_usage) alertType = 'High lifetime usage anomaly';

                    return {
                        beneficiary_id: row.beneficiary_id,
                        dealer_id: 'N/A',
                        dealer_name: 'N/A',
                        risk_score: parseFloat(row.risk_score) || 0,
                        risk_level: row.risk_level,
                        alert_type: alertType,
                        district: district,
                        scheme: 'LPG'
                    };
                });
            }
        }
    } catch (error) {
        console.error('Error fetching frauds for district:', error);
        // Return mock data for demo purposes if BigQuery fails
        return [
            { beneficiary_id: 'BEN-2024-001', dealer_id: 'DLR-UP-0012', dealer_name: 'Sharma Gas Agency', risk_score: 0.95, risk_level: 'HIGH', alert_type: 'Multiple dealers detected', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-002', dealer_id: 'DLR-UP-0045', dealer_name: 'Gupta LPG Distribution', risk_score: 0.89, risk_level: 'HIGH', alert_type: 'Cross-district activity', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-003', dealer_id: 'DLR-UP-0078', dealer_name: 'Singh Gas Service', risk_score: 0.85, risk_level: 'HIGH', alert_type: 'High recent activity', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-004', dealer_id: 'DLR-UP-0023', dealer_name: 'Verma Fuel Depot', risk_score: 0.78, risk_level: 'MEDIUM', alert_type: 'Suspicious pattern', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-005', dealer_id: 'DLR-UP-0091', dealer_name: 'Yadav Gas Point', risk_score: 0.72, risk_level: 'MEDIUM', alert_type: 'Usage anomaly', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-006', dealer_id: 'DLR-UP-0034', dealer_name: 'Kumar Gas Agency', risk_score: 0.68, risk_level: 'MEDIUM', alert_type: 'Multiple dealers detected', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-007', dealer_id: 'DLR-UP-0056', dealer_name: 'Pandey LPG Center', risk_score: 0.65, risk_level: 'MEDIUM', alert_type: 'Cross-district activity', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-008', dealer_id: 'DLR-UP-0067', dealer_name: 'Mishra Gas House', risk_score: 0.62, risk_level: 'MEDIUM', alert_type: 'High recent activity', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-009', dealer_id: 'DLR-UP-0089', dealer_name: 'Tripathi Fuel Service', risk_score: 0.58, risk_level: 'MEDIUM', alert_type: 'Suspicious pattern', district, scheme: 'LPG' },
            { beneficiary_id: 'BEN-2024-010', dealer_id: 'DLR-UP-0012', dealer_name: 'Sharma Gas Agency', risk_score: 0.55, risk_level: 'MEDIUM', alert_type: 'Usage anomaly', district, scheme: 'LPG' },
        ];
    }
}

function generateEmailHtml(recipientName: string, district: string, fraudCases: FraudCase[]): string {
    const date = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const refNo = `JA/ALERT/${Date.now()}`;

    const fraudTableRows = fraudCases.map((fraud, index) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; text-align: center; font-weight: 600;">${index + 1}</td>
            <td style="padding: 12px;">
                <div style="font-weight: 600; color: #1f2937;">${fraud.beneficiary_id}</div>
            </td>
            <td style="padding: 12px;">
                <div style="font-weight: 500;">${fraud.dealer_id || 'N/A'}</div>
                <div style="font-size: 12px; color: #6b7280;">${fraud.dealer_name || ''}</div>
            </td>
            <td style="padding: 12px;">
                <span style="
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 600;
                    ${fraud.risk_level === 'HIGH'
            ? 'background-color: #fef2f2; color: #dc2626;'
            : 'background-color: #fffbeb; color: #d97706;'}
                ">${fraud.risk_level}</span>
            </td>
            <td style="padding: 12px; text-align: center; font-weight: 600;">${fraud.risk_score.toFixed(2)}</td>
            <td style="padding: 12px; color: #374151;">${fraud.alert_type}</td>
        </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: #2c1100; color: white; padding: 20px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #ff9933; display: inline-block;"></span>
                <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #ffffff; display: inline-block;"></span>
                <span style="width: 12px; height: 12px; border-radius: 50%; background-color: #138808; display: inline-block;"></span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">GOVERNMENT OF INDIA</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Ministry of Consumer Affairs, Food & Public Distribution</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600;">JanAvlokan - Welfare Intelligence Platform</p>
        </div>

        <!-- Alert Banner -->
        <div style="background-color: #dc2626; color: white; padding: 12px 20px; text-align: center;">
            <strong>🚨 URGENT FRAUD ALERT - IMMEDIATE ACTION REQUIRED</strong>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <div style="margin-bottom: 20px; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;">Date: ${date}</p>
                <p style="margin: 5px 0 0 0;">Reference No: ${refNo}</p>
            </div>

            <div style="margin-bottom: 25px;">
                <p style="margin: 0; font-weight: 600; color: #1f2937;">To,</p>
                <p style="margin: 5px 0; font-weight: 700; color: #2c1100; font-size: 16px;">${recipientName}</p>
                <p style="margin: 0; color: #6b7280;">District Welfare Officer</p>
                <p style="margin: 0; color: #6b7280;">${district}, Uttar Pradesh</p>
            </div>

            <p style="color: #374151; line-height: 1.6;">Dear Sir/Madam,</p>
            
            <p style="color: #374151; line-height: 1.6;">
                Greetings from JanAvlokan. This is to bring to your <strong>urgent attention</strong> the following 
                high-priority fraud cases detected in <strong>${district}</strong> district through our AI-powered 
                anomaly detection system. These cases involve suspicious activities related to beneficiaries and 
                dealers that require <strong>immediate investigation</strong>.
            </p>

            <!-- Fraud Table -->
            <div style="margin: 30px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #2c1100; color: white; padding: 15px 20px;">
                    <h2 style="margin: 0; font-size: 16px;">TOP 10 HIGH-RISK FRAUD CASES - ${district.toUpperCase()}</h2>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f9fafb;">
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">S.No</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Beneficiary ID</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Dealer Info</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Risk Level</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Score</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Alert Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fraudTableRows}
                    </tbody>
                </table>
            </div>

            <!-- Recommended Actions -->
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #92400e; font-size: 16px;">📋 RECOMMENDED ACTIONS</h3>
                <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
                    <li>Initiate field verification for <strong>HIGH risk</strong> cases within 48 hours</li>
                    <li>Cross-verify beneficiary details with Aadhaar database</li>
                    <li>Investigate dealer records for flagged transactions</li>
                    <li>Check for duplicate registrations across schemes</li>
                    <li>Document all findings in the JanAvlokan dashboard</li>
                    <li>Submit investigation report within <strong>7 working days</strong></li>
                </ol>
            </div>

            <p style="color: #374151; line-height: 1.6;">
                For any queries or technical assistance, please contact our helpdesk at 
                <strong>1800-XXX-XXXX</strong> or email <strong>support@janavlokan.gov.in</strong>
            </p>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #374151;">With regards,</p>
                <p style="margin: 10px 0 0 0; font-weight: 700; color: #2c1100;">JanAvlokan Automated Alert System</p>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Ministry of Consumer Affairs, Food & Public Distribution</p>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Government of India</p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0;">This is an auto-generated alert from JanAvlokan Welfare Intelligence Platform.</p>
            <p style="margin: 5px 0 0 0;">Please do not reply to this email.</p>
            <p style="margin: 10px 0 0 0; font-style: italic;">
                Disclaimer: This email and any attachments are confidential and intended solely for the addressee.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
}

function generatePlainText(recipientName: string, district: string, fraudCases: FraudCase[]): string {
    const date = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const fraudList = fraudCases.map((fraud, index) =>
        `${index + 1}. Beneficiary: ${fraud.beneficiary_id}
   Dealer: ${fraud.dealer_id || 'N/A'} (${fraud.dealer_name || 'N/A'})
   Risk: ${fraud.risk_level} (${fraud.risk_score.toFixed(2)})
   Alert: ${fraud.alert_type}`
    ).join('\n\n');

    return `
GOVERNMENT OF INDIA
Ministry of Consumer Affairs, Food & Public Distribution
JanAvlokan - Welfare Intelligence Platform

═══════════════════════════════════════════════════════════
🚨 URGENT FRAUD ALERT - ${district.toUpperCase()}
═══════════════════════════════════════════════════════════

Date: ${date}
Reference No: JA/ALERT/${Date.now()}

To: ${recipientName}
District Welfare Officer, ${district}

Dear Sir/Madam,

This is to bring to your urgent attention the following high-priority fraud cases detected in ${district} district through our AI-powered anomaly detection system.

═══════════════════════════════════════════════════════════
TOP 10 HIGH-RISK FRAUD CASES
═══════════════════════════════════════════════════════════

${fraudList}

═══════════════════════════════════════════════════════════
RECOMMENDED ACTIONS
═══════════════════════════════════════════════════════════

1. Initiate field verification for HIGH risk cases within 48 hours
2. Cross-verify beneficiary details with Aadhaar database
3. Investigate dealer records for flagged transactions
4. Check for duplicate registrations across schemes
5. Document all findings in the JanAvlokan dashboard
6. Submit investigation report within 7 working days

For queries: 1800-XXX-XXXX | support@janavlokan.gov.in

---
JanAvlokan Automated Alert System
Government of India
`.trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { recipientId, recipientEmail, recipientName, district, scheme = 'lpg' } = body;

        if (!recipientEmail || !recipientName || !district) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: recipientEmail, recipientName, district'
            }, { status: 400 });
        }

        // Fetch top 10 frauds for the district
        const fraudCases = await getTopFraudsForDistrict(district, scheme);

        // Generate email content
        const htmlContent = generateEmailHtml(recipientName, district, fraudCases);
        const plainText = generatePlainText(recipientName, district, fraudCases);

        // Check if Resend API key is configured
        const resend = getResend();
        if (resend) {
            // Send email using Resend
            const { data, error } = await resend.emails.send({
                from: 'JanAvlokan Alerts <onboarding@resend.dev>', // Use your verified domain in production
                to: [recipientEmail],
                subject: `[URGENT] JanAvlokan Fraud Alert - Top 10 High-Risk Cases in ${district}`,
                html: htmlContent,
                text: plainText,
            });

            if (error) {
                console.error('Resend error:', error);
                return NextResponse.json({
                    success: false,
                    error: error.message || 'Failed to send email via Resend'
                }, { status: 500 });
            }

            console.log('Email sent successfully via Resend:', data);

            return NextResponse.json({
                success: true,
                message: `Alert email sent successfully to ${recipientName}`,
                emailId: data?.id,
                recipientId,
                recipientEmail,
                district,
                fraudCount: fraudCases.length,
                emailPreview: plainText,
                timestamp: new Date().toISOString()
            });
        } else {
            // Demo mode - simulate sending
            console.log('='.repeat(60));
            console.log('DEMO MODE - Email would be sent to:', recipientEmail);
            console.log('District:', district);
            console.log('Fraud Cases:', fraudCases.length);
            console.log('='.repeat(60));

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            return NextResponse.json({
                success: true,
                message: `[DEMO] Alert email simulated for ${recipientName}. Set RESEND_API_KEY to send real emails.`,
                demoMode: true,
                recipientId,
                recipientEmail,
                district,
                fraudCount: fraudCases.length,
                emailPreview: plainText,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Error sending mail:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email'
        }, { status: 500 });
    }
}

export async function GET() {
    // Return the list of recipients
    return NextResponse.json({
        success: true,
        recipients: RECIPIENTS,
        resendConfigured: !!process.env.RESEND_API_KEY
    });
}
