// --- CONFIGURACIÓN Y VARIABLES GLOBALES ---
const URL_BASE = 'http://localhost:3000/api';
let calendarioOficial;
let modalInstancia;
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
    modalInstancia = new bootstrap.Modal(document.getElementById('modalSolicitud'));
    document.getElementById('saludo-profesor').textContent = usuario.nombre || usuario.nombre_completo || "Docente";
    
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
}

// --- LÓGICA DE DATOS ---

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
    } catch (error) { mostrarToast("Error al sincronizar datos", "error"); }
}

function pintarCalendario(eventos) {
    const calendarEl = document.getElementById('calendario');
    calendarioOficial = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: eventos,
        dateClick: (info) => {
            volverPaso1();
            document.getElementById('fecha_uso').value = info.dateStr;
            document.getElementById('fecha_inicio').value = info.dateStr;
            modalInstancia.show();
        },
        eventClick: (info) => { mostrarToast(`${info.event.extendedProps.tipoTramite}: ${info.event.title} - Motivo: ${info.event.extendedProps.motivo}`, 'info'); }
    });
    calendarioOficial.render();
}

function pintarHistorial(registros) {
    const contenedor = document.getElementById('historial-lista');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const ultimos = registros.sort((a, b) => b.id - a.id).slice(0, 6);

    ultimos.forEach(reg => {
        const esPase = reg.tipoTramite === 'Pase';
        const esPendiente = reg.estado === 'Pendiente';
        let badgeClass = reg.estado === 'Aprobado' ? 'bg-success' : (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger');

        const div = document.createElement('div');
        div.className = 'p-2 mb-2 border rounded bg-light shadow-sm';
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
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary py-0 px-1" onclick="prepararEdicion('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn btn-sm btn-outline-danger py-0 px-1" onclick="cancelarSolicitud('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                ` : ''}
            </div>
        `;
        contenedor.appendChild(div);
    });
}

// --- FUNCIONES DE ACCIÓN ---

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
    }
    modalInstancia.show();
}

async function cancelarSolicitud(tipo, id) {
    if (!confirm(`¿Cancelar ${tipo} #${id}?`)) return;
    const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';
    try {
        const resp = await fetch(`${URL_BASE}/${endpoint}/cancelar`, {
            method: 'PATCH', // Corregido a PATCH según tu rutaPermiso.js
            headers: { 'x-token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, cancelar: "cancelado" }) // Coincide con req.body en conPermiso.js
        });
        const res = await resp.json();
        if (res.ok) { mostrarToast("Cancelado"); cargarDatosYActualizarCalendario(); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
}

// --- SUBMITS (CORREGIDOS PARA /MOD Y PATCH) ---

document.getElementById('form-pedir-pase').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        fecha_uso: document.getElementById('fecha_uso').value,
        hora_inicio: document.getElementById('hora_inicio').value,
        hora_fin: document.getElementById('hora_fin').value,
        motivo: document.getElementById('motivo_pase').value,
        id: editandoId // El backend lo espera en el body para /mod
    };
    const url = editandoId ? `${URL_BASE}/pases/mod` : `${URL_BASE}/pases/crear`;
    const metodo = editandoId ? 'PATCH' : 'POST'; // PATCH para modificar

    try {
        const resp = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'x-token': token }, body: JSON.stringify(data) });
        const res = await resp.json();
        if (res.ok) { modalInstancia.hide(); volverPaso1(); cargarDatosYActualizarCalendario(); mostrarToast(editandoId ? 'Actualizado' : 'Enviado'); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
});

document.getElementById('form-pedir-permiso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        tipo_permiso: document.getElementById('tipo_permiso').value,
        fecha_inicio: document.getElementById('fecha_inicio').value,
        fecha_fin: document.getElementById('fecha_fin').value,
        cantidad_dias: document.getElementById('cantidad_dias').value,
        motivo: document.getElementById('motivo').value,
        id: editandoId // ID en el body
    };
    const url = editandoId ? `${URL_BASE}/permisos/mod` : `${URL_BASE}/permisos/crear`;
    const metodo = editandoId ? 'PATCH' : 'POST'; // PATCH para modificar

    try {
        const resp = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', 'x-token': token }, body: JSON.stringify(data) });
        const res = await resp.json();
        if (res.ok) { modalInstancia.hide(); volverPaso1(); cargarDatosYActualizarCalendario(); mostrarToast(editandoId ? 'Actualizado' : 'Enviado'); }
        else { mostrarToast(res.msg, 'error'); }
    } catch (e) { mostrarToast("Error de red", "error"); }
});