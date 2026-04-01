const URL_BASE = 'http://localhost:3000/api';
let calendarioJefe;
let modalDetalle;
let solicitudesGlobales = []; 

const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    document.getElementById('toast-mensaje').textContent = mensaje;
    toastHeader.className = `toast-header text-white ${tipo === 'success' ? 'bg-success' : 'bg-danger'}`;
    new bootstrap.Toast(toastEl).show();
}

document.addEventListener('DOMContentLoaded', () => {
    modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalleSolicitud'));
    document.getElementById('saludo-jefe').textContent = usuario.nombre_completo || "Subdirector";
    
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    inicializarCalendario();
    cargarTodasLasSolicitudes();
});

function inicializarCalendario() {
    const calendarEl = document.getElementById('calendario-jefe');
    calendarioJefe = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: '100%',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' },
        eventClick: (info) => verDetallesModal(info.event.extendedProps) // Muestra el modal con la info detallada
    });
    calendarioJefe.render();
}

async function cargarTodasLasSolicitudes() {
    try {
        const [respPases, respPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } })
        ]);
        
        const dataPases = respPases.ok ? await respPases.json() : { data: [] };
        const dataPermisos = respPermisos.ok ? await respPermisos.json() : { data: [] };
        console.log(dataPases);

        const pases = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase' }));
        const permisos = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso' }));

        solicitudesGlobales = [...pases, ...permisos];
        ejecutarMiniFiltro();
    } catch (error) { mostrarToast("Error al conectar al servidor", "error"); }
}

function ejecutarMiniFiltro() {
    const buscador = document.getElementById('mini-docente').value.toLowerCase().trim();
    const tipo = document.querySelector('input[name="btn-tipo"]:checked').value;
    const soloPendientes = document.getElementById('check-solo-pendientes').checked;

    let filtrados = solicitudesGlobales.filter(sol => {
        let cumple = true;
        if (buscador && !sol.nombre_completo.toLowerCase().includes(buscador)) cumple = false;
        if (tipo !== 'Ambos' && sol.tipoTramite !== tipo) cumple = false;
        if (soloPendientes && sol.estado !== 'Pendiente') cumple = false;
        return cumple;
    });

    filtrados.sort((a, b) => b.id - a.id);
    actualizarPantallaJefe(filtrados);
}

function actualizarPantallaJefe(datos) {
    const listaPendientes = document.getElementById('lista-pendientes');
    const tablaEstadisticas = document.getElementById('tabla-estadisticas');
    
    listaPendientes.innerHTML = '';
    tablaEstadisticas.innerHTML = '';
    let eventos = [];

    datos.forEach(sol => {
        const esPase = sol.tipoTramite === 'Pase';
        const fecha = esPase ? sol.fecha_uso : sol.fecha_inicio;
        const fechaMostrar = fecha ? fecha.split('T')[0] : 'S/F';

        if (sol.estado === 'Aprobado') {
            eventos.push({
                title: `${sol.nombre_completo}: ${sol.tipoTramite}`,
                start: fechaMostrar,
                backgroundColor: '#198754',
                borderColor: '#198754',
                extendedProps: { ...sol } // Información extra para el modal
            });
        }

        if (sol.estado === 'Pendiente') {
            listaPendientes.innerHTML += `
                <div class="solicitud-card small">
                    <div class="d-flex justify-content-between mb-1">
                        <strong onclick='verDetallesModal(${JSON.stringify(sol)})' style="cursor:pointer" class="text-primary">${sol.nombre_completo}</strong>
                        <span class="badge bg-secondary">${sol.tipoTramite}</span>
                    </div>
                    <p class="mb-2 text-muted">Fecha: ${fechaMostrar}</p>
                    <div class="d-flex gap-2">
                        <button onclick="cambiarEstado(${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Aprobado')" class="btn btn-success btn-sm w-50">Aprobar</button>
                        <button onclick="cambiarEstado(${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Rechazado')" class="btn btn-danger btn-sm w-50">Rechazar</button>
                    </div>
                </div>`;
        }

        tablaEstadisticas.innerHTML += `
            <tr class="small" onclick='verDetallesModal(${JSON.stringify(sol)})' style="cursor:pointer">
                <td>${sol.nombre_completo}</td>
                <td>${sol.tipoTramite}</td>
                <td>${fechaMostrar}</td>
                <td><span class="badge ${sol.estado === 'Aprobado' ? 'bg-success' : 'bg-warning text-dark'}">${sol.estado}</span></td>
            </tr>`;
    });

    calendarioJefe.removeAllEventSources();
    calendarioJefe.addEventSource(eventos);
}

function verDetallesModal(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('det-nombre').textContent = data.nombre_completo;
    document.getElementById('det-fecha').textContent = esPase ? data.fecha_uso.split('T')[0] : data.fecha_inicio.split('T')[0];
    
    const contHoras = document.getElementById('det-contenedor-horas');
    if (esPase) {
        contHoras.style.display = 'block';
        document.getElementById('det-horas').textContent = `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else { contHoras.style.display = 'none'; }

    document.getElementById('det-motivo').textContent = data.motivo || 'Sin motivo';
    document.getElementById('det-tipo-badge').textContent = data.tipoTramite;
    document.getElementById('det-tipo-badge').className = `badge rounded-pill ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    
    const estBadge = document.getElementById('det-estado-badge');
    estBadge.textContent = data.estado;
    estBadge.className = `badge ${data.estado === 'Aprobado' ? 'bg-success' : 'bg-warning text-dark'}`;
    
    modalDetalle.show();
}

async function cambiarEstado(id, tipo, nuevoEstado) {
    const endpoint = tipo === 'pase' ? '/pases/cancelar' : '/permisos/cancelar';
    try {
        const resp = await fetch(`${URL_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-token': token },
            body: JSON.stringify({ id, cancelar: nuevoEstado })
        });
        const res = await resp.json();
        if (res.ok) { mostrarToast(`Solicitud ${nuevoEstado}`); cargarTodasLasSolicitudes(); }
    } catch (e) { mostrarToast("Error de conexión", "error"); }
}