# QA: Week, Urge, More (agent B, wave 1 QA)

Tested at 375x812 (mobile), light and dark, against `http://127.0.0.1:8765`, branch
`main` at 7cd0b09+. Data seeded/cleared via localStorage + IndexedDB on the
`icons/icon.svg` page (never by editing app code), 21 days (18 logged, 3 skipped),
mixed slips with notes and lapseHelp, ratings 2-5 with 3 no-rating gap days, 10 urges
(5 rode / 5 gave, varied hours/triggers), gym checks, morning routines, night checks,
a `state.reviews` entry for the prior week, one long reflection, and 3 hand-planted
IndexedDB `snap:` keys (each with one extra day + one extra urge not in the live
state, to make merge counts verifiable). Expected numbers for every Week card were
computed by hand from the seed's offsets/weekdays/timestamps *before* reading the
rendered screen, then compared.

Screenshots confirmed for light/dark and 100%/120% root font size; some later
scenario numbers reflect additional urges logged live during Urge testing (noted
where relevant), which is expected drift, not a bug.

## Week

1. Navigator prev/next, why line under it — **PASS**. 44x44 chevrons, next disabled
   on current week, "Sep 21 – Sep 27" title, intentions `why` line rendered centered
   underneath.
2. Slips card rates + last-week comparison + insight sentence matches seed —
   **PASS**. Hand-computed: current week scroll 1/2, porn 0/2, nag 0/2, last week
   (Sep14-20) 1/7 each; insight "Fewer porn slip days than last week (0 vs 1)." — all
   matched exactly. Paged to Sep14-20: scroll/porn/nag 1/7 each, last-week-before
   1/7 each, insight "1 of 4 urges ridden out." (rode=1, gave=3) — matched.
3. How I showed up sparkline, per-dimension averages, insight sentence — **PASS**.
   Current week: Mon 3.0, Tue 2.0, dash for future days; dimension averages
   2.5/2.5/1.5/3.5 vs last-week 3.4/3.4/2.4/4.2 — matched hand calc to the decimal.
   Insight "Best-rated day was Monday." (Sep14-20 week: "Best-rated day was
   Tuesday.") — matched.
4. Patterns card: top triggers per slip type vs hand count — **PASS**. scroll
   "bored 3 · tired 3 · dinner 1 · late 1 · night 1", porn "stressed 3 · bored 2 ·
   evening 1 · lonely 1 · tired 1", nag "again 1 · cars 1 · dishes 1 · stressed 1 ·
   tired 1" — all matched a manual word count of the seeded urge triggers + lapse
   notes with the documented stopword/3-letter rules.
5. Patterns: time buckets vs urge hours — **PASS**. morning 3, afternoon 2, evening
   2, late 3, matching the 10 seeded urge timestamps' hour buckets exactly.
6. Patterns: weekday bars vs seed — **PASS**. scroll Mon 1/Wed 2, porn Sun 3, nag
   Fri 1/Sat 1 — matches the exact weekdays of the seeded lapse days.
7. Patterns: four-week strip, four blocks with plausible numbers — **PASS**. All
   four blocks (Aug 31, Sep 7, Sep 14, Sep 21) matched hand-computed
   lapses/nights/avg-rating per block, including an empty-looking Aug 31 block
   correctly showing only the one seeded day that fell in it.
8. Under three data points, Patterns shows only the placeholder — **PASS**. Seeded
   a fresh empty state; Patterns card rendered only "Patterns appear after a few
   entries." with no other content; other cards degraded gracefully (0 of 2, "–",
   "Nothing written yet.", "No porn/scrolling slip logged yet.") rather than
   crashing.
9. Overall card: both last-slip lines, same style regardless of number, unchanged
   across weeks — **PASS**. "Last porn slip logged 2 days ago." / "Last scrolling
   slip logged 1 day ago." shown identically on both the current week and the
   previous week view (computed from `today`, not the navigated week, per the
   code comment in week.js).
10. Routines: Morning done n of m, Wind-down done, Night check-ins, Gym k times,
    Dinner out — **PASS**. Current week "Morning done 2 of 2", "Wind-down done 1 of
    2 / last week 3 of 7", "Night check-ins 2 of 2", "Gym 1 times", no Dinner row
    (0 Sundays elapsed). Previous week "Morning done 5 of 7", "Wind-down done 3 of
    7 / last week 2 of 7", "Night check-ins 5 of 7", "Gym 2 times", "Dinner out 1 of
    1" — all matched hand calc.
11. Journal: weekly review at top of its week, moments, slip notes with italic
    "next time" lines — **PASS**. Sep14-20 week showed the WEEKLY REVIEW block
    first, then entries newest-first including the long reflection note, a nag slip
    note with no help line, and a porn slip note with its italic "next time: call a
    friend instead" line — current week correctly did NOT show the review (it
    belongs to the prior week).
12. No red anywhere — **PASS**. Confirmed visually (light + dark) and via source
    search (`grep -rniE "red|#f00|crimson"` across css/js) — no red is defined
    anywhere in the app; `--warn` is a brown/amber, never used for slip counts.

## Urge

13. Floating button on every tab — **PASS**, checked on Week and More (idle "Urge"
    label; switches to "Riding it out · mm:ss" while a timer runs, live-updating).
14. Overlay ask state: six chips from seeded trigger history vs hand count, defaults
    fill remainder — **PASS**. Seed trigger pool (bored x4, tired x3, stressed x3)
    ranks to exactly 3 unique words; chips rendered "bored, stressed, tired, alone,
    late, drinking" — the 3 ranked words followed by `DEFAULT_TRIGGERS` in order,
    skipping only the ones already present (`bored`, `tired`, `stressed`) — matches
    the documented padding/dedupe rule exactly.
15. Tapping a chip appends to the field and keeps focus — **PASS**. Tapped "bored"
    then "alone"; field read "bored, alone"; `document.activeElement` stayed the
    trigger input both times.
16. Start 10 minutes creates a running state with the ring — **PASS**. Ring (SVG,
    260px) appeared with live mm:ss countdown, kind + trigger line, "Rode it out"
    disabled until 00:00, "Gave in" always enabled.
17. Gave in shows the follow-up card; Done saves urge.help; Skip saves nothing; both
    close with toast "Logged." — **PASS** for all three. Confirmed via state
    inspection: Done run saved `urge.help === "call someone instead"`; Skip run left
    `help` unset (`hasOwnProperty` false) on the urge object. Both closed the
    overlay and showed toast "Logged."
18. Rode it out unchanged — **PASS**. Forced timer to elapse (test-only: set
    `endsAt` in the past via `window.IT.state`, not a code change) and tapped Rode
    it out: toast "Rode it out. Logged.", overlay closed, no lapse/lapseNotes
    touched.
19. Gave in on a porn urge at simulated 1:30am: previous day's `d.lapses.porn` true,
    trigger copied into `lapseNotes.porn` only if empty — **PASS**, both halves
    verified independently:
    - Overrode `Date`/`Date.now()` on the page (script-local, no file edited) to
      Sep 21 1:30am. Gave in on a Porn urge with trigger "insomnia-test". Verified
      `state.days['2026-09-20'].lapses.porn === true` (already true) and
      `lapseNotes.porn` **unchanged** ("stressed after work", the pre-existing
      seeded note) — trigger was correctly *not* copied over a non-empty note.
    - Separately, a same-day Gave in on today's (empty-note) porn day copied the
      typed trigger into `lapseNotes.porn` exactly once, confirming the
      copy-when-empty half of the rule.
20. No `shortcuts://` anywhere — **PASS**. Fetched and grepped `urge.js`,
    `more.js`, `core.js`, `index.html`; zero occurrences.

## More

21. Backup card — **PASS** with one environment note: Share falls back to Download
    (toast "Downloading.") since there's no Web Share API in this browser, as
    expected/documented; Copy fails with "Copy failed. Try Share or Download." in
    this in-app browser (also expected/documented, matches analysis/ux.md #7 —
    worth a recheck on a real phone, not a bug here).
22. Restore paste merge works — **PASS**. Pasted a one-day backup payload; Merge
    produced toast "Merged 1 days, 0 urges." and the new day appeared in
    `IT.state.days`.
23. Snapshot list appears only when IndexedDB has `snap:` keys; merging one toasts
    counts — **PASS**. Seeded 3 extra `snap:` keys directly into the `kv` store
    (each with one extra day + one extra urge not present live); the "Restore from
    a daily snapshot" block appeared with all of them plus the auto-created
    `snap:2026-09-22`, dates formatted via `fmtLong`; tapping one armed a "Merge
    this snapshot" row; merging it produced toast "Merged 1 days, 1 urges." and the
    planted extra day/urge appeared in state — exact predicted counts. (One planted
    snapshot, `snap:2026-09-20`, got silently overwritten mid-session by the app's
    own auto-mirror while the Date override from scenario 19 was active — that is
    expected `mirror()` behavior given the simulated clock, not a bug; the other two
    stayed intact and were used for this check.)
24. Storage health rows — **PASS**. Primary store / Backup mirror "ok" with green
    dots, snapshot count matched the live IDB key count, "Persistent storage: not
    granted" shown honestly (real `navigator.storage.persisted()` result, not
    faked).
25. Schedule: hangover + dinner day chips and Day-ends-at segmented, no water polo
    — **PASS** on content (hangover days Fri/Sat/Sun and dinner day Sun correctly
    pre-selected via `aria-pressed`; rollover 4am selected; no water polo row/label
    anywhere). **FAIL** on tap-target size — see BUG 1 below.
26. Reminders: ntfy topic, Send test, Timer pings, guessability sentence, no
    Shortcuts toggle — **PASS**. Typing a topic enabled "Send test" (was disabled
    empty); tapping it produced toast "Sent"; "Timer pings" toggle present with its
    explanatory line; no "Shortcuts" UI anywhere on the screen.
27. No Intentions card — **PASS**. Confirmed absent (intentions editing now lives
    on Mind per CONTRACTS.md).
28. Setup checklist appears in More after dismissal with the framing subtitle;
    framing line at the bottom — **PASS** on the bottom framing line, **FAIL** on
    the setup-card subtitle — see BUG 2 below.

## Cross-checks

29. No console errors besides `/__blank` 404s — **PARTIAL**. No `__blank` 404s
    seen; however every page load logged 4x `[error] An unknown error occurred when
    fetching the script.` with no other detail available from the console API used.
    Not obviously tied to Week/Urge/More app logic (all app JS/CSS/font requests in
    the network log returned 200 OK); most likely a service-worker/cache artifact
    from `sw.js` (shared file, not owned by this builder) reacting to this headless
    browser's environment. Flagged in NOTES for the Night builder / a follow-up,
    not blocking.
30. 120% text on all three screens and the overlay — **PASS**. Set
    `documentElement.style.fontSize = '120%'` and screenshotted Week (top, mid-scroll,
    and true bottom), the Urge overlay (ask + running states), and More (top,
    Schedule, Getting-set-up/bottom). No clipped or overlapping text; chips
    reflowed to extra rows; floating button never covered unread content once
    settled at rest (a mid-scroll frame briefly showed a line behind the floating
    button, which is normal transient scrolling, not a layout bug — content is
    fully clear at both scroll-top and scroll-bottom).
31. Dark mode screenshots — **PASS**. Week, Urge overlay (ask + running), and More
    all correctly themed (not a simple inversion, matches design/README.md dark
    tokens), legible, no red.
32. Tap targets 44px or more including chips and snapshot rows — **PASS** for:
    week-nav chevrons (44x44 exact), snapshot rows (295x56), urge trigger chips
    (44px tall), urge kind segmented buttons (48px tall), overlay close button
    (44x44), onboarding check rows (>44 tall). **FAIL** for two elements — see BUG 1
    and BUG 3 below.

## Bugs (ticket-ready)

**BUG 1 — Schedule day-chips shrink below the 44px tap-target minimum on a
375px-wide screen**
- Steps: Open More > Schedule on a 375x812 viewport (the narrow end of the
  documented 375-430px fluid range). Inspect any day chip in "Hangover prompt
  days" or "Dinner out days" (7 chips, S M T W T F S).
- Expected: Each chip is a 44x44 tap target (design/README.md: "day chip glyph
  36px inside a 44×44 button"; `.daychips button { width: 44px; height: 44px }`
  in css/screens/more.css).
- Actual: The `.daychips` flex container is only ~295px wide (card content width),
  but 7 buttons at 44px + 6×4px gaps need ~332px. With the browser default
  `flex-shrink: 1` and no override, every chip button is compressed to ~38.7px
  wide (measured via `getBoundingClientRect()`), under the 44px minimum, on both
  chip rows.
- Likely file/line: `css/screens/more.css` lines 16-17 (`.daychips { display:
  flex; gap: 4px; }` / `.daychips button { width: 44px; height: 44px; ... }`) —
  needs `flex-shrink: 0` on the button (and either a smaller gap/padding budget or
  horizontal scroll) so the explicit 44px width actually holds at 375px width.

**BUG 2 — More's "Getting set up" card is missing the framing subtitle after
dismissal**
- Steps: Dismiss the setup checklist on Day (`settings.onboarded = true`), open
  More.
- Expected per BACKLOG.md R2 ("Framing line in the setup card subtitle and at the
  bottom of More") and this QA scenario ("setup checklist appears in More after
  dismissal with the framing subtitle"): the "Getting set up" card in More shows
  the framing subtitle "A private notebook for the habits and mindset you are
  working on. Nothing leaves this phone." under its title, the same way it does on
  Day before dismissal.
- Actual: More's "Getting set up" card shows only the `<h2>` title and the three
  check rows — no subtitle line. (The separate framing line at the very bottom of
  the whole More screen is present and correct — only the setup-card's own
  subtitle is missing.)
- Likely file/line: `js/screens/onboarding.js`, `renderSetupInMore()` (lines
  28-31) is missing the `<p class="muted small">${FRAMING_LINE}</p>` line that
  `renderOnboarding()` (lines 21-26) has right above `onboardingRows()`.

**BUG 3 — "Day ends at" segmented buttons are 39px tall, under the 44px tap-target
minimum**
- Steps: Open More > Schedule, inspect the "Day ends at" segmented control (12 am
  / 2 am / 4 am / 6 am).
- Expected: Per the general rule "Every tap target ≥ 44×44" in design/README.md.
- Actual: `getBoundingClientRect()` measured 39.2px tall for every option (CSS
  `min-height: 38px`).
- Likely file/line: `css/screens/more.css` line 11 (`.segmented-neutral button {
  min-height: 38px; ... }`) — raise to `min-height: 44px`. Lower confidence/nit:
  the design doc's own component spec for this control doesn't restate a height
  number the way it does for the toggle/check-circle, but the umbrella 44px rule
  and ticket T16's intent both suggest this should be 44px like every other
  control.

## Notes

- All Week/Patterns/Urge numbers were verified against an independently
  hand-computed oracle built from the seed's own offsets/weekdays/timestamps
  before reading any rendered screen — every one matched to the exact count or
  decimal on first read, no discrepancies found in the underlying math anywhere
  across `logic.js`, `js/logic-week.js`, `js/logic-urge.js`, or `js/logic-more.js`.
- Screenshots render correctly in this environment (pane was not hidden); both
  `get_page_text`/`read_page` and visual screenshots were used and agreed.
- The 4x recurring "unknown error... fetching the script" console errors (see
  scenario 29) appeared identically on every fresh page load regardless of which
  tab was opened first, so they are unlikely to be specific to Week/Urge/More
  code; flagging for awareness rather than filing against these three screens.
