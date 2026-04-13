# Advisor Edge Reclassification — 2026-04-12

## Summary

Reclassified 3 org→org `advisor` edges to `partner`. These were flagged in Phase 4B directionality review — `advisor` is a person→org edge type (per canon.md); orgs advising other orgs should use `partner`.

## Changes

| Edge ID | Source | Target | Before | After |
|---------|--------|--------|--------|-------|
| 1977 | AI Now Institute [173] | Federal Trade Commission [909] | `advisor` | `partner` |
| 2246 | Centre for Long-Term Resilience [230] | Dept for Science, Innovation & Technology [1774] | `advisor` | `partner` |
| 2247 | Centre for Long-Term Resilience [230] | UK Frontier AI Taskforce [1360] | `advisor` | `partner` |

## Non-person-source critic/supporter — no change

Reviewed 9 edges where `critic` or `supporter` source is an org:
- 6 `critic`: Republican Party→DeSantis/Cox/Trump admin; Think Big→Alex Bores; NYT→Perplexity; Amazon Labor Union→Amazon
- 3 `supporter`: Forethought→Longview/OpenPhil; Secure AI Project→SB 53

All are semantically valid. The canon.md schema says "critic → target" and "supporter → target" without restricting source to person. These edges correctly represent orgs taking positions on other entities. No changes made.

`Think Big → Alex Bores` specifically confirmed correct: Think Big spent $2.42M opposing Bores' congressional campaign after he co-sponsored the RAISE Act.

## Verification

```
Remaining non-person-source advisor edges: 0
```
