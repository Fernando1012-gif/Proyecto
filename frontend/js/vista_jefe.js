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
    let contadorPendientes = 0; // Agregamos este contador

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
                extendedProps: { ...sol }
            });
        }

        if (sol.estado === 'Pendiente') {
            contadorPendientes++; // Incrementamos si hay uno pendiente
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

    // --- LEYENDA CUANDO NO HAY PENDIENTES ---
    if (contadorPendientes === 0) {
        listaPendientes.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <i class="fa-solid fa-mug-hot fa-3x mb-3" style="color: var(--utm-teal);"></i>
                <p class="fw-bold mb-0">¡Todo al día!</p>
                <small>No hay solicitudes pendientes por el momento.</small>
            </div>`;
    }

    calendarioJefe.removeAllEventSources();
    calendarioJefe.addEventSource(eventos);
}

function verDetallesModal(data) {
    const esPase = data.tipoTramite === 'Pase';
    
    // 1. Datos básicos
    document.getElementById('det-nombre').textContent = data.nombre_completo;
    document.getElementById('det-motivo').textContent = data.motivo || 'Sin motivo especificado';
    
    // 2. Etiquetas dinámicas y Fechas
    const labelFecha = document.getElementById('label-fecha-principal');
    if (esPase) {
        labelFecha.textContent = "Fecha de Uso";
        document.getElementById('det-fecha').textContent = data.fecha_uso.split('T')[0];
    } else {
        labelFecha.textContent = "Fecha Inicio";
        document.getElementById('det-fecha').textContent = data.fecha_inicio.split('T')[0];
    }

    // 3. Control de contenedores según tipo de trámite
    const contHoras = document.getElementById('det-contenedor-horas');
    const contFin = document.getElementById('det-contenedor-fin');
    const contDias = document.getElementById('det-contenedor-dias');

    if (esPase) {
        // Mostrar Horas, ocultar resto
        contHoras.style.display = 'block';
        contFin.style.display = 'none';
        contDias.style.display = 'none';
        document.getElementById('det-horas').textContent = 
            `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else {
        // Mostrar Fecha Fin y Días, ocultar Horas
        contHoras.style.display = 'none';
        contFin.style.display = 'block';
        contDias.style.display = 'block';
        document.getElementById('det-fecha-fin').textContent = data.fecha_fin.split('T')[0];
        document.getElementById('det-dias').textContent = `${data.cantidad_dias} día(s) hábil(es)`;
    }

    // 4. Badges (Tipo y Estado)
    const tipoBadge = document.getElementById('det-tipo-badge');
    tipoBadge.textContent = data.tipoTramite;
    tipoBadge.className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    
    const estBadge = document.getElementById('det-estado-badge');
    estBadge.textContent = data.estado;
    let colorEstado = 'bg-warning text-dark'; // Pendiente
    if (data.estado === 'Aprobado') colorEstado = 'bg-success';
    if (data.estado === 'Rechazado' || data.estado === 'Cancelado') colorEstado = 'bg-danger';
    estBadge.className = `badge fs-6 ${colorEstado}`;
    
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
// --- LÓGICA DE SEGURIDAD (CAMBIO DE CONTRASEÑA) ---

const formPassJefe = document.getElementById('form-cambiar-pass');
if (formPassJefe) {
    formPassJefe.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = document.getElementById('pass-actual').value;
        const npassword = document.getElementById('pass-nueva').value;

        try {
            // Realizamos la petición al endpoint de autenticación
            const resp = await fetch(`${URL_BASE}/login/npassword`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-token': token // Token de sesión del jefe
                },
                body: JSON.stringify({ password, npassword })
            });

            const res = await resp.json();

            if (res.ok) {
                mostrarToast("Contraseña actualizada con éxito"); //
                // Cerramos el modal usando la instancia de Bootstrap
                const modalPass = bootstrap.Modal.getInstance(document.getElementById('modalCambiarPass'));
                if (modalPass) modalPass.hide();
                formPassJefe.reset();
            } else {
                mostrarToast(res.msg, "error"); // Muestra el error que mande el backend
            }
        } catch (error) {
            mostrarToast("Error al conectar con el servidor", "error");
        }
    });
}