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