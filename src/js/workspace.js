// workspace: databases and folders as a tree in meta/app, connect + live subscriptions per database, openDb (switch), create/delete databases and folders
const items = () => (S.app && S.app.tree) || [];
const item = id => items().find(x => x.id === id);
const kids = parent => items().filter(x => (x.parent || '') === parent);
const dbName = (id = S.dbId) => (item(id) || {}).name || 'Untitled';
const firstDb = () => (items().find(x => x.type === 'db') || {}).id || 'main';
// the first run turns the single database into a workspace: its title becomes the tree entry, its settings become app-wide
function defaultApp(){
  const legacy = {...((S.schema && S.schema.settings) || {})}, title = legacy.title; delete legacy.title;
  return {tree:[{id:'main', type:'db', name:title || 'Tagwerk', parent:''}], settings:legacy};
}
function loadApp(){
  try { const a = JSON.parse(localStorage.getItem(APP_KEY) || 'null'); if (a && Array.isArray(a.tree) && a.tree.some(x => x.type === 'db')) S.app = a; } catch {}
}

async function connect(){
  let api = null;
  try { api = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { api = null; }
  if (!api) { S.loading = false; refreshSync(); render(); return; }
  db = api; refreshSync();
  db.doc('meta/app').onSnapshot(snap => {
    if (metaBusy('app')) return;
    const b = snap.exists && snap.data();
    if (!b) { if (!snap.metadata.fromCache) saveApp(); return; } // first run: publish the local workspace
    if (!Array.isArray(b.tree) || stable(b) === stable(S.app)) return;
    S.app = clone(b); try { localStorage.setItem(APP_KEY, JSON.stringify(S.app)); } catch {}
    if (!item(S.dbId)) openDb(firstDb()); else render();
    if (MN.stack.length) redrawMenu();
  }, e => console.error(e));
  subscribeDb();
}
let subs = [], dbGen = 0;
function unsubDb(){ subs.forEach(f => { try { f(); } catch {} }); subs = []; dbGen++; }
function subscribeDb(){
  const gen = ++dbGen, id = S.dbId, live = () => gen === dbGen, mine = id + '/';
  subs.push(db.collection(tasksPath(id)).onSnapshot(snap => {
    if (!live() || (snap.metadata.fromCache && snap.empty)) return;
    let changed = false;
    const next = new Map();
    for (const d of snap.docs) {
      const b = d.data(); if (!b) continue;
      const t = migrateTask(d.id, b), cur = S.tasks.get(d.id);
      if (cur && stable(cur) === stable(t)) next.set(d.id, cur); else { next.set(d.id, t); changed = true; }
    }
    for (const tid of timers.keys()) { const l = S.tasks.get(tid); if (l) next.set(tid, l); }
    for (const k of busy.keys()) { if (!k.startsWith(mine)) continue; const l = S.tasks.get(k.slice(mine.length)); if (l && !next.has(l.id)) next.set(l.id, l); }
    for (const tid of S.drafts) { const l = S.tasks.get(tid); if (l) next.set(tid, l); }
    if (!changed && next.size === S.tasks.size && !S.loading) return; // only our own writes echoed back
    S.tasks = next; S.loading = false; cacheSoon(); render();
  }, e => { console.error(e); setSync('error', 'Offline'); }));
  subs.push(db.doc(metaPath('schema', id)).onSnapshot(snap => {
    if (!live() || metaBusy('schema')) return;
    const b = snap.exists && snap.data();
    if (b && Array.isArray(b.props) && stable(b) !== stable(S.schema)) { S.schema = clone(b); cacheSoon(); render(); if (MN.stack.length) redrawMenu(); }
  }, e => console.error(e)));
  subs.push(db.doc(metaPath('views', id)).onSnapshot(snap => {
    if (!live() || metaBusy('views')) return;
    const b = snap.exists && snap.data();
    if (b && Array.isArray(b.views) && b.views.length && stable(b.views) !== stable(S.views)) {
      S.views = clone(b.views); if (!S.views.some(v => v.id === S.vid)) S.vid = S.views[0].id; cacheSoon(); render(); if (MN.stack.length) redrawMenu();
    }
  }, e => console.error(e)));
}

// switch to another database: finish writes for the current one, then load the next from cache and subscribe to it
function openDb(id, preset){
  if (!item(id) || (id === S.dbId && !preset)) return;
  flushWrites();
  if (S.openId) closeSheet();
  closeMenu();
  if (db) unsubDb();
  S.dbId = id; S.tasks = new Map(); S.drafts.clear(); S.more = {};
  S.schema = preset ? preset.schema : defaultSchema(); S.views = preset ? preset.views : defaultViews();
  S.loading = !preset && !loadCache() && !!db;
  restoreVid();
  try { localStorage.setItem(DB_KEY, id); } catch {}
  if (S.q) { S.q = ''; $('#q').value = ''; $('#searchbar').hidden = true; }
  resetX = true; $('#view').scrollTo(0, 0); scrollToMorning = V().type === 'calendar' && scopeOf(V()) !== 'month';
  if (preset) cacheLocal();
  renderNow();
  if (db) subscribeDb();
}
function restoreVid(){ S.vid = S.views[0].id; try { const sv = localStorage.getItem(vidKey()); if (S.views.some(v => v.id === sv)) S.vid = sv; } catch {} }

const TEMPLATES = [['tasks', 'Tasks', 'Status, priority, date and category'], ['empty', 'Empty', 'Only a name; add your own properties'], ['copy', 'Same as this one', 'Copies properties, colors and views, not the pages']];
function templateOf(kind){
  if (kind === 'copy') return {schema:clone(S.schema), views:clone(S.views).map(v => ({...v, filters:[]}))};
  if (kind === 'tasks') { const schema = defaultSchema([]); return {schema, views:defaultViews()}; }
  const schema = {props:[{id:'title', name:'Name', type:'title'}, {id:'created', name:'Created time', type:'created_time'}], colorRules:[]};
  return {schema, views:[{id:'table', name:'Table', type:'table', cols:['title', 'created'], hidden:[], widths:{}, filters:[], sorts:[]}]};
}
function createDb(name, kind, parent = ''){
  const id = 'd' + newId(), t = templateOf(kind);
  delete t.schema.settings;
  S.app.tree.push({id, type:'db', name:name || 'Untitled', parent}); saveApp();
  if (db) {
    const s = clone(t.schema), v = {views:clone(t.views)};
    queueWrite(id + '/meta-schema', () => db.doc(metaPath('schema', id)).set(s));
    queueWrite(id + '/meta-views', () => db.doc(metaPath('views', id)).set(v));
  }
  openDb(id, t);
  return id;
}
function createFolder(name, parent = ''){
  const id = 'f' + newId();
  S.app.tree.push({id, type:'folder', name:name || 'New folder', parent}); saveApp(); setOpen(id, true);
  return id;
}
function renameItem(id, name){ const x = item(id); if (!x) return; x.name = name; saveApp(); applyST(); renderSide(); }
function setIcon(id, icon){ const x = item(id); if (!x) return; if (icon) x.icon = icon; else delete x.icon; saveApp(); renderSide(); }
const inside = (id, parent) => { for (let p = parent; p; p = (item(p) || {}).parent) if (p === id) return true; return false; };
function moveItem(id, parent){ const x = item(id); if (!x || inside(id, parent)) return; x.parent = parent; S.app.tree = items().filter(y => y !== x).concat(x); saveApp(); if (parent) setOpen(parent, true); renderSide(); }
// a deleted folder hands its contents to its own parent; nothing inside is lost
function deleteFolder(id){ const f = item(id); if (!f) return; items().forEach(x => { if (x.parent === id) x.parent = f.parent || ''; }); S.app.tree = items().filter(x => x !== f); saveApp(); renderSide(); toast(`Deleted folder “${f.name}”`); }
async function deleteDb(id){
  const x = item(id); if (!x || items().filter(y => y.type === 'db').length < 2) return;
  if (id === S.dbId) openDb(items().find(y => y.type === 'db' && y.id !== id).id);
  S.app.tree = items().filter(y => y !== x); saveApp(); renderSide();
  try { localStorage.removeItem(cacheKey(id)); localStorage.removeItem(vidKey(id)); } catch {}
  toast(`Deleted database “${x.name}”`);
  if (!db) return;
  const col = tasksPath(id), snap = await db.collection(col).get();
  snap.docs.forEach(d => queueWrite(id + '/' + d.id, () => db.collection(col).doc(d.id).delete()));
  ['schema', 'views'].forEach(w => queueWrite(id + '/meta-' + w, () => db.doc(metaPath(w, id)).delete()));
}

// which folders are expanded is a per-device convenience
const OPEN_KEY = 'tagwerk:open';
let openSet = null;
const isOpen = id => { if (!openSet) { try { openSet = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]')); } catch { openSet = new Set(); } } return openSet.has(id); };
function setOpen(id, on){ isOpen(id); on ? openSet.add(id) : openSet.delete(id); try { localStorage.setItem(OPEN_KEY, JSON.stringify([...openSet])); } catch {} renderSide(); }
