/* Improvement Tracker - the urge overlay (dialog content) and its floating
   launcher button label (core owns the button's live countdown text via
   updateUrgeButton; this file owns the overlay markup and its actions). */
(() => {
'use strict';
const IT = window.IT;
const { esc, ring, mmss, fmtTime } = IT.ui;
const { recentUrges, weekStart, weekStats: weekStatsPure } = window.ITLogic;

const closeSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

let urgeKind = 'scroll';
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
function renderUrgeIdle() {
  return `<h1 class="title">Which pull is it?</h1>
    <div class="segmented-blue"><button type="button" data-action="urge-kind" data-arg="scroll" aria-pressed="${urgeKind === 'scroll'}">Scrolling</button><button type="button" data-action="urge-kind" data-arg="porn" aria-pressed="${urgeKind === 'porn'}">Porn</button></div>
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
function renderUrgeOverlay() {
  const u = pendingUrge();
  const kicker = u ? 'riding it out' : 'urge';
  const body = u ? renderUrgeRunning(u) : renderUrgeIdle();
  return `<div class="overlay-inner" role="dialog" aria-label="Urge">
    <div class="overlay-top"><span class="kicker">${kicker}</span><button class="overlay-close" type="button" data-action="urge-close" aria-label="Close">${closeSvg}</button></div>
    ${body}
  </div>`;
}

IT.registerScreen('urge', { render: renderUrgeOverlay });

IT.registerActions({
  'urge-open': () => { urgeKind = 'scroll'; IT.openUrgeOverlay(); },
  'urge-close': () => IT.closeUrgeOverlay(),
  'urge-kind': (arg) => {
    urgeKind = arg;
    document.querySelectorAll('[data-action="urge-kind"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arg === arg)));
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
    if (u) {
      u.outcome = outcome; u.resolvedAt = new Date().toISOString(); IT.state.meta.updatedAt = Date.now();
      IT.save();
      IT.toast(outcome === 'rode' ? 'Rode it out. Logged.' : 'Logged.');
      IT.closeUrgeOverlay();
      IT.render();
    }
  },
});
})();
