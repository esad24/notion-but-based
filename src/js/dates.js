// date keys (YYYY-MM-DD), minutes <-> HH:MM, relative labels, date values {d,t,ed,e} (endDay, sameDay, lastDay), weekStart
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const toMin = s => { const [a, b] = (s || '0:0').split(':').map(Number); return a * 60 + b; };
const fromMin = m => { m = Math.max(0, Math.min(1439, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
// Intl formatters are slow to create, so build each once; relative labels are memoized per day (a table can ask for thousands)
const FMT = {};
const fmt = (k, o) => FMT[k] || (FMT[k] = new Intl.DateTimeFormat('en-US', o));
let relMemo = new Map(), relDay = '';
function relDate(k){
  if (!k) return '';
  const td = todayKey();
  if (td !== relDay) { relDay = td; relMemo = new Map(); }
  let s = relMemo.get(k);
  if (s === undefined) { s = relLabel(k, td); relMemo.set(k, s); }
  return s;
}
function relLabel(k, td){
  const d = parseKey(k), t = parseKey(td);
  const diff = Math.round((d - t) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const wd = fmt('wd', {weekday:'long'}).format(d);
  if (diff > 1 && diff < 7) return wd;
  if (diff < -1 && diff > -8) return 'Last ' + wd;
  return d.getFullYear() !== t.getFullYear() ? fmt('mdy', {month:'short', day:'numeric', year:'numeric'}).format(d) : fmt('md', {month:'short', day:'numeric'}).format(d);
}
// a date value is {d, t, ed, e}: start date/time and end date/time; an empty time means "no time".
// Older values have no ed; their end time then belongs to the start day.
const endDay = v => (v && (v.ed || (v.e ? v.d : ''))) || '';
const sameDay = v => !endDay(v) || endDay(v) === v.d;
const lastDay = v => endDay(v) || v.d;
function dateLabel(v){
  if (!v || !v.d) return '';
  const ed = endDay(v);
  let s = relDate(v.d) + (v.t ? ' ' + fmtT(v.t) : '');
  if (ed && ed !== v.d) s += ' → ' + relDate(ed) + (v.e ? ' ' + fmtT(v.e) : '');
  else if (v.e) s += ' → ' + fmtT(v.e);
  return s;
}
const dayDiff = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const fmtStamp = ms => ms ? fmt('stamp', {month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}).format(new Date(ms)) : '';
const durOf = v => v && v.t && v.e && sameDay(v) && toMin(v.e) > toMin(v.t) ? toMin(v.e) - toMin(v.t) : 60;
const weekStart = k => addDays(k, -((parseKey(k).getDay() - WS() + 7) % 7));
