/**
 * Exa Search Integration for Verification Pipeline
 *
 * Provides search functions for the search-attribution agent.
 * Uses EXA_MULTIAGENT_VERIFICATION_KEY for billing isolation.
 */

import Exa from 'exa-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Use dedicated verification API key
const EXA_API_KEY = process.env.EXA_MULTIAGENT_VERIFICATION_KEY || process.env.EXA_API_KEY;

if (!EXA_API_KEY) {
  console.warn('Warning: No Exa API key found. Set EXA_MULTIAGENT_VERIFICATION_KEY in .env');
}

const exa = EXA_API_KEY ? new Exa(EXA_API_KEY) : null;

// Cost tracking (following Anushree's pattern)
export const costs = {
  searches: 0,
  results_returned: 0,
  cost: 0,

  track(resultsCount = 0) {
    this.searches++;
    this.results_returned += resultsCount;
    // Exa pricing: $0.008 per search (as of 2026)
    this.cost = this.searches * 0.008;
  },

  summary() {
    return `Exa: ${this.searches} searches, ${this.results_returned} results ($${this.cost.toFixed(3)})`;
  },

  reset() {
    this.searches = 0;
    this.results_returned = 0;
    this.cost = 0;
  },
};

/**
 * Search for evidence supporting a claim
 *
 * @param {string} query - Search query from decomposer
 * @param {object} options - Search options
 * @returns {Promise<object>} Search results with content
 */
export async function searchForEvidence(query, options = {}) {
  if (!exa) {
    throw new Error('Exa client not initialized. Check EXA_MULTIAGENT_VERIFICATION_KEY.');
  }

  const {
    numResults = 5,
    type = 'auto', // 'neural', 'keyword', or 'auto'
    useAutoprompt = true,
    startPublishedDate = null,
    endPublishedDate = null,
    includeDomains = [],
    excludeDomains = [],
  } = options;

  const searchOpts = {
    numResults,
    type,
    useAutoprompt,
    text: { maxCharacters: 2000 }, // Get content for extraction
    highlights: { numSentences: 3, highlightsPerUrl: 3 },
  };

  if (startPublishedDate) searchOpts.startPublishedDate = startPublishedDate;
  if (endPublishedDate) searchOpts.endPublishedDate = endPublishedDate;
  if (includeDomains.length > 0) searchOpts.includeDomains = includeDomains;
  if (excludeDomains.length > 0) searchOpts.excludeDomains = excludeDomains;

  try {
    const response = await exa.searchAndContents(query, searchOpts);
    costs.track(response.results?.length || 0);

    return {
      success: true,
      query,
      results: response.results.map((r) => ({
        url: r.url,
        title: r.title,
        publishedDate: r.publishedDate,
        author: r.author,
        text: r.text,
        highlights: r.highlights,
        score: r.score,
      })),
    };
  } catch (error) {
    costs.track(0);
    return {
      success: false,
      query,
      error: error.message,
      results: [],
    };
  }
}

/**
 * Search for first-person statements (for belief attribution)
 *
 * @param {string} entityName - Person or org name
 * @param {string} beliefField - Which belief field to search for
 * @returns {Promise<object>} Search results targeting first-person sources
 */
export async function searchForBeliefAttribution(entityName, beliefField) {
  // Build queries targeting first-person sources
  const queries = {
    belief_regulatory_stance: [
      `"${entityName}" AI regulation testimony statement "I believe"`,
      `"${entityName}" wrote op-ed AI policy regulation`,
    ],
    belief_agi_timeline: [
      `"${entityName}" AGI timeline prediction "I think" years`,
      `"${entityName}" artificial general intelligence when statement`,
    ],
    belief_ai_risk: [
      `"${entityName}" AI risk existential catastrophic "my view"`,
      `"${entityName}" AI safety danger statement interview`,
    ],
    belief_threat_models: [
      `"${entityName}" AI threat concern "I'm worried" danger`,
      `"${entityName}" AI risk labor displacement misinformation`,
    ],
  };

  const fieldQueries = queries[beliefField] || [`"${entityName}" ${beliefField.replace(/_/g, ' ')} statement`];

  // Run searches in parallel
  const results = await Promise.all(
    fieldQueries.map((q) =>
      searchForEvidence(q, {
        numResults: 3,
        // Prioritize interviews, testimony, op-eds
        excludeDomains: ['wikipedia.org', 'wikidata.org'],
      })
    )
  );

  // Merge and deduplicate by URL
  const seenUrls = new Set();
  const mergedResults = [];

  for (const r of results) {
    if (r.success) {
      for (const result of r.results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          mergedResults.push(result);
        }
      }
    }
  }

  return {
    success: true,
    entity: entityName,
    field: beliefField,
    queries: fieldQueries,
    results: mergedResults,
  };
}

/**
 * Search for factual verification (role, org, dates)
 *
 * @param {string} entityName - Person or org name
 * @param {string} factualClaim - What to verify
 * @param {string} claimType - 'role', 'org', 'date', 'url'
 * @returns {Promise<object>} Search results from primary sources
 */
export async function searchForFactualClaim(entityName, factualClaim, claimType = 'general') {
  // Target primary sources based on claim type
  const domainsByType = {
    role: ['linkedin.com', 'crunchbase.com'],
    org: ['linkedin.com', 'crunchbase.com'],
    date: ['crunchbase.com', 'sec.gov', 'reuters.com'],
    general: [],
  };

  const query = `"${entityName}" ${factualClaim}`;
  const includeDomains = domainsByType[claimType] || [];

  return searchForEvidence(query, {
    numResults: 3,
    type: 'keyword', // More precise for factual claims
    includeDomains,
  });
}

/**
 * Validate a URL exists and fetch its content
 *
 * @param {string} url - URL to validate
 * @returns {Promise<object>} Validation result with content if valid
 */
export async function validateUrl(url) {
  if (!exa) {
    throw new Error('Exa client not initialized. Check EXA_MULTIAGENT_VERIFICATION_KEY.');
  }

  try {
    // Use Exa's getContents to fetch the URL
    const response = await exa.getContents([url], {
      text: { maxCharacters: 3000 },
    });

    costs.track(1);

    if (response.results && response.results.length > 0) {
      const result = response.results[0];
      return {
        success: true,
        url,
        valid: true,
        title: result.title,
        text: result.text,
        publishedDate: result.publishedDate,
      };
    }

    return {
      success: true,
      url,
      valid: false,
      reason: 'URL not found or inaccessible',
    };
  } catch (error) {
    costs.track(0);
    return {
      success: false,
      url,
      valid: false,
      error: error.message,
    };
  }
}

// Export for use in agents
export { exa };
