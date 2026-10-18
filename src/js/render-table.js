// table view: column widths (#colcss), header + rows HTML
const colW = (v, p) => (v.widths && v.widths[p.id]) || DEF_W[p.type] || 180;
function colCss(v, props){
  // rows get an explicit total width so off-screen rows (which skip layout) never shrink the scroll width
  const total = props.reduce((n, p) => n + colW(v, p), 0) + 44;
  $('#colcss').textContent = props.map((p, i) => `.tbl .k${i}{width:${colW(v, p)}px}`).join('') + `.tbl .tr,.tbl .tb-h{width:${total}px}`;
}
function renderTable(v, list){
  const props = shownProps(v);
  colCss(v, props);
  const sortOf = id => (v.sorts || []).find(s => s.prop === id);
  const head = props.map((p, i) => { const s = sortOf(p.id); return `<div class="th k${i}" data-act="colmenu" data-prop="${p.id}">${TI[p.type] || ''}<span class="nm">${h(p.name)}</span>${s ? `<span class="arr">${s.dir === 'desc' ? '↓' : '↑'}</span>` : ''}<span class="rs" data-rs="${p.id}" data-k="${i}"></span></div>`; }).join('')
    + `<div class="th add" data-act="addprop" aria-label="Add property" title="Add property">${IC.plus}</div>`;
  let rows = '';
  for (const t of list) {
    const c = rowColor(t);
    rows += `<div class="tr${c ? ' tint c-' + c : ''}" data-id="${t.id}">`;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      rows += p.type === 'title'
        ? `<div class="td k${i} title" data-act="cell" data-prop="${p.id}"><span class="t-title">${h(t.title) || '<span class="ph">Untitled</span>'}</span></div>`
        : `<div class="td k${i}" data-act="cell" data-prop="${p.id}">${disp(p, t)}</div>`;
    }
    rows += '<div class="td add"></div></div>';
  }
  const empty = !list.length ? emptyState() : '';
  // header and rows share one horizontal scroller (they move as one); rows scroll vertically inside it
  return `<div class="hx tbx"><div class="tbl${v.wrap === false ? ' nowrap' : ''} d-${v.density || 'regular'}"><div class="tb-hw"><div class="tb-in"><div class="tb-h">${head}</div></div></div>
    <div class="vy"><div class="tb-in">${rows}<div class="tr-new" data-act="new">${IC.plus}New page</div></div>${empty}<div class="tfoot">Count <b>${list.length}</b></div></div></div></div>`;
}
