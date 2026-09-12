# Handoff: Improvement Tracker — visual redesign + 4-tab structure

## Overview
Visual design and tab restructure for Improvement Tracker, a private on-device habit and reflection tracker running as an iPhone home-screen web app (plain HTML/CSS/JS, no framework). This package covers all four tabs, the Urge overlay, the Night flow, the floating urge button, tokens, and tab bar icons. The functional spec (what each screen does) is in `DESIGN-HANDOFF.md` and `DESIGN-PRINCIPLES.md`, included here; this README covers how it looks and behaves.

## About the design files
`Improvement Tracker.dc.html` is a **design reference built in HTML** — a tappable prototype showing intended look and behavior. It is not production code. Recreate it in the existing app (`index.html`, `app.js`, `app.css`) using its current patterns. The prototype's inline styles are a spec, not a stylesheet to copy; move values into the CSS variables below.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and states are final. Match them exactly. Layout is fluid inside 375–430px; the prototype is shown at 390×844.

## Color system (the rule that drives everything)
- **Green = doing and done.** Primary action buttons (Start 15:00, Start 10 minutes, Next, Done, Share file, Rode it out), toggles when on, check circles, kit chips when on, rating picks, done marks and borders, the sparkline, "rode" outcomes, status dots.
- **Blue = navigation and progress.** Active tab pill, step-indicator dots, floating urge button (idle text/border; running fill), the Scrolling/Porn segmented picker, slip progress bars, the backup banner, storage/setup neutral chrome.
- **Blue→green gradient only on the two timer rings** (urge 10:00, wind-down 15:00). Nowhere else.
- **Amber (`--warn`) only for "Gave in"** (button and log outcome). Never red anywhere. Slips are never colored as failure.
- Background is a faint vertical wash from blue-tinted (top) to green-tinted (bottom). Cards are flat white on it.

## Design tokens (CSS variables)

### Light
```css
--bg: #f3f6f5;
--bgwash: linear-gradient(180deg,#e9f2fc 0%,#f3f6f5 45%,#eaf7ec 100%);
--card: #ffffff;
--card2: #eaf0ee;          /* secondary buttons, track fills, ring background */
--text: #1a2530;
--muted: #5c6b72;          /* 5.3:1 on --card */
--border: #d9e2e4;
--accent: #3aad3f;         /* green, primary actions */
--accent-700: #2a7f2e;     /* green text on light grounds, 5.0:1 on white */
--accent-ink: #ffffff;
--accent-soft: #ddf3dd;
--blue: #3d9cf0;
--blue-700: #1c6fc4;       /* blue text on light grounds, 5.1:1 on white */
--blue-soft: #dfeffd;
--green: #3aad3f;  --green-700: #2a7f2e;  --green-soft: #ddf3dd;   /* aliases of accent, kept so intent reads in code */
--warn: #8a5a2e;           /* 5.0:1 on --warn-soft */
--warn-soft: #f5ebdf;
--bar: rgba(243,246,245,.88);   /* tab bar, behind blur */
--shadow: 0 1px 2px rgba(26,37,48,.04), 0 6px 20px rgba(26,37,48,.06);
--radius: 24px;
```

### Dark (a real palette, not an inversion)
```css
--bg: #111619;
--bgwash: linear-gradient(180deg,#0f1a26 0%,#111619 45%,#101d13 100%);
--card: #1a2126;
--card2: #242d33;
--text: #e6ecef;
--muted: #98a6ad;
--border: #2b353b;
--accent: #57c95c;  --accent-700: #8fdc92;  --accent-ink: #0a1f0c;  --accent-soft: #1a3a1e;
--blue: #6fb8f7;    --blue-700: #9ccdfa;    --blue-soft: #1a3350;
--green: #57c95c;   --green-700: #8fdc92;   --green-soft: #1a3a1e;
--warn: #e3b98a;    --warn-soft: #3a2d1f;   /* 5.9:1 */
--bar: rgba(17,22,25,.88);
--shadow: 0 1px 2px rgba(0,0,0,.2), 0 6px 20px rgba(0,0,0,.25);
--radius: 24px;
```
Switch on `prefers-color-scheme: dark`. Gradient stop colors for the timer ring are fixed: `#3d9cf0 → #3aad3f` (top to bottom) in both themes.

White text on `--accent` / `--blue` fills is used only at ≥16px semibold (3:1 large-text threshold is met: green 3.0:1, blue 3.0:1). Body-size colored text always uses the `-700` step.

### Type
- Display: **Outfit** (Google Font, weights 500/600), fallback `sans-serif`. Used for screen titles, card titles, week label, and the labels inside the large pill buttons.
- Body: system stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`.
- Countdowns: `ui-monospace, SFMono-Regular, Menlo, monospace`.

| Role | Size / weight / line-height |
|---|---|
| Screen title (Friday, Sep 11 / Wind-down / More) | Outfit 30px / 600 / 1.15 |
| Week label | Outfit 22px / 600 |
| Card title | Outfit 18px / 600 |
| Large pill button label | Outfit 18–20px / 600 |
| Row label | 17px / 500 |
| Body row / stat | 15px / 400–500 |
| Field label, hints, meta, step caption | 13px / 500, `--muted` |
| Section kicker (COMMITMENTS, summary titles) | 12–13px / 500, uppercase, letter-spacing .04em, `--muted` |
| Tab label | 11px / 500 (600 active) |
| Urge ring countdown | mono 54px / 500 |
| Wind-down ring countdown | mono 48px / 500 |
| Toast | 14px / 500 |

Inputs and textareas are 16px so iOS does not zoom.

### Spacing & shape
- Screen side padding 20px. Top content offset 64px (below status bar). Bottom padding 172px (clears floating button + tab bar).
- Card: `--card`, radius `--radius` (24px), `--shadow`, inner padding 18px (list cards: 6px 18px so rows carry their own height).
- Row: min-height 56px, label left, control right, 12px gap.
- Card-to-card gap 14px; section gap 18px.
- Buttons: fully rounded (radius = half height). Primary 56–64px tall; secondary 44px; text buttons 44px.
- Fields: 1.5px `--border`, radius 16–18px, min-height 48–52px, padding 0 14–16px, background `--bg` inside a card (or `--card` on the Urge screen).
- Every tap target ≥ 44×44. Check circle glyph 26px inside a 44×44 hit box; kit chip dot 22px inside a 44px-tall chip; day chip glyph 36px inside a 44×44 button; week-nav arrows 44×44; rating buttons 44px tall, equal-width flex.

### Motion
All transitions 150–200ms (`background`, `left` on the toggle knob, `width` on step dots/progress bars, `border-color`, `opacity`). Ring `stroke-dashoffset` transitions 1s linear per tick. Wrap all of it in `@media (prefers-reduced-motion: reduce) { * { transition: none !important } }`.

## Components

**Toggle** — track 51×31, radius 16, `--border` off / `--green` on; knob 27px white circle, `0 2px 4px rgba(0,0,0,.18)`, left 2 → 22. Whole row is the button (`aria-pressed`).

**Check circle** — 26px circle, 2px `--border`; on: `--green` fill and border, white 3px check. Row label turns `--muted` with line-through when checked. Hit box 44×44 padded, glyph unchanged.

**Kit chip** (LMNT / Food / Ibuprofen / Walk) — 44px tall pill, padding 0 14px 0 8px, `--card2`; on: `--green-soft` background, `--green-700` text, 22px filled check dot.

**1–5 rating** — five equal-width pills, 44px tall, radius 22, `--card2`; selected: `--green` fill, white 16px/600 digit. Tapping the selected value clears it. Row label above, 15px/500.

**Segmented (Scrolling / Porn)** — container `--card` pill with 4px padding and `--shadow`; options flex 1, 48px, selected `--blue` fill with white text.

**Segmented (Day ends at)** — container `--card2`, 3px padding; selected option is a `--card` pill with `--shadow`, others transparent `--muted`.

**Primary button** — `--green` fill, white, radius half-height, 56–64px, Outfit 600. Disabled: opacity .45 (Rode it out before the timer ends).

**Secondary button** — `--card2` fill, `--text`, 44px. **Outline button** (Choose file) — 1.5px `--border`, transparent. **Text button** (Skip) — no fill, `--muted`.

**Gave in** — `--warn-soft` fill, `--warn` text, 52px. Only use of amber.

**Progress bar (slips)** — 6px track `--card2`, fill `--blue`, radius 3.

**Sparkline** — SVG 314×64, `--green` 3px round stroke, 4.5px dots, y mapped 1→5 across height; days with no data are omitted from the path and show "–" under the day label. Day values 14px/500 above 12px muted labels, 7-column grid.

**Timer ring** — SVG 240 viewBox, r 104, stroke 14 round caps; background circle `--card2`; progress circle stroke `url(#gradient)` (vertical `#3d9cf0 → #3aad3f`), `stroke-dasharray = 2π·104 ≈ 653.45`, `stroke-dashoffset = C × (secondsLeft / total)`, rotated −90°. Ring empties clockwise as time passes. Countdown centered inside. Urge ring rendered at 260px, wind-down at 240px.

**Step indicator** — four 8px dots, radius 4; completed/current dots stretch to 18px wide and fill `--blue`; caption "Step N of 4" 13px `--muted` to the right. Dots are `aria-hidden`; the caption is the accessible label.

**Card done state** — 2px `--green` border on the card plus a 14px/500 `--green-700` line with a circled check ("Morning done"). That is the whole celebration.

**Tab bar** — 88px tall (54 + 34 safe area), `--bar` with `backdrop-filter: blur(18px)`, 1px `--border` top. Four items, each: 56×32 pill (active `--blue-soft`, icon `--blue-700`; inactive transparent, `--muted`) over an 11px label. Order: **Day · Night · Week · More**. Icons are 24px Lucide-style outlines, 1.8 stroke, round caps (see `icons/`).

**Floating urge button** — absolute, 20px from each side, 100px from the bottom (above the tab bar), 52px tall, fully rounded, Outfit 16/600, wave icon + label, `--shadow`. Idle: `--card` fill, `--blue-700` text, 2px `--blue-soft` border, label "Urge". Running: `--blue` fill, white, label "Riding it out · 07:32" updating every second. Visible on every tab; tapping opens the Urge overlay (or returns to the running screen).

**Banner (soft)** — `--blue-soft` fill, `--blue-700` 14px/500 text, radius 18, download icon, padding 12px 16px. Used for "No backup in 9 days. Takes a few seconds in More." Soft-success variant: `--green-soft` / `--green-700`.

**Toast** — `--text` fill, `--bg` text, radius 20, 14px/500, centered, 170px from bottom, auto-dismiss 1.8s.

**Text field / textarea** — always a visible 13px/500 `--muted` label above; placeholder is example copy only. Textarea radius 18, padding 12px 14px, line-height 1.45, no resize.

## Screens

### Day
Kicker "morning" (13px muted) over the date "Friday, Sep 11" (30px Outfit). Card 1 (list card): Stretched toggle; Hungover? toggle with hint "Fri, Sat, Sun" (row shown only on those days) — when on, a wrapping row of four kit chips appears beneath it. When Stretched is on and the kit (if shown) is complete, the card gets the done state. Kicker "COMMITMENTS", then a list card of check-circle rows: Gym with hint "log it when it happens" (plus Water polo Tue/Sun, Dinner out Sun).

### Night — flow
Header: step indicator + caption, then the step title (Wind-down / Slips / How I showed up / One sentence). Content card. Pinned to the bottom of the content area: primary Next (Done on step 4) and a text Skip.
1. Wind-down card, centered content, padding 28px 20px: idle = 64px primary "Start 15:00"; running = 240px gradient ring with 48px mono countdown and a 44px secondary Cancel; done = `--green-700` circled check + "15 minutes, done". Hint under all states: "phone down, wash up, mouth tape".
2. List card of three toggles: "Scrolled past limits", "Porn", "Nagged someone" (hint "cars, dishes, whatever"). Turning one on reveals a labeled field: label "What was happening right before?", placeholder "waiting for the kettle".
3. Card of four rating rows, 18px gap: "Curious in conversation", "Stayed in my story, detached from outcomes", "Pushed through pauses", "Committed to where I was".
4. Card containing label "Reflection" and a 4-row textarea, placeholder "About today."

### Night — summary (after step 4, or when reopened)
Kicker "tonight", title "Night check-in". List card with four rows (Wind-down / Slips / How I showed up / Reflection): uppercase 12px title, 15px body, right-aligned "Edit" in `--green-700`; skipped sections show "Skipped" in `--muted`, never a warning. Rows separated by 1px `--border`. Last line inside the card, 14px `--muted`: "Logged for Fri, Sep 11." Tapping a row reopens that step with the flow's state intact.

### Week
Navigator row: 44×44 chevron buttons flanking the Outfit 22px range "Sep 7 – Sep 13"; next is opacity .3 and disabled on the current week. Optional backup banner. Cards, 14px apart:
- **Slips**: three blocks — label + "2 of 5 days" right-aligned, blue progress bar, "last week 4 of 7" muted; 1px divider; "Urges ridden out: **3 rode · 1 gave in**" (bold part `--green-700`); "Last porn slip logged 12 days ago." 13px `--muted` — same style regardless of the number.
- **How I showed up**: sparkline, 7-column day values, divider, four dimension rows: label, this week's average (15px/500), "last 3.2" (13px muted, 72px right column).
- **Routines**: five label/value rows.
- **Journal**: newest first; 12px date, 15px sentence, italic 13px muted slip note ("before scrolling: waiting for the kettle"). Empty: "Nothing written yet."

### More
Title "More". Cards: **Backup** (explanation line, "Last backup Sep 2 · Days logged 38", primary Share file + secondary Copy text; Download file hidden on iOS home screen), **Restore** (outline Choose file, labeled textarea "Or paste backup text", secondary Merge with the line "Newer entries win, nothing is deleted."), **Storage health** (three rows with 8px status dots: green ok, amber not granted), **Schedule** (three day-chip rows S M T W T F S with 36px glyphs in 44px buttons, selected `--green` fill with white glyph; "Day ends at" segmented 12 am / 2 am / 4 am / 6 am, default 4 am), **Reminders** (card title + toggle "Use Shortcuts timers" on one row, explanatory paragraph 14px muted), **Getting set up** (three check rows; completed items `--muted`).

### Urge overlay
Full-screen `--bg` layer above everything, padding 60px 20px 40px, 20px vertical gap. Top row: kicker ("urge" / "riding it out") and a 44px `--card2` circular close button.
- Ask state: title "Which pull is it?", Scrolling/Porn segmented, labeled field "Trigger" (placeholder "two words: bored, tired, alone"), 60px primary "Start 10 minutes".
- Running state: 260px gradient ring with 54px mono countdown, 15px muted line "Scrolling · bored, tired", primary "Rode it out" at opacity .45 until 00:00, "Gave in" amber button, 13px muted "Wait it out. Rode it out unlocks when the timer ends."
- Bottom (both states), pushed down with `margin-top:auto` above a 1px divider: "This week: **3 rode · 1 gave in**" and up to four log rows in a 78/68/1fr/auto grid (time, kind, trigger, outcome; "rode" in `--green-700`, "gave in" in `--warn`). Empty: "No urges logged yet."
Finishing either way closes the overlay, prepends the log entry, resets the timer, and shows a toast ("Rode it out. Logged." / "Logged.").

## State
- `tab`: day | night | week | more
- Day: `stretched`, `hungover`, `kit{LMNT,Food,Ibuprofen,Walk}`, `commits{...}`
- Night: `step 1–4`, `finished`, `wd: idle|running|done`, `wdLeft` (900s), `slips{scroll,porn,nag}`, `notes{...}`, `ratings[4]` (0 = unset), `reflection`, `skipped{}`
- Urge: `open`, `kind`, `trigger`, `running`, `left` (600s), log
- Week: `weekOff` (0 current, negative = past)
- More: `useShortcuts`, `hang[]`, `polo[]`, `dinner[]`, `dayEnd`
- One 1s interval drives both countdowns; the floating button label reads `urge.left`.

## Assets
`icons/` — four tab bar icons as 24px SVG outlines (Day sun, Night moon, Week bars, More circle-dots) plus the urge wave. `stroke="currentColor"`, stroke-width 1.8, round caps/joins. No raster assets. Outfit from Google Fonts with `sans-serif` fallback.

## Files
- `Improvement Tracker.dc.html` — the tappable prototype (all screens, light/dark, realistic and empty data). Requires `ios-frame.jsx` and `support.js` alongside it to open.
- `DESIGN-HANDOFF.md`, `DESIGN-PRINCIPLES.md` — the functional brief and sourced principles this design implements.
- `icons/*.svg` — tab bar icons.
