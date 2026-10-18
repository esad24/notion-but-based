// toast with optional Undo
let toastT = 0;
function toast(msg, undo){
  const el = $('#toast'), b = $('#toastBtn');
  $('#toastMsg').textContent = msg;
  b.hidden = !undo; b.onclick = () => { el.classList.remove('show'); if (undo) undo(); };
  el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 2400);
}
