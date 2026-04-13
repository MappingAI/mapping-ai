# Edge Type / Direction Fixes — 2026-04-12

Resolved person→person `founder` and `employer` edges flagged in Phase 4B directionality review.

---

## Founder person→person — 12 deleted

All 12 were co-founder relationships miscoded with a person as target. In every case the correct org already had proper founder edges for both parties. Straight deletes.

| Edge | Was | Reason deleted |
|------|-----|----------------|
| 773 | Marc Andreessen → Ben Horowitz (co-founder) | a16z [211] already has founder edges for both |
| 1119 | Ben Horowitz → Marc Andreessen (cofounder) | same |
| 1217 | Dario Amodei → Daniela Amodei (sister) | Anthropic [133] already has founder edges for both |
| 1231 | Daniela Amodei → Dario Amodei (Co-founder) | same |
| 1246 | Sam Altman → Elon Musk (co-founder) | OpenAI [140] already has founder edges for both |
| 1247 | Sam Altman → Greg Brockman (co-founder) | same |
| 1309 | Demis Hassabis → Shane Legg (Co-founder) | Google DeepMind [146] already has founder edges for both |
| 1310 | Demis Hassabis → Mustafa Suleyman (Co-founder) | same |
| 1370 | Mark Zuckerberg → Dustin Moskovitz (roommate/co-founder) | Meta [1043] already has founder edges for both |
| 1385 | Jared Kaplan → Dario Amodei (Co-founder) | Anthropic already has Kaplan as founder |
| 1549 | Dustin Moskovitz → Mark Zuckerberg (Co-founder) | Meta already has both |
| 1580 | Meredith Whittaker → Kate Crawford (Co-founder) | AI Now [173] already has founder edges for both |

---

## Fei-Fei Li co-founder edges — 4 redirected

Li's 4 person→person edges were encoding "Li co-founded X with [person]". Li already had her own correct founder edges (→World Labs [769] edge 1398, →Stanford HAI [452] edge 1393). Fixed by changing source to each actual co-founder.

| Edge | Before | After |
|------|--------|-------|
| 1399 | Fei-Fei Li → Justin Johnson (co-founder) | Justin Johnson [1385] → World Labs [769] founder |
| 1400 | Fei-Fei Li → Christoph Lassner (co-founder) | Christoph Lassner [1386] → World Labs [769] founder |
| 1401 | Fei-Fei Li → Ben Mildenhall (co-founder) | Ben Mildenhall [1387] → World Labs [769] founder |
| 1402 | Fei-Fei Li → John Etchemendy (co-director) | John Etchemendy [1388] → Stanford HAI [452] founder, role=co-director |

---

## LeCun→LeBrun — recoded

Edge 1565 was `founder` LeCun→LeBrun with role "CEO of AMI Labs" — a role annotation miscoded as a founder relationship. LeCun already has his own founder→AMI Labs edge (1558). Recoded to correctly show LeBrun as CEO.

| Edge | Before | After |
|------|--------|-------|
| 1565 | Yann LeCun → Alex LeBrun, founder, "CEO of AMI Labs" | Alex LeBrun [1436] → AMI Labs [1433], employer, role=CEO |

---

## Employer person→person — 6 fixed, 2 deleted

All 8 were staffer/advisor relationships where the target was the officeholder rather than the office/org.

| Edge | Before | After |
|------|--------|-------|
| 1122 | Pam Bondi → Donald Trump, "U.S. Attorney General" | Pam Bondi → DOJ [912], employer |
| 1338 | Saikat Chakrabarti → Alexandria Ocasio-Cortez, "chief of staff" | **Deleted** — no congressional office entity in DB |
| 1339 | Saikat Chakrabarti → Bernie Sanders, "organizing technology" | **Deleted** — no org target in DB |
| 1352 | David Sacks → Donald Trump, "AI and crypto czar" | David Sacks → White House [1031], employer |
| 1368 | Bruce Reed → Joe Biden, "White House Deputy Chief of Staff" | Bruce Reed → White House [1031], employer |
| 1527 | Sriram Krishnan → Donald Trump, "Senior White House Policy Advisor on AI" | Sriram Krishnan → White House [1031], employer |
| 1534 | Alondra Nelson → Joe Biden, "Deputy Assistant to President" | Alondra Nelson → OSTP [345], employer |
| 1602 | Tim Wu → President Biden, "Special Assistant for competition and tech policy" | Tim Wu → White House [1031], employer |

---

## Remaining intentional p→p edge

- **Edge 1471**: Martin Heinrich → Rob Portman, `founder`, role="Co-founder of Senate Artificial Intelligence Caucus" — left as-is (no Senate caucus org entity; relationship is meaningful without one).

---

## Verification

```
Remaining person→person founder/employer edges: 1 (edge 1471, intentional)
```
