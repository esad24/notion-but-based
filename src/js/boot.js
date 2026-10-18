// startup: cache, migration, last view, first render, connect to the db, timers
loadCache();
for (const [id, t] of S.tasks) S.tasks.set(id, migrateTask(id, t));
try { const sv = localStorage.getItem(VID_KEY); if (S.views.some(v => v.id === sv)) S.vid = sv; } catch {}
const now = new Date(); S.month = new Date(now.getFullYear(), now.getMonth(), 1); S.sel = todayKey();
scrollToMorning = V().type === 'calendar' && scopeOf(V()) !== 'month';
renderNow(); refreshSync();
connect();
mq.addEventListener('change', () => { closeMenu(); render(); });
setInterval(() => { const v = V(); if (v.type === 'calendar' && scopeOf(v) !== 'month' && !drag && !MN.stack.length && document.visibilityState === 'visible') render(); }, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') render(); });
