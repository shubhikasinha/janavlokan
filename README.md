# JanAvlokan (जनावलोकन)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/BigQuery-ML-4285F4?style=flat-square&logo=google-cloud" alt="BigQuery" />
  <img src="https://img.shields.io/badge/Vertex_AI-Enabled-FF6F00?style=flat-square&logo=google-cloud" alt="Vertex AI" />
  <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?style=flat-square&logo=google" alt="Gemini" />
</p>

**AI-Powered Subsidy Leakage Detection & Monitoring Platform**

---

## Overview

JanAvlokan is a cloud-native, privacy-first decision-support platform designed to proactively identify potential leakages in large-scale government welfare schemes. It uses unsupervised machine learning, policy-aware risk calibration, and explainable analytics to help administrators prioritize audits early—without disrupting legitimate beneficiaries.

![alt text](image.png)

---

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Visualization:** Recharts, Leaflet (District Heatmaps)
- **Backend:** Next.js API Routes
- **Database:** Google BigQuery (analytical core)
- **AI/ML:** BigQuery ML (batch), Vertex AI (real-time), Google Gemini AI (explanations)
- **Cloud:** Google Cloud Platform (GCP)

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── alerts/email/          # Email alert triggers
│   │   ├── analytics/             # Temporal spikes & time-series analysis
│   │   ├── audit/                 # Audit logs & export functionality
│   │   ├── batch/refresh/         # Batch data refresh operations
│   │   ├── beneficiaries/         # Beneficiary risk data & details
│   │   ├── dashboard/             # Summary & distribution APIs
│   │   ├── geo/district-risk/     # District-level risk heatmap data
│   │   ├── predict/quick-scan/    # Real-time CSV fraud detection (Vertex AI)
│   │   └── mdm/                   # Mid-Day Meal scheme APIs
│   ├── dashboard/                 # Main risk monitoring dashboard
│   ├── analytics/                 # Analytics & insights page
│   ├── geographic-analysis/       # Interactive India risk heatmap
│   ├── temporal-trends/           # Time-series trend analysis
│   ├── about/                     # About the platform
│   ├── features/                  # Feature explanations
│   └── technology/                # Technology stack details
├── components/                    # Reusable UI components
│   ├── CSVQuickScan.tsx           # Real-time CSV fraud scanner
│   ├── IndiaMap.tsx               # Interactive district heatmap
│   ├── TimeSeriesChart.tsx        # Temporal trend charts
│   ├── HighPriorityAlerts.tsx     # Critical alert display
│   ├── SchemeSwitcher.tsx         # LPG/MDM scheme toggle
│   └── ...
├── context/
│   └── SchemeContext.tsx          # Global scheme state management
└── lib/
    ├── bigquery.ts                # BigQuery client & queries
    └── gemini.ts                  # Gemini AI integration
```

---

## System Architecture

JanAvlokan follows a scalable, modular pipeline built on Google Cloud Platform:

- **BigQuery** serves as the analytical core, storing anonymized transaction data partitioned by date and clustered by scheme and region, enabling analysis at 100M+ transaction scale.
- **SQL-based feature engineering** derives behavioral signals such as rolling claim frequency, deviation from historical averages, cross-scheme overlaps, temporal spikes, and privacy-safe collusion indicators using hashed identifiers.
- **Vertex AI Endpoint** provides real-time predictions for instant fraud detection without database writes.

---

## Machine Learning & Intelligence Layer

The platform uses unsupervised anomaly detection to model normal beneficiary behavior without relying on labeled fraud data.

Each transaction or beneficiary receives:
- A normalized risk score (0-1)
- Risk classification based on scheme-specific thresholds
- Feature-level contributions for explainability

Models are periodically retrained to adapt to policy, seasonal, and regional changes.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Anomaly Detection** | Unsupervised learning to identify deviations without pre-labeled fraud data |
| **Privacy-Safe Detection** | Detect coordinated misuse using hashed identifiers while preserving privacy |
| **Policy-Aware Calibration** | Dynamic thresholds that adapt to scheme type, region, and seasonal variations |
| **Explainable Insights** | Human-readable explanations for every flagged case for audit defensibility |
| **District Heatmaps** | Geographic visualization of risk concentration across districts |
| **Automated Alerts** | Email notifications for high-risk patterns requiring immediate attention |
| **CSV Quick Scan** | Upload transaction data for instant Vertex AI-powered fraud detection |
| **Multi-Scheme Support** | Switch between LPG Subsidy and Mid-Day Meal monitoring |

---

## Dashboard Capabilities

- Ranked high-risk beneficiaries with risk scores
- Clear, AI-generated risk explanations
- Cross-scheme and temporal pattern analysis
- District/block-level risk heatmaps for targeted audits
- Time-series visualization of transaction anomalies
- Audit trail and export functionality
- Real-time CSV fraud scanning (no database writes needed)

---

## Privacy & Ethics

- No PII is stored or transmitted
- All sensitive identifiers are irreversibly hashed
- Location data is aggregated at district/block level
- The system is strictly advisory—humans always remain in control
- Zero subsidies are blocked or denied; only flagged for review

---

## Getting Started

### Prerequisites
- Node.js 18+
- Google Cloud account with BigQuery access
- GCP service account key (gcp-key.json)

### Installation

```bash
# Clone the repository
git clone https://github.com/shubhikasinha/JanAvlokan.git
cd JanAvlokan

# Install dependencies
npm install

# Set up environment variables
# Add your GCP key file as gcp-key.json in the root directory

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

---

## Impact

Based on public finance benchmarks, JanAvlokan can potentially detect 10-30% of high-risk leakage cases early, enabling smarter audits, reduced wastage, and increased public trust in welfare systems.

| Metric | Value |
|--------|-------|
| Beneficiaries Monitored | 4.2 Crore+ |
| Schemes Covered | LPG Subsidy, Mid-Day Meals |
| States Analyzed | 28 |
| Real-time Prediction | <200ms response |

---

## Conclusion

JanAvlokan demonstrates how BigQuery, Vertex AI, Gemini AI, and explainable analytics can transform subsidy monitoring from reactive audits into proactive, transparent governance—making it a practical, scalable solution aligned with India's vision of Viksit Bharat.

---


