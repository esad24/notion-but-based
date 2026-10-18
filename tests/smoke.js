// Phone + desktop smoke test. Builds dist/tagwerk.html first, then drives it in headless Chromium.
// Run: node tests/smoke.js   (exit code 1 on any failed check; screenshots go to tests/out/, look at them after UI changes)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const { build } = require('../build.js');
const SP = path.join(__dirname, 'out');
fs.mkdirSync(SP, { recursive: true });
const built = build();
// the artifact host adds a document skeleton and a [hidden] reset; mimic it
fs.writeFileSync(SP+'/wrapped.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>${fs.readFileSync(built.out,'utf8')}</body></html>`);
const mk = (id, title, p, o) => ({id, title, created:o, updated:o, order:o, p});
const seed = {tasks:[
  mk('a','Plan the week',{status:'nb',priority:'h',category:'looks',date:{d:'2026-10-14',t:'',e:''}},1),
  mk('b','Dentist appointment',{status:'nb',priority:'h',date:{d:'2026-10-19',t:'08:00',e:'09:00'}},2),
  mk('c','Call the accountant',{status:'nb',priority:'sh',category:'business',date:{d:'2026-10-13',t:'',e:''}},3),
  mk('d','Tax return',{status:'er',priority:'h',category:'business'},4),
]};
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail !== '' ? '  (' + detail + ')' : ''}`); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:402,height:874}, isMobile:true, hasTouch:true, deviceScaleFactor:3});
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type()==='error' && !/fonts|ERR_/.test(m.text())) errs.push(m.text()); });
  await p.addInitScript(s => { if (!sessionStorage.getItem('x')) { localStorage.clear(); localStorage.setItem('tagwerk:v2', JSON.stringify(s)); sessionStorage.setItem('x','1'); } }, seed);
  await p.goto('file://'+SP+'/wrapped.html'); await p.waitForTimeout(300);
  const tap = async sel => { await p.click(sel); await p.waitForTimeout(280); };
  const shot = n => p.screenshot({path:`${SP}/i-${n}.png`});
  // touch-gesture helper (dispatches real TouchEvents)
  const swipe = (sel, dx, dy, steps=8) => p.evaluate(([sel,dx,dy,steps]) => new Promise(res => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : null; const r = el.getBoundingClientRect();
    const x0 = r.left + r.width/2, y0 = r.top + Math.min(r.height/2, 30);
    const mkT = (x,y) => new Touch({identifier:1, target:el, clientX:x, clientY:y});
    const fire = (type,x,y) => el.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:type==='touchend'?[]:[mkT(x,y)],changedTouches:[mkT(x,y)]}));
    fire('touchstart',x0,y0); let i=0;
    const step = () => { i++; fire('touchmove', x0+dx*i/steps, y0+dy*i/steps); if (i<steps) requestAnimationFrame(step); else { fire('touchend', x0+dx, y0+dy); setTimeout(res, 350); } };
    requestAnimationFrame(step);
  }), [sel,dx,dy,steps]);
  // real touch input through CDP (fires pointer + touch events, unlike synthetic TouchEvents): hold, then slide
  const cdp = await ctx.newCDPSession(p);
  const touchDrag = async (x0, y0, x1, y1, hold = 450, steps = 12) => {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:x0, y:y0}]});
    await p.waitForTimeout(hold);
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x0 + (x1 - x0) * i / steps, y:y0 + (y1 - y0) * i / steps}]}); await p.waitForTimeout(20); }
    await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); await p.waitForTimeout(350);
  };
  const center = async sel => { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  console.log('phone 402x874');
  await shot('board');
  check('bottom bar visible', await p.isVisible('#bbar'));
  check('header title', (await p.textContent('#dbTitle')) === 'Tagwerk');
  check('board cards rendered', (await p.locator('.card').count()) === 4);
  // table: header + rows share one horizontal scroller
  await tap('.vtab[data-v="table"]');
  const tb = await p.evaluate(() => { const hx = document.querySelector('#view .hx'); const head = hx.querySelector('.tb-h'), row = hx.querySelector('.tr');
    hx.scrollLeft = 250; const vy = hx.querySelector('.vy');
    return {sameScroller: hx.contains(head) && hx.contains(row), viewOverflow:getComputedStyle(document.querySelector('#view')).overflow, vyY:getComputedStyle(vy).overflowY, vyX:getComputedStyle(vy).overflowX, headLeft:head.getBoundingClientRect().left, rowLeft:row.getBoundingClientRect().left}; });
  check('table header and rows in one horizontal scroller', tb.sameScroller && tb.viewOverflow === 'hidden' && tb.vyX === 'hidden' && tb.vyY === 'auto', JSON.stringify(tb));
  check('table header and rows scroll together', Math.abs(tb.headLeft - tb.rowLeft) < 1);
  await shot('table');
  // hold a header and slide it: the column moves
  const hdr = () => p.$$eval('.tb-h .th[data-prop]', a => a.map(x => x.dataset.prop).join(','));
  const hd0 = await hdr();
  { const [x, y] = await center('.th[data-prop="priority"]'); const [x2] = await center('.th[data-prop="date"]'); await touchDrag(x, y, x2 + 20, y); }
  const hd = await hdr();
  check('hold and slide a table header moves the column', hd.split(',').indexOf('priority') === hd.split(',').indexOf('date') + 1, `${hd0} -> ${hd}`);
  // hold a row and slide it: manual order wins, the sort is turned off with Undo
  const rows = () => p.$$eval('.tbody > .tr', a => a.map(x => x.dataset.id).join(','));
  const r0 = await rows();
  await p.evaluate(() => { document.querySelector('#view .hx').scrollLeft = 0; });
  { const [x, y] = await center('.tbody > .tr:nth-child(1) .td.title'); const b = await p.locator('.tbody > .tr').nth(2).boundingBox(); await touchDrag(x, y, x, b.y + b.height - 6); }
  const r1 = await rows();
  check('hold and slide a table row reorders it and turns sorting off', r1.split(',')[2] === r0.split(',')[0] && /Sorting turned off/.test(await p.textContent('#toastMsg')) && await p.isHidden('#sheet'), `${r0} -> ${r1}`);
  // settings sheet
  await tap('[data-act="settings"]');
  check('settings sheet has cells, segmented controls, switches', (await p.locator('#menu .cell').count()) > 5 && (await p.locator('#menu .segc').count()) > 0 && (await p.locator('#menu .tgl').count()) > 0);
  await shot('settings');
  const lastGap = await p.evaluate(() => { const mc = document.querySelector('#menu .mc'); mc.scrollTop = 1e5; const g = [...mc.querySelectorAll('.grp')].pop(); return Math.round(mc.getBoundingClientRect().bottom - g.getBoundingClientRect().bottom); });
  check('settings sheet: last group clears the bottom edge', lastGap >= 24, lastGap + 'px');
  await p.evaluate(() => { document.querySelector('#menu .mc').scrollTop = 0; });
  await tap('#menu [data-go="props"]');
  const pv = () => p.$$eval('#pv-list > [data-key]', a => a.map(x => x.dataset.key).join(','));
  const pv0 = await pv();
  { const [x, y] = await center('#pv-list > [data-key]:nth-child(2) .cl'); const b = await p.locator('#pv-list > [data-key]').nth(3).boundingBox(); await touchDrag(x, y, x, b.y + b.height - 4); }
  const pv1 = await pv(), hd1 = await hdr();
  check('hold and slide a property in settings reorders the table columns', pv1 !== pv0 && hd1 === pv1, `${pv0} -> ${pv1} | ${hd1}`);
  await tap('#menu [data-m="back"]');
  await tap('#menu [data-tg="wrap"]');
  check('wrap off applied', (await p.locator('.tbl.nowrap').count()) === 1);
  await tap('#menu .segc[data-seg="density"] button[data-v="tall"]');
  check('density tall applied', (await p.locator('.tbl.d-tall').count()) === 1);
  await tap('#menu [data-go="general"]');
  await shot('general');
  await tap('#menu [data-tg="time24"]');
  // swipe right to go back
  await swipe('#menu .mc', 160, 4);
  check('swipe right goes back', (await p.textContent('#menu .mt')) === 'View settings');
  // pull down to close
  await swipe('#menu .mhead', 0, 220);
  await p.waitForTimeout(300);
  check('pull down closes the sheet', await p.isHidden('#menu'));
  // list view
  await tap('[data-act="addview"]'); await tap('#menu [data-l="list"]'); await p.waitForTimeout(400);
  check('new list view hides completed pages', (await p.locator('.lv .sw-row').count()) === 3);
  await tap('[data-act="settings"]'); await tap('#menu [data-tg="showDone"]'); await p.click('#menu [data-m="close"]'); await p.waitForTimeout(400);
  check('show completed on lists every page', (await p.locator('.lv .sw-row').count()) === 4);
  await shot('list');
  const firstId = await p.getAttribute('.lv .sw-row', 'data-id');
  await swipe('.lv .sw-row', 140, 0);
  await p.waitForTimeout(300);
  check('swipe right completes', (await p.locator(`.sw-row[data-id="${firstId}"] .row.done`).count()) === 1);
  const n0 = await p.locator('.lv .sw-row').count();
  await swipe('.lv .sw-row:last-child', -160, 0);
  await p.waitForTimeout(400);
  check('swipe left deletes with Undo', (await p.locator('.lv .sw-row').count()) === n0 - 1 && (await p.textContent('#toastMsg')) === 'Page deleted');
  // list settings: group by category
  await tap('[data-act="settings"]');
  await p.selectOption('#menu select[data-sel="groupBy"]', 'category'); await p.waitForTimeout(300);
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(400);
  check('list grouped into sections', (await p.locator('.lv-sec').count()) > 1);
  const done0 = await p.locator('.lv .row.done').count();
  await tap('[data-act="settings"]'); await tap('#menu [data-tg="showDone"]'); await p.click('#menu [data-m="close"]'); await p.waitForTimeout(400);
  check('show completed off hides done pages', done0 > 0 && (await p.locator('.lv .row.done').count()) === 0, `${done0} done before`);
  // calendar swipe
  await tap('.vtab[data-v="cal"]');
  const m0 = await p.textContent('.cal-h h2');
  await swipe('.grid', -180, 5);
  const m1 = await p.textContent('.cal-h h2');
  check('calendar swipe changes month', m0 !== m1, `${m0} -> ${m1}`);
  await tap('[data-act="today"]'); await tap('.cal-h [data-act="scope"][data-v="week"]');
  check('phone week shows entries as colored lines', (await p.locator('.tg.lines').count()) === 1 && (await p.locator('.tg-allc .adl').count()) > 0);
  await shot('week');
  await tap('.ad-tg');
  check('all-day row collapses to counts', (await p.locator('.tg-allw.shut').count()) === 1 && (await p.locator('.ad-n').count()) > 0);
  await tap('.ad-tg');
  check('all-day row expands with a resize handle', (await p.locator('.tg-allw.shut').count()) === 0 && (await p.locator('[data-adrs]').count()) === 1);
  await tap('.cal-h [data-act="scope"][data-v="month"]');
  // date editor + 12h
  await tap('.vtab[data-v="table"]');
  await p.locator('.tr').first().locator('.td.title').click(); await p.waitForTimeout(400);
  check('page sheet opens', await p.isVisible('#sheet'));
  await tap('.pv[data-prop="date"]');
  check('date editor has start and end rows', (await p.locator('#menu .de').count()) === 2);
  await shot('date');
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(350);
  // text editor goes tall
  await tap('#sheet [data-act="addprop"]'); await tap('#menu [data-t="text"]');
  check('focused name field makes the sheet tall', await p.evaluate(() => document.querySelector('#menu').classList.contains('tall')));
  await shot('tall');
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(350);
  await tap('[data-act="close"]'); await p.waitForTimeout(300);
  await tap('.vtab[data-v="board"]');
  check('board columns draggable, including “No …”', (await p.locator('.col[data-o]').count()) > 0 && (await p.locator('.col[data-o=""]').count()) === 1);
  // custom color: iOS keeps its picker open only if the input is not replaced while picking
  await tap('.col[data-o] [data-act="grpmenu"]');
  const same = await p.evaluate(() => new Promise(r => { const i = document.querySelector('#menu .cust input'); i.value = '#ff3366'; i.dispatchEvent(new Event('input', {bubbles:true})); i.value = '#33aa66'; i.dispatchEvent(new Event('input', {bubbles:true})); setTimeout(() => r(document.contains(i) && document.querySelector('#menu .cust input') === i), 300); }));
  check('custom color picker stays open while picking', same && (await p.locator('.col .tag.c-h-33aa66').count()) === 1);
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(350);
  check('no horizontal page overflow', !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  check('no page errors', !errs.length, errs.join(' | '));
  await ctx.close();
  // desktop: column drag with mouse
  console.log('desktop 1300x850');
  const c2 = await b.newContext({viewport:{width:1300,height:850}}); const q = await c2.newPage(); const e2=[];
  q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(s => { localStorage.setItem('tagwerk:v2', JSON.stringify(s)); localStorage.setItem('tagwerk:vid','board'); }, seed);
  await q.goto('file://'+SP+'/wrapped.html'); await q.waitForTimeout(300);
  const order0 = await q.$$eval('.col[data-o]', cs => cs.map(c => c.dataset.o).slice(0,3).join(','));
  const h1 = await q.locator('.col[data-o] .col-h').nth(0).boundingBox(), h3 = await q.locator('.col[data-o]').nth(2).boundingBox();
  await q.mouse.move(h1.x + 30, h1.y + 15); await q.mouse.down(); await q.mouse.move(h1.x + 60, h1.y + 20, {steps:4});
  await q.mouse.move(h3.x + h3.width - 20, h1.y + 20, {steps:10}); await q.mouse.up(); await q.waitForTimeout(300);
  const order1 = await q.$$eval('.col[data-o]', cs => cs.map(c => c.dataset.o).slice(0,3).join(','));
  check('drag a board column to reorder', order0 !== order1 && order1.split(',')[2] === order0.split(',')[0], `${order0} -> ${order1}`);
  await q.screenshot({path:SP+'/d-board.png'});
  await q.click('.vtab[data-v="table"]'); await q.waitForTimeout(200); await q.click('[data-act="settings"]'); await q.waitForTimeout(200);
  check('settings popover opens', await q.isVisible('#menu'));
  await q.screenshot({path:SP+'/d-settings.png'});
  await q.click('#menu [data-go="general"]'); await q.waitForTimeout(150); await q.click('#sd-add'); await q.waitForTimeout(300);
  const nSample = parseInt(await q.textContent('#bcount'));
  check('sample data adds realistic volume', nSample > 500, nSample + ' pages');
  await q.keyboard.press('Escape'); await q.keyboard.press('Escape');
  await q.click('.vtab[data-v="cal"]'); await q.waitForTimeout(150); await q.click('.cal-h [data-act="scope"][data-v="week"]'); await q.waitForTimeout(300);
  const ad0 = (await q.locator('.tg-allw').boundingBox()).height, hb = await q.locator('[data-adrs]').boundingBox();
  await q.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await q.mouse.down(); await q.mouse.move(hb.x + hb.width / 2, hb.y - 50, {steps:6}); await q.mouse.up(); await q.waitForTimeout(200);
  const ad1 = (await q.locator('.tg-allw').boundingBox()).height;
  check('drag the all-day edge to resize it', ad1 < ad0 - 30, `${ad0} -> ${ad1}`);
  await q.screenshot({path:SP+'/d-week.png'});
  await q.click('[data-act="settings"]'); await q.click('#menu [data-go="general"]'); await q.waitForTimeout(150); await q.click('#sd-rm'); await q.click('#sd-rm'); await q.waitForTimeout(300);
  check('sample data removes only sample pages', (await q.evaluate(() => JSON.parse(localStorage.getItem('tagwerk:v2') || '{}'))) && parseInt(await q.textContent('#bcount')) < 10, await q.textContent('#bcount'));
  check('no page errors', !e2.length, e2.join(' | '));
  // workspace: folders and several databases, against an in-memory stand-in for the artifact database
  console.log('workspace (phone, mock db)');
  const c3 = await b.newContext({viewport:{width:402,height:874}, isMobile:true, hasTouch:true}); const w = await c3.newPage(); const e3 = [];
  w.on('pageerror', e => e3.push(e.message));
  await w.addInitScript(s => {
    localStorage.clear();
    const store = new Map(), subs = new Set(), cl = o => JSON.parse(JSON.stringify(o));
    const docSnap = p => ({exists:store.has(p), data:() => cl(store.get(p)), metadata:{fromCache:false}});
    const colSnap = p => { const docs = [...store.keys()].filter(k => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).map(k => ({id:k.slice(p.length + 1), data:() => cl(store.get(k))})); return {docs, empty:!docs.length, metadata:{fromCache:false}}; };
    const notify = () => subs.forEach(x => setTimeout(() => subs.has(x) && x.fn(x.col ? colSnap(x.p) : docSnap(x.p)), 5));
    const docRef = p => ({set:d => { store.set(p, cl(d)); notify(); return Promise.resolve(); }, delete:() => { store.delete(p); notify(); return Promise.resolve(); }, get:() => Promise.resolve(docSnap(p)),
      onSnapshot:fn => { const x = {p, fn}; subs.add(x); setTimeout(() => subs.has(x) && fn(docSnap(p)), 5); return () => subs.delete(x); }});
    const colRef = p => ({doc:id => docRef(p + '/' + id), get:() => Promise.resolve(colSnap(p)),
      onSnapshot:fn => { const x = {p, fn, col:true}; subs.add(x); setTimeout(() => subs.has(x) && fn(colSnap(p)), 5); return () => subs.delete(x); }});
    const api = {doc:docRef, collection:colRef};
    for (const t of s.tasks) { const b = {...t}; delete b.id; store.set('tasks/' + t.id, b); }
    store.set('meta/schema', {...s.schema, settings:{title:'Tagwerk', theme:'system', time24:true, weekStart:1}}); store.set('meta/views', {views:s.views});
    window.__store = store; window.claude = {use:async n => n === 'db' ? api : null};
  }, {...seed, schema:{props:[{id:'title',name:'Name',type:'title'},{id:'status',name:'Status',type:'status',options:[{id:'nb',name:'Nicht begonnen',color:'gray',group:'todo'},{id:'er',name:'Erledigt',color:'green',group:'done'}]}],colorRules:[]}, views:[{id:'table',name:'Table',type:'table',cols:['title','status'],hidden:[],widths:{},filters:[],sorts:[]}]});
  await w.goto('file://'+SP+'/wrapped.html'); await w.waitForTimeout(500);
  const wt = async sel => { await w.click(sel); await w.waitForTimeout(380); };
  const keys = () => w.evaluate(() => [...window.__store.keys()]);
  check('first run creates the workspace doc with the existing database', (await keys()).includes('meta/app') && (await w.evaluate(() => window.__store.get('meta/app').tree[0].name)) === 'Tagwerk');
  await wt('[data-act="side"]');
  check('sidebar drawer opens with the database', await w.evaluate(() => document.querySelector('#side').classList.contains('open')) && (await w.locator('#side .sr.on .sn').textContent()) === 'Tagwerk');
  await w.screenshot({path:SP+'/w-drawer.png'});
  await wt('#side [data-sa="newfolder"]'); await w.fill('#nf-name', 'Work'); await wt('#nf-ok');
  check('new folder appears in the tree', (await w.locator('#side .sr .sn', {hasText:'Work'}).count()) === 1);
  await wt('#side [data-sa="add"]'); await w.fill('#nd-name', 'Projects'); await wt('#menu [data-k="empty"]'); await wt('#nd-ok');
  await w.waitForTimeout(500);
  const st = await w.evaluate(() => { const app = window.__store.get('meta/app'), d = app.tree.find(x => x.name === 'Projects'); return {d, schema:window.__store.get('dbs/' + d.id + '/meta/schema'), views:window.__store.get('dbs/' + d.id + '/meta/views'), title:document.querySelector('#dbTitle').textContent, rows:document.querySelectorAll('.tbody > .tr').length}; });
  check('new database inside the folder, stored under dbs/<id>/', st.d.parent && st.schema && st.schema.props.length === 2 && st.views.views.length === 1 && st.title === 'Projects' && st.rows === 0, JSON.stringify({parent:st.d.parent, title:st.title, rows:st.rows}));
  check('drawer closes after opening a database', !(await w.evaluate(() => document.querySelector('#side').classList.contains('open'))));
  await wt('.bnew'); await w.keyboard.type('First project'); await w.waitForTimeout(700); await wt('[data-act="close"]'); await w.waitForTimeout(600);
  const pk = (await keys()).filter(k => k.startsWith('dbs/' + st.d.id + '/tasks/'));
  check('a page in the new database is written to its own collection', pk.length === 1 && (await keys()).filter(k => /^tasks\//.test(k)).length === 4, pk.join());
  await wt('[data-act="side"]'); await wt('#side [data-sid="main"]'); await w.waitForTimeout(400);
  check('switching back shows the first database again', (await w.textContent('#dbTitle')) === 'Tagwerk' && (await w.locator('.tbody > .tr').count()) === 4);
  await w.screenshot({path:SP+'/w-main.png'});
  await wt('[data-act="side"]'); await wt('#side [data-sid="' + st.d.id + '"]'); await w.waitForTimeout(400);
  check('and the new one keeps its page', (await w.locator('.tbody > .tr').count()) === 1);
  await wt('[data-act="side"]'); await w.click('#side .si[data-key="' + st.d.id + '"] [data-sa="more"]'); await w.waitForTimeout(380);
  await w.fill('#it-name', 'Client projects'); await w.fill('#it-icon', '🚀x'); await w.waitForTimeout(500);
  check('rename and emoji icon', (await w.textContent('#dbTitle')) === 'Client projects' && (await w.inputValue('#it-icon')) === '🚀' && (await w.locator('#side .emo').first().textContent()) === '🚀');
  await w.click('#menu [data-a="move"]'); await w.waitForTimeout(350); await w.click('#menu [data-to=""]'); await w.waitForTimeout(350);
  check('move to top level', (await w.evaluate(id => window.__store.get('meta/app').tree.find(x => x.id === id).parent, st.d.id)) === '' || (await w.waitForTimeout(500), (await w.evaluate(id => window.__store.get('meta/app').tree.find(x => x.id === id).parent, st.d.id)) === ''));
  await w.click('#menu [data-a="del"]'); await w.click('#menu [data-a="del"]'); await w.waitForTimeout(900);
  const left = (await keys()).filter(k => k.startsWith('dbs/'));
  check('deleting a database removes its pages and switches away', !left.length && (await w.textContent('#dbTitle')) === 'Tagwerk', left.join());
  await w.screenshot({path:SP+'/w-after.png'});
  check('no page errors', !e3.length, e3.join(' | '));
  await c3.close();
  await b.close();
  console.log(failed ? `${failed} check(s) FAILED` : 'all checks passed', `(screenshots in ${path.relative(process.cwd(), SP) || SP})`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
