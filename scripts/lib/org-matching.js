/**
 * Shared organization matching utilities
 *
 * Used by:
 * - dedupe-orgs.js
 * - setup-hierarchy.js
 * - enrich-v2.js
 */

// Duplicate groups: array of [canonicalName, ...variantNames]
// First name is canonical, rest are aliases
export const DUPLICATE_GROUPS = [
  // CHAI / UC Berkeley AI Safety
  [
    'Center for Human-Compatible AI (CHAI)',
    'Center for Human-Compatible AI',
    'Center for Human-Compatible AI (CHAI) - UC Berkeley',
    'Center for Human-Compatible Artificial Intelligence (CHAI) - UC Berkeley',
    'Center for Human-Compatible Artificial Intelligence',
    'Human-Compatible AI',
    'Berkeley CHAI',
    'CHAI',
  ],
  // UK AI Safety/Security Institute
  [
    'UK AI Security Institute',
    'UK AI Safety Institute',
    'AI Security Institute (AISI)',
    'AI Security Institute (UK government)',
    'AI Security Institute (formerly UK AI Safety Institute)',
    'AISI',
  ],
  // NIST AI Institute
  [
    'U.S. AI Safety Institute (NIST)',
    'NIST AI Safety Institute',
    'NIST AI Safety Institute (CAISI)',
    'NIST AI Safety Institute (Center for AI Standards and Innovation - CAISI)',
    'Center for AI Standards and Innovation',
    'Center for AI Standards and Innovation (CAISI)',
    'CAISI',
  ],
  // Open Philanthropy / Coefficient Giving
  [
    'Open Philanthropy',
    'Coefficient Giving (formerly Open Philanthropy)',
    'Coefficient Giving',
    'Coefficient Giving (fka Open Philanthropy)',
  ],
  // MIRI
  [
    'Machine Intelligence Research Institute (MIRI)',
    'MIRI',
    'Machine Intelligence Research Institute',
  ],
  // ARC
  [
    'Alignment Research Center (ARC)',
    'Alignment Research Center',
    'ARC',
  ],
  // CSET
  [
    'Center for Security and Emerging Technology (CSET)',
    'Georgetown CSET',
    'Center for Security and Emerging Technology (Georgetown University)',
    'CSET',
  ],
  // GovAI
  [
    'Centre for the Governance of AI (GovAI)',
    'Centre for the Governance of AI',
    'GovAI',
  ],
  // FHI
  [
    'Future of Humanity Institute (closed 2024)',
    'Future of Humanity Institute',
    'Future of Humanity Institute (Oxford University) - CLOSED 2024',
    'Oxford Future of Humanity Institute (legacy)',
    'FHI',
  ],
  // CAIS
  [
    'Center for AI Safety (CAIS)',
    'Center for AI Safety',
    'CAIS',
  ],
  // Stanford HAI
  [
    'Stanford HAI',
    'Stanford Institute for Human-Centered Artificial Intelligence (HAI)',
    'Stanford Institute for Human-Centered AI',
    'Human-Centered AI Institute',
  ],
  // Brookings
  [
    'Brookings Institution',
    'Brookings Institution (AI Governance)',
    'Brookings Institution (Artificial Intelligence and Emerging Technology Initiative)',
    'Brookings',
  ],
  // a16z
  [
    'Andreessen Horowitz (a16z)',
    'a16z',
    'a16z (Andreessen Horowitz)',
    'Andreessen Horowitz',
  ],
  // Stanford RegLab
  [
    'Stanford RegLab',
    'Stanford RegLab (Regulation, Evaluation, and Governance Lab)',
    'RegLab',
  ],
  // Big Tech
  [
    'Google DeepMind',
    'DeepMind',
    'Google DeepMind (formerly DeepMind)',
  ],
  [
    'Meta',
    'Facebook',
    'Facebook Inc',
    'Meta Platforms',
  ],
  [
    'OpenAI',
    'Open AI',
  ],
  // Media
  [
    'The New York Times',
    'New York Times',
    'NYT',
    'NY Times',
  ],
  [
    'The Washington Post',
    'Washington Post',
    'WaPo',
  ],
  [
    'Financial Times',
    'The Financial Times',
    'FT',
  ],
  // Universities
  [
    'UC Berkeley',
    'University of California, Berkeley',
    'University of California Berkeley',
    'Berkeley',
    'Cal',
  ],
  [
    'MIT',
    'Massachusetts Institute of Technology',
  ],
  [
    'Stanford University',
    'Stanford',
  ],
  [
    'Harvard University',
    'Harvard',
  ],
  [
    'Princeton University',
    'Princeton',
  ],
  [
    'Carnegie Mellon University',
    'CMU',
    'Carnegie Mellon',
  ],
];

// Hierarchy patterns: parent org and regex pattern for children
export const HIERARCHY_PATTERNS = [
  {
    parentName: 'Stanford University',
    childPattern: /^Stanford /i,
    exclude: [],
  },
  {
    parentName: 'MIT',
    childPattern: /^MIT /i,
    exclude: ['MIT Technology Review'],
  },
  {
    parentName: 'Harvard University',
    childPattern: /^Harvard /i,
    exclude: [],
  },
  {
    parentName: 'Princeton University',
    childPattern: /^Princeton /i,
    exclude: [],
  },
  {
    parentName: 'University of Cambridge',
    childPattern: /Cambridge|Leverhulme/i,
    exclude: ['Cambridge Boston Alignment Initiative (CBAI)'],
  },
  {
    parentName: 'University of Oxford',
    childPattern: /Oxford/i,
    exclude: [],
  },
  {
    parentName: 'UC Berkeley',
    childPattern: /Berkeley/i,
    exclude: [],
  },
  {
    parentName: 'New York University',
    childPattern: /NYU|New York University/i,
    exclude: [],
  },
  {
    parentName: 'Google',
    childPattern: /^Google /i,
    exclude: [],
  },
  {
    parentName: 'Meta',
    childPattern: /^Meta |^Facebook /i,
    exclude: ['Meta', 'Facebook'],
  },
  {
    parentName: 'Microsoft',
    childPattern: /^Microsoft /i,
    exclude: ['Microsoft'],
  },
  {
    parentName: 'Anthropic',
    childPattern: /^Anthropic /i,
    exclude: ['Anthropic'],
  },
];

// Build canonical name lookup from duplicate groups
const canonicalLookup = new Map();
for (const group of DUPLICATE_GROUPS) {
  const canonical = group[0];
  for (const variant of group) {
    canonicalLookup.set(variant.toLowerCase(), canonical);
  }
}

/**
 * Normalize an organization name for matching
 */
export function normalizeOrgName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^the /, '')
    .replace(/ inc\.?$/i, '')
    .replace(/ llc\.?$/i, '')
    .replace(/ corp\.?$/i, '')
    .replace(/ ltd\.?$/i, '')
    .replace(/ plc\.?$/i, '')
    .replace(/[''`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get canonical name for an org (if it's a known alias)
 */
export function getCanonicalOrgName(name) {
  const normalized = normalizeOrgName(name);
  return canonicalLookup.get(normalized) || null;
}

/**
 * Find matching entity from a list
 * Returns { entity, matchType } or null
 */
export function findEntityMatch(targetName, allEntities) {
  const targetNorm = normalizeOrgName(targetName);
  const targetCanonical = getCanonicalOrgName(targetName);

  // 1. Exact match on normalized name
  let match = allEntities.find(e => normalizeOrgName(e.name) === targetNorm);
  if (match) return { entity: match, matchType: 'exact' };

  // 2. Canonical alias match
  if (targetCanonical) {
    match = allEntities.find(e => e.name === targetCanonical);
    if (match) return { entity: match, matchType: 'canonical' };

    // Also check if entity's canonical matches
    match = allEntities.find(e => getCanonicalOrgName(e.name) === targetCanonical);
    if (match) return { entity: match, matchType: 'alias' };
  }

  // 3. Substring match (careful with length threshold)
  match = allEntities.find(e => {
    const eNorm = normalizeOrgName(e.name);
    return (
      (targetNorm.includes(eNorm) && eNorm.length > 4) ||
      (eNorm.includes(targetNorm) && targetNorm.length > 4)
    );
  });
  if (match) return { entity: match, matchType: 'substring' };

  // 4. Parenthetical acronym match: "Facebook AI Research (FAIR)" should match "FAIR"
  const parenMatch = targetName.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    const acronym = parenMatch[1].toLowerCase();
    match = allEntities.find(e => normalizeOrgName(e.name) === acronym);
    if (match) return { entity: match, matchType: 'acronym' };
  }

  // Check if any entity has this as acronym
  match = allEntities.find(e => {
    const eParenMatch = e.name.match(/\(([^)]+)\)$/);
    return eParenMatch && eParenMatch[1].toLowerCase() === targetNorm;
  });
  if (match) return { entity: match, matchType: 'acronym_reverse' };

  return null;
}

/**
 * Determine if an org name suggests it should be a child of another org
 * Returns parentName or null
 */
export function getParentOrgName(orgName) {
  for (const h of HIERARCHY_PATTERNS) {
    if (h.childPattern.test(orgName) && !h.exclude.includes(orgName)) {
      return h.parentName;
    }
  }
  return null;
}

/**
 * Check if a name is for a person (vs organization)
 * Basic heuristic based on patterns
 */
export function isProbablyPerson(name) {
  // Likely org patterns
  if (/\b(Inc|LLC|Corp|Ltd|Foundation|Institute|University|Lab|Center|Committee|Agency|Department|Office|Council|Association|Organization|Company|Group|Fund|Project|Initiative)\b/i.test(name)) {
    return false;
  }

  // Likely person patterns (2-3 words, no org keywords)
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    // Check if it looks like a name (capitalized words, no weird characters)
    const looksLikeName = words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]\.?$/.test(w));
    if (looksLikeName) return true;
  }

  return false;
}
