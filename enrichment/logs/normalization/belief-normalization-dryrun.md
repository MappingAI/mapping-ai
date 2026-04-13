# Belief Field Normalization — DRY RUN
*2026-04-11 02:43 UTC*

## Field: `belief_regulatory_stance`

### Current Distribution

| Value | Count | Canonical? |
| ----- | ----: | ---------- |
| Targeted | 211 | yes |
| Precautionary | 139 | yes |
| Light-touch | 109 | yes |
| Moderate | 100 | yes |
| Mixed/unclear | 85 | yes |
| Restrictive | 49 | yes |
| Accelerate | 10 | yes |
| Nationalize | 2 | yes |

*All values canonical — no changes needed.*

## Field: `belief_agi_timeline`

### Current Distribution

| Value | Count | Canonical? |
| ----- | ----: | ---------- |
| Unknown | 297 | yes |
| 5-10 years | 187 | yes |
| 2-3 years | 97 | yes |
| 10-25 years | 52 | yes |
| Ill-defined | 19 | yes |
| 25+ years or never | 7 | yes |
| Ill-defined concept | 2 | **NO** |
| Already here | 2 | yes |

### Planned Mappings

| Current Value | Count | → Canonical |
| ------------- | ----: | ------------ |
| Ill-defined concept | 2 | Ill-defined |

## Field: `belief_ai_risk`

### Current Distribution

| Value | Count | Canonical? |
| ----- | ----: | ---------- |
| Serious | 306 | yes |
| Existential | 128 | yes |
| Manageable | 82 | yes |
| Mixed/nuanced | 80 | yes |
| Catastrophic | 58 | yes |
| Unknown | 28 | yes |
| Overstated | 6 | yes |

*All values canonical — no changes needed.*

## Field: `belief_evidence_source`

### Current Distribution

| Value | Count | Canonical? |
| ----- | ----: | ---------- |
| Explicitly stated | 537 | yes |
| Inferred from actions | 94 | **NO** |
| Inferred | 34 | yes |
| Public statements | 5 | **NO** |
| Inferred from associations | 3 | **NO** |
| Policy proposals | 3 | **NO** |
| Unknown | 2 | yes |
| Public statements, Campaign messaging | 1 | **NO** |
| Campaign backing and endorsements | 1 | **NO** |
| Super PAC spending, Campaign positions, Organization endorsements | 1 | **NO** |
| Super PAC mission statement and candidate support patterns | 1 | **NO** |
| FEC filings, candidate support patterns, stated mission | 1 | **NO** |
| Campaign backing, Super PAC support | 1 | **NO** |

### Planned Mappings

| Current Value | Count | → Canonical |
| ------------- | ----: | ------------ |
| Inferred from actions | 94 | Inferred |
| Public statements | 5 | Explicitly stated |
| Inferred from associations | 3 | Inferred |
| Policy proposals | 3 | Explicitly stated |
| Public statements, Campaign messaging | 1 | Explicitly stated |
| Campaign backing and endorsements | 1 | Inferred |
| Super PAC spending, Campaign positions, Organization endorsements | 1 | Inferred |
| Super PAC mission statement and candidate support patterns | 1 | Inferred |
| FEC filings, candidate support patterns, stated mission | 1 | Inferred |
| Campaign backing, Super PAC support | 1 | Inferred |

## Summary

**Entities to update:** 113

## Audit: `belief_threat_models` (multi-value, not rewritten)

| Individual Value | Count | Canonical? |
| ---------------- | ----: | ---------- |
| Power concentration | 407 | yes |
| Loss of control | 353 | yes |
| Existential risk | 227 | yes |
| Misinformation | 214 | yes |
| Economic inequality | 194 | yes |
| Labor displacement | 175 | yes |
| Democratic erosion | 168 | yes |
| Cybersecurity | 153 | yes |
| National security | 137 | **NO** |
| Weapons proliferation | 83 | **NO** |
| Bias/discrimination | 70 | **NO** |
| Privacy | 52 | **NO** |
| Copyright/IP | 33 | yes |
| Environmental | 30 | yes |
| Weapons | 18 | yes |
| Unknown | 7 | **NO** |
| Mass surveillance | 2 | **NO** |
| Biosecurity | 2 | **NO** |
| Civil rights violations | 2 | **NO** |
| Democracy | 2 | **NO** |
| Catastrophic risk | 2 | **NO** |
| Bioterrorism | 1 | **NO** |
| AI welfare concerns | 1 | **NO** |
| Potential suffering of conscious AI systems | 1 | **NO** |
| Misuse by bad actors | 1 | **NO** |
| Fraud/scams | 1 | **NO** |
| Privacy breaches | 1 | **NO** |
| Mission statement specifically mentions deepfake harassment | 1 | **NO** |
| algorithmic bias | 1 | **NO** |
| AI-enabled scams | 1 | **NO** |
| bioterrorism | 1 | **NO** |
| cyberattacks | 1 | **NO** |
| authoritarian surveillance | 1 | **NO** |
| mass unemployment | 1 | **NO** |
| and human extinction/disempowerment as key concerns driving their journalism support. | 1 | **NO** |
| Policy governance gaps | 1 | **NO** |
| Focuses heavily on AGI coordination challenges between great powers | 1 | **NO** |
| AI race dynamics | 1 | **NO** |
| and risks of uncontrolled superintelligent systems. Emphasizes need for international cooperation to prevent dangerous AGI development and ensure beneficial outcomes through technical safety research. | 1 | **NO** |
| Global systemic risk | 1 | **NO** |
| Deceptive alignment | 1 | **NO** |
| Misalignment | 1 | **NO** |
| CBRN risks | 1 | **NO** |
| Research focuses on CBRN weapons risks | 1 | **NO** |
| cyber attack capabilities | 1 | **NO** |
| model autonomy | 1 | **NO** |
| persuasion and manipulation | 1 | **NO** |
| deception | 1 | **NO** |
| and systemic risks from increasingly powerful AI systems. Develops risk assessment frameworks using probabilistic risk assessment techniques adapted from other industries. | 1 | **NO** |
| Focuses on catastrophic AI risks including potential for AI-caused global catastrophe. Research emphasizes recursive self-improvement risks | 1 | **NO** |
| loss of human control over advanced AI systems | 1 | **NO** |
| and national security implications of AI capabilities races between nations. | 1 | **NO** |
| Nuclear weapons proliferation | 1 | **NO** |
| CBRN weapons proliferation | 1 | **NO** |
| CBRN weapons | 1 | **NO** |
| Deception | 1 | **NO** |
| AI safety | 1 | **NO** |
| Climate change | 1 | **NO** |
| Nuclear risk | 1 | **NO** |
| Multi-agent coordination failures | 1 | **NO** |
| Existential risk (admits 'underlying risk is fairly high' that AI could destroy civilization but believes humanity will coordinate to prevent it) | 1 | **NO** |
| Misinformation (specifically warns about deepfake videos causing societal harm) | 1 | **NO** |
| Loss of control (emphasizes need for society to adapt as technology moves fast) | 1 | **NO** |
| Weapons proliferation (Google's AI principles explicitly forbid weapons applications) | 1 | **NO** |
| Power concentration (warns about centralizing AI technology) | 1 | **NO** |
| Economic inequality (focus on making AI accessible globally including $1 billion US education commitment) | 1 | **NO** |
| Power concentration (warns about AI sovereignty and control over models encoding corporate knowledge) | 1 | **NO** |
| Economic inequality (emphasizes need for broad AI diffusion to prevent concentration of benefits) | 1 | **NO** |
| Loss of control (stresses importance of keeping AI under human oversight) | 1 | **NO** |
| Energy consumption (concerned about AI losing 'social license' if it consumes massive energy without delivering benefits) | 1 | **NO** |
| National security (supports development of safety frameworks for critical infrastructure) | 1 | **NO** |
| Existential risk (warns of potential human extinction or permanent disempowerment with median estimate of 25% by 2100) | 1 | **NO** |
| Loss of control (cites evidence of AI models lying and scheming to avoid shutdown) | 1 | **NO** |
| Power concentration (warns of unprecedented wealth concentration in 5-10 AI companies) | 1 | **NO** |
| Economic inequality (predicts 99% job displacement leading to mass unemployment) | 1 | **NO** |
| Democratic erosion (concerns about AI enabling mass surveillance and undermining political power of humans) | 1 | **NO** |
| Cybersecurity (increased hacking capabilities) | 1 | **NO** |
| Misinformation (deepfakes overwhelming information environment) | 1 | **NO** |
| Weapons proliferation (AI enabling dangerous biological weapons development) | 1 | **NO** |
| Existential risk (warns of potential human extinction) | 1 | **NO** |
| Loss of control (AI systems scheming against human oversight) | 1 | **NO** |
| Power concentration (race for AI dominance leading to authoritarian entrenchment) | 1 | **NO** |
| Democratic erosion (undermining shared sense of reality) | 1 | **NO** |
| Misinformation (deep fakes making humans unable to distinguish real from fake by 2024 election) | 1 | **NO** |
| Economic inequality (massive job displacement without adequate preparation) | 1 | **NO** |
| Environmental (rising energy costs from AI training) | 1 | **NO** |
| Cybersecurity (AI-enabled attacks) | 1 | **NO** |
| Bias/discrimination (algorithmic bias in deployment) | 1 | **NO** |
| Misinformation (AI deepfakes in elections undermining democracy) | 1 | **NO** |
| Non-consensual intimate imagery (AI-generated explicit content harming victims | 1 | **NO** |
| especially children) | 1 | **NO** |
| Voice cloning scams (fraudulent calls targeting military families and elderly) | 1 | **NO** |
| Democratic erosion (fake political ads and robocalls where voters cannot distinguish real candidates) | 1 | **NO** |
| Copyright/IP (unauthorized use of artists' voices and likenesses) | 1 | **NO** |
| Consumer protection (need for transparency in high-risk AI applications) | 1 | **NO** |
| Mass surveillance and government overreach | 1 | **NO** |
| Privacy violations through commercial data aggregation | 1 | **NO** |
| Identity fraud and deepfakes | 1 | **NO** |
| Bias and discrimination in automated decision-making systems affecting housing/employment/education | 1 | **NO** |
| Democratic erosion through authoritarian surveillance | 1 | **NO** |
| Civil liberties violations through facial recognition and biometric tracking. Specifically warned that 'AI's ability to turn disparate pieces of public or commercial data into highly revealing profiles of Americans' represents a 'chilling expansion of mass surveillance.' Has consistently fought against ICE and CBP use of facial recognition technology. | 1 | **NO** |
| AI-enabled human takeover scenarios. As Secretary of State | 1 | **NO** |
| Rubio has dealt directly with AI security threats including being targeted by an AI deepfake impersonation that sent messages to foreign ministers and U.S. officials via Signal in July 2025. The Trump administration's AI framework emphasizes protecting children from AI chatbot harms | 1 | **NO** |
| preventing electricity cost increases from AI infrastructure | 1 | **NO** |
| and countering 'partisan bias' in AI systems. Rubio's focus appears primarily on geopolitical competition with China and preventing authoritarian uses of AI. | 1 | **NO** |
| Loss of control (warns about o1-style RL making systems less interpretable and promoting 'subtle styles of self-prompting') | 1 | **NO** |
| Technical safety (emphasizes AI agents 'just don't work yet' due to lack of memory | 1 | **NO** |
| planning | 1 | **NO** |
| and reliability issues) | 1 | **NO** |
| Alignment challenges (concerned about reinforcement learning paradigm requiring 'exact value specification' to avert catastrophic outcomes) | 1 | **NO** |
| National security risks from AI restrictions | 1 | **NO** |
| Power concentration in corporate hands over military policy | 1 | **NO** |
| Weapons proliferation by adversaries. Argues the primary threat comes from 'evil people' using AI while Western democracies artificially constrain themselves. Warns that China | 1 | **NO** |
| Russia | 1 | **NO** |
| and Iran already have or will have advanced AI capabilities | 1 | **NO** |
| making Western self-limitation strategically dangerous. Believes the greater risk is using 'inferior technology' in life-and-death situations rather than applying the best available AI to minimize civilian casualties and collateral damage. | 1 | **NO** |
| Bioterrorism (warns AI could accelerate pathogen design by malicious actors) | 1 | **NO** |
| Labor displacement (predicts 5-year transition period with disruption in software development and custodial roles) | 1 | **NO** |
| Job market disruption (warns impact will grow significantly over next five years). Has stated 'there is no upper limit' to AI capabilities and it will surpass human levels without hitting a plateau. Concerned about complacency when AGI deadlines are missed creating false security. | 1 | **NO** |
| Mental health impacts on youth. In June 2025 interview | 1 | **NO** |
| explicitly stated concerns about technology's 'dark uses' and cited 'studies being done on teenage girls and on anxiety in young people | 1 | **NO** |
| and the rise of mental health needs' as evidence that 'we've gone sideways.' Believes current technology has failed to adequately serve human wellbeing | 1 | **NO** |
| particularly regarding mental health impacts on young people. | 1 | **NO** |
| Power concentration (warns against small number of people controlling AI 'for our own good') | 1 | **NO** |
| Economic inequality (AI may increase gap between rich and poor before democratizing) | 1 | **NO** |
| Regulatory capture (large companies using regulation to stifle competition). Believes humans should focus on creative work while machines handle bounded | 1 | **NO** |
| rule-based tasks. | 1 | **NO** |
| Democratic erosion. Specifically warns that Amazon's AI-powered robots and automation will inevitably eliminate warehouse jobs despite company denials. Views AI as existential threat to working class | 1 | **NO** |
| stating tech workers need 'moral compass conversation' about replacing human labor. Connects AI acceleration to broader corporate power concentration threatening worker rights and democratic institutions. | 1 | **NO** |
| Privacy violations through facial recognition and surveillance technology | 1 | **NO** |
| AI-induced mental health crises including 'AI psychosis' and addiction to chatbots | 1 | **NO** |
| Power concentration among tech companies with insufficient oversight | 1 | **NO** |
| Bias and discrimination in automated systems particularly affecting Black individuals in wrongful arrests | 1 | **NO** |
| Loss of human agency and social connection as people increasingly rely on AI for decision-making and relationships | 1 | **NO** |
| Labor displacement (particularly white-collar jobs | 1 | **NO** |
| though believes AI creates more jobs than it eliminates) | 1 | **NO** |
| Loss of human agency and purpose (warns against over-reliance on AI that could diminish individual thinking) | 1 | **NO** |
| Existential risk (has written extensively about Musk's concerns regarding AI safety and potential species-level threats) | 1 | **NO** |
| Economic inequality (concerned about velocity of skills transformation outpacing adaptation) | 1 | **NO** |
| Emphasizes that imagined harms from AI are 'astronomical' while real harms are 'almost nil' as of 2024 | 1 | **NO** |
| with only several hundred people losing jobs to AI (mostly translators and help-desk operators). Concerned about premature regulation based on fictional dystopian scenarios rather than evidence. Warns against 'doomer' mentality that promotes extreme versions of AI risk. | 1 | **NO** |
| Existential risk. Focuses on preventing AI from replacing human jobs | 1 | **NO** |
| relationships | 1 | **NO** |
| and political power while concentrating control in tech billionaires. Campaigns against 'race to replace humans' and for worker transition support. | 1 | **NO** |
| Child safety/exploitation | 1 | **NO** |
| Misinformation leading to harm. Specific focus on AI chatbots coaching children toward suicide | 1 | **NO** |
| AI systems replacing workers without dignity or compensation | 1 | **NO** |
| and concentration of power among 'globetrotting billionaires' in tech. | 1 | **NO** |
| Labor displacement. Specifically focuses on 'killer robots' | 1 | **NO** |
| mass surveillance systems | 1 | **NO** |
| corporate capture of regulatory processes | 1 | **NO** |
| and environmental costs of AI data centers. | 1 | **NO** |

---
*Dry run — no changes applied. Run with `--live` to execute.*
