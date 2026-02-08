[DashboardService] Cache HIT for dashboard:distribution:MDM
 GET /api/mdm/dashboard/distribution 200 in 12ms (compile: 3ms, render: 9ms)      
[DashboardService] Cache MISS for dashboard:summary:MDM, querying BigQuery
[MDMService] Cache HIT for mdm:high-risk:50
 GET /api/mdm/schools/high-risk?limit=50 200 in 47ms (compile: 43ms, render: 4ms) 
[MDMService] Cache HIT for mdm:high-risk:50
 GET /api/mdm/schools/high-risk?limit=50 200 in 7ms (compile: 3ms, render: 4ms)   
[MDMService] Cache HIT for mdm:high-risk:50
 GET /api/mdm/schools/high-risk?limit=50 200 in 8ms (compile: 3ms, render: 6ms)   
 GET /api/mdm/dashboard/summary 200 in 1042ms (compile: 72ms, render: 970ms)
[DashboardService] Cache HIT for dashboard:summary:MDM
 GET /api/mdm/dashboard/summary 200 in 7ms (compile: 3ms, render: 4ms)
MDM Gemini API error: HTTP 404
[AuditService] AUDIT ENTRY (Table not created): {
  audit_id: '7f1449ea-4eb7-461b-8946-a015e17d6e0e',
  beneficiary_id: '381',
  action: 'PREDICTION_VIEWED',
  officer_id: 'ANONYMOUS',
  officer_name: 'Dashboard User',
  notes: 'Viewed prediction details',
  previous_risk_level: 'HIGH',
  new_status: 'HIGH',
  scheme_type: 'MDM',
  created_at: '2026-02-07T18:05:55.895Z'
}
[AuditService] Error: Access Denied: Table gfg-fot:lpg_fraud_detection.audit_trail: Permission bigquery.tables.updateData denied on table gfg-fot:lpg_fraud_detection.audit_trail (or it may not exist).
 GET /api/mdm/schools/381?lang=hinglish 200 in 3.8s (compile: 552ms, render: 3.3s)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 1065ms (compile: 42ms, render: 1023ms)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 947ms (compile: 3ms, render: 944ms)
MDM Gemini API error: HTTP 404
[AuditService] AUDIT ENTRY (Table not created): {
  audit_id: '721fe8a7-d8af-415f-81b7-4c6d1d172a10',
  beneficiary_id: '381',
  action: 'PREDICTION_VIEWED',
  officer_id: 'ANONYMOUS',
  officer_name: 'Dashboard User',
  notes: 'Viewed prediction details',
  previous_risk_level: 'HIGH',
  new_status: 'HIGH',
  scheme_type: 'MDM',
  created_at: '2026-02-07T18:06:01.284Z'
}
[AuditService] Error: Access Denied: Table gfg-fot:lpg_fraud_detection.audit_trail: Permission bigquery.tables.updateData denied on table gfg-fot:lpg_fraud_detection.audit_trail (or it may not exist).
 GET /api/mdm/schools/381?lang=en 200 in 3.2s (compile: 10ms, render: 3.2s)       
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 1030ms (compile: 6ms, render: 1024ms)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 1028ms (compile: 3ms, render: 1025ms)
MDM Gemini API error: HTTP 404
[AuditService] AUDIT ENTRY (Table not created): {
  audit_id: '482fb16d-4a64-4bc0-bc44-73b2659a59a3',
  beneficiary_id: '493',
  action: 'PREDICTION_VIEWED',
  officer_id: 'ANONYMOUS',
  officer_name: 'Dashboard User',
  notes: 'Viewed prediction details',
  previous_risk_level: 'HIGH',
  new_status: 'HIGH',
  scheme_type: 'MDM',
  created_at: '2026-02-07T18:06:21.302Z'
}
[AuditService] Error: Access Denied: Table gfg-fot:lpg_fraud_detection.audit_trail: Permission bigquery.tables.updateData denied on table gfg-fot:lpg_fraud_detection.audit_trail (or it may not exist).
 GET /api/mdm/schools/493?lang=en 200 in 3.0s (compile: 10ms, render: 3.0s)       
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 989ms (compile: 3ms, render: 986ms)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 1033ms (compile: 3ms, render: 1030ms)
MDM Gemini API error: HTTP 404
[AuditService] AUDIT ENTRY (Table not created): {
  audit_id: 'e024c00b-080b-423a-a26e-24fbab34e655',
  beneficiary_id: '396',
  action: 'PREDICTION_VIEWED',
  officer_id: 'ANONYMOUS',
  officer_name: 'Dashboard User',
  notes: 'Viewed prediction details',
  previous_risk_level: 'MEDIUM',
  new_status: 'MEDIUM',
  scheme_type: 'MDM',
  created_at: '2026-02-07T18:06:30.752Z'
}
[AuditService] Error: Access Denied: Table gfg-fot:lpg_fraud_detection.audit_trail: Permission bigquery.tables.updateData denied on table gfg-fot:lpg_fraud_detection.audit_trail (or it may not exist).
 GET /api/mdm/schools/396?lang=en 200 in 3.7s (compile: 11ms, render: 3.7s)       
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 976ms (compile: 4ms, render: 972ms)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 958ms (compile: 4ms, render: 955ms)
MDM Gemini API error: HTTP 404
[AuditService] AUDIT ENTRY (Table not created): {
  audit_id: '269a92c1-dd3d-4198-9323-afe373b070d9',
  beneficiary_id: '399',
  action: 'PREDICTION_VIEWED',
  officer_id: 'ANONYMOUS',
  officer_name: 'Dashboard User',
  notes: 'Viewed prediction details',
  previous_risk_level: 'HIGH',
  new_status: 'HIGH',
  scheme_type: 'MDM',
  created_at: '2026-02-07T18:06:39.621Z'
}
[AuditService] Error: Access Denied: Table gfg-fot:lpg_fraud_detection.audit_trail: Permission bigquery.tables.updateData denied on table gfg-fot:lpg_fraud_detection.audit_trail (or it may not exist).
 GET /api/mdm/schools/399?lang=en 200 in 2.5s (compile: 10ms, render: 2.5s)       
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 892ms (compile: 3ms, render: 889ms)
 GET /api/audit/feedback-stats?scheme_type=MDM 200 in 970ms (compile: 2ms, render: 967ms)


## Error Type
Console Error

## Error Message
HTTP 500


    at fetchDistrictData (src/components/IndiaMap.tsx:191:28)

## Code Frame
  189 |         const res = await fetch(apiEndpoint, { signal: controller.signal });
  190 |         console.log(`[IndiaMap] Response status: ${res.status}`);
> 191 |         if (!res.ok) throw new Error(`HTTP ${res.status}`);
      |                            ^
  192 |         const json = await res.json();
  193 |         console.log(`[IndiaMap] Received data:`, json);
  194 |         // Handle both array response and potential error object

Next.js version: 16.1.5 (Turbopack)


also case investigation ke andar sab kuch hardocoded aa rha not real

