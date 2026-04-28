# Research Data Analysis

**Generated:** 2026-04-27

This document summarizes the current state of research data and assesses which Mapping AI research questions can be answered with existing data versus requiring further enrichment.

---

## Current Data Inventory

### Files

| File | Size | Description |
|------|------|-------------|
| `map-data.json` | 1.6 MB | Core entity data (people, orgs, resources) + relationships |
| `map-detail.json` | 1.2 MB | Extended detail fields (notes, stance details, threat models) |
| `claims-detail.json` | 2.8 MB | Sourced claims with citations across belief dimensions |
| `agi-definitions.json` | 295 KB | AGI definition quotes clustered by conceptual framing |

---

## Entity Counts

| Entity Type | Count |
|-------------|-------|
| People | 708 |
| Organizations | 717 |
| Resources | 149 |
| Relationships (edges) | 2,151 |
| Person-org affiliations | 5 |
| Sourced claims | 4,784 |
| Unique sources | 2,809 |
| AGI definition data points | 240 |

---

## Data Coverage by Field

### Belief Dimensions

| Dimension | People Coverage | Orgs Coverage |
|-----------|-----------------|---------------|
| Regulatory stance | 617 (87%) | 510 (71%) |
| AI risk level | 580 (81%) | 509 (70%) |
| AGI timeline | 232 (32%) | 157 (21%) |

**Note:** AGI timeline has significantly lower coverage than other dimensions.

### Other Fields

| Field | People | Orgs |
|-------|--------|------|
| Location | 326 (46%) | 379 (52%) |
| Funding model | N/A | 549 (76%) |
| Parent org | N/A | 0 (0%) |

### Relationship Types

| Type | Count |
|------|-------|
| employer | 675 |
| member | 339 |
| collaborator | 248 |
| partner | 212 |
| founder | 187 |
| funder | 148 |
| parent_company | 110 |
| advisor | 82 |
| author | 57 |
| publisher | 40 |
| critic | 23 |
| supporter | 21 |

### Claims by Dimension

| Dimension | Count |
|-----------|-------|
| regulatory_stance | 1,507 |
| ai_risk_level | 1,370 |
| agi_timeline | 874 |
| agi_definition | 420 |
| state_preemption | 177 |
| pre_deployment_testing | 112 |
| liability | 102 |
| export_controls_chips | 89 |
| compute_governance | 72 |
| open_source_weights | 61 |

### Claims Confidence

| Confidence | Count | % |
|------------|-------|---|
| high | 3,067 | 64% |
| medium | 869 | 18% |
| unverified | 806 | 17% |
| low | 42 | 1% |

---

## Category Distribution

### People Categories

| Category | Count |
|----------|-------|
| Academic | 148 |
| Researcher | 140 |
| Executive | 133 |
| Policymaker | 132 |
| Organizer | 86 |
| Investor | 30 |
| Journalist | 24 |
| Cultural figure | 14 |

### Organization Categories

| Category | Count |
|----------|-------|
| Academic | 165 |
| AI Safety/Alignment | 144 |
| VC/Capital/Philanthropy | 83 |
| Government/Agency | 82 |
| Think Tank/Policy Org | 70 |
| Deployers & Platforms | 51 |
| Media/Journalism | 28 |
| Labor/Civil Society | 27 |
| Ethics/Bias/Rights | 21 |
| Frontier Lab | 20 |
| Infrastructure & Compute | 14 |
| Political Campaign/PAC | 12 |

### AGI Definition Clusters

| Cluster | Count |
|---------|-------|
| Human-Level Cognitive Parity | 66 |
| Conceptual Critique | 42 |
| Superintelligent Systems | 38 |
| General-Purpose Agents | 31 |
| Economic Work Automation | 25 |
| Transformative Impact | 18 |
| Autonomous Research | 12 |
| Augmentative Tools | 8 |

---

## Research Question Assessment

### Legend

- **Ready**: Data exists and is sufficient to answer the question
- **Partial**: Some data exists but needs enrichment or deeper analysis
- **Needs Enrichment**: Requires new data collection or significant enrichment

---

### Workshop Priority Questions

| Question | Status | Notes |
|----------|--------|-------|
| **Outlier Stances** | **Ready** | 87% people / 71% orgs have stance_score. Plot view already implemented. Can identify outliers via score distribution. |
| **Funding Overlap** | **Partial** | 148 funder relationships exist. 76% orgs have funding_model. But need structured funding source data (who funds whom with amounts) rather than just funding model type. |
| **Structural Conflicts of Interest** | **Partial** | Have funder (148) and partner (212) relationships. Need to cross-reference frontier labs with their funders and those funders' other grantees. Data exists but requires graph analysis. |
| **Crosspartisan Convergence** | **Ready** | Claims data includes policy-specific dimensions: state_preemption (177), open_source_weights (61), compute_governance (72). CrosspartisanViz component exists. |
| **Network Centrality** | **Ready** | 2,151 relationships enable degree centrality calculation. Can rank by connection count now. |

---

### Outliers / Distribution

| Question | Status | Notes |
|----------|--------|-------|
| Outlier Stances | **Ready** | See above |
| Density Analysis | **Ready** | Score distributions available for stance/risk/timeline. Can compute density maps. |
| Axis Correlation | **Ready** | Three axes with scores available. Can compute correlation coefficients. |
| Clustering and Polarization | **Ready** | AGI definitions already clustered into 8 groups. Belief scores enable k-means or similar. |

---

### Funding

| Question | Status | Notes |
|----------|--------|-------|
| Funding Overlap | **Partial** | Funder relationships exist (148) but lack amounts, dates, and granular source attribution. |
| Structural Conflicts of Interest | **Partial** | Need to build funding graph from funder relationships. Data exists but not pre-computed. |

---

### Coalitions

| Question | Status | Notes |
|----------|--------|-------|
| Crosspartisan Convergence | **Ready** | Policy dimension claims available. |
| Oversight and Funding | **Needs Enrichment** | No data on AI safety org funding sources. Need to trace funding flows from labs to safety orgs. |

---

### Revolving Door / Personnel

| Question | Status | Notes |
|----------|--------|-------|
| Sequential Positions | **Partial** | Have employer (675) relationships but no temporal data (start/end dates). Can't trace sequence. |
| Personnel Movement Pathways | **Partial** | Same as above. Need career timeline data. |
| Network Centrality | **Ready** | Can compute from existing relationship graph. |

---

### Unrepresented Populations

| Question | Status | Notes |
|----------|--------|-------|
| Absence from the Table | **Needs Enrichment** | Current data captures who IS present, not who's missing. Would need external reference list of affected populations and their representatives. |

---

### Expertise Gaps

| Question | Status | Notes |
|----------|--------|-------|
| Domain Mismatch | **Partial** | Have categories (Academic, Researcher, etc.) but not granular expertise fields (CS vs. labor economics vs. civil rights law). Would need domain tagging enrichment. |

---

### Narrative Control

| Question | Status | Notes |
|----------|--------|-------|
| Framing Overrepresentation | **Needs Enrichment** | Have threat_models field but no Congressional testimony corpus or peer-reviewed lit comparison. |
| Overton Window Analysis | **Partial** | 149 resources with topic_tags. Could analyze policy scope per org but need more systematic resource coverage. |
| Policy Gaps | **Needs Enrichment** | No academic literature baseline to compare against advocacy positions. |

---

### Organizational Ecology

| Question | Status | Notes |
|----------|--------|-------|
| Founding Year Distribution | **Needs Enrichment** | No founding_year field captured. |
| Cohort Effects (2020-2022 EA funding) | **Needs Enrichment** | No founding dates. |
| Funding, Stance, and Timing | **Partial** | Have stance + funding_model but no founding dates. |
| Structural Predictors of Ideology | **Partial** | Have location (52% orgs), stance, category. Could correlate but gaps in coverage. |
| Investor-Fundee Alignment | **Partial** | Have funder relationships (148) and parent_company (110). Can compare stances. |
| Temporal Shifts | **Needs Enrichment** | No temporal data on entities or resources. |

---

### Democratic Legitimacy

| Question | Status | Notes |
|----------|--------|-------|
| Accountability Gaps | **Needs Enrichment** | No data on venue type (public hearing vs. private convening) or elected official involvement. |

---

### Network Connections

| Question | Status | Notes |
|----------|--------|-------|
| Degrees of Separation | **Ready** | Graph data exists. Can compute shortest paths. |
| Idea Progression | **Needs Enrichment** | Have relationships but no temporal citation/mention data to trace idea flow. |
| Ecosystem Connectivity | **Ready** | Can compute connectivity metrics per category from relationship graph. |
| Internal Cohesion | **Ready** | Can measure within-category connection density. |
| Resource Alignment | **Partial** | Have 149 resources with author/publisher links. Limited coverage. |
| Concern Groupings and Ideology | **Ready** | Have threat_models field + stance. Can analyze co-occurrence. |

---

### Data Transparency and Variance

| Question | Status | Notes |
|----------|--------|-------|
| Submission Type and Variance | **Partial** | Have source_type (all "external" currently) and claims with confidence levels. No variance scores computed. |
| Transparency | **Partial** | Could derive from claims confidence distribution per entity. Not pre-computed. |

---

## Summary: Question Readiness

| Category | Ready | Partial | Needs Enrichment |
|----------|-------|---------|------------------|
| Workshop Priority (5) | 3 | 2 | 0 |
| Outliers/Distribution (4) | 4 | 0 | 0 |
| Funding (2) | 0 | 2 | 0 |
| Coalitions (2) | 1 | 0 | 1 |
| Revolving Door (3) | 1 | 2 | 0 |
| Unrepresented (1) | 0 | 0 | 1 |
| Expertise Gaps (1) | 0 | 1 | 0 |
| Narrative Control (3) | 0 | 1 | 2 |
| Org Ecology (6) | 0 | 3 | 3 |
| Democratic Legitimacy (1) | 0 | 0 | 1 |
| Network Connections (6) | 4 | 1 | 1 |
| Data Transparency (2) | 0 | 2 | 0 |
| **TOTAL (36)** | **13 (36%)** | **14 (39%)** | **9 (25%)** |

---

## Enrichment Priorities

Based on the gap analysis, the following enrichments would unlock the most research questions:

### High Impact

1. **Founding dates for organizations** - Unlocks 3 org ecology questions + temporal analysis
2. **Structured funding flow data** - Unlocks funding overlap, conflicts of interest, oversight questions
3. **Career timeline data** (start/end dates for positions) - Unlocks revolving door questions

### Medium Impact

4. **Granular expertise/domain tags** - Unlocks expertise gap analysis
5. **Congressional testimony corpus** - Unlocks narrative framing analysis
6. **Venue/accountability metadata** - Unlocks democratic legitimacy questions

### Lower Priority

7. **Academic literature baseline** - For policy gap analysis
8. **Affected population reference list** - For representation analysis
9. **Temporal citation data** - For idea flow analysis

---

## Next Steps

1. Prioritize founding date enrichment for organizations (quick win, high value)
2. Structure funder relationships with amounts and dates
3. Add temporal data to employment relationships
4. Compute and cache derived metrics: centrality scores, variance scores, density maps
