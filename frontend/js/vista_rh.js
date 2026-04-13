//consultar api
const URL_BASE = '/api';
const socket = io();
let registrosGlobales = [];
let calendarioRH;
let modalDetalleRH;

const token = sessionStorage.getItem('token');
const usuarioStr = sessionStorage.getItem('usuario');

//socket en tiempo real
socket.on('nuevo-pase-creado', () => { cargarDatosGenerales(); mostrarToast("¡Nuevo pase solicitado!", "info"); });
socket.on('pase-actualizado', () => { cargarDatosGenerales(); });
socket.on('nuevo-permiso-creado', (data) => { cargarDatosGenerales(); mostrarToast("¡Nueva solicitud de Permiso recibida!", "info"); });
socket.on('permiso-actualizado', () => { cargarDatosGenerales(); });

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

function manejarSesionExpirada() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

document.body.insertAdjacentHTML('beforeend', `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1055;">
        <div id="toastRH" class="toast" role="alert"><div class="toast-header text-white" id="toast-header-rh"><strong class="me-auto">RRHH</strong></div>
        <div class="toast-body fw-bold" id="toast-msg-rh"></div></div>
    </div>`);

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastRH');
    const header = document.getElementById('toast-header-rh');
    document.getElementById('toast-msg-rh').textContent = mensaje;
    let claseFondo = 'bg-success';
    if (tipo === 'danger' || tipo === 'error') claseFondo = 'bg-danger';
    if (tipo === 'info') claseFondo = 'bg-info';
    header.className = `toast-header text-white ${claseFondo}`;
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

document.addEventListener('DOMContentLoaded', () => {
    modalDetalleRH = new bootstrap.Modal(document.getElementById('modalDetalleRH'));
    document.getElementById('saludo-rh').textContent = usuario.nombre_completo || "RRHH";
    inicializarMotorPDF();

    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = "login.html";
    });

    const offcanvasCal = document.getElementById('offcanvasCalendario');
    if (offcanvasCal) {
        offcanvasCal.addEventListener('shown.bs.offcanvas', () => {
            if (!calendarioRH) inicializarCalendarioRH();
            else calendarioRH.updateSize();
        });
    }

    const btnFiltros = document.getElementById('btn-aplicar-filtros');
    if (btnFiltros) btnFiltros.addEventListener('click', aplicarFiltros);

    cargarDatosGenerales();
});
//obtener datos desde backend
async function cargarDatosGenerales() {
    try {
        const [resPases, resPermisos, resFest] = await Promise.all([
            fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/dias/ver`, { headers: { 'x-token': token } })
        ]);

        if (resPases.status === 401 || resPermisos.status === 401) return manejarSesionExpirada();

        const dataP = await resPases.json();
        const dataM = await resPermisos.json();
        window.festivosGlobalesRH = resFest.ok ? await resFest.json() : []; 

        const mPases = (dataP.data || []).map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso }));
        const mPermisos = (dataM.data || []).map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio }));

        let todos = [...mPases, ...mPermisos].sort((a, b) => new Date(a.fechaClave) - new Date(b.fechaClave));

        const contadores = {};
        todos.forEach(reg => {
            const uid = reg.id_usuario; 
            
            if (!contadores[uid]) {
                contadores[uid] = { Pase: 0, Permiso: 0 };
            }
            
            //incrementamos el contador
            contadores[uid][reg.tipoTramite]++;
            reg.folio_personal = contadores[uid][reg.tipoTramite];
        });
        registrosGlobales = todos.sort((a, b) => new Date(b.fechaClave) - new Date(a.fechaClave));

        pintarDashboardRH(registrosGlobales);

    } catch (e) { 
        console.error("Error al cargar datos de rh", e); 
        mostrarToast("Error de conexión con el servidor", "error");
    }
}
//funcion para pintar los datos
function pintarDashboardRH(datos) {
    const contenedorGrid = document.getElementById('pendientes-grid');
    const tablaHistorial = document.getElementById('tabla-general');
    const badgeNav = document.getElementById('badge-nav-solicitudes');

    const pendientes = datos.filter(r => r.estado === 'Vo.Bo.');
    const historial = datos;

    if (badgeNav) badgeNav.textContent = pendientes.length;
    const badgeMovil = document.getElementById('badge-nav-solicitudes-movil');
    if (badgeMovil) badgeMovil.textContent = pendientes.length;
    if (contenedorGrid) {
        if (pendientes.length === 0) {
            contenedorGrid.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="fa-solid fa-mug-hot fa-4x mb-3 opacity-25" style="color: var(--utm-teal);"></i>
                    <h5 class="fw-bold">Todo al dia</h5>
                    <p>No hay nada pendiente de autorizar!!!</p>
                </div>`;
        } else {
            contenedorGrid.innerHTML = pendientes.map(reg => {

                const area = reg.area_adscripcion;
                let alertaChoque = '';

                if (area && area !== 'No Registrada') {
                    const choques = historial.filter(h =>
                        h.id !== reg.id &&
                        h.fechaClave === reg.fechaClave &&
                        h.area_adscripcion === area &&
                        (h.estado === 'Aprobado' || h.estado === 'Vo.Bo.')
                    );

                    if (choques.length > 0) {
                        alertaChoque = `
                        <div class="alert alert-danger p-2 mt-3 mb-0 small text-center fw-bold border-danger border-opacity-25 shadow-sm">
                            <i class="fa-solid fa-triangle-exclamation fa-beat me-1"></i> ¡Alerta! ${choques.length} docente(s) de ${area} ya se ausentará(n) hoy.
                        </div>`;
                    }
                }

                return `
                <div class="col-md-6 col-xl-4">
                    <div class="card card-action h-100 shadow-sm border-0" 
                         onclick='verDetallesRRHH(${JSON.stringify(reg)})' 
                         style="cursor: pointer;">
                        
                        <div class="card-body p-4">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="d-flex align-items-center gap-2">
                                    
                                    <span class="badge rounded-pill bg-secondary bg-opacity-15 text-white px-3 py-2 border border-secondary border-opacity-25">
                                        ${reg.tipoTramite}
                                    </span>
                                </div>
                                <small class="text-muted fw-bold">${reg.tipoTramite}: ${reg.folio_personal}</small>
                            </div>
                            
                            <h5 class="fw-bold mb-1 text-dark">${reg.nombre_completo}</h5>
                            <p class="text-muted small mb-0">
                                <i class="fa-solid fa-calendar-day me-2"></i>${reg.fecha_uso_h || reg.fecha_inicio_h}
                            </p>
                            
                            ${alertaChoque}

                            <div class="d-flex justify-content-end align-items-center pt-3 mt-3 border-top">
                                <div class="d-flex gap-2">
                                    <button onclick="event.stopPropagation(); confirmarAccionRH(this, ${reg.id}, 'Aprobado', '${reg.tipoTramite}')" 
                                            class="btn btn-success btn-confirm-rh shadow-sm">Aprobar</button>
                                    <button onclick="event.stopPropagation(); confirmarAccionRH(this, ${reg.id}, 'Rechazado', '${reg.tipoTramite}')" 
                                            class="btn btn-danger btn-confirm-rh shadow-sm">Rechazar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    if (tablaHistorial) {
        tablaHistorial.innerHTML = historial.length === 0 ? '<tr><td colspan="6" class="text-center py-4">No hay historial</td></tr>' : historial.map(reg => {
            const colorBadge = reg.estado === 'Aprobado' ? 'bg-success' :
                (reg.estado === 'Vo.Bo.' ? 'bg-info text-white' :
                    (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger'));

            return `
            <tr onclick='verDetallesRRHH(${JSON.stringify(reg)})' style="cursor:pointer">
                <td class="text-muted fw-bold">N. ${reg.folio_personal}</td>
                <td><span class="badge bg-secondary text-white border">${reg.tipoTramite}</span></td>
                <td class="fw-bold">${reg.nombre_completo}</td>
                <td>${reg.fecha_uso_h || reg.fecha_inicio_h}</td>
                <td><span class="badge ${colorBadge}">${reg.estado}</span></td>
                <td class="text-muted fw-bold" title="${reg.motivo}">
                ${(reg.motivo || '').length > 30 ? reg.motivo.substring(0, 30) + '...' : (reg.motivo || 'Sin motivo')}
                </td>
            </tr>`;
        }).join('');
    }

    if (calendarioRH) {
        calendarioRH.removeAllEventSources();
        calendarioRH.addEventSource(generarEventos(datos));
    }
}

function inicializarCalendarioRH() {
    calendarioRH = new FullCalendar.Calendar(document.getElementById('calendario-rh'), {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' },
        allDayText: 'Todo el día',
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        events: generarEventos(registrosGlobales),
        eventClick: (info) => verDetallesRRHH(info.event.extendedProps)
    });
    calendarioRH.render();
}
//eventos
function generarEventos(datos) {
    //festivos
    let eventos = (window.festivosGlobalesRH || []).map(f => ({
        title: ` ${f.descripcion}`,
        start: f.fecha.split('T')[0],
        display: 'background',
        backgroundColor: 'rgba(25, 135, 84, 0.2)'
    }));

    const cumpleaniosAgregados = new Set();

    datos.forEach(reg => {
        eventos.push({
            title: `${reg.nombre_completo}: ${reg.tipoTramite}`,
            start: reg.fechaClave.split('T')[0],
            backgroundColor: reg.estado === 'Aprobado' ? '#198754' : (reg.estado === 'Pendiente' ? '#ffc107' : '#ffc107'),
            extendedProps: { ...reg }
        });

        //cumpleaños
        if (reg.fecha_nacimiento && !cumpleaniosAgregados.has(reg.id_usuario)) {
            const año = new Date().getFullYear();
            const mesDia = reg.fecha_nacimiento.substring(5, 10);
            eventos.push({
                title: `Cumple: ${reg.nombre_completo.split(' ')[0]}`,
                start: `${año}-${mesDia}`,
                allDay: true,
                backgroundColor: '#6f42c1',
                borderColor: 'transparent'
            });
            cumpleaniosAgregados.add(reg.id_usuario);
        }
    });

    return eventos;
}
//modal info 
function verDetallesRRHH(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('det-rh-nombre').textContent = data.nombre_completo;
    document.getElementById('det-rh-motivo').textContent = data.motivo || 'Sin motivo';
    document.getElementById('det-fecha-creacion').textContent = data.fecha_solicitud_h || 'N/A';

    const contHoras = document.getElementById('det-rh-cont-horas');
    const contFin = document.getElementById('det-rh-cont-fin');
    const contDias = document.getElementById('det-rh-cont-dias');
    const contRev = document.getElementById('det-rh-cont-revision');

    if (data.estado !== 'Pendiente' && data.revisado_por_nombre) {
        contRev.style.display = 'block';
        document.getElementById('det-rh-revisado-por').textContent = data.revisado_por_nombre;
        const f = new Date(data.fecha_revision);
        document.getElementById('det-rh-fecha-revision').textContent = `${f.toLocaleDateString()} a las ${f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs`;
    } else {
        contRev.style.display = 'none';
    }

    if (esPase) {
        document.getElementById('det-rh-label-fecha').textContent = "Fecha Uso";
        document.getElementById('det-rh-fecha').textContent = data.fecha_uso_h;
        contHoras.style.display = 'block'; contFin.style.display = 'none'; contDias.style.display = 'none';
        document.getElementById('det-rh-horas').textContent = `${data.hora_inicio.substring(0, 5)} - ${data.hora_fin.substring(0, 5)}`;
    } else {
        document.getElementById('det-rh-label-fecha').textContent = "Fecha Inicio";
        document.getElementById('det-rh-fecha').textContent = data.fecha_inicio_h;
        contHoras.style.display = 'none'; contFin.style.display = 'block'; contDias.style.display = 'block';
        document.getElementById('det-rh-fecha-fin').textContent = data.fecha_fin_h;
        document.getElementById('det-rh-dias').textContent = `${data.cantidad_dias} día(s) hábiles`;
    }

    const btnPDF = document.getElementById('btn-descargar-pdf');
    if (btnPDF) {
        if (data.estado === 'Aprobado') {
            btnPDF.style.display = 'block';
            btnPDF.onclick = () => {
                if (esPase) pdfPase(data, data);
                else pdfPermiso(data, data);
            };
        } else {
            btnPDF.style.display = 'none';
        }
    }

    document.getElementById('det-rh-tipo-badge').className = `badge rounded-pill px-3 py-2 fs-5 ${esPase ? 'bg-secondary text-white' : 'bg-secondary'}`;
    document.getElementById('det-rh-tipo-badge').textContent = data.tipo_conteo;

    const est = document.getElementById('det-rh-estado-badge');
    est.textContent = data.estado;
    est.className = `badge fs-6 ${data.estado === 'Aprobado' ? 'bg-success' : (data.estado === 'Vo.Bo.' ? 'bg-info text-white' : (data.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger'))}`;

    modalDetalleRH.show();
}
//filtros historial
function aplicarFiltros() {
    const elDoc = document.getElementById('filtro-docente');
    const fDoc = elDoc ? elDoc.value.toLowerCase() : '';
    const elArea = document.getElementById('filtro-area');
    const fArea = elArea ? elArea.value.toLowerCase() : '';

    const elEst = document.getElementById('filtro-estado');
    const fEst = elEst ? elEst.value : 'Todos';

    const elTipo = document.getElementById('filtro-tipo');
    const fTipo = elTipo ? elTipo.value : 'Todos';

    const elFechaIni = document.getElementById('filtro-fecha-inicio');
    const fFechaIni = elFechaIni ? elFechaIni.value : '';
    const elFechaFin = document.getElementById('filtro-fecha-fin');
    const fFechaFin = elFechaFin ? elFechaFin.value : '';

    const elMes = document.getElementById('filtro-mes');
    const fMes = elMes ? elMes.value : '';
    const elAño = document.getElementById('filtro-año');
    const fAño = elAño ? elAño.value : '';

    const res = registrosGlobales.filter(r => {
        const fClave = r.fechaClave.split('T')[0]; 
        const f = new Date(r.fechaClave);
        const areaDoc = (r.area_adscripcion || '').toLowerCase();

        if (fDoc && !r.nombre_completo.toLowerCase().includes(fDoc)) return false;
        if (fArea && !areaDoc.includes(fArea)) return false;
        if (fEst !== 'Todos' && r.estado !== fEst) return false;
        if (fTipo !== 'Todos' && r.tipoTramite !== fTipo) return false;

        //rango
        if (fFechaIni && fClave < fFechaIni) return false;
        if (fFechaFin && fClave > fFechaFin) return false;

        //mes y año
        if (fMes && (f.getMonth() + 1).toString().padStart(2, '0') !== fMes) return false;
        if (fAño && f.getFullYear().toString() !== fAño) return false;

        return true;
    });
    pintarDashboardRH(res);
}

const formPassRH = document.getElementById('form-cambiar-pass');
if (formPassRH) {
    formPassRH.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('pass-actual').value;
        const npassword = document.getElementById('pass-nueva').value;
        try {
            const resp = await fetch(`${URL_BASE}/login/npassword`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body: JSON.stringify({ password, npassword })
            });
            const res = await resp.json();
            if (res.ok) {
                mostrarToast("Contraseña actualizada");
                bootstrap.Modal.getInstance(document.getElementById('modalCambiarPass')).hide();
                formPassRH.reset();
            } else { mostrarToast(res.msg, "error"); }
        } catch (error) { mostrarToast("Error de conexion", "error"); }
    });
}
//mini filtro
function ordenarRapido(criterio) {
    if (!registrosGlobales.length) return;
    let copia = [...registrosGlobales];
    switch (criterio) {
        case 'reciente': copia.sort((a, b) => b.id - a.id); break;
        case 'nombre': copia.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)); break;
    }
    pintarDashboardRH(copia);
}

async function procesarRH(id, nuevoEstado, tipo) {
    try {
        const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';
        const resp = await fetch(`${URL_BASE}/${endpoint}/cancelar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-token': token },
            body: JSON.stringify({ id: id, cancelar: nuevoEstado, revisado_por: usuario.id })
        });
        const res = await resp.json();
        if (res.ok) {
            mostrarToast("Trámite finalizado correctamente");
            cargarDatosGenerales();
        } else {
            mostrarToast(res.msg, "error");
        }
    } catch (e) {
        mostrarToast("Error de conexión", "error");
    }
}

function confirmarAccionRH(btn, id, estado, tipo) {
    if (btn.dataset.confirmando === "true") {
        clearInterval(Number(btn.dataset.intervalo));
        procesarRH(id, estado, tipo);
        return;
    }
    const textoOriginal = btn.innerHTML;
    const claseOriginal = btn.className;
    btn.dataset.confirmando = "true";
    btn.className = "btn btn-warning btn-confirm-rh text-dark shadow-sm";

    let contador = 3;
    btn.innerHTML = `¿Seguro? (${contador}s)`;

    const intervalo = setInterval(() => {
        contador--;
        if (contador > 0) {
            btn.innerHTML = `¿Seguro? (${contador}s)`;
        } else {
            clearInterval(intervalo);
            btn.dataset.confirmando = "false";
            btn.className = claseOriginal;
            btn.innerHTML = textoOriginal;
        }
    }, 1000);
    btn.dataset.intervalo = intervalo;
}

//excel
function exportarExcel() {
    if (!registrosGlobales.length) return mostrarToast("No hay datos para exportar", "info");

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Tramite,Tipo,Docente,Area Adscripcion,Fecha Evento,Estado,Revisado Por,Motivo\n";

    registrosGlobales.forEach(reg => {
        const area = reg.area_adscripcion || 'No Registrada';
        const revisor = reg.revisado_por_nombre || 'N/A';
        const fecha = reg.fecha_uso_h || reg.fecha_inicio_h;
        const motivoLimpio = (reg.motivo || 'Sin motivo').replace(/,/g, ' ').replace(/\n/g, ' ');

        const row = `${reg.id},${reg.tipoTramite},${reg.nombre_completo},${area},${fecha},${reg.estado},${revisor},${motivoLimpio}`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_RRHH_UTM_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarToast("Reporte descargado exitosamente");
}

function seleccionarTodoMasivo() {
    const checks = document.querySelectorAll('.check-masivo');
    const todosMarcados = Array.from(checks).every(c => c.checked);
    checks.forEach(c => c.checked = !todosMarcados);
}

async function aprobarSeleccionMasiva() {
    const checks = document.querySelectorAll('.check-masivo:checked');
    if (checks.length === 0) return mostrarToast("Selecciona al menos un trámite de la lista", "info");

    if (!confirm(`¿Estás seguro de aprobar ${checks.length} trámites al mismo tiempo?`)) return;

    mostrarToast(`Procesando ${checks.length} firmas...`, "info");

    let exitosos = 0;
    for (const check of checks) {
        const id = check.value;
        const tipo = check.dataset.tipo;
        const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';

        try {
            const resp = await fetch(`${URL_BASE}/${endpoint}/cancelar`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body: JSON.stringify({ id: id, cancelar: 'Aprobado', revisado_por: usuario.id })
            });
            const res = await resp.json();
            if (res.ok) exitosos++;
        } catch (e) {
            console.error("Error al procesar ID: ", id);
        }
    }

    mostrarToast(`Proceso completado! ${exitosos} tramites aprobados`);
    cargarDatosGenerales();
}
function toggleFiltrosMovil(show) {
    const sidebar = document.querySelector('.sidebar');
    const btnCerrar = document.getElementById('btn-cerrar-filtros');
    if (show) {
        sidebar.classList.add('active-movil');
        btnCerrar.classList.add('mostrar');
    } else {
        sidebar.classList.remove('active-movil');
        btnCerrar.classList.remove('mostrar');
    }
}