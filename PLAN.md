# Improvement Tracker: plan, pre-mortem, and how we work

Owner: Michael. Director: Claude (Fable) in the main session. Workers: Sonnet agents.

## What this is

A private, on-device web app Michael adds to his iPhone home screen. Two check-ins a day
(morning, night), an "I feel an urge" button with a 10 minute wait, and a weekly review
that shows rates, not streaks. No account, no network, no notifications. Nothing about
scrolling or porn ever appears outside the app.

## Pre-mortem

It is December 2026 and the tracker is dead. Why?

| # | Failure | Likelihood | Mitigation (owner) |
|---|---------|-----------|--------------------|
| 1 | He stopped opening it. Nothing pulled him in, same as the whiteboard. | High | First-run checklist inside the app: add to home screen, create the 9:00 / 22:00 Shortcuts "Open App" automation, make first backup. Generic wording only. (Builder) |
| 2 | The night check-in took too long, so he skipped it, then skipped again. | High | Time the flow. Target under 60 seconds. Ratings and sentence are optional; the card counts as done with partial input. Cut anything that does not earn its tap after two weeks of real use. (Michael + Director) |
| 3 | Data vanished: icon deleted, iOS storage cleared, origin changed. | Medium | Three on-device copies (localStorage, previous save, IndexedDB mirror with 60 daily snapshots). One-tap Share backup to Notes. In-app nag after 7 days without a backup. Host at one stable URL and never move it. (Builder, Director) |
| 4 | Hosted on the wrong origin. A private artifact link needs a claude.ai login, which a home-screen app cannot carry, so it would show a login wall. | High if ignored | Host on a plain static origin (GitHub Pages or similar). Artifact links are for previewing only. Decision needed from Michael. (Director) |
| 5 | Seeing "Porn 4 of 7" felt like shame, so he avoided the app. | Medium | Rates with last-week comparison, neutral copy, urges ridden out shown before slips. No red. No streak that resets. (Builder, Michael feedback) |
| 6 | Timers were useless because the phone was locked and the web app cannot ring. | Medium | Timers record start and end; the app never claims to alarm. Optional deep link to a user-made Shortcut that starts a real iPhone timer. (Builder) |
| 7 | An iOS quirk broke a core path: Download does nothing in standalone mode, Share refused, textarea zoomed the page. | Medium | Share is the primary backup path, Download hidden in standalone mode, 16px inputs, safe-area padding. Real-device checks by Michael from a scripted checklist. (Release agent, Michael) |
| 8 | Late-night logic was wrong: 1am entries landed on the wrong day, "morning" showed at 2am. | Medium | Day rolls over at 4am, unit tests on every date function. (QA) |
| 9 | Import or restore silently corrupted data. | Low, high cost | Merge never deletes, newer-wins per day, unit tests with fixture files, restore path tested by wiping localStorage in the browser. (QA) |
| 10 | Feature creep. Version 2 ideas delayed version 1 forever. | Medium | Ship v1 this week. New ideas go to BACKLOG.md under "Later" and are only promoted after a week of real use. (Director) |
| 11 | Agents stepped on each other: conflicting edits, untested merges. | Medium | One builder edits code at a time, in a worktree. QA tests main only. Director merges, runs tests, commits. (Director) |

## Team

Three roles besides Michael. Small codebase, so few agents, run in a loop rather than in a swarm.

- **Director (Fable, this session).** Owns the backlog, reviews every diff, merges, commits, talks to Michael. Does not write feature code unless a worker is stuck.
- **Builder (Sonnet, persistent).** Takes the top tickets from BACKLOG.md, works in an isolated worktree, returns a diff summary and test results. Owns app.js, app.css, logic.js, index.html.
- **QA (Sonnet, persistent).** Drives the app in the in-app browser at phone size, runs the scenario list in TESTING.md, writes unit tests under tests/, files bugs as tickets. Never edits app code.
- **Release (Sonnet, one-off when needed).** Hosting setup, manifest and service worker review, iOS checklist, README.

## The loop

1. Director grooms BACKLOG.md: ordered tickets, each with a done condition.
2. Builder takes the top 2 to 4 tickets in a worktree. Returns: what changed, how verified, anything unsure.
3. Director reviews the diff, merges into main, runs `node --test tests/`, commits.
4. QA runs the scenario pass on main. Files bugs at the top of the backlog with reproduction steps.
5. Michael tests on his phone whenever he has a minute and reports inline. Director converts feedback into tickets.
6. Repeat. Commit at every verified milestone. Never push from here without Michael saying so.

## Definition of done for v1

- Every scenario in TESTING.md passes in the phone-size browser.
- Unit tests pass for dates, week stats, normalize, merge.
- Michael has it on his home screen, has done one morning and one night check-in, and has one backup in Notes.
- The 9:00 and 22:00 Shortcuts automations exist with generic names.

## Decisions log

- 2026-09-11: Web app on home screen over native (no Xcode, faster to iterate). Local-only storage. Rates not streaks. Hangover prompt Fri/Sat/Sun only. Day rolls over at 4am. No notifications from the app, ever.
