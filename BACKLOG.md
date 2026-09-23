# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now (cycle 7: product and UX, from ANALYSIS.md)

- [ ] P1 Link urge outcomes to Night slips. "Gave in" on a porn or scrolling urge sets that day's matching lapse flag (day chosen with the rollover rule from the urge's time) and, if the lapse note is empty, copies the trigger into it. Toggling the Night slip off later does not delete the urge. Pure helper in logic.js with tests. Done: one true count in Week after a 1:30am gave-in.
- [ ] P2 Patterns card on Week, computed over the last 28 days by a pure function in logic.js with tests: top trigger words per slip type (tokenize urge triggers and lapse notes, lowercase, drop stopwords, min 3 letters), urges by time bucket (morning 4-12, afternoon 12-17, evening 17-22, late 22-4), slips by weekday, and a four-week strip (per week: slip days per type, nights checked in, average rating) rendered as small identical blocks, never one combined chart. Under three data points the card shows one calm line: "Patterns appear after a few entries." Done: renders with the seeded 21-day dataset from analysis/ux.md and hides gracefully when empty.
- [ ] P3 "What would help next time?" optional field after Gave in (urge.help) and under a Night slip note (d.lapseHelp[key]), additive shape. Shown in Journal in italic under the entry. Done: persists and renders.
- [ ] P4 Urge trigger chips: six chips above the trigger field built from the most used triggers in the last 28 days, falling back to bored, tired, alone, stressed, late, drinking. Tap appends the word. Done: chips render and fill the field.
- [ ] P5 Move the "last slip" lines out of the week-scoped Slips card into a small "Overall" card at the bottom of Week, one line each for porn and scrolling, same neutral style regardless of number. Done: lines no longer change meaning when paging weeks.
- [ ] P6 Insight sentences: pure insights(state, weekStart, todayKey) in logic.js returns up to one sentence for the Slips card and one for How I showed up, neutral wording, no exclamation points, comparisons only when last week has logged data. Examples: "Fewer scrolling days than last week, 2 against 4." "Best-rated day was Wednesday." "3 of 4 urges ridden out." Done: tests cover each branch; sentences render at the top of their cards.
- [ ] P7 Morning priming: Day shows one Intentions note under the date (rotate by day-of-year across the non-empty notes), muted, only when at least one note exists. Done: renders and rotates.
- [ ] P8 Weekly review: state.reviews[weekStartKey] = { worked, inTheWay, next, at } (additive). From Sunday 15:00 local through Tuesday of the following week, Week shows a "Weekly review" card for that week with three labeled fields; once any field is filled it shows collapsed with an Edit link, and the answers appear at the top of that week's Journal. Done: pure eligibility function tested; card renders and persists.
- [ ] P9 Real completion count: Routines gets "Night check-ins n of m" using nightCardDone; Gym row reads "Gym 4 times" instead of a bare number. Done: renders.
- [ ] P10 Snapshot restore: More > Restore lists the last seven daily snapshots from IndexedDB with dates; tapping one merges it with mergeInto semantics and toasts the counts. Done: works after seeding snapshots.
- [ ] P11 First-run framing: the setup card gets a subtitle line, "A private notebook for the habits and mindset you are working on. Nothing leaves this phone." The More tab gets the same line at the bottom. No sensitive words. Done: renders.
- [ ] P12 Retire Shortcuts timers: remove settings.useShortcutTimers UI, links, and code; normalize ignores the old key. Done: no shortcuts:// anywhere in the app.
- [ ] P13 Intentions inputs: text-overflow ellipsis on placeholder and value at large text. Done: no clipped mid-word placeholder at 120 percent.
- [ ] P14 TESTING.md updated for P1 to P13, including a seeded-data scenario for Patterns and insights. Done: doc matches the code.

## Next

- [ ] T7 Week view: month strip or simple list of past weeks for scrolling back further than one tap at a time.
- [ ] T8 Journal tab: every one-sentence entry in reverse order, searchable.
- [ ] T9 Optional PIN gate with WebCrypto encryption of the stored blob. Off by default, because a forgotten PIN means data loss.

## Later (only after a week of real use)

- Per-lapse trigger word cloud in week view.
- Gym log with type or duration.
- Weekly review prompt on Sunday afternoon with three reflection questions.

## Done

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
