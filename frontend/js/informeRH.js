const URL_BASE = '/api';
const token = sessionStorage.getItem('token');
let dataGlobal = [];
let charts = {};

if (!token) window.location.href = "login.html";

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Obtenemos datos de pases y permisos simultáneamente usando tus modelos SQL
        const [resPases, resPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } })
        ]);

        const pasesRaw = (await resPases.json()).data || [];
        const permisosRaw = (await resPermisos.json()).data || [];

        // Normalizamos los datos para que el Dashboard pueda procesarlos juntos
        const pases = pasesRaw.map(p => ({ 
            ...p, 
            tipo: 'Pase', 
            fechaClave: p.fecha_uso.split('T')[0], 
            diasImpacto: 0.1 // Un pase cuenta como fracción de día
        }));

        const permisos = permisosRaw.map(p => ({ 
            ...p, 
            tipo: 'Permiso', 
            fechaClave: p.fecha_inicio.split('T')[0], 
            diasImpacto: parseFloat(p.cantidad_dias || 1) // Usamos tu campo cantidad_dias
        }));

        dataGlobal = [...pases, ...permisos];
        recargarDashboard();

    } catch (error) {
        console.error("Fallo crítico en dashboard:", error);
    }
});

function recargarDashboard() {
    const filtroMes = document.getElementById('filtro-mes-graficos').value;
    let datos = filtroMes ? dataGlobal.filter(d => d.fechaClave.startsWith(filtroMes)) : dataGlobal;

    // --- 1. PROCESAR KPIs ---
    const hoy = new Date().toISOString().split('T')[0];
    const aprobados = datos.filter(d => d.estado === 'Aprobado');
    
    document.getElementById('stat-hoy').textContent = datos.filter(d => d.fechaClave === hoy).length;
    document.getElementById('stat-total').textContent = datos.length;
    
    // Sumamos los días de impacto basados en tu base de datos
    const diasTotales = aprobados.reduce((acc, curr) => acc + curr.diasImpacto, 0).toFixed(1);
    document.getElementById('stat-dias').textContent = diasTotales;
    
    const tasa = datos.length > 0 ? ((aprobados.length / datos.length) * 100).toFixed(0) : 0;
    document.getElementById('stat-tasa').textContent = `${tasa}%`;

    // --- 2. GRÁFICOS ---
    limpiarCharts();
    
    // Mix de Incidencias (Dona)
    renderDoughnut(datos.filter(d => d.tipo === 'Pase').length, datos.filter(d => d.tipo === 'Permiso').length);

    // Carga por Departamento (Barras)
    const areas = {};
    datos.forEach(d => {
        const a = d.area_adscripcion || 'No Definida';
        areas[a] = (areas[a] || 0) + 1;
    });
    renderAreas(areas);

    // Tendencia (Línea)
    renderTendencia(datos);

    // --- 3. TABLAS DINÁMICAS ---
    renderRanking(datos);
    renderColisiones(datos);
}

function renderDoughnut(p, m) {
    charts.tipos = new Chart(document.getElementById('chartTipos'), {
        type: 'doughnut',
        data: {
            labels: ['Pases', 'Permisos'],
            datasets: [{ data: [p, m], backgroundColor: ['#009186', '#0648a3'], borderWeight: 0 }]
        },
        options: { maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
    });
}

function renderAreas(objAreas) {
    const labels = Object.keys(objAreas).sort((a,b) => objAreas[b] - objAreas[a]).slice(0, 6);
    charts.areas = new Chart(document.getElementById('chartAreas'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Total Trámites', data: labels.map(l => objAreas[l]), backgroundColor: '#4c51bf', borderRadius: 8 }]
        },
        options: { 
            indexAxis: 'y', 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } }
        }
    });
}

function renderTendencia(datos) {
    const timeline = {};
    // Tomamos los últimos 10 días con actividad
    datos.slice(0, 30).reverse().forEach(d => {
        timeline[d.fechaClave] = (timeline[d.fechaClave] || 0) + 1;
    });

    charts.tendencia = new Chart(document.getElementById('chartTendencia'), {
        type: 'line',
        data: {
            labels: Object.keys(timeline),
            datasets: [{
                data: Object.values(timeline),
                borderColor: '#009186',
                backgroundColor: 'rgba(0,145,134,0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderRanking(datos) {
    const docentes = {};
    datos.forEach(d => {
        docentes[d.nombre_completo] = (docentes[d.nombre_completo] || 0) + 1;
    });

    const sorted = Object.entries(docentes).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const tbody = document.getElementById('tabla-top-docentes');
    tbody.innerHTML = sorted.map(([nombre, total]) => `
        <tr>
            <td class="fw-bold">${nombre.split(' ').slice(0,2).join(' ')}</td>
            <td class="text-center"><span class="badge-soft badge-soft-teal">${total}</span></td>
            <td><div class="progress" style="height: 6px;"><div class="progress-bar bg-teal" style="background:#009186; width: ${Math.min(total*10, 100)}%"></div></div></td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center py-3">Sin actividad</td></tr>';
}

function renderColisiones(datos) {
    const col = {};
    datos.forEach(d => {
        if(d.estado === 'Rechazado' || !d.area_adscripcion) return;
        const key = `${d.fechaClave}|${d.area_adscripcion}`;
        if(!col[key]) col[key] = [];
        col[key].push(d.nombre_completo);
    });

    const tbody = document.getElementById('tabla-colisiones');
    tbody.innerHTML = '';
    let count = 0;

    for (const [key, profes] of Object.entries(col)) {
        if (profes.length > 1) {
            count++;
            const [f, a] = key.split('|');
            tbody.innerHTML += `
                <tr>
                    <td><i class="fa-solid fa-calendar-day me-2 text-muted"></i>${f}</td>
                    <td><span class="badge-soft badge-soft-red">${a}</span></td>
                    <td class="small fw-semibold text-dark">${profes.join(', ')}</td>
                </tr>`;
        }
    }
    document.getElementById('badge-colisiones').textContent = count;
    if(count === 0) tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-success small"><i class="fa-solid fa-circle-check me-2"></i>Sin conflictos detectados</td></tr>';
}

function limpiarCharts() {
    Object.values(charts).forEach(c => c.destroy());
    charts = {};
}