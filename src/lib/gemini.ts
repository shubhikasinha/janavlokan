const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Correct URL format: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-flash:generateContent';

const GEMINI_REQUEST_TIMEOUT = 10_000;

// Shared default language for consistency across all functions
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export type SupportedLanguage = 'en' | 'hi' | 'hinglish';

const ALLOWED_RISK_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;

// Allowlist of valid reason codes
const ALLOWED_REASON_CODES = [
  'high_recent_activity',
  'multiple_dealers',
  'cross_district',
  'high_lifetime_usage',
  'normal',
] as const;

/**

 * @param riskLevel - Raw risk level input
 * @returns Validated risk level or 'UNKNOWN'
 */
function sanitizeRiskLevel(riskLevel: string): string {
  const normalized = riskLevel?.toUpperCase()?.trim() || '';
  if (ALLOWED_RISK_LEVELS.includes(normalized as typeof ALLOWED_RISK_LEVELS[number])) {
    return normalized;
  }
  return 'UNKNOWN';
}

/**

 * @param reasonCodes - Array of raw reason codes
 * @returns Array of validated reason codes
 */
function sanitizeReasonCodes(reasonCodes: string[]): string[] {
  if (!Array.isArray(reasonCodes)) return ['normal'];

  const sanitized = reasonCodes
    .map(code => {
      const cleaned = code?.toLowerCase()?.trim()?.replace(/[\x00-\x1f\x7f]/g, '') || '';
      if (ALLOWED_REASON_CODES.includes(cleaned as typeof ALLOWED_REASON_CODES[number])) {
        return cleaned;
      }
      return null;
    })
    .filter((code): code is string => code !== null);

  return sanitized.length > 0 ? sanitized : ['normal'];
}

const REASON_TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    high_recent_activity: 'Unusually high number of LPG refills detected in the last 30 days',
    multiple_dealers: 'Refills recorded from multiple dealers in short time period',
    cross_district: 'LPG refills detected across different districts',
    high_lifetime_usage: 'Higher-than-expected lifetime refill count compared to regional norms',
    normal: 'Refill behavior aligns with historical and regional norms',
  },
  hi: {
    high_recent_activity: 'पिछले 30 दिनों में असामान्य रूप से अधिक एलपीजी रिफिल पाए गए',
    multiple_dealers: 'कम समय में एकाधिक डीलरों से रिफिल दर्ज किए गए',
    cross_district: 'विभिन्न जिलों से एलपीजी रिफिल पाए गए',
    high_lifetime_usage: 'क्षेत्रीय मानकों की तुलना में अपेक्षा से अधिक जीवनकाल रिफिल संख्या',
    normal: 'रिफिल व्यवहार ऐतिहासिक और क्षेत्रीय मानकों के अनुरूप है',
  },
  hinglish: {
    high_recent_activity: 'Pichhle 30 dinon mein unusually zyada LPG refills detect hui hain',
    multiple_dealers: 'Multiple dealers se short time mein refills recorded hain',
    cross_district: 'Alag-alag districts se LPG refills detect hui hain',
    high_lifetime_usage: 'Regional norms ki tulna mein lifetime refill count zyada hai',
    normal: 'Refill behavior historical aur regional norms ke according hai',
  },
};

// Convert flag codes to reason strings
export function flagsToReasonCodes(flags: {
  flag_high_recent_activity: boolean;
  flag_multiple_dealers: boolean;
  flag_cross_district: boolean;
  flag_high_lifetime_usage: boolean;
}): string[] {
  const reasons: string[] = [];

  if (flags.flag_high_recent_activity) reasons.push('high_recent_activity');
  if (flags.flag_multiple_dealers) reasons.push('multiple_dealers');
  if (flags.flag_cross_district) reasons.push('cross_district');
  if (flags.flag_high_lifetime_usage) reasons.push('high_lifetime_usage');

  if (reasons.length === 0) reasons.push('normal');

  return reasons;
}

export function getStaticExplanations(
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string[] {
  const templates = REASON_TEMPLATES[language] || REASON_TEMPLATES[DEFAULT_LANGUAGE];

  // Filter out 'normal' if there are actual flags present
  const filteredCodes = reasonCodes.filter(code => code !== 'normal');

  // If we have actual flags, show those explanations
  // Only show 'normal' if it's the ONLY reason code
  if (filteredCodes.length > 0) {
    return filteredCodes.map(code => templates[code] || `Flag: ${code}`);
  }

  // Truly no flags - show normal
  return [templates.normal];
}

// Generate AI-powered explanation via Gemini (with safety guards)
export async function generateGeminiExplanation(
  riskLevel: string,
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<string> {
  const safeRiskLevel = sanitizeRiskLevel(riskLevel);
  const safeReasonCodes = sanitizeReasonCodes(reasonCodes);

  // If no API key, use static fallback
  if (!GEMINI_API_KEY) {
    const staticReasons = getStaticExplanations(safeReasonCodes, language);
    return staticReasons.join('\n');
  }

  const languageMap: Record<string, string> = {
    en: 'English (formal, administrative)',
    hi: 'Hindi (formal, government style)',
    hinglish: 'Hinglish (simple Hindi + English mix)',
  };

  const prompt = `You are generating explanations for a government audit dashboard.

Rules:
- Do NOT add new reasons
- Do NOT infer intent or fraud
- Do NOT mention machine learning or prediction
- Do NOT use words like "suspicious", "fraud", "illegal", "criminal"
- Use neutral, administrative language

Risk Level: ${safeRiskLevel}
Reasons:
${safeReasonCodes.map(r => `- ${r}`).join('\n')}

Output Language: ${languageMap[language] || languageMap[DEFAULT_LANGUAGE]}
Tone: Clear, non-accusatory, human-readable

Generate a brief explanation (2-3 sentences max) suitable for a government officer reviewing this case.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT);

  try {
    // SECURITY: API key sent via header, not URL query parameter
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY, // Secure header-based authentication
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Low temperature for consistent output
          maxOutputTokens: 200,
        },
      }),
      signal: controller.signal, // Attach abort signal for timeout
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('Gemini API error: HTTP', response.status);
      return getStaticExplanations(safeReasonCodes, language).join('\n');
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const blockedWords = ['fraud', 'intent', 'prediction', 'suspicious', 'criminal', 'illegal', 'model thinks'];
    const hasBlockedWord = blockedWords.some(word =>
      explanation.toLowerCase().includes(word)
    );

    if (hasBlockedWord || !explanation.trim()) {
      console.warn('Gemini output filtered due to policy constraints');
      return getStaticExplanations(safeReasonCodes, language).join('\n');
    }

    return explanation.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Gemini API request timed out after', GEMINI_REQUEST_TIMEOUT, 'ms');
      return getStaticExplanations(safeReasonCodes, language).join('\n');
    }

    console.error('Gemini API call failed:', error instanceof Error ? error.message : 'Unknown error');
    return getStaticExplanations(safeReasonCodes, language).join('\n');
  }
}
export function getRiskBadgeText(riskLevel: string, language: SupportedLanguage = DEFAULT_LANGUAGE): string {
  const badges: Record<string, Record<string, string>> = {
    en: {
      HIGH: 'High Risk – Review Recommended',
      MEDIUM: 'Medium Risk – Monitor',
      LOW: 'Low Risk – Normal',
    },
    hi: {
      HIGH: 'उच्च जोखिम – समीक्षा आवश्यक',
      MEDIUM: 'मध्यम जोखिम – निगरानी',
      LOW: 'कम जोखिम – सामान्य',
    },
    hinglish: {
      HIGH: 'High Risk – Audit Review Recommended',
      MEDIUM: 'Medium Risk – Monitoring Required',
      LOW: 'Low Risk – Normal Pattern',
    },
  };

  return badges[language]?.[riskLevel] || badges.en[riskLevel] || 'Unknown Risk';
}

const ALLOWED_MDM_REASON_CODES = [
  'ghost_meals',
  'ingredient_inflation',
  'fund_overclaim',
  'cook_anomaly',
  'normal',
] as const;

const MDM_REASON_TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    ghost_meals: 'Students reported as served exceed actual attendance records - Ghost Meals detected',
    ingredient_inflation: 'Ingredient usage (rice, dal, vegetables) exceeds government norms per student',
    fund_overclaim: 'Funds claimed significantly exceed expected per-student MDM allocation',
    cook_anomaly: 'Meals marked as served without cook present on duty',
    normal: 'School meal operations align with MDM scheme guidelines and norms',
  },
  hi: {
    ghost_meals: 'रिपोर्ट किए गए छात्र वास्तविक उपस्थिति से अधिक हैं - घोस्ट मील का पता चला',
    ingredient_inflation: 'सामग्री का उपयोग (चावल, दाल, सब्जी) प्रति छात्र सरकारी मानकों से अधिक है',
    fund_overclaim: 'दावा किए गए फंड प्रति छात्र MDM आवंटन से काफी अधिक हैं',
    cook_anomaly: 'रसोइया की अनुपस्थिति में भोजन परोसे जाने के रूप में चिह्नित',
    normal: 'स्कूल भोजन संचालन MDM योजना के दिशानिर्देशों के अनुरूप है',
  },
  hinglish: {
    ghost_meals: 'Served students report actual attendance se zyada hai - Ghost Meals detect hui',
    ingredient_inflation: 'Ingredient usage (chawal, dal, sabzi) per student govt norms se zyada hai',
    fund_overclaim: 'Claimed funds expected MDM allocation se kaafi zyada hain',
    cook_anomaly: 'Meal served mark hai but cook present nahi tha',
    normal: 'School meal operations MDM scheme guidelines ke according hain',
  },
};

function sanitizeMDMReasonCodes(reasonCodes: string[]): string[] {
  if (!Array.isArray(reasonCodes)) return ['normal'];

  const sanitized = reasonCodes
    .map(code => {
      const cleaned = code?.toLowerCase()?.trim()?.replace(/[\x00-\x1f\x7f]/g, '') || '';
      if (ALLOWED_MDM_REASON_CODES.includes(cleaned as typeof ALLOWED_MDM_REASON_CODES[number])) {
        return cleaned;
      }
      return null;
    })
    .filter((code): code is string => code !== null);

  return sanitized.length > 0 ? sanitized : ['normal'];
}

export function mdmFlagsToReasonCodes(flags: {
  flag_ghost_meals: boolean;
  flag_ingredient_inflation: boolean;
  flag_fund_overclaim: boolean;
  flag_cook_anomaly: boolean;
}): string[] {
  const reasons: string[] = [];

  if (flags.flag_ghost_meals) reasons.push('ghost_meals');
  if (flags.flag_ingredient_inflation) reasons.push('ingredient_inflation');
  if (flags.flag_fund_overclaim) reasons.push('fund_overclaim');
  if (flags.flag_cook_anomaly) reasons.push('cook_anomaly');

  if (reasons.length === 0) reasons.push('normal');

  return reasons;
}

export function getMDMStaticExplanations(
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string[] {
  const templates = MDM_REASON_TEMPLATES[language] || MDM_REASON_TEMPLATES[DEFAULT_LANGUAGE];
  return reasonCodes.map(code => templates[code] || templates.normal);
}

export async function generateMDMGeminiExplanation(
  riskLevel: string,
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<string> {
  const safeRiskLevel = sanitizeRiskLevel(riskLevel);
  const safeReasonCodes = sanitizeMDMReasonCodes(reasonCodes);

  if (!GEMINI_API_KEY) {
    return getMDMStaticExplanations(safeReasonCodes, language).join('\n');
  }

  const languageMap: Record<string, string> = {
    en: 'English (formal, administrative)',
    hi: 'Hindi (formal, government style)',
    hinglish: 'Hinglish (simple Hindi + English mix)',
  };

  const prompt = `You are generating explanations for a government Mid Day Meal (MDM) scheme audit dashboard.

Rules:
- Do NOT add new reasons
- Do NOT infer intent or fraud
- Do NOT mention machine learning or prediction
- Do NOT use words like "suspicious", "fraud", "illegal", "criminal"
- Use neutral, administrative language
- Focus on operational observations only

Scheme: Mid Day Meal (MDM) - School Nutrition Program
Risk Level: ${safeRiskLevel}
Observations:
${safeReasonCodes.map(r => `- ${r.replace(/_/g, ' ')}`).join('\n')}

Output Language: ${languageMap[language] || languageMap[DEFAULT_LANGUAGE]}
Tone: Clear, non-accusatory, human-readable

Generate a brief explanation (2-3 sentences max) suitable for an MDM scheme auditor reviewing this school's records.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT);

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('MDM Gemini API error: HTTP', response.status);
      return getMDMStaticExplanations(safeReasonCodes, language).join('\n');
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const blockedWords = ['fraud', 'intent', 'prediction', 'suspicious', 'criminal', 'illegal', 'model thinks'];
    const hasBlockedWord = blockedWords.some(word =>
      explanation.toLowerCase().includes(word)
    );

    if (hasBlockedWord || !explanation.trim()) {
      console.warn('MDM Gemini output filtered due to policy constraints');
      return getMDMStaticExplanations(safeReasonCodes, language).join('\n');
    }

    return explanation.trim();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('MDM Gemini API request timed out');
    } else {
      console.error('MDM Gemini API call failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    return getMDMStaticExplanations(safeReasonCodes, language).join('\n');
  }
}
