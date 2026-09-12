# QA scenario pass

Run at 375x812 in the in-app browser against http://localhost:8765/ (main branch, `python3 -m http.server 8765 --directory improvement-tracker` from the sandbox root, or the "improve" preview).
Before each pass: clear site data (localStorage, IndexedDB) unless the scenario says otherwise. Report each as PASS or FAIL with steps and a screenshot on FAIL.

1. Fresh load: no console errors, Today shows today's date, evening/morning label matches clock, urge button visible, tabs work.
2. Toggle Stretched on, reload: stays on. Morning card shows "done" badge when stretched and not hungover.
3. Hungover toggle appears only on Fri/Sat/Sun (fake the date by setting settings.hangoverDays in localStorage if needed). Turning it on reveals 4 checks; turning it off clears them.
4. Slip toggle on reveals the "what was happening right before" field; typing persists after reload; toggle off hides it.
5. Ratings: tap 3 selects it, tap 3 again clears, tap 5 switches. Persist across reload.
6. One sentence persists across reload and shows in Week > Journal.
7. Wind-down: Start shows 15:00 counting down; Cancel returns to Start; forcing endsAt into the past (via localStorage) marks done on next tick and shows "done" with a reset check.
8. Urge flow: button opens sheet, kind selection toggles, Start creates a "Riding it out" card with 10:00 countdown, "Rode it out" is disabled until timer ends, "Gave in" works immediately. Forcing endsAt into the past enables "Rode it out". Urge button label changes while pending.
9. Week: rates show "n of m" with m = days elapsed this week; last week comparison appears when last week has data; sparkline renders with gaps for missing days; Journal lists sentences and slip notes; prev/next week nav works and next is disabled on the current week.
10. More > Backup: Copy puts JSON on the clipboard and updates "Last backup"; Download triggers a file; Share falls back to Download when unsupported.
11. Restore: paste an export into the textarea and Merge; counts match; existing newer days are not overwritten; junk text shows the error toast.
12. Failsafe: delete only the localStorage keys, reload: data comes back from the IndexedDB mirror and the green banner says so.
13. Day rollover: with the clock between midnight and 4am (simulate by calling logic with a fixed date in tests), todayKey is yesterday.
14. Layout: no horizontal scroll, urge button never covers the last input when the keyboard is closed, dark mode readable.
