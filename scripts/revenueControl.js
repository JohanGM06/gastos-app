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