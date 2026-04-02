// --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
const URL_BASE = 'http://localhost:3000/api';
let calendarioOficial;
let modalInstancia;                // Modal para crear/editar (Formularios)
let modalDetalleDocenteInstancia;  // Modal para ver detalles (Consulta)
let todosLosRegistrosGlobal = []; 
let editandoId = null;           

// Validar sesión
const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
    window.location.href = "login.html";
}
const usuario = JSON.parse(usuarioStr);

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar instancias de Modales de Bootstrap
    modalInstancia = new bootstrap.Modal(document.getElementById('modalSolicitud'));
    modalDetalleDocenteInstancia = new bootstrap.Modal(document.getElementById('modalDetalleDocente'));

    document.getElementById('saludo-profesor').textContent = usuario.nombre || usuario.nombre_completo || "Docente";
    
    // Configuración inicial de campos de Permiso
    const inputDias = document.getElementById('cantidad_dias');
    if (inputDias) {
        inputDias.readOnly = true; 
        document.getElementById('fecha_inicio').addEventListener('change', calcularDiasPermiso);
        document.getElementById('fecha_fin').addEventListener('change', calcularDiasPermiso);
    }

    // Eventos de botones principales
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    document.getElementById('btn-elegir-pase').addEventListener('click', () => {
        document.getElementById('step-1-choice').style.display = 'none';
        document.getElementById('form-pedir-pase').style.display = 'block';
    });

    document.getElementById('btn-elegir-permiso').addEventListener('click', () => {
        document.getElementById('step-1-choice').style.display = 'none';
        document.getElementById('form-pedir-permiso').style.display = 'block';
    });

    pintarCalendario([]);
    cargarDatosYActualizarCalendario();
});

// --- FUNCIONES DE INTERFAZ ---

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    const toastMsg = document.getElementById('toast-mensaje');
    if (!toastEl) return;
    toastMsg.textContent = mensaje;
    toastHeader.className = `toast-header text-white ${tipo === 'success' ? 'bg-success' : (tipo === 'error' ? 'bg-danger' : 'bg-warning text-dark')}`;
    new bootstrap.Toast(toastEl, { delay: 4000 }).show();
}

function volverPaso1() {
    editandoId = null; 
    document.getElementById('step-1-choice').style.display = 'block';
    document.getElementById('form-pedir-pase').style.display = 'none';
    document.getElementById('form-pedir-permiso').style.display = 'none';
    document.getElementById('form-pedir-pase').reset();
    document.getElementById('form-pedir-permiso').reset();
    
    const btnSubmitPermiso = document.querySelector('#form-pedir-permiso button[type="submit"]');
    if (btnSubmitPermiso) btnSubmitPermiso.disabled = false;
    document.getElementById('cantidad_dias').classList.remove('is-invalid');
}

// --- LÓGICA DE NEGOCIO Y CÁLCULOS ---

function calcularDiasPermiso() {
    const fechaInicioStr = document.getElementById('fecha_inicio').value;
    const fechaFinStr = document.getElementById('fecha_fin').value;
    const inputDias = document.getElementById('cantidad_dias');
    const btnSubmit = document.querySelector('#form-pedir-permiso button[type="submit"]');

    if (!fechaInicioStr || !fechaFinStr) return;

    let f1 = new Date(fechaInicioStr + 'T00:00:00');
    let f2 = new Date(fechaFinStr + 'T00:00:00');

    if (f2 < f1) {
        mostrarToast("La fecha de fin no puede ser anterior al inicio", "error");
        inputDias.value = 0;
        if (btnSubmit) btnSubmit.disabled = true;
        return;
    }

    let diasHabiles = 0;
    let fechaAux = new Date(f1);

    while (fechaAux <= f2) {
        const diaSemana = fechaAux.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasHabiles++;
        }
        fechaAux.setDate(fechaAux.getDate() + 1);
    }

    inputDias.value = diasHabiles;

    if (diasHabiles > 3) {
        mostrarToast("Máximo 3 días permitidos", "error");
        inputDias.classList.add('is-invalid');
        if (btnSubmit) btnSubmit.disabled = true;
    } else if (diasHabiles <= 0) {
        if (btnSubmit) btnSubmit.disabled = true;
    } else {
        inputDias.classList.remove('is-invalid');
        if (btnSubmit) btnSubmit.disabled = false;
    }
}

function verDetallesSolicitud(data) {
    const esPase = data.tipoTramite === 'Pase';
    
    document.getElementById('v-det-tipo').textContent = data.tipoTramite;
    document.getElementById('v-det-motivo').textContent = data.motivo || 'Sin motivo';
    
    const labelFecha = document.getElementById('v-label-fecha');
    const contHoras = document.getElementById('v-cont-horas');
    const contFin = document.getElementById('v-cont-fin');
    const contDias = document.getElementById('v-cont-dias');

    if (esPase) {
        labelFecha.textContent = "Fecha de Uso";
        document.getElementById('v-det-fecha').textContent = data.fecha_uso.split('T')[0];
        contHoras.style.display = 'block';
        contFin.style.display = 'none';
        contDias.style.display = 'none';
        document.getElementById('v-det-horas').textContent = `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else {
        labelFecha.textContent = "Fecha Inicio";
        document.getElementById('v-det-fecha').textContent = data.fecha_inicio.split('T')[0];
        contHoras.style.display = 'none';
        contFin.style.display = 'block';
        contDias.style.display = 'block';
        document.getElementById('v-det-fecha-fin').textContent = data.fecha_fin.split('T')[0];
        document.getElementById('v-det-dias').textContent = `${data.cantidad_dias} día(s) hábil(es)`;
    }

    const tipoBadge = document.getElementById('v-det-tipo-badge');
    tipoBadge.className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    tipoBadge.textContent = data.tipoTramite;
    
    const estBadge = document.getElementById('v-det-estado-badge');
    estBadge.textContent = data.estado;
    let color = data.estado === 'Aprobado' ? 'bg-success' : (data.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger');
    estBadge.className = `badge fs-6 ${color}`;
    
    modalDetalleDocenteInstancia.show();
}

// --- GESTIÓN DE DATOS ---

async function cargarDatosYActualizarCalendario() {
    try {
        const [resPases, resPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/ver`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/ver`, { headers: { 'x-token': token } })
        ]);

        const dataPases = await resPases.json();
        const dataPermisos = await resPermisos.json();

        if (dataPases.ok && dataPermisos.ok) {
            const pasesMapeados = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso, titulo: `Pase: ${p.estado}` }));
            const permisosMapeados = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio, titulo: `Permiso: ${p.estado}` }));

            todosLosRegistrosGlobal = [...pasesMapeados, ...permisosMapeados];

            document.getElementById('badge-aprobados').textContent = todosLosRegistrosGlobal.filter(r => r.estado === 'Aprobado').length;
            document.getElementById('badge-pendientes').textContent = todosLosRegistrosGlobal.filter(r => r.estado === 'Pendiente').length;
            document.getElementById('badge-rechazados').textContent = todosLosRegistrosGlobal.filter(r => r.estado === 'Rechazado' || r.estado === 'Cancelado').length;

            const eventos = todosLosRegistrosGlobal.map(reg => {
                let color = reg.estado === 'Aprobado' ? '#198754' : (reg.estado === 'Pendiente' ? '#ffc107' : '#dc3545');
                return {
                    id: reg.id,
                    title: reg.titulo,
                    start: reg.tipoTramite === 'Pase' ? `${reg.fechaClave.split('T')[0]}T${reg.hora_inicio}` : reg.fechaClave.split('T')[0],
                    backgroundColor: color, borderColor: color,
                    textColor: reg.estado === 'Pendiente' ? '#000' : '#fff',
                    extendedProps: { ...reg }
                };
            });

            pintarHistorial(todosLosRegistrosGlobal);
            calendarioOficial.removeAllEventSources();
            calendarioOficial.addEventSource(eventos);
        }
    } catch (error) { mostrarToast("Error de sincronización", "error"); }
}

function pintarCalendario(eventos) {
    const calendarEl = document.getElementById('calendario');
    calendarioOficial = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        weekends: true, // LOS FINES DE SEMANA SIGUEN VISIBLES
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: eventos,
        dateClick: (info) => {
            // BLOQUEO DE CLIC EN FINES DE SEMANA
            const dia = info.date.getDay(); 
            if (dia === 0 || dia === 6) {
                mostrarToast("No se labora en fines de semana", "warning");
                return;
            }

            volverPaso1();
            document.getElementById('fecha_uso').value = info.dateStr;
            document.getElementById('fecha_inicio').value = info.dateStr;
            modalInstancia.show();
        },
        eventClick: (info) => { verDetallesSolicitud(info.event.extendedProps); }
    });
    calendarioOficial.render();
}

function pintarHistorial(registros) {
    const contenedor = document.getElementById('historial-lista');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    const ultimos = [...registros].sort((a, b) => b.id - a.id).slice(0, 6);

    ultimos.forEach(reg => {
        const esPase = reg.tipoTramite === 'Pase';
        const esPendiente = reg.estado === 'Pendiente';
        let badgeClass = reg.estado === 'Aprobado' ? 'bg-success' : (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger');

        const div = document.createElement('div');
        div.className = 'p-2 mb-2 border rounded bg-light shadow-sm';
        div.style.cursor = 'pointer';
        div.onclick = () => verDetallesSolicitud(reg);

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start small">
                <span class="fw-bold text-truncate" style="max-width: 130px;">
                    <i class="${esPase ? 'fa-solid fa-person-walking' : 'fa-solid fa-calendar-day'} me-1"></i>
                    ${reg.tipoTramite} #${reg.id}
                </span>
                <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${reg.estado}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-1">
                <div class="text-truncate text-muted small" style="max-width: 70%;">${reg.motivo}</div>
                ${esPendiente ? `
                    <div class="btn-group" onclick="event.stopPropagation()">
                        <button class="btn btn-sm btn-outline-primary py-0 px-1" onclick="prepararEdicion('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="cancelarSolicitud('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                ` : ''}
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// --- ACCIONES DE FORMULARIO ---

function prepararEdicion(tipo, id) {
    const reg = todosLosRegistrosGlobal.find(r => r.id === id && r.tipoTramite === tipo);
    if (!reg) return;
    editandoId = id;
    document.getElementById('step-1-choice').style.display = 'none';
    
    if (tipo === 'Pase') {
        document.getElementById('form-pedir-pase').style.display = 'block';
        document.getElementById('fecha_uso').value = reg.fecha_uso.split('T')[0];
        document.getElementById('hora_inicio').value = reg.hora_inicio;
        document.getElementById('hora_fin').value = reg.hora_fin;
        document.getElementById('motivo_pase').value = reg.motivo;
    } else {
        document.getElementById('form-pedir-permiso').style.display = 'block';
        document.getElementById('tipo_permiso').value = reg.tipo_permiso;
        document.getElementById('fecha_inicio').value = reg.fecha_inicio.split('T')[0];
        document.getElementById('fecha_fin').value = reg.fecha_fin.split('T')[0];
        document.getElementById('cantidad_dias').value = reg.cantidad_dias;
        document.getElementById('motivo').value = reg.motivo;
        calcularDiasPermiso(); 
    }
    modalInstancia.show();
}

async function cancelarSolicitud(tipo, id) {
    if (!confirm(`¿Cancelar ${tipo} #${id}?`)) return;
    const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';
    try {
        const resp = await fetch(`${URL_BASE}/${endpoint}/cancelar`, {
            method: 'PATCH',
            headers: { 'x-token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, cancelar: "cancelado" })
        });
        const res = await resp.json();
        if (res.ok) { mostrarToast("Solicitud Cancelada"); cargarDatosYActualizarCalendario(); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
}

// --- SUBMITS ---

document.getElementById('form-pedir-pase').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        fecha_uso: document.getElementById('fecha_uso').value,
        hora_inicio: document.getElementById('hora_inicio').value,
        hora_fin: document.getElementById('hora_fin').value,
        motivo: document.getElementById('motivo_pase').value,
        id: editandoId 
    };
    const url = editandoId ? `${URL_BASE}/pases/mod` : `${URL_BASE}/pases/crear`;
    const metodo = editandoId ? 'PATCH' : 'POST';

    try {
        const resp = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'x-token': token }, body: JSON.stringify(data) });
        const res = await resp.json();
        if (res.ok) { modalInstancia.hide(); volverPaso1(); cargarDatosYActualizarCalendario(); mostrarToast(editandoId ? 'Actualizado' : 'Enviado'); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
});

document.getElementById('form-pedir-permiso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dias = parseInt(document.getElementById('cantidad_dias').value) || 0;
    
    if (dias > 3 || dias <= 0) {
        mostrarToast("Revisar el rango de fechas (máximo 3 días hábiles)", "error");
        return;
    }

    const data = {
        tipo_permiso: document.getElementById('tipo_permiso').value,
        fecha_inicio: document.getElementById('fecha_inicio').value,
        fecha_fin: document.getElementById('fecha_fin').value,
        cantidad_dias: dias,
        motivo: document.getElementById('motivo').value,
        id: editandoId 
    };
    const url = editandoId ? `${URL_BASE}/permisos/mod` : `${URL_BASE}/permisos/crear`;
    const metodo = editandoId ? 'PATCH' : 'POST';

    try {
        const resp = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'x-token': token }, body: JSON.stringify(data) });
        const res = await resp.json();
        if (res.ok) { modalInstancia.hide(); volverPaso1(); cargarDatosYActualizarCalendario(); mostrarToast(editandoId ? 'Actualizado' : 'Enviado'); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
});
// Lógica para cambiar contraseña en Docentes
const formPassDocente = document.getElementById('form-cambiar-pass');
if (formPassDocente) {
    formPassDocente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('pass-actual').value;
        const npassword = document.getElementById('pass-nueva').value;

        try {
            const resp = await fetch(`${URL_BASE}/login/npassword`, { // Asegúrate que esta sea tu ruta
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body: JSON.stringify({ password, npassword })
            });
            const res = await resp.json();
            if (res.ok) {
                mostrarToast("Contraseña cambiada");
                bootstrap.Modal.getInstance(document.getElementById('modalCambiarPass')).hide();
                formPassDocente.reset();
            } else { mostrarToast(res.msg, "error"); }
        } catch (error) { mostrarToast("Error de conexión", "error"); }
    });
}