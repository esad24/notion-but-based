// per-database paths and localStorage cache, db writes (debounced, chained per key, flushed before switching databases), sync indicator, legacy migration
// The first database keeps the original top-level paths (tasks, meta/schema, meta/views); others live under dbs/<id>/.
const CACHE = 'tagwerk:v2', APP_KEY = 'tagwerk:app', DB_KEY = 'tagwerk:db'; // localStorage keys: data copy, workspace, last database
let db = null;
const timers = new Map(), pend = new Map(), chains = new Map(), busy = new Map(), metaTimers = {}, metaPend = {};
const dbBase = (id = S.dbId) => id === 'main' ? '' : `dbs/${id}/`;
const tasksPath = (id = S.dbId) => dbBase(id) + 'tasks';
const metaPath = (which, id = S.dbId) => dbBase(id) + 'meta/' + which;
const cacheKey = (id = S.dbId) => id === 'main' ? CACHE : CACHE + ':' + id;
const vidKey = (id = S.dbId) => id === 'main' ? 'tagwerk:vid' : 'tagwerk:vid:' + id;
const wkey = id => S.dbId + '/' + id; // write-queue key of a page in the current database
function cacheLocal(){
  clearTimeout(cacheT);
  try { localStorage.setItem(cacheKey(), JSON.stringify({tasks:[...S.tasks.values()].filter(t => !S.drafts.has(t.id)), schema:S.schema, views:S.views})); } catch {}
}
let cacheT = 0;
const cacheSoon = () => { clearTimeout(cacheT); cacheT = setTimeout(cacheLocal, 400); };
function loadCache(){
  try {
    const c = JSON.parse(localStorage.getItem(cacheKey()) || 'null');
    if (!c) return false;
    if (Array.isArray(c.tasks)) c.tasks.forEach(t => S.tasks.set(t.id, migrateTask(t.id, t)));
    if (c.schema && Array.isArray(c.schema.props)) S.schema = c.schema;
    if (Array.isArray(c.views) && c.views.length) S.views = c.views;
    return true;
  } catch { return false; }
}
function setSync(s, label){ const el = $('#sync'); el.dataset.s = s; el.textContent = label; }
function refreshSync(){
  if (!db) return setSync('local', 'Saved on this device');
  if (busy.size || timers.size || Object.values(metaTimers).some(Boolean)) setSync('saving', 'Saving…'); else setSync('ok', 'Synced');
}
// at most 4 writes in flight, so a bulk change (sample pages, a type change) stays under the platform's rate budget
let inflight = 0; const waiting = [];
const slot = () => inflight < 4 ? (inflight++, Promise.resolve()) : new Promise(r => waiting.push(r));
const release = () => { const w = waiting.shift(); if (w) w(); else inflight--; };
const wait = ms => new Promise(r => setTimeout(r, ms));
async function retrying(fn, n = 0){
  try { return await fn(); }
  catch (e) {
    const code = e && e.code;
    if (n < 4 && (code === 'unavailable' || code === 'resource_exhausted')) { await wait((600 + Math.random() * 800) * 2 ** n); return retrying(fn, n + 1); }
    throw e;
  }
}
function queueWrite(key, fn){
  busy.set(key, (busy.get(key) || 0) + 1); refreshSync();
  const run = () => slot().then(() => retrying(fn)).finally(release);
  const p = (chains.get(key) || Promise.resolve()).then(run).catch(e => {
    console.error('save failed', e);
    setSync('error', 'Not saved');
    toast(e && e.code === 'quota_exceeded' ? 'Storage is full. Delete some old pages to add more.' : 'Couldn’t save the last change. Check your connection.');
  }).finally(() => { const n = busy.get(key) - 1; n ? busy.set(key, n) : busy.delete(key); refreshSync(); });
  chains.set(key, p);
}
function persist(id, delay = 0){
  cacheSoon();
  if (!db || S.drafts.has(id)) return;
  clearTimeout(timers.get(id));
  const col = tasksPath(), key = wkey(id);
  const run = () => {
    timers.delete(id); pend.delete(id);
    const cur = S.tasks.get(id); if (!cur) return;
    const body = {...cur}; delete body.id;
    queueWrite(key, () => db.collection(col).doc(id).set(body));
  };
  pend.set(id, run); timers.set(id, setTimeout(run, delay));
  refreshSync();
}
function persistDelete(id){
  clearTimeout(timers.get(id)); timers.delete(id); pend.delete(id); cacheSoon();
  const col = tasksPath();
  if (db) queueWrite(wkey(id), () => db.collection(col).doc(id).delete());
}
function saveMeta(which){
  cacheSoon();
  if (!db) return;
  clearTimeout(metaTimers[which]);
  const path = which === 'app' ? 'meta/app' : metaPath(which), key = which === 'app' ? 'app' : wkey('meta-' + which);
  const run = () => {
    metaTimers[which] = 0; metaPend[which] = null;
    const body = which === 'schema' ? clone(S.schema) : which === 'views' ? {views:clone(S.views)} : clone(S.app);
    queueWrite(key, () => db.doc(path).set(body));
  };
  metaPend[which] = run; metaTimers[which] = setTimeout(run, 350);
  refreshSync();
}
const saveSchema = () => saveMeta('schema');
const saveViews = () => saveMeta('views');
const saveApp = () => { try { localStorage.setItem(APP_KEY, JSON.stringify(S.app)); } catch {} saveMeta('app'); };
const metaBusy = which => !!metaTimers[which] || busy.has(which === 'app' ? 'app' : wkey('meta-' + which));
// before switching databases: send every pending write now, while S still holds the database it belongs to
function flushWrites(){
  for (const run of [...pend.values()]) run();
  for (const w of ['schema', 'views']) if (metaPend[w]) { clearTimeout(metaTimers[w]); metaPend[w](); }
  cacheLocal();
}

function migrateTask(id, d){
  if (d.p) return {...d, id};
  const sMap = {'Nicht begonnen':'nb','In Arbeit':'ia','Erledigt':'er'}, pMap = {'Sehr hoch':'sh','Hoch':'h','Mittel-hoch':'mh','Mittel':'m','Niedrig':'n'};
  const p = {};
  if (d.status) p.status = sMap[d.status] || d.status;
  if (d.priority) p.priority = pMap[d.priority] || d.priority;
  if (d.category) p.category = d.category;
  if (d.date) p.date = {d:d.date, t:d.time || '', e:d.end || ''};
  return {id, title:d.title || '', body:d.notes || '', created:d.created || Date.now(), updated:d.updated || Date.now(), order:d.order ?? d.created ?? 0, p};
}
