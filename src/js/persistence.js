// localStorage cache, artifact db writes (debounced, chained per key), sync indicator, legacy migration, connect() + snapshots
const CACHE = 'tagwerk:v2', VID_KEY = 'tagwerk:vid'; // localStorage keys: data copy, last open view
let db = null;
const timers = new Map(), chains = new Map(), busy = new Map(), metaTimers = {};
function cacheLocal(){
  try { localStorage.setItem(CACHE, JSON.stringify({tasks:[...S.tasks.values()].filter(t => !S.drafts.has(t.id)), schema:S.schema, views:S.views})); } catch {}
}
let cacheT = 0;
const cacheSoon = () => { clearTimeout(cacheT); cacheT = setTimeout(cacheLocal, 400); };
function loadCache(){
  try {
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if (!c) return;
    if (Array.isArray(c.tasks)) c.tasks.forEach(t => S.tasks.set(t.id, t));
    if (c.schema && Array.isArray(c.schema.props)) S.schema = c.schema;
    if (Array.isArray(c.views) && c.views.length) S.views = c.views;
  } catch {}
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
  timers.set(id, setTimeout(() => {
    timers.delete(id);
    const cur = S.tasks.get(id); if (!cur) return;
    const body = {...cur}; delete body.id;
    queueWrite(id, () => db.collection('tasks').doc(id).set(body));
  }, delay));
  refreshSync();
}
function persistDelete(id){
  clearTimeout(timers.get(id)); timers.delete(id); cacheSoon();
  if (db) queueWrite(id, () => db.collection('tasks').doc(id).delete());
}
function saveMeta(which){
  cacheSoon();
  if (!db) return;
  clearTimeout(metaTimers[which]);
  metaTimers[which] = setTimeout(() => {
    metaTimers[which] = 0;
    const body = which === 'schema' ? clone(S.schema) : {views:clone(S.views)};
    queueWrite('meta-' + which, () => db.doc('meta/' + which).set(body));
  }, 350);
  refreshSync();
}
const saveSchema = () => saveMeta('schema');
const saveViews = () => saveMeta('views');
const metaBusy = which => !!metaTimers[which] || busy.has('meta-' + which);

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

async function connect(){
  let api = null;
  try { api = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { api = null; }
  if (!api) { refreshSync(); return; }
  db = api; refreshSync();
  db.collection('tasks').onSnapshot(snap => {
    if (snap.metadata.fromCache && snap.empty) return;
    let changed = false;
    const next = new Map();
    for (const d of snap.docs) {
      const b = d.data(); if (!b) continue;
      const t = migrateTask(d.id, b), cur = S.tasks.get(d.id);
      if (cur && stable(cur) === stable(t)) next.set(d.id, cur); else { next.set(d.id, t); changed = true; }
    }
    for (const id of timers.keys()) { const l = S.tasks.get(id); if (l) next.set(id, l); }
    for (const id of busy.keys()) { const l = S.tasks.get(id); if (l && !next.has(id)) next.set(id, l); }
    for (const id of S.drafts) { const l = S.tasks.get(id); if (l) next.set(id, l); }
    if (!changed && next.size === S.tasks.size) return; // only our own writes echoed back
    S.tasks = next; cacheSoon(); render();
  }, e => { console.error(e); setSync('error', 'Offline'); });
  db.doc('meta/schema').onSnapshot(snap => {
    if (metaBusy('schema')) return;
    const b = snap.exists && snap.data();
    if (b && Array.isArray(b.props) && stable(b) !== stable(S.schema)) { S.schema = clone(b); cacheSoon(); render(); if (MN.stack.length) redrawMenu(); }
  }, e => console.error(e));
  db.doc('meta/views').onSnapshot(snap => {
    if (metaBusy('views')) return;
    const b = snap.exists && snap.data();
    if (b && Array.isArray(b.views) && b.views.length && stable(b.views) !== stable(S.views)) {
      S.views = clone(b.views); if (!S.views.some(v => v.id === S.vid)) S.vid = S.views[0].id; cacheSoon(); render(); if (MN.stack.length) redrawMenu();
    }
  }, e => console.error(e));
}
