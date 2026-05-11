/**
 * Valid enum values for belief fields
 *
 * SOURCE OF TRUTH: full-schema-reference.md
 * These MUST match the contribute forms exactly.
 *
 * Used for:
 * 1. Validation in write-corrections.js (reject invalid values)
 * 2. Prompt generation (ensure agents only propose valid values)
 */

// ── belief_regulatory_stance ──
// Ordered from most permissive to most restrictive
export const BELIEF_REGULATORY_STANCE = [
  'Accelerate',       // Actively opposes regulation, wants faster AI development
  'Light-touch',      // Prefers minimal regulation, industry self-governance
  'Targeted',         // Supports narrow, specific regulations for identified harms
  'Moderate',         // Supports balanced regulation with cost-benefit analysis
  'Precautionary',    // Supports proactive regulation before harms manifest
  'Restrictive',      // Supports significant constraints on AI development/deployment
  'Nationalize',      // Supports government control/ownership of AI development
  'Mixed/unclear',    // Position is inconsistent or cannot be determined
  'Other',            // Describe in notes
];

// ── belief_agi_timeline ──
export const BELIEF_AGI_TIMELINE = [
  'Already here',       // Believes AGI capabilities already exist
  '2-3 years',          // Expects AGI within 2-3 years
  '5-10 years',         // Expects AGI within 5-10 years
  '10-25 years',        // Expects AGI within 10-25 years
  '25+ years or never', // Expects AGI 25+ years away or believes it won't happen
  'Ill-defined',        // Believes AGI is not a coherent/useful concept
  'Unknown',            // Timeline belief cannot be determined
  'Mixed/unclear',      // Has stated conflicting timelines
];

// ── belief_ai_risk ──
// Ordered from lowest to highest concern
export const BELIEF_AI_RISK = [
  'Overstated',     // Believes AI risks are exaggerated by others
  'Manageable',     // AI poses risks that can be addressed with reasonable measures
  'Serious',        // AI poses significant risks requiring major intervention
  'Catastrophic',   // AI poses civilizational-scale risks but not necessarily extinction
  'Existential',    // AI poses risk of human extinction or permanent disempowerment
  'Mixed/nuanced',  // Has nuanced position that doesn't fit categories
  'Unknown',        // Risk assessment cannot be determined
];

// ── belief_threat_models ──
// Pick up to 3
export const BELIEF_THREAT_MODELS = [
  'Labor displacement',   // AI eliminating jobs
  'Economic inequality',  // AI worsening wealth/income gaps
  'Power concentration',  // AI benefits accruing to few actors
  'Democratic erosion',   // AI undermining democratic institutions
  'Cybersecurity',        // AI-enabled attacks
  'Misinformation',       // AI-generated false content
  'Environmental',        // AI's energy/resource consumption
  'Weapons',              // AI enabling weapon development
  'Loss of control',      // AI systems acting against human intent
  'Copyright/IP',         // AI infringing intellectual property
  'Existential risk',     // Risk of human extinction
];

// ── belief_evidence_source ──
export const BELIEF_EVIDENCE_SOURCE = [
  'Explicitly stated', // Position comes from direct quotes, official statements
  'Inferred',          // Position derived from actions, funding patterns, affiliations
  'Unknown',           // Cannot determine evidence basis
];

// ── Lookup maps for validation ──
export const VALID_VALUES = {
  belief_regulatory_stance: BELIEF_REGULATORY_STANCE,
  belief_agi_timeline: BELIEF_AGI_TIMELINE,
  belief_ai_risk: BELIEF_AI_RISK,
  belief_threat_models: BELIEF_THREAT_MODELS,
  belief_evidence_source: BELIEF_EVIDENCE_SOURCE,
};

// ── Validation functions ──

/**
 * Validate a belief field value against the schema
 * Returns { valid: true } or { valid: false, reason: "..." }
 */
export function validateBeliefValue(field, value) {
  // Null is always valid (removal)
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  const validValues = VALID_VALUES[field];
  if (!validValues) {
    return { valid: false, reason: `Unknown field: ${field}` };
  }

  // For threat_models, validate each comma-separated value
  if (field === 'belief_threat_models') {
    const values = value.split(',').map(v => v.trim()).filter(v => v);

    if (values.length > 3) {
      return { valid: false, reason: `Too many threat models: ${values.length} (max 3)` };
    }

    for (const v of values) {
      if (!BELIEF_THREAT_MODELS.includes(v)) {
        return {
          valid: false,
          reason: `Invalid threat model: "${v}"`,
          valid_options: BELIEF_THREAT_MODELS,
        };
      }
    }
    return { valid: true };
  }

  // Single value fields
  if (!validValues.includes(value)) {
    return {
      valid: false,
      reason: `Invalid value "${value}" for ${field}`,
      valid_options: validValues,
    };
  }

  return { valid: true };
}

/**
 * Normalize common variations to valid values
 * Returns the normalized value or null if can't normalize
 */
export function normalizeBeliefValue(field, value) {
  if (!value) return null;

  const lower = value.toLowerCase().trim();

  // ── Regulatory stance normalizations ──
  const stanceMap = {
    'light touch': 'Light-touch',
    'accelerationist': 'Accelerate',
    'accelerate': 'Accelerate',
    'cautious': 'Precautionary',  // Map to closest valid
    'mixed': 'Mixed/unclear',
    'unclear': 'Mixed/unclear',
    'nationalize': 'Nationalize',
    'restrictive': 'Restrictive',
    'precautionary': 'Precautionary',
    'moderate': 'Moderate',
    'targeted': 'Targeted',
  };

  // ── Timeline normalizations ──
  const timelineMap = {
    '<2 years': 'Already here',
    'less than 2 years': 'Already here',
    '2-5 years': '2-3 years',       // Map to closest
    '10-20 years': '10-25 years',   // Map to closest
    '20+ years': '25+ years or never',
    'never': '25+ years or never',
    'ill-defined': 'Ill-defined',
    'unknown': 'Unknown',
    'mixed': 'Mixed/unclear',
  };

  // ── Risk normalizations ──
  const riskMap = {
    'minimal': 'Overstated',        // Map to closest
    'moderate': 'Manageable',       // Map to closest
    'serious': 'Serious',
    'catastrophic': 'Catastrophic',
    'existential': 'Existential',
    'overstated': 'Overstated',
    'manageable': 'Manageable',
    'mixed': 'Mixed/nuanced',
    'nuanced': 'Mixed/nuanced',
    'unknown': 'Unknown',
  };

  // ── Threat model normalizations ──
  const threatMap = {
    'misuse': 'Cybersecurity',              // Map to closest
    'accidents/misalignment': 'Loss of control',
    'erosion of epistemics': 'Misinformation',
    'labor/economic': 'Labor displacement',
    'surveillance/privacy': 'Power concentration', // Map to closest
    'bias/discrimination': 'Democratic erosion',   // Map to closest
    'labor displacement': 'Labor displacement',
    'economic inequality': 'Economic inequality',
    'power concentration': 'Power concentration',
    'democratic erosion': 'Democratic erosion',
    'cybersecurity': 'Cybersecurity',
    'misinformation': 'Misinformation',
    'environmental': 'Environmental',
    'weapons': 'Weapons',
    'loss of control': 'Loss of control',
    'copyright/ip': 'Copyright/IP',
    'existential risk': 'Existential risk',
  };

  // Try field-specific normalization
  if (field === 'belief_regulatory_stance' && stanceMap[lower]) {
    return stanceMap[lower];
  }
  if (field === 'belief_agi_timeline' && timelineMap[lower]) {
    return timelineMap[lower];
  }
  if (field === 'belief_ai_risk' && riskMap[lower]) {
    return riskMap[lower];
  }
  if (field === 'belief_threat_models') {
    // Normalize each threat model
    const values = value.split(',').map(v => {
      const normalized = threatMap[v.trim().toLowerCase()];
      return normalized || v.trim();
    });
    return values.join(', ');
  }

  // Check if already valid (case-sensitive)
  const validValues = VALID_VALUES[field];
  if (validValues && validValues.includes(value)) {
    return value;
  }

  // Can't normalize
  return null;
}

/**
 * Get the valid options for a field (for prompt generation)
 */
export function getValidOptions(field) {
  return VALID_VALUES[field] || [];
}

/**
 * Format valid options as a string for prompts
 */
export function formatValidOptionsForPrompt(field) {
  const options = getValidOptions(field);
  if (field === 'belief_threat_models') {
    return `Pick up to 3 from: ${options.join(', ')}`;
  }
  return options.join(', ');
}
