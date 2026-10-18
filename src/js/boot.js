// startup: cache, migration, last view, first render, connect to the db, timers
loadApp();
try { const d = localStorage.getItem(DB_KEY); if (S.app && S.app.tree.some(x => x.id === d && x.type === 'db')) S.dbId = d; else if (S.app) S.dbId = firstDb(); } catch {}
S.loading = !loadCache() && S.dbId !== 'main';
if (!S.app) S.app = defaultApp();
restoreVid();
const now = new Date(); S.month = new Date(now.getFullYear(), now.getMonth(), 1); S.sel = todayKey();
scrollToMorning = V().type === 'calendar' && scopeOf(V()) !== 'month';
renderNow(); refreshSync();
connect();
mq.addEventListener('change', () => { closeMenu(); toggleSide(false, true); render(); });
setInterval(() => { const v = V(); if (v.type === 'calendar' && scopeOf(v) !== 'month' && !drag && !MN.stack.length && document.visibilityState === 'visible') render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
