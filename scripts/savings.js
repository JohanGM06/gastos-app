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