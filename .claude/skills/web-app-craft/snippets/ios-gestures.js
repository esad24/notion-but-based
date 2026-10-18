/* iOS-style gestures for a vanilla-JS web app (touch events, no libraries).
 * Depends on app globals you must provide: narrow() (is phone layout), closeSheet/dismissMenu callbacks,
 * `drag` (drag-and-drop state, or null), MN (menu stack), toggleDone/removeTask, navCal, V() (current view).
 * Rename those to your app's equivalents. Read references/gestures.md first.
 */
// ---------- iOS-style gestures ----------
// Sheets: pull down from the top to close; while the keyboard is up, the first pull only hides it.
// Menus: swipe right to go back a level.
function sheetGestures(panel, {scroller, onClose, back}){
  let g = null;
  panel.addEventListener('touchstart', e => {
    if (!narrow() || e.touches.length > 1 || e.target.closest('.hdl,.sw-row,.swl,.segc')) { g = null; return; }
    const t = e.touches[0], sc = scroller();
    g = {x0:t.clientX, y0:t.clientY, dx:0, dy:0, mode:null, atTop:!sc || !sc.contains(e.target) || sc.scrollTop <= 0};
  }, {passive:true});
  panel.addEventListener('touchmove', e => {
    if (!g) return;
    const t = e.touches[0]; g.dx = t.clientX - g.x0; g.dy = t.clientY - g.y0;
    if (!g.mode) {
      if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) return;
      if (g.dy > 0 && g.dy > Math.abs(g.dx) && g.atTop) {
        const a = document.activeElement;
        if (a && panel.contains(a) && a.matches('input,textarea') && !/^(date|time|color)$/.test(a.type)) { a.blur(); g = null; return; }
        g.mode = 'close'; panel.style.transition = 'none';
      } else if (back && back.ok() && g.dx > 0 && g.dx > 2 * Math.abs(g.dy)) {
        g.mode = 'back'; g.el = scroller(); if (!g.el) { g = null; return; } g.el.style.transition = 'none';
      } else { g = null; return; }
    }
    if (e.cancelable) e.preventDefault();
    if (g.mode === 'close') panel.style.transform = `translateY(${Math.max(0, g.dy)}px)`;
    else g.el.style.transform = `translateX(${Math.max(0, g.dx)}px)`;
  }, {passive:false});
  const end = () => {
    const s = g; g = null;
    if (!s || !s.mode) return;
    if (s.mode === 'close') {
      panel.style.transition = '';
      if (s.dy > 100) { panel.style.transform = 'translateY(100%)'; onClose(); } else panel.style.transform = '';
    } else {
      s.el.style.transition = 'transform .2s ease-out';
      if (s.dx > 80) { s.el.style.transform = 'translateX(100%)'; setTimeout(back.go, 150); } else s.el.style.transform = '';
    }
  };
  panel.addEventListener('touchend', end); panel.addEventListener('touchcancel', end);
}
sheetGestures($('#sheet'), {scroller:() => $('#sheetBody'), onClose:closeSheet});

// swiping the page or a list hides the keyboard of a field outside sheets (like the search field)
let kd = null;
document.addEventListener('touchstart', e => {
  const a = document.activeElement;
  kd = a && a.matches && a.matches('input,textarea') && !a.contains(e.target) && !e.target.closest('#menu,#sheet,.searchbar') ? {y0:e.touches[0].clientY, a} : null;
}, {passive:true});
document.addEventListener('touchmove', e => { if (kd && Math.abs(e.touches[0].clientY - kd.y0) > 30) { kd.a.blur(); kd = null; } }, {passive:true});

// rows in lists swipe right to complete and left to delete (with Undo)
let sw = null;
document.addEventListener('touchstart', e => {
  const r = e.target.closest('.sw-row');
  sw = !r || e.touches.length > 1 || e.target.closest('.chk') ? null : {r, fg:r.querySelector('.row'), x0:e.touches[0].clientX, y0:e.touches[0].clientY, dx:0, axis:null};
}, {passive:true});
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const t = e.touches[0], dx = t.clientX - sw.x0, dy = t.clientY - sw.y0;
  if (!sw.axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    sw.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (sw.axis === 'x') { if (drag && !drag.started) { clearTimeout(drag.timer); drag = null; } sw.fg.style.transition = 'none'; }
  }
  if (sw.axis !== 'x' || (drag && drag.started)) return;
  sw.dx = dx; sw.fg.style.transform = `translateX(${dx}px)`;
  sw.r.classList.toggle('go-l', dx > 0); sw.r.classList.toggle('go-r', dx < 0);
  sw.r.classList.toggle('armed', Math.abs(dx) > 88);
}, {passive:true});
const swEnd = () => {
  const s = sw; sw = null;
  if (!s || s.axis !== 'x') return;
  s.fg.style.transition = '';
  const id = s.r.dataset.id;
  const after = fn => setTimeout(() => { fn(); if (MN.stack.length) redrawMenu(); }, 200);
  if (s.dx > 88) { s.fg.style.transform = ''; after(() => toggleDone(id)); }
  else if (s.dx < -88) { s.fg.style.transform = 'translateX(-105%)'; after(() => removeTask(id)); }
  else s.fg.style.transform = '';
  setTimeout(() => s.r.classList.remove('go-l', 'go-r', 'armed'), 280);
};
document.addEventListener('touchend', swEnd); document.addEventListener('touchcancel', swEnd);

// calendar: swipe left/right to change month, week or day
let cs = null;
$('#view').addEventListener('touchstart', e => {
  cs = V().type === 'calendar' && e.touches.length === 1 && e.target.closest('.grid,.tg,.dow') && !e.target.closest('.sw-row') ? {x0:e.touches[0].clientX, y0:e.touches[0].clientY} : null;
}, {passive:true});
$('#view').addEventListener('touchend', e => {
  const c = cs; cs = null;
  if (!c || (drag && drag.started)) return;
  const t = e.changedTouches[0], dx = t.clientX - c.x0, dy = t.clientY - c.y0;
  if (Math.abs(dx) > 60 && Math.abs(dx) > 1.6 * Math.abs(dy)) navCal(dx < 0 ? 1 : -1);
}, {passive:true});

