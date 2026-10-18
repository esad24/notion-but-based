// resizing by dragging an edge: table columns (widths per view) and the all-day area of the time grid
let rsz = null;
document.addEventListener('pointerdown', e => {
  const r = e.target.closest('[data-rs]'); if (!r) return;
  e.preventDefault(); e.stopPropagation();
  const v = V(), p = P(r.dataset.rs);
  rsz = {v, p, x0:e.clientX, w0:colW(v, p), k:+r.dataset.k, w:colW(v, p)};
  r.classList.add('on'); r.setPointerCapture(e.pointerId);
  const props = shownProps(v);
  const move = ev => { rsz.w = Math.max(70, Math.round(rsz.w0 + ev.clientX - rsz.x0)); v.widths = {...(v.widths || {}), [p.id]:rsz.w}; colCss(v, props); };
  const up = () => {
    r.removeEventListener('pointermove', move); r.removeEventListener('pointerup', up); r.removeEventListener('pointercancel', up);
    r.classList.remove('on');
    rsz.v.widths = {...(rsz.v.widths || {}), [rsz.p.id]:rsz.w}; saveViews();
    swallowClick(); rsz = null;
  };
  r.addEventListener('pointermove', move); r.addEventListener('pointerup', up); r.addEventListener('pointercancel', up);
}, true);

// the all-day area of the time grid resizes by its bottom edge; it never grows past its content or 60% of the screen
document.addEventListener('pointerdown', e => {
  const r = e.target.closest('[data-adrs]'); if (!r) return;
  e.preventDefault(); e.stopPropagation();
  const w = r.previousElementSibling, inner = w.firstElementChild, y0 = e.clientY, h0 = w.offsetHeight;
  const max = Math.min(inner.offsetHeight, innerHeight * .6);
  let hgt = h0;
  r.classList.add('on'); r.setPointerCapture(e.pointerId); rsz = {ad:true};
  const move = ev => { hgt = Math.round(Math.max(30, Math.min(max, h0 + ev.clientY - y0))); w.style.setProperty('--adh', hgt + 'px'); };
  const up = () => {
    r.removeEventListener('pointermove', move); r.removeEventListener('pointerup', up); r.removeEventListener('pointercancel', up);
    r.classList.remove('on'); rsz = null; swallowClick();
    const v = V(); v.allDay = {...adState(v), h:hgt}; saveViews();
  };
  r.addEventListener('pointermove', move); r.addEventListener('pointerup', up); r.addEventListener('pointercancel', up);
}, true);
