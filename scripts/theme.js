// ── Modo oscuro ───────────────────────────────────────────────────
function toggleDark() {
    const isDark = document.body.classList.toggle('dark');
    document.getElementById('btn-dark').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark ? '1' : '0');
}
// Restaurar preferencia guardada
if (localStorage.getItem('darkMode') === '1') {
    document.body.classList.add('dark');
    document.getElementById('btn-dark').textContent = '☀️';
}