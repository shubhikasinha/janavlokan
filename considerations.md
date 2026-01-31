CREATE TABLE `gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations` (
  school_id INT64,
  school_name STRING,
  district STRING,
  risk_level STRING,
  anomaly_score FLOAT64,
  flag_ghost_meals BOOL,
  flag_ingredient_inflation BOOL,
  flag_fund_overclaim BOOL,
  flag_cook_anomaly BOOL,
  total_meals_reported INT64,
  last_updated TIMESTAMP
); ye kar diya bhai


Q3: Aggregation Level & School CardsVerdict: Haan, School Cards hi dikhana.LPG mein Beneficiary (Person) fraud karta tha.MDM mein School (Institution) fraud karta hai.Tera Dashboard "High Risk Schools" dikhayega. Jab us pe click karenge, tab "Daily Logs" khulenge.Q4: Time Granularity (Daily vs Monthly?)Verdict: Analytics = Monthly/Weekly Aggregation.Daily fraud flag karna mushkil hai (kabhi chawal bach jata hai, kabhi extra lagta hai).Model Logic: Agar ek school ne mahine mein 5 baar se zyada discrepancy ki, tab use HIGH RISK mark karo.Frontend pe graph daily dikha dena (spikes dikhane ke liye), par risk score monthly average pe base karna.Q5: Ingredient Norms (Per Student Quantities) - The Cheat SheetBhai ye Govt of India ke standard MDM norms hain (Threshold set karne ke liye ye use kar):ItemPrimary (Class 1-5)Upper Primary (Class 6-8)Threshold Logic (Fraud)Rice/Wheat100 gms150 gmsIf Usage > 110% of (Attendance × Norm)Dal (Pulses)20 gms30 gmsIf Usage > 110% of (Attendance × Norm)Vegetables50 gms75 gmsHigh variance allowed (seasonal)Oil/Fat5 gms7.5 gmsIf Usage > 120%3. Updated Logic for flag_ghost_meals (SQL Example)Tera sabse bada fraud flag "Ghost Meals" (bache aaye nahi, khana dikha diya) aise calculate hoga:SQL-- Ghost Meal Detection Logic
UPDATE `gfg-fot.lpg_fraud_detection.mdm_fraud_with_explanations`
SET flag_ghost_meals = TRUE
WHERE school_id IN (
  SELECT school_id 
  FROM `gfg-fot.lpg_fraud_detection.mdm_daily_record`
  WHERE reported_students_served > (actual_attendance * 1.05) -- 5% margin of error
  GROUP BY school_id
  HAVING COUNT(*) > 3 -- Mahine mein 3 baar se zyada hua toh Fraud
);
Summary for Cloud Setup:Tables: mdm_daily_record aur mdm_school_master upload kar de (Same dataset mein).Output Table: Upar wali mdm_fraud_with_explanations create kar le.Audit: audit_trail table same use kar, bas ek naya column add kar de scheme_type ('LPG' or 'MDM') taaki mix na ho. 
IMP dekh bhai ye haina aisa alag route mat bnana but rather ek single dashboard jsimein unified with switcher ho


2. Code Changes (src/app/api/audit/route.ts)
Tera API code abhi purane columns insert kar raha hai. Is file ko edit karke scheme_type bhi bhejna padega.

Path: src/app/api/audit/route.ts

Change 1: Interfaces Update karo File ke top par AuditEntry aur AuditRequest interfaces mein scheme_type add kar de:

TypeScript
export interface AuditEntry {
  // ... purane fields ...
  new_status: string;
  scheme_type: string; // <-- YE ADD KAR
  created_at: string;
}

export interface AuditRequest {
  // ... purane fields ...
  new_status?: string;
  scheme_type?: 'LPG' | 'MDM'; // <-- YE ADD KAR
}
Change 2: POST Function Update karo POST function ke andar jahan data insert ho raha hai, wahan ye changes kar:

TypeScript
// Inside POST function...
const body: AuditRequest = await request.json();
// scheme_type extract kar, agar nahi aaya toh default 'LPG' maan le
const { beneficiary_id, action, officer_id, officer_name, notes, new_status, scheme_type = 'LPG' } = body; 

// ... (baaki code same rahega) ...

const auditEntry: AuditEntry = {
  // ... baaki fields ...
  new_status: new_status || previousStatus,
  scheme_type: scheme_type, // <-- YE ADD KAR
  created_at: new Date().toISOString(),
};

// ... (try block ke andar query update kar) ...

const insertQuery = `
  INSERT INTO \`gfg-fot.lpg_fraud_detection.audit_trail\`
  (audit_id, beneficiary_id, action, officer_id, officer_name, notes, previous_status, new_status, scheme_type, created_at)
  VALUES
  (@audit_id, @beneficiary_id, @action, @officer_id, @officer_name, @notes, @previous_status, @new_status, @scheme_type, @created_at)
`;

await bigquery.createQueryJob({
  query: insertQuery,
  params: {
    // ... baaki params ...
    new_status: auditEntry.new_status,
    scheme_type: auditEntry.scheme_type, // <-- YE ADD KAR
    created_at: auditEntry.created_at,
  },
});
Bas ho gaya! Ab jab bhi frontend se audit request aayegi, wo 'LPG' ya 'MDM' tag ke saath save hogi.


ISS ko dhyan se plan by plan krke aage badh and lets make it brother