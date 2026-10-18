// sortable(list, onDone): iOS-style reorder for settings lists. Grab the grip, or press and hold a row (touch) / drag it (mouse), then slide;
// the other rows make room with an animation and the list scrolls at its edges. onDone(keys) gets the new order.
let sorting = null;
const NO_SORT = 'input,select,textarea,a,.swsel,[data-f],.xbtn';
function sortable(list, onDone){
  list.addEventListener('pointerdown', e => {
    if (sorting || e.button > 0) return;
    const item = e.target.closest('[data-key]');
    if (!item || item.parentElement !== list || e.target.closest(NO_SORT)) return;
    const grip = !!e.target.closest('.hdl'), touch = e.pointerType !== 'mouse';
    if (!grip && list.dataset.grip === 'only') return;
    const s = sorting = {list, item, onDone, x0:e.clientX, y0:e.clientY, y:e.clientY, lifted:false, timer:0};
    if (grip) { e.preventDefault(); liftSort(); }
    else if (touch) s.timer = setTimeout(liftSort, 360);
  });
}
function liftSort(){
  const s = sorting; if (!s || !document.contains(s.item)) { sorting = null; return; }
  s.lifted = true;
  s.items = [...s.list.querySelectorAll(':scope > [data-key]')];
  s.i0 = s.idx = s.items.indexOf(s.item);
  s.sc = s.list.closest('.mc') || s.list.closest('.sheet-body') || document.scrollingElement;
  s.st0 = s.sc.scrollTop;
  const r = s.items.map(x => x.getBoundingClientRect());
  s.mid = r.map(x => x.top + x.height / 2);
  const next = r[s.i0 + 1] || r[s.i0 - 1];
  s.step = r[s.i0].height + (next ? Math.max(0, next.top > r[s.i0].top ? next.top - r[s.i0].bottom : r[s.i0].top - next.bottom) : 0);
  s.items.forEach(x => { if (x !== s.item) x.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)'; });
  s.item.classList.add('lifting'); document.body.classList.add('is-sorting');
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  moveSort(); scrollSort();
}
function moveSort(){
  const s = sorting; if (!s || !s.lifted) return;
  const dy = s.y - s.y0 + s.sc.scrollTop - s.st0, c = s.mid[s.i0] + dy;
  let idx = s.i0;
  // positions are compared as they were at lift time (scrolling is folded into dy)
  for (let j = 0; j < s.items.length; j++) {
    if (j < s.i0 && c < s.mid[j]) idx = Math.min(idx, j);
    if (j > s.i0 && c > s.mid[j]) idx = j;
  }
  s.idx = idx;
  s.items.forEach((x, j) => {
    if (x === s.item) return;
    const shift = j > s.i0 && j <= idx ? -s.step : j < s.i0 && j >= idx ? s.step : 0;
    x.style.transform = shift ? `translateY(${shift}px)` : '';
  });
  s.item.style.transform = `translateY(${dy}px) scale(1.02)`;
}
function scrollSort(){
  const s = sorting; if (!s || !s.lifted) return;
  const r = s.sc === document.scrollingElement ? {top:0, bottom:innerHeight} : s.sc.getBoundingClientRect(), m = 56;
  const v = s.y < r.top + m ? -Math.ceil((r.top + m - s.y) / 6) : s.y > r.bottom - m ? Math.ceil((s.y - r.bottom + m) / 6) : 0;
  if (v) { const b = s.sc.scrollTop; s.sc.scrollTop += v; if (s.sc.scrollTop !== b) moveSort(); }
  s.raf = requestAnimationFrame(scrollSort);
}
function endSort(cancel){
  const s = sorting; sorting = null; if (!s) return;
  clearTimeout(s.timer);
  if (!s.lifted) return;
  cancelAnimationFrame(s.raf);
  s.items.forEach(x => { x.style.transition = 'none'; x.style.transform = ''; });
  s.item.classList.remove('lifting'); document.body.classList.remove('is-sorting');
  if (!cancel && s.idx !== s.i0) s.list.insertBefore(s.item, s.idx > s.i0 ? s.items[s.idx].nextSibling : s.items[s.idx]);
  requestAnimationFrame(() => s.items.forEach(x => { x.style.transition = ''; }));
  swallowClick();
  if (!cancel && s.idx !== s.i0) s.onDone([...s.list.querySelectorAll(':scope > [data-key]')].map(x => x.dataset.key));
}
document.addEventListener('pointermove', e => {
  const s = sorting; if (!s) return;
  if (!s.lifted) {
    const d = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
    if (e.pointerType !== 'mouse') { if (d > 8) { clearTimeout(s.timer); sorting = null; } return; }
    if (d < 5) return;
    liftSort();
  }
  s.y = e.clientY; moveSort();
});
document.addEventListener('touchmove', e => { if (sorting && sorting.lifted && e.cancelable) e.preventDefault(); }, {passive:false});
document.addEventListener('pointerup', () => endSort(false));
document.addEventListener('pointercancel', () => endSort(!sorting || !sorting.lifted));
