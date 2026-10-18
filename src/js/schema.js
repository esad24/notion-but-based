// schema changes that keep schema, views and tasks consistent: options, changeType, add/delete/duplicate property; customCss
function nextColor(p){ return COLORS[((p.options || []).length + 3) % COLORS.length]; }
function addOption(p, name){
  const o = {id:newId(), name, color:nextColor(p)};
  if (p.type === 'status') o.group = 'todo';
  (p.options = p.options || []).push(o); saveSchema();
  return o;
}
function convertVal(p, from, to, v){
  const asText = () => {
    switch (from) {
      case 'select': case 'status': return opt(p, v)?.name || '';
      case 'multi_select': return (v || []).map(x => opt(p, x)?.name).filter(Boolean).join(', ');
      case 'date': return v && v.d ? v.d : '';
      case 'checkbox': return v ? 'Yes' : '';
      default: return v == null ? '' : String(v);
    }
  };
  if (HAS_OPTS(from) && HAS_OPTS(to)) return to === 'multi_select' ? (Array.isArray(v) ? v : v ? [v] : undefined) : (Array.isArray(v) ? v[0] : v);
  const s = asText();
  switch (to) {
    case 'text': case 'url': case 'email': case 'phone': return s || undefined;
    case 'number': { const n = parseFloat(String(s).replace(',', '.')); return isNaN(n) ? undefined : n; }
    case 'select': case 'status': case 'multi_select': {
      const names = to === 'multi_select' ? s.split(',').map(x => x.trim()).filter(Boolean) : (s ? [s] : []);
      const ids = names.map(n => (p.options.find(o => o.name.toLowerCase() === n.toLowerCase()) || addOption(p, n)).id);
      return to === 'multi_select' ? (ids.length ? ids : undefined) : ids[0];
    }
    case 'checkbox': return s && s !== '0' && s.toLowerCase() !== 'false' && s.toLowerCase() !== 'no' ? true : undefined;
    case 'date': return /^\d{4}-\d{2}-\d{2}/.test(s) ? {d:s.slice(0, 10), t:'', e:''} : undefined;
  }
  return undefined;
}
function changeType(pid, type){
  const p = P(pid);
  if (!p || p.type === type || p.type === 'title') return;
  const from = p.type;
  if (HAS_OPTS(type)) p.options = p.options || [];
  if (type === 'status') p.options.forEach(o => { o.group = o.group || 'todo'; });
  p.type = from; // conversion reads options under the old type
  for (const t of [...S.tasks.values()]) {
    const v = t.p ? t.p[p.id] : undefined;
    if (v === undefined) continue;
    const nv = convertVal(p, from, type, v);
    const np = {...t.p}; if (nv === undefined) delete np[p.id]; else np[p.id] = nv;
    S.tasks.set(t.id, {...t, p:np, updated:Date.now()}); persist(t.id);
  }
  p.type = type;
  const valid = c => c.prop !== p.id || opsFor(type).some(o => o[0] === c.op);
  S.schema.colorRules = (S.schema.colorRules || []).filter(valid);
  S.views.forEach(v => { v.filters = (v.filters || []).filter(valid); });
  saveSchema(); saveViews(); render();
}
function addProp(type, name, afterId, beforeId){
  const base = name || typeLabel(type);
  let nm = base, i = 2; while (S.schema.props.some(p => p.name === nm)) nm = base + ' ' + i++;
  const p = {id:'p' + newId(), name:nm, type};
  if (HAS_OPTS(type)) p.options = type === 'status' ? [{id:newId(),name:'Not started',color:'gray',group:'todo'},{id:newId(),name:'In progress',color:'blue',group:'doing'},{id:newId(),name:'Done',color:'green',group:'done'}] : [];
  S.schema.props.push(p);
  const cur = V();
  S.views.forEach(v => {
    const order = viewProps(v).map(x => x.id).filter(id => id !== p.id);
    let at = order.length;
    if (v === cur && afterId) at = order.indexOf(afterId) + 1;
    if (v === cur && beforeId) at = order.indexOf(beforeId);
    order.splice(at < 0 ? order.length : at, 0, p.id);
    v.cols = order;
    if (v !== cur && v.type !== 'table') v.hidden = [...(v.hidden || []), p.id];
  });
  saveSchema(); saveViews(); render();
  return p;
}
function deleteProp(pid){
  const p = P(pid); if (!p || p.type === 'title') return;
  S.schema.props = S.schema.props.filter(x => x.id !== pid);
  S.schema.colorRules = (S.schema.colorRules || []).filter(r => r.prop !== pid);
  S.views.forEach(v => {
    v.cols = (v.cols || []).filter(x => x !== pid); v.hidden = (v.hidden || []).filter(x => x !== pid);
    v.filters = (v.filters || []).filter(f => f.prop !== pid); v.sorts = (v.sorts || []).filter(s => s.prop !== pid);
    if (v.groupBy === pid) v.groupBy = firstPropId(x => GROUPABLE(x.type));
    if (v.dateProp === pid) v.dateProp = firstPropId(x => x.type === 'date');
  });
  saveSchema(); saveViews(); render();
  toast(`Deleted property “${p.name}”`);
}
function duplicateProp(pid){
  const p = P(pid); if (!p || p.type === 'title') return;
  const np = addProp(p.type, p.name + ' (copy)', pid);
  if (p.options) np.options = p.options.map(o => ({...o}));
  if (p.fmt) np.fmt = p.fmt;
  for (const t of [...S.tasks.values()]) if (t.p && t.p[pid] !== undefined) { S.tasks.set(t.id, {...t, p:{...t.p, [np.id]:clone(t.p[pid])}}); persist(t.id); }
  saveSchema(); render();
}
function deleteOption(pid, oid){
  const p = P(pid); if (!p) return;
  p.options = p.options.filter(o => o.id !== oid);
  for (const t of [...S.tasks.values()]) {
    const v = t.p ? t.p[pid] : undefined; if (v === undefined) continue;
    const nv = Array.isArray(v) ? v.filter(x => x !== oid) : v === oid ? undefined : v;
    if (nv === v) continue;
    const np = {...t.p}; if (nv === undefined || (Array.isArray(nv) && !nv.length)) delete np[pid]; else np[pid] = nv;
    S.tasks.set(t.id, {...t, p:np}); persist(t.id);
  }
  saveSchema(); render();
}

// custom colors are stored as "h-rrggbb"; their tag/background tones are mixed from the theme so they work in light and dark
let cusKey = '';
function customCss(){
  const set = new Set();
  for (const p of S.schema.props) for (const o of p.options || []) if (isCustom(o.color)) set.add(o.color);
  for (const r of S.schema.colorRules || []) if (isCustom(r.color)) set.add(r.color);
  const key = [...set].sort().join();
  if (key === cusKey) return;
  cusKey = key;
  $('#cuscss').textContent = [...set].map(c => `.c-${c}{--tbg:color-mix(in srgb,#${c.slice(2)} 26%,var(--surface));--tfg:color-mix(in srgb,#${c.slice(2)} 72%,var(--fg))}`).join('');
}
