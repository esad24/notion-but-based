// calendar view: scopes and navigation, month grid + agenda, time grid with overlap lanes, now-line
const SCOPES = [{v:'month',l:'Month'},{v:'week',l:'Week'},{v:'3day',l:'3 days'},{v:'day',l:'Day'}];
const hh = () => narrow() ? 44 : 48;
let scrollToMorning = false;
const scopeOf = v => v.scope || 'month';
function calRange(v){
  const sc = scopeOf(v);
  if (sc === 'week') return {start:weekStart(S.sel), n:7};
  return {start:S.sel, n:sc === '3day' ? 3 : 1};
}
function calTitle(v){
  if (scopeOf(v) === 'month') return S.month.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  const {start, n} = calRange(v), a = parseKey(start), b = parseKey(addDays(start, n - 1));
  if (n === 1) return a.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
  return `${a.toLocaleDateString('en-US', {month:'short', day:'numeric'})} – ${b.toLocaleDateString('en-US', a.getMonth() === b.getMonth() ? {day:'numeric'} : {month:'short', day:'numeric'})}, ${b.getFullYear()}`;
}
function navCal(d){
  navAnim = -d;
  const v = V(), sc = scopeOf(v);
  if (sc === 'month') S.month = new Date(S.month.getFullYear(), S.month.getMonth() + d, 1);
  else {
    S.sel = addDays(S.sel, d * (sc === 'week' ? 7 : sc === '3day' ? 3 : 1));
    const s = parseKey(S.sel); S.month = new Date(s.getFullYear(), s.getMonth(), 1);
  }
  render();
}
function goToday(){
  const t = new Date(); S.month = new Date(t.getFullYear(), t.getMonth(), 1); S.sel = todayKey();
  scrollToMorning = scopeOf(V()) !== 'month'; render();
}
function setScope(sc){
  const v = V(); if (v.type !== 'calendar' || !SCOPES.some(x => x.v === sc)) return;
  v.scope = sc; saveViews();
  const s = parseKey(S.sel); S.month = new Date(s.getFullYear(), s.getMonth(), 1);
  scrollToMorning = sc !== 'month'; render();
}
function renderCalendar(v, list){
  const dp = P(v.dateProp);
  if (!dp || dp.type !== 'date') return `<div class="blank"><b>Pick a date property</b>The calendar places pages by a Date property.<button class="btn" data-act="settings">Open view settings</button></div>`;
  const byDay = new Map(); let undated = 0;
  const put = (k, t) => (byDay.get(k) || byDay.set(k, []).get(k)).push(t);
  for (const t of list) {
    const d = getV(t, dp); if (!d || !d.d) { undated++; continue; }
    const n = Math.min(Math.max(dayDiff(d.d, lastDay(d)), 0), 366);
    for (let i = 0; i <= n; i++) put(i ? addDays(d.d, i) : d.d, t);
  }
  const ctx = {dp, shown:shownProps(v).filter(p => p.id !== dp.id && p.type !== 'title')};
  const head = `<div class="cal-h"><h2>${h(calTitle(v))}</h2>
      <button class="ibtn" data-act="calnav" data-d="-1" aria-label="Previous">${IC.left}</button>
      <button class="pillbtn" data-act="today">Today</button>
      <button class="ibtn" data-act="calnav" data-d="1" aria-label="Next">${IC.right}</button>
      <span class="spacer"></span>
      <div class="seg" role="group" aria-label="Range">${SCOPES.map(x => `<button data-act="scope" data-v="${x.v}" aria-pressed="${scopeOf(v) === x.v}">${x.l}</button>`).join('')}</div>
      <button class="pillbtn" data-act="undated" data-drop="date:">${IC.inbox}No date <span class="n">${undated}</span></button></div>`;
  return `<div class="cal">${head}${scopeOf(v) === 'month' ? renderMonth(byDay, ctx) : renderTimeGrid(v, byDay, ctx)}</div>`;
}
const calOrd = dp => (a, b) => { const x = (getV(a, dp).t || '99'), y = (getV(b, dp).t || '99'); return x < y ? -1 : x > y ? 1 : (a.order ?? a.created) - (b.order ?? b.created); };
function evHtml(t, ctx){
  const c = rowColor(t) || 'none', d = getV(t, ctx.dp);
  const meta = ctx.shown.filter(p => p.type !== 'checkbox').map(p => disp(p, t)).filter(Boolean).join('');
  return `<div class="ev c-${c}${isDone(t) ? ' done' : ''}" data-id="${t.id}" data-drag title="${h(t.title)}">
    <div class="t-title">${h(t.title) || 'Untitled'}</div>
    ${d.t || meta ? `<div class="ev-meta">${d.t ? `<span class="time">${h(fmtT(d.t))}</span>` : ''}${meta}</div>` : ''}</div>`;
}
function renderMonth(byDay, ctx){
  const m = S.month, y = m.getFullYear(), mo = m.getMonth();
  const lead = (new Date(y, mo, 1).getDay() - WS() + 7) % 7, days = new Date(y, mo + 1, 0).getDate();
  const weeks = Math.ceil((lead + days) / 7), today = todayKey(), ord = calOrd(ctx.dp);
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(y, mo, 1 - lead + i), k = keyOf(d);
    const items = (byDay.get(k) || []).sort(ord);
    cells += `<div class="day${d.getMonth() !== mo ? ' out' : ''}${k === today ? ' today' : ''}${k === S.sel ? ' sel' : ''}" data-drop="date:${k}" data-day="${k}">
      <div class="day-h"><button class="day-add" data-act="new" data-date="${k}" aria-label="Add on ${k}">${IC.plus}</button><span class="num">${d.getDate()}</span></div>
      <div class="day-items">${items.map(t => evHtml(t, ctx)).join('')}</div></div>`;
  }
  const selItems = (byDay.get(S.sel) || []).sort(ord);
  const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], ws = WS();
  return `<div class="dow">${dn.slice(ws).concat(dn.slice(0, ws)).map(d => `<div>${d}</div>`).join('')}</div><div class="grid">${cells}</div>
    <div class="agenda"><h3><span>${h(parseKey(S.sel).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'}))}</span><button class="tbtn" data-act="new" data-date="${S.sel}">+ Add</button></h3>
      <div class="list">${selItems.length ? selItems.map(t => rowHtml(t, ctx)).join('') : '<div class="empty">Nothing planned for this day.</div>'}</div></div>`;
}
function layoutLanes(items){
  items.sort((a, b) => a.s - b.s || b.e - a.e);
  const out = []; let cluster = [], end = -1;
  const flush = () => {
    const cols = [];
    for (const it of cluster) { let i = cols.findIndex(e => e <= it.s); if (i < 0) { i = cols.length; cols.push(0); } cols[i] = it.e; it.lane = i; }
    cluster.forEach(it => { it.lanes = cols.length; }); out.push(...cluster); cluster = [];
  };
  for (const it of items) { if (cluster.length && it.s >= end) flush(); cluster.push(it); end = Math.max(end, it.e); }
  if (cluster.length) flush();
  return out;
}
function renderTimeGrid(v, byDay, ctx){
  const {start, n} = calRange(v), HH = hh(), today = todayKey(), ord = calOrd(ctx.dp);
  const days = Array.from({length:n}, (_, i) => addDays(start, i));
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const dh = days.map(k => { const d = parseKey(k); return `<div class="tg-dh${k === today ? ' today' : ''}" data-act="dayview" data-day="${k}">${d.toLocaleDateString('en-US', {weekday:'short'})}<b>${d.getDate()}</b></div>`; }).join('');
  const all = days.map(k => `<div class="tg-allc" data-drop="allday:${k}" data-day="${k}">${(byDay.get(k) || []).filter(t => { const d = getV(t, ctx.dp); return !(d.t && sameDay(d)); }).sort(ord).map(t => evHtml(t, ctx)).join('')}</div>`).join('');
  let hours = ''; for (let i = 1; i < 24; i++) hours += `<span style="top:${i * HH}px">${ST().time24 !== false ? pad(i) + ':00' : (i % 12 || 12) + (i < 12 ? ' AM' : ' PM')}</span>`;
  const cols = days.map(k => {
    const timed = (byDay.get(k) || []).filter(t => { const d = getV(t, ctx.dp); return d.t && sameDay(d); }).map(t => { const d = getV(t, ctx.dp), s = toMin(d.t); return {t, d, s, e:s + Math.max(durOf(d), 20)}; });
    return `<div class="tg-col${k === today ? ' today' : ''}" data-drop="slot:${k}" data-day="${k}">${layoutLanes(timed).map(x => tevHtml(x, HH)).join('')}${k === today ? `<div class="nowline" style="top:${nowMin / 60 * HH}px"></div>` : ''}</div>`;
  }).join('');
  return `<div class="tg" style="--n:${n};--hh:${HH}px">
    <div class="tg-top"><div class="tg-row"><div class="gut"></div>${dh}</div><div class="tg-row tg-all"><div class="gut">all-day</div>${all}</div></div>
    <div class="tg-row tg-body"><div class="gut">${hours}</div>${cols}</div></div>`;
}
function tevHtml(x, HH){
  const t = x.t, c = rowColor(t) || 'none';
  const top = x.s / 60 * HH, hgt = Math.max((x.e - x.s) / 60 * HH - 2, 18);
  return `<div class="tev c-${c}${isDone(t) ? ' done' : ''}" data-id="${t.id}" data-drag style="top:${top}px;height:${hgt}px;left:calc(${x.lane / x.lanes * 100}% + 2px);width:calc(${100 / x.lanes}% - 4px)">
    <div class="t-title">${h(t.title) || 'Untitled'}</div><div class="tm">${h(fmtT(x.d.t))}${x.d.e ? '–' + h(fmtT(x.d.e)) : ''}</div><div class="rz" data-rz></div></div>`;
}
