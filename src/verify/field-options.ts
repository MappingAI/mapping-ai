export interface FieldDef {
  key: string
  label: string
  options?: readonly string[]
  multiSelect?: boolean
  maxTags?: number
}

// Error types per correction context
export const ERROR_TYPES_FIELD = ['Wrong value', 'Outdated', 'Unsourced', 'Missing', 'Ambiguous'] as const
export const ERROR_TYPES_NOTES = ['Factual error', 'Outdated', 'Biased framing', 'Missing context'] as const

// Allowed values for structured fields
const REGULATORY_STANCE = ['Accelerate', 'Light-touch', 'Moderate', 'Cautious', 'Mixed/unclear'] as const
const AGI_TIMELINE = [
  '<2 years',
  '2-5 years',
  '5-10 years',
  '10-20 years',
  '20+ years',
  'Never',
  'Mixed/unclear',
] as const
const AI_RISK_LEVEL = ['Existential', 'High', 'Moderate', 'Low', 'Minimal', 'Mixed/unclear'] as const
const THREAT_MODELS = [
  'Power concentration',
  'Misuse',
  'Accidents/misalignment',
  'Erosion of epistemics',
  'Labor/economic',
  'Surveillance/privacy',
  'Bias/discrimination',
  'Copyright/IP',
] as const
const EVIDENCE_SOURCES = ['Direct quote', 'Published writing', 'Public statement', 'Inferred from actions'] as const
const FUNDING_MODEL = ['Grants', 'Contracts', 'VC', 'Donations', 'Government', 'Revenue', 'Endowment'] as const
const PERSON_CATEGORY = [
  'Executive',
  'Researcher',
  'Policymaker',
  'Investor',
  'Organizer',
  'Journalist',
  'Academic',
  'Cultural figure',
] as const
const ORG_CATEGORY = [
  'Frontier Lab',
  'AI Safety/Alignment',
  'Think Tank/Policy Org',
  'Government/Agency',
  'Academic',
  'VC/Capital/Philanthropy',
  'Labor/Civil Society',
  'Ethics/Bias/Rights',
  'Media/Journalism',
  'Political Campaign/PAC',
  'Infrastructure & Compute',
  'Deployers & Platforms',
] as const

export const PERSON_FIELDS: FieldDef[] = [
  { key: 'category', label: 'Category', options: PERSON_CATEGORY },
  { key: 'title', label: 'Title / Role' },
  { key: 'primary_org', label: 'Primary Organization' },
  { key: 'website', label: 'Website' },
  { key: 'location', label: 'Location' },
  { key: 'belief_regulatory_stance', label: 'Regulatory Stance', options: REGULATORY_STANCE },
  { key: 'belief_agi_timeline', label: 'AGI Timeline', options: AGI_TIMELINE },
  { key: 'belief_ai_risk', label: 'AI Risk Level', options: AI_RISK_LEVEL },
  {
    key: 'belief_threat_models',
    label: 'Key Concerns / Threat Models',
    options: THREAT_MODELS,
    multiSelect: true,
    maxTags: 3,
  },
  { key: 'belief_evidence_source', label: 'Evidence Sources', options: EVIDENCE_SOURCES, multiSelect: true },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'bluesky', label: 'Bluesky' },
]

export const ORG_FIELDS: FieldDef[] = [
  { key: 'category', label: 'Category', options: ORG_CATEGORY },
  { key: 'website', label: 'Website' },
  { key: 'location', label: 'Location' },
  { key: 'funding_model', label: 'Funding Model', options: FUNDING_MODEL, multiSelect: true },
  { key: 'belief_regulatory_stance', label: 'Regulatory Stance', options: REGULATORY_STANCE },
  {
    key: 'belief_threat_models',
    label: 'Key Concerns / Threat Models',
    options: THREAT_MODELS,
    multiSelect: true,
    maxTags: 3,
  },
  { key: 'twitter', label: 'Twitter/X' },
  { key: 'bluesky', label: 'Bluesky' },
]
