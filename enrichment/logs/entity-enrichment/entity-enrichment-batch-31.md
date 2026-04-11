# Entity Enrichment — Batch 31
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 66 (11 fields x 6 entities)

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1702 | Jerome Pesenti | 11 | 4/5 |
| 1703 | David Singleton | 11 | 4/5 |
| 1704 | Hugo Barra | 11 | 3/5 |
| 1705 | Nicholas Jitkoff | 11 | 3/5 |
| 1706 | Department of Homeland Security | 11 | 4/5 |
| 1707 | National Institutes of Health | 11 | 4/5 |

**Edge note:** Entities 1702–1705 all have `employer` edges to Meta AI. Pesenti's edge role says
"Director" but he was VP of AI — this is a pre-existing edge inaccuracy, not modified per instructions.
Singleton, Barra, and Jitkoff's edges have null roles. All four co-founded Dreamer in 2024; Dreamer was
acqui-hired by Meta in March 2026 and the team joined Meta's Superintelligence Labs. Pesenti left Meta
in 2022 and is now CTO at Campus (edtech), so the existing employer edge to Meta AI is stale for him.
DHS and NIH both have `collaborator` edges to U.S. AI Safety Institute (NIST) as TRAINS Taskforce members.

---

## Changes

### 1702 Jerome Pesenti — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 544-char summary: VP of AI at Meta (2018–2022), UK AI review co-chair, founded Sizzle AI, acquired by Campus Oct 2025, now CTO of Campus, AI bias advocacy |
| notes_v1 | null | null (no prior notes to back up) |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Corporate |
| influence_type | null | Decision-maker, Builder |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Serious |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.cnbc.com/2018/01/23/facebook-hires-jerome-pesenti-as-new-vp-of-ai.html
- https://campus.edu/blog/press-release/campus-acquires-sizzle-ai
- https://www.cnbc.com/2025/10/10/sam-altman-college-startup-campus-meta-ai.html
- https://mattturck.com/pesenti/

**Confidence:** 4/5 — Career path well documented. Regulatory stance "Targeted" inferred from his
public statements advocating legal frameworks to protect vulnerable populations without stifling
innovation, plus his focus on AI bias in specific systems (GPT-3). No explicit position on broad
regulation. AI risk "Serious" inferred from bias/toxicity concerns and responsible AI advocacy.

---

### 1703 David Singleton — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 492-char summary: Stripe CTO (7yr), Google VP Eng (11yr), co-founded Dreamer 2024, $56M seed, acqui-hired by Meta March 2026, joined Superintelligence Labs |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Corporate |
| influence_type | null | Builder, Decision-maker |
| belief_regulatory_stance | null | Light-touch |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://siliconangle.com/2024/11/26/new-startup-named-dev-agents-led-ex-google-meta-tech-leaders-raises-56m-ai-agents/
- https://siliconangle.com/2026/03/23/meta-acqui-hires-co-founders-agentic-ai-startup-dreamer/
- https://www.siliconrepublic.com/business/ex-stripe-cto-david-singleton-and-dreamer-team-join-meta
- https://www.pymnts.com/meta/2026/meta-recruits-dreamer-team-to-scale-personalized-ai-agents/

**Confidence:** 4/5 — Career and Dreamer founding well documented. Beliefs inferred from builder
profile: rapid AI agent deployment, Meta alignment, no public statements on regulation or risk.
"Light-touch" and "Manageable" are conservative inferences from his product-focused, innovation-first
orientation.

---

### 1704 Hugo Barra — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 477-char summary: VP Meta Reality Labs (2017–2021), Google VP Android, Xiaomi VP, co-founded Dreamer 2024, returned to Meta March 2026 via acqui-hire, Superintelligence Labs |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Corporate |
| influence_type | null | Builder, Decision-maker |
| belief_regulatory_stance | null | Light-touch |
| belief_ai_risk | null | Manageable |
| belief_evidence_source | null | Inferred |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://www.cnbc.com/2026/03/25/hugo-barras-return-to-meta-5-years-after-exit-underscores-ai-urgency.html
- https://www.androidheadlines.com/2026/03/hugo-barra-returns-to-meta-dreamer-ai-deal.html
- https://www.techbuzz.ai/articles/hugo-barra-returns-to-meta-after-5-years-signals-ai-pivot
- https://intellectia.ai/news/etf/meta-reinforces-ai-strategy-with-hugo-barras-return

**Confidence:** 3/5 — Career well documented but AI policy views are not public. Beliefs weakly
inferred from Meta alignment and product-building orientation. No speeches, testimony, or writing
on AI regulation found.

---

### 1705 Nicholas Jitkoff — person / Executive

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 413-char summary: designer/technologist, Figma Sr Design Dir, Google Chrome principal designer, Dropbox, co-founded Dreamer 2024 as CDO, acqui-hired by Meta March 2026 |
| notes_v1 | null | null |
| notes_sources | null | 4 URLs |
| notes_confidence | null | 3 |
| funding_model | null | Corporate |
| influence_type | null | Builder |
| belief_regulatory_stance | null | Unknown |
| belief_ai_risk | null | Unknown |
| belief_evidence_source | null | Unknown |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Sources:**
- https://winbuzzer.com/2026/03/24/meta-hires-dreamer-ai-startup-team-superintelligence-labs-xcxwbn/
- https://siliconangle.com/2026/03/23/meta-acqui-hires-co-founders-agentic-ai-startup-dreamer/
- https://topaiproduct.com/2026/03/23/dreamer-raised-56m-to-build-an-agent-os-5-weeks-after-launch-meta-hired-the-entire-team/
- https://www.siliconrepublic.com/business/ex-stripe-cto-david-singleton-and-dreamer-team-join-meta

**Confidence:** 3/5 — Career path documented but Jitkoff is primarily a designer, not an AI policy
figure. No public statements on AI regulation, risk, or timelines found. All belief fields set to
"Unknown" rather than speculate.

---

### 1706 Department of Homeland Security — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 554-char summary: federal cabinet dept, 3-year AI strategy, DHS Directive 139-08 (Jan 2025), prohibited AI uses, CIO as Chief AI Officer, AI Governance Board, AI Safety and Security Board, TRAINS Taskforce member, CBP edge AI for border security |
| notes_v1 | null | null |
| notes_sources | null | 5 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | null | Decision-maker, Implementer |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Serious |
| belief_evidence_source | null | Explicitly stated |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://www.dhs.gov/ai
- https://www.dhs.gov/publication/us-department-homeland-security-artificial-intelligence-strategy
- https://fedscoop.com/dhs-ai-policy-2025-prohibited-uses/
- https://www.govconwire.com/articles/how-ai-is-transforming-homeland-security-cyber
- https://www.dhs.gov/sites/default/files/2025-09/25_0926_cio_dhs_compliance_plan_for_omb_m-25-21_508.pdf

**Confidence:** 4/5 — DHS AI strategy, directive, and governance structure are well documented from
primary .gov sources. "Targeted" regulatory stance: DHS sets sector-specific rules (prohibited uses,
acquisition governance) rather than broad R&D restrictions. "Serious" AI risk reflects their focus on
cybersecurity, border threats, and critical infrastructure protection.

---

### 1707 National Institutes of Health — organization / Government/Agency

| Field | Before | After |
| ----- | ------ | ----- |
| notes | null | 554-char summary: primary federal biomedical research agency (HHS), first AI Strategic Plan in development (RFI July 2025), 233% AI/ML funding growth FY2019–2023, grant AI policy (Aug 2025), FY2026 budget cuts, TRAINS Taskforce member |
| notes_v1 | null | null |
| notes_sources | null | 5 URLs |
| notes_confidence | null | 4 |
| funding_model | null | Government |
| influence_type | null | Decision-maker, Funder/investor, Researcher/analyst |
| belief_regulatory_stance | null | Targeted |
| belief_ai_risk | null | Serious |
| belief_evidence_source | null | Explicitly stated |
| belief_agi_timeline | null | Unknown |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | TRUE | TRUE |

**Sources:**
- https://datascience.nih.gov/artificial-intelligence
- https://grants.nih.gov/grants/guide/notice-files/NOT-OD-25-117.html
- https://www.fiercehealthcare.com/ai-and-machine-learning/nih-seeks-comment-creation-first-ai-strategic-plan-adds-tranche-ai-support
- https://grants.nih.gov/news-events/nih-extramural-nexus-news/2025/07/apply-responsibly-policy-on-ai-use-in-nih-research-applications-and-limiting-submissions-per-pi
- https://www.jmir.org/2026/1/e84861

**Confidence:** 4/5 — AI strategy development and grant policies well documented from primary .gov
and peer-reviewed sources. "Targeted" regulatory stance: NIH sets domain-specific rules (grant AI
use policy, research integrity) rather than broad AI regulation. "Serious" AI risk reflects their
careful approach to AI in healthcare and concern about research integrity.
