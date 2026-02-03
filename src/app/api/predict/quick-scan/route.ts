import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';

// Vertex AI Endpoint for LPG Fraud Detection
const VERTEX_AI_ENDPOINT = 'projects/541357109155/locations/us-central1/endpoints/4204003599522463744';
const VERTEX_AI_URL = `https://us-central1-aiplatform.googleapis.com/v1/${VERTEX_AI_ENDPOINT}:predict`;

// Expected CSV columns for LPG scheme
const LPG_COLUMNS = [
    'beneficiary_id',
    'total_transactions_30d',
    'total_cylinders_30d',
    'unique_dealers_30d',
    'unique_districts_30d',
    'lifetime_cylinders'
];

interface PredictionResult {
    beneficiary_id: string;
    risk_level: string;
    risk_score: number;
    flags: string[];
}

// Rule-based fraud detection function
function runRuleBasedDetection(validRecords: Record<string, unknown>[]) {
    const results = validRecords.map((record) => {
        const flags: string[] = [];
        let riskScore = 0;

        const cylinders30d = Number(record.total_cylinders_30d) || 0;
        const dealers30d = Number(record.unique_dealers_30d) || 0;
        const districts30d = Number(record.unique_districts_30d) || 0;
        const lifetimeCylinders = Number(record.lifetime_cylinders) || 0;

        if (cylinders30d > 4) {
            flags.push('high_recent_activity');
            riskScore += 0.3;
        }
        if (dealers30d > 2) {
            flags.push('multiple_dealers');
            riskScore += 0.25;
        }
        if (districts30d > 1) {
            flags.push('cross_district');
            riskScore += 0.25;
        }
        if (lifetimeCylinders > 100) {
            flags.push('high_lifetime_usage');
            riskScore += 0.2;
        }

        const risk_level = riskScore >= 0.5 ? 'HIGH' : riskScore >= 0.25 ? 'MEDIUM' : 'LOW';

        return {
            beneficiary_id: String(record.beneficiary_id),
            risk_level,
            risk_score: Math.min(riskScore, 1),
            flags
        };
    });

    const summary = {
        total: results.length,
        high_risk: results.filter((r: PredictionResult) => r.risk_level === 'HIGH').length,
        medium_risk: results.filter((r: PredictionResult) => r.risk_level === 'MEDIUM').length,
        low_risk: results.filter((r: PredictionResult) => r.risk_level === 'LOW').length,
    };

    return NextResponse.json({
        success: true,
        mode: 'rule_based',
        summary,
        results: results.slice(0, 100),
        total_processed: results.length
    });
}

// Get access token using service account credentials
async function getAccessToken(): Promise<string | null> {
    try {
        const auth = new GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        return tokenResponse.token || null;
    } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { records } = body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No records provided. Please upload a valid CSV.'
            }, { status: 400 });
        }

        // Validate records have required fields
        const validRecords = records.filter((record: Record<string, unknown>) => {
            return LPG_COLUMNS.every(col => col in record);
        });

        if (validRecords.length === 0) {
            return NextResponse.json({
                success: false,
                error: `Invalid CSV format. Required columns: ${LPG_COLUMNS.join(', ')}`,
                expected_columns: LPG_COLUMNS
            }, { status: 400 });
        }

        // Get access token using service account
        const accessToken = await getAccessToken();

        if (!accessToken) {
            console.log('No Vertex AI access token, using rule-based detection');
            return runRuleBasedDetection(validRecords);
        }

        // Call Vertex AI endpoint
        const instances = validRecords.map((record: Record<string, unknown>) => ({
            total_transactions_30d: Number(record.total_transactions_30d) || 0,
            total_cylinders_30d: Number(record.total_cylinders_30d) || 0,
            unique_dealers_30d: Number(record.unique_dealers_30d) || 0,
            unique_districts_30d: Number(record.unique_districts_30d) || 0,
            lifetime_cylinders: Number(record.lifetime_cylinders) || 0,
        }));

        const response = await fetch(VERTEX_AI_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ instances }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vertex AI Error:', response.status, errorText);
            console.log('Falling back to rule-based detection...');
            return runRuleBasedDetection(validRecords);
        }

        const predictions = await response.json();

        // Map predictions back to records
        const results: PredictionResult[] = validRecords.map((record: Record<string, unknown>, idx: number) => {
            const prediction = predictions.predictions?.[idx] || {};
            return {
                beneficiary_id: String(record.beneficiary_id),
                risk_level: prediction.risk_level || 'UNKNOWN',
                risk_score: prediction.risk_score || 0,
                flags: prediction.flags || [],
            };
        });

        const summary = {
            total: results.length,
            high_risk: results.filter(r => r.risk_level === 'HIGH').length,
            medium_risk: results.filter(r => r.risk_level === 'MEDIUM').length,
            low_risk: results.filter(r => r.risk_level === 'LOW').length,
        };

        return NextResponse.json({
            success: true,
            mode: 'vertex_ai',
            summary,
            results: results.slice(0, 100),
            total_processed: results.length
        });

    } catch (error) {
        console.error('Quick Scan Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
