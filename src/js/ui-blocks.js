// HTML builders for iOS grouped settings lists (grp, linkCell, actCell, tglCell, segCell, selCell, fldCell) and bindControls
const chev = `<span class="chev">${IC.right}</span>`;
const icb = (icon, color) => `<span class="ic-b" style="--ic:${color}">${icon}</span>`;
const grp = (body, head = '', foot = '') => `${head ? `<div class="grp-h">${head}</div>` : ''}<div class="grp">${body}</div>${foot ? `<div class="grp-f">${foot}</div>` : ''}`;
const linkCell = (attrs, label, val = '', icon = '') => `<button class="cell" ${attrs}>${icon}<span class="cl">${label}</span><span class="cv">${val}${chev}</span></button>`;
const actCell = (attrs, label, icon = '', cls = '') => `<button class="cell ${cls}" ${attrs}>${icon}<span class="cl">${label}</span></button>`;
const tglCell = (key, label, on, icon = '') => `<button class="cell" data-tg="${key}" role="switch" aria-checked="${!!on}">${icon}<span class="cl">${label}</span><span class="cv"><span class="tgl${on ? ' on' : ''}"></span></span></button>`;
const segCell = (key, opts, cur) => `<div class="cell seg-cell"><div class="segc" data-seg="${key}" role="group">${opts.map(([v, l]) => `<button data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div></div>`;
const selCell = (key, label, opts, cur, icon = '') => `<label class="cell">${icon}<span class="cl">${label}</span><span class="cv"><select data-sel="${key}" aria-label="${h(label)}">${opts.map(([v, l]) => `<option value="${h(v)}"${String(v) === String(cur) ? ' selected' : ''}>${h(l)}</option>`).join('')}</select>${chev}</span></label>`;
const fldCell = (id, val, ph, attrs = '') => `<div class="cell"><input class="fld" id="${id}" value="${h(val)}" placeholder="${h(ph)}" autocomplete="off" enterkeyhint="done" ${attrs}></div>`;
function bindControls(c, on){
  c.addEventListener('click', e => {
    const t = e.target.closest('[data-tg]');
    if (t && on.tg && on.tg[t.dataset.tg]) {
      const nv = t.getAttribute('aria-checked') !== 'true';
      t.setAttribute('aria-checked', nv); t.querySelector('.tgl').classList.toggle('on', nv);
      return on.tg[t.dataset.tg](nv);
    }
    const s = e.target.closest('.segc button');
    if (s) { const g = s.parentElement; g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === s)); if (on.seg && on.seg[g.dataset.seg]) on.seg[g.dataset.seg](s.dataset.v); }
  });
  c.addEventListener('change', e => { const k = e.target.dataset.sel; if (k && on.sel && on.sel[k]) on.sel[k](e.target.value); });
}
const IC_COL = {blue:'#0a84ff', orange:'#ff9f0a', green:'#30b158', purple:'#af52de', teal:'#30b0c7', gray:'#8e8e93', indigo:'#5e5ce6', pink:'#ff375f', red:'#ff3b30'};
