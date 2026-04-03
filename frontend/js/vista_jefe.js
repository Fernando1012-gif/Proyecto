//url para consultar api
const URL_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');
let calendarioJefe;
let modalDetalle;
let solicitudesGlobales = []; 

// Escuchamos el aviso del servidor en tiempo real
socket.on('nuevo-pase-creado', (data) => {
    console.log("Mensaje del servidor:", data.msg);
    // Llamamos a tu función real para refrescar los datos
    cargarTodasLasSolicitudes(); 
    // Avisamos visualmente al jefe
    mostrarToast("¡Nueva solicitud recibida!", "info");
});

socket.on('nuevo-permiso-creado', (data) => {
    console.log(data.msg);
    // Corregido: usamos cargarTodasLasSolicitudes() que es la que existe aquí
    cargarTodasLasSolicitudes(); 
    mostrarToast("¡Nueva solicitud de Permiso recibida!", "info");
});

// Escuchar cuando algo cambia
socket.on('permiso-actualizado', () => {
    cargarTodasLasSolicitudes(); 
});

const token = sessionStorage.getItem('token');
const usuarioStr = sessionStorage.getItem('usuario');

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

//funcion si la sesion expiro
function manejarSesionExpirada() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    document.getElementById('toast-mensaje').textContent = mensaje;
    toastHeader.className = `toast-header text-white ${tipo === 'success' ? 'bg-success' : 'bg-danger'}`;
    if(tipo === 'info') toastHeader.className = `toast-header text-white bg-info`;
    new bootstrap.Toast(toastEl).show();
}

document.addEventListener('DOMContentLoaded', () => {
    modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalleSolicitud'));
    document.getElementById('saludo-jefe').textContent = usuario.nombre_completo || "Subdirector";
    
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
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
        eventClick: (info) => verDetallesModal(info.event.extendedProps)
    });
    calendarioJefe.render();
}

async function cargarTodasLasSolicitudes() {
    try {
        //obtenemos todos los permisos y pases
        const [respPases, respPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } })
        ]);

        //revisamos tokens
        if (respPases.status === 401 || respPermisos.status === 401) {
            manejarSesionExpirada();
            return;
        }

        //sacamos los datos
        const dataPases = respPases.ok ? await respPases.json() : { data: [] };
        const dataPermisos = respPermisos.ok ? await respPermisos.json() : { data: [] };

        //damos los datos
        const pases = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase' }));
        const permisos = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso' }));

        solicitudesGlobales = [...pases, ...permisos];
        ejecutarMiniFiltro(); // Actualiza la tabla y el calendario
        
    } catch (error) { 
        console.error("Error en la carga:", error);
        mostrarToast("Error al conectar al sserver", "error"); 
    }
}

//filtro para ordenar historial
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

//funcion para actualizar con datos
function actualizarPantallaJefe(datos) {
    const listaPendientes = document.getElementById('lista-pendientes');
    const tablaEstadisticas = document.getElementById('tabla-estadisticas');
    
    listaPendientes.innerHTML = '';
    tablaEstadisticas.innerHTML = '';
    let eventos = [];
    let contadorPendientes = 0;

    datos.forEach(sol => {
        const esPase = sol.tipoTramite === 'Pase';
        const fechaMostrar = sol.fecha_uso_h || sol.fecha_inicio_h;
        const fechaISO = (esPase ? sol.fecha_uso : sol.fecha_inicio).split('T')[0];

        if (sol.estado === 'Aprobado') {
            eventos.push({
                title: `${sol.nombre_completo}: ${sol.tipoTramite}`,
                start: fechaISO,
                backgroundColor: '#198754',
                borderColor: '#198754',
                extendedProps: { ...sol }
            });
        }

        if (sol.estado === 'Pendiente') {
            contadorPendientes++;
            listaPendientes.innerHTML += `
                <div class="solicitud-card small">
                    <div class="d-flex justify-content-between mb-1">
                        <strong onclick='verDetallesModal(${JSON.stringify(sol)})' style="cursor:pointer" class="text-primary">${sol.nombre_completo}</strong>
                        <span class="badge bg-secondary">${sol.tipoTramite}</span>
                    </div>
                    <p class="mb-2 text-muted">Fecha: ${fechaMostrar}</p>
                    <div class="d-flex gap-2">
                        <button onclick="confirmarAccion(this, ${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Aprobado')" class="btn btn-success btn-sm w-50">Aprobar</button>
                        <button onclick="confirmarAccion(this, ${sol.id}, '${esPase ? 'pase' : 'permiso'}', 'Rechazado')" class="btn btn-danger btn-sm w-50">Rechazar</button>
                    </div>
                </div>`;
        }

        tablaEstadisticas.innerHTML += `
            <tr class="small" onclick='verDetallesModal(${JSON.stringify(sol)})' style="cursor:pointer">
                <td>${sol.nombre_completo}</td>
                <td>${sol.tipoTramite}</td>
                <td>${fechaMostrar}</td>
                <td><span class="badge ${sol.estado === 'Aprobado' ? 'bg-success' : (sol.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger')}">${sol.estado}</span></td>
            </tr>`;
    });

    if (contadorPendientes === 0) {
        listaPendientes.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <i class="fa-solid fa-mug-hot fa-3x mb-3" style="color: var(--utm-teal);"></i>
                <p class="fw-bold mb-0">¡Todo al día!</p>
                <small>No hay solicitudes pendientes.</small>
            </div>`;
    }

    calendarioJefe.removeAllEventSources();
    calendarioJefe.addEventSource(eventos);
}

//funcion para ver los detalles de un tramite
function verDetallesModal(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('det-nombre').textContent = data.nombre_completo;
    document.getElementById('det-motivo').textContent = data.motivo || 'Sin motivo especificado';
    
    document.getElementById('det-fecha-creacion').textContent = data.fecha_solicitud_h || 'N/A';
    
    const labelFecha = document.getElementById('label-fecha-principal');
    const contHoras = document.getElementById('det-contenedor-horas');
    const contFin = document.getElementById('det-contenedor-fin');
    const contDias = document.getElementById('det-contenedor-dias');

    if (esPase) {
        labelFecha.textContent = "Fecha de Uso";
        document.getElementById('det-fecha').textContent = data.fecha_uso_h;
        contHoras.style.display = 'block'; contFin.style.display = 'none'; contDias.style.display = 'none';
        document.getElementById('det-horas').textContent = `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else {
        labelFecha.textContent = "Fecha Inicio";
        document.getElementById('det-fecha').textContent = data.fecha_inicio_h;
        contHoras.style.display = 'none'; contFin.style.display = 'block'; contDias.style.display = 'block';
        document.getElementById('det-fecha-fin').textContent = data.fecha_fin_h;
        document.getElementById('det-dias').textContent = `${data.cantidad_dias} día(s) hábil(es)`;
    }

    document.getElementById('det-tipo-badge').textContent = data.tipoTramite;
    document.getElementById('det-tipo-badge').className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    
    const estBadge = document.getElementById('det-estado-badge');
    estBadge.textContent = data.estado;
    estBadge.className = `badge fs-6 ${data.estado === 'Aprobado' ? 'bg-success' : (data.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger')}`;
    
    modalDetalle.show();
}

//funcion para aprobar o rechazar
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

//si queremos cambiar la password
const formPassJefe = document.getElementById('form-cambiar-pass');
if (formPassJefe) {
    formPassJefe.addEventListener('submit', async (e) => {
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
                formPassJefe.reset();
            } else { mostrarToast(res.msg, "error"); }
        } catch (error) { mostrarToast("Error de servidor", "error"); }
    });
}

//funcion para confirmar la accion
function confirmarAccion(btn, id, tipo, estado) {
    if (btn.dataset.confirmando === "true") {
        clearInterval(Number(btn.dataset.intervalo));
        cambiarEstado(id, tipo, estado);
        return;
    }

    const textoOriginal = btn.innerHTML;
    const claseOriginal = btn.className;

    btn.dataset.confirmando = "true";
    btn.className = "btn btn-warning btn-sm w-50 fw-bold text-dark"; 

    let contador = 3;
    btn.innerHTML = `Seguro? (${contador}s)`;

    //cuenta para dejar como estaba todo
    const intervalo = setInterval(() => {
        contador--;
        
        if (contador > 0) {
            btn.innerHTML = `Seguro? (${contador}s)`;
        } else {
            clearInterval(intervalo);
            btn.dataset.confirmando = "false";
            btn.className = claseOriginal;
            btn.innerHTML = textoOriginal;
        }
    }, 1000);

    btn.dataset.intervalo = intervalo;
}