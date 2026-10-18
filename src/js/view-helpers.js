// per-view property order and visibility (viewProps, shownProps) and visible(view) = search + filters + sort
function viewProps(v){
  const ids = S.schema.props.map(p => p.id);
  const order = (v.cols || []).filter(id => ids.includes(id));
  for (const id of ids) if (!order.includes(id)) order.push(id);
  return order.map(P);
}
const isHidden = (v, id) => (v.hidden || []).includes(id);
const shownProps = v => viewProps(v).filter(p => !isHidden(v, p.id));
function visible(v){
  const q = S.q.trim().toLowerCase();
  const textProps = S.schema.props.filter(p => ['text','url','email','phone'].includes(p.type));
  const out = [];
  for (const t of S.tasks.values()) {
    if (S.drafts.has(t.id) && t.id !== S.openId) continue;
    if (q && !(t.title.toLowerCase().includes(q) || (t.body || '').toLowerCase().includes(q) || textProps.some(p => String(getV(t, p) || '').toLowerCase().includes(q)))) continue;
    if (!(v.filters || []).every(f => test(f, t))) continue;
    out.push(t);
  }
  return out.sort(comparator(v.sorts));
}
