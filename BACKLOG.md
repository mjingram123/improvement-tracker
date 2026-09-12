# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now

(empty; next tickets come from Michael's real-use feedback and the Smata design pass)

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
