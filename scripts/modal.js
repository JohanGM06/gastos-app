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