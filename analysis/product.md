# Improvement Tracker: product analysis against the original goal list

## 1. Coverage table

| Goal | Feature today | Rating |
|---|---|---|
| Curious in conversation/life | Night rating "Curious in conversation" (1-5) + Intentions note under it | Covered |
| Detach from outcomes, stay in my story | Night rating "Stayed in my story, detached from outcomes" | Covered |
| Push through pauses | Night rating "Pushed through pauses" | Covered |
| Commit to where I am | Night rating "Committed to where I was" | Covered |
| Hangover: LMNT, food, ibuprofen, walk (Fri/Sat/Sun) | Day Hungover toggle + 4 kit chips, shown on configured days | Covered |
| Push ups, stretching, shower; wants stretching daily | Only "Stretched" toggle exists; push ups/shower intentionally untracked (already work) | Covered (as scoped) |
| No-snooze wake up (already working) | Not tracked, by design | Missing (intentional) |
| Wash up, mouth tape/vaseline, 15-min timer | One "Wind-down" step with 15:00 ring timer; wash-up/tape are hint text only, not checked items | Partial |
| Not nagging Chet/others (cars/dishes) | Night Slips toggle "Nagged someone" + trigger note | Covered |
| Sunday dinner out | Day "Dinner out" row (configurable days), Week rate | Covered |
| Not masturbating to porn (hardest) | Night Slips "Porn" toggle+note; Urge overlay "Porn" kind, 10-min timer, rode/gave-in; Week rate + "last slip" line | Covered as capture; thin as behavior support |
| Relax without scrolling / stay under limits (hardest) | Night "Scrolled past limits" toggle; Urge overlay "Scrolling" kind | Partial (self-report only, no real limit defined) |
| Don't let dopamine sources run my life | Only indirectly via Intentions "why" text and the two slip trackers | Partial |
| Water polo Tue/Sun | Day row, configurable days, Week rate | Covered |
| Gym (log when it happens) | Day "Gym" row, Week count | Covered |

Also present, not on the original list: Intentions card (added for emotional goals, as requested), backup/restore, storage health, schedule settings.

## 2. Behavior-design gaps

**Hardest habits get logging, not a loop.** Porn/scrolling have two disconnected surfaces: Night's Slips toggle and the Urge overlay. Pressing "Gave in" only writes `state.urges`; it never sets today's Night lapse flag. A slip can be recorded once, twice, or not at all in the Week rate depending which flow he uses, with no reconciliation.

**Triggers are captured and never revisited.** Both the Night slip note and the Urge trigger field take free text, but nothing aggregates it beyond raw quotes in Week's Journal. A trigger word cloud is deferred to BACKLOG.md "Later," so the single most useful signal for the priority-one habits is stored but effectively invisible.

**Relapse looks identical to any other entry.** "Gave in" and a Slips toggle both just set a flag plus a note. There is no distinct, compassionate follow-up ("what would help next time"), and no link back to the stated Intentions.

**Morning and night are unequal.** Night is a designed 4-step ritual ending on a deliberate closing line. Morning is a flat toggle list with a static "Morning done" badge and no priming moment. Intentions notes only surface at night, under ratings, after the day already happened.

**No weekly review ritual.** Week is a dashboard he must remember to open; nothing prompts him. A Sunday reflection prompt is listed under "Later" but not built, which matters most for the mindset goals rated nightly but never stepped back from weekly.

**The app never tells him anything back.** Week shows raw counts and last-week comparisons, but no computed sentence or trend exists anywhere in app.js. No "porn slips down since last week," no "best-rated day was Wednesday." There is no reflective payoff for opening Week beyond the numbers themselves.

**Asymmetric treatment inside one feature.** Week's Slips card computes "last porn slip logged N days ago" only for porn; scrolling, the other top-priority habit, gets no equivalent line, though the underlying `lastLapse` helper already supports any slip key.

**Easy-to-skip risk is invisible.** Night's partial-completion rule intentionally makes skipping frictionless, good for adoption, but a day where everything was skipped looks identical in Week's "logged" count to a day with real ratings and a sentence, since a day record is created on the first toggle touch. There's no way to notice a slide back into whiteboard-style skipping.

## 3. What is over-built or could be cut

- **Two parallel nudge systems** (ntfy pushes and Shortcuts timers) overlap; the UI already hides Shortcuts once ntfy is set — finish the job and retire it.
- **Triple data redundancy** (localStorage, previous-save copy, 60 IndexedDB snapshots) for one user who already gets backup nags; the snapshot store has no restore UI, so it's insurance no one can act on.
- **Storage health's four status rows** are more infrastructure detail than needed on a screen opened often; fine as an occasional check, over-weighted for daily viewing.

## 4. Prioritized changes (hardest habits first)

1. **Link urge outcomes to the Night slip log.** Why: prevents double/zero-counting the two hardest habits. Size: S. Done: "Gave in" for porn/scroll auto-sets today's matching Night toggle; Week shows one true count.
2. **Trigger pattern surfacing for porn and scroll.** Why: the highest-value signal already exists and is unused. Size: M. Done: a view lists the most frequent trigger words per slip type over 4 weeks.
3. **Optional "what would help next time" after a slip.** Why: gives relapse a compassionate follow-up instead of a neutral toggle. Size: S. Done: an optional field appears after "Gave in" or a Night slip, shown later in Journal.
4. **Tap-chip trigger shortcuts in the Urge overlay.** Why: lowers friction at the moment willpower is weakest. Size: S. Done: 4-6 common trigger chips plus free text, one tap fills the field.
5. **Time-of-day/day-of-week pattern for urges.** Why: timestamps exist but are never summarized; addresses "dopamine sources running my life." Size: M. Done: a view shows which hours/days urges and slips cluster in.
6. **Scrolling gets the same "days since last slip" line as porn.** Why: closes a parity gap between the two equally-hardest habits. Size: S. Done: `lastLapse('scroll')` renders a matching line in Week's Slips card.
7. **One computed insight sentence per Week card.** Why: the app currently never tells him anything back. Size: M. Done: Slips and How-I-showed-up cards each show one auto-generated comparative sentence.
8. **Morning intention priming.** Why: implementation intentions work best before the situation, not logged after the fact. Size: S. Done: Day tab surfaces one Intentions note each morning, not only at night.
9. **Weekly review ritual.** Why: mindset goals get nightly ratings but no weekly step-back. Size: M. Done: on/after Sunday, a one-time card with 2-3 reflection questions appears, saved and visible in Journal.
10. **Surface real Night completion, separate from "logged."** Why: makes a slide into skip-everything visible, addressing the original whiteboard failure. Size: S/M. Done: Week shows a neutral count of nights with an actual rating or sentence, not just nights opened.
11. **Retire the Shortcuts-timer path once ntfy is set.** Why: cuts redundant surface area. Size: S. Done: `useShortcutTimers` UI and links are removed, not just hidden, once an ntfy topic exists.
