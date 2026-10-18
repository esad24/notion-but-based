// sidebar: workspace tree (folders fold, databases open, hold and slide to reorder), item sheets (rename, icon, move, delete), new database/folder sheets, drawer on phones
const SIDE_KEY = 'tagwerk:side';
let sideOff = (() => { try { return localStorage.getItem(SIDE_KEY) === 'off'; } catch { return false; } })();
document.body.classList.toggle('side-off', sideOff);
// phones: a drawer that slides in; desktop: a column that can be hidden (remembered on this device)
function toggleSide(on, quiet){
  if (narrow()) {
    const open = on ?? !$('#side').classList.contains('open');
    $('#side').classList.toggle('open', open); $('#sscrim').classList.toggle('show', open);
    if (open) renderSide();
    return;
  }
  if (quiet) return;
  sideOff = !(on ?? sideOff); document.body.classList.toggle('side-off', sideOff);
  try { localStorage.setItem(SIDE_KEY, sideOff ? 'off' : 'on'); } catch {}
}
let sideHtml = '';
function renderSide(){
  if (sorting && sorting.lifted && sorting.list.closest('#side')) return;
  const row = x => {
    const fold = x.type === 'folder', open = fold && isOpen(x.id);
    const icon = x.icon ? `<span class="emo">${h(x.icon)}</span>` : fold ? IC.folder : IC.db;
    return `<div class="si" data-key="${x.id}"><div class="sr${x.id === S.dbId ? ' on' : ''}" data-sid="${x.id}" role="button"${fold ? ` aria-expanded="${open}"` : ''}>
      <span class="tw${open ? ' open' : ''}">${fold ? IC.right : ''}</span>${icon}<span class="sn">${h(x.name)}</span>
      ${fold ? `<button class="ibtn" data-sa="add" data-id="${x.id}" aria-label="New database in ${h(x.name)}">${IC.plus}</button>` : ''}<button class="ibtn" data-sa="more" data-id="${x.id}" aria-label="Options for ${h(x.name)}">${IC.more}</button></div>
      ${open ? `<div class="sl" data-parent="${x.id}">${kids(x.id).map(row).join('') || '<div class="s-empty">Empty</div>'}</div>` : ''}</div>`;
  };
  const html = `<div class="side-h"><span class="side-t">Workspace</span><button class="ibtn" data-sa="hide" aria-label="${narrow() ? 'Close' : 'Hide sidebar'}">${narrow() ? IC.x : IC.side}</button></div>
    <div class="side-sc"><div class="sl" data-parent="">${kids('').map(row).join('')}</div></div>
    <div class="side-f"><button class="sbtn" data-sa="newdb">${IC.plus}New database</button><button class="sbtn" data-sa="newfolder">${IC.folder}New folder</button></div>`;
  if (html === sideHtml) return;
  const sc = $('#side .side-sc'), top = sc ? sc.scrollTop : 0;
  sideHtml = html; $('#side').innerHTML = html;
  $('#side .side-sc').scrollTop = top;
  $('#side').querySelectorAll('.sl').forEach(l => sortable(l, keys => reorderKids(l.dataset.parent, keys)));
}
function reorderKids(parent, keys){
  const others = items().filter(x => (x.parent || '') !== parent);
  S.app.tree = others.concat(keys.map(item).filter(Boolean)); saveApp(); renderSide();
}
$('#side').addEventListener('click', e => {
  if (suppressClick) return;
  const b = e.target.closest('[data-sa]');
  if (b) {
    const a = b.dataset.sa, id = b.dataset.id;
    if (a === 'hide') return toggleSide(false);
    if (a === 'more') return openMenu(b, itemPage(id));
    if (a === 'add') return openMenu(b, newDbPage(id));
    if (a === 'newdb') return openMenu(b, newDbPage(''));
    if (a === 'newfolder') return openMenu(b, newFolderPage(''));
    return;
  }
  const r = e.target.closest('[data-sid]'); if (!r) return;
  const x = item(r.dataset.sid); if (!x) return;
  if (x.type === 'folder') return setOpen(x.id, !isOpen(x.id));
  openDb(x.id);
  if (narrow()) toggleSide(false);
});
$('#sscrim').addEventListener('click', () => toggleSide(false));
// phones: swipe the drawer left to close it, or swipe in from the left screen edge to open it
let sg = null;
document.addEventListener('touchstart', e => {
  const t = e.touches[0], side = $('#side'), open = side.classList.contains('open');
  sg = narrow() && e.touches.length === 1 && !MN.stack.length && !S.openId && (open ? side.contains(e.target) : t.clientX < 18) ? {x0:t.clientX, y0:t.clientY, open, dx:0, mode:null} : null;
}, {passive:true});
document.addEventListener('touchmove', e => {
  if (!sg || (sorting && sorting.lifted)) { sg = null; return; }
  const t = e.touches[0], dx = t.clientX - sg.x0, dy = t.clientY - sg.y0;
  if (!sg.mode) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) < 1.5 * Math.abs(dy) || (sg.open ? dx > 0 : dx < 0)) { sg = null; return; }
    sg.mode = 'x'; $('#side').style.transition = 'none';
  }
  sg.dx = dx;
  const w = $('#side').offsetWidth, x = sg.open ? Math.min(0, dx) : Math.min(0, dx - w);
  $('#side').style.transform = `translateX(${x}px)`;
}, {passive:true});
document.addEventListener('touchend', () => {
  const g = sg; sg = null; if (!g || !g.mode) return;
  const side = $('#side'); side.style.transition = ''; side.style.transform = '';
  toggleSide(g.open ? g.dx > -70 : g.dx > 70);
});

const firstGrapheme = s => { s = (s || '').trim(); if (!s) return ''; try { return [...new Intl.Segmenter().segment(s)][0].segment; } catch { return [...s][0]; } };
function itemPage(id){
  let confirm = false;
  return {title:(item(id) || {}).type === 'folder' ? 'Folder' : 'Database', render(c){
    const x = item(id); if (!x) return closeMenu();
    const fold = x.type === 'folder', last = !fold && items().filter(y => y.type === 'db').length < 2;
    c.innerHTML = grp(fldCell('it-name', x.name, 'Name'), 'Name')
      + grp(`<div class="cell">${fold ? IC.folder : IC.db}<span class="cl">Icon</span><input class="fld emo-in" id="it-icon" value="${h(x.icon || '')}" placeholder="Emoji" autocomplete="off" enterkeyhint="done" aria-label="Emoji icon"></div>`, '', 'Type an emoji from the emoji keyboard. Leave it empty for the default icon.')
      + grp((fold ? '' : (x.id === S.dbId ? '' : actCell('data-a="open"', 'Open', icb(IC.db, IC_COL.blue))))
        + linkCell('data-a="move"', 'Move to', h(x.parent ? dbName(x.parent) : 'Top level'), icb(IC.folder, IC_COL.indigo))
        + (fold ? linkCell('data-a="newdb"', 'New database inside', '', icb(IC.plus, IC_COL.green)) + linkCell('data-a="newfolder"', 'New folder inside', '', icb(IC.folder, IC_COL.orange)) : ''))
      + (last ? '' : grp(actCell('data-a="del"', fold ? 'Delete folder' : 'Delete database', IC.trash, 'danger'), '', fold ? 'What is inside the folder moves up one level.' : 'Deletes this database with all its pages and views. This cannot be undone.'));
    const nm = c.querySelector('#it-name'), ic = c.querySelector('#it-icon');
    nm.addEventListener('input', () => renameItem(id, nm.value.trim() || 'Untitled'));
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') nm.blur(); });
    ic.addEventListener('input', () => { const g = firstGrapheme(ic.value); if (ic.value !== g) ic.value = g; setIcon(id, g); });
    ic.addEventListener('keydown', e => { if (e.key === 'Enter') ic.blur(); });
    c.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'open') { openDb(id); if (narrow()) toggleSide(false); }
      else if (a === 'move') pushMenu(movePage(id));
      else if (a === 'newdb') pushMenu(newDbPage(id));
      else if (a === 'newfolder') pushMenu(newFolderPage(id));
      else if (a === 'del') {
        if (!confirm) { confirm = true; b.querySelector('.cl').textContent = fold ? 'Tap again to delete the folder' : 'Tap again to delete everything in it'; return; }
        dismissMenu(); fold ? deleteFolder(id) : deleteDb(id);
      }
    });
  }};
}
function movePage(id){
  return {title:'Move to', render(c){
    const x = item(id); if (!x) return closeMenu();
    const rows = [['', 'Top level', 0]];
    const walk = (p, depth) => kids(p).forEach(f => { if (f.type !== 'folder' || f.id === id) return; rows.push([f.id, f.name, depth]); walk(f.id, depth + 1); });
    walk('', 1);
    c.innerHTML = grp(rows.map(([fid, name, d]) => `<button class="cell" data-to="${fid}" style="padding-left:${16 + d * 18}px">${fid ? IC.folder : IC.side}<span class="cl">${h(name)}</span>${(x.parent || '') === fid ? `<span class="ck">${IC.check}</span>` : ''}</button>`).join(''), 'Folders');
    c.addEventListener('click', e => { const b = e.target.closest('[data-to]'); if (!b) return; moveItem(id, b.dataset.to); popMenu(); });
  }};
}
function newDbPage(parent){
  let kind = 'tasks', name = '';
  return {title:'New database', tall:true, render(c){
    c.innerHTML = grp(fldCell('nd-name', name, 'Untitled'), 'Name')
      + grp(TEMPLATES.map(([k, l, d]) => `<button class="cell tpl" data-k="${k}"><span class="cl">${k === 'copy' ? `Same as “${h(dbName())}”` : l}<small>${d}</small></span>${k === kind ? `<span class="ck">${IC.check}</span>` : ''}</button>`).join(''), 'Start with')
      + grp(actCell('id="nd-ok"', 'Create database', IC.plus, 'accent'), '', parent ? `Inside “${h(dbName(parent))}”.` : '');
    const nm = c.querySelector('#nd-name');
    nm.addEventListener('input', () => { name = nm.value; });
    const go = () => { createDb(name.trim() || 'Untitled', kind, parent); if (narrow()) toggleSide(false); };
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    c.addEventListener('click', e => {
      const t = e.target.closest('[data-k]'); if (t) { kind = t.dataset.k; c.querySelectorAll('.tpl .ck').forEach(x => x.remove()); t.insertAdjacentHTML('beforeend', `<span class="ck">${IC.check}</span>`); return; }
      if (e.target.closest('#nd-ok')) go();
    });
    if (!narrow()) nm.focus();
  }};
}
function newFolderPage(parent){
  return {title:'New folder', tall:true, render(c){
    c.innerHTML = grp(fldCell('nf-name', '', 'Folder name'), 'Name') + grp(actCell('id="nf-ok"', 'Create folder', IC.plus, 'accent'), '', parent ? `Inside “${h(dbName(parent))}”.` : '');
    const nm = c.querySelector('#nf-name');
    const go = () => { createFolder(nm.value.trim() || 'New folder', parent); if (parent) setOpen(parent, true); dismissMenu(); };
    nm.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    c.querySelector('#nf-ok').addEventListener('click', go);
    nm.focus();
  }};
}
