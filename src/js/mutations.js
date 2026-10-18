// task changes: update, setVal, restore (undo), createTask (drafts), removeTask, toggleDone
// quiet: typing in the page sheet; the view behind it catches up once typing pauses instead of on every key
function update(id, patch, delay = 0, quiet = false){
  const old = S.tasks.get(id); if (!old) return null;
  const t = {...old, ...patch, updated:Date.now()};
  S.tasks.set(id, t);
  if (S.drafts.has(id) && t.title.trim()) S.drafts.delete(id);
  persist(id, delay); quiet ? renderLater() : render();
  return old;
}
function setVal(id, pid, v, delay = 0){
  const t = S.tasks.get(id), p = P(pid); if (!t || !p) return null;
  if (p.type === 'title') return update(id, {title:v || ''}, delay);
  const np = {...(t.p || {})};
  const blank = p.type === 'number' ? (v == null || v === '') : isEmpty(p, v);
  if (blank) delete np[pid]; else np[pid] = v;
  return update(id, {p:np}, delay);
}
function restore(old){ S.tasks.set(old.id, old); persist(old.id); render(); }
function presetFromFilters(v){
  const p = {};
  for (const f of v.filters || []) {
    const pr = P(f.prop); if (!pr || !ruleReady(f)) continue;
    if (GROUPABLE(pr.type) && f.op === 'is') p[pr.id] = f.val;
    if (pr.type === 'multi_select' && f.op === 'contains') p[pr.id] = [f.val];
    if (pr.type === 'checkbox' && f.op === 'checked') p[pr.id] = true;
  }
  return p;
}
function createTask(preset = {}, open = true){
  const now = Date.now(), v = V(), sp = statusProp();
  const p = {};
  if (sp) { const o = groupOpt(sp, 'todo') || (sp.options || [])[0]; if (o) p[sp.id] = o.id; }
  Object.assign(p, presetFromFilters(v), preset);
  for (const k in p) if (p[k] == null) delete p[k];
  const t = {id:newId(), title:'', body:'', created:now, updated:now, order:now, p};
  S.tasks.set(t.id, t); S.drafts.add(t.id);
  render();
  if (open) openSheet(t.id, true);
  return t;
}
function removeTask(id, withUndo = true){
  const old = S.tasks.get(id); if (!old) return;
  S.tasks.delete(id);
  if (S.drafts.has(id)) { S.drafts.delete(id); render(); return; }
  persistDelete(id); render();
  if (withUndo) toast('Page deleted', () => restore(old));
}
function toggleDone(id){
  const sp = statusProp(), t = S.tasks.get(id); if (!sp || !t) return;
  const done = isDone(t);
  const o = done ? (groupOpt(sp, 'todo') || sp.options[0]) : groupOpt(sp, 'done');
  if (!o) return;
  const old = setVal(id, sp.id, o.id);
  if (!done) toast('Marked ' + o.name, () => restore(old));
}
