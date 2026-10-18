// date keys (YYYY-MM-DD), minutes <-> HH:MM, relative labels, date values {d,t,ed,e} (endDay, sameDay, lastDay), weekStart
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m-1, d); };
const todayKey = () => keyOf(new Date());
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const toMin = s => { const [a, b] = (s || '0:0').split(':').map(Number); return a * 60 + b; };
const fromMin = m => { m = Math.max(0, Math.min(1439, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
function relDate(k){
  if (!k) return '';
  const d = parseKey(k), t = parseKey(todayKey());
  const diff = Math.round((d - t) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const wd = d.toLocaleDateString('en-US', {weekday:'long'});
  if (diff > 1 && diff < 7) return wd;
  if (diff < -1 && diff > -8) return 'Last ' + wd;
  const o = {month:'short', day:'numeric'};
  if (d.getFullYear() !== t.getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString('en-US', o);
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
const fmtStamp = ms => ms ? new Date(ms).toLocaleString('en-US', {month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) : '';
const durOf = v => v && v.t && v.e && sameDay(v) && toMin(v.e) > toMin(v.t) ? toMin(v.e) - toMin(v.t) : 60;
const weekStart = k => addDays(k, -((parseKey(k).getDay() - WS() + 7) % 7));
