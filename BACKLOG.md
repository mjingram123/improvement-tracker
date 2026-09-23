# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now

(wave 1 merged; awaiting Michael's checkpoint go for the QA wave)

## Next

- [ ] T7 Week view: month strip or simple list of past weeks for scrolling back further than one tap at a time.
- [ ] T8 Journal tab: every one-sentence entry in reverse order, searchable.
- [ ] T9 Optional PIN gate with WebCrypto encryption of the stored blob. Off by default, because a forgotten PIN means data loss.

## Later (only after a week of real use)

- Per-lapse trigger word cloud in week view.
- Gym log with type or duration.
- Weekly review prompt on Sunday afternoon with three reflection questions.

## Done

- [x] D1 Morning checklist replaces the single Stretched toggle: Up on time, 30 push ups, Stretched, Shower and shave (check rows, d.
- [x] D2 Commitments: remove water polo; keep Gym (log when it happens) and Dinner out on its days.
- [x] D3 Under the date, show "Today: <focus skill label>" muted when d.
- [x] M1 Tab bar becomes Day, Mind, Night, Week, More with a new outline icon; sw.
- [x] M2 Prepare half: pick today's focus among the four skills (d.
- [x] M3 Reflect half: the four 1 to 5 ratings (same d.
- [x] M4 Intentions editing moves here (collapsible "Edit intentions" section, same settings.
- [x] M5 Weekly review card in Reflect from Sunday 15:00 through the following Tuesday: three fields (What worked, What got in the way, One thing for next week) saved to state.
- [x] N1 Flow shrinks to three steps: Wind-down (timer plus two checks: Washed up, Mouth tape and vaseline, d.
- [x] N2 Slips: optional "What would help next time?" field under each slip note (d.
- [x] W1 Patterns card over the last 28 days: top trigger words per slip type (urge triggers plus lapse notes, lowercase, stopwords dropped, 3 letters minimum), urges by time bucket (morning 4-12, afternoon 12-17, evening 17-22, late 22-4), slips by weekday, and a four-week strip of identical small blocks (slip days per type, nights checked in, average rating).
- [x] W2 Overall card at the bottom: "Last porn slip .
- [x] W3 Insight sentences: up to one per Slips card and How I showed up card, neutral, no exclamation points, comparisons only when last week has logged data.
- [x] W4 Routines: Morning done n of m (all four morning checks), Wind-down done, Night check-ins n of m (nightCardDone), Gym "4 times", Dinner out n of m; water polo row removed.
- [x] W5 Journal: weekly review answers at the top of that week, mind moments, slip help lines in italics.
- [x] U1 Gave in on porn or scrolling sets that day's lapse flag (day from urgeDayKeyFor) and copies the trigger into the lapse note when empty.
- [x] U2 Six trigger chips above the field from the most used triggers in the last 28 days, defaults bored, tired, alone, stressed, late, drinking; tap appends.
- [x] U3 After Gave in, a short inline follow-up in the overlay: optional "What would help next time?" (urge.
- [x] U4 Remove the Shortcuts timer link from the overlay.
- [x] R1 Snapshot restore: list the last seven daily snapshots from IndexedDB (own small reader, same DB and store names) with dates; tapping merges with mergeInto semantics and toasts counts.
- [x] R2 Framing line in the setup card subtitle and at the bottom of More: "A private notebook for the habits and mindset you are working on.
- [x] R3 Remove the Shortcuts timers toggle, help text, and setting UI.

- [x] T43 Intentions card in More; notes shown under Night ratings, why line under the Week navigator.

- [x] T41 Night step dots are tappable buttons again with 44px hit areas (QA cycle 4).
- [x] T42 Service worker revalidates every asset on fetch so updates land on the next open instead of after the HTTP cache expires.

- [x] T30 Tokens, fonts, base: replace the palette in app.
- [x] T31 Tab bar and floating button: order Day, Night, Week, More; 88px bar with blur and --bar fill; 56x32 active pill in --blue-soft with --blue-700 icon; 11px labels; icons from design/icons.
- [x] T32 Shared components restyled per README: toggle 51x31 with knob animation, check circle 26px in 44 hit box with line-through label when checked, kit chips, 1 to 5 rating pills, both segmented controls, primary/secondary/outline/text buttons, Gave in amber button, progress bar, banner, toast, fields with labels, card done state (2px --green border plus "Morning done" line with circled check).
- [x] T33 Day screen: date title 30px Outfit, no kicker (our decision T23 stands), list card with Stretched and Hungover rows, kit chips row when hungover, COMMITMENTS kicker and check rows.
- [x] T34 Night flow and summary: step indicator with stretching blue dots and "Step N of 4" caption, step titles, Next (Done on step 4) and Skip pinned at the bottom of the content area, wind-down card with 240px gradient timer ring (README Timer ring spec) in idle, running, done states, slips list card with labeled follow-up field, ratings card, reflection card.
- [x] T35 Urge overlay: full-screen --bg layer, kicker plus 44px close, ask state and running state per README with the 260px gradient ring, bottom log section with the 78/68/1fr/auto grid, toasts "Rode it out.
- [x] T36 Week screen: navigator with 44px chevrons and Outfit 22px range, Slips card with blue bars, How I showed up card with green sparkline and 72px right column, Routines, Journal with italic slip notes and "Nothing written yet.
- [x] T37 More screen: Backup, Restore, Storage health with status dots, Schedule with S M T W T F S chips and the 12/2/4/6 am segmented "Day ends at" (keep other hours if already saved), Reminders, Getting set up.
- [x] T39 ntfy instead of Shortcuts.
- [x] T40 At 120 percent text size the Night flow's Skip button sits under the floating urge button (QA cycle 3).
- [x] T38 Update TESTING.

- [x] T16 Tap targets: check circles, rating buttons, day chips, week-nav arrows get a 44x44 CSS px hit area by padding, glyph size unchanged.
- [x] T17 Contrast: --warn on --warn-soft reaches 4.
- [x] T18 Visible labels above the One sentence textarea, the Urge trigger field, and the Restore paste field; placeholders become example text.
- [x] T19 Storage health shows the real navigator.
- [x] T20 prefers-reduced-motion: switch and rating transitions become instant when the OS setting is on.
- [x] T21 Type scale in rem so Dynamic Type style zoom does not clip.
- [x] T22 Night summary closes on one calm line, for example "Logged for Tue, Sep 8.
- [x] T23 Day tab header label: shows "morning" in the evening.
- [x] T24 Night summary shows "In progress, mm:ss left" for a running wind-down instead of "Skipped" (QA cycle 2 bug).
- [x] T25 Week comparisons only show "last week" when last week has logged days.
- [x] T26 Toggle rows get a 44px hit height.

- [x] T10 Four bottom tabs: Day, Week, Night, More.
- [x] T11 Night as a 4-step flow (Wind-down, Slips, How I showed up, One sentence) with a dot indicator, Back, Next, Skip.
- [x] T12 Urge overlay: floating button on every tab opens a full-screen overlay (close control top right).
- [x] T13 Setup checklist: stays as the top card on Day until dismissed; after dismissal it appears in More as a "Getting set up" section so the instructions remain reachable.
- [x] T14 Tab bar icons: simple inline SVG outlines for the four tabs above their labels, current tab in accent.
- [x] T15 Update TESTING.

- [x] T1 Split pure logic into logic.js (browser global + node require).
- [x] T2 Unit tests under tests/ with node --test (20 tests).
- [x] T3 First-run setup checklist card on Day, persisted per item.
- [x] T4 Hide Download in iOS standalone mode; Share first.
- [x] T5 Night card counts as done on any partial input.
- [x] T6 Optional Shortcuts timer links behind a setting.
- [x] v1 scaffold: Today, Week, More screens; urge flow; wind-down timer; localStorage + IndexedDB mirror + snapshots; export via Share/Copy/Download; import merge; PWA manifest, service worker, icons.
