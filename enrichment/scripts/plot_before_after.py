"""
Two-panel before/after figure for the data-processing branch.

Sources (values hardcoded from these audits):
  Before: logs/normalization/baseline-audit.md      (2026-04-10 23:44 UTC)
  After:  logs/audits/post-processing-audit-20260413.md (2026-04-13 16:37 UTC)

Panel A: field-completeness rates for core, person, org, belief, and edge fields.
Panel B: data-hygiene defect rates (empty notes, citation artifacts,
         non-canonical edges, orphan entities).

Output: logs/audits/before-after-20260413.png

Usage:
    source .venv/bin/activate
    python scripts/plot_before_after.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


# ---------------------------------------------------------------------------
# Panel A: field completeness rates (%)
# Order: top = most impactful. All values are percent filled.
# ---------------------------------------------------------------------------
COMPLETENESS = [
    # (label, before %, after %)
    ("edges.source_url",                0.0,  94.2),
    ("notes (all entities)",           57.2, 100.0),
    ("belief_ai_risk",                 45.6,  84.1),
    ("belief_agi_timeline",            43.9,  82.1),
    ("belief_evidence_source",         45.3,  84.0),
    ("belief_regulatory_stance",       46.7,  81.6),
    ("influence_type",                 42.6,  81.1),
    ("funding_model (orgs)",           35.9,  70.1),
    ("notes_sources",                  19.0,  65.7),
    ("notes_confidence",               19.0,  62.1),
    ("qa_approved",                    61.2,  92.8),
    ("title (persons)",                46.2,  49.7),
    ("primary_org (persons)",          26.5,  31.3),
]

# ---------------------------------------------------------------------------
# Panel B: data-hygiene defect rates (% of applicable entities/edges)
# Lower is better. Derivations:
#   non-canonical edges before: 2228 - 239 (collaborator) - 17 (funder) - 1 (critic)
#                             = 1971 / 2228 = 88.5%
#   non-canonical edges after:  164 (affiliated) + 7 (affiliated_with) + 1 (mentioned)
#                             = 172 / 2319 = 7.4%
#   citation artifacts: 316 / 1672 = 18.9% before; 0 / 1706 = 0.0% after
# ---------------------------------------------------------------------------
DEFECTS = [
    # (label, before %, after %)
    ("Non-canonical edges",    88.5, 7.4),
    ("Empty notes",            42.8, 0.0),
    ("Citation artifacts",     18.9, 0.0),
    ("Orphan entities",        19.2, 18.0),
]


def main():
    out_dir = Path("logs/audits")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "before-after-20260413.png"

    fig, (axA, axB) = plt.subplots(
        1, 2,
        figsize=(14, 7),
        gridspec_kw={"width_ratios": [1.7, 1.0]},
    )

    before_color = "#c0c0c0"  # neutral grey
    after_color  = "#2e7d32"  # green

    # -----------------------------------------------------------------------
    # Panel A — field completeness
    # -----------------------------------------------------------------------
    labels_a = [row[0] for row in COMPLETENESS]
    before_a = [row[1] for row in COMPLETENESS]
    after_a  = [row[2] for row in COMPLETENESS]

    y = np.arange(len(labels_a))
    h = 0.38
    axA.barh(y - h/2, before_a, h, color=before_color, label="Before (2026-04-10)")
    axA.barh(y + h/2, after_a,  h, color=after_color,  label="After (2026-04-13)")

    for i, (b, a) in enumerate(zip(before_a, after_a)):
        axA.text(b + 1, i - h/2, f"{b:.1f}%", va="center", fontsize=8, color="#444")
        axA.text(a + 1, i + h/2, f"{a:.1f}%", va="center", fontsize=8,
                 color=after_color, fontweight="bold")

    axA.set_yticks(y)
    axA.set_yticklabels(labels_a, fontsize=9)
    axA.invert_yaxis()
    axA.set_xlim(0, 112)
    axA.set_xlabel("Filled (%)")
    axA.set_title("A. Field completeness", fontsize=12, fontweight="bold", loc="left")
    axA.legend(loc="lower right", fontsize=9, frameon=False)
    axA.grid(axis="x", linestyle=":", alpha=0.4)
    axA.spines["top"].set_visible(False)
    axA.spines["right"].set_visible(False)

    # -----------------------------------------------------------------------
    # Panel B — data hygiene defects
    # -----------------------------------------------------------------------
    labels_b = [row[0] for row in DEFECTS]
    before_b = [row[1] for row in DEFECTS]
    after_b  = [row[2] for row in DEFECTS]

    y = np.arange(len(labels_b))
    h = 0.38
    axB.barh(y - h/2, before_b, h, color=before_color, label="Before")
    axB.barh(y + h/2, after_b,  h, color=after_color,  label="After")

    for i, (b, a) in enumerate(zip(before_b, after_b)):
        axB.text(b + 1, i - h/2, f"{b:.1f}%", va="center", fontsize=9, color="#444")
        axB.text(a + 1, i + h/2, f"{a:.1f}%", va="center", fontsize=9,
                 color=after_color, fontweight="bold")

    axB.set_yticks(y)
    axB.set_yticklabels(labels_b, fontsize=10)
    axB.invert_yaxis()
    axB.set_xlim(0, 100)
    axB.set_xlabel("Defect rate (%, lower is better)")
    axB.set_title("B. Data hygiene", fontsize=12, fontweight="bold", loc="left")
    axB.legend(loc="lower right", fontsize=9, frameon=False)
    axB.grid(axis="x", linestyle=":", alpha=0.4)
    axB.spines["top"].set_visible(False)
    axB.spines["right"].set_visible(False)

    fig.suptitle(
        "mapping_ai_staging — before vs. after data-processing branch",
        fontsize=14, fontweight="bold", y=0.995,
    )
    fig.text(
        0.5, 0.01,
        "Entities 1672 → 1706  ·  Edges 2228 → 2319  ·  "
        "Non-canonical edge types 22 → 3",
        ha="center", fontsize=9, color="#555",
    )

    fig.tight_layout(rect=[0, 0.03, 1, 0.97])
    fig.savefig(out_path, dpi=160, bbox_inches="tight")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
