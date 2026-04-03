//url para consultar la api
const URL_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');
let registrosGlobales = [];
let calendarioRH;
let modalDetalleRH;

const token = sessionStorage.getItem('token');
const usuarioStr = sessionStorage.getItem('usuario');

// CONFIGURACIÓN DE SOCKETS EN TIEMPO REAL
socket.on('nuevo-pase-creado', () => {
    cargarDatosGenerales(); // Usamos tu función principal
    mostrarToast("¡Nuevo pase solicitado!", "info");
});

socket.on('pase-actualizado', () => {
    cargarDatosGenerales(); 
});

socket.on('nuevo-permiso-creado', (data) => {
    console.log(data.msg);
    cargarDatosGenerales();
    mostrarToast("¡Nueva solicitud de Permiso recibida!", "info");
});

// Escuchar cuando algo cambia
socket.on('permiso-actualizado', () => {
    cargarDatosGenerales(); 
});

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

//funcion para ver si la sesion esta expirada
function manejarSesionExpirada() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

//aviso
document.body.insertAdjacentHTML('beforeend', `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1055;">
        <div id="toastRH" class="toast" role="alert"><div class="toast-header text-white" id="toast-header-rh"><strong class="me-auto">RRHH</strong></div>
        <div class="toast-body fw-bold" id="toast-msg-rh"></div></div>
    </div>`);

//funcion para mostrar aviso
function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastRH');
    const header = document.getElementById('toast-header-rh');
    document.getElementById('toast-msg-rh').textContent = mensaje;
    
    // Ajuste de colores: verde, rojo o azul (info)
    let claseFondo = 'bg-success';
    if (tipo === 'danger' || tipo === 'error') claseFondo = 'bg-danger';
    if (tipo === 'info') claseFondo = 'bg-info'; 

    header.className = `toast-header text-white ${claseFondo}`;
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

document.addEventListener('DOMContentLoaded', () => {
    modalDetalleRH = new bootstrap.Modal(document.getElementById('modalDetalleRH'));
    document.getElementById('saludo-rh').textContent = usuario.nombre_completo || "RRHH";
    
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = "login.html";
    });

    document.getElementById('offcanvasCalendario').addEventListener('shown.bs.offcanvas', () => {
        if (!calendarioRH) inicializarCalendarioRH();
        else calendarioRH.updateSize();
    });

    document.getElementById('btn-aplicar-filtros').addEventListener('click', aplicarFiltros);
    cargarDatosGenerales();
});

async function cargarDatosGenerales() {
    try {
        //consultas para ver pases y permisos de todos
        const [resPases, resPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } })
        ]);

        //se validan tokens
        if (resPases.status === 401 || resPermisos.status === 401) {
            manejarSesionExpirada();
            return;
        }
        const dataP = await resPases.json();
        const dataM = await resPermisos.json();
        
        const pases = dataP.data || [];
        const permisos = dataM.data || [];

        const mPases = pases.map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso }));
        const mPermisos = permisos.map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio }));

        registrosGlobales = [...mPases, ...mPermisos].sort((a, b) => new Date(b.fechaClave) - new Date(a.fechaClave));
        
        //actualizamos
        pintarTabla(registrosGlobales);

    } catch (e) { 
        console.error("Error en cargarDatosGenerales:", e);
        mostrarToast("Error de conexión", "error"); 
    }
}

//funcion para mostrar datos en tabla
function pintarTabla(datos) {
    const tbody = document.getElementById('tabla-general');
    tbody.innerHTML = '';
    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No hay resultados</td></tr>';
        return;
    }

    datos.forEach(reg => {
        const tr = document.createElement('tr');
        tr.onclick = () => verDetallesRRHH(reg);
        let bColor = reg.estado === 'Aprobado' ? 'bg-success' : (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger');
        
        //fecha formateada
        const fechaParaTabla = reg.fecha_uso_h || reg.fecha_inicio_h;

        tr.innerHTML = `
            <td class="fw-bold">#${reg.id}</td>
            <td><span class="badge bg-secondary">${reg.tipoTramite}</span></td>
            <td>${reg.nombre_completo}</td>
            <td>${fechaParaTabla}</td> 
            <td class="text-truncate" style="max-width: 150px;">${reg.motivo}</td>
            <td><span class="badge ${bColor}">${reg.estado}</span></td>`;
        tbody.appendChild(tr);
    });

    if (calendarioRH) {
        calendarioRH.removeAllEventSources();
        calendarioRH.addEventSource(generarEventos(datos));
    }
}

//funcion para iniciar calendario 
function inicializarCalendarioRH() {
    calendarioRH = new FullCalendar.Calendar(document.getElementById('calendario-rh'), {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
        events: generarEventos(registrosGlobales),
        eventClick: (info) => verDetallesRRHH(info.event.extendedProps)
    });
    calendarioRH.render();
}

//funcion para mostrar eventos en claendario
function generarEventos(datos) {
    return datos.map(reg => ({
        title: `${reg.nombre_completo}: ${reg.tipoTramite}`,
        start: reg.fechaClave.split('T')[0],
        backgroundColor: reg.estado === 'Aprobado' ? '#198754' : (reg.estado === 'Pendiente' ? '#ffc107' : '#dc3545'),
        extendedProps: { ...reg }
    }));
}

//funcion para ver detalles de un tramite
function verDetallesRRHH(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('det-rh-nombre').textContent = data.nombre_completo;
    document.getElementById('det-rh-motivo').textContent = data.motivo || 'Sin motivo';
    
    //fecha formateada
    document.getElementById('det-fecha-creacion').textContent = data.fecha_solicitud_h || 'N/A';
    
    const contHoras = document.getElementById('det-rh-cont-horas');
    const contFin = document.getElementById('det-rh-cont-fin');
    const contDias = document.getElementById('det-rh-cont-dias');

    if (esPase) {
        document.getElementById('det-rh-label-fecha').textContent = "Fecha Uso";
        // --- Usamos fecha humana ---
        document.getElementById('det-rh-fecha').textContent = data.fecha_uso_h;
        contHoras.style.display = 'block'; contFin.style.display = 'none'; contDias.style.display = 'none';
        document.getElementById('det-rh-horas').textContent = `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else {
        document.getElementById('det-rh-label-fecha').textContent = "Fecha Inicio";
        // --- Usamos fechas humanas ---
        document.getElementById('det-rh-fecha').textContent = data.fecha_inicio_h;
        contHoras.style.display = 'none'; contFin.style.display = 'block'; contDias.style.display = 'block';
        document.getElementById('det-rh-fecha-fin').textContent = data.fecha_fin_h;
        document.getElementById('det-rh-dias').textContent = `${data.cantidad_dias} día(s) hábiles`;
    }

    document.getElementById('det-rh-tipo-badge').className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    document.getElementById('det-rh-tipo-badge').textContent = data.tipoTramite;
    const est = document.getElementById('det-rh-estado-badge');
    est.textContent = data.estado;
    est.className = `badge fs-6 ${data.estado === 'Aprobado' ? 'bg-success' : (data.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger')}`;
    modalDetalleRH.show();
}

//funcion para aplicar filtros
function aplicarFiltros() {
    const fDoc = document.getElementById('filtro-docente').value.toLowerCase();
    const fEst = document.getElementById('filtro-estado').value;
    const fTip = document.getElementById('filtro-tipo').value;
    const fMes = document.getElementById('filtro-mes').value;
    const fAño = document.getElementById('filtro-año').value;

    const res = registrosGlobales.filter(r => {
        const f = new Date(r.fechaClave);
        if (fDoc && !r.nombre_completo.toLowerCase().includes(fDoc)) return false;
        if (fEst !== 'Todos' && r.estado !== fEst) return false;
        if (fTip !== 'Ambos' && r.tipoTramite !== fTip) return false;
        if (fMes && (f.getMonth() + 1).toString().padStart(2, '0') !== fMes) return false;
        if (fAño && f.getFullYear().toString() !== fAño) return false;
        return true;
    });
    pintarTabla(res);
}

//cambiar password
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

function ordenarRapido(criterio) {
    if (!registrosGlobales.length) return;
    
    let copia = [...registrosGlobales];

    switch (criterio) {
        case 'reciente':
            //ordenar de mayor a menor id
            copia.sort((a, b) => b.id - a.id);
            break;
        case 'nombre':
            //ordenar alfabeticamente
            copia.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
            break;
        case 'tipo':
            //pases y permisos
            copia.sort((a, b) => a.tipoTramite.localeCompare(b.tipoTramite));
            break;
    }

    pintarTabla(copia);
}

//funcion para filtrar
function filtrarRapido(valor) {
    if (!registrosGlobales.length) return;

    let filtrados = [];

    if (valor === 'Todos') {
        filtrados = registrosGlobales;
    } else if (valor === 'Pendiente') {
        //filtrar pendientes
        filtrados = registrosGlobales.filter(r => r.estado === 'Pendiente');
    } else {
        //filtrar pases o permisos
        filtrados = registrosGlobales.filter(r => r.tipoTramite === valor);
    }

    pintarTabla(filtrados);
}