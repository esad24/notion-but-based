// app settings in schema.settings: ST() read, setST() write, applyST() title/theme, fmtT() 12/24 h, WS() week start
// app-wide settings live with the schema so they sync across devices
const ST = () => ({title:'Tagwerk', theme:'system', time24:true, weekStart:1, ...((S.schema && S.schema.settings) || {})});
const hostTheme = document.documentElement.getAttribute('data-theme');
function setST(k, val){ S.schema.settings = {...ST(), [k]:val}; saveSchema(); applyST(); render(); }
function applyST(){
  const st = ST(), r = document.documentElement;
  const t = $('#dbTitle'); if (t.textContent !== (st.title || 'Untitled')) t.textContent = st.title || 'Untitled';
  if (st.theme === 'light' || st.theme === 'dark') r.setAttribute('data-theme', st.theme);
  else if (r.dataset.tw) { if (hostTheme) r.setAttribute('data-theme', hostTheme); else r.removeAttribute('data-theme'); }
  r.dataset.tw = st.theme;
}
const fmtT = t => { if (!t) return ''; if (ST().time24 !== false) return t; const [a, b] = t.split(':').map(Number); return `${a % 12 || 12}:${pad(b)} ${a < 12 ? 'AM' : 'PM'}`; };
const WS = () => ST().weekStart ?? 1;
