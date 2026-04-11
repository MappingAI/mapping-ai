# Entity Enrichment Batch 63

**Date:** 2026-04-10
**Entities:** 12
**Phase:** phase3-manual

## Summary

Enriched 12 entities (5 persons, 7 organizations) — senior U.S. policymakers (Thune, Cassidy, Helberg, Pottinger), government bodies (HSGAC, NAIAC, DOL), Yann LeCun's new AI venture (AMI Labs / Advanced Machine Intelligence Labs), historical research institutions (Bell Labs, College de France), and AI executive (Alex LeBrun). All were truly empty (notes null, beliefs null). No edges modified.

## Duplicate Findings

- **Advanced Machine Intelligence Labs (1432) / AMI Labs (1433):** CONFIRMED DUPLICATE. Same organization. "AMI Labs" is the short/common name for "Advanced Machine Intelligence Labs," the AI startup co-founded by Yann LeCun and Alex LeBrun in late 2025. Both enriched with cross-reference notes. Recommend merging edges to 1432 and soft-deleting 1433.

## Edge Anomaly (not modified)

- **Edge 1565:** `founder: Yann LeCun -> Alex LeBrun, role="CEO of AMI Labs"`. This edge type is `founder` with person->person direction, which doesn't match the canonical schema (founder should be person->org). LeBrun is co-founder/CEO of AMI Labs, not a person founded by LeCun. Edge should likely be `collaborator` or the target should be entity 1432/1433 (AMI Labs). NOT MODIFIED per instructions.

## Entity Name Note

- **Entity 1437 (National Artificial Intelligence Advisory Commission):** The official name is "National Artificial Intelligence Advisory Committee" (NAIAC), not "Commission." The entity name has a slight misnomer. Noted in enrichment but entity name not changed.

## Changes

### 1425 — John Thune (person, Policymaker)
- **notes:** Senate Majority Leader (Jan 2025-present), senior U.S. Senator from South Dakota. Key AI legislation gatekeeper — co-authoring bipartisan 'light-touch' AI bill with Sen. Klobuchar requiring risk/impact assessments and self-certification for critical-impact AI systems. Opposed 10-year moratorium on state AI regulation authority. Supported GAIN AI Act in FY2026 NDAA to keep advanced AI chips available to U.S. innovators over adversaries. Previously chaired Senate Commerce Committee where he led early AI policy work.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1426 — Bill Cassidy (person, Policymaker)
- **notes:** Republican U.S. Senator from Louisiana, Chair of Senate HELP Committee (2025-present). Released major AI white paper favoring flexible, sector-specific regulation over one-size-fits-all approach. Proposed novel concept of using AI to regulate AI — government-utilized AI as industry watchdog. Co-sponsored RAISE Act empowering states to include AI/emerging tech in K-12 curriculum. Introduced Future of Artificial Intelligence Innovation Act of 2026 (S.3952). Focus areas: AI in healthcare, education, workforce.
- **regulatory_stance:** Targeted | **ai_risk:** Manageable | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Decision-maker
- **confidence:** 5

### 1427 — Senate Committee on Homeland Security and Governmental Affairs (organization, Government/Agency)
- **notes:** Senate's primary oversight committee for government operations and DHS. Active AI oversight role: held hearings on 'AI Risks and Opportunities' and 'AI in Government.' Key legislation includes AI LEAD Act (Chief AI Officer at every federal agency), No Adversarial AI Act (S.2177, protecting government from foreign adversary AI), and AI procurement standards bill (Peters-Tillis). Focus on federal AI use management, security, and procurement guardrails.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Decision-maker, Implementer
- **confidence:** 5

### 1429 — Jacob Helberg (person, Policymaker)
- **notes:** Under Secretary of State for Economic Growth, Energy, and Environment (confirmed Oct 2025). Former Senior Advisor to Palantir CEO. Retained investments in OpenAI, SpaceX, and dozens of AI/defense/fintech companies. Launched Pax Silica (Dec 2025) — State Dept's flagship AI and supply chain security initiative. Former U.S.-China Economic and Security Review Commission member. Founded Hill and Valley Forum connecting Silicon Valley to Capitol Hill. Major China hawk advocating hardline tech competition stance.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Inferred | **agi_timeline:** Unknown
- **influence_type:** Decision-maker, Advisor/strategist, Connector/convener
- **confidence:** 5

### 1430 — Matt Pottinger (person, Policymaker)
- **notes:** Chairman of FDD's China Program. Former Deputy National Security Advisor (2019-2021) and NSC Senior Director for Asia under Trump first term. Led shift in U.S. China policy. Now prominent voice on AI national security — advocates restricting China's access to U.S. AI labs and technology. Former journalist and Marine intelligence officer in East Asia. Co-author in Foreign Affairs on China strategy. Warns Beijing actively exploits U.S. tech openness for military AI buildup.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **influence_type:** Advisor/strategist, Narrator
- **confidence:** 5

### 1432 — Advanced Machine Intelligence Labs (organization, Frontier Lab) — PRIMARY
- **notes:** Full legal name: Advanced Machine Intelligence (AMI Labs). AI startup co-founded by Yann LeCun (exec chairman) and Alex LeBrun (CEO) after LeCun left Meta (Nov 2025). Raised $1.03B seed at $3.5B pre-money valuation (Mar 2026) — one of largest seed rounds ever. Building 'world models' using JEPA architecture as alternative to LLMs. Backed by Nvidia, Samsung, Bezos Expeditions, Eric Schmidt. Key team: Saining Xie (CSO), Pascale Fung (CRIO), Michael Rabbat (VP World Models), Laurent Solly (COO). Target: industrial control, robotics, healthcare, wearables. NOTE: Entity 1433 (AMI Labs) is the SAME organization — short name variant.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Ill-defined
- **funding_model:** VC-backed
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 5

### 1433 — AMI Labs (organization, Frontier Lab) — DUPLICATE
- **notes:** DUPLICATE of entity 1432 (Advanced Machine Intelligence Labs). 'AMI Labs' is the short/common name for Advanced Machine Intelligence Labs, co-founded by Yann LeCun and Alex LeBrun. See entity 1432 for full enrichment. Recommend merging edges to 1432 and soft-deleting this entity.
- **regulatory_stance:** Light-touch | **ai_risk:** Manageable | **evidence:** Inferred | **agi_timeline:** Ill-defined
- **funding_model:** VC-backed
- **influence_type:** Builder, Researcher/analyst
- **confidence:** 5

### 1434 — AT&T Bell Laboratories (organization, Academic)
- **notes:** Legendary corporate research lab (est. 1925). Pioneering AI/ML contributions: Claude Shannon's learning machines (1952), neural network research (1986-1996) including handwritten digit recognition with USPS data, early deep learning work by Yann LeCun on convolutional neural networks. 11 Nobel Prizes, 5 Turing Awards for work done there. In the 1990s, AT&T Labs' AI/ML group was arguably the strongest in the world. LeCun worked as researcher there before moving to NYU and later Facebook/Meta. Now AT&T holds 6th most AI patents among U.S. firms (2025).
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Corporate
- **other_categories:** Infrastructure & Compute
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1435 — College de France (organization, Academic)
- **notes:** Prestigious French academic institution (est. 1530) in Paris. AI relevance: Yann LeCun held the Annual Chair for Computer Science and Digital Technologies (Chaire Annuelle Informatique et Sciences Numeriques) in 2016, delivering inaugural lecture on deep learning. The institution hosts visiting professorships connecting top researchers to French academia. Not an AI-focused institution per se, but its rotating chairs have featured leading AI scientists.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Researcher/analyst
- **confidence:** 5

### 1436 — Alex LeBrun (person, Executive)
- **notes:** CEO of AMI Labs (Advanced Machine Intelligence), co-founded with Yann LeCun (2025). Serial French AI entrepreneur: founded VirtuOz (acquired by Nuance), Wit.ai (acquired by Facebook 2015 after 21 months), and Nabla (healthcare AI, remains chairman). Worked under LeCun at Meta FAIR after Wit.ai acquisition. 24 years building AI products spanning chatbots, NLU, virtual assistants, healthcare AI. Graduate of Ecole Polytechnique.
- **regulatory_stance:** Unknown | **ai_risk:** Unknown | **evidence:** Unknown | **agi_timeline:** Unknown
- **influence_type:** Builder, Decision-maker
- **confidence:** 5

### 1437 — National Artificial Intelligence Advisory Commission (organization, Government/Agency)
- **notes:** Federal advisory committee created by National AI Initiative Act of 2020. Advises the President and National AI Initiative Office (within OSTP). Housed at NIST. Members drawn from academia, nonprofits, civil society, private sector. Covers AI competitiveness, workforce, R&D, standards, ethics, governance. Finalized transition recommendations for Trump admin (Mar 2025) with 10 priority recommendations. NOTE: Formally called NAIAC (National AI Advisory Committee) — 'Commission' in entity name may be a slight misnomer.
- **regulatory_stance:** Moderate | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Advisor/strategist
- **confidence:** 4

### 1438 — U.S. Department of Labor (organization, Government/Agency)
- **notes:** Federal cabinet department overseeing labor standards, workforce, and employment. Key AI role: published national AI Literacy Framework (Feb 2026) with 5 content areas and 7 delivery principles. Partnered with NSF on AI-ready workforce initiative (MOU for AI literacy, training pathways, labor market research). Hosts AI page at dol.gov/ai. Focus on workforce preparation for AI disruption through guidance and skills development rather than heavy regulation. Daniel Ho serves as Senior Advisor on Responsible AI.
- **regulatory_stance:** Targeted | **ai_risk:** Serious | **evidence:** Explicitly stated | **agi_timeline:** Unknown
- **funding_model:** Government
- **influence_type:** Implementer, Decision-maker
- **confidence:** 5
