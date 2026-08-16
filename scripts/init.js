// ── Init ──────────────────────────────────────────────────────────
document.getElementById('g-desc').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('g-monto').focus(); });
document.getElementById('g-monto').addEventListener('keydown', e => { if (e.key === 'Enter') guardarGasto(); });
document.getElementById('modal-monto').addEventListener('keydown', e => { if (e.key === 'Enter') guardarModal(); });

cargarGastos();