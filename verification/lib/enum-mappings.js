/**
 * Enum Repair Mappings
 *
 * Maps invalid/legacy values to valid schema values.
 * Values not in this map go to human review queue.
 */

export const FUNDING_MODEL_MAP = {
  // Direct mappings to valid values
  Philanthropic: 'Philanthropic',
  'VC-backed': 'Venture-backed',
  'Revenue-generating': 'Revenue-generating',
  'Government-funded': 'Government-funded',
  Membership: 'Membership',
  Mixed: 'Mixed',
  'Public benefit': 'Public benefit',
  'Self-funded': 'Self-funded',
  Other: 'Other',

  // Legacy → Valid mappings
  'Endowment/philanthropy': 'Philanthropic',
  'Endowment/philanthropic': 'Philanthropic',
  'Philanthropic/grant': 'Philanthropic',
  'Philanthropic/grants': 'Philanthropic',
  'Philanthropic/philanthropy': 'Philanthropic',
  'Philanthropic/philanthropic': 'Philanthropic',
  'Philanthropic/donations': 'Philanthropic',
  'Philanthropic/foundation grants': 'Philanthropic',
  'Philanthropic/grant-funded': 'Philanthropic',
  'Philanthropic/advocacy': 'Philanthropic',
  'Philanthropic/membership': 'Philanthropic',
  'Philanthropic (Jaan Tallinn)': 'Philanthropic',
  'Philanthropic (philanthropic grants)': 'Philanthropic',
  Philanthropy: 'Philanthropic',
  'Grant/nonprofit': 'Philanthropic',
  Donations: 'Philanthropic',
  'Donor-funded': 'Philanthropic',
  'Donor-funded PAC': 'Philanthropic',
  'Donor-pledged philanthropy': 'Philanthropic',
  'Donations/grants': 'Philanthropic',
  Grants: 'Philanthropic',
  'Non-profit/donation': 'Philanthropic',
  Endowment: 'Philanthropic',

  // Government variants
  Government: 'Government-funded',
  'Government (U.S. federal)': 'Government-funded',
  'Government (non-U.S.)': 'Government-funded',
  'Government (South Korean federal)': 'Government-funded',
  'Government (California state)': 'Government-funded',
  'Government (DOE national lab)': 'Government-funded',
  'Government (international treaty body)': 'Government-funded',
  'Government (tax revenue)': 'Government-funded',
  'Government funding (UK Treasury)': 'Government-funded',
  'Government/public': 'Government-funded',
  'Government/Public': 'Government-funded',
  'Government/public university': 'Government-funded',
  'Government/corporate sponsorship': 'Mixed',
  'Government/nonprofit funding': 'Mixed',
  'Government,Private': 'Mixed',
  'Government grants, Revenue': 'Mixed',
  'Government grants, industry partnerships': 'Mixed',
  'Federal government': 'Government-funded',
  'Federal government, Industry partnerships': 'Mixed',
  government: 'Government-funded',
  'Intergovernmental/public': 'Government-funded',
  'Public funding, Grants': 'Government-funded',
  'Public/grants': 'Government-funded',

  // Corporate/Revenue variants
  Corporate: 'Revenue-generating',
  'Corporate/commercial': 'Revenue-generating',
  'Corporate-funded': 'Revenue-generating',
  'Corporate (Microsoft subsidiary)': 'Revenue-generating',
  'Corporate revenue': 'Revenue-generating',
  'Private/corporate': 'Revenue-generating',
  'Revenue-funded': 'Revenue-generating',
  'Revenue-funded consulting': 'Revenue-generating',
  'Revenue-funded (advertising/subscriptions)': 'Revenue-generating',
  'Revenue-funded (standards/certification fees)': 'Revenue-generating',
  Revenue: 'Revenue-generating',
  'For-profit': 'Revenue-generating',
  'For-profit/subscription': 'Revenue-generating',
  'Subscription/reader-funded': 'Revenue-generating',
  'Industry-funded': 'Revenue-generating',
  'Industry consortium': 'Revenue-generating',
  'Fees/nonprofit': 'Revenue-generating',

  // VC variants
  'VC-backed fund': 'Venture-backed',
  'VC-backed (LP commitments)': 'Venture-backed',
  'VC-backed startup': 'Venture-backed',
  'VC-backed (acquired)': 'Venture-backed',
  'VC-backed ($100M total)': 'Venture-backed',
  'VC-backed, Token/crypto': 'Venture-backed',
  'VC fund': 'Venture-backed',
  'Venture-funded': 'Venture-backed',
  'Private/VC-backed': 'Venture-backed',
  'Private capital': 'Venture-backed',
  'Private equity (Thoma Bravo)': 'Venture-backed',

  // Self-funded variants
  Bootstrapped: 'Self-funded',
  'Self-funded (Tallinn wealth)': 'Self-funded',
  'Volunteer/self-funded': 'Self-funded',

  // Academic → Other (not in form)
  Academic: 'Other',
  'Academic/grants': 'Other',
  'Academic/grants/philanthropy': 'Other',
  'Academic/grants/federal': 'Other',
  'Academic/federal grants': 'Other',
  'Academic/federal grants/clinical revenue': 'Other',
  'Academic/corporate membership': 'Other',
  'Academic/endowment': 'Other',
  'Academic/nonprofit': 'Other',
  'Academic, Philanthropic/grants': 'Other',
  University: 'Other',
  'University (Oxford)': 'Other',
  'University (Princeton)': 'Other',
  'University (Cambridge)': 'Other',
  'University (private gift-funded institute)': 'Other',
  'University/public': 'Other',
  'University/grants': 'Other',
  'University/Grants': 'Other',
  'University/academic': 'Other',
  'University/academic (federal grants, philanthropic, institutional)': 'Other',
  'University/endowment': 'Other',
  'University/Endowment': 'Other',
  'University/Affiliates': 'Other',
  'University endowment': 'Other',
  'University endowment, Grants': 'Other',
  'University endowment, research grants': 'Other',
  'University, research grants': 'Other',
  'University, industry partnerships (BMO)': 'Other',
  'University, government research grants': 'Other',
  'University + foundation/grant funding': 'Other',
  'Public university': 'Other',
  'Public university system': 'Other',
  'Consortium (university partners)': 'Other',
  'Consortium/membership': 'Membership',
  'Tuition & grants': 'Other',
  'Endowment/tuition/grants': 'Other',
  'Endowment/academic': 'Other',
  'Endowment/university': 'Other',

  // Membership variants
  'Membership dues, Conference revenue': 'Membership',
  'Donations, membership dues': 'Membership',

  // Volunteer
  'Volunteer/student': 'Other',

  // Public market
  Public: 'Other',
  public: 'Other',
  'Public market': 'Other',
  'Public (Euronext Amsterdam)': 'Other',
  'Sovereign wealth': 'Other',

  // Legal/special
  'Legal fees/litigation': 'Other',
}

// Long-form PAC descriptions → flag for human review (too specific to auto-map)
export const FUNDING_MODEL_HUMAN_REVIEW = [
  /Super PAC/i,
  /PAC funded/i,
  /\$\d+/, // Contains dollar amounts
  /million/i,
]

export const THREAT_MODELS_MAP = {
  // Valid values (pass through)
  'Labor displacement': 'Labor displacement',
  'Economic inequality': 'Economic inequality',
  'Power concentration': 'Power concentration',
  'Democratic erosion': 'Democratic erosion',
  Cybersecurity: 'Cybersecurity',
  Misinformation: 'Misinformation',
  Environmental: 'Environmental',
  Weapons: 'Weapons',
  'Loss of control': 'Loss of control',
  'Copyright/IP': 'Copyright/IP',
  'Existential risk': 'Existential risk',

  // Legacy → Valid mappings
  'Weapons proliferation': 'Weapons',
  'Nuclear weapons proliferation': 'Weapons',
  'CBRN weapons': 'Weapons',
  'CBRN weapons proliferation': 'Weapons',
  'CBRN risks': 'Weapons',
  'Bio/chem weapon uplift': 'Weapons',
  'Bioterrorism (warns AI could accelerate pathogen design by malicious actors)': 'Weapons',
  Biosecurity: 'Weapons',

  'Labor/economic': 'Labor displacement', // Pick one, add note
  "Job market disruption (warns impact will grow significantly over next five years). Has stated 'there is no upper limit' to AI capabilities and it will surpass human levels without hitting a plateau. Concerned about complacency when AGI deadlines are missed creating false security.":
    'Labor displacement',

  'Erosion of epistemics': 'Misinformation',
  'Accidents/misalignment': 'Loss of control',
  'Deceptive alignment': 'Loss of control',
  'loss of control': 'Loss of control',
  'loss of human control over advanced AI systems': 'Loss of control',
  'model autonomy': 'Loss of control',

  Democracy: 'Democratic erosion',
  'democratic erosion via bureaucratic AI decision-making': 'Democratic erosion',

  'Catastrophic risk': 'Existential risk',

  'Mass surveillance': 'Privacy',
  'Mass surveillance and government overreach': 'Privacy',
  'Privacy violations through commercial data aggregation': 'Privacy',
  'Privacy violations through facial recognition and surveillance technology': 'Privacy',
  'Privacy breaches': 'Privacy',

  'algorithmic bias': 'Bias/discrimination',
  'Civil rights violations': 'Bias/discrimination',

  'cyber attack capabilities': 'Cybersecurity',
  'automated cyberattacks': 'Cybersecurity',
  'AI-enabled scams': 'Cybersecurity',
  'Fraud/scams': 'Cybersecurity',
  'Identity fraud and deepfakes': 'Cybersecurity',

  'AI race dynamics': 'Power concentration',
  'Regulatory capture (large companies using regulation to stifle competition). Believes humans should focus on creative work while machines handle bounded':
    'Power concentration',

  'Child safety/exploitation': 'Bias/discrimination',
  'Non-consensual intimate imagery (AI-generated explicit content harming victims': 'Bias/discrimination',
  'Mental health impacts on youth. In June 2025 interview': 'Bias/discrimination',
  "AI-induced mental health crises including 'AI psychosis' and addiction to chatbots": 'Bias/discrimination',
}

// Values to add to schema (common but not in form)
export const THREAT_MODELS_SCHEMA_CANDIDATES = [
  'National security', // 83 entities
  'Bias/discrimination', // 33 entities
  'Privacy', // 12 entities
]

// Long descriptions → flag for human review
export const THREAT_MODELS_HUMAN_REVIEW = [
  /warns/i,
  /emphasizes/i,
  /specifically/i,
  /\(.*\)/, // Contains parenthetical explanations
]

/**
 * Repair a funding_model value
 * @returns {object} { value: string|null, action: 'mapped'|'human_review'|'unchanged' }
 */
export function repairFundingModel(value) {
  if (!value) return { value: null, action: 'unchanged' }

  // Check if it needs human review
  for (const pattern of FUNDING_MODEL_HUMAN_REVIEW) {
    if (pattern.test(value)) {
      return { value, action: 'human_review', reason: 'Complex PAC/funding description' }
    }
  }

  // Check direct mapping
  if (FUNDING_MODEL_MAP[value]) {
    const mapped = FUNDING_MODEL_MAP[value]
    return {
      value: mapped,
      action: mapped === value ? 'unchanged' : 'mapped',
      original: value,
    }
  }

  // Unknown value
  return { value, action: 'human_review', reason: 'Unknown funding model' }
}

/**
 * Repair belief_threat_models value (comma-separated)
 * @returns {object} { value: string|null, action: 'mapped'|'human_review'|'unchanged'|'trimmed', dropped: string[] }
 */
export function repairThreatModels(value, maxCount = 3) {
  if (!value) return { value: null, action: 'unchanged' }

  const values = value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v)
  const mapped = []
  const humanReview = []
  const dropped = []

  for (const v of values) {
    // Check if it needs human review (long description)
    let needsReview = false
    for (const pattern of THREAT_MODELS_HUMAN_REVIEW) {
      if (pattern.test(v) && v.length > 50) {
        needsReview = true
        break
      }
    }

    if (needsReview) {
      humanReview.push(v)
      continue
    }

    // Check direct mapping
    if (THREAT_MODELS_MAP[v]) {
      const m = THREAT_MODELS_MAP[v]
      if (!mapped.includes(m)) {
        mapped.push(m)
      }
    } else if (THREAT_MODELS_SCHEMA_CANDIDATES.includes(v)) {
      // Common value not in schema - keep for now, flag
      if (!mapped.includes(v)) {
        mapped.push(v)
      }
    } else {
      humanReview.push(v)
    }
  }

  // Trim to max count
  if (mapped.length > maxCount) {
    dropped.push(...mapped.slice(maxCount))
    mapped.length = maxCount
  }

  const result = mapped.join(', ') || null

  if (humanReview.length > 0) {
    return {
      value: result,
      action: 'human_review',
      humanReview,
      dropped,
      reason: 'Some values need human review',
    }
  }

  if (dropped.length > 0) {
    return {
      value: result,
      action: 'trimmed',
      dropped,
    }
  }

  if (result !== value) {
    return {
      value: result,
      action: 'mapped',
      original: value,
    }
  }

  return { value: result, action: 'unchanged' }
}
