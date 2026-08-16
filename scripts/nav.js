// ── Mes selector ─────────────────────────────────────────────────
const sel = document.getElementById('mes-sel');
MESES.forEach(m => {
    const o = document.createElement('option');
    o.value = m; o.textContent = m;
    if (m === mesActual) o.selected = true;
    sel.appendChild(o);
});
sel.addEventListener('change', () => {
    mesActual = sel.value;
    const active = document.querySelector('.screen.active').id.replace('screen-', '');
    if (active === 'gastos') cargarGastos();
    else if (active === 'ingresos') cargarControl();
    else if (active === 'control') cargarControl();
});

// ── Nav ───────────────────────────────────────────────────────────
function navTo(name, btn) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('screen-' + name).classList.add('active');
    btn.classList.add('active');
    if (name === 'gastos') cargarGastos();
    else if (name === 'ingresos') cargarControl();
    else if (name === 'control') cargarControl();
    else if (name === 'ahorro') cargarAhorro();
}