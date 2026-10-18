// global input: delegated clicks ([data-act]), search field, keyboard shortcuts
let suppressClick = false;
// a drag or resize ends with a click from the browser; swallow that one
const swallowClick = () => { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); };
document.addEventListener('click', e => {
  if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
  if (e.target.closest('#menu,#side')) return;
  if (e.target.closest('a[href]')) return;
  const a = e.target.closest('[data-act]'), act = a && a.dataset.act, v = V();
  if (act === 'tab') {
    if (a.dataset.v === S.vid) return openMenu(a, settingsPage());
    S.vid = a.dataset.v; const nv = V(); scrollToMorning = nv.type === 'calendar' && scopeOf(nv) !== 'month';
    $('#view').scrollTo(0, 0); resetX = true; try { localStorage.setItem(vidKey(), S.vid); } catch {}
    renderNow(); a.scrollIntoView({inline:'nearest', block:'nearest', behavior:'smooth'});
    return;
  }
  if (act === 'side') return toggleSide();
  if (act === 'sidetitle') return narrow() && toggleSide(true);
  if (act === 'addview') return openMenu(a, addViewPage());
  if (act === 'settings') return openMenu(a, settingsPage());
  if (act === 'filters') { if (!(v.filters || []).length) { v.filters = [newRule(defaultCondProp())]; saveViews(); } return openMenu(a, filtersPage()); }
  if (act === 'sorts') { if (!(v.sorts || []).length) { v.sorts = [{prop:'title', dir:'asc'}]; saveViews(); render(); } return openMenu(a, sortsPage()); }
  if (act === 'search') { const sb = $('#searchbar'); sb.hidden = !sb.hidden; if (!sb.hidden) $('#q').focus(); else if (S.q) { $('#q').value = ''; S.q = ''; render(); } return; }
  if (act === 'search-close') { $('#q').value = ''; S.q = ''; $('#q').blur(); $('#searchbar').hidden = true; return render(); }
  if (act === 'new') {
    const p = {};
    if (a.dataset.grp !== undefined && (v.type === 'board' || v.type === 'list') && P(v.groupBy)) p[v.groupBy] = a.dataset.grp || null;
    if (v.type === 'calendar' && P(v.dateProp)) p[v.dateProp] = {d:a.dataset.date || S.sel, t:'', e:''};
    return createTask(p);
  }
  if (act === 'toggle') { e.stopPropagation(); return toggleDone(a.dataset.id); }
  if (act === 'close') return closeSheet();
  if (act === 'delete') { const id = S.openId, draft = S.drafts.has(id); closeSheet(); if (!draft) removeTask(id); return; }
  if (act === 'cell') return openEditor(a, a.closest('.tr').dataset.id, a.dataset.prop);
  if (act === 'pedit') return openEditor(a, S.openId, a.dataset.prop);
  if (act === 'colmenu') return openMenu(a, propPage(a.dataset.prop, {inView:true, fromTable:true}));
  if (act === 'propmenu') return openMenu(a, propPage(a.dataset.prop, {inView:false}));
  if (act === 'addprop') return openMenu(a, newPropPage());
  if (act === 'grpmenu') return openMenu(a, optionPage(v.groupBy, a.dataset.o));
  if (act === 'addgroup') return openMenu(a, addGroupPage());
  if (act === 'calnav') return navCal(+a.dataset.d);
  if (act === 'today') return goToday();
  if (act === 'scope') return setScope(a.dataset.v);
  if (act === 'dayview') { S.sel = a.dataset.day; return setScope('day'); }
  if (act === 'undated') return openMenu(a, trayPage());
  if (act === 'adtoggle') return toggleAllDay();
  if (act === 'more') return showMore(a.dataset.k);
  const item = e.target.closest('[data-id]');
  if (item && item.matches('.card,.ev,.sw-row,.tev') && !(item.matches('.grid .ev') && narrow())) return openSheet(item.dataset.id);
  if (v.type !== 'calendar') return;
  const col = e.target.closest('.tg-col');
  if (col) {
    const m = Math.floor((e.clientY - col.getBoundingClientRect().top) / hh() * 2) * 30;
    return createTask({[v.dateProp]:{d:col.dataset.day, t:fromMin(m), ed:col.dataset.day, e:fromMin(Math.min(m + 60, 1439))}});
  }
  const allc = e.target.closest('.tg-allc');
  // the phone week shows all-day entries as thin lines: a tap opens that day instead
  if (allc && allc.closest('.lines') && allc.children.length) { S.sel = allc.dataset.day; return setScope('day'); }
  if (allc) return createTask({[v.dateProp]:{d:allc.dataset.day, t:'', e:''}});
  const day = e.target.closest('.day');
  if (day && e.target.closest('.num') && !narrow()) { S.sel = day.dataset.day; return setScope('day'); }
  if (day) { S.sel = day.dataset.day; render(); }
});
// rows in the "No date" list live inside the menu
$('#menu').addEventListener('click', e => {
  if (suppressClick) return;
  const r = e.target.closest('.sw-row[data-id]'); if (!r) return;
  if (e.target.closest('[data-act="toggle"]')) { toggleDone(r.dataset.id); return redrawMenu(); }
  closeMenu(); openSheet(r.dataset.id);
});
document.addEventListener('dblclick', e => {
  const day = e.target.closest('.day'), v = V();
  if (day && v.type === 'calendar' && !e.target.closest('[data-id],[data-act]')) createTask({[v.dateProp]:{d:day.dataset.day, t:'', e:''}});
});

// ---------- search ----------
let qT = 0;
$('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { S.q = e.target.value; render(); }, 80); });

// ---------- keyboard ----------
document.addEventListener('keydown', e => {
  const typing = e.target.closest('input,textarea,select,[contenteditable]');
  if (e.key === 'Escape') {
    if (drag) return cancelDrag();
    if (MN.stack.length) return MN.stack.length > 1 ? popMenu() : closeMenu();
    if (!$('#searchbar').hidden) return $('[data-act="search-close"]').click();
    if (S.openId) return closeSheet();
    if (typing) return e.target.blur();
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || MN.stack.length) return;
  const v = V();
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('.newbtn').click(); }
  else if (e.key === '/') { e.preventDefault(); $('[data-act="search"]').click(); }
  else if (v.type === 'calendar' && !S.openId) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') navCal(e.key === 'ArrowLeft' ? -1 : 1);
    else if (e.key === 't') goToday();
    else if (e.key === 'm') setScope('month');
    else if (e.key === 'w') setScope('week');
    else if (e.key === 'x') setScope('3day');
    else if (e.key === 'd') setScope('day');
  }
});
