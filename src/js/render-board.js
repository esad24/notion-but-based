// board view: columns per group option, cards
function renderBoard(v, list){
  const gp = P(v.groupBy);
  if (!isGroupProp(gp)) return `<div class="blank"><b>Pick a property to group by</b>Board columns come from a Select or Status property.<button class="btn" data-act="settings">Open settings</button></div>`;
  const {groups, order} = groupTasks(v, gp, list);
  const shown = shownProps(v).filter(p => p.id !== gp.id && p.type !== 'title');
  const sp = v.showCheck !== false && statusProp();
  const col = (o) => {
    const id = o ? o.id : '', items = groups.get(id), color = o ? o.color : 'none', page = pageOf(v, id, items);
    return `<section class="col c-${color}" data-drop="grp:${id}" data-o="${id}">
      <div class="col-h">${o ? tagO(o, gp.type === 'status') : `<span class="tag c-none">No ${h(gp.name)}</span>`}<span class="count">${items.length}</span><span class="spacer"></span>
      ${o ? `<button class="ibtn" data-act="grpmenu" data-o="${id}" aria-label="Edit group">${IC.more}</button>` : ''}
      <button class="ibtn" data-act="new" data-grp="${id}" aria-label="Add page">${IC.plus}</button></div>
      <div class="col-body">${page.map(t => card(t, shown, color, sp)).join('')}${moreBtn(v, id, items.length, page.length)}</div>
      <button class="col-add" data-act="new" data-grp="${id}">${IC.plus}New page</button></section>`;
  };
  const html = order.map(col).join('') + `<div class="col-new"><button class="col-add" data-act="addgroup">${IC.plus}Add group</button></div>`;
  return `<div class="hx"><div class="board">${html}</div></div>`;
}
function card(t, shown, groupColor, sp){
  const c = rowColor(t) || groupColor || 'none', done = isDone(t);
  let props = '';
  for (const p of shown) {
    if (p.type === 'checkbox') { if (getV(t, p)) props += `<div class="cp">${disp(p, t)}<span>${h(p.name)}</span></div>`; continue; }
    const d = disp(p, t); if (!d) continue;
    props += `<div class="cp${HAS_OPTS(p.type) ? '' : ' full'}">${d}</div>`;
  }
  return `<article class="card c-${c}${done ? ' done' : ''}" data-id="${t.id}" data-drag>
    ${sp ? `<button class="chk" data-act="toggle" data-id="${t.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}">${IC.check}</button>` : ''}
    <div class="card-main"><div class="t-title">${h(t.title) || '<span class="ph">Untitled</span>'}</div>${props ? `<div class="cprops">${props}</div>` : ''}</div></article>`;
}
