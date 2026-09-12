# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now (visual redesign from design/README.md; functional truth stays as built)

- [ ] T30 Tokens, fonts, base: replace the palette in app.css with the light and dark token sets from design/README.md (keep --warn pairs at 4.5:1 or better), add the --bgwash background, 24px card radius and shadow, self-hosted Outfit via fonts/outfit.css for titles and pill labels, mono stack for countdowns, the type scale table, 20px side padding, bottom padding that clears the floating button and tab bar. Precache fonts in sw.js and bump the cache name. Done: every screen renders on the new tokens with no leftover old colors.
- [ ] T31 Tab bar and floating button: order Day, Night, Week, More; 88px bar with blur and --bar fill; 56x32 active pill in --blue-soft with --blue-700 icon; 11px labels; icons from design/icons. Floating button 52px pill, wave icon, label "Urge" idle (--card fill, --blue-700 text, --blue-soft border) and "Riding it out · mm:ss" running (--blue fill, white). Done: matches the README component specs in both themes.
- [ ] T32 Shared components restyled per README: toggle 51x31 with knob animation, check circle 26px in 44 hit box with line-through label when checked, kit chips, 1 to 5 rating pills, both segmented controls, primary/secondary/outline/text buttons, Gave in amber button, progress bar, banner, toast, fields with labels, card done state (2px --green border plus "Morning done" line with circled check). Done: component sheet visible across screens.
- [ ] T33 Day screen: date title 30px Outfit, no kicker (our decision T23 stands), list card with Stretched and Hungover rows, kit chips row when hungover, COMMITMENTS kicker and check rows. Done: matches README Day section.
- [ ] T34 Night flow and summary: step indicator with stretching blue dots and "Step N of 4" caption, step titles, Next (Done on step 4) and Skip pinned at the bottom of the content area, wind-down card with 240px gradient timer ring (README Timer ring spec) in idle, running, done states, slips list card with labeled follow-up field, ratings card, reflection card. Summary as the README describes with Edit in --green-700 and the closing "Logged for ..." line. Done: all states render; existing tick logic drives the ring.
- [ ] T35 Urge overlay: full-screen --bg layer, kicker plus 44px close, ask state and running state per README with the 260px gradient ring, bottom log section with the 78/68/1fr/auto grid, toasts "Rode it out. Logged." and "Logged.". Done: matches README Urge section.
- [ ] T36 Week screen: navigator with 44px chevrons and Outfit 22px range, Slips card with blue bars, How I showed up card with green sparkline and 72px right column, Routines, Journal with italic slip notes and "Nothing written yet." empty state. Done: matches README Week section.
- [ ] T37 More screen: Backup, Restore, Storage health with status dots, Schedule with S M T W T F S chips and the 12/2/4/6 am segmented "Day ends at" (keep other hours if already saved), Reminders, Getting set up. Done: matches README More section.
- [ ] T39 ntfy instead of Shortcuts. Michael never wants the app auto-opened. Remove all Shortcuts automation copy. Onboarding item 2 becomes "Turn on nudges" with hint "Install the ntfy app, subscribe to the topic in More > Reminders. Two pushes a day, 9:00 and 22:00, generic wording." More > Reminders: a labeled field "ntfy topic" (settings.ntfyTopic, default empty), a "Send test" secondary button that POSTs "Nudges are connected." to https://ntfy.sh/<topic>, and a toggle "Timer pings" (settings.ntfyTimers, default off) that, when on and a topic is set, POSTs a delayed generic message when a wind-down or urge timer starts (headers Delay: 15m or 10m, Title: "Timer", body "Time."), so the phone buzzes even when locked. Cancelling a wind-down cannot recall the ping; say so in the help text. The daily nudges themselves come from .github/workflows/nudge.yml, not the app. Keep settings.useShortcutTimers but hide its UI when a topic is set. All ntfy calls are fire-and-forget with a 5s timeout and never block the UI or store anything remotely. Done: test ping arrives, timer ping arrives after the delay, no sensitive words in any payload.
- [ ] T40 At 120 percent text size the Night flow's Skip button sits under the floating urge button (QA cycle 3). The bottom padding of the view must clear the floating button and tab bar at any root font size; size the reserved space in rem or measure the bars at runtime. Done: at root font-size 19.2px, Skip and Next are fully tappable on every Night step.
- [ ] T38 Update TESTING.md for the new visuals (tab order, button label "Urge", ring timers, kicker removal) and add a dark-mode screenshot pass. Done: doc updated with the code.

## Next

- [ ] T7 Week view: month strip or simple list of past weeks for scrolling back further than one tap at a time.
- [ ] T8 Journal tab: every one-sentence entry in reverse order, searchable.
- [ ] T9 Optional PIN gate with WebCrypto encryption of the stored blob. Off by default, because a forgotten PIN means data loss.

## Later (only after a week of real use)

- Per-lapse trigger word cloud in week view.
- Gym log with type or duration.
- Weekly review prompt on Sunday afternoon with three reflection questions.

## Done

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
