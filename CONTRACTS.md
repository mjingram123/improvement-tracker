# Data contracts for parallel builders (wave 1, 2026-09-22)

Every field below is additive. normalize() in logic.js keeps unknown fields on day objects and
settings, so screens read with defaults and never require a normalize change. Only the Night
builder may edit logic.js (the night step functions and their tests). Nobody else edits logic.js,
js/core.js, index.html, or sw.js except the Mind builder, who owns the tab bar and the SHELL list.
Each builder may add exactly one pure-logic file js/logic-<screen>.js (browser global merged into
window.ITLogic<Screen>, node require for tests) and one test file tests/<screen>.test.js.

## Day object fields (state.days[key])

| Field | Written by | Read by | Shape |
|---|---|---|---|
| morning | Day | Week | { up:false, pushups:false, stretched:false, shower:false, supplements:false } |
| stretched | Day (kept in sync with morning.stretched) | Week | boolean, legacy |
| hungover, hangover | Day | Week | unchanged |
| gym, dinnerOut | Day | Week | unchanged. waterPolo stays in data, no longer shown |
| mindFocus | Mind | Day, Week | one of 'curiosity','story','pauses','present' or '' |
| ratings | Mind (moved out of Night) | Week, Night summary | unchanged shape |
| mindMoment | Mind | Week Journal | string |
| night | Night | Week | { washed:false, tape:false, magnesium:false } |
| windDown | Night | Week | unchanged |
| lapses, lapseNotes | Night; Urge sets lapses[kind] true on Gave in | Week | unchanged |
| lapseHelp | Night, Urge | Week Journal | { scroll:'', porn:'', nag:'' } |
| scrollMinutes | Night | Week | number or null |
| nightVisited | Night | Night | array of 4 booleans, indices 0..2 used after the flow shrinks |
| note | Night | Week | string |

## Top-level fields

| Field | Written by | Read by | Shape |
|---|---|---|---|
| urges[i].help | Urge | Week Journal | string |
| reviews[weekStartKey] | Mind | Week Journal | { worked:'', inTheWay:'', next:'', at: epoch } |
| settings.intentions | Mind (editing moves from More to Mind) | Day, Mind | unchanged shape |
| settings.useShortcutTimers | removed from UI by More and Urge | nobody | ignored |
| settings.waterPoloDays | nobody | nobody | ignored |

## Tab order and ownership

Day (day.js), Mind (mind.js, new), Night (night.js), Week (week.js), More (more.js). Urge overlay
and floating button: urge.js. Setup checklist: onboarding.js, owned by the More builder.
Default tab rule unchanged: Day before 15:00, Night after or before the 4am rollover.
