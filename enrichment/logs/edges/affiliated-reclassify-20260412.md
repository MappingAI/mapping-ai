# Affiliated Edge Reclassification — 2026-04-12 (Round 4)

Processed 223 remaining `affiliated` edges using training knowledge (no web search). 
47 reclassified, 12 deleted, ~164 remain (flagged — require web search).

---

## Updates: 47 edges reclassified

### → `employer` (31 edges)

| Edge | Source | Target | Basis |
|------|--------|--------|-------|
| 4 | Holden Karnofsky | Open Philanthropy | Co-CEO (former) |
| 24 | Erik Brynjolfsson | Stanford HAI | Senior fellow / faculty director |
| 38 | Ed Newton-Rex | Fairly Trained | CEO |
| 64 | Sayash Kapoor | Princeton CITP | Postdoc researcher |
| 65 | Daniel Ho | Stanford HAI | Affiliated faculty |
| 78 | Liang Wenfeng | DeepSeek | CEO |
| 180 | Fidji Simo | OpenAI | CEO of Applications |
| 192 | Adam Evans | Salesforce | EVP and GM |
| 205 | Andy Parsons | Adobe | Senior Director of Content Authenticity |
| 215 | Jeff Leek | Fred Hutchinson Cancer Center | VP and Chief Data Officer |
| 289 | Kevin Kelly | Wired | "Senior Maverick" (official title) |
| 448 | Alan Davidson | Google | Pre-NTIA employment |
| 453 | Alondra Nelson | Center for American Progress | Pre-Biden employment |
| 471 | Brian Deese | BlackRock | Global Head of Sustainable Investing pre-Biden |
| 503 | David Evan Harris | UC Berkeley | Researcher at Berkeley |
| 516 | Elad Gil | Google | Former PM at Google |
| 547 | Jason Matheny | White House | OSTP/NEC role |
| 566 | Latanya Sweeney | FTC | CTO of FTC 2013–14 |
| 579 | Meredith Whittaker | Google | 13 years at Google |
| 626 | Sriram Krishnan | Microsoft | Pre-OSTP employment |
| 632 | Suresh Venkatasubramanian | White House | Served at OSTP under Biden |
| 637 | Timnit Gebru | Google | Google AI ethics team |
| 640 | Tim Wu | FTC | Senior official at FTC under Biden |
| 641 | Tim Wu | White House | Special assistant to Biden |
| 644 | Tristan Harris | Google | Design ethicist at Google |
| 651 | Zeynep Tufekci | Princeton | Professor at Princeton |
| 682 | Lex Fridman | MIT | Research scientist at MIT |
| 1107 | Michael Genesereth | Stanford Law School | Professor by courtesy |
| 1395 | Fei-Fei Li | Stanford Vision and Learning Lab | Co-director |
| 1563 | Yann LeCun | University of Toronto | Postdoctoral researcher (1987, historical) |
| 1564 | Yann LeCun | Collège de France | Chair holder since 2016 |

### → `funder` (3 edges)

| Edge | Source | Target | Basis |
|------|--------|--------|-------|
| 512 | Dustin Moskovitz | Anthropic | Open Philanthropy ~$300M investment |
| 529 | Holden Karnofsky | OpenAI | Open Philanthropy $30M grant 2017 |
| 576 | Masayoshi Son | OpenAI | SoftBank invested billions in OpenAI |

### → `member` (5 edges)

| Edge | Source | Target | Basis |
|------|--------|--------|-------|
| 1498 | Jerry Moran | NRSC | Former Chairman |
| 1621 | Heidy Khlaaf | UNSG's AI Advisory Body | Network of Experts member |
| 1622 | Heidy Khlaaf | British Standards Institute | ISO SC 42 Committee Member |
| 1768 | WGA | AFL-CIO | WGA East affiliated with AFL-CIO (member union) |
| 1965 | SaferAI | US AI Safety Institute Consortium | "Part of the US AI Safety Consortium" |

### → `parent_company` (6 edges — parent→child direction already correct)

| Edge | Parent (source) | Child (target) | Basis |
|------|----------------|----------------|-------|
| 835 | Harvard University | Kempner Institute | Harvard institute |
| 837 | Harvard University | Harvard Berkman Klein Center | Harvard center |
| 888 | Google | Google DeepMind | Google owns DeepMind |
| 994 | Google Research | People + AI Research (PAIR) | "PAIR is a multidisciplinary team at Google" |
| 1063 | Johns Hopkins University | JHU Applied Physics Lab | Part of JHU |
| 1194 | McGill University | McGill AI Lab | "student lab at McGill University" |

### → `advisor` (2 edges)

| Edge | Source | Target | Basis |
|------|--------|--------|-------|
| 1366 | Ben Reinhardt | Federation of American Scientists | Listed as "Expert" on FAS |
| 1414 | Sandy Pentland | Stanford HAI | "HAI Fellow" — fellowship not employment |

---

## Deletions: 12 edges

### Duplicate founder edges — 8 deleted

Affiliated edges where a founder edge already existed for same source→target pair.

| Deleted | Existing founder | Label |
|---------|-----------------|-------|
| 66 | 1374 | Elon Musk → xAI |
| 69 | 1445 | Joshua Kushner → Thrive Capital |
| 74 | 1341 | Saikat Chakrabarti → New Consensus |
| 537 | 2241 | Jaan Tallinn → FLI |
| 550 | 2272 | Joe Lonsdale → Palantir |
| 580 | 1575 | Meredith Whittaker → AI Now Institute |
| 598 | 1012 | Peter Thiel → Palantir |
| 642 | 2271 | Toby Ord → Giving What We Can |

### Personal relationship edges — 4 deleted

| Edge | Relationship | Reason |
|------|-------------|--------|
| 778 | Casey Newton → Anthropic | "Fiancé works there" — not a professional relationship |
| 1234 | Daniela Amodei → Holden Karnofsky | Spouse — personal, not professional |
| 1300 | Paul Christiano → Ajeya Cotra | Spouse — personal, not professional |
| 1438 | Holden Karnofsky → Daniela Amodei | Spouse — duplicate of 1234, opposite direction |

---

## Remaining affiliated edges: 164

Flagged — require web search to classify. Breakdown of primary flag groups:

- **Legislators → OSTP** (9): oversight relationships, unclear critic/supporter/delete
- **Legislators → think tanks/policy orgs** (~15): speaking/engagement, unclear type
- **Persons → AI Risk Mitigation Fund** (5): unknown fund structure
- **Persons → Tsinghua University** (6): likely visiting/advisory but unconfirmed
- **Suspicious edges** (4): Gebru→Microsoft/MSFT Research, Whittaker→AI Safety Foundation, Gebru→IAPS (role fields don't match known affiliations — possible data errors)
- **No role / no evidence** (~50): person→org edges with no context

---

## Verification

```
employer reclassified:      31
funder reclassified:         3
member reclassified:         5
parent_company reclassified: 6
advisor reclassified:        2
founder dups deleted:        8
personal edges deleted:      4
──────────────────────────────
Total changes:              59
Remaining affiliated:      164
```
