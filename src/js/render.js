// render loop: render() (rAF) / renderNow() rebuild #view, keep scroll; header tabs and chips; shared emptyState, groupTasks
let rq = 0, resetX = false, navAnim = 0;
function render(){ if (!rq) rq = requestAnimationFrame(() => { rq = 0; renderNow(); }); }
function renderNow(){
  if (drag && drag.started) { setTimeout(render, 150); return; }
  renderBar(); customCss(); applyST();
  const v = V(), list = visible(v), el = $('#view');
  const vy0 = el.querySelector('.vy');
  const keepX = resetX ? 0 : (el.querySelector('.hx') || {}).scrollLeft || 0, keepY = resetX || !vy0 ? 0 : vy0.scrollTop;
  resetX = false;
  el.className = 'v-' + v.type;
  el.innerHTML = v.type === 'board' ? renderBoard(v, list) : v.type === 'calendar' ? renderCalendar(v, list) : v.type === 'list' ? renderList(v, list) : renderTable(v, list);
  const hx = el.querySelector('.hx'); if (hx) hx.scrollLeft = keepX;
  const vy = el.querySelector('.vy'); if (vy) vy.scrollTop = keepY;
  $('#bcount').textContent = list.length === 1 ? '1 page' : list.length + ' pages';
  if (navAnim) {
    const g = el.querySelector('.grid, .tg-body');
    if (g && g.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) g.animate([{transform:`translateX(${navAnim * 36}px)`, opacity:.25}, {transform:'none', opacity:1}], {duration:240, easing:'cubic-bezier(.2,.8,.2,1)'});
    navAnim = 0;
  }
  if (S.openId) renderSheet();
  if (scrollToMorning && v.type === 'calendar') {
    scrollToMorning = false;
    const body = el.querySelector('.tg-body'), top = el.querySelector('.tg-top');
    if (body) el.scrollTop += body.getBoundingClientRect().top - el.getBoundingClientRect().top + 7 * hh() - (top ? top.offsetHeight : 0) - 8;
  }
}
function renderBar(){
  const v = V();
  const tabs = S.views.map(x => `<button class="vtab" data-act="tab" data-v="${x.id}" aria-current="${x.id === v.id}">${layoutIcon(x.type)}<span>${h(x.name)}</span></button>`).join('')
    + `<button class="vtab plus" data-act="addview" aria-label="Add view" title="Add view">${IC.plus}</button>`;
  const vt = $('#vtabs'); if (vt.innerHTML !== tabs) vt.innerHTML = tabs;
  $('#fbtn').classList.toggle('on', (v.filters || []).some(ruleReady));
  $('#sbtn').classList.toggle('on', !!(v.sorts || []).length);
  const chips = (v.sorts || []).filter(s => P(s.prop)).map(s => `<button class="fchip" data-act="sorts">${s.dir === 'desc' ? IC.down : IC.up}${h(P(s.prop).name)}</button>`)
    .concat((v.filters || []).filter(f => P(f.prop)).map(f => `<button class="fchip" data-act="filters">${h(condLabel(f))}</button>`));
  const cb = $('#chipbar'), html = chips.join('');
  if (cb.innerHTML !== html) cb.innerHTML = html;
}

const emptyState = () => `<div class="blank"><b>${S.tasks.size ? 'No pages match' : 'No pages yet'}</b>${S.tasks.size ? 'Change the search or filters to see more.' : 'Tap “New page” to add the first one.'}</div>`;
// groups for board and list views, honoring hidden and empty groups
function groupTasks(v, gp, list){
  const groups = new Map((gp.options || []).map(o => [o.id, []])); groups.set('', []);
  for (const t of list) { const g = getV(t, gp); (groups.has(g) ? groups.get(g) : groups.get('')).push(t); }
  const hid = new Set(v.hiddenGroups || []);
  const opts = (gp.options || []).filter(o => !hid.has(o.id) && !(v.hideEmpty && !groups.get(o.id).length));
  const none = v.showNone !== false && groups.get('').length > 0;
  return {groups, opts, none};
}
