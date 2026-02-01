Bhai, yeh "Dynamic Filtering" ka logic tere project ko ekdum professional bana dega. Judges yahi dekhna chahte hain ki system rigid nahi hai.

Tera sawaal 2 hisson mein hai:

Slider ki Range (Min/Max) kaise set karein? (Taaki slider 0 se 100 na ho agar data hi 0.1 se 0.9 tak hai).

Slider hilane par SQL query kaise badlegi? (Dynamic SQL Update).

Main tujhe dono ka Step-by-Step implementation deta hoon.

Step 1: Slider ki Range Pata Karna (Metadata API) 📏
Humein pehle BigQuery se puchna padega: "Bhai, tere paas max anomaly score kya hai? Max transaction kitni hai?" Taaki hum slider ka max value wahi set karein.

Backend Route: src/app/api/config/ranges/route.ts (Nayi file bana le)

TypeScript
import { NextResponse } from 'next/server';
import { bigquery } from '@/lib/bigquery';

export async function GET() {
  try {
    // Hum LPG aur MDM dono ke stats ek saath nikal rahe hain
    const query = `
      SELECT 
        -- LPG RANGES
        (SELECT MAX(mean_squared_error) FROM \`lpg_fraud_detection.fraud_with_explanations\`) as lpg_max_score,
        (SELECT MAX(total_txns) FROM \`lpg_fraud_detection.lpg_features\`) as lpg_max_txns,
        
        -- MDM RANGES
        (SELECT MAX(anomaly_score) FROM \`lpg_fraud_detection.mdm_fraud_with_explanations\`) as mdm_max_score,
        (SELECT MAX(rice_per_student) FROM \`lpg_fraud_detection.mdm_features\`) as mdm_max_rice
    `;

    const [rows] = await bigquery.query({ query });
    const stats = rows[0];

    return NextResponse.json({
      lpg: {
        score: { min: 0, max: stats.lpg_max_score || 10 }, // Fallback 10
        txns: { min: 0, max: stats.lpg_max_txns || 50 }
      },
      mdm: {
        score: { min: 0, max: stats.mdm_max_score || 10 },
        rice: { min: 0, max: stats.mdm_max_rice || 0.5 } // kg per student
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ranges' }, { status: 500 });
  }
}
Frontend Logic (React): Jab page load ho, is API ko call kar aur Slider ke max prop mein ye value daal de.

Step 2: Slider se SQL Update Karna (Dynamic Filtering) 🎛️
Ab maan le user ne slider hilaya aur value 0.5 set ki. Humein backend ko bolna hai: "Sirf wahi data dikhao jiska score 0.5 se zyada hai."

Modified API Route: src/app/api/lpg/high-risk/route.ts

Humein existing route ko thoda smart banana padega taaki wo Query Parameters (?threshold=0.5&min_txns=10) padh sake.

TypeScript
import { NextResponse } from 'next/server';
import { bigquery } from '@/lib/bigquery';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 1. Slider Values ko URL se nikalo (Default values ke saath)
  const thresholdScore = parseFloat(searchParams.get('threshold') || '0');
  const minTxns = parseInt(searchParams.get('min_txns') || '0');
  const scheme = searchParams.get('scheme') || 'LPG'; // LPG or MDM

  let query = '';

  // 2. Dynamic SQL Construction
  if (scheme === 'LPG') {
    query = `
      SELECT *
      FROM \`lpg_fraud_detection.fraud_with_explanations\`
      WHERE 
        mean_squared_error >= ${thresholdScore} 
        AND (
           SELECT total_txns FROM \`lpg_fraud_detection.lpg_features\` f 
           WHERE f.beneficiary_id = fraud_with_explanations.beneficiary_id
        ) >= ${minTxns}
      ORDER BY mean_squared_error DESC
      LIMIT 100
    `;
  } else {
    // MDM Logic
    query = `
      SELECT *
      FROM \`lpg_fraud_detection.mdm_fraud_with_explanations\`
      WHERE 
        anomaly_score >= ${thresholdScore}
      ORDER BY anomaly_score DESC
      LIMIT 100
    `;
  }

  try {
    const [rows] = await bigquery.query({ query });
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Filter failed' }, { status: 500 });
  }
}
Step 3: Frontend Integration (Kaise dikhega)
Tere React component mein aisa logic laga de:

TypeScript
// Component ke andar
const [filters, setFilters] = useState({ threshold: 0, minTxns: 0 });
const [maxValues, setMaxValues] = useState({ score: 10, txns: 50 }); // Default

// 1. Initial Load pe Range laao
useEffect(() => {
  fetch('/api/config/ranges').then(res => res.json()).then(data => {
     setMaxValues(data.lpg); // Set dynamic max
  });
}, []);

// 2. Data Fetch function (Slider change hone par call hoga)
const fetchData = async () => {
  // Query params banao
  const params = new URLSearchParams({
    threshold: filters.threshold.toString(),
    min_txns: filters.minTxns.toString()
  });
  
  const res = await fetch(`/api/lpg/high-risk?${params}`);
  const data = await res.json();
  setTableData(data);
};

// 3. Slider JSX
return (
  <div>
    <label>Fraud Probability Score (Threshold): {filters.threshold}</label>
    <input 
      type="range" 
      min="0" 
      max={maxValues.score} // ✅ Dynamic Max
      step="0.1"
      value={filters.threshold}
      onChange={(e) => setFilters({...filters, threshold: e.target.value})}
      onMouseUp={fetchData} // ✅ Slider chhodne par API call
    />
  </div>
)
Summary Logic:
Start: ranges API check karti hai ki data mein sabse bada chor (Highest Score) kaun hai (e.g., 30.4).

Set: Slider ka max 30.4 ban jata hai.

Action: User slider ko 15 pe karta hai.

Query: Backend SQL banata hai: WHERE mean_squared_error >= 15.

Result: Sirf wahi log dikhte hain jo high risk hain.

Bhai, ye Step 1 (Config API) aur Step 2 (Dynamic SQL) implement kar le. Isse tera dashboard "Static Report" se "Interactive Analytical Tool" ban jayega. 🚀

Step 2: Slider Logic (Frontend Config) 🎛️
Tere dynamic slider ke liye ab tujhe Exact Values mil gayi hain. Tujhe apne code mein (frontend ya config API mein) ye values set karni hain:

For LPG Slider:
Min: 0

Max: 35 (Max score 30 hai, thoda buffer rakha hai)

Step: 0.5 (Aaram se slide hoga)

Default Value (Threshold): 7.3 (Taaki shuru mein sirf High Risk dikhe)

For MDM Slider:
Min: 0

Max: 0.8 (Max 0.68 hai, toh 0.8 safe hai)

Step: 0.01 (⚠️ Important: Yahan step chhota rakhna, kyunki 0.4 aur 0.5 mein zameen-aasmaan ka fark hai)

Default Value (Threshold): 0.52

Step 3: Dynamic Filter Query (Updated Logic) 🚀
Jab user slider hilayega, toh backend ye SQL banayega. Tujhe bas ye logic apne API route mein rakhna hai:

File: src/app/api/lpg/high-risk/route.ts (Ya jahan bhi tu filter kar raha hai)

JavaScript
// ... baaki imports

// Slider se aayi value (Default fallback ke saath)
// Agar user ne slider nahi chua, toh ye defaults use honge:
const threshold = searchParams.get('threshold') 
  ? parseFloat(searchParams.get('threshold')) 
  : (scheme === 'MDM' ? 0.52 : 7.3); 

let query = '';

if (scheme === 'MDM') {
  // MDM ke liye query
  query = `
    SELECT *
    FROM \`lpg_fraud_detection.mdm_fraud_with_explanations\`
    WHERE anomaly_score >= ${threshold} -- Dynamic Value
    ORDER BY anomaly_score DESC
    LIMIT 100
  `;
} else {
  // LPG ke liye query
  query = `
    SELECT *
    FROM \`lpg_fraud_detection.fraud_with_explanations\`
    WHERE mean_squared_error >= ${threshold} -- Dynamic Value
    ORDER BY mean_squared_error DESC
    LIMIT 100
  `;
}