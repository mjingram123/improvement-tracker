# Improvement Tracker: design handoff

Paste this into Claude Design. It describes a working app that needs a real visual design and a
new tab structure. The code exists; the design is what is missing.

## Principles this design follows

Full sourcing and reasoning for each of these lives in DESIGN-PRINCIPLES.md. None of them
override the non-negotiables below; several exist specifically to protect them.

- Tap targets are 44×44pt minimum, even for small controls like check circles and day chips
  ([Apple HIG, Layout](https://developer.apple.com/design/human-interface-guidelines/layout)).
- Safe-area insets pair with `viewport-fit=cover`, never one without the other
  ([WebKit, Designing for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)).
- Text and its background meet 4.5:1 contrast at normal sizes, in both themes
  ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
- Every field has a real, persistent label; placeholder text is an example, never the only label
  ([NN/g, mobile input checklist](https://www.nngroup.com/articles/mobile-input-checklist/)).
- A multi-step flow shows its step count as text, not just dots
  ([NN/g, progress indicators](https://www.nngroup.com/articles/progress-indicators/)).
- Restore/merge explains the safety rule up front so the fear of data loss never has to become
  an error message ([NN/g, error prevention](https://www.nngroup.com/articles/ten-usability-heuristics/)).
- The end of the Night flow is the peak-end moment of the day; it closes on one calm, plain
  line, never praise or an exclamation point
  ([Laws of UX, Peak-End Rule](https://lawsofux.com/peak-end-rule/)).
- The "days since last slip" line stays the same neutral, muted style no matter what the number
  is. It must never read as a streak at risk (habit-app streak-shame critique, see
  DESIGN-PRINCIPLES.md #28).
- A quiet "done" state (color + check + label) is the whole celebration; that already satisfies
  Fogg's Tiny Habits call for an immediate small reward without adding gamification (BJ Fogg,
  [behaviormodel.org](https://www.behaviormodel.org/)).
- Charts stay single-metric per view: one sparkline, simple bars, no dual axes, no combined
  streak-and-rating chart (Tufte-style small-multiples practice).
- Motion respects `prefers-reduced-motion` and never exceeds 200ms.

## Reference

Base the look on the app **Smata** (Michael will add a link or screenshots here). Match its
overall feel: type scale, spacing, card treatment, color temperature, how it handles done states.
Do not copy its branding.

## What the app is

A private, on-device habit and reflection tracker that lives on an iPhone home screen as a web
app. One person uses it. Two check-ins a day, a panic button for urges, and a weekly review.
There is no account, no sync, no notifications, and no social layer. It should feel like a calm
personal notebook, not a productivity dashboard.

## Non-negotiables

- **No shame.** Slips are shown as rates with a last-week comparison, never as streaks that
  reset. Never use red for a slip. Use a warm neutral or muted amber at most. Wins (urges
  ridden out) are visually stronger than slips.
- **Calm over gamified.** No confetti, no badges, no fire emoji. A quiet "done" state is the
  reward.
- **Fast.** The night check-in must be finishable in under 60 seconds with one thumb. Big
  targets (44pt minimum), one decision per row, nothing that needs precision.
- **Private.** Nothing in the design should suggest sharing, exporting to a service, or accounts.
- **Fits one screen per tab.** Each tab should show its whole job without scrolling on a
  375x812 phone where possible. Nothing important should live below the fold.
- **Light and dark.** Both, with system preference. Dark is a real palette, not an inversion.

## Structure: four bottom tabs plus a floating urge button

Today it is three tabs with a long scrolling Today screen. Change to:

1. **Day** — morning routine and today's commitments.
2. **Week** — rates, mindset trend, journal.
3. **Night** — the evening check-in, as a short step-by-step flow, then a summary.
4. **More** — backup, restore, schedule settings, storage health, setup checklist.

Plus a **floating urge button** pinned above the tab bar on every tab. Michael likes it and it
stays. Tapping it opens the Urge screen as a full-screen overlay with its own close control. It
is not a tab. While a 10 minute timer runs, the button itself shows the live countdown
("Riding it out · 07:32") so the state is visible from anywhere, and tapping it returns to
the running screen.

### Day tab

- Header: weekday and date, small label "morning" or "evening".
- Row: **Stretched** (toggle).
- Row (Fri, Sat, Sun only): **Hungover?** (toggle). When on, four sub-rows with checks:
  LMNT, Food, Ibuprofen, Walk.
- Section **Commitments**: rows with check circles. Water polo (Tue, Sun), Dinner out (Sun),
  Gym (every day, hint "log it when it happens"). The check circle can look small, but its tap
  target is 44×44pt: pad the hit area, don't grow the glyph.
- Done state: the card gets a quiet "done" mark when stretched and the hangover kit (if any)
  is complete.

### Night tab

Runs as a flow with a step indicator (4 dots plus a text caption, "Step 2 of 4"; dots alone
don't give a time estimate and aren't reliably read by VoiceOver), a Next button, and a Skip on
every step. When finished, or if reopened later, it shows a summary card with everything
editable in place.

1. **Wind-down.** One large button "Start 15:00". While running: big mono countdown and Cancel.
   Done: a check and "15 minutes, done". Hint text: "phone down, wash up, mouth tape".
2. **Slips.** Three toggles: "Scrolled past limits", "Porn", "Nagged someone" (hint: "cars,
   dishes, whatever"). Turning one on reveals a single-line field. Put the question, "What was
   happening right before?", in a small visible label above the field, not just as placeholder
   text, so it stays readable once he starts typing.
3. **How I showed up.** Four rows, each with a 1 to 5 segmented picker:
   "Curious in conversation", "Stayed in my story, detached from outcomes",
   "Pushed through pauses", "Committed to where I was". Tapping the selected number clears it.
4. **One sentence.** A single text area with a small visible label "Reflection" above it;
   placeholder becomes example text, "About today."

Partial completion counts as done. The summary shows what was filled and greys what was
skipped without nagging, then ends on one calm, plainly-worded line. No praise, no exclamation
point. For example: "Logged for Tue, Sep 8." That line is the last thing Michael sees each
night, so it stays quiet.

### Urge screen (overlay opened by the floating button)

- Opens directly to the question, no second button to tap.
- It asks two things on the same screen: which pull (segmented: Scrolling / Porn) and a
  short trigger field with a small visible label "Trigger" above it (placeholder becomes the
  example, "two words: bored, tired, alone"), then **Start 10 minutes**. Two related choices
  on one screen is deliberate here. Splitting this into two screens would cost more speed than
  it buys in simplicity for a task that needs to take seconds.
- While running: big countdown, the trigger text, a disabled **Rode it out** button that
  unlocks when the timer ends, and an always-available **Gave in** button. Line under it:
  "Wait it out. Rode it out unlocks when the timer ends."
- Below: this week's tally, "3 rode · 1 gave in", and the last few urges as a compact list
  (time, kind, trigger, outcome).
- The floating button carries the running state on every tab, so no tab indicator is needed.

### Week tab

- Week navigator: previous, "Sep 8 – Sep 14", next (disabled on current week).
- **Slips** card: for each of the three slips, "2 of 5 days" with a thin progress bar and
  "last week 4 of 7" underneath. Then "Urges ridden out: 3 rode · 1 gave in". A small muted
  line: "Last porn slip logged 12 days ago." or "No porn slips logged yet." This line always
  uses the same neutral, muted style no matter what the number is. A big number must not look
  like a streak worth protecting, and a small number must not look alarming or red.
- **How I showed up** card: a single-hue sparkline of the daily average rating for Mon to Sun,
  with the value under each day, then the four dimensions with this week's average and last
  week's.
- **Routines** card: Stretched n of m, Wind-down done n of m, Gym count, Water polo n of m,
  Dinner out n of m.
- **Journal** card: newest first, date line, the sentence, and any slip notes as
  "before scrolling: ...".
- A soft banner when there has been no backup in 7+ days.

### More tab

- **Backup**: explanation line, "Last backup" and "Days logged", buttons Share file, Copy text,
  Download file (hidden on iOS home screen).
- **Restore**: choose file, or paste text, Merge. Line: "Newer entries win, nothing is deleted."
- **Storage health**: three status rows.
- **Schedule**: day chips for hangover prompt days, water polo days, dinner out days; a
  "Day ends at" selector (midnight to 6 am, default 4 am).
- **Reminders**: text explaining the two Shortcuts automations. Toggle "Use Shortcuts timers".
- **Getting set up** checklist (three items) lives here after first launch. On first launch it
  can appear as a full-screen welcome instead.

## Components to design

Toggle, check circle, 1 to 5 segmented rating, large countdown, primary and secondary button,
progress bar (thin, rounded), sparkline with day labels, card with done state, step indicator
(dots plus "Step X of 4" text), bottom tab bar (4 items with outline icons), floating urge
button (idle and running states), banner (soft warning and soft success), toast, bottom sheet,
day chips, text field and text area with a persistent visible label above (16px font so iOS
does not zoom; placeholder is example text, never the only label).

Tap targets on check circle, rating buttons, day chips, and week-nav arrows are 44×44pt
minimum. Pad the hit area rather than enlarging the visible glyph. Any warn-colored text
(banner text, the "Gave in" button) must hit at least 4.5:1 contrast against its background in
both light and dark. Check this explicitly: the current draft palette is close but under in
light mode.

## Platform facts

- iPhone, 375 to 430 wide, home-screen web app (no browser chrome, safe areas top and bottom).
- Everything is plain HTML and CSS, no framework. Design tokens should come back as CSS
  variables so they drop straight into the existing stylesheet. Current names:
  --bg, --card, --card2, --text, --muted, --border, --accent, --accent-ink, --accent-soft,
  --warn, --warn-soft, --radius.
- System font stack is fine. If a display face is used it must be a Google Font with a
  fallback.
- Minimum tap target 44pt. No hover states matter. No animation longer than 200ms, and
  transitions should respect `prefers-reduced-motion` where the OS setting is on.

## Deliverables wanted

1. All four tabs plus the Urge overlay in light and dark, including the Night flow steps and the Urge running state, and the floating button in both states.
2. A component sheet with states (default, selected, disabled, done).
3. Tokens: colors (light and dark), type scale, spacing scale, radii, as CSS variables.
4. Tab bar icons as simple SVG outlines.
