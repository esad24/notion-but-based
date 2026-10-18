// menu stack (#menu): openMenu/pushMenu/popMenu/closeMenu/dismissMenu, popover vs bottom sheet, keyboard inset; sortable()
const MN = {stack:[], rect:null, onClose:null, tall:false, tok:0};
function openMenu(anchor, page, onClose){
  closeMenu();
  MN.rect = anchor ? anchor.getBoundingClientRect() : null; MN.stack = [page]; MN.onClose = onClose || null; MN.tall = false;
  const m = $('#menu'); m.hidden = false; $('#mscrim').hidden = false;
  drawMenu();
  if (narrow()) { m.classList.add('enter'); requestAnimationFrame(() => requestAnimationFrame(() => m.classList.remove('enter'))); }
}
function pushMenu(page){ MN.stack.push(page); drawMenu(); }
function popMenu(){ MN.stack.pop(); if (!MN.stack.length) return closeMenu(); drawMenu(); }
function redrawMenu(){ if (MN.stack.length) { const sc = $('#menu .mc')?.scrollTop || 0; drawMenu(); const c = $('#menu .mc'); if (c) c.scrollTop = sc; } }
function closeMenu(){
  MN.tok++;
  if (!MN.stack.length && $('#menu').hidden) return false;
  $('#menu').hidden = true; $('#mscrim').hidden = true; $('#mscrim').classList.remove('fade'); $('#menu').innerHTML = ''; $('#menu').style.transform = ''; $('#menu').style.transition = '';
  MN.stack = []; MN.tall = false;
  // unfinished filters (no value picked) are dropped when the menu closes
  const cv = V();
  if ((cv.filters || []).some(f => !ruleReady(f))) { cv.filters = cv.filters.filter(ruleReady); saveViews(); render(); }
  const f = MN.onClose; MN.onClose = null; if (f) f();
  return true;
}
// animated close for phones (slides the sheet down); immediate on desktop
function dismissMenu(){
  if (!MN.stack.length) return;
  if (!narrow()) return closeMenu();
  const m = $('#menu'), tok = ++MN.tok;
  m.style.transition = ''; m.style.transform = 'translateY(100%)'; $('#mscrim').classList.add('fade');
  setTimeout(() => { if (MN.tok === tok) closeMenu(); }, 260);
}
function drawMenu(){
  customCss();
  const m = $('#menu'), pg = MN.stack[MN.stack.length - 1], deep = MN.stack.length > 1;
  if (pg.tall) MN.tall = true;
  m.className = 'menu' + (pg.wide ? ' wide' : '') + (MN.tall && narrow() ? ' tall' : '');
  m.style.transform = ''; m.style.transition = '';
  const showHead = deep || pg.title || narrow();
  m.innerHTML = (showHead ? `<div class="mhead">${narrow() ? '<span class="grab"></span>' : ''}${deep ? `<button class="mback" data-m="back">${IC.left}<span>Back</span></button>` : ''}<span class="mt">${h(pg.title || '')}</span>${narrow() ? '<button class="mdone" data-m="close">Done</button>' : ''}</div>` : '') + '<div class="mc"></div>';
  pg.render(m.querySelector('.mc'));
  placeMenu();
}
function placeMenu(){
  const m = $('#menu');
  if (narrow()) { m.style.left = m.style.top = ''; return; }
  if (!MN.rect) { m.style.left = Math.max(8, (innerWidth - m.offsetWidth) / 2) + 'px'; m.style.top = '80px'; return; }
  const r = MN.rect, mw = m.offsetWidth, mh = m.offsetHeight;
  let top = r.bottom + 4; if (top + mh > innerHeight - 8) top = Math.max(8, Math.min(r.top - mh - 4, innerHeight - mh - 8));
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - mw - 8)) + 'px'; m.style.top = top + 'px';
}
$('#mscrim').addEventListener('click', dismissMenu);
$('#menu').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  if (b.dataset.m === 'back') popMenu(); else if (b.dataset.m === 'close') dismissMenu();
});
// typing in a sheet grows it to full height so the keyboard never covers the field
$('#menu').addEventListener('focusin', e => {
  if (narrow() && e.target.matches('input:not([type="date"]):not([type="time"]):not([type="color"]),textarea') && !MN.tall) { MN.tall = true; $('#menu').classList.add('tall'); }
});
sheetGestures($('#menu'), {scroller:() => $('#menu .mc'), onClose:dismissMenu, back:{ok:() => MN.stack.length > 1, go:popMenu}});
// keep sheets above the iPhone keyboard
if (window.visualViewport) {
  const vv = window.visualViewport;
  const f = () => document.documentElement.style.setProperty('--kb', Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px');
  vv.addEventListener('resize', f); vv.addEventListener('scroll', f);
}

// small list sorter used for properties, options and color rules (drag the grip)
function sortable(list, onDone){
  list.addEventListener('pointerdown', e => {
    const hd = e.target.closest('.hdl'); if (!hd) return;
    const item = hd.closest('[data-key]'); if (!item) return;
    e.preventDefault(); hd.setPointerCapture(e.pointerId); item.classList.add('lifting');
    const move = ev => {
      const y = ev.clientY;
      const sibs = [...list.querySelectorAll(':scope > [data-key]')].filter(s => s !== item);
      const before = sibs.find(s => { const r = s.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (before) { if (item.nextElementSibling !== before) list.insertBefore(item, before); }
      else if (list.lastElementChild !== item) list.appendChild(item);
    };
    const up = () => {
      hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
      item.classList.remove('lifting');
      onDone([...list.querySelectorAll(':scope > [data-key]')].map(x => x.dataset.key));
    };
    hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
  });
}
