// page sheet (#sheet): open/close, render the open page, title/notes inputs
function autosize(el){ el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function setInput(el, v){ if (document.activeElement !== el && el.value !== (v || '')) el.value = v || ''; }
function openSheet(id, focusTitle){
  S.openId = id;
  const sh = $('#sheet'), sc = $('#scrim');
  sh.hidden = false; sc.hidden = false; sh.style.transform = '';
  renderSheet(); // after unhiding, so the title box can measure its height
  $('#sheetBody').scrollTop = 0;
  if (focusTitle) $('#f-title').focus({preventScroll:true}); // synchronous so the iPhone keyboard opens
  requestAnimationFrame(() => { sh.classList.add('show'); sc.classList.add('show'); });
}
function closeSheet(){
  const id = S.openId; if (!id) return;
  S.openId = null;
  if (S.drafts.has(id)) { S.tasks.delete(id); S.drafts.delete(id); }
  else if (timers.has(id)) persist(id, 0);
  const sh = $('#sheet'), sc = $('#scrim');
  sh.classList.remove('show'); sc.classList.remove('show');
  setTimeout(() => { if (!S.openId) { sh.hidden = true; sc.hidden = true; sh.style.transform = ''; } }, 260);
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  render();
}
function renderSheet(){
  const t = S.tasks.get(S.openId);
  if (!t) { closeSheet(); return; }
  const ti = $('#f-title'); setInput(ti, t.title); autosize(ti);
  setInput($('#f-body'), t.body);
  const html = S.schema.props.filter(p => p.type !== 'title').map(p => {
    const ro = p.type === 'created_time' || p.type === 'last_edited_time';
    const d = disp(p, t);
    return `<div class="pp"><button class="pn" data-act="propmenu" data-prop="${p.id}">${TI[p.type] || ''}<span>${h(p.name)}</span></button>
      <div class="pv${ro ? ' ro' : ''}" ${ro ? '' : `data-act="pedit" data-prop="${p.id}"`}>${p.type === 'checkbox' ? d : (d || '<span class="ph">Empty</span>')}</div></div>`;
  }).join('');
  const pp = $('#pprops'); if (pp.innerHTML !== html) pp.innerHTML = html;
}
$('#f-title').addEventListener('input', e => { autosize(e.target); update(S.openId, {title:e.target.value}, 400); });
$('#f-title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#f-body').focus(); } });
$('#f-body').addEventListener('input', e => update(S.openId, {body:e.target.value}, 600));
$('#scrim').addEventListener('click', closeSheet);
