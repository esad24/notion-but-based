// helpers used everywhere: $ (query), h (HTML escape), narrow (phone layout?), svg, clone, stable (sorted-key JSON), cap, newId
const $ = s => document.querySelector(s);
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mq = matchMedia('(max-width:640px)');
const narrow = () => mq.matches;
const svg = d => `<svg viewBox="0 0 16 16">${d}</svg>`;
const clone = o => JSON.parse(JSON.stringify(o));
const stable = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((a, x) => (a[x] = v[x], a), {}) : v);
const cap = s => s[0].toUpperCase() + s.slice(1);
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
