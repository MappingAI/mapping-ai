/**
 * Valid enum values for belief fields
 *
 * Used for validation in write-corrections.js
 */

export const BELIEF_REGULATORY_STANCE = [
  'Accelerate',
  'Light-touch',
  'Targeted',
  'Moderate',
  'Cautious',
  'Restrictive',
  'Precautionary',
  'Mixed/unclear',
];

export const BELIEF_AGI_TIMELINE = [
  '<2 years',
  '2-5 years',
  '5-10 years',
  '10-20 years',
  '20+ years',
  'Never',
  'Ill-defined',
  'Mixed/unclear',
];

export const BELIEF_AI_RISK = [
  'Existential',
  'Catastrophic',
  'Serious',
  'Moderate',
  'Manageable',
  'Overstated',
  'Minimal',
  'Mixed/nuanced',
];

export const BELIEF_THREAT_MODELS = [
  'Power concentration',
  'Misuse',
  'Accidents/misalignment',
  'Erosion of epistemics',
  'Labor/economic',
  'Surveillance/privacy',
  'Bias/discrimination',
  'Copyright/IP',
];

export const VALID_VALUES = {
  belief_regulatory_stance: BELIEF_REGULATORY_STANCE,
  belief_agi_timeline: BELIEF_AGI_TIMELINE,
  belief_ai_risk: BELIEF_AI_RISK,
  belief_threat_models: BELIEF_THREAT_MODELS,
};

/**
 * Validate a belief field value
 *
 * @param {string} field - Field name
 * @param {string} value - Proposed value
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateBeliefValue(field, value) {
  if (value === null || value === undefined) {
    return { valid: true }; // Null is always valid (removal)
  }

  const validValues = VALID_VALUES[field];
  if (!validValues) {
    return { valid: false, reason: `Unknown field: ${field}` };
  }

  // For threat_models, check each comma-separated value
  if (field === 'belief_threat_models') {
    const values = value.split(',').map(v => v.trim());
    if (values.length > 3) {
      return { valid: false, reason: `Too many threat models: ${values.length} (max 3)` };
    }
    for (const v of values) {
      if (!BELIEF_THREAT_MODELS.includes(v)) {
        return { valid: false, reason: `Invalid threat model: "${v}"` };
      }
    }
    return { valid: true };
  }

  // Single value fields
  if (!validValues.includes(value)) {
    return { valid: false, reason: `Invalid value "${value}" for ${field}` };
  }

  return { valid: true };
}

/**
 * Normalize a belief value (fix common variations)
 *
 * @param {string} field - Field name
 * @param {string} value - Value to normalize
 * @returns {string|null} Normalized value or null if invalid
 */
export function normalizeBeliefValue(field, value) {
  if (!value) return null;

  // Common normalizations
  const normalizations = {
    // Stance
    'light touch': 'Light-touch',
    'light-touch': 'Light-touch',
    'accelerationist': 'Accelerate',
    'precautionary': 'Precautionary',
    'restrictive': 'Restrictive',
    'cautious': 'Cautious',
    'moderate': 'Moderate',
    'targeted': 'Targeted',
    'mixed': 'Mixed/unclear',
    'unclear': 'Mixed/unclear',

    // Timeline
    'less than 2 years': '<2 years',
    '< 2 years': '<2 years',
    '2-3 years': '2-5 years',
    '3-5 years': '2-5 years',
    'never': 'Never',
    'ill-defined': 'Ill-defined',

    // Risk
    'existential': 'Existential',
    'catastrophic': 'Catastrophic',
    'serious': 'Serious',
    'manageable': 'Manageable',
    'overstated': 'Overstated',
    'minimal': 'Minimal',
    'mixed': 'Mixed/nuanced',
  };

  const lower = value.toLowerCase().trim();
  if (normalizations[lower]) {
    return normalizations[lower];
  }

  // Check if already valid
  const validValues = VALID_VALUES[field];
  if (validValues && validValues.includes(value)) {
    return value;
  }

  return value; // Return as-is, let validation catch it
}
