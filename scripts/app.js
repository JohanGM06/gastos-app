const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJz3WCu8C3K-kl9UOThEWztFWv8FhKSAFNQg4InATPOpxHkYr_WnUfeOBCsz8iyh0/exec';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const TIPOS = {
    'Comida': { color: '#FF6B6B', emoji: '🍔' },
    'Transporte': { color: '#4ECDC4', emoji: '🚌' },
    'Ocio': { color: '#A78BFA', emoji: '🎮' },
    'Mascotas': { color: '#F59E0B', emoji: '🐱' },
    'Salud': { color: '#34D399', emoji: '💊' },
    'Personal': { color: '#F472B6', emoji: '👗' },
    'Regalos': { color: '#60A5FA', emoji: '🎁' },
    'Otros': { color: '#94A3B8', emoji: '💸' },
};
const AHORRO_COLORS = ['#4CAF50', '#2196F3', '#FF5722', '#9C27B0'];

const now = new Date();
let mesActual = MESES[Math.min(now.getMonth() + 1, 11)];
let mesBloque = mesActual; // mes del bloque que se muestra en Control/Ingresos
let gastos = [], sobrasteBase = 0, donutChart = null, modalTipo = 'deuda';

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

// ── Utils ─────────────────────────────────────────────────────────
function cop(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
function toast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + tipo;
    setTimeout(() => t.className = 'toast', 3000);
}
function setStatus(msg) { document.getElementById('sync-status').textContent = msg; }

// ── Gastos ────────────────────────────────────────────────────────
async function cargarGastos() {
    setStatus('Sincronizando...');
    try {
        const r = await fetch(`${SCRIPT_URL}?modulo=gastos&mes=${encodeURIComponent(mesActual)}&t=${Date.now()}`);
        const d = await r.json();
        gastos = d.gastos || []; sobrasteBase = d.sobrante || 0;
        setStatus('✓ Sincronizado');
        renderGastos();
    } catch (e) { setStatus('Sin conexión'); toast('No se pudo conectar', 'err'); }
}

function parsearGasto() {
    let desc = document.getElementById('g-desc').value.trim();
    let monto = parseFloat(document.getElementById('g-monto').value);
    const tipo = document.getElementById('g-tipo').value;
    if (!desc) return null;
    if (isNaN(monto)) {
        const m = desc.match(/(\d[\d.]*)$/);
        if (m) { monto = parseFloat(m[1]); desc = desc.replace(m[0], '').trim(); } else return null;
    }
    if (!desc || monto <= 0) return null;
    return { desc: desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase(), monto, tipo };
}

async function guardarGasto() {
    const p = parsearGasto();
    if (!p) { toast('Escribe descripción y monto', 'err'); return; }
    const btn = document.getElementById('g-btn');
    btn.disabled = true; btn.textContent = 'Guardando...';
    try {
        const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ accion: 'guardar_gasto', mes: mesActual, desc: p.desc, monto: p.monto, tipo: p.tipo }) });
        const d = await r.json();
        if (d.ok) {
            document.getElementById('g-desc').value = '';
            document.getElementById('g-monto').value = '';
            toast('✓ ' + p.desc + ' guardado', 'ok');
            await cargarGastos();
        } else throw new Error(d.error);
    } catch (e) { toast('Error: ' + e.message, 'err'); }
    finally { btn.disabled = false; btn.textContent = 'Guardar en Sheets ✓'; }
}

async function borrarGasto(fila, desc, el) {
    if (!confirm('¿Borrar "' + desc + '"?')) return;
    el.classList.add('removing');
    try {
        const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ accion: 'borrar_gasto', fila }) });
        const d = await r.json();
        if (d.ok) { toast('✓ Eliminado', 'ok'); await cargarGastos(); }
        else throw new Error(d.error);
    } catch (e) { el.classList.remove('removing'); toast('Error', 'err'); }
}

function renderGastos() {
    const total = gastos.reduce((s, g) => s + g.monto, 0);
    const sobrante = sobrasteBase;
    const presupuesto = sobrasteBase + total;
    const pct = presupuesto > 0 ? Math.min(Math.round(total / presupuesto * 100), 100) : 0;
    const idx = MESES.indexOf(mesActual);
    const mesPago = MESES[idx === 0 ? 11 : idx - 1];

    document.getElementById('g-gastado').textContent = cop(total);
    const sob = document.getElementById('g-sobrante');
    sob.textContent = cop(sobrante);
    sob.className = 'stat-value ' + (sobrante < 0 ? 'red' : 'green');
    document.getElementById('g-base').textContent = sobrasteBase > 0 ? `De ${mesPago}: ${cop(sobrasteBase)}` : '';
    document.getElementById('g-pct').textContent = pct + '%';
    const bar = document.getElementById('g-bar');
    bar.style.width = pct + '%';
    bar.className = 'bar-fill' + (pct >= 100 ? ' over' : pct >= 75 ? ' warn' : '');

    // Donut
    const porTipo = {};
    gastos.forEach(g => { const t = g.tipo || 'Otros'; porTipo[t] = (porTipo[t] || 0) + g.monto; });
    const chartDiv = document.getElementById('g-chart');
    if (!gastos.length) { chartDiv.innerHTML = '<div class="chart-empty">Sin gastos este mes</div>'; donutChart = null; }
    else {
        chartDiv.innerHTML = `<div class="chart-wrap"><div class="donut-container"><canvas id="donut-c"></canvas><div class="donut-center"><span class="donut-total-label">Total</span><span class="donut-total-value">${cop(total)}</span></div></div><div class="legend" id="donut-leg"></div></div>`;
        const labels = Object.keys(porTipo), values = labels.map(k => porTipo[k]), colors = labels.map(k => (TIPOS[k] || TIPOS['Otros']).color);
        if (donutChart) donutChart.destroy();
        donutChart = new Chart(document.getElementById('donut-c').getContext('2d'), {
            type: 'doughnut', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
            options: { cutout: '68%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 400 } }
        });
        document.getElementById('donut-leg').innerHTML = labels.map((k, i) => {
            const t = TIPOS[k] || TIPOS['Otros'], p = Math.round(values[i] / total * 100);
            return `<div class="legend-item"><div class="legend-dot" style="background:${t.color}"></div><div><div class="legend-name">${t.emoji} ${k}</div><div class="legend-val">${cop(values[i])} · ${p}%</div></div></div>`;
        }).join('');
    }

    // Lista
    const lista = document.getElementById('g-lista');
    if (!gastos.length) { lista.innerHTML = '<div class="empty">Sin gastos este mes</div>'; return; }
    lista.innerHTML = [...gastos].reverse().map(g => {
        const t = TIPOS[g.tipo] || TIPOS['Otros'];
        return `<div class="item" id="gi-${g.fila}">
      <div class="item-dot" style="background:${t.color}"></div>
      <div class="item-info"><div class="item-name">${g.desc}</div><div class="item-sub">${t.emoji} ${g.tipo || 'Otros'}</div></div>
      <span class="item-amount">${cop(g.monto)}</span>
      <button class="btn-del" onclick="borrarGasto(${g.fila},'${g.desc.replace(/'/g, "\\'")}',document.getElementById('gi-${g.fila}'))">×</button>
    </div>`;
    }).join('');
}

// ── Ingresos & Control ────────────────────────────────────────────
let controlData = null;

async function cargarControl() {
    setStatus('Sincronizando...');
    try {
        const r = await fetch(`${SCRIPT_URL}?modulo=control&mes=${encodeURIComponent(mesActual)}&t=${Date.now()}`);
        const d = await r.json();
        controlData = d;
        mesBloque = d.mesBloque || mesActual; // actualizar mes del bloque
        setStatus('✓ Sincronizado');
        renderIngresos(d.ingresos || {});
        renderDeudas(d.deudas || []);
        renderPagos(d.pagos || []);
    } catch (e) { setStatus('Sin conexión'); toast('No se pudo conectar', 'err'); }
}

let extrasActuales = [];

// Formatea input como COP mientras escribe
function fmtIngreso(el) {
    const raw = el.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw) || 0;
    el.value = num > 0 ? '$' + num.toLocaleString('es-CO') : '';
    actualizarTotalIngresos();
}

// Extrae número de un campo COP formateado
function parseCOP(id) {
    const v = document.getElementById(id).value.replace(/[^0-9]/g, '');
    return parseInt(v) || 0;
}

function actualizarTotalIngresos() {
    if (controlData && controlData.ingresos && controlData.ingresos.totalNeto > 0) {
        document.getElementById('i-total').textContent = cop(controlData.ingresos.totalNeto);
    }
}

function renderIngresos(ing) {
    extrasActuales = ing.extras || [];
    // Mostrar valores con formato COP
    const fmt = n => n > 0 ? '$' + Math.round(n).toLocaleString('es-CO') : '';
    document.getElementById('i-sueldo').value = fmt(ing.sueldo);
    document.getElementById('i-subsidio').value = fmt(ing.subsidio);
    document.getElementById('i-people').value = fmt(ing.people);

    // Eliminar extras anteriores
    document.querySelectorAll('.i-extra-item').forEach(el => el.remove());

    // Insertar extras directamente en el grid, antes del div "Nuevo ingreso extra"
    const grid = document.getElementById('i-grid');
    const nuevoExtraDiv = document.getElementById('i-nuevo-extra');
    extrasActuales.forEach((ex, idx) => {
        const div = document.createElement('div');
        div.className = 'ingreso-card i-extra-item';
        div.style.position = 'relative';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <div class="ingreso-label" style="margin-bottom:0">✨ ${ex.nombre}</div>
            <button onclick="borrarExtra(${idx})" style="background:none;border:none;color:#ccc;font-size:16px;cursor:pointer;padding:0 2px;line-height:1;" title="Eliminar">×</button>
          </div>
          <input class="ingreso-input" type="text" id="i-ex-${idx}"
                 value="${ex.valor > 0 ? '$' + Math.round(ex.valor).toLocaleString('es-CO') : ''}"
                 placeholder="$0" inputmode="numeric" oninput="fmtIngreso(this)" />
        `;
        grid.insertBefore(div, nuevoExtraDiv);
    });

    document.getElementById('i-extra-nombre').value = '';
    document.getElementById('i-extra-valor').value = '';
    actualizarTotalIngresos();
}

async function borrarExtra(idx) {
    if (!confirm('¿Eliminar "' + extrasActuales[idx].nombre + '"?')) return;
    // Quitar del array y guardar sin ese extra
    extrasActuales.splice(idx, 1);
    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'guardar_ingreso',
                mes: mesBloque,
                sueldo: parseCOP('i-sueldo'),
                subsidio: parseCOP('i-subsidio'),
                people: parseCOP('i-people'),
                extras: extrasActuales
            })
        });
        const d = await res.json();
        if (d.ok) { toast('✓ Extra eliminado', 'ok'); await cargarControl(); }
        else throw new Error(d.error);
    } catch (e) { toast('Error al eliminar', 'err'); }
}

async function guardarIngresos() {
    const extras = extrasActuales.map((ex, idx) => ({
        nombre: ex.nombre,
        valor: parseInt(document.getElementById('i-ex-' + idx).value.replace(/[^0-9]/g, '')) || 0
    }));
    const nuevoNombre = document.getElementById('i-extra-nombre').value.trim();
    const nuevoValor = parseInt(document.getElementById('i-extra-valor').value.replace(/[^0-9]/g, '')) || 0;
    if (nuevoNombre && nuevoValor > 0) extras.push({ nombre: nuevoNombre, valor: nuevoValor });

    try {
        const res = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                accion: 'guardar_ingreso',
                mes: mesBloque,
                sueldo: parseCOP('i-sueldo'),
                subsidio: parseCOP('i-subsidio'),
                people: parseCOP('i-people'),
                extras
            })
        });
        const d = await res.json();
        if (d.ok) { toast('✓ Ingresos guardados', 'ok'); await cargarControl(); }
        else throw new Error(d.error);
    } catch (e) { toast('Error al guardar', 'err'); }
}

function renderDeudas(deudas) {
    const el = document.getElementById('d-lista');
    if (!deudas.length) { el.innerHTML = '<div class="empty">Sin deudas este mes 🎉</div>'; return; }
    el.innerHTML = deudas.map(d => `
    <div class="item" id="di-${d.fila}">
      <div class="item-dot" style="background:#d93025"></div>
      <div class="item-info"><div class="item-name">${d.nombre}</div></div>
      <span class="item-amount">${cop(d.monto)}</span>
      <button class="btn-del" onclick="borrarItem('deuda',${d.fila},'${d.nombre.replace(/'/g, "\\'")}','di-${d.fila}')">×</button>
    </div>`).join('');
}

function renderPagos(pagos) {
    const el = document.getElementById('p-lista');
    if (!pagos.length) { el.innerHTML = '<div class="empty">Sin pagos registrados</div>'; return; }
    const total = pagos.reduce((s, p) => s + p.monto, 0);
    el.innerHTML = pagos.map(p => `
    <div class="item" id="pi-${p.fila}">
      <div class="item-dot" style="background:#1a56a0"></div>
      <div class="item-info"><div class="item-name">${p.nombre}</div></div>
      <span class="item-amount">${cop(p.monto)}</span>
      <button class="btn-del" onclick="borrarItem('pago',${p.fila},'${p.nombre.replace(/'/g, "\\'")}','pi-${p.fila}')">×</button>
    </div>`).join('') +
        `<div style="padding:10px 14px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between">
      <span style="font-size:13px;font-weight:600;color:#444">Total pagos</span>
      <span style="font-size:13px;font-weight:700;color:#d93025">${cop(total)}</span>
    </div>`;
}

async function borrarItem(tipo, fila, nombre, elId) {
    if (!confirm('¿Borrar "' + nombre + '"?')) return;
    const el = document.getElementById(elId);
    if (el) el.classList.add('removing');
    const accion = tipo === 'deuda' ? 'borrar_deuda' : 'borrar_pago';
    try {
        const r = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ accion, fila, mes: mesBloque }) // ← agrega mes
        });
        const d = await r.json();
        if (d.ok) { toast('✓ Eliminado', 'ok'); await cargarControl(); }
        else throw new Error(d.error);
    } catch (e) { if (el) el.classList.remove('removing'); toast('Error', 'err'); }
}

// ── Modal ─────────────────────────────────────────────────────────
function abrirModal(tipo) {
    modalTipo = tipo;
    document.getElementById('modal-title').textContent = tipo === 'deuda' ? 'Agregar deuda' : 'Agregar pago';
    document.getElementById('modal-nombre').value = '';
    document.getElementById('modal-monto').value = '';
    document.getElementById('overlay').classList.add('open');
    setTimeout(() => document.getElementById('modal-nombre').focus(), 100);
}
function cerrarModal(e) {
    if (!e || e.target === document.getElementById('overlay')) document.getElementById('overlay').classList.remove('open');
}
async function guardarModal() {
    const nombre = document.getElementById('modal-nombre').value.trim();
    const monto = parseFloat(document.getElementById('modal-monto').value) || 0;
    if (!nombre || monto <= 0) { toast('Escribe nombre y monto', 'err'); return; }
    const accion = modalTipo === 'deuda' ? 'guardar_deuda' : 'guardar_pago';
    try {
        const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ accion, mes: mesBloque, nombre, monto }) });
        const d = await r.json();
        if (d.ok) { cerrarModal(); toast('✓ Guardado', 'ok'); await cargarControl(); }
        else throw new Error(d.error);
    } catch (e) { toast('Error: ' + e.message, 'err'); }
}

// ── Ahorro ────────────────────────────────────────────────────────
async function cargarAhorro() {
    setStatus('Cargando ahorro...');
    try {
        const r = await fetch(`${SCRIPT_URL}?modulo=ahorro&t=${Date.now()}`);
        const d = await r.json();
        setStatus('✓ Sincronizado');
        renderAhorro(d);
    } catch (e) { setStatus('Sin conexión'); toast('No se pudo conectar', 'err'); }
}

function renderAhorro(d) {
    const metas = d.metas || [];
    const metasEl = document.getElementById('a-metas');
    metasEl.innerHTML = metas.map((m, i) => {
        const pct = m.objetivo > 0 ? Math.min(Math.round(m.total / m.objetivo * 100), 100) : 0;
        const color = AHORRO_COLORS[i % AHORRO_COLORS.length];
        return `<div class="ahorro-meta">
      <div class="ahorro-meta-header">
        <span class="ahorro-meta-name">${m.nombre}</span>
        <span class="ahorro-meta-pct">${m.pct} · ${pct}%</span>
      </div>
      <div class="ahorro-meta-amounts">
        <span>${cop(m.total)} ahorrado</span>
        <span>Meta: ${cop(m.objetivo)}</span>
      </div>
      <div class="ahorro-bar-bg"><div class="ahorro-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>`;
    }).join('');

    const registros = d.registros || [];
    const regEl = document.getElementById('a-registros');
    if (!registros.length) { regEl.innerHTML = '<div class="empty">Sin registros aún</div>'; return; }
    regEl.innerHTML = registros.map(r => `
    <div class="item">
      <div class="item-info"><div class="item-name">${r.mes}</div><div class="item-sub">🏠 ${cop(r.mudanza)} · ✈️ ${cop(r.viaje)} · 🚨 ${cop(r.emergencia)}</div></div>
      <span class="item-amount">${cop(r.total)}</span>
    </div>`).join('');
}

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

// ── Init ──────────────────────────────────────────────────────────
document.getElementById('g-desc').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('g-monto').focus(); });
document.getElementById('g-monto').addEventListener('keydown', e => { if (e.key === 'Enter') guardarGasto(); });
document.getElementById('modal-monto').addEventListener('keydown', e => { if (e.key === 'Enter') guardarModal(); });

cargarGastos();