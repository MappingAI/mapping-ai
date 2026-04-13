# Duplicate Entity Merges — 2026-04-12

Three duplicate pairs surfaced during Phase 5F pre-checks. All merged inline.

---

## Mark Gray [1696] ← [1697]

**Kept:** [1696] `Mark Gray` → renamed to `Mark D. Gray`  
**Deleted:** [1697] `Mark D Gray` (notes explicitly flagged as duplicate of 1696)

| Action | Detail |
|--------|--------|
| Name update | `Mark Gray` → `Mark D. Gray` |
| Sources merged | 4 + 4 → 5 (added LinkedIn from 1697; 3 URLs overlapping) |
| Edge deleted | 2095: employer [1697]→FTC (duplicate of edge 2094 on [1696]) |
| Entity deleted | 1697 |

---

## New York Times [1059] ← [862]

**Kept:** [1059] `New York Times` → renamed to `The New York Times`  
**Deleted:** [862] `The New York Times`  
Note: task_list suggested keeping [862], but [1059] has 12 edges vs 6, v2 enrichment, and 12 sourced URLs vs 0. Kept [1059].

| Action | Detail |
|--------|--------|
| Name update | `New York Times` → `The New York Times` |
| Edges redirected (862→1059) | 244 (Cade Metz employer), 245 (Kevin Roose employer), 288 (Kashmir Hill employer) |
| Duplicate edges dropped | 474 (Casey Newton employer→862, dup of 475), 553 (Joi Ito affiliated→862, dup of 555), 1457 (Ezra Klein employer→862, dup of 378) |
| Entity deleted | 862 |
| Edge count | 12 → 15 |

---

## Department of Commerce [914] ← [1032]

**Kept:** [914] `Department of Commerce`  
**Deleted:** [1032] `U.S. Department of Commerce`

| Action | Detail |
|--------|--------|
| Edges redirected target→914 | 421 (Jeffrey Kessler employer), 422 (Gina Raimondo employer), 864 (ITA parent_company), 865 (William Kimmitt employer) |
| Edge redirected source→914 | 866 (Commerce→State Dept partner) |
| Edge 2110 direction fixed | Was [1032](Commerce)→[205](CAISI) — wrong direction; fixed to [205](CAISI)→[914](Commerce) for child→parent consistency |
| Duplicate edges dropped | 588 (Navrina Singh advisor→1032, dup of 586), 611 (Ro Khanna member→1032, dup of 609) |
| Sources merged | 3 + 12 → 15 |
| Entity deleted | 1032 |
| Edge count | 6 → 12 |

---

## Verification

```
Edges referencing deleted entity 1697: 0
Edges referencing deleted entity 862:  0
Edges referencing deleted entity 1032: 0
Edge 2110: Center for AI Standards and Innovation (CAISI) → Department of Commerce (parent_company) ✓
```
