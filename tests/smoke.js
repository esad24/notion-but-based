// Phone + desktop smoke test for src/tagwerk.html. Run: node tests/smoke.js   (screenshots go to tests/out/)
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SP = path.join(__dirname, 'out');
fs.mkdirSync(SP, { recursive: true });
fs.writeFileSync(SP+'/wrapped.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>${fs.readFileSync(ROOT+'/src/tagwerk.html','utf8')}</body></html>`);
const mk = (id, title, p, o) => ({id, title, created:o, updated:o, order:o, p});
const seed = {tasks:[
  mk('a','Plan the week',{status:'nb',priority:'h',category:'looks',date:{d:'2026-10-14',t:'',e:''}},1),
  mk('b','Dentist appointment',{status:'nb',priority:'h',date:{d:'2026-10-19',t:'08:00',e:'09:00'}},2),
  mk('c','Call the accountant',{status:'nb',priority:'sh',category:'business',date:{d:'2026-10-13',t:'',e:''}},3),
  mk('d','Tax return',{status:'er',priority:'h',category:'business'},4),
]};
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
  await shot('board');
  console.log('bottom bar visible:', await p.isVisible('#bbar'), 'title:', await p.textContent('#dbTitle'));
  // table: header + rows share one horizontal scroller
  await tap('.vtab[data-v="table"]');
  const tb = await p.evaluate(() => { const hx = document.querySelector('#view .hx'); const head = hx.querySelector('.tb-h'), row = hx.querySelector('.tr');
    hx.scrollLeft = 250; const vy = hx.querySelector('.vy');
    return {sameScroller: hx.contains(head) && hx.contains(row), viewOverflow:getComputedStyle(document.querySelector('#view')).overflow, vyY:getComputedStyle(vy).overflowY, vyX:getComputedStyle(vy).overflowX, headLeft:head.getBoundingClientRect().left, rowLeft:row.getBoundingClientRect().left}; });
  console.log('table:', JSON.stringify(tb));
  await shot('table');
  // settings sheet
  await tap('[data-act="settings"]');
  console.log('settings cells:', await p.locator('#menu .cell').count(), 'segmented:', await p.locator('#menu .segc').count(), 'toggles:', await p.locator('#menu .tgl').count());
  await shot('settings');
  await tap('#menu [data-tg="wrap"]');
  console.log('wrap off applied:', await p.locator('.tbl.nowrap').count());
  await tap('#menu .segc[data-seg="density"] button[data-v="tall"]');
  console.log('density tall:', await p.locator('.tbl.d-tall').count());
  await tap('#menu [data-go="general"]');
  await shot('general');
  await tap('#menu [data-tg="time24"]');
  // swipe right to go back
  await swipe('#menu .mc', 160, 4);
  console.log('after swipe-back title:', await p.textContent('#menu .mt'));
  // pull down to close
  await swipe('#menu .mhead', 0, 220);
  await p.waitForTimeout(300);
  console.log('menu closed by pull:', await p.isHidden('#menu'));
  // list view
  await tap('[data-act="addview"]'); await tap('#menu [data-l="list"]'); await p.waitForTimeout(400);
  console.log('list rows:', await p.locator('.lv .sw-row').count());
  await shot('list');
  const firstId = await p.getAttribute('.lv .sw-row', 'data-id');
  await swipe('.lv .sw-row', 140, 0);
  await p.waitForTimeout(300);
  console.log('swipe right completed:', await p.locator(`.sw-row[data-id="${firstId}"] .row.done`).count() === 1);
  const n0 = await p.locator('.lv .sw-row').count();
  await swipe('.lv .sw-row:last-child', -160, 0);
  await p.waitForTimeout(400);
  console.log('swipe left deleted:', (await p.locator('.lv .sw-row').count()) === n0 - 1, 'toast:', await p.textContent('#toastMsg'));
  // list settings: group by category
  await tap('[data-act="settings"]');
  await p.selectOption('#menu select[data-sel="groupBy"]', 'category'); await p.waitForTimeout(300);
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(400);
  console.log('list sections:', await p.locator('.lv-sec').count());
  // calendar swipe
  await tap('.vtab[data-v="cal"]');
  const m0 = await p.textContent('.cal-h h2');
  await swipe('.grid', -180, 5);
  console.log('calendar swipe:', m0, '->', await p.textContent('.cal-h h2'));
  // date editor + 12h
  await tap('.vtab[data-v="table"]');
  await p.locator('.tr').first().locator('.td.title').click(); await p.waitForTimeout(400);
  await tap('.pv[data-prop="date"]');
  await shot('date');
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(350);
  // text editor goes tall
  await tap('#sheet [data-act="addprop"]'); await tap('#menu [data-t="text"]');
  console.log('name field focused → tall sheet:', await p.evaluate(() => document.querySelector('#menu').classList.contains('tall')));
  await shot('tall');
  await p.click('#menu [data-m="close"]'); await p.waitForTimeout(350);
  await tap('[data-act="close"]'); await p.waitForTimeout(300);
  // board column reorder by drag (mouse on desktop context later); check data-o present
  await tap('.vtab[data-v="board"]');
  console.log('draggable columns:', await p.locator('.col[data-o]').count());
  console.log('body overflow:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'errors:', errs.length ? errs : 'none');
  await ctx.close();
  // desktop: column drag with mouse
  const c2 = await b.newContext({viewport:{width:1300,height:850}}); const q = await c2.newPage(); const e2=[];
  q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(s => { localStorage.setItem('tagwerk:v2', JSON.stringify(s)); localStorage.setItem('tagwerk:vid','board'); }, seed);
  await q.goto('file://'+SP+'/wrapped.html'); await q.waitForTimeout(300);
  const order0 = await q.$$eval('.col[data-o]', cs => cs.map(c => c.dataset.o).slice(0,3).join(','));
  const h1 = await q.locator('.col[data-o] .col-h').nth(0).boundingBox(), h3 = await q.locator('.col[data-o]').nth(2).boundingBox();
  await q.mouse.move(h1.x + 30, h1.y + 15); await q.mouse.down(); await q.mouse.move(h1.x + 60, h1.y + 20, {steps:4});
  await q.mouse.move(h3.x + h3.width - 20, h1.y + 20, {steps:10}); await q.mouse.up(); await q.waitForTimeout(300);
  console.log('desktop column order:', order0, '->', await q.$$eval('.col[data-o]', cs => cs.map(c => c.dataset.o).slice(0,3).join(',')));
  await q.screenshot({path:SP+'/d-board.png'});
  await q.click('.vtab[data-v="table"]'); await q.waitForTimeout(200); await q.click('[data-act="settings"]'); await q.waitForTimeout(200);
  await q.screenshot({path:SP+'/d-settings.png'});
  console.log('desktop errors:', e2.length ? e2 : 'none');
  await b.close();
})();
