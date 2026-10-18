// reading and displaying values: getV, isEmpty, fmtNum, safeUrl, tagO, isDone, disp (HTML per property type)
function getV(t, p){
  if (p.type === 'title') return t.title;
  if (p.type === 'created_time') return t.created;
  if (p.type === 'last_edited_time') return t.updated;
  return t.p ? t.p[p.id] : undefined;
}
function isEmpty(p, v){
  if (v == null || v === '' || v === false) return true;
  if (Array.isArray(v)) return !v.length;
  if (p.type === 'date') return !v.d;
  return false;
}
function fmtNum(p, v){
  const n = +v; if (!isFinite(n)) return '';
  switch (p.fmt) {
    case 'comma': return n.toLocaleString('en-US');
    case 'percent': return n + '%';
    case 'euro': return n.toLocaleString('de-DE', {style:'currency', currency:'EUR'});
    case 'dollar': return n.toLocaleString('en-US', {style:'currency', currency:'USD'});
    default: return String(n);
  }
}
function safeUrl(v){
  const s = String(v).trim();
  if (/^(https?:|mailto:)/i.test(s)) return s;
  return 'https://' + s.replace(/^\/+/, '');
}
const tagO = (o, st) => `<span class="tag${st ? ' st' : ''} c-${o.color}">${h(o.name)}</span>`;
function isDone(t){ const sp = statusProp(); return !!(sp && opt(sp, getV(t, sp))?.group === 'done'); }
function disp(p, t){
  const v = getV(t, p);
  switch (p.type) {
    case 'title': return h(v);
    case 'text': case 'email': case 'phone': return v ? `<span class="tx">${h(v)}</span>` : '';
    case 'url': return v ? `<a class="lnk-u" href="${h(safeUrl(v))}" target="_blank" rel="noopener">${h(String(v).replace(/^https?:\/\//, ''))}</a>` : '';
    case 'number': return v != null && v !== '' ? `<span class="num-v">${h(fmtNum(p, v))}</span>` : '';
    case 'select': case 'status': { const o = opt(p, v); return o ? tagO(o, p.type === 'status') : ''; }
    case 'multi_select': return (v || []).map(x => opt(p, x)).filter(Boolean).map(o => tagO(o)).join('');
    case 'date': return v && v.d ? `<span class="dt${lastDay(v) < todayKey() && !isDone(t) ? ' overdue' : ''}">${h(dateLabel(v))}</span>` : '';
    case 'checkbox': return `<span class="cbx${v ? ' on' : ''}">${IC.check}</span>`;
    case 'created_time': case 'last_edited_time': return `<span class="stamp">${h(fmtStamp(v))}</span>`;
  }
  return '';
}
