// list view (Reminders style) and rowHtml, the swipeable row also used by the agenda and the "No date" tray
function renderList(v, list){
  const gp = P(v.groupBy), grouped = isGroupProp(gp);
  const ctx = {shown:shownProps(v).filter(p => p.type !== 'title' && !(grouped && p.id === gp.id)), check:v.showCheck !== false};
  const sec = (o, items, gid) => `<section class="lv-sec" data-drop="grp:${gid}">
    ${grouped ? `<div class="lv-h">${o ? tagO(o, gp.type === 'status') : `<span class="tag c-none">No ${h(gp.name)}</span>`}<span class="count">${items.length}</span></div>` : ''}
    <div class="lv-g">${items.map(t => rowHtml(t, ctx)).join('') || '<div class="empty lv-empty">No pages</div>'}</div>
    <button class="lv-add" data-act="new" data-grp="${grouped ? gid : ''}">${IC.plus}New page</button></section>`;
  if (!grouped) return `<div class="lv">${list.length ? sec(null, list, '*') : emptyState() + sec(null, [], '*')}</div>`;
  const {groups, opts, none} = groupTasks(v, gp, list);
  return `<div class="lv">${none ? sec(null, groups.get(''), '') : ''}${opts.map(o => sec(o, groups.get(o.id), o.id)).join('')}</div>`;
}
function rowHtml(t, ctx){
  const sp = statusProp(), done = isDone(t), c = rowColor(t);
  const dv = ctx.dp ? getV(t, ctx.dp) : null;
  const meta = (dv && dv.t ? `<span class="dt">${h(fmtT(dv.t))}${dv.e && sameDay(dv) ? '–' + h(fmtT(dv.e)) : ''}</span>` : '')
    + (ctx.shown || []).map(p => p.type === 'checkbox' ? (getV(t, p) ? `${disp(p, t)}<span>${h(p.name)}</span>` : '') : disp(p, t)).filter(Boolean).join('');
  return `<div class="sw-row" data-id="${t.id}" data-drag><div class="sw-bg"><span class="sw-l">${IC.check}${done ? 'Not done' : 'Done'}</span><span class="sw-r">Delete${IC.trash}</span></div>
    <div class="row${done ? ' done' : ''}${c ? ' tint c-' + c : ''}">${sp && ctx.check !== false ? `<button class="chk" data-act="toggle" data-id="${t.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}">${IC.check}</button>` : ''}
    <div class="row-main"><div class="t-title">${h(t.title) || '<span class="ph">Untitled</span>'}</div>${meta ? `<div class="row-meta">${meta}</div>` : ''}</div></div></div>`;
}
