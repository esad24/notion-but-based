// value editors opened from cells and the page sheet: text/number/url, option picker, option editor, color picker, date editor
function openEditor(anchor, id, pid){
  const p = P(pid), t = S.tasks.get(id); if (!p || !t) return;
  switch (p.type) {
    case 'title': return openSheet(id);
    case 'checkbox': return setVal(id, pid, !getV(t, p));
    case 'created_time': case 'last_edited_time': return;
    case 'select': case 'status': case 'multi_select': return openMenu(anchor, pickerPage(id, pid));
    case 'date': return openMenu(anchor, datePage(id, pid));
    default: return openMenu(anchor, textPage(id, pid));
  }
}
function textPage(id, pid){
  return {title:P(pid).name, tall:true, render(c){
    const p = P(pid), v = getV(S.tasks.get(id), p), num = p.type === 'number';
    const type = {url:'url', email:'email', phone:'tel'}[p.type] || 'text';
    c.innerHTML = grp(`<div class="cell">${p.type === 'text'
        ? `<textarea class="fld" id="ed" rows="4" placeholder="Empty">${h(v || '')}</textarea>`
        : `<input class="fld" id="ed" type="${num ? 'text' : type}" ${num ? 'inputmode="decimal"' : ''} value="${h(v ?? '')}" placeholder="Empty" autocomplete="off" enterkeyhint="done">`}</div>`)
      + (p.type === 'url' && v ? grp(`<a class="cell accent" href="${h(safeUrl(v))}" target="_blank" rel="noopener"><span class="cl">Open link</span></a>`) : '');
    const ed = c.querySelector('#ed');
    ed.addEventListener('input', () => {
      if (num) { const s = ed.value.trim().replace(',', '.'); const n = parseFloat(s); setVal(id, pid, s === '' || isNaN(n) ? null : n, 300); }
      else setVal(id, pid, ed.value, 300);
    });
    ed.addEventListener('keydown', e => { if (e.key === 'Enter' && (p.type !== 'text' || !e.shiftKey)) { e.preventDefault(); dismissMenu(); } });
    ed.focus();
    if (ed.type === 'text' || ed.tagName === 'TEXTAREA') { try { ed.setSelectionRange(ed.value.length, ed.value.length); } catch {} }
  }};
}
function pickerPage(id, pid){
  let q = '', act = 0;
  return {title:P(pid).name, render(c){
    const multi = P(pid).type === 'multi_select';
    c.innerHTML = `<label class="sfield pk-s">${IC.search}<input id="pk-q" type="search" placeholder="Search or create" autocomplete="off" enterkeyhint="done" value="${h(q)}"></label><div class="sel-chips" id="pk-sel"></div><div id="pk-list"></div>`;
    const inp = c.querySelector('#pk-q'), list = c.querySelector('#pk-list'), selEl = c.querySelector('#pk-sel');
    let items = [];
    const draw = () => {
      const t = S.tasks.get(id), p = P(pid); if (!t || !p) return closeMenu();
      const cur = getV(t, p), sel = multi ? (cur || []) : (cur ? [cur] : []);
      selEl.innerHTML = sel.map(x => opt(p, x)).filter(Boolean).map(o => `<span class="tag c-${o.color}">${h(o.name)}<button data-rm="${o.id}" aria-label="Remove ${h(o.name)}">${IC.x}</button></span>`).join('');
      const qq = q.trim().toLowerCase();
      const opts = (p.options || []).filter(o => !qq || o.name.toLowerCase().includes(qq));
      items = [];
      const line = o => {
        const i = items.push(o) - 1;
        return o.create
          ? `<div class="cell accent${i === act ? ' act' : ''}" data-i="${i}" role="button">${IC.plus}<span class="cl">Create <span class="tag c-${nextColor(p)}">${h(o.create)}</span></span></div>`
          : `<div class="cell opt${i === act ? ' act' : ''}" data-i="${i}" role="button"><span class="cl"><span class="tag${p.type === 'status' ? ' st' : ''} c-${o.color}">${h(o.name)}</span></span>${sel.includes(o.id) ? `<span class="ck">${IC.check}</span>` : ''}<button class="ibtn" data-edit="${o.id}" aria-label="Edit ${h(o.name)}">${IC.more}</button></div>`;
      };
      let html = '';
      if (qq && !(p.options || []).some(o => o.name.toLowerCase() === qq)) html += grp(line({create:q.trim()}));
      if (p.type === 'status' && !qq) {
        for (const [g, gl] of GROUPS) { const go = opts.filter(o => (o.group || 'todo') === g); if (go.length) html += grp(go.map(line).join(''), gl); }
      } else if (opts.length) html += grp(opts.map(line).join(''), qq ? '' : 'Options');
      if (!html) html = `<div class="grp-f">Type a name to create the first option.</div>`;
      act = Math.min(act, Math.max(0, items.length - 1));
      list.innerHTML = html;
    };
    const choose = it => {
      if (!it) return;
      const p = P(pid), cur = getV(S.tasks.get(id), p);
      let o = it;
      if (it.create) { o = addOption(p, it.create); q = ''; inp.value = ''; }
      if (multi) { const s = new Set(cur || []); if (s.has(o.id) && !it.create) s.delete(o.id); else s.add(o.id); setVal(id, pid, [...s]); draw(); }
      else { setVal(id, pid, cur === o.id && !it.create ? null : o.id); dismissMenu(); }
    };
    list.addEventListener('click', e => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { e.stopPropagation(); return pushMenu(optionPage(pid, ed.dataset.edit)); }
      const r = e.target.closest('[data-i]'); if (r) choose(items[+r.dataset.i]);
    });
    selEl.addEventListener('click', e => {
      const b = e.target.closest('[data-rm]'); if (!b) return;
      if (multi) setVal(id, pid, (getV(S.tasks.get(id), P(pid)) || []).filter(x => x !== b.dataset.rm)); else setVal(id, pid, null);
      draw();
    });
    inp.addEventListener('input', () => { q = inp.value; act = 0; draw(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { act = Math.min(act + 1, items.length - 1); draw(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { act = Math.max(act - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(items[act]); }
      else if (e.key === 'Backspace' && !inp.value && multi) { const cur = getV(S.tasks.get(id), P(pid)) || []; if (cur.length) { setVal(id, pid, cur.slice(0, -1)); draw(); } }
    });
    draw();
    if (!narrow()) inp.focus();
  }};
}
function colorGrid(cur){
  return grp(`<div class="swl">${COLORS.map(k => `<button class="sw c-${k}${k === cur ? ' on' : ''}" data-c="${k}"><i></i>${cap(k)}</button>`).join('')}</div>`
    + `<label class="cell cust"><span class="sw-i c-${isCustom(cur) ? cur : 'none'}"></span><span class="cl">Custom color</span><span class="cv"><input type="color" value="${isCustom(cur) ? '#' + cur.slice(2) : '#7a6ff0'}" aria-label="Pick a custom color"></span></label>`, 'Color');
}
function bindColorGrid(c, pick){
  c.querySelector('.swl').addEventListener('click', e => { const b = e.target.closest('.sw'); if (b) pick(b.dataset.c); });
  c.querySelector('.cust input').addEventListener('change', e => pick('h-' + e.target.value.slice(1).toLowerCase()));
}
function colorPickPage(cur, onPick){
  return {title:'Color', render(c){ c.innerHTML = colorGrid(cur); bindColorGrid(c, k => { onPick(k); popMenu(); }); }};
}
function optionPage(pid, oid){
  let confirm = false;
  const O = () => opt(P(pid), oid);
  return {title:'Edit option', render(c){
    const p = P(pid), o = O(); if (!p || !o) return popMenu();
    c.innerHTML = grp(fldCell('op-name', o.name, 'Option name'), 'Name')
      + (p.type === 'status' ? grp(segCell('grp', GROUPS, o.group || 'todo'), 'Status group') : '')
      + colorGrid(o.color)
      + grp(actCell('id="op-del"', 'Delete option', IC.trash, 'danger'));
    const nm = c.querySelector('#op-name');
    nm.addEventListener('input', () => { const x = O(); if (!x) return; x.name = nm.value || 'Untitled'; saveSchema(); render(); });
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') nm.blur(); });
    bindControls(c, {seg:{grp:v => { const x = O(); if (x) { x.group = v; saveSchema(); render(); } }}});
    bindColorGrid(c, k => { const x = O(); if (!x) return; x.color = k; saveSchema(); render(); redrawMenu(); });
    c.querySelector('#op-del').addEventListener('click', e => {
      const n = [...S.tasks.values()].filter(t => { const v = t.p && t.p[pid]; return Array.isArray(v) ? v.includes(oid) : v === oid; }).length;
      if (n && !confirm) { confirm = true; e.currentTarget.querySelector('.cl').textContent = `Tap again: clears it from ${n} page${n > 1 ? 's' : ''}`; return; }
      deleteOption(pid, oid); popMenu();
    });
  }};
}
function datePage(id, pid){
  return {title:P(pid).name, render(c){
    const v = getV(S.tasks.get(id), P(pid)) || {};
    const ed = endDay(v);
    const row = (label, k, dv, tv) => `<div class="cell de"><span class="cl">${label}</span>
      <input type="date" class="dpill" id="de-${k}d" value="${h(dv || '')}" aria-label="${label} date">
      <input type="time" class="dpill" id="de-${k}t" value="${h(tv || '')}" aria-label="${label} time">
      <button class="xbtn" data-clr="${k}" aria-label="Clear ${label.toLowerCase()}" ${dv || tv ? '' : 'disabled'}>${IC.x}</button></div>`;
    c.innerHTML = grp(row('Starts', 's', v.d, v.t) + row('Ends', 'e', ed, v.e), '', 'Leave a time empty for an all-day date. The end is optional.')
      + grp(`<div class="cell"><div class="qd"><button data-q="0">Today</button><button data-q="1">Tomorrow</button><button data-q="mon">Next Monday</button><button data-q="7">In a week</button></div></div>`, 'Quick set')
      + grp(actCell('id="de-clear"', 'Remove date', IC.trash, 'danger'));
    const cur = () => { const x = getV(S.tasks.get(id), P(pid)) || {}; return {d:x.d || '', t:x.t || '', ed:endDay(x), e:x.e || ''}; };
    const save = x => {
      if (!x.d && (x.ed || x.t || x.e)) x.d = x.ed || todayKey();
      if (x.e && !x.ed) x.ed = x.d;
      if (x.ed && x.ed < x.d) x.ed = x.d;
      if (x.ed === x.d && x.t && x.e && x.e <= x.t) x.e = fromMin(toMin(x.t) + 60);
      setVal(id, pid, x.d ? x : null);
    };
    const field = (k, f) => c.querySelector('#de-' + k).addEventListener('change', e => {
      const x = cur(), val = e.target.value, before = {...x};
      x[f] = val;
      // moving the start keeps the length of the range
      if (f === 'd' && val && before.d && before.ed) x.ed = addDays(before.ed, dayDiff(before.d, val));
      if (f === 't' && val && before.t && before.e && sameDay(before)) x.e = fromMin(Math.min(toMin(val) + durOf(before), 1439));
      save(x); redrawMenu();
    });
    field('sd', 'd'); field('st', 't'); field('ed', 'ed'); field('et', 'e');
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-clr]');
      if (b) {
        const x = cur();
        if (b.dataset.clr === 's') { if (x.t) x.t = ''; else { setVal(id, pid, null); return redrawMenu(); } }
        else { x.ed = ''; x.e = ''; }
        save(x); return redrawMenu();
      }
      const q = e.target.closest('[data-q]');
      if (q) {
        const d = q.dataset.q === 'mon' ? addDays(todayKey(), ((8 - new Date().getDay()) % 7) || 7) : addDays(todayKey(), +q.dataset.q);
        const x = cur(); if (x.d && x.ed) x.ed = addDays(x.ed, dayDiff(x.d, d));
        x.d = d; save(x); dismissMenu();
      }
      if (e.target.closest('#de-clear')) { setVal(id, pid, null); dismissMenu(); }
    });
  }};
}
