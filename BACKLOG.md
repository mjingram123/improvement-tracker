# Backlog

Ordered. Top is next. Each ticket has a done condition. Bugs from QA go to the top.

## Now

- [ ] T1 Split pure logic out of app.js into logic.js (dates, week stats, normalize, mergeImport, backupDue). logic.js must work both as a browser script (window.ITLogic) and under node `require`. app.js uses it. Done: app behaves identically, `node -e "require('./logic.js')"` works.
- [ ] T2 Unit tests in tests/*.test.js using `node --test`. Cover: todayKey rollover at 4am, weekStart Monday, urgeDayKey, weekStats counts and averages with gaps, normalize on junk input, mergeImport newer-wins and no-delete, backupDue. Done: `node --test tests/` green.
- [ ] T3 First-run checklist card on Today (dismissable, persisted in settings.onboarded): add to home screen, set two Shortcuts automations (9:00 and 22:00, "Open App"), make first backup. Copy must not mention scrolling or porn. Done: shows once, dismisses, never returns.
- [ ] T4 iOS standalone fixes: hide Download when `navigator.standalone` is true; Share is first; Copy second. Done: verified by code review plus QA check of the non-standalone path.
- [ ] T5 Night card completion rule: counts as done when wind-down is done OR any rating OR a sentence, so partial check-ins still feel finished. Done: badge logic updated, QA verified.
- [ ] T6 Timers never claim to alarm. Add a small "Start iPhone timer" link next to wind-down and urge timers that opens `shortcuts://run-shortcut?name=Wind%20Down` / `Ride%20It%20Out`, shown only if settings.useShortcutTimers is on, with a help line in More. Done: link renders, setting toggles it.

## Next

- [ ] T7 Week view: month strip or simple list of past weeks for scrolling back further than one tap at a time.
- [ ] T8 Journal tab: every one-sentence entry in reverse order, searchable.
- [ ] T9 Optional PIN gate with WebCrypto encryption of the stored blob. Off by default, because a forgotten PIN means data loss.

## Later (only after a week of real use)

- Per-lapse trigger word cloud in week view.
- Gym log with type or duration.
- Weekly review prompt on Sunday afternoon with three reflection questions.

## Done

- v1 scaffold: Today, Week, More screens; urge flow; wind-down timer; localStorage + IndexedDB mirror + snapshots; export via Share/Copy/Download; import merge; PWA manifest, service worker, icons.
