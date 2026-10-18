// property menus: edit property (name, type, options, view actions), type picker, new property
function propPage(pid, ctx = {}){
  let confirm = false, newOpt = '';
  return {title:'Edit property', render(c){
    const p = P(pid); if (!p) return closeMenu();
    const v = V(), ro = p.type === 'title';
    let html = grp(fldCell('pp-name', p.name, 'Property name'), 'Name');
    html += grp((ro ? `<div class="cell">${TI.title}<span class="cl">Type</span><span class="cv">Title</span></div>` : linkCell('id="pp-type"', 'Type', h(typeLabel(p.type)), TI[p.type] || ''))
      + (p.type === 'number' ? selCell('fmt', 'Format', FORMATS, p.fmt || '') : ''));
    if (HAS_OPTS(p.type)) {
      html += `<div class="grp-h">Options</div><div class="grp"><div id="pp-opts">${(p.options || []).map(o => `<div class="cell opt" data-key="${o.id}" role="button"><span class="hdl">${IC.grip}</span><span class="cl"><span class="tag${p.type === 'status' ? ' st' : ''} c-${o.color}">${h(o.name)}</span></span>${p.type === 'status' ? `<span class="cv">${(GROUPS.find(g => g[0] === (o.group || 'todo')) || [])[1]}</span>` : ''}${chev}</div>`).join('')}</div>${fldCell('pp-new', newOpt, 'Add an option')}</div>
        <div class="grp-f">Drag the grip to reorder. Tap an option to rename it or change its color.</div>`;
    }
    if (ctx.inView) {
      html += grp(actCell('data-a="asc"', 'Sort ascending', IC.up) + actCell('data-a="desc"', 'Sort descending', IC.down) + actCell('data-a="filter"', 'Filter by this', IC.filter)
        + (ro ? '' : actCell('data-a="hide"', 'Hide in this view', IC.eyeOff))
        + (ctx.fromTable ? actCell('data-a="insL"', 'Insert left', IC.insL) + actCell('data-a="insR"', 'Insert right', IC.insR) : ''), 'This view');
    }
    if (!ro) html += grp(actCell('data-a="dup"', 'Duplicate property', IC.copy) + actCell('data-a="del"', 'Delete property', IC.trash, 'danger'));
    c.innerHTML = html;
    const nm = c.querySelector('#pp-name');
    nm.addEventListener('input', () => { const x = P(pid); if (!x) return; x.name = nm.value || 'Untitled'; saveSchema(); render(); });
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') nm.blur(); });
    if (!ro) c.querySelector('#pp-type').addEventListener('click', () => pushMenu(typePage(pid)));
    bindControls(c, {sel:{fmt:val => { P(pid).fmt = val; saveSchema(); render(); }}});
    const ol = c.querySelector('#pp-opts');
    if (ol) {
      sortable(ol, keys => { const x = P(pid); x.options = keys.map(k => opt(x, k)).filter(Boolean); saveSchema(); render(); });
      ol.addEventListener('click', e => { const b = e.target.closest('.opt'); if (b && !e.target.closest('.hdl')) pushMenu(optionPage(pid, b.dataset.key)); });
      const ni = c.querySelector('#pp-new');
      ni.addEventListener('input', () => { newOpt = ni.value; });
      ni.addEventListener('keydown', e => {
        if (e.key !== 'Enter' || !ni.value.trim()) return;
        e.preventDefault(); addOption(P(pid), ni.value.trim()); newOpt = ''; render(); redrawMenu(); const n2 = $('#pp-new'); if (n2) n2.focus();
      });
    }
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, cv = V(), x = P(pid);
      if (a === 'asc' || a === 'desc') { cv.sorts = [{prop:pid, dir:a}]; saveViews(); render(); dismissMenu(); }
      else if (a === 'filter') { cv.filters = cv.filters || []; cv.filters.push(newRule(pid)); saveViews(); render(); MN.stack = [filtersPage()]; drawMenu(); }
      else if (a === 'hide') { cv.hidden = [...new Set([...(cv.hidden || []), pid])]; saveViews(); render(); dismissMenu(); }
      else if (a === 'insL' || a === 'insR') { MN.stack = [newPropPage(a === 'insL' ? {before:pid} : {after:pid})]; drawMenu(); }
      else if (a === 'dup') { duplicateProp(pid); dismissMenu(); }
      else if (a === 'del') {
        if (!confirm) { confirm = true; b.querySelector('.cl').textContent = 'Tap again to delete everywhere'; return; }
        deleteProp(pid); closeMenu(); if (S.openId) renderSheet();
      }
    });
    if (ctx.focus) { nm.focus(); nm.select(); }
  }};
}
function typePage(pid){
  return {title:'Type', render(c){
    const p = P(pid);
    c.innerHTML = grp(TYPES.map(([k, l]) => `<button class="cell" data-t="${k}">${TI[k]}<span class="cl">${l}</span>${p.type === k ? `<span class="ck">${IC.check}</span>` : ''}</button>`).join(''));
    c.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; changeType(pid, b.dataset.t); popMenu(); });
  }};
}
function newPropPage(pos = {}){
  return {title:'New property', render(c){
    c.innerHTML = grp(TYPES.map(([k, l]) => `<button class="cell" data-t="${k}">${TI[k]}<span class="cl">${l}</span></button>`).join(''), 'Choose a type');
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      const p = addProp(b.dataset.t, '', pos.after, pos.before);
      if (S.openId) renderSheet();
      MN.stack = [propPage(p.id, {focus:true, inView:true, fromTable:V().type === 'table'})]; MN.tall = true; drawMenu();
    });
  }};
}
