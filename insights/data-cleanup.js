/**
 * Data normalization for insights visualizations
 * Maps messy field values to canonical categories
 */

const DataCleanup = {

  /**
   * Normalize funding_model to canonical categories
   */
  normalizeFundingModel(raw) {
    if (!raw) return null;

    const lower = raw.toLowerCase().trim();

    // Government variations
    if (lower.includes('government') || lower.includes('federal') || lower.includes('state') ||
        lower === 'public' || lower.includes('treasury') || lower.includes('tax revenue') ||
        lower.includes('intergovernmental')) {
      return 'Government';
    }

    // Venture capital variations
    if (lower.includes('venture') || lower.includes('vc-') || lower.includes('vc ') ||
        lower === 'vc' || lower.includes('vc/') || lower.includes('/vc')) {
      return 'Venture Capital';
    }

    // Philanthropic variations (check before nonprofit since some are "nonprofit/philanthropic")
    if (lower.includes('philanthropic') || lower.includes('philanthropy') ||
        lower.includes('donor') || lower.includes('donation') || lower.includes('endowment')) {
      return 'Philanthropic';
    }

    // Academic/University variations
    if (lower.includes('academic') || lower.includes('university') || lower.includes('tuition') ||
        lower.includes('college')) {
      return 'Academic';
    }

    // Nonprofit/Grant variations
    if (lower.includes('nonprofit') || lower.includes('non-profit') || lower.includes('grant') ||
        lower.includes('501c')) {
      return 'Nonprofit/Grants';
    }

    // Corporate/Private variations
    if (lower.includes('corporate') || lower.includes('private') || lower.includes('private equity') ||
        lower.includes('revenue') || lower.includes('subscription') || lower.includes('for-profit') ||
        lower.includes('fees') || lower.includes('consulting')) {
      return 'Corporate/Revenue';
    }

    // Political/PAC
    if (lower.includes('pac') || lower.includes('political') || lower.includes('super pac')) {
      return 'Political/PAC';
    }

    // Mixed
    if (lower === 'mixed' || lower.includes(',') || lower.includes(' and ')) {
      return 'Mixed';
    }

    // Membership/Consortium
    if (lower.includes('membership') || lower.includes('consortium') || lower.includes('volunteer')) {
      return 'Membership/Consortium';
    }

    // Self-funded
    if (lower.includes('self-funded') || lower.includes('self funded')) {
      return 'Self-funded';
    }

    // Sovereign/Public market
    if (lower.includes('sovereign') || lower.includes('public market') || lower.includes('euronext')) {
      return 'Public/Sovereign';
    }

    // Fallback - return original if no match
    return raw;
  },

  /**
   * Apply normalization to an array of entities
   */
  normalizeEntities(entities) {
    return entities.map(e => ({
      ...e,
      funding_model_normalized: this.normalizeFundingModel(e.funding_model),
      funding_model_original: e.funding_model
    }));
  },

  /**
   * Get summary of normalization mappings (for debugging)
   */
  getFundingModelMappings(entities) {
    const mappings = {};
    entities.forEach(e => {
      if (e.funding_model) {
        const normalized = this.normalizeFundingModel(e.funding_model);
        if (!mappings[normalized]) {
          mappings[normalized] = new Set();
        }
        mappings[normalized].add(e.funding_model);
      }
    });

    // Convert sets to arrays for readability
    const result = {};
    Object.entries(mappings).forEach(([key, values]) => {
      result[key] = [...values].sort();
    });
    return result;
  },

  /**
   * Canonical funding model order (for consistent chart ordering)
   */
  FUNDING_MODEL_ORDER: [
    'Venture Capital',
    'Corporate/Revenue',
    'Government',
    'Academic',
    'Nonprofit/Grants',
    'Philanthropic',
    'Mixed',
    'Political/PAC',
    'Membership/Consortium',
    'Self-funded',
    'Public/Sovereign'
  ]
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.DataCleanup = DataCleanup;
}

// Export for Node.js (testing)
if (typeof module !== 'undefined') {
  module.exports = DataCleanup;
}
