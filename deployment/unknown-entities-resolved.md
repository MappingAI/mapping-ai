# Resolved Unknown Entities

Categorizations from research. Ready to apply to database.

## High Confidence - Apply Immediately

| Entity | Category | Notes |
|--------|----------|-------|
| CommonAI | Infrastructure & Compute | UK-based collaborative AI ecosystem |
| Antimetal | Infrastructure & Compute | AI-powered cloud cost optimization |
| Forethought | Deployers & Platforms | AI customer support automation |
| Freed | Deployers & Platforms | AI medical documentation |
| Harvey | Deployers & Platforms | AI legal platform, $300M+ raised |
| Borderless AI | Deployers & Platforms | AI-powered global employment/HR |
| HUMAIN Ventures | VC/Capital | Saudi PIF-owned, $10B VC arm |
| Augment | Deployers & Platforms | AI coding assistant, $252M raised |
| Braintrust | Deployers & Platforms | AI evaluation/testing platform |
| G42 | Deployers & Platforms | Abu Dhabi AI conglomerate |
| Atla | AI Safety/Alignment | AI evaluation/safety startup (formerly Laurel AI) |
| Alltius | Deployers & Platforms | AI for financial services |
| Fathom (YC W21) | Deployers & Platforms | AI meeting notes, YC W21 |
| Delaware Innovation Space | Academic | U Delaware innovation hub |
| Abnormal AI | Deployers & Platforms | AI cybersecurity, unicorn |
| Civic Hall | Labor/Civil Society | NYC tech civic engagement nonprofit |
| Enveil | Deployers & Platforms | Encrypted data analytics |
| CFAR | AI Safety/Alignment | Center for Applied Rationality |
| Axiamatic | Deployers & Platforms | Enterprise AI control plane, $54M |
| Applied Intuition | Deployers & Platforms | AV simulation, $1.5B+ raised |
| Kayhan Space | Deployers & Platforms | Space collision avoidance AI |
| High-Flyer Capital Management | VC/Capital | Chinese quant fund, DeepSeek backer |
| 4DX Ventures | VC/Capital | Africa-focused early-stage VC |
| AI Safety Fund | AI Safety/Alignment | Frontier Model Forum initiative |
| Global AI Opportunity Fund | Philanthropy | Google.org philanthropic initiative |
| Empire AI Consortium | Academic | NY State university consortium |
| Annapurna Labs | Infrastructure & Compute | Amazon chip design subsidiary |

## Medium Confidence - Verify Then Apply

| Entity | Category | Notes |
|--------|----------|-------|
| /dev/agents | Deployers & Platforms | AI agent platform/startup |
| Embodied Intelligence | AI Safety/Alignment | Robotics/embodied AI research |
| Blueprint | Think Tank/Policy Org | Possibly AI Bill of Rights-adjacent |
| Heron | VC/Capital | Likely Heron Rock or Heron Capital |
| Nous | AI Safety/Alignment | Likely Nous Research collective |
| Cassini Fund | VC/Capital | Likely early-stage VC |
| Sentinel Bio | Deployers & Platforms | Likely biotech/biosecurity AI |

## Low Confidence - Needs More Research

| Entity | Category Guess | Notes |
|--------|----------------|-------|
| Created by Humans | Ethics/Bias/Rights | Name suggests advocacy |
| Accordance | Deployers & Platforms | Could be AI governance/compliance |
| Callosum | Deployers & Platforms | Could be healthcare/neurotech |
| Transformer | Deployers & Platforms | Generic name |
| Cylake | Deployers & Platforms | Small AI/data startup |
| INHealthVI | Deployers & Platforms | Possibly healthcare AI |
| Alden Scientific | Deployers & Platforms | Could be biotech or AI for science |
| CrimsoNox Capital | VC/Capital | Small or emerging VC |
| 2077AI Open Source Foundation | AI Safety/Alignment | Open-source AI foundation |

---

## Script to Apply Changes

Once verified, update the database with:

```sql
-- High confidence funders
UPDATE organizations SET category = 'Infrastructure & Compute' WHERE name = 'CommonAI';
UPDATE organizations SET category = 'Infrastructure & Compute' WHERE name = 'Antimetal';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Forethought';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Freed';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Harvey';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Borderless AI';
UPDATE organizations SET category = 'VC/Capital/Philanthropy' WHERE name = 'HUMAIN Ventures';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Augment';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Braintrust';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'G42';
UPDATE organizations SET category = 'AI Safety/Alignment' WHERE name = 'Atla';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Alltius';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Fathom (YC W21)';
UPDATE organizations SET category = 'Academic' WHERE name = 'Delaware Innovation Space';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Abnormal AI';
UPDATE organizations SET category = 'Labor/Civil Society' WHERE name = 'Civic Hall';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Enveil';
UPDATE organizations SET category = 'AI Safety/Alignment' WHERE name = 'CFAR';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Axiamatic';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Applied Intuition';
UPDATE organizations SET category = 'Deployers & Platforms' WHERE name = 'Kayhan Space';
UPDATE organizations SET category = 'VC/Capital/Philanthropy' WHERE name = 'High-Flyer Capital Management';
UPDATE organizations SET category = 'VC/Capital/Philanthropy' WHERE name = '4DX Ventures';
UPDATE organizations SET category = 'AI Safety/Alignment' WHERE name = 'AI Safety Fund';
UPDATE organizations SET category = 'VC/Capital/Philanthropy' WHERE name = 'Global AI Opportunity Fund';
UPDATE organizations SET category = 'Academic' WHERE name = 'Empire AI Consortium';
UPDATE organizations SET category = 'Infrastructure & Compute' WHERE name = 'Annapurna Labs';
```

Note: "Global AI Opportunity Fund" is philanthropy but current schema uses combined "VC/Capital/Philanthropy". Split that category later.
