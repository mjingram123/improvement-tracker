# Improvement Tracker: engineering review

Read PLAN.md, TESTING.md, index.html, app.js, logic.js, sw.js, manifest.webmanifest, tests/logic.test.js in full. Verified specific claims with `node --test` and small node scripts against logic.js; items I could not run (iOS-only behavior) are marked unverified.

## 1. Data loss and corruption

**CRITICAL. Two open instances silently clobber each other.** `app.js:43,134-145`. `state` is a plain in-memory object per page; `save()` does `localStorage.setItem(LS_KEY, JSON.stringify(state))`, a full overwrite, not a merge. If Safari and the home-screen app are open at once (same origin, same localStorage), each holds its own copy; whichever calls `save()` last wins and the other tab's edits vanish with no warning. Fix: listen for the `storage` event and warn or refuse to save when another tab has written since this page loaded, or serialize writes with a BroadcastChannel lock.

**HIGH. `mergeInto` never updates a known urge, only adds new ids.** `logic.js:162-163`. Verified in node: merging an incoming urge with `outcome:'gave'` into local state that already has the same id with `outcome:null` gives `urgesMerged: 0` and the local urge stays unresolved forever. Fix: when ids match, take the incoming record if the local one lacks an outcome the incoming one has.

**HIGH. Storage write failures are invisible.** `app.js:134-155`. `save()` and `mirror()` catch quota/availability errors and only set a status dot under More > Storage health; no toast fires. A user can keep entering data for days while nothing persists and never know. Fix: toast immediately on a caught write failure.

**HIGH, partly unverified. `pagehide` mirror flush can be cut off.** `app.js:791`. The synchronous `localStorage.setItem` in `save()` completes before the handler returns, but the IndexedDB mirror it also fires is async; if iOS reclaims the page immediately after the handler, the IDB write may not finish. If localStorage is later cleared (ITP, reinstall), restore falls back to a mirror that is missing the last edits. Cannot verify iOS teardown timing without a device. Fix: make mirroring more frequent/eager (e.g. on `visibilitychange` hidden) rather than relying on the pagehide-time write.

**MEDIUM. `normalize()` corrupts on wrong-typed nested fields.** `logic.js:104-108`. Verified in node: `normalize({days:{'2026-09-07':{hangover:'oops'}}})` yields `hangover:{0:'o',1:'o',2:'p',3:'s',lmnt:false,...}` because a truthy string spreads by index. Fix: guard each nested spread with an object-type check before spreading.

**LOW. Restore-candidate tie-break is untested and array-order dependent.** `app.js:118-126`. If localStorage, previous-save, and the IDB mirror all report the same `meta.updatedAt`, the pick is decided by initial array order, not an explicit rule. Fix: move this into logic.js as a pure function with a tie-break test.

## 2. Time and date bugs

**MEDIUM, partly unverified. Night step 1 completeness lives only in sessionStorage.** `logic.js:190-201`, `app.js` `NIGHT_UI_KEY`. "Slips" is marked done via a `visited` flag in sessionStorage because "no slips" cannot be distinguished from "not answered." iOS can kill a backgrounded PWA process under memory pressure; on relaunch sessionStorage is gone, so the flow re-asks a step the user already answered even though the underlying data is intact. TESTING.md #11 assumes only a new day resets progress; process eviction is a second, untested reset trigger. Fix: store the visited flags on the day object in `state` instead of sessionStorage.

**LOW. Snapshot key uses wall-clock date, not the app's rollover-aware day.** `app.js:148`. `snap:${keyOf(new Date())}` uses real calendar date while everything else uses `todayKeyFor` with the 4am rollover. A 1am save (still "yesterday" to the app) is filed under tomorrow's snapshot key. Fix: use `todayKeyFor(new Date(), state.settings.rolloverHour)`.

**LOW. `endsAt` representation is inconsistent.** `app.js:702` (wind-down, epoch ms) vs `app.js:722` (urge, ISO string). Each is read back correctly today, no bug found, but this is exactly the kind of inconsistency that breaks the next feature that treats timers generically. Fix: standardize on epoch ms.

**Verified safe.** `addDays`, `todayKeyFor`, and `weekStart` use local-midnight `Date` objects. Checked in node against the 2026-03-08 spring-forward and 2026-11-01 fall-back transitions in `America/Los_Angeles`; day-key arithmetic was unaffected in both directions.

## 3. iOS home-screen PWA specifics

**MEDIUM. Offline fallback serves index.html for any missing GET, not just navigations.** `sw.js:15-23`. The catch-all `caches.match(e.request).then(hit => hit || caches.match('./index.html'))` applies to every GET, including scripts and images. If a file is added to the app but missed in `SHELL` and the SW hasn't updated yet, requesting it while offline returns the HTML shell body typed as that asset instead of a clean failure. Fix: only fall back to `index.html` when `e.request.mode === 'navigate'`.

**MEDIUM, unverified (no device).** `navigator.storage.persist()` (`app.js:127`) is called and its result shown in More, but WebKit's Storage API support is inconsistent; a "granted" or "not granted" status may not reliably reflect whether iOS's 7-day script-writable-storage eviction can still wipe the origin. This is the exact risk PLAN.md pre-mortem item 3 calls out; it is mitigated by the IDB mirror but not eliminated.

**LOW.** `standalone` detection only checks `navigator.standalone` (`app.js:503`), which is correct for iOS Safari (the only target per PLAN.md) but would not hide Download on an Android home-screen install if one were ever added.

## 4. Security and privacy

**Verified, no issue found.** Every place user text (note, lapse notes, trigger, ntfy topic, intentions) reaches `innerHTML` passes through `esc()`. No unescaped-injection path found in app.js.

**Verified, no issue found.** The only network calls are to `https://ntfy.sh/<topic>`, and only when `ntfyTopic`/`ntfyTimers` are set (`app.js:191-210`). Fonts and icons are served locally. No analytics or other third-party requests.

**LOW.** The ntfy topic is sent verbatim in the request path. Message bodies stay generic ("Time.", "Nudges are connected."), but a descriptive topic name is itself a guessable public channel on ntfy.sh. Fix: encourage a random suffix in the Reminders copy (the placeholder already hints at this).

## 5. Test coverage gaps

- `lastLapse`, `mmss`, `fmtLong`, `fmtShort` have no direct tests. `mmss`'s negative-ms clamp and `Math.ceil` rounding are untested and relevant to tick-drift after backgrounding.
- No test locks in `mergeInto`'s urge-outcome gap (finding above); add one that currently fails or documents current (wrong) behavior.
- No DST-crossing test exists despite this being an explicit review area; the manual check above should be captured as a permanent test.
- Logic that should move from app.js into logic.js to become testable: the restore-candidate pick in `loadState` (`app.js:118-126`), the snapshot-key day computation (`app.js:148`), and the wind-down/summary text derivation in `renderNightSummary` (`app.js:373-378`, currently inline string logic with no tests).

## 6. Code health

- **Dead code, verified by grep.** `night-back` (`app.js:713`) and `winddown-reset` (`app.js:704`) click-handler cases have no matching `data-action` anywhere in any render function; both are unreachable.
- **Duplication.** `parseSafe` exists identically in `logic.js:148` and `app.js:106`; `allWeekKeys` (`logic.js:59`) is not exported, so `app.js:33` reimplements it as `weekKeys`. Export both from logic.js and delete the app.js copies.
- **Duplication.** Ring elapsed/dashoffset math is implemented twice: once in the `ring()` template (`app.js:232-246`) and again in `updateRing()` (`app.js:654-664`). A future formula change must be made in both places.
- **LOW, render performance.** `render()` replaces `view.innerHTML` wholesale on every tap (`app.js:636-645`). Fine at current scale; will start costing focus/scroll state as more controls are added per screen.

## Prioritized fix list

1. Fix concurrent-tab overwrite (cross-tab merge or lock).
2. Fix `mergeInto` to update an urge's outcome when the incoming record has one and the local one does not.
3. Toast on localStorage/IndexedDB write failure instead of only a hidden status dot.
4. Move night-flow `visited` tracking off sessionStorage onto the day object.
5. Make the IDB mirror flush more eagerly (e.g. on hide), not just on pagehide.
6. Guard `normalize()`'s nested-object spreads against wrong-typed input.
7. Scope the service worker's index.html fallback to navigation requests only.
8. Use `todayKeyFor` (not wall-clock date) for the snapshot key.
9. Remove dead `night-back` and `winddown-reset` cases.
10. Deduplicate `parseSafe` and `allWeekKeys`/`weekKeys` into logic.js.
11. Standardize `endsAt` on one representation (epoch ms) across wind-down and urges.
12. Add a caveat in Reminders copy about ntfy topic names being guessable.

## Proposed tests

- `mergeInto`: incoming urge has an outcome the local urge (same id) lacks; assert it is applied.
- `normalize`: nested field (`hangover`, `lapses`, `ratings`, `windDown`) given a non-object value; assert it falls back to the default shape.
- `mmss`: negative ms clamps to `00:00`; a value just under a whole second rounds up via `Math.ceil`.
- `todayKeyFor`/`addDays`/`weekStart` across the 2026-03-08 and 2026-11-01 US DST transitions.
- `lastLapse`: no matching days returns null; multiple matching days returns the latest key.
- A pure `pickBestState(candidates)` extracted from `loadState`, covering an exact `updatedAt` tie.
