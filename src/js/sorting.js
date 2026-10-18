// sort keys per type and comparator(sorts); ties fall back to manual order
function sk(p, t){
  const v = getV(t, p);
  switch (p.type) {
    case 'select': case 'status': { const i = (p.options || []).findIndex(o => o.id === v); return i < 0 ? null : i; }
    case 'multi_select': { const ix = (v || []).map(x => (p.options || []).findIndex(o => o.id === x)).filter(i => i >= 0); return ix.length ? Math.min(...ix) : null; }
    case 'number': return v == null || v === '' ? null : +v;
    case 'date': return v && v.d ? v.d + (v.t || '') : null;
    case 'checkbox': return v ? 1 : 0;
    case 'created_time': case 'last_edited_time': return v || null;
    default: return v ? String(v).toLowerCase() : null;
  }
}
function comparator(sorts){
  const ks = (sorts || []).map(s => ({p:P(s.prop), d:s.dir === 'desc' ? -1 : 1})).filter(x => x.p);
  return (a, b) => {
    for (const {p, d} of ks) {
      const x = sk(p, a), y = sk(p, b);
      if (x === y) continue;
      if (x == null) return 1;
      if (y == null) return -1;
      return (x < y ? -1 : 1) * d;
    }
    return (a.order ?? a.created) - (b.order ?? b.created);
  };
}
