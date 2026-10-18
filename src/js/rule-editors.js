// filter, sort and conditional color pages (rule rows bound to an array)
const condVal = (p, val) => {
  if (!p) return '';
  if (HAS_OPTS(p.type)) return `<select data-f="val" aria-label="Value"><option value="">Choose…</option>${(p.options || []).map(o => `<option value="${o.id}"${o.id === val ? ' selected' : ''}>${h(o.name)}</option>`).join('')}</select>`;
  if (IS_DATEISH(p.type)) return `<input type="date" data-f="val" value="${h(val || '')}" aria-label="Date">`;
  if (p.type === 'number') return `<input data-f="val" inputmode="decimal" value="${h(val ?? '')}" placeholder="Value" aria-label="Value" enterkeyhint="done">`;
  return `<input data-f="val" value="${h(val ?? '')}" placeholder="Value" autocomplete="off" aria-label="Value" enterkeyhint="done">`;
};
function condRow(c, i, withColor){
  const p = P(c.prop), ops = opsFor(p ? p.type : 'text'), op = ops.find(o => o[0] === c.op) || ops[0];
  return `<div class="grp"${withColor ? ` data-key="${c.id}"` : ''}><div class="rule" data-i="${i}">
    ${withColor ? `<span class="hdl">${IC.grip}</span><button class="swsel c-${c.color}" data-f="color" title="Color: ${colorName(c.color)}" aria-label="Color: ${colorName(c.color)}"></button>` : ''}
    <select data-f="prop" aria-label="Property">${S.schema.props.map(pp => `<option value="${pp.id}"${pp.id === c.prop ? ' selected' : ''}>${h(pp.name)}</option>`).join('')}</select>
    <select data-f="op" aria-label="Condition">${ops.map(o => `<option value="${o[0]}"${o[0] === op[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select>
    ${op[2] ? condVal(p, c.val) : ''}
    <button class="ibtn" data-f="del" aria-label="Remove">${IC.trash}</button></div></div>`;
}
function bindRules(c, arr, save){
  let t = 0;
  c.addEventListener('change', e => {
    const f = e.target.dataset.f, row = e.target.closest('.rule'); if (!f || !row) return;
    const r = arr()[+row.dataset.i]; if (!r) return;
    if (f === 'prop') { r.prop = e.target.value; r.op = opsFor(P(r.prop).type)[0][0]; r.val = ''; save(); redrawMenu(); }
    else if (f === 'op') { r.op = e.target.value; const o = opsFor(P(r.prop).type).find(x => x[0] === r.op); if (!o[2]) r.val = ''; save(); redrawMenu(); }
    else if (f === 'val') { r.val = e.target.value; save(); }
  });
  c.addEventListener('input', e => {
    if (e.target.dataset.f !== 'val' || e.target.tagName !== 'INPUT' || e.target.type === 'date') return;
    const r = arr()[+e.target.closest('.rule').dataset.i]; if (!r) return; r.val = e.target.value;
    clearTimeout(t); t = setTimeout(save, 200);
  });
  c.addEventListener('click', e => {
    const sw = e.target.closest('[data-f="color"]');
    if (sw) { const i = +sw.closest('.rule').dataset.i; return pushMenu(colorPickPage(arr()[i].color, k => { const r = arr()[i]; if (r) { r.color = k; save(); } })); }
    const b = e.target.closest('[data-f="del"]'); if (!b) return;
    arr().splice(+b.closest('.rule').dataset.i, 1); save(); redrawMenu();
  });
}
function defaultCondProp(){ return (S.schema.props.find(p => HAS_OPTS(p.type)) || S.schema.props[0]).id; }
const newRule = pid => ({prop:pid, op:opsFor(P(pid).type)[0][0], val:''});
function filtersPage(){
  return {title:'Filter', wide:true, render(c){
    const v = V(); v.filters = v.filters || [];
    c.innerHTML = (v.filters.length ? `<div class="grp-h">Show pages where</div>` + v.filters.map((f, i) => condRow(f, i)).join('') : '')
      + grp(actCell('id="f-add"', 'Add filter', IC.plus, 'accent'), '', 'A page shows in this view only when it matches every filter.');
    bindRules(c, () => V().filters, () => { saveViews(); render(); });
    c.querySelector('#f-add').addEventListener('click', () => { V().filters.push(newRule(defaultCondProp())); saveViews(); render(); redrawMenu(); });
  }};
}
function sortsPage(){
  return {title:'Sort', wide:true, render(c){
    const v = V(); v.sorts = v.sorts || [];
    c.innerHTML = (v.sorts.length ? `<div class="grp-h">Sort by</div>` : '') + v.sorts.map((s, i) => `<div class="grp"><div class="rule" data-i="${i}">
        <select data-s="prop" aria-label="Property">${S.schema.props.map(p => `<option value="${p.id}"${p.id === s.prop ? ' selected' : ''}>${h(p.name)}</option>`).join('')}</select>
        <select data-s="dir" aria-label="Direction"><option value="asc"${s.dir !== 'desc' ? ' selected' : ''}>Ascending</option><option value="desc"${s.dir === 'desc' ? ' selected' : ''}>Descending</option></select>
        <button class="ibtn" data-s="del" aria-label="Remove">${IC.trash}</button></div></div>`).join('')
      + grp(actCell('id="s-add"', 'Add sort', IC.plus, 'accent'), '', v.sorts.length ? 'Later sorts break ties in earlier ones.' : 'Without a sort, pages keep the order you drag them into.');
    c.addEventListener('change', e => { const k = e.target.dataset.s; if (!k) return; const s = V().sorts[+e.target.closest('.rule').dataset.i]; if (s) { s[k] = e.target.value; saveViews(); render(); } });
    c.addEventListener('click', e => { if (e.target.closest('[data-s="del"]')) { V().sorts.splice(+e.target.closest('.rule').dataset.i, 1); saveViews(); render(); redrawMenu(); } });
    c.querySelector('#s-add').addEventListener('click', () => { const cv = V(); cv.sorts.push({prop:S.schema.props.find(p => !cv.sorts.some(s => s.prop === p.id))?.id || 'title', dir:'asc'}); saveViews(); render(); redrawMenu(); });
  }};
}
function colorsPage(){
  return {title:'Conditional color', wide:true, render(c){
    const rules = S.schema.colorRules = S.schema.colorRules || [];
    c.innerHTML = `<div class="grp-f" style="padding-top:0">Color whole rows, cards and calendar entries. The first matching rule wins; drag the grip to change the order. Tap a color square to change it.</div>
      <div id="cr">${rules.map((r, i) => condRow(r, i, true)).join('')}</div>`
      + grp(actCell('id="c-add"', 'Add color rule', IC.plus, 'accent'));
    bindRules(c, () => S.schema.colorRules, () => { saveSchema(); render(); });
    sortable(c.querySelector('#cr'), keys => { const all = S.schema.colorRules; S.schema.colorRules = keys.map(k => all.find(r => r.id === k)).filter(Boolean); saveSchema(); render(); redrawMenu(); });
    c.querySelector('#c-add').addEventListener('click', () => {
      const all = S.schema.colorRules;
      all.push({id:newId(), ...newRule(defaultCondProp()), color:COLORS[(all.length + 5) % COLORS.length]});
      saveSchema(); redrawMenu();
    });
  }};
}
