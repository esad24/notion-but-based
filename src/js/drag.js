// drag & drop: cards, list and table rows, calendar entries, board columns, table headers (mouse at once, touch after a hold)
// ---------- drag & drop (mouse drags at once; touch uses press-and-hold) ----------
let drag = null, raf = 0;
document.addEventListener('pointerdown', e => {
  if (e.button !== 0 || rsz) return;
  const rz = e.target.closest('[data-rz]');
  if (rz) {
    const ev = rz.closest('.tev'); e.preventDefault();
    drag = {resize:true, started:true, id:ev.dataset.id, el:ev, y0:e.clientY, h0:ev.offsetHeight};
    document.body.classList.add('is-dragging');
    return;
  }
  // hold a board column header and slide to reorder the columns
  const ch = e.target.closest('.col[data-o] > .col-h');
  if (ch && !e.target.closest('button')) {
    const col = ch.parentElement, r = col.getBoundingClientRect();
    drag = {colDrag:true, oid:col.dataset.o, el:col, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, started:false,
      touch:e.pointerType !== 'mouse', ox:e.clientX - r.left, oy:e.clientY - r.top, w:r.width, target:null, line:null};
    if (drag.touch) drag.timer = setTimeout(startDrag, 360);
    return;
  }
  // hold a table header and slide to move the column
  const th = e.target.closest('.th[data-prop]');
  if (th) {
    const r = th.getBoundingClientRect();
    drag = {thDrag:true, pid:th.dataset.prop, el:th, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, started:false,
      touch:e.pointerType !== 'mouse', ox:e.clientX - r.left, oy:e.clientY - r.top, w:r.width, target:null, line:null};
    if (drag.touch) drag.timer = setTimeout(startDrag, 360);
    return;
  }
  const el = e.target.closest('[data-drag]');
  if (!el || e.target.closest('button,input,textarea,a')) return;
  if (el.closest('.cal .grid') && narrow()) return;
  const r = el.getBoundingClientRect();
  drag = {id:el.dataset.id, el, x0:e.clientX, y0:e.clientY, x:e.clientX, y:e.clientY, started:false,
    touch:e.pointerType !== 'mouse', ox:e.clientX - r.left, oy:e.clientY - r.top, w:r.width, target:null, line:null, timed:el.classList.contains('tev')};
  if (drag.touch) drag.timer = setTimeout(startDrag, 360);
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  if (drag.resize) {
    const HH = hh(), t = S.tasks.get(drag.id), dp = P(V().dateProp); if (!t || !dp) return;
    const d = getV(t, dp);
    const mins = Math.max(15, Math.round((drag.h0 + e.clientY - drag.y0) / HH * 4) * 15);
    drag.mins = Math.min(mins, 1440 - toMin(d.t));
    drag.el.style.height = (drag.mins / 60 * HH - 2) + 'px';
    drag.el.querySelector('.tm').textContent = fmtT(d.t) + '–' + fmtT(fromMin(toMin(d.t) + drag.mins));
    return;
  }
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.started) {
    const dist = Math.hypot(drag.x - drag.x0, drag.y - drag.y0);
    if (drag.touch) { if (dist > 10) { clearTimeout(drag.timer); drag = null; } return; }
    if (dist < 5) return;
    startDrag();
  }
  moveDrag();
}, {passive:true});
document.addEventListener('touchmove', e => { if (drag && drag.started) e.preventDefault(); }, {passive:false});
document.addEventListener('pointerup', () => { if (drag && drag.resize) endResize(); else if (drag) endDrag(); });
document.addEventListener('pointercancel', () => {
  if (!drag) return;
  if (drag.resize) { drag.mins = null; endResize(); }
  else if (!drag.started) { clearTimeout(drag.timer); drag = null; }
  else cancelDrag();
});
function endResize(){
  const d = drag; drag = null;
  document.body.classList.remove('is-dragging');
  swallowClick();
  const t = S.tasks.get(d.id), dp = P(V().dateProp);
  if (!t || !dp || !d.mins) return render();
  const cur = getV(t, dp), end = fromMin(toMin(cur.t) + d.mins);
  if (end === cur.e) return render();
  const old = setVal(d.id, dp.id, {...cur, ed:cur.d, e:end});
  toast(`${fmtT(cur.t)}–${fmtT(end)}`, () => restore(old));
}
function startDrag(){
  if (!drag || !document.contains(drag.el)) { drag = null; return; }
  drag.started = true;
  const g = drag.el.cloneNode(true);
  g.classList.add('ghost'); g.style.width = drag.w + 'px';
  if (drag.colDrag) g.querySelectorAll('.card').forEach((c, i) => { if (i > 2) c.remove(); }); else g.style.height = drag.el.offsetHeight + 'px';
  if (drag.el.matches('.tr')) g.style.width = Math.min(drag.w, innerWidth - 24) + 'px';
  document.body.appendChild(g); drag.ghost = g;
  drag.el.classList.add('dragging'); document.body.classList.add('is-dragging');
  try { if (navigator.vibrate) navigator.vibrate(10); } catch {}
  if (drag.el.closest('#menu')) { $('#menu').style.opacity = '.3'; $('#menu').style.pointerEvents = 'none'; $('#mscrim').hidden = true; }
  moveDrag(); autoScroll();
}
function moveDrag(){
  const d = drag; if (!d || !d.ghost) return;
  d.ghost.style.left = (d.x - d.ox) + 'px'; d.ghost.style.top = (d.y - d.oy) + 'px';
  if (d.thDrag) {
    const tbl = $('#view .tbl'); if (!tbl) return;
    const ths = [...tbl.querySelectorAll('.tb-h > .th[data-prop]')], others = ths.filter(c => c !== d.el);
    const before = others.find(c => { const r = c.getBoundingClientRect(); return d.x < r.left + r.width / 2; }) || null;
    const ref = before || others[others.length - 1]; if (!ref) return;
    const rr = ref.getBoundingClientRect(), tr = tbl.getBoundingClientRect();
    if (!d.line) { d.line = document.createElement('div'); d.line.className = 'th-line'; tbl.appendChild(d.line); }
    d.line.style.left = ((before ? rr.left : rr.right) - tr.left - 1) + 'px';
    d.before = before ? before.dataset.prop : null; d.last = others.length ? others[others.length - 1].dataset.prop : null;
    return;
  }
  if (d.colDrag) {
    if (d.line) d.line.remove();
    const board = $('#view .board'); if (!board) return;
    const cols = [...board.querySelectorAll(':scope > .col[data-o]')].filter(c => c !== d.el);
    const before = cols.find(c => { const r = c.getBoundingClientRect(); return d.x < r.left + r.width / 2; }) || null;
    const line = document.createElement('div'); line.className = 'col-line';
    board.insertBefore(line, before || board.querySelector('.col-new')); d.line = line;
    d.before = before ? before.dataset.o : null; d.order = cols.map(c => c.dataset.o);
    return;
  }
  const under = document.elementFromPoint(d.x, d.y);
  let tgt = under && under.closest('[data-drop]');
  if (tgt && tgt.closest('#menu')) tgt = null;
  if (tgt !== d.target) { if (d.target) d.target.classList.remove('over'); d.target = tgt; if (tgt) tgt.classList.add('over'); }
  if (d.line) d.line.remove(); d.line = null; d.before = null; d.siblings = null;
  if (tgt && tgt.matches('.col, .lv-sec, .tbody')) {
    const body = tgt.matches('.tbody') ? tgt : tgt.querySelector('.col-body, .lv-g');
    const cards = [...body.querySelectorAll(':scope > .card, :scope > .sw-row, :scope > .tr')].filter(c => c !== d.el);
    const before = cards.find(c => { const r = c.getBoundingClientRect(); return d.y < r.top + r.height / 2; }) || null;
    const line = document.createElement('div'); line.className = 'drop-line';
    body.insertBefore(line, before); d.line = line; d.before = before ? before.dataset.id : null; d.siblings = cards.map(c => c.dataset.id);
  } else if (tgt && tgt.classList.contains('tg-col')) {
    const HH = hh(), t = S.tasks.get(d.id), dp = P(V().dateProp), dur = t && dp ? durOf(getV(t, dp)) : 60;
    const top = d.y - (d.timed ? d.oy : 0) - tgt.getBoundingClientRect().top;
    const m = Math.max(0, Math.min(Math.round(top / HH * 4) * 15, 1440 - 15));
    const hint = document.createElement('div'); hint.className = 'slot-hint';
    hint.style.top = (m / 60 * HH) + 'px'; hint.style.height = Math.max(dur / 60 * HH - 2, 18) + 'px';
    hint.textContent = fmtT(fromMin(m)) + '–' + fmtT(fromMin(m + dur));
    tgt.appendChild(hint); d.line = hint; d.slotMin = m;
  }
}
function autoScroll(){
  if (!drag || !drag.started) return;
  const v = $('#view'), x = v.querySelector('.hx') || v, y = v.querySelector('.vy') || v, r = v.getBoundingClientRect(), m = 60;
  const sp = dist => Math.ceil((m - Math.max(0, dist)) / 4);
  let moved = false;
  if (drag.x < r.left + m) { x.scrollLeft -= sp(drag.x - r.left); moved = true; } else if (drag.x > r.right - m) { x.scrollLeft += sp(r.right - drag.x); moved = true; }
  if (!drag.colDrag && !drag.thDrag) { if (drag.y < r.top + m) { y.scrollTop -= sp(drag.y - r.top); moved = true; } else if (drag.y > r.bottom - m) { y.scrollTop += sp(r.bottom - drag.y); moved = true; } }
  if (moved) moveDrag();
  raf = requestAnimationFrame(autoScroll);
}
function cleanupDrag(){
  cancelAnimationFrame(raf);
  if (!drag) return;
  clearTimeout(drag.timer);
  if (drag.ghost) drag.ghost.remove(); if (drag.line) drag.line.remove();
  if (drag.target) drag.target.classList.remove('over');
  drag.el.classList.remove('dragging'); document.body.classList.remove('is-dragging');
  $('#menu').style.opacity = ''; $('#menu').style.pointerEvents = '';
  const started = drag.started; drag = null;
  if (started) swallowClick();
}
function cancelDrag(){
  if (drag && drag.resize) { drag.mins = null; return endResize(); }
  const inMenu = drag && drag.el.closest('#menu'); cleanupDrag(); if (inMenu) closeMenu();
}
function endDrag(){
  const d = drag;
  if (!d.started) { clearTimeout(d.timer); drag = null; return; }
  const tgt = d.target, id = d.id, t = S.tasks.get(id), v = V();
  const fromMenu = !!d.el.closest('#menu');
  cleanupDrag();
  if (fromMenu) closeMenu();
  if (d.thDrag) {
    const ids = viewProps(v).map(p => p.id).filter(x => x !== d.pid);
    const at = d.before ? ids.indexOf(d.before) : d.last ? ids.indexOf(d.last) + 1 : ids.length;
    ids.splice(at < 0 ? ids.length : at, 0, d.pid);
    if (ids.join() !== viewProps(v).map(p => p.id).join()) { v.cols = ids; saveViews(); render(); }
    return;
  }
  if (d.colDrag) {
    const gp = P(v.groupBy); if (!gp || !d.order) return;
    const ids = d.order.slice(), i = d.before != null ? ids.indexOf(d.before) : ids.length;
    ids.splice(i, 0, d.oid);
    setGroupOrder(v, gp, ids);
    return;
  }
  if (!tgt || !t) return;
  const [kind, val] = tgt.dataset.drop.split(':');
  if (kind === 'grp') {
    const gp = P(v.groupBy); if (val !== '*' && !gp) return;
    const ids = d.siblings || [];
    const ordOf = x => { const o = S.tasks.get(x); return o ? (o.order ?? o.created) : 0; };
    const i = d.before ? ids.indexOf(d.before) : ids.length;
    const prev = i > 0 ? ordOf(ids[i - 1]) : null, next = i < ids.length ? ordOf(ids[i]) : null;
    const order = prev == null && next == null ? Date.now() : prev == null ? next - 1024 : next == null ? prev + 1024 : (prev + next) / 2;
    const np = {...(t.p || {})};
    if (val !== '*') { if (val) np[gp.id] = val; else delete np[gp.id]; }
    // a sorted view cannot show a hand-made order: turn the sort off (Undo brings it back)
    const sorts = (v.sorts || []).length && d.siblings && d.siblings.length ? v.sorts : null;
    if (sorts) { v.sorts = []; saveViews(); }
    const old = update(id, {p:np, order});
    const undo = () => { restore(old); if (sorts) { v.sorts = sorts; saveViews(); render(); } };
    if (val !== '*' && (getV(old, gp) || '') !== val) toast(`Moved to ${opt(gp, val)?.name || 'No ' + gp.name}${sorts ? ', sorting off' : ''}`, undo);
    else if (sorts) toast('Sorting turned off to keep your order', undo);
    return;
  }
  const dp = P(v.dateProp); if (!dp) return;
  const cur = getV(t, dp) || {d:'', t:'', e:''};
  if (kind === 'date') {
    if ((cur.d || '') === (val || '')) return;
    const ed = endDay(cur), shift = val && cur.d ? dayDiff(cur.d, val) : 0;
    const old = setVal(id, dp.id, val ? {...cur, d:val, ed:ed && cur.d ? addDays(ed, shift) : ''} : null);
    toast(val ? `Moved to ${relDate(val)}` : 'Date removed', () => restore(old));
  } else if (kind === 'slot') {
    const m = d.slotMin ?? 540, dur = durOf(cur), tm = fromMin(m), end = fromMin(Math.min(m + dur, 1439));
    if (cur.d === val && cur.t === tm) return;
    const old = setVal(id, dp.id, {d:val, t:tm, ed:val, e:end});
    toast(`Moved to ${relDate(val)} ${fmtT(tm)}`, () => restore(old));
  } else if (kind === 'allday') {
    if (cur.d === val && !cur.t) return;
    const span = cur.d && endDay(cur) ? dayDiff(cur.d, endDay(cur)) : 0;
    const old = setVal(id, dp.id, {d:val, t:'', ed:span > 0 ? addDays(val, span) : '', e:''});
    toast(`Moved to ${relDate(val)}, all day`, () => restore(old));
  }
}
