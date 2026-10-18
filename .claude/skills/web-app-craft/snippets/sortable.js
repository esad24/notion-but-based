/* Drag-grip list reordering: children need data-key, the grip needs class .hdl. onDone(keysInNewOrder). */
// small list sorter used for properties, options and color rules (drag the grip)
function sortable(list, onDone){
  list.addEventListener('pointerdown', e => {
    const hd = e.target.closest('.hdl'); if (!hd) return;
    const item = hd.closest('[data-key]'); if (!item) return;
    e.preventDefault(); hd.setPointerCapture(e.pointerId); item.classList.add('lifting');
    const move = ev => {
      const y = ev.clientY;
      const sibs = [...list.querySelectorAll(':scope > [data-key]')].filter(s => s !== item);
      const before = sibs.find(s => { const r = s.getBoundingClientRect(); return y < r.top + r.height / 2; });
      if (before) { if (item.nextElementSibling !== before) list.insertBefore(item, before); }
      else if (list.lastElementChild !== item) list.appendChild(item);
    };
    const up = () => {
      hd.removeEventListener('pointermove', move); hd.removeEventListener('pointerup', up); hd.removeEventListener('pointercancel', up);
      item.classList.remove('lifting');
      onDone([...list.querySelectorAll(':scope > [data-key]')].map(x => x.dataset.key));
    };
    hd.addEventListener('pointermove', move); hd.addEventListener('pointerup', up); hd.addEventListener('pointercancel', up);
  });
}

