// app-wide settings in the workspace doc (meta/app): ST() read, setST() write, applyST() title/theme, fmtT() 12/24 h, WS() week start
// older versions kept them in the first database's schema; those are the fallback until the workspace has its own
const ST = () => ({theme:'system', time24:true, weekStart:1, ...((S.dbId === 'main' && S.schema && S.schema.settings) || {}), ...((S.app && S.app.settings) || {})});
const hostTheme = document.documentElement.getAttribute('data-theme');
function setST(k, val){ S.app.settings = {...(S.app.settings || {}), [k]:val}; saveApp(); applyST(); render(); }
function applyST(){
  const st = ST(), r = document.documentElement;
  const t = $('#dbTitle'), name = dbName(); if (t.textContent !== name) t.textContent = name;
  if (st.theme === 'light' || st.theme === 'dark') r.setAttribute('data-theme', st.theme);
  else if (r.dataset.tw) { if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme'); }
  r.dataset.tw = st.theme;
}
const fmtT = t => { if (!t) return ''; if (ST().time24 !== false) return t; const [a, b] = t.split(':').map(Number); return `${a % 12 || 12}:${pad(b)} ${a < 12 ? 'AM' : 'PM'}`; };
const WS = () => ST().weekStart ?? 1;
