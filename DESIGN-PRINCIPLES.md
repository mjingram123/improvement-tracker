# Design principles for Improvement Tracker

Read this alongside DESIGN-HANDOFF.md. Each entry below is a principle from an authoritative
source, what it means for this specific app, and a concrete change (or confirmation that the
app already does the right thing). Nothing here overrides Michael's non-negotiables in
DESIGN-HANDOFF.md (no shame, no streaks, calm over gamified, no red for slips, no accounts,
no notifications) — several entries exist specifically to protect those decisions.

Contrast numbers below were computed directly from the current CSS custom properties in
app.css using the WCAG relative-luminance formula.

Legend: **Priority** P1 = fix before next release, P2 = do soon, P3 = confirm or defer.
**Type**: design = a change to DESIGN-HANDOFF.md / visual spec. code = a change to app.js/app.css
that does not require new visual design (goes straight to BACKLOG.md).

## Apple Human Interface Guidelines

1. **Tab bar item count.** Source: [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars).
   Apple's comfortable range is 3–5 items. Four tabs (Day, Week, Night, More) is inside range,
   and the floating urge button correctly stays outside the tab bar instead of becoming a 5th
   item. Already satisfied by the T10 structure. Priority P3. Type: design (guardrail only —
   do not add a 5th tab later without revisiting this).

2. **Minimum tap target 44×44pt.** Source: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
   Several controls in the current CSS clear WCAG's legal 24px floor but fall under Apple's
   comfortable 44pt: the check-circle button (`.check`, 30×30px), rating buttons (`.rating
   button`, 40×40px), day chips (`.daychips button`, min-height 36px), and week-nav arrows
   (`.weeknav button`, min-height 40px). The toggle row is fine because the whole row is a
   `<label>`, so its real hit area is much larger than the visible switch. Change: keep the
   visual glyph size but pad the hit box to 44×44 on check circles, rating buttons, day chips,
   and week-nav arrows. Priority **P1**. Type: design (token/spec) + code.

3. **Safe areas.** Source: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout).
   Content must not sit under the notch, Dynamic Island, or home indicator. Already satisfied:
   `viewport-fit=cover` is set in index.html and `env(safe-area-inset-*)` is used in `.view`,
   `.tabs`, `.urgebar`, `.sheet-inner`. Priority P3. Type: design (confirm, no change).

4. **Dynamic Type.** Source: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography).
   Apple expects text to scale with the user's chosen text size. This app uses fixed px sizes
   throughout, so a larger iOS text-size setting does nothing inside the web app. For a
   single-user private app this is low-stakes today, but Michael's needs may change and it's
   cheap to make more robust. Change: move the type scale to rem units and verify no clipping
   at 120% browser zoom (a rough proxy for larger Dynamic Type). Priority P3. Type: code.

5. **Color is never the only signal.** Source: [Color](https://developer.apple.com/design/human-interface-guidelines/color)
   and [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).
   Already satisfied: `.card.done` pairs a border color change with a checkmark and label
   text, not color alone. Priority P3. Type: design (confirm).

6. **Contrast.** Source: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
   and [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) (AA
   requires 4.5:1 for normal text, 3:1 only for text ≥18pt regular or ≥14pt bold). Computed:
   `--warn` (#a8552f) on `--warn-soft` (#f6e8e1) is **4.38:1** in light mode — just under AA —
   and this pair is used at 14–16px semi-bold (`.banner`, `.btn.warn`), which does not qualify
   as "large text." Dark mode is fine at 5.92:1. Change: darken `--warn` slightly or adjust
   `--warn-soft` in light mode until the pair reaches ≥4.5:1. Priority **P1**. Type: design
   (token change).

7. **Accessible labeling for icon-only controls.** Source: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility).
   Already satisfied: check circles, week-nav arrows, and the rating group all carry
   `aria-label`/`aria-pressed`. Priority P3. Type: design (confirm).

## web.dev / MDN — installable iOS PWA

8. **`display: standalone`.** Source: [Web app manifest](https://web.dev/learn/pwa/web-app-manifest).
   Already satisfied in manifest.webmanifest. Priority P3.

9. **Icon set including a maskable icon.** Source: same as #8. Already satisfied: 192px and
   512px PNGs with `"purpose": "any maskable"`, plus a separate apple-touch-icon. Priority P3.

10. **`viewport-fit=cover` must be paired with `safe-area-inset-*`.** Source: [WebKit — Designing
    for iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/). Setting one
    without the other either clips content or leaves inset variables at 0. Already satisfied —
    both are present and paired correctly. Priority P3.

11. **16px minimum font size on form inputs to avoid iOS auto-zoom.** Source: [16px or Larger
    Text Prevents iOS Form Zoom](https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/).
    Already satisfied: `.field` inherits the 16px body font. Priority P3. Type: design (keep
    stated explicitly in Platform facts, which it already is).

12. **Request persistent storage, and tell the truth about it.** Source: [Persistent storage](https://web.dev/articles/persistent-storage).
    `navigator.storage.persist()` is already called on load — good. But the "Storage health"
    row in More is not shown to reflect the actual `navigator.storage.persisted()` boolean; it
    infers health from write success only, which can look "ok" even when persistence was never
    granted. Change: read and display the real persisted() result. Priority P2. Type: code.

13. **Offline app-shell caching.** Source: [Persistent storage](https://web.dev/articles/persistent-storage)
    and general PWA offline guidance. Already satisfied: sw.js is a network-first worker that
    falls back to the cached shell, which directly addresses pre-mortem risk #3 in PLAN.md.
    Priority P3. Type: code (confirm).

## Nielsen Norman Group

14. **Visibility of system status** (heuristic 1 of [10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)).
    The Night step indicator and the 7-day backup banner both keep the user oriented about
    where they are and what's overdue. Already satisfied. Priority P3.

15. **Error prevention over error messages** (heuristic 5, same source). The restore/merge
    copy already states the safety rule up front: "Newer entries win, nothing is deleted."
    This is exactly NN/g's preferred approach — prevent the fear of data loss rather than
    explain it after the fact. Already satisfied. Priority P3.

16. **Recognition rather than recall** (heuristic 6, same source). Day tab surfaces today's
    specific commitments (Water polo, Dinner out, Gym) instead of asking Michael to remember
    what's scheduled. Already satisfied. Priority P3.

17. **A visible label is not the same as a placeholder.** Source: [A Checklist for Designing
    Mobile Input Fields](https://www.nngroup.com/articles/mobile-input-checklist/), item 2 ("is
    the label above the field, not inside it"). Three fields currently rely on placeholder
    text as their only label: the Night "One sentence" textarea (`placeholder="About today."`),
    the Urge screen trigger field (`placeholder="Trigger, two words..."`), and the Restore
    paste-text field. Placeholder text disappears the moment text is typed and is handled
    inconsistently by screen readers. Change: add a small persistent caption above each field
    ("Reflection", "Trigger", "Or paste backup text") and keep the current text as an example
    inside the field. Priority P2. Type: design + code.

18. **Step count as text, not just dots.** Source: [Progress Indicators](https://www.nngroup.com/articles/progress-indicators/),
    which recommends showing "X of Y" for a known number of steps so users can form a time
    estimate — dots alone don't do this and aren't reliably read by VoiceOver. The current
    Night flow spec says only "a step indicator (4 dots)." Change: pair the dots with a quiet
    text caption, "Step 2 of 4." Priority **P1**. Type: design.

## Laws of UX (lawsofux.com)

19. **Fitts's Law** — larger, closer targets are acquired faster. The floating urge button
    (full-width, bottom-anchored, 48pt tall) already gets this right; it's the exception noted
    in #2 (check circles, rating buttons) that fights this law. Not a separate change — see #2.
    Priority P3. Type: design (confirm the urge button, no change needed there).

20. **Hick's Law** — more choices per screen slows decisions. The T11 Night redesign already
    applies this by giving each step exactly one topic. The Urge overlay deliberately keeps two
    related choices (kind + trigger) on one screen; splitting a 10-second task into two screens
    would cost more than the Hick's-Law benefit and would fight the "fast" non-negotiable. This
    is a considered exception, not an oversight — worth stating explicitly so a future pass
    doesn't "fix" it by mistake. Priority P3. Type: design (document the tradeoff).

21. **Miller's Law / chunking** — working memory holds about 7±2 items. The whole point of
    T11 (four short steps instead of one long scrolling card) is chunking. Already satisfied,
    and this is the design rationale for that ticket. Priority P3.

22. **Peak-End Rule** — people judge an experience mostly by its peak and its ending. The
    Night flow's summary screen, shown last, is the peak-end moment of the whole daily loop.
    The current spec ("shows what was filled and greys what was skipped without nagging") is a
    good neutral baseline. Change: end the summary with one calm, plainly-worded confirmation
    line — not praise, not an exclamation point, just acknowledgment (e.g. "Logged for Tue,
    Sep 8.") — since this is the last thing Michael sees before closing the app each night.
    Priority P2. Type: design (copy + one line).

23. **Goal-Gradient Effect** — motivation increases as the goal nears. The 4-dot step
    indicator filling in as steps complete already leverages this. Already satisfied. Priority P3.

24. **Zeigarnik Effect** — unfinished tasks are remembered better than finished ones. The
    reopenable, per-section-editable summary (not a locked receipt) lets an interrupted night
    check-in stay "open" in a low-pressure way instead of being punished as incomplete. Already
    satisfied by the spec — worth calling out explicitly so the Builder doesn't make the
    summary read-only. Priority P3. Type: design (confirm in handoff).

## Behavior design for habit apps

25. **Fogg Behavior Model (B=MAP).** Source: [behaviormodel.org](https://www.behaviormodel.org/).
    Behavior needs Motivation, Ability, and a Prompt at the same moment. The floating urge
    button is simultaneously an always-visible Prompt and a one-tap-low-Ability entry point —
    exactly what B=MAP calls for. Already satisfied. Priority P3.

26. **Tiny Habits celebration, kept calm.** Source: BJ Fogg's Tiny Habits method (via
    [behaviormodel.org](https://www.behaviormodel.org/)) calls for an immediate small emotional
    payoff after a tiny behavior to wire in the habit loop. Michael's rule stands: no confetti,
    no badges, no fire emoji — that decision is not being revisited. But "celebration" doesn't
    require gamification: the existing `.card.done` accent-border change already is the quiet
    celebration this app needs. Change: none — just name this explicitly in the principles doc
    so a future pass doesn't either remove the done-state (losing the celebration Fogg calls
    for) or add a louder one (violating Michael's rule). Priority P3. Type: design (lock in,
    no visual change).

27. **James Clear's "make it obvious" and "make it easy."** Source: Atomic Habits' four laws
    of behavior change. Day tab's obvious today's-commitments list and the existing rule that
    partial Night completion still counts as "done" (T5) both implement these two laws
    directly. Already satisfied — cited here as the rationale behind a decision already made.
    Priority P3.

28. **Streak-shame critique — protect the "days since last slip" line.** Source: widely
    documented critique of streak mechanics in habit apps (e.g. Duolingo's loss-aversion
    streak design vs. "no shame when you miss a day" apps like Streaks). This app's existing
    "rates not streaks, no red for slips" decision already sits on the gentle end of that
    spectrum. The one line that could accidentally reintroduce streak psychology is "Last porn
    slip logged 12 days ago" — a rising number functions exactly like a positive streak, and a
    falling number (a recent slip) could tempt a future design pass to color it red or urgent.
    Change: specify that this line always uses the same neutral/muted styling regardless of the
    number's size — 1 day or 100 days look the same. Priority **P1**. Type: design (explicit
    non-negotiable — guards a real regression risk, does not change any of Michael's decisions).

29. **Compassion-based, non-judgmental copy for slip logging.** Source: general trauma-informed
    and harm-reduction UX guidance for relapse-prone behaviors (paired with the streak-shame
    literature above). The existing trigger question ("What was happening right before?") is
    already curious rather than accusatory. Change: formalize this as a standing copy rule so
    future microcopy (error states, restore-merge messages, onboarding) is checked against it
    too. Priority P2. Type: design (copy guideline, add to principles section of handoff).

## Data display

30. **Rates over streaks; no dual axes.** Source: general small-multiples/data-ink guidance
    from Edward Tufte (see [Small multiple](https://en.wikipedia.org/wiki/Small_multiple) and
    [Sparkline](https://en.wikipedia.org/wiki/Sparkline)). The Week tab spec already uses a
    single-hue sparkline for the composite daily rating and separate simple progress bars per
    slip type, rather than one combined or dual-axis chart. Already satisfied — lock this in as
    a rule against future additions (e.g. don't overlay slip counts and mood rating on one
    chart with two y-axes). Priority P3. Type: design (confirm/guardrail).

31. **Small multiples for the future month view.** Source: same as #30. T7 in BACKLOG.md
    ("month strip or simple list of past weeks") hasn't been designed yet. Recommend it use
    repeated identical small week-blocks (small multiples), not one dense combined multi-week
    chart. Priority P2. Type: design guidance for a not-yet-built feature.

## WCAG 2.2

32. **Reduced motion.** Source: [Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)
    and the `prefers-reduced-motion` media query. No such media query exists in app.css today.
    Current transitions are short (150ms, well under the handoff's own 200ms motion budget) so
    the risk is low, but adding the query is a defensive baseline that costs almost nothing.
    Change: add `@media (prefers-reduced-motion: reduce)` to zero out the switch-thumb and
    rating-button transitions. Priority P3. Type: code.

---

## Proposed backlog tickets

Ordered, top is next. Each has a done condition, matching the BACKLOG.md style.

1. **B1 (P1) — Fix tap targets.** Raise the hit area of the check-circle button, rating
   buttons, day chips, and week-nav arrows to 44×44pt minimum; visual glyph size can stay as-is
   by adding padding rather than growing the icon. Done: every interactive control in #2 above
   measures ≥44×44 CSS px in the phone-size browser, QA-verified.

2. **B2 (P1) — Fix warn/warn-soft contrast.** Adjust `--warn` and/or `--warn-soft` in light
   mode so the pair reaches ≥4.5:1. Done: computed contrast ratio ≥4.5:1 for `--warn` on
   `--warn-soft` in both light and dark themes.

3. **B3 (P2) — Visible labels, not placeholder-only.** Add a persistent caption above the
   Night "One sentence" textarea, the Urge trigger field, and the Restore paste-text field;
   keep existing text as in-field example copy. Done: all three fields have a real label
   element; VoiceOver reads it before the field is focused.

4. **B4 (P2) — Honest storage health.** Show the real `navigator.storage.persisted()` boolean
   in the More tab's Storage health section instead of inferring status from write success
   alone. Done: the row changes correctly when persistence is/isn't granted in a test browser.

5. **B5 (P3) — Respect reduced motion.** Add `@media (prefers-reduced-motion: reduce)` to
   app.css, shortening or removing the switch and rating-button transitions. Done: transitions
   are near-instant when the OS reduce-motion setting is on, verified in the simulator.

6. **B6 (P3) — Type scale in rem.** Convert the fixed-px type scale to rem units. Done: no
   clipped or overlapping text anywhere at 120% browser zoom in the phone-size browser.

7. **B7 (P2, tied to T7) — Small multiples for the month view.** When T7 (month strip / past
   weeks) is built, use repeated identical small week-blocks rather than one dense combined or
   dual-axis chart. Done: T7's implementation is reviewed against this rule before merge.

## Proposed handoff edits

Applied directly in DESIGN-HANDOFF.md (see that file's diff):

- New "Principles this design follows" section near the top, 8–12 one-line rules with source
  links, so the brief already embodies the highest-impact findings above.
- Component spec: check circle, rating button, day chip, and week-nav arrow get an explicit
  44×44pt minimum tap-target note (visual size may stay smaller).
- Night flow step indicator: pair the 4 dots with a text caption, "Step X of 4."
- New explicit contrast requirement for warn/warn-soft token pairs (≥4.5:1 in both themes).
- Text field component spec: note field and trigger field need a persistent visible label, not
  placeholder-only; placeholder becomes example text.
- Night flow: summary screen ends with one calm, non-judgmental confirmation line.
- Week tab: the "days since last slip" line is specified as always neutral/muted regardless of
  the number.
- Platform facts: explicit mention of `prefers-reduced-motion` alongside the existing 200ms
  motion budget.
