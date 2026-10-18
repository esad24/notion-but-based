// Headless phone smoke test for a single-file web app (Playwright + Chromium).
// Usage: node phone-smoke.js path/to/app.html [outDir]
// Copy this file, replace the SCENARIO section with taps for your app, keep the helpers.
//
// What it gives you:
//  - the page wrapped like the Artifact publish skeleton (charset, viewport-fit=cover, [hidden] reset)
//  - an iPhone-sized touch context (402x874, DPR 3) and a desktop context
//  - swipe(): dispatches real TouchEvents, so touch-gesture code is exercised (not just mouse clicks)
//  - console/page errors collected and printed at the end
//  - screenshots you must LOOK at (read the PNGs) before publishing
// Limits: this is Chromium, not Safari. It does not prove real finger feel, momentum scrolling,
// the iOS keyboard, safe-area insets on a device, or Safari-only bugs. Say so in your report.
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const file = path.resolve(process.argv[2] || 'app.html');
const out = path.resolve(process.argv[3] || path.join(path.dirname(file), 'smoke-out'));
fs.mkdirSync(out, { recursive: true });
const wrapped = path.join(out, 'wrapped.html');
fs.writeFileSync(wrapped, `<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>${fs.readFileSync(file, 'utf8')}</body></html>`);

const DEVICES = {
  phone: { viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  desktop: { viewport: { width: 1400, height: 900 } },
};

// Real touch swipe from the centre-top of `selector` by (dx, dy) pixels.
const swipe = (page, selector, dx, dy, steps = 8) => page.evaluate(([sel, dx, dy, steps]) => new Promise(res => {
  const el = document.querySelector(sel); const r = el.getBoundingClientRect();
  const x0 = r.left + r.width / 2, y0 = r.top + Math.min(r.height / 2, 30);
  const T = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
  const fire = (type, x, y) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [T(x, y)], changedTouches: [T(x, y)] }));
  fire('touchstart', x0, y0); let i = 0;
  const step = () => { i++; fire('touchmove', x0 + dx * i / steps, y0 + dy * i / steps); if (i < steps) requestAnimationFrame(step); else { fire('touchend', x0 + dx, y0 + dy); setTimeout(res, 350); } };
  requestAnimationFrame(step);
}), [selector, dx, dy, steps]);

(async () => {
  const browser = await chromium.launch();
  for (const [name, opts] of Object.entries(DEVICES)) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
    // Seed local storage once per context if your app reads a cache key (edit the key/shape):
    // await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('app:cache', JSON.stringify({})); sessionStorage.setItem('seeded', '1'); } });
    await page.goto('file://' + wrapped);
    await page.waitForTimeout(300);
    const tap = async sel => { await page.click(sel); await page.waitForTimeout(280); };
    const shot = n => page.screenshot({ path: path.join(out, `${name}-${n}.png`) });

    // ---------- SCENARIO (replace) ----------
    await shot('first-view');
    console.log(name, 'page overflows horizontally:', await page.evaluate(() => document.documentElement.scrollWidth > innerWidth));
    // await tap('[data-act="settings"]'); await shot('settings');
    // await swipe(page, '#menu .mhead', 0, 220); // pull a sheet down to close it
    // ----------------------------------------

    console.log(name, 'errors:', errors.length ? errors : 'none');
    await ctx.close();
  }
  await browser.close();
  console.log('screenshots in', out);
})();
