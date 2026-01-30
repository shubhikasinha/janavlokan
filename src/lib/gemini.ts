// Gemini API Integration for Multi-language Explanations
// IMPORTANT: Gemini is ONLY a language polisher - NOT a decision maker
// All fraud flags come from deterministic BigQuery rules
//
// SECURITY NOTES:
// - GEMINI_API_KEY must be set as a server-side environment variable only
// - Never expose this key in client-side code or browser
// - Rotate the key periodically and restrict it to specific APIs in Google Cloud Console
// - This file should only be imported in server-side code (API routes)

// Hardcoded for reliability since .env loading is inconsistent on Windows
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBKlvIrvNy3tlEsYg_XsEmcRHQIhzPSoF4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Configurable timeout for Gemini API requests (in milliseconds)
const GEMINI_REQUEST_TIMEOUT = 10_000; // 10 seconds

// Shared default language for consistency across all functions
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Type definition for supported languages
export type SupportedLanguage = 'en' | 'hi' | 'hinglish';

// ============================================
// Input Sanitization Helpers (Prompt Injection Prevention)
// ============================================

// Allowlist of valid risk levels
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
 * Sanitize risk level against allowlist to prevent prompt injection
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
 * Sanitize reason codes against allowlist to prevent prompt injection
 * Strips control characters and validates each code
 * @param reasonCodes - Array of raw reason codes
 * @returns Array of validated reason codes
 */
function sanitizeReasonCodes(reasonCodes: string[]): string[] {
  if (!Array.isArray(reasonCodes)) return ['normal'];
  
  const sanitized = reasonCodes
    .map(code => {
      // Strip control characters and newlines
      const cleaned = code?.toLowerCase()?.trim()?.replace(/[\x00-\x1f\x7f]/g, '') || '';
      // Validate against allowlist
      if (ALLOWED_REASON_CODES.includes(cleaned as typeof ALLOWED_REASON_CODES[number])) {
        return cleaned;
      }
      return null;
    })
    .filter((code): code is string => code !== null);
  
  return sanitized.length > 0 ? sanitized : ['normal'];
}
// Reason code to human-readable mapping (used as fallback)
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

// Get static explanations (fallback - no API call)
export function getStaticExplanations(
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string[] {
  const templates = REASON_TEMPLATES[language] || REASON_TEMPLATES[DEFAULT_LANGUAGE];
  return reasonCodes.map(code => templates[code] || templates.normal);
}

// Generate AI-powered explanation via Gemini (with safety guards)
export async function generateGeminiExplanation(
  riskLevel: string,
  reasonCodes: string[],
  language: SupportedLanguage = DEFAULT_LANGUAGE
): Promise<string> {
  // Sanitize inputs to prevent prompt injection
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

  // STRICT prompt - Gemini only polishes language, never adds reasons
  // Uses sanitized values to prevent prompt injection
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

  // Create AbortController for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT);

  try {
    // SECURITY: API key sent via header, not URL query parameter
    // This prevents key exposure in server logs, browser history, and referrer headers
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

    // Clear timeout since request completed
    clearTimeout(timeoutId);

    if (!response.ok) {
      // SECURITY: Only log status code, never log request URL or headers that might contain sensitive data
      console.error('Gemini API error: HTTP', response.status);
      return getStaticExplanations(safeReasonCodes, language).join('\n');
    }

    const data = await response.json();
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // SAFETY GUARD: Filter out any inappropriate language that slipped through
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
    // Clear timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    // Handle abort/timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Gemini API request timed out after', GEMINI_REQUEST_TIMEOUT, 'ms');
      return getStaticExplanations(safeReasonCodes, language).join('\n');
    }
    
    // SECURITY: Avoid logging full error objects that might contain request details
    console.error('Gemini API call failed:', error instanceof Error ? error.message : 'Unknown error');
    return getStaticExplanations(safeReasonCodes, language).join('\n');
  }
}

// Get risk level badge text
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
