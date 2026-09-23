# QA pass: Day / Mind / Night (wave 1 checkpoint, agent A)

Run against `http://localhost:8765` (main @ 90eead9, `python3 -m http.server 8765` from the
`improvement-tracker` directory), 375x812, light and dark emulation. Site data (localStorage,
IndexedDB, caches, service worker) cleared before the fresh-install scenario; clock overridden
in-page (`window.Date` subclass) for weekday/boundary/rollover scenarios since the host clock
can't be moved. Scope: Day, Mind, Night only — Week/Urge/More belong to the other QA agent.

## Day

1. Fresh install shows the setup card with the framing subtitle. **PASS** — "Getting set up" /
   "A private notebook for the habits and mindset you are working on. Nothing leaves this phone."
2. Four morning checks (Up on time, 30 push ups, Stretched, Shower and shave) toggle (strikethrough
   + green check) and persist across reload. **PASS**
3. d.stretched mirrors d.morning.stretched. **PASS** — verified in localStorage after checking
   "Stretched": `{"stretched":true, ..., "morning":{"stretched":true,...}}`.
4. "Morning done" line + green card border appears only once all four morning checks are on, and
   (on Fri/Sat/Sun) only once the hangover kit is also complete when the Hungover? toggle is on.
   **PASS** — verified: 4 checks + hangover on + empty kit → no done line; kit completed → done
   line appears. On a non-hangover day (Tue) the line appears right after the 4 checks.
5. Hangover row ("Hungover?", hint "Fri, Sat, Sun") shown only on configured weekdays. **PASS** —
   absent on Tuesday, present on Friday and Sunday (clock override).
6. Water polo row is absent everywhere. **PASS** — never rendered in day.js; confirmed by reading
   the source and by page text on Tue/Fri/Sun.
7. Gym always present; Dinner out present only on Sunday. **PASS** — confirmed Tue (no Dinner out),
   Sun (Dinner out + Gym both present).
8. "Today: <skill>" line appears under the date only after a focus is picked on Mind, and shows the
   matching intentions note underneath when non-empty. **PASS** — absent before picking a focus;
   after picking "Curious in conversation" and adding a note in Edit intentions, Day showed
   "Today: Curious in conversation" / "ask what they mean by that".

## Mind

9. Tab order is Day, Mind, Night, Week, More. **PASS** — confirmed via accessibility tree
   (`nav[aria-label="Sections"]` buttons in that order) and visually.
10. Prepare is the default half before 15:00, Reflect after (and before the rollover hour).
    **PASS** — reasoned from `mindDefaultHalf` in js/logic-mind.js and confirmed live: 10:00 clock
    → Prepare; normal evening clock → Reflect.
11. Focus pick (Prepare half) is single-select and clears on a second tap; writes d.mindFocus.
    **PASS** — selecting "Curious in conversation" set `mindFocus:"curiosity"`; tapping it again
    cleared it to `""` and removed the checkmark/detail.
12. Intentions note and "why" show under the picked skill once picked. **PASS** — before any note,
    shows "Write your intentions below so they show up here."; after filling the curiosity note,
    the Prepare card shows the note text under the selected row.
13. Reflect ratings (1-5) write d.ratings; a second tap on the same value clears it to 0.
    **PASS** — verified in localStorage: tapping "4" on Curious set `ratings.curiosity:4`; tapping
    "4" again reset it to `0`.
14. "A moment today where I..." textarea saves on input without losing focus. **PASS** — typed
    continuously, `document.activeElement` stayed the textarea, and `d.mindMoment` matched after
    the debounce.
15. "Edit intentions" collapsible (`<details>`) saves settings.intentions on input without losing
    focus. **PASS** — typed into "Why I'm doing this" and a per-skill note field; focus stayed on
    the field being typed into and `settings.intentions.why`/`.notes.curiosity` persisted.
16. Weekly review card appears only when `isReviewWindow` says so; boundary times verified by
    calling `window.ITLogicMind.isReviewWindow` directly for a fixed week (`weekStartKey
    "2026-09-21"`): Sun 14:59 → false, Sun 15:00 → true, Tue 23:59 → true, Wed 00:00 → false.
    **PASS** — exactly matches the spec (open Sunday 15:00 through Tuesday 23:59:59.999). Also
    confirmed live in the UI: the card is absent before the window and appears at Sun 15:05.
17. Weekly review saves to `state.reviews[weekStartKey]` and collapses to a title + "Edit" link
    once any field has text. **PASS** — filled "What worked", value landed at
    `state.reviews["2026-09-21"].worked`; a re-render collapsed the card to "Weekly review / Edit".

## Night

18. Night is a 3-step flow (Wind-down, Slips, One sentence) with a "Step N of 3" caption.
    **PASS** — confirmed step titles, dot count (3), and caption text on all three steps.
19. Wind-down timer ring runs and completes. **PASS** — starting shows the 240px blue→green
    gradient ring at 15:00 counting down; forcing `windDown.endsAt` near-term and waiting for the
    1s tick flipped it to the done state ("15 minutes, done" with the circled check) automatically.
20. "Washed up" and "Mouth tape and vaseline" checks write d.night and persist. **PASS** —
    `d.night = {washed:true, tape:true}` after tapping both, survives reload.
21. Slips: turning a lapse on reveals, and scrolling to reach, the note field ("What was happening
    right before?"), the "What would help next time?" field, and (scroll only) the minutes field;
    all three persist and none lose focus while typing. **PASS** — filled all three for "Scrolled
    past limits"; `lapseNotes.scroll`, `lapseHelp.scroll`, `scrollMinutes` all persisted; focus
    stayed on the field being typed into throughout.
22. Night summary shows Wind-down (with checks appended), Slips, One sentence, and a Mind row that
    reads "Not rated yet" until ratings exist, with "Open Mind" switching to the Mind tab.
    **PASS** — summary read "15 minutes, done · Washed up · Mouth tape and vaseline" / "Scrolled
    past limits" / the typed sentence / "Not rated yet"; tapping "Open Mind" switched `tab` to
    `mind`.
23. Partial-done rule still marks the card done from any single input, including a night check.
    **PASS** — on a brand-new day, ticking only "Washed up" (no timer, no ratings, no note) was
    enough for `nightCardDone` to flip the screen straight to the summary.
24. The 1:30am rollover still files everything under the previous day. **PASS** — with the page
    clock overridden to Wed 01:30, `IT.todayKey()` returned the Tuesday key, the Night screen still
    showed/edited Tuesday's record ("Logged for Tue, Sep 22."), and a new edit made at that "time"
    (toggling "Nagged someone") landed in the existing Tuesday day object — no new day key was
    created.

## Cross-checks

25. Console errors besides `/__blank` 404s. **NOTE, not a functional bug** — every actual page
    resource (HTML/CSS/JS/fonts) loaded 200 OK throughout the pass and no JS exceptions were
    thrown during any interaction. The one reproducible console error is
    `navigator.serviceWorker.register('sw.js')` failing with "An unknown error occurred when
    fetching the script" on every load, even though `GET /sw.js` succeeds (200, correct
    `text/javascript`) via plain `fetch()`. This reads as a service-worker restriction in this
    preview browser sandbox rather than an app bug; flagging so it can be re-checked on a real
    device/Safari. Also saw two stale `net::ERR_FAILED` entries from the very first load of this
    session, before the service-worker cache was cleared (see NOTES) — not reproducible after.
26. 120% text size (`documentElement.style.fontSize = '19.2px'`) on Day, Mind, Night: no clipped
    or overlapping text; the Night flow's bottom actions (Next/Skip/Back to summary) stay clear of
    the floating Urge button. **PASS**
27. Dark mode screenshots of all three screens. **PASS** — Day, Mind, and Night (flow + summary)
    all render the dark palette from design/README.md (dark bg/card/text/borders, green/blue
    accents unchanged), text stays legible, no leftover light-only chrome.
28. Every tap target ≥44×44 (`getBoundingClientRect` plus `::after`/`::before` hit-box expansion).
    **FAIL** — see BUGS. Everything else scanned (morning checks, hangover toggle + kit chips,
    commitments rows, mind-focus rows, rating buttons, weekly-review Edit, night checks, lapse
    toggles, step dots [which do pass, via a 44×44 `::after` hit box — confirms T41], summary rows,
    wind-down Start/Cancel) measured ≥44×44.

## BUGS

1. **Mind Prepare/Reflect segmented control buttons are 38px tall, under the 44px minimum tap
   target.**
   - Steps: Open Mind tab (either half). Inspect the "Prepare"/"Reflect" buttons at the top.
   - Expected: ≥44×44 hit area per design/README.md ("Every tap target ≥ 44×44") — the container
     itself is 44px tall.
   - Actual: `getComputedStyle` shows the buttons at `height: 38px` / `min-height: 38px` with no
     compensating `::after`/`::before` hit-box (unlike, e.g., the night step-dots, which use a
     44×44 `::after` for exactly this purpose). Measured live: `{w:165, h:38}` for both buttons.
   - Likely file/line: `css/screens/mind.css:6` —
     `.mind-segmented button { flex: 1; min-height: 38px; ... }` — the 3px container padding
     (`css/screens/mind.css:5`) already accounts for 6px of the 44px container height, so the
     button's own `min-height` only needs to be 38px to fill it visually, but that leaves the
     *tappable* area at 38px. Fix by adding a 44×44 `::after` hit box (matching the step-dot
     pattern in css/screens/night.css) or by removing the container's 3px padding so the buttons
     themselves reach the full 44px.

## NOTES

- The shared preview server had precached an older build (pre-Mind, `app.css`/`app.js`) via the
  service worker from an earlier session; the Mind tab was missing and `app.css`/`app.js` 404'd
  until caches were cleared (`caches.keys()` → `caches.delete()`, then unregister the SW) and the
  page reloaded. Not an app bug — a stale-cache artifact of testing infrastructure — but worth
  flagging for other agents/sessions hitting the same shared origin/port: if the Mind tab or any
  screen looks stale, clear caches and hard-reload before treating anything else as a bug.
- `window.ITLogicMind.isReviewWindow`/`eligibleReviewWeek` and `window.IT.todayKey()` are handy
  for exact boundary/rollover verification without waiting on the real clock; used throughout this
  pass via a `window.Date` subclass override (`super(y,m,d,h,mi)` for a fixed "now", native
  otherwise) rather than trying to change the host clock.
- Did not exercise Week/Urge/More (out of scope) beyond confirming their tab buttons exist and
  "Open Mind" from the Night summary switches tabs correctly.
