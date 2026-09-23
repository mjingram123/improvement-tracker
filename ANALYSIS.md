# Analysis: what the app is and what is missing (2026-09-22)

Three independent reviews, all in `analysis/`: product fit against Michael's original goal list
(`product.md`), engineering robustness (`engineering.md`), and a hands-on UX walkthrough of first
run, three weeks of use, and a 1:30am relapse (`ux.md`). This page is the synthesis and the plan.

## Headline

The app captures the right things and captures them calmly. It does not yet close the loop:
it never tells Michael anything back, its two relapse paths do not talk to each other, and the
trigger data it collects is never shown as a pattern. The engineering base is sound (no XSS,
no third-party calls, rollover verified, live equals local) with a handful of real data-safety
gaps. Separately, the daily ntfy nudges had silently never fired because GitHub's cron runs hours
late; fixed today by pre-scheduling exact delivery times.

## Coverage of the original goals

Covered: all four mindset skills, hangover kit on weekend mornings, stretching, nagging, Sunday
dinner, water polo, gym, porn and scrolling capture, wind-down timer, one-sentence journal, and
the emotional-goal notes (Intentions). Partial: scrolling has no defined limit, "dopamine
sources running my life" is only indirect, wash-up and mouth tape are hint text not items.
Intentionally untracked: no-snooze, push ups, shower (already working).

## What is missing, ranked by impact on the two hardest habits

1. Urge "Gave in" and the Night slip toggle are separate records. A relapse can be counted
   twice, once, or never. (product, ux)
2. Triggers are collected twice and never aggregated. No time-of-day or weekday patterns even
   though every urge has a timestamp. No view longer than one week back. (product, ux)
3. The app computes no insight sentences; Week is counts only. (product, ux)
4. Relapse has no compassionate follow-up question and nothing links back to Intentions. (product)
5. Morning has no priming moment; Intentions surface only at night. (product)
6. No weekly review ritual. (product)
7. "Logged" days and real check-ins look the same, so a slide back into skipping is invisible. (product)
8. Scrolling lacks the "days since" line porn has, and that line sits inside a week card while
   being an all-time number. (product, ux)
9. First open explains nothing about what the app is. (ux)
10. Gym shows a bare number next to "n of m" rows. (ux)

## Engineering fixes (cycle 6, in progress)

Cross-instance save merge, urge outcome merge on restore, toast on failed saves, night-flow
progress stored in data not session memory, eager mirroring, hardened normalize, navigation-only
offline fallback, rollover-aware snapshot keys, dead code and duplication removed, one timer
representation, topic-guessability note. Details and line references in `analysis/engineering.md`.

## Decisions

- Keep the morning after a slip quiet. The UX walkthrough called this ambiguous; we choose
  "respectfully not dwelling" and let the morning priming line carry the intention instead.
- Retire the Shortcuts timer path. ntfy timer pings replace it and Michael wants no Shortcuts.
- Keep the three-layer local redundancy but add a snapshot restore UI so it is usable.

## Plan

Cycle 6 (engineering) then cycle 7 (product and UX) then a QA pass. Tickets P1 to P14 in BACKLOG.md.
