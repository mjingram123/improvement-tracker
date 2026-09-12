# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now

- [ ] T10 Four bottom tabs: Day, Week, Night, More. Day = date header, morning card (stretched, weekend hangover kit), commitments. Week and More unchanged in content. Night = step flow, see T11. Remove the long Today screen. Done: each tab fits its job without important content below the fold at 375x812.
- [ ] T11 Night as a 4-step flow (Wind-down, Slips, How I showed up, One sentence) with a dot indicator, Back, Next, Skip. Opens at the first incomplete step. When all steps are visited or the card is done, show a summary with per-section Edit that jumps back into that step. Partial-done rule stays. Done: flow works end to end, summary reflects data, QA verified.
- [ ] T12 Urge overlay: floating button on every tab opens a full-screen overlay (close control top right). Idle state: kind picker, trigger field, Start 10 minutes. Running state: countdown, Rode it out (unlocks at end), Gave in, the wait-it-out line. Below: this week's tally and the last five urges. While running, the floating button shows "Riding it out · mm:ss" live and tapping it reopens the overlay. Remove the old bottom sheet and the "Riding it out" card from Day. Done: QA scenario 8 rewritten and passing.
- [ ] T13 Setup checklist: stays as the top card on Day until dismissed; after dismissal it appears in More as a "Getting set up" section so the instructions remain reachable. Done: both states verified.
- [ ] T14 Tab bar icons: simple inline SVG outlines for the four tabs above their labels, current tab in accent. Done: renders in light and dark.
- [ ] T15 Update TESTING.md scenarios to the new structure (tabs, night flow, urge overlay) so QA can run them. Done: doc updated alongside the code.

## Next

- [ ] T7 Week view: month strip or simple list of past weeks for scrolling back further than one tap at a time.
- [ ] T8 Journal tab: every one-sentence entry in reverse order, searchable.
- [ ] T9 Optional PIN gate with WebCrypto encryption of the stored blob. Off by default, because a forgotten PIN means data loss.

## Later (only after a week of real use)

- Per-lapse trigger word cloud in week view.
- Gym log with type or duration.
- Weekly review prompt on Sunday afternoon with three reflection questions.

## Done

- [x] T1 Split pure logic into logic.js (browser global + node require).
- [x] T2 Unit tests under tests/ with node --test (20 tests).
- [x] T3 First-run setup checklist card on Day, persisted per item.
- [x] T4 Hide Download in iOS standalone mode; Share first.
- [x] T5 Night card counts as done on any partial input.
- [x] T6 Optional Shortcuts timer links behind a setting.
- [x] v1 scaffold: Today, Week, More screens; urge flow; wind-down timer; localStorage + IndexedDB mirror + snapshots; export via Share/Copy/Download; import merge; PWA manifest, service worker, icons.
