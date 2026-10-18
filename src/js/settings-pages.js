// settings pages: view settings, properties shown, groups, general, views, all properties, new view, new group, "No date" tray
function propsVisPage(){
  return {title:'Properties', render(c){
    const v = V(), fixedId = v.type === 'board' || v.type === 'list' ? v.groupBy : v.type === 'calendar' ? v.dateProp : null;
    const where = {table:'columns of the table', board:'lines on each card', calendar:'lines on each calendar entry', list:'details under each row'}[v.type];
    c.innerHTML = `<div class="grp-h">Shown in “${h(v.name)}”</div><div class="grp" id="pv-list">${viewProps(v).map(p => {
        const fixed = p.type === 'title' || p.id === fixedId, on = fixed || !isHidden(v, p.id);
        return `<div class="cell${on ? '' : ' off'}" data-key="${p.id}"${fixed ? '' : ` data-eye="${p.id}" role="switch" aria-checked="${on}"`}><span class="hdl">${IC.grip}</span>${TI[p.type] || ''}<span class="cl">${h(p.name)}</span><span class="cv">${fixed ? (p.type === 'title' ? 'Always' : v.type === 'calendar' ? 'Calendar by' : 'Grouped by') : `<span class="tgl${on ? ' on' : ''}"></span>`}</span></div>`;
      }).join('')}</div><div class="grp-f">Turned-on properties are the ${where}. Drag the grip to reorder.</div>`
      + grp(linkCell('id="pv-new"', 'New property', '', icb(IC.plus, IC_COL.blue)));
    const list = c.querySelector('#pv-list');
    sortable(list, keys => { V().cols = keys; saveViews(); render(); });
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-eye]'); if (!b || e.target.closest('.hdl')) return;
      const cv = V(), id = b.dataset.eye, s = new Set(cv.hidden || []); s.has(id) ? s.delete(id) : s.add(id); cv.hidden = [...s];
      const on = !s.has(id); b.classList.toggle('off', !on); b.setAttribute('aria-checked', on); b.querySelector('.tgl').classList.toggle('on', on);
      saveViews(); render();
    });
    c.querySelector('#pv-new').addEventListener('click', () => pushMenu(newPropPage()));
  }};
}
function groupsPage(){
  return {title:'Groups', render(c){
    const v = V(), gp = P(v.groupBy);
    if (!isGroupProp(gp)) { c.innerHTML = `<div class="grp-f">Choose a Select or Status property under “Group by” first.</div>`; return; }
    const hid = new Set(v.hiddenGroups || []);
    c.innerHTML = `<div class="grp-h">${h(gp.name)}</div><div class="grp"><div id="gr-list">${(gp.options || []).map(o => `<div class="cell${hid.has(o.id) ? ' off' : ''}" data-key="${o.id}"><span class="hdl">${IC.grip}</span><span class="cl" data-open="${o.id}" role="button"><span class="tag${gp.type === 'status' ? ' st' : ''} c-${o.color}">${h(o.name)}</span></span><span class="cv"><button class="tgl${hid.has(o.id) ? '' : ' on'}" data-vis="${o.id}" role="switch" aria-checked="${!hid.has(o.id)}" aria-label="Show ${h(o.name)}"></button></span></div>`).join('')}</div>${fldCell('gr-new', '', 'Add a group')}</div>
      <div class="grp-f">Hold the grip and slide to reorder. Tap a group to rename it or change its color. You can also hold a column header on the board and slide it.</div>`
      + grp(tglCell('hideEmpty', 'Hide empty groups', !!v.hideEmpty) + tglCell('showNone', `Show “No ${h(gp.name)}”`, v.showNone !== false));
    sortable(c.querySelector('#gr-list'), keys => { const x = P(V().groupBy); const rest = x.options.filter(o => !keys.includes(o.id)); x.options = keys.map(k => opt(x, k)).filter(Boolean).concat(rest); saveSchema(); render(); });
    c.querySelector('#gr-list').addEventListener('click', e => {
      const t = e.target.closest('[data-vis]');
      if (t) { const cv = V(), s = new Set(cv.hiddenGroups || []), id = t.dataset.vis; s.has(id) ? s.delete(id) : s.add(id); cv.hiddenGroups = [...s]; t.classList.toggle('on', !s.has(id)); t.closest('.cell').classList.toggle('off', s.has(id)); saveViews(); render(); return; }
      const o = e.target.closest('[data-open]'); if (o) pushMenu(optionPage(V().groupBy, o.dataset.open));
    });
    const ni = c.querySelector('#gr-new');
    ni.addEventListener('keydown', e => { if (e.key !== 'Enter' || !ni.value.trim()) return; e.preventDefault(); addOption(P(V().groupBy), ni.value.trim()); render(); redrawMenu(); const n2 = $('#gr-new'); if (n2) n2.focus(); });
    bindControls(c, {tg:{hideEmpty:on => { V().hideEmpty = on; saveViews(); render(); }, showNone:on => { V().showNone = on; saveViews(); render(); }}});
  }};
}
function settingsPage(){
  let confirm = false;
  return {title:'View settings', render(c){
    const v = V();
    const groupables = S.schema.props.filter(p => GROUPABLE(p.type));
    const dates = S.schema.props.filter(p => p.type === 'date');
    const shownN = shownProps(v).length, gp = P(v.groupBy);
    let html = grp(fldCell('vs-name', v.name, 'View name'), 'Name') + grp(segCell('layout', LAYOUTS.map(l => [l[0], l[1]]), v.type), 'Layout');
    if (v.type === 'board' || v.type === 'list') {
      const gopts = (v.type === 'list' ? [['', 'None']] : (P(v.groupBy) ? [] : [['', 'Choose…']])).concat(groupables.map(p => [p.id, p.name]));
      html += grp(selCell('groupBy', 'Group by', gopts, v.groupBy || '', icb(TI.select, IC_COL.teal))
        + (gp ? linkCell('data-go="groups"', 'Groups', String((gp.options || []).length), icb(IC.board, IC_COL.indigo)) : '')
        + tglCell('showCheck', 'Show checkboxes', v.showCheck !== false, icb(IC.check, IC_COL.green)), v.type === 'board' ? 'Board' : 'List');
    }
    if (v.type === 'calendar') {
      html += grp(selCell('dateProp', 'Calendar by', (P(v.dateProp) ? [] : [['', 'Choose…']]).concat(dates.map(p => [p.id, p.name])), v.dateProp || '', icb(IC.calendar, IC_COL.red))
        + segCell('scope', SCOPES.map(s => [s.v, s.l]), scopeOf(v)), 'Calendar');
    }
    if (v.type === 'table') {
      html += grp(tglCell('wrap', 'Wrap cell text', v.wrap !== false, icb(TI.text, IC_COL.gray)) + segCell('density', [['compact', 'Compact'], ['regular', 'Regular'], ['tall', 'Tall']], v.density || 'regular'), 'Table');
    }
    html += grp(linkCell('data-go="props"', 'Properties', `${shownN} shown`, icb(TI.multi_select, IC_COL.blue))
      + linkCell('data-go="filters"', 'Filter', String((v.filters || []).filter(ruleReady).length || ''), icb(IC.filter, IC_COL.orange))
      + linkCell('data-go="sorts"', 'Sort', String((v.sorts || []).length || ''), icb(IC.sort, IC_COL.green))
      + linkCell('data-go="colors"', 'Conditional color', String((S.schema.colorRules || []).length || ''), icb(IC.palette, IC_COL.purple)), 'This view');
    html += grp(linkCell('data-go="general"', 'General', '', icb(IC.gear, IC_COL.gray))
      + linkCell('data-go="views"', 'Views', String(S.views.length), icb(IC.table, IC_COL.indigo))
      + linkCell('data-go="allprops"', 'All properties', String(S.schema.props.length), icb(TI.text, IC_COL.pink)), 'App');
    html += grp(actCell('data-a="dup"', 'Duplicate view', IC.copy) + (S.views.length > 1 ? actCell('data-a="del"', 'Delete view', IC.trash, 'danger') : ''));
    c.innerHTML = html;
    const nm = c.querySelector('#vs-name');
    nm.addEventListener('input', () => { V().name = nm.value || 'Untitled'; saveViews(); renderBar(); });
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') nm.blur(); });
    bindControls(c, {
      seg:{layout:t => { setLayout(V(), t); redrawMenu(); }, scope:s => setScope(s), density:d => { V().density = d; saveViews(); render(); }},
      sel:{groupBy:val => { V().groupBy = val; saveViews(); render(); redrawMenu(); }, dateProp:val => { V().dateProp = val; saveViews(); render(); }},
      tg:{showCheck:on => { V().showCheck = on; saveViews(); render(); }, wrap:on => { V().wrap = on; saveViews(); render(); }},
    });
    c.addEventListener('click', e => {
      const g = e.target.closest('[data-go]');
      if (g) return pushMenu({props:propsVisPage, filters:filtersPage, sorts:sortsPage, colors:colorsPage, groups:groupsPage, general:generalPage, views:viewsPage, allprops:allPropsPage}[g.dataset.go]());
      const a = e.target.closest('[data-a]'); if (!a) return;
      const cv = V();
      if (a.dataset.a === 'dup') { const nv = {...clone(cv), id:newId(), name:cv.name + ' (copy)'}; S.views.splice(S.views.indexOf(cv) + 1, 0, nv); S.vid = nv.id; resetX = true; saveViews(); render(); redrawMenu(); }
      if (a.dataset.a === 'del') {
        if (!confirm) { confirm = true; a.querySelector('.cl').textContent = 'Tap again to delete this view'; return; }
        S.views = S.views.filter(x => x !== cv); S.vid = S.views[0].id; resetX = true; saveViews(); render(); dismissMenu(); toast(`Deleted view “${cv.name}”`);
      }
    });
  }};
}
function generalPage(){
  return {title:'General', render(c){
    const st = ST();
    c.innerHTML = grp(fldCell('g-title', st.title, 'Database name'), 'Database name')
      + grp(segCell('theme', [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']], st.theme), 'Appearance')
      + grp(tglCell('time24', '24-hour time', st.time24 !== false, icb(IC.clock, IC_COL.orange))
        + selCell('ws', 'Week starts on', [['1', 'Monday'], ['0', 'Sunday'], ['6', 'Saturday']], String(st.weekStart ?? 1), icb(IC.calendar, IC_COL.red)), 'Date & time');
    const ti = c.querySelector('#g-title');
    ti.addEventListener('input', () => setST('title', ti.value));
    ti.addEventListener('keydown', e => { if (e.key === 'Enter') ti.blur(); });
    bindControls(c, {seg:{theme:t => setST('theme', t)}, tg:{time24:on => setST('time24', on)}, sel:{ws:val => setST('weekStart', +val)}});
  }};
}
function viewsPage(){
  return {title:'Views', render(c){
    c.innerHTML = `<div class="grp-h">Views</div><div class="grp" id="vw-list">${S.views.map(x => `<div class="cell" data-key="${x.id}" role="button"><span class="hdl">${IC.grip}</span>${layoutIcon(x.type)}<span class="cl">${h(x.name)}</span>${x.id === S.vid ? `<span class="ck">${IC.check}</span>` : ''}${chev}</div>`).join('')}</div>
      <div class="grp-f">Hold the grip and slide to reorder the view tabs. Tap a view to open its settings.</div>`
      + grp(actCell('id="vw-add"', 'Add view', IC.plus, 'accent'));
    sortable(c.querySelector('#vw-list'), keys => { S.views = keys.map(k => S.views.find(x => x.id === k)).filter(Boolean); saveViews(); renderBar(); });
    c.querySelector('#vw-list').addEventListener('click', e => {
      const r = e.target.closest('[data-key]'); if (!r || e.target.closest('.hdl')) return;
      if (S.vid !== r.dataset.key) { S.vid = r.dataset.key; resetX = true; $('#view').scrollTo(0, 0); render(); }
      pushMenu(settingsPage());
    });
    c.querySelector('#vw-add').addEventListener('click', () => pushMenu(addViewPage()));
  }};
}
function allPropsPage(){
  return {title:'All properties', render(c){
    c.innerHTML = `<div class="grp-h">Properties</div><div class="grp" id="ap-list">${S.schema.props.map(p => `<div class="cell" data-key="${p.id}" role="button"><span class="hdl">${IC.grip}</span>${TI[p.type] || ''}<span class="cl">${h(p.name)}</span><span class="cv">${h(typeLabel(p.type))}${chev}</span></div>`).join('')}</div>
      <div class="grp-f">This order is used on each page. Tap a property to rename it, change its type or edit its options.</div>`
      + grp(actCell('id="ap-add"', 'New property', IC.plus, 'accent'));
    sortable(c.querySelector('#ap-list'), keys => { S.schema.props = keys.map(k => P(k)).filter(Boolean); saveSchema(); render(); });
    c.querySelector('#ap-list').addEventListener('click', e => { const r = e.target.closest('[data-key]'); if (r && !e.target.closest('.hdl')) pushMenu(propPage(r.dataset.key, {inView:false})); });
    c.querySelector('#ap-add').addEventListener('click', () => pushMenu(newPropPage()));
  }};
}
function setLayout(v, type){
  v.type = type;
  if (type === 'board' && !P(v.groupBy)) v.groupBy = firstPropId(p => GROUPABLE(p.type));
  if (type === 'calendar' && !P(v.dateProp)) v.dateProp = firstPropId(p => p.type === 'date');
  if (type === 'calendar') scrollToMorning = scopeOf(v) !== 'month';
  resetX = true; $('#view').scrollTo(0, 0);
  saveViews(); render();
}
function addViewPage(){
  const cols = {table:IC_COL.blue, board:IC_COL.orange, calendar:IC_COL.red, list:IC_COL.green};
  return {title:'New view', render(c){
    c.innerHTML = grp(LAYOUTS.map(l => `<button class="cell" data-l="${l[0]}">${icb(l[2], cols[l[0]])}<span class="cl">${l[1]}</span></button>`).join(''), 'Layout');
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-l]'); if (!b) return;
      const type = b.dataset.l, label = LAYOUTS.find(l => l[0] === type)[1];
      let name = label, i = 2; while (S.views.some(v => v.name === name)) name = label + ' ' + i++;
      const v = {id:newId(), name, type, cols:S.schema.props.map(p => p.id), hidden:type === 'table' ? [] : S.schema.props.filter(p => p.type === 'created_time' || p.type === 'last_edited_time').map(p => p.id), widths:{}, filters:[], sorts:[], scope:'month', groupBy:type === 'list' ? '' : undefined};
      S.views.push(v); S.vid = v.id; setLayout(v, type);
      dismissMenu();
      requestAnimationFrame(() => { const tab = document.querySelector(`.vtab[data-v="${v.id}"]`); if (tab) tab.scrollIntoView({inline:'nearest', block:'nearest'}); });
    });
  }};
}
function addGroupPage(){
  return {title:'New group', tall:true, render(c){
    c.innerHTML = grp(fldCell('ng', '', 'Group name'), 'Name') + grp(actCell('id="ng-ok"', 'Add group', IC.plus, 'accent'));
    const inp = c.querySelector('#ng');
    const go = () => { const n = inp.value.trim(), gp = P(V().groupBy); if (!n || !gp) return; addOption(gp, n); render(); dismissMenu(); requestAnimationFrame(() => { const x = $('#view .hx'); if (x) x.scrollTo({left:x.scrollWidth, behavior:'smooth'}); }); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    c.querySelector('#ng-ok').addEventListener('click', go);
    inp.focus();
  }};
}
function trayPage(){
  return {title:'No date', render(c){
    const v = V(), dp = P(v.dateProp);
    const list = visible(v).filter(t => !(getV(t, dp) || {}).d);
    const ctx = {dp, shown:shownProps(v).filter(p => p.id !== dp.id && p.type !== 'title'), check:true};
    c.innerHTML = list.length
      ? grp(list.map(t => rowHtml(t, ctx)).join(''), '', narrow() ? 'Tap a page to give it a date. Swipe right to complete, left to delete.' : 'Drag a page onto a day, or click it to open.').replace('<div class="grp">', '<div class="grp lst">')
      : `<div class="grp-f">Every page has a date.</div>`;
  }};
}
