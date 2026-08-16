function cop(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
function toast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + tipo;
    setTimeout(() => t.className = 'toast', 3000);
}
function setStatus(msg) { document.getElementById('sync-status').textContent = msg; }