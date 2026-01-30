┌─────────────────────────────────────────────────────────────────┐
│                      HUMAN-IN-THE-LOOP FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Model detects HIGH risk → fraud_with_explanations table      │
│                         ↓                                        │
│  2. Officer sees on Dashboard                                    │
│                         ↓                                        │
│  3. Officer clicks button in AuditPanel:                         │
│     ┌──────────────┬────────────────────────────────┐           │
│     │    Button    │        new_status              │           │
│     ├──────────────┼────────────────────────────────┤           │
│     │ 📋 Reviewed   │ UNDER_REVIEW                   │           │
│     │ ✅ Verify     │ VERIFIED_FRAUD                 │           │
│     │ 🚩 Confirm    │ CONFIRMED_FRAUD                │           │
│     │ ✓ Clear      │ GENUINE (False Positive)       │           │
│     │ 📝 Note      │ (no change, just notes)        │           │
│     └──────────────┴────────────────────────────────┘           │
│                         ↓                                        │
│  4. Data saved in audit_trail table:                            │
│     - previous_risk_level: "HIGH" (Model ka decision)           │
│     - new_status: "GENUINE" (Human ka decision)                 │
│     - officer_id, officer_name, notes, timestamp                │
│                         ↓                                        │
│  5. FUTURE: Model retraining mein ye data use hoga              │
│     (Jo human ne GENUINE mark kiya, model seekhega)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘