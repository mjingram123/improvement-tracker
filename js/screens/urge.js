/* Improvement Tracker - the urge overlay (dialog content) and its floating
   launcher button label (core owns the button's live countdown text via
   updateUrgeButton; this file owns the overlay markup and its actions).

   applyGaveIn is kept inline here (mirrored in js/logic-urge.js, which
   carries its tests) so this file works standalone even before
   js/logic-urge.js is wired into index.html. */
(() => {
'use strict';
const IT = window.IT;
const { esc, ring, mmss, fmtTime } = IT.ui;
const { recentUrges, weekStart, weekStats: weekStatsPure, urgeDayKeyFor, defaultDay } = window.ITLogic;

const closeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Mirrored in js/logic-urge.js (tested there). Sets lapses[urge.kind] on the
// day the urge itself falls on (urgeDayKeyFor + settings.rolloverHour),
// creating that day if needed, and copies the trigger into that lapse's note
// only when the note is currently empty. Mutates `state`; returns the day key.
function applyGaveIn(state, urge) {
  const key = urgeDayKeyFor(urge.at, state.settings.rolloverHour);
  if (!state.days[key]) state.days[key] = defaultDay();
  const d = state.days[key];
  const kind = urge.kind;
  d.lapses[kind] = true;
  const hasNote = d.lapseNotes[kind] && d.lapseNotes[kind].trim();
  if (!hasNote) d.lapseNotes[kind] = urge.trigger || '';
  return key;
}

// Mirrored in js/logic-urge.js (tested there). Most-used trigger words across
// all urges in the last 28 days, lowercased, split on commas/whitespace, 3
// letters minimum, most frequent first, padded with DEFAULT_TRIGGERS (no
// duplicates) up to 6.
const DEFAULT_TRIGGERS = ['bored', 'tired', 'alone', 'stressed', 'late', 'drinking'];
const TRIGGER_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;
function topTriggers(urges, now) {
  const since = now - TRIGGER_WINDOW_MS;
  const counts = new Map();
  for (const u of (urges || [])) {
    const at = new Date(u.at).getTime();
    if (!(at >= since && at <= now)) continue;
    const words = String(u.trigger || '').toLowerCase().split(/[,\s]+/);
    for (const w of words) {
      const word = w.trim();
      if (word.length < 3) continue;
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([w]) => w);
  const result = [];
  for (const w of ranked) {
    if (result.length >= 6) break;
    result.push(w);
  }
  for (const w of DEFAULT_TRIGGERS) {
    if (result.length >= 6) break;
    if (!result.includes(w)) result.push(w);
  }
  return result.slice(0, 6);
}

let urgeKind = 'scroll';
// Set to an urge id right after "Gave in" is tapped, while the "what would
// help next time" follow-up card is showing in its place. Cleared on Done,
// Skip, or closing the overlay.
let followUpUrgeId = null;
function pendingUrge() { return IT.state.urges.find((u) => !u.outcome) || null; }

// "This week" rode/gave-in counts for the log footer.
function weekStatsThisWeek() { return weekStatsPure(IT.state, weekStart(IT.todayKey()), IT.todayKey()); }
function renderUrgeLog() {
  const stats = weekStatsThisWeek();
  const recent = recentUrges(IT.state, 4);
  const rows = recent.map((u) => {
    const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
    const outClass = u.outcome === 'rode' ? 'rode' : u.outcome === 'gave' ? 'gave' : '';
    const outcome = u.outcome === 'rode' ? 'rode it out' : u.outcome === 'gave' ? 'gave in' : 'in progress';
    return `<div class="urge-log-row"><span class="t">${esc(fmtTime(u.at))}</span><span>${esc(kind)}</span><span class="trig">${esc(u.trigger || '')}</span><span class="out ${outClass}">${esc(outcome)}</span></div>`;
  }).join('');
  return `<div class="urge-log-divider"></div><div class="urge-log">
    <div style="font-size:0.875rem">This week: <span style="font-weight:600;color:var(--green-700)">${stats.rode} rode · ${stats.gave} gave in</span></div>
    ${rows || '<p class="muted small">No urges logged yet.</p>'}
  </div>`;
}
function renderTriggerChips() {
  const words = topTriggers(IT.state.urges, Date.now());
  if (!words.length) return '';
  return `<div class="trigger-chips">${words.map((w) => `<button type="button" class="trigger-chip" data-action="urge-chip" data-arg="${esc(w)}">${esc(w)}</button>`).join('')}</div>`;
}
function renderUrgeIdle() {
  return `<h1 class="title">Which pull is it?</h1>
    <div class="segmented-blue"><button type="button" data-action="urge-kind" data-arg="scroll" aria-pressed="${urgeKind === 'scroll'}">Scrolling</button><button type="button" data-action="urge-kind" data-arg="porn" aria-pressed="${urgeKind === 'porn'}">Porn</button></div>
    ${renderTriggerChips()}
    <div class="field-group"><span class="field-label">Trigger</span><input class="field" id="urge-trigger" placeholder="two words: bored, tired, alone"></div>
    <div class="btn-stack"><button class="btn primary huge block" type="button" data-action="urge-start">Start 10 minutes</button></div>
    ${renderUrgeLog()}`;
}
function renderUrgeRunning(u) {
  const left = u.endsAt - Date.now();
  const over = left <= 0;
  const kind = u.kind === 'porn' ? 'Porn' : 'Scrolling';
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">
      ${ring({ id: 'urge-ring', size: 260, leftMs: left, totalMs: IT.URGE_MIN * 60000, clockText: over ? '00:00' : mmss(left), clockClass: 'lg' })}
      <div class="muted" style="font-size:0.9375rem">${esc(kind)}${u.trigger ? ' · ' + esc(u.trigger) : ''}</div>
    </div>
    <button class="btn primary huge block" type="button" data-action="urge-outcome" data-arg="${u.id}:rode" ${over ? '' : 'disabled'}>Rode it out</button>
    <button class="btn warn block" type="button" data-action="urge-outcome" data-arg="${u.id}:gave">Gave in</button>
    <p class="muted small" style="text-align:center;margin-top:-8px">Wait it out. Rode it out unlocks when the timer ends.</p>
    ${renderUrgeLog()}`;
}
// U3: shown in place of the running state right after "Gave in" is tapped.
// The lapse itself is already saved by the time this renders; Done/Skip only
// decide whether urge.help gets filled in before the overlay closes.
function renderUrgeFollowUp() {
  return `<div class="field-group"><span class="field-label">What would help next time?</span><input class="field" id="urge-help" placeholder="one line"></div>
    <div class="btn-stack">
      <button class="btn primary block" type="button" data-action="urge-followup" data-arg="done">Done</button>
      <button class="btn text block" type="button" data-action="urge-followup" data-arg="skip">Skip</button>
    </div>`;
}
function renderUrgeOverlay() {
  const followUp = followUpUrgeId ? IT.state.urges.find((x) => x.id === followUpUrgeId) : null;
  const u = followUp ? null : pendingUrge();
  const kicker = u ? 'riding it out' : 'urge';
  const body = followUp ? renderUrgeFollowUp() : (u ? renderUrgeRunning(u) : renderUrgeIdle());
  return `<div class="overlay-inner" role="dialog" aria-label="Urge">
    <div class="overlay-top"><span class="kicker">${kicker}</span><button class="overlay-close" type="button" data-action="urge-close" aria-label="Close">${closeSvg}</button></div>
    ${body}
  </div>`;
}

IT.registerScreen('urge', { render: renderUrgeOverlay });

IT.registerActions({
  'urge-open': () => { urgeKind = 'scroll'; followUpUrgeId = null; IT.openUrgeOverlay(); },
  'urge-close': () => { followUpUrgeId = null; IT.closeUrgeOverlay(); },
  'urge-kind': (arg) => {
    urgeKind = arg;
    document.querySelectorAll('[data-action="urge-kind"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arg === arg)));
  },
  'urge-chip': (arg) => {
    const input = document.querySelector('#urge-trigger');
    if (!input) return;
    const cur = input.value.trim();
    input.value = cur ? `${cur}, ${arg}` : arg;
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  },
  'urge-start': () => {
    const trigger = (document.querySelector('#urge-trigger')?.value || '').trim().slice(0, 80);
    const now = Date.now();
    IT.state.urges.push({ id: uid(), at: new Date(now).toISOString(), kind: urgeKind, trigger, endsAt: now + IT.URGE_MIN * 60000, outcome: null });
    IT.state.meta.updatedAt = now; IT.save();
    IT.refreshUrgeOverlay();
    IT.render();
    IT.ntfyTimerPing('10m');
  },
  'urge-outcome': (arg) => {
    const [id, outcome] = arg.split(':');
    const u = IT.state.urges.find((x) => x.id === id);
    if (!u) return;
    u.outcome = outcome; u.resolvedAt = new Date().toISOString(); IT.state.meta.updatedAt = Date.now();
    if (outcome === 'gave') {
      const dayKey = applyGaveIn(IT.state, u);
      IT.touch(dayKey);
      IT.save();
      // Don't close yet: show the "what would help next time" follow-up card
      // in place of the running state. Done/Skip below finish the job.
      followUpUrgeId = u.id;
      IT.refreshUrgeOverlay();
      IT.render();
    } else {
      IT.save();
      IT.toast('Rode it out. Logged.');
      IT.closeUrgeOverlay();
      IT.render();
    }
  },
  'urge-followup': (arg) => {
    const u = followUpUrgeId ? IT.state.urges.find((x) => x.id === followUpUrgeId) : null;
    if (u && arg === 'done') {
      const val = (document.querySelector('#urge-help')?.value || '').trim().slice(0, 200);
      u.help = val;
      IT.state.meta.updatedAt = Date.now();
      IT.save();
    }
    followUpUrgeId = null;
    IT.toast('Logged.');
    IT.closeUrgeOverlay();
    IT.render();
  },
});
})();
