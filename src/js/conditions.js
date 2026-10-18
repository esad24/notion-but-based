// rules engine shared by filters and conditional colors: OPS, opsFor, ruleReady, test, rowColor, condLabel
const OPS = {
  text:[['contains','contains',1],['not_contains','does not contain',1],['is','is',1],['is_not','is not',1],['starts','starts with',1],['empty','is empty',0],['not_empty','is not empty',0]],
  number:[['eq','=',1],['ne','≠',1],['gt','>',1],['lt','<',1],['gte','≥',1],['lte','≤',1],['empty','is empty',0],['not_empty','is not empty',0]],
  select:[['is','is',1],['is_not','is not',1],['empty','is empty',0],['not_empty','is not empty',0]],
  multi:[['contains','contains',1],['not_contains','does not contain',1],['empty','is empty',0],['not_empty','is not empty',0]],
  checkbox:[['checked','is checked',0],['unchecked','is not checked',0]],
  date:[['today','is today',0],['this_week','is this week',0],['past','is before today',0],['future','is after today',0],['next_7','is within the next 7 days',0],['on','is on',1],['before','is before',1],['after','is after',1],['empty','is empty',0],['not_empty','is not empty',0]],
};
function opsFor(type){
  if (type === 'number') return OPS.number;
  if (GROUPABLE(type)) return OPS.select;
  if (type === 'multi_select') return OPS.multi;
  if (type === 'checkbox') return OPS.checkbox;
  if (IS_DATEISH(type)) return OPS.date;
  return OPS.text;
}
// a rule whose value is still blank is "unfinished": it filters nothing and colors nothing
function ruleReady(c){
  const p = P(c.prop); if (!p) return false;
  const op = opsFor(p.type).find(o => o[0] === c.op);
  return !!op && !(op[2] && (c.val === '' || c.val == null));
}
function test(c, t){
  if (!ruleReady(c)) return true;
  const p = P(c.prop), ops = opsFor(p.type);
  const v = getV(t, p), e = isEmpty(p, v);
  if (c.op === 'empty') return e;
  if (c.op === 'not_empty') return !e;
  switch (ops) {
    case OPS.text: {
      const s = String(v || '').toLowerCase(), q = String(c.val || '').toLowerCase();
      return c.op === 'contains' ? s.includes(q) : c.op === 'not_contains' ? !s.includes(q) : c.op === 'is' ? s === q : c.op === 'is_not' ? s !== q : s.startsWith(q);
    }
    case OPS.number: {
      if (e) return false; const n = +v, x = parseFloat(String(c.val).replace(',', '.'));
      return {eq:n === x, ne:n !== x, gt:n > x, lt:n < x, gte:n >= x, lte:n <= x}[c.op];
    }
    case OPS.select: return c.op === 'is' ? v === c.val : v !== c.val;
    case OPS.multi: { const has = (v || []).includes(c.val); return c.op === 'contains' ? has : !has; }
    case OPS.checkbox: return c.op === 'checked' ? !!v : !v;
    case OPS.date: {
      const k = p.type === 'date' ? (v && v.d) : (v ? keyOf(new Date(v)) : null);
      if (!k) return false;
      const td = todayKey();
      switch (c.op) {
        case 'today': return k === td;
        case 'this_week': { const ws = weekStart(td); return k >= ws && k <= addDays(ws, 6); }
        case 'past': return k < td;
        case 'future': return k > td;
        case 'next_7': return k >= td && k <= addDays(td, 7);
        case 'on': return k === c.val;
        case 'before': return k < c.val;
        case 'after': return k > c.val;
      }
    }
  }
  return true;
}
function rowColor(t){
  for (const r of S.schema.colorRules || []) if (ruleReady(r) && test(r, t)) return r.color;
  return null;
}
function condLabel(c){
  const p = P(c.prop); if (!p) return '';
  const op = opsFor(p.type).find(o => o[0] === c.op); if (!op) return p.name;
  let val = '';
  if (op[2]) val = HAS_OPTS(p.type) ? (opt(p, c.val)?.name || '…') : IS_DATEISH(p.type) ? (c.val ? relDate(c.val) : '…') : (c.val || '…');
  return `${p.name} ${op[1]}${val ? ' ' + val : ''}`;
}
