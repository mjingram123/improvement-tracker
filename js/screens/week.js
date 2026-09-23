/* Improvement Tracker - Week screen (rates, not streaks). */
(() => {
'use strict';
const IT = window.IT;
const { esc, bannerSvg } = IT.ui;
const {
  LAPSES, RATINGS, DAY_NAMES,
  weekStats: weekStatsPure, weekStart, addDays, weekdayOf,
  allWeekKeys, fmtShort, fmtLong, backupDueDays, nightCardDone,
} = window.ITLogic;
// Until the Mind builder wires the <script> tag for logic-week.js into index.html,
// this can be undefined - every use below is gated so the screen still renders.
const WL = window.ITLogicWeek;

let weekCursor = null; // week start key being viewed

function weekStats(start) { return weekStatsPure(IT.state, start, IT.todayKey()); }
function backupDue() { return backupDueDays(IT.state, Date.now()); }

const chevronSvg = (dir) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}"/></svg>`;

function spark(vals) {
  const w = 314, h = 64, padX = 10, padY = 8;
  const pts = vals.map((v, i) => v == null ? null : [padX + (i * (w - 2 * padX)) / 6, h - padY - ((v - 1) / 4) * (h - 2 * padY)]);
  const segs = []; let cur = [];
  for (const p of pts) { if (p) cur.push(p); else { if (cur.length) segs.push(cur); cur = []; } }
  if (cur.length) segs.push(cur);
  const paths = segs.filter((s) => s.length > 1).map((s) => `<path d="M${s.map((p) => p.map((x) => x.toFixed(1)).join(',')).join('L')}" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const dots = pts.filter(Boolean).map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5" fill="var(--green)"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${paths}${dots}</svg>`;
}

// ---------- small multiples helper (single hue: --blue for every mark) ----------
function miniBars(items) {
  const max = Math.max(1, ...items.map((i) => i.n));
  return `<div class="mini-bars">${items.map((i) => `<div class="mini-bar-col"><div class="mini-bar-track"><div class="mini-bar-fill" style="height:${Math.max(6, Math.round((i.n / max) * 100))}%"></div></div><span class="mini-n">${i.n}</span><span class="mini-label">${esc(i.label)}</span></div>`).join('')}</div>`;
}

// ---------- W1: Patterns card ----------
function renderPatternsCard(today) {
  if (!WL) return '';
  const p = WL.patterns(IT.state, today);
  if (!p.ready) return `<section class="card"><h2>Patterns</h2><p class="muted small" style="margin-top:10px">${esc(p.message)}</p></section>`;

  const wordSection = LAPSES.map((l) => {
    const words = p.triggerWords[l.key];
    if (!words.length) return '';
    const tags = words.map((w) => `${esc(w.word)} <b>${w.count}</b>`).join(' · ');
    return `<div class="pattern-row"><span class="pattern-label">${esc(l.label)}</span><span class="pattern-value">${tags}</span></div>`;
  }).join('');
  const wordsBlock = wordSection ? `<div class="kicker-caps">Top triggers</div><div class="pattern-list">${wordSection}</div>` : '';

  const buckets = ['morning', 'afternoon', 'evening', 'late'];
  const bucketLabels = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', late: 'Late' };
  const bucketItems = buckets.map((b) => ({ label: bucketLabels[b], n: p.timeBuckets[b] }));
  const bucketsBlock = `<div class="kicker-caps">Urges by time of day</div>${miniBars(bucketItems)}`;

  const weekdayBlock = `<div class="kicker-caps">Slips by weekday</div>` + LAPSES.map((l) => {
    const items = DAY_NAMES.map((name, i) => ({ label: name, n: p.weekdaySlips[l.key][i] }));
    return `<div class="wd-row"><span class="wd-row-label">${esc(l.label)}</span>${miniBars(items)}</div>`;
  }).join('');

  const stripBlock = `<div class="kicker-caps">Last 4 weeks</div><div class="strip-grid">${p.fourWeekStrip.map((w) => `
    <div class="strip-block">
      <div class="strip-range">${esc(fmtShort(w.start))}</div>
      ${LAPSES.map((l) => `<div class="strip-stat">${esc(l.label)} ${w.lapses[l.key]}</div>`).join('')}
      <div class="strip-stat">Nights ${w.nights}</div>
      <div class="strip-stat">Avg ${w.avgRating == null ? '–' : w.avgRating.toFixed(1)}</div>
    </div>`).join('')}</div>`;

  return `<section class="card"><h2>Patterns</h2><div style="display:flex;flex-direction:column;gap:16px;margin-top:14px">
    ${wordsBlock}${bucketsBlock}${weekdayBlock}${stripBlock}
  </div></section>`;
}

function insightLine(text) { return text ? `<p class="meta insight">${esc(text)}</p>` : ''; }

// ---------- W2: Overall card ----------
function renderOverallCard(today) {
  if (!WL) return '';
  const lines = WL.overallLines(IT.state, today);
  return `<section class="card"><h2>Overall</h2><div style="display:flex;flex-direction:column;gap:4px;margin-top:10px">
    <p class="muted small">${esc(lines.porn)}</p><p class="muted small">${esc(lines.scroll)}</p>
  </div></section>`;
}

function renderWeek(ctx) {
  const today = IT.todayKey();
  if (!weekCursor || (ctx && ctx.entering)) weekCursor = weekStart(today);
  const start = weekCursor, end = addDays(start, 6);
  const cur = weekStats(start), prev = weekStats(addDays(start, -7));
  const isThis = start === weekStart(today);
  const title = `${fmtShort(start)} – ${fmtShort(end)}`;

  const rate = (label, val, n, opts = {}) => {
    const pct = n ? (val / n) * 100 : 0;
    const cmp = opts.prev == null ? '' : `<span class="cmp">last week ${opts.prev}${opts.prevN != null ? ' of ' + opts.prevN : ''}</span>`;
    return `<div class="stat"><div class="line"><span>${esc(label)}</span><span class="val">${val}${n != null ? ` <span class="muted">of ${n}</span>` : ''}</span></div>
      ${n != null ? `<div class="bar"><i style="width:${pct.toFixed(0)}%"></i></div>` : ''}${cmp}</div>`;
  };

  const nav = `<div class="weeknav"><button type="button" data-action="week-nav" data-arg="-1" aria-label="Previous week">${chevronSvg('l')}</button>
    <div class="weeklabel">${title}</div>
    <button type="button" data-action="week-nav" data-arg="1" aria-label="Next week" ${isThis ? 'disabled' : ''}>${chevronSvg('r')}</button></div>`;
  const why = IT.state.settings.intentions.why;
  const whyLine = why && why.trim() ? `<div class="meta" style="text-align:center;padding:0 4px">${esc(why)}</div>` : '';

  const needBackup = backupDue();
  const banner = needBackup ? `<div class="banner">${bannerSvg}No backup in ${needBackup} days. Make one in More, it takes ten seconds.</div>` : '';

  // Patterns and Overall are both relative to today (like the old porn line was),
  // not to the navigated week, so they render the same regardless of which week
  // is on screen.
  const patternsCard = renderPatternsCard(today);
  const overallCard = renderOverallCard(today);

  if (cur.n === 0) return `<div class="screen-14">${nav}${whyLine}${banner}${patternsCard}<section class="card"><p class="muted">Nothing logged yet for this week.</p></section>${overallCard}</div>`;

  const insights = WL ? WL.insights(IT.state, start, today) : { slips: null, mindset: null };

  let slips = `<section class="card"><h2>Slips</h2>${insightLine(insights.slips)}<div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">`;
  for (const l of LAPSES) slips += rate(l.label, cur.lapses[l.key], cur.n, { prev: prev.logged ? prev.lapses[l.key] : null, prevN: prev.logged ? prev.n : null });
  slips += `<div class="card-divider"></div>
    <div style="font-size:0.9375rem">Urges ridden out: <span style="font-weight:600;color:var(--green-700)">${cur.rode} rode · ${cur.gave} gave in</span></div></div></section>`;

  let showed = `<section class="card"><h2>How I showed up</h2>${insightLine(insights.mindset)}<div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">${spark(cur.dayAvg)}
    <div class="spark-days">${allWeekKeys(start).map((k, i) => `<div><b>${cur.dayAvg[i] == null ? '·' : cur.dayAvg[i].toFixed(1)}</b><span>${DAY_NAMES[weekdayOf(k)]}</span></div>`).join('')}</div>
    <div class="card-divider"></div>`;
  for (const r of RATINGS) {
    const v = cur.ratingAvg[r.key], p = prev.ratingAvg[r.key];
    showed += `<div class="dim-row"><span class="label">${esc(r.label)}</span><span class="this">${v == null ? '–' : v.toFixed(1)}</span><span class="last">${p != null ? 'last ' + p.toFixed(1) : ''}</span></div>`;
  }
  showed += `</div></section>`;

  const nightCheckins = cur.keys.filter((k) => IT.state.days[k] && nightCardDone(IT.state.days[k])).length;
  let routines = `<section class="card"><h2>Routines</h2><div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">`;
  if (WL) {
    const r = WL.routines(IT.state, start, today);
    routines += rate('Morning done', r.morning.n, r.morning.m);
  }
  routines += rate('Wind-down done', cur.windDown, cur.n, { prev: prev.logged ? prev.windDown : null, prevN: prev.logged ? prev.n : null });
  routines += rate('Night check-ins', nightCheckins, cur.n);
  routines += `<div class="stat"><div class="line"><span>Gym</span><span class="val">${cur.gym} times</span></div></div>`;
  if (cur.dinnerPossible) routines += rate('Dinner out', cur.dinner, cur.dinnerPossible);
  routines += `</div></section>`;

  const entries = cur.keys.slice().reverse().map((k) => {
    const d = IT.state.days[k]; if (!d) return '';
    const notes = LAPSES.filter((l) => d.lapses[l.key] && d.lapseNotes[l.key]).map((l) => `<div class="note">before ${l.key === 'scroll' ? 'scrolling' : l.key === 'nag' ? 'nagging' : 'porn'}: ${esc(d.lapseNotes[l.key])}</div>`).join('');
    if (!d.note && !notes) return '';
    return `<div class="entry"><div class="d">${esc(fmtLong(k))}</div>${d.note ? `<div class="q">${esc(d.note)}</div>` : ''}${notes}</div>`;
  }).join('');
  const journal = `<section class="card"><h2>Journal</h2><div style="display:flex;flex-direction:column;gap:14px;margin-top:14px">${entries || '<p class="muted small">Nothing written yet.</p>'}</div></section>`;

  return `<div class="screen-14">${nav}${whyLine}${banner}${patternsCard}${slips}${showed}${routines}${journal}${overallCard}</div>`;
}

IT.registerScreen('week', { render: renderWeek });
IT.registerActions({
  'week-nav': (arg) => { weekCursor = addDays(weekCursor, 7 * Number(arg)); IT.render(); window.scrollTo(0, 0); },
});
})();
