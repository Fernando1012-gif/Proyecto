const URL_BASE = 'http://localhost:3000/api';
let calendarioJefe;
let solicitudesGlobales = []; 

//para validar sesion con tokens
const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
    window.location.href = "login.html";
}

const usuario = JSON.parse(usuarioStr);

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    const toastMsg = document.getElementById('toast-mensaje');
    
    toastMsg.textContent = mensaje;
    toastHeader.className = tipo === 'success' ? 'toast-header text-white bg-success' : 'toast-header text-white bg-danger';

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

//iniciamos la vista
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saludo-jefe').textContent = usuario.nombre_completo || "Subdirector";
    
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    inicializarCalendario();
    cargarTodasLasSolicitudes();
});
//iniciamos el calendario
function inicializarCalendario() {
    const calendarEl = document.getElementById('calendario-jefe');
    calendarioJefe = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: '100%',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' }
    });
    calendarioJefe.render();
}

//hacemos peticiones a backend
async function cargarTodasLasSolicitudes() {
    try {
        //se consume api para obtener los pases(mandamos el token para autenticas)
        const respPases = await fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } });
        //se consume api para obtener los permisos y se manda el token para autenticar
        const respPermisos = await fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } });
        
        let dataPases = { data: [] };
        let dataPermisos = { data: [] };
        //se formatea a json
        if(respPases.ok) dataPases = await respPases.json();
        if(respPermisos.ok) dataPermisos = await respPermisos.json();

        solicitudesGlobales = [...(dataPases.data || []), ...(dataPermisos.data || [])];
        //damos los datos que hemos obtenido para la pantalla
        actualizarPantallaJefe();
    } catch (error) {
        console.error("error al mostrar los datos", error);
        mostrarToast("error al conectar al server", "error");
    }
}
//mostramos en pantalla los datos finales
function actualizarPantallaJefe() {
    const listaPendientes = document.getElementById('lista-pendientes');
    const tablaEstadisticas = document.getElementById('tabla-estadisticas');
    
    listaPendientes.innerHTML = '';
    tablaEstadisticas.innerHTML = '';
    let eventosAprobados = [];

    if(solicitudesGlobales.length === 0) {
        listaPendientes.innerHTML = '<p class="text-muted text-center mt-4">No hay solicitudes en el sistema.</p>';
        return;
    }

    solicitudesGlobales.forEach(sol => {
        const esPase = sol.hora_inicio !== undefined; 
        const tipoText = esPase ? 'Pase de Salida' : 'Permiso';
        
        //proteccion si hay fechas nulas
        let fechaRaw = esPase ? sol.fecha_uso : sol.fecha_inicio;
        const fechaMostrar = fechaRaw ? fechaRaw.split('T')[0] : 'Sin fecha definida';

        //llenamos el calendario
        if (sol.estado === 'Aprobado') {
            eventosAprobados.push({
                title: `${tipoText} - Aprobado`,
                start: fechaMostrar,
                backgroundColor: '#198754',
                borderColor: '#198754'
            });
        }

        //llenamos con botones para la funcion del subdirector
        if (sol.estado === 'Pendiente') {
            listaPendientes.innerHTML += `
                <div class="solicitud-card">
                    <div class="d-flex justify-content-between">
                        <strong>Docente ID: ${sol.usuario_id}</strong>
                        <span class="badge bg-warning text-dark">${tipoText}</span>
                    </div>
                    <p class="mb-1 text-muted small">Fecha: ${fechaMostrar}</p>
                    <p class="mb-2 small">Motivo: ${sol.motivo || 'Sin motivo'}</p>
                    <div class="d-flex gap-2">
                        <button onclick="cambiarEstado(${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Aprobado')" class="btn btn-success btn-sm w-50"><i class="fa-solid fa-check"></i> Aprobar</button>
                        <button onclick="cambiarEstado(${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Rechazado')" class="btn btn-danger btn-sm w-50"><i class="fa-solid fa-xmark"></i> Rechazar</button>
                    </div>
                </div>
            `;
        }

        //llenamos la tabla central
        let badgeColor = 'bg-warning text-dark';
        if(sol.estado === 'Aprobado') badgeColor = 'bg-success';
        if(sol.estado === 'Rechazado' || sol.estado === 'Cancelado') badgeColor = 'bg-danger';

        tablaEstadisticas.innerHTML += `
            <tr>
                <td class="fw-bold">${sol.nombre_completo}</td>
                <td>${tipoText}</td>
                <td>${fechaMostrar} <span class="badge ${badgeColor} ms-1">${sol.estado}</span></td>
            </tr>
        `;
    });

    if(listaPendientes.innerHTML === '') {
        listaPendientes.innerHTML = '<p class="text-muted text-center mt-4">¡Todo al día! No hay solicitudes pendientes.</p>';
    }

    calendarioJefe.removeAllEventSources();
    calendarioJefe.addEventSource(eventosAprobados);
}

//aprobamos y rechazamos
async function cambiarEstado(id, tipo, nuevoEstado) {
    try {
        //vemos que solicitud aprobaremos 
        const endpoint = tipo === 'pase' ? '/pases/can' : '/permisos/can';
        //mandamos la solicitud para actualizar el pase con la decision del subdirector
        const response = await fetch(`${URL_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-token': token },
            body: JSON.stringify({ id: id, cancelar: nuevoEstado }) 
        });
        //checamos que obtuvimos
        const result = await response.json();
        //si la respuesta es satisfactoria "ok" mostramos mensaje
        if (result.ok) {
            mostrarToast(`Solicitud marcada como ${nuevoEstado}`, 'success');
           //cargamos las solicitudes
            cargarTodasLasSolicitudes(); 
        } else {
            mostrarToast(result.msg, 'error');
        }
    } catch (error) {
        mostrarToast("error al procesar la solicitud", 'error');
    }
}