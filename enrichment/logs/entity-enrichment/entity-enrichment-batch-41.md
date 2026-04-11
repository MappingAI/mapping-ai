# Entity Enrichment — Batch 41
*2026-04-10*
Mode: manual (claude-code)
Entities processed: 6
Fields updated: 64

---

## Summary

| ID | Name | Fields Updated | Confidence |
| -: | ---- | -------------- | ---------: |
| 1767 | Daniel Colson | 10 | 4 |
| 1768 | Brad Carson | 11 | 4 |
| 1769 | Eric Gastfriend | 10 | 3 |
| 1770 | Information Technology Industry Council | 11 | 4 |
| 1771 | Viktoriya Krakovna | 11 | 4 |
| 1772 | Anthony Aguirre | 11 | 4 |

Mixed batch: two AI safety organizers (Colson, Aguirre), two ARI co-founders (Carson, Gastfriend), a DeepMind safety researcher (Krakovna), and a major tech industry trade group (ITI). Strong safety/regulation theme across most entities; ITI is the industry counterweight.

---

## Changes

### [1767] Daniel Colson — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | theaipi.org, thestreet.com, aipolicypod.substack.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Catastrophic |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate, Decision-maker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Co-founder & ED of AI Policy Institute. Strong public record of advocacy for mandatory AI regulation, has explicitly stated "we cannot rely on private industry to govern AI." Conducts polling showing public support for strict regulation. EA/longtermist adjacent.

---

### [1768] Brad Carson — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ari.us, rollcall.com, en.wikipedia.org/wiki/Brad_Carson |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate, Decision-maker |
| other_categories | NULL | Policymaker |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Former U.S. Rep (D-OK), former president of U of Tulsa, now full-time President of ARI. Senate testimony on AI legislation. Bipartisan, pragmatic regulatory approach — not as aggressive as AIPI but clearly pro-regulation. Added Policymaker as other_categories given congressional background.

---

### [1769] Eric Gastfriend — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | ari.us, axios.com, semafor.com |
| notes_confidence | NULL | 3 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Serious |
| belief_evidence_source | NULL | Inferred |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 3/5 — Co-founder & ED of ARI. Less public profile than Carson; beliefs inferred from organizational positioning. EA background (Harvard EA group co-founder). Also runs telehealth addiction treatment startup.

---

### [1770] Information Technology Industry Council — organization

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | itic.org, en.wikipedia.org/wiki/Information_Technology_Industry_Council, insideprivacy.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Light-touch |
| belief_ai_risk | NULL | Manageable |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| funding_model | NULL | Industry-funded |
| influence_type | NULL | Organizer/advocate, Advisor/strategist |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Major DC tech trade group with clear, well-documented policy positions. Supports risk-based regulation but opposes broad restrictions. Advocates for federal preemption of state AI laws. Developed AI Accountability Framework. Collaborates with ARI on NIST AI Safety Institute legislation.

---

### [1771] Viktoriya Krakovna — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | vkrakovna.wordpress.com, futureoflife.org, uk.linkedin.com, scholar.google.com |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Moderate |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Researcher/analyst |
| other_categories | NULL | Academic |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — Senior DeepMind AI safety researcher, FLI co-founder, PhD Harvard. Extensive publication record on alignment. Discussed AGI ruin and sharp left turn publicly. Risk belief explicitly stated through research focus and FLI co-founding. Regulatory stance Moderate (not Restrictive) — works inside a frontier lab, focus is on technical alignment more than policy advocacy.

---

### [1772] Anthony Aguirre — person

| Field | Before | After |
| ----- | ------ | ----- |
| notes | NULL | Updated |
| notes_sources | NULL | anthony-aguirre.com, futureoflife.org, axrp.net, ai-frontiers.org, en.wikipedia.org/wiki/Anthony_Aguirre |
| notes_confidence | NULL | 4 |
| belief_regulatory_stance | NULL | Restrictive |
| belief_ai_risk | NULL | Existential |
| belief_evidence_source | NULL | Explicitly stated |
| belief_agi_timeline | NULL | Unknown |
| influence_type | NULL | Organizer/advocate, Researcher/analyst |
| other_categories | NULL | Academic |
| enrichment_version | v2-auto | phase3-manual |
| qa_approved | FALSE | TRUE |

**Confidence:** 4/5 — FLI Executive Director, UCSC professor, Metaculus president. Explicitly advocates mandatory licensing for frontier AI, independent evaluations with teeth, warns of unsafe AGI race. Wrote "uncontained AGI would replace humanity." Clearly Restrictive/Existential from public statements.

---

## Edge Notes

Existing edges reviewed — no changes needed:
- 2234: Daniel Colson → AI Policy Institute (founder, role: co-founder and executive director) — correct
- 2237: Brad Carson → Americans for Responsible Innovation (founder, role: Co-Founder & President) — correct
- 2238: Eric Gastfriend → Americans for Responsible Innovation (founder, role: Co-Founder & Executive Director) — correct
- 2239: Americans for Responsible Innovation → ITI (collaborator) — confirmed: ARI and ITI co-led coalition letter on AI Safety Institute legislation
- 2242: Viktoriya Krakovna → Future of Life Institute (founder) — correct; could add role "Co-Founder" but not modifying edges per instructions
- 2243: Anthony Aguirre → Future of Life Institute (founder) — correct; also serves as Executive Director

Note: Krakovna is missing an `employer` edge to Google DeepMind, and Aguirre is missing edges to UC Santa Cruz (employer), Metaculus (founder), and Foundational Questions Institute (founder). These should be added in a future edge-creation pass if those entities exist in the DB.
