# UX walkthrough notes

Tested at 375x812 against localhost:8765, light and dark. Data seeded and cleared via localStorage/IndexedDB on the icon.svg page, never by editing app code.

## Walkthrough 1: first run, clean slate

The app opened straight into the Night flow, step 1 of 4, "Wind-down," because the real clock was after 3pm. There is no app name, logo, tagline, or single sentence anywhere explaining what the app is for. The only clues to its actual purpose are the Night step 2 toggles ("Scrolled past limits," "Porn," "Nagged someone") and the Day tab's "Getting set up" card. A first-time user sees "phone down, wash up, mouth tape" with zero framing. The setup checklist (Add to Home Screen, Turn on nudges, First backup) covers installation mechanics well but never says what the app tracks or why. The first thing a new user would want is to understand the app's purpose, and they cannot from this screen.

The Day tab is calmer: a single "Stretched" toggle immediately produces a green-bordered card and a "Morning done" line, fast and satisfying. Commitments (Gym, and Water polo since it was Tuesday) sit below in an unlabeled list card with no explanation of what "commitments" means as a concept.

The Night flow itself is well-built: Next and Skip both advance, tapping a step dot jumps directly there, and the wind-down timer keeps running in the background while you move to other steps. Skipping every step (four taps) still lands cleanly on a summary reading "Skipped" or "None" per section instead of getting stuck.

Tap counts, clean slate:
- Day morning routine (toggle Stretched only): 1 tap to reach "Morning done."
- Full Night check-in done for real (start wind-down, toggle one slip and answer its follow-up, rate all four dimensions, write one sentence, tap Done): 12 taps, two of which are just focusing a text field.
- Night check-in skipped entirely: 4 taps, reaches a mostly empty summary.
- Urge flow, ask to outcome (open overlay, pick Scrolling/Porn, tap trigger field, Start 10 minutes, then Rode it out or Gave in): 5 taps. Actually riding it out means a mandatory 10 real minutes of waiting, unlike the wind-down timer which can run in the background while you do other steps.

## Walkthrough 2: returning user after three weeks

I seeded 21 days (18 logged, 3 skipped) with mixed slips, ratings 2-5, ten urges with both outcomes and varied triggers, gym/water polo checks, and one long reflection, then paged through the current week and two prior weeks.

What the app told me back: this week's slip rate ("1 of 2" days) with a same-number comparison to last week, a green sparkline of daily "how I showed up" averages with gaps on unrated days, four averaged self-report dimensions with a one-week-back comparison, routine completion counts, and a reverse-chronological journal that folds in slip notes even on days with no written sentence. The color language (blue for progress, green for done, amber only for "gave in") stays calm and consistent across all three weeks.

What I could not see: any trend beyond "this week vs. last week." There is no month-long or all-time view of rating trends, streaks, or slip frequency, so a real three-week arc (a rough patch followed by recovery, which I built into the seed data) is invisible unless you manually flip through weeks and remember what you saw. There is no aggregation of triggers at all: ten urges carried five distinct triggers and nothing counts or ranks them, so "bored" being the most common one is visible only by rereading the raw log by hand. There is no time-of-day view of urges either, even though each urge has a full timestamp; the last-four list in the Urge overlay shows only clock time, not date, so a pattern like "urges cluster after 10pm" never surfaces. There is no day-of-week clustering of slips, and no single streak-free "how am I doing" summary; you read four separate cards and synthesize it yourself.

Two number-without-context problems: "Gym" in the Routines card shows a bare integer ("4") while every sibling row ("Stretched," "Wind-down done," "Water polo") shows "X of Y," so Gym looks less informative for no clear reason. Separately, "Last porn slip logged N days ago" inside the Slips card never changes as you page between weeks; it is always relative to today, not the week on screen, which is disorienting when reviewing history.

Empty states found: a dash under sparkline days with no rating, "Nothing written yet" for an empty journal, and "No porn slips logged yet" when nothing of that kind is logged. All handled gently, never red or shaming.

## Walkthrough 3: hard night at 1:30am

I could not move the real system clock, so I overrode `Date` inside the loaded page (a page-local patch, not a file edit) to simulate 1:30am and drove the UI normally; this tests the actual rollover and attribution logic, not the boot-time tab selection, which I could not exercise live.

At 1:30am, the Day tab still read "Tue, Sep 22," correctly rolled back one day under the 4am cutoff, confirmed against the day key the app was writing to. Opening the Urge overlay, picking Porn, typing a trigger, starting the 10-minute timer, and tapping "Gave in" produced the same neutral toast seen elsewhere ("Logged."), no red, no scolding copy. The logged urge's timestamp attributed correctly to Sep 22, matching the rollover rule.

One real gap: giving in to an urge does not touch the Night flow's "Porn" slip toggle for that day. They are two separate records. At 1:30am, having just given in, a person is unlikely to also remember to open Night, edit Slips, and toggle Porn on, so the day's slip count and the week's slip rate can silently undercount what actually happened. Nothing connects the two.

There is a path to reflect: the Night summary's "One sentence" row has an Edit link right there, two taps away. Nothing about the flow is shaming; the amber "Gave in" button and neutral toast are the extent of the reaction.

The next morning (clock moved to 9am), the Day tab showed a plain fresh "Wed, Sep 23" with nothing referencing the prior night: no recap, no acknowledgment, no link back. This is ambiguous rather than wrong: it could read as respectfully not dwelling on a slip, or as a missed chance to check in gently.

## Confusing or missing moments

1. **No explanation of app purpose anywhere on first open.** Should fix. Add one line of framing, even in the setup checklist or a first-run banner.
2. **Gym routine count shown without a denominator** while sibling rows show "X of Y." Nit. Show "4 of 7" like the others.
3. **"Last porn slip logged N days ago" is not scoped to the week being viewed.** Should fix. Move it out of the week card or label it as a global stat.
4. **Giving in to an urge does not flag the matching Night slip toggle.** Should fix. At minimum offer to toggle it, since the two counts otherwise drift apart.
5. **No trigger frequency, time-of-day, or day-of-week aggregation anywhere**, despite the data existing. Should fix; this is the app's stated point, showing patterns you can't see yourself.
6. **Single-line placeholder text truncates without ellipsis** in the Intentions fields at larger text sizes. Nit.
7. **Copy text failed to a plain error toast** in this in-app browser; Share has no Web Share API here so it should fall back to Download, but a download could not be visually confirmed. Likely an environment limitation, worth a recheck on a real phone.
8. No overlaps found at 120 percent root font size on any screen tested (Day, Night summary, Week, More, Urge overlay). Dark mode was legible and correctly themed, not a simple inversion, on every screen checked.

## Live vs. local parity

`curl`'d `app.js`, `logic.js`, `index.html`, and `app.css` from `http://localhost:8765` and `https://mjingram123.github.io/improvement-tracker/`. All four files are byte-identical, zero diff lines. The live site currently serves exactly what is in this working tree.
