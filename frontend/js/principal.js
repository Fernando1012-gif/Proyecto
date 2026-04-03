//url api
const URL_BASE = 'http://localhost:3000/api';
let calendarioOficial;
let modalInstancia;                
let modalDetalleDocenteInstancia;  
let todosLosRegistrosGlobal = []; 
let editandoId = null;           
let modalConfirmacionInstancia;
let datosPendientes = null; 
let urlPendiente = null;
let metodoPendiente = null;

const token = sessionStorage.getItem('token');
const usuarioStr = sessionStorage.getItem('usuario');

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

//funcion para redireccionar si la sesion esta expirada
function manejarSesionExpirada() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', () => {
    modalInstancia = new bootstrap.Modal(document.getElementById('modalSolicitud'));
    modalDetalleDocenteInstancia = new bootstrap.Modal(document.getElementById('modalDetalleDocente'));
    document.getElementById('saludo-profesor').textContent = usuario.nombre_completo || "Docente";
    modalConfirmacionInstancia = new bootstrap.Modal(document.getElementById('modalConfirmacion'));

    //se añaden los datos a los selectores de hora inicio y fin
    const hInicioSelect = document.getElementById('hora_inicio');
    const hFinSelect = document.getElementById('hora_fin');
    //se validan solamente ciertas horas especificas, dentro del horario laboral
    if (hInicioSelect && hFinSelect) {
        hInicioSelect.innerHTML = '';
        hFinSelect.innerHTML = '';
        //horas de horario laboral
        for (let i = 7; i <= 20; i++) {
            const horaFmt = i < 10 ? `0${i}:00` : `${i}:00`;
            const opcion = `<option value="${horaFmt}">${horaFmt}</option>`;
            hInicioSelect.innerHTML += opcion;
            hFinSelect.innerHTML += opcion;
        }
        hInicioSelect.addEventListener('change', actualizarLimitesHoraFin);
        //se ejecuta la funcion para definir las horas
        actualizarLimitesHoraFin();
    }

    const inputDias = document.getElementById('cantidad_dias');
    if (inputDias) {
        inputDias.readOnly = true; 
        //leemos cuando se cambie la fecha de inicio para establecer los limites de la fecha fin
        document.getElementById('fecha_inicio').addEventListener('change', () => {
            //se ejecuta la funcion fecha fin para solo permitir 3 dias como maximo
            actualizarLimitesFechaFin();
            //se ejecuta la funcion de dias permiso para informar automaticamentela cantida de dias
            calcularDiasPermiso();
        });
        document.getElementById('fecha_fin').addEventListener('change', calcularDiasPermiso);
    }
    //salir de la sesion
    document.getElementById('btn-logout').addEventListener('click', manejarSesionExpirada);

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
//avisos emergentess
function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    document.getElementById('toast-mensaje').textContent = mensaje;
    toastHeader.className = `toast-header text-white ${tipo === 'success' ? 'bg-success' : 'bg-danger'}`;
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
//funcion para calcular la cantidad de dias solicitados
function calcularDiasPermiso() {
    const fechaInicioStr = document.getElementById('fecha_inicio').value;
    const fechaFinStr = document.getElementById('fecha_fin').value;
    const inputDias = document.getElementById('cantidad_dias');
    const btnSubmit = document.querySelector('#form-pedir-permiso button[type="submit"]');

    if (!fechaInicioStr || !fechaFinStr) return;
    let f1 = new Date(fechaInicioStr + 'T00:00:00');
    let f2 = new Date(fechaFinStr + 'T00:00:00');

    if (f2 < f1) {
        mostrarToast("Fecha incorrecta", "error");
        inputDias.value = 0;
        if (btnSubmit) btnSubmit.disabled = true;
        return;
    }

    let diasHabiles = 0;
    let fechaAux = new Date(f1);
    while (fechaAux <= f2) {
        if (fechaAux.getDay() !== 0 && fechaAux.getDay() !== 6) diasHabiles++;
        fechaAux.setDate(fechaAux.getDate() + 1);
    }

    inputDias.value = diasHabiles;
    btnSubmit.disabled = (diasHabiles > 3 || diasHabiles <= 0);
    if (diasHabiles > 3) {
        mostrarToast("Maximo 3 dias permitidos", "error");
        inputDias.classList.add('is-invalid');
    } else {
        inputDias.classList.remove('is-invalid');
    }
}
//funcion para ver los detalles de una solicitud
function verDetallesSolicitud(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('v-det-tipo').textContent = data.tipoTramite;
    document.getElementById('v-det-motivo').textContent = data.motivo || 'Sin motivo';
    
    const labelFecha = document.getElementById('v-label-fecha');
    if (esPase) {
        labelFecha.textContent = "Fecha de Uso";
        document.getElementById('v-det-fecha').textContent = data.fecha_uso_h;
        document.getElementById('v-cont-horas').style.display = 'block';
        document.getElementById('v-cont-fin').style.display = 'none';
        document.getElementById('v-cont-dias').style.display = 'none';
        document.getElementById('v-det-horas').textContent = `${data.hora_inicio.substring(0,5)} - ${data.hora_fin.substring(0,5)}`;
    } else {
        labelFecha.textContent = "Fecha Inicio";
        document.getElementById('v-det-fecha').textContent = data.fecha_inicio_h;
        document.getElementById('v-cont-horas').style.display = 'none';
        document.getElementById('v-cont-fin').style.display = 'block';
        document.getElementById('v-cont-dias').style.display = 'block';
        document.getElementById('v-det-fecha-fin').textContent = data.fecha_fin_h;
        document.getElementById('v-det-dias').textContent = `${data.cantidad_dias} día(s)`;
    }

    document.getElementById('v-det-tipo-badge').className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    document.getElementById('v-det-estado-badge').textContent = data.estado;
    modalDetalleDocenteInstancia.show();
}

//consultamos api para cargar los datos de pases y permisos del usuario
async function cargarDatosYActualizarCalendario() {
    try {
        const [resPases, resPermisos] = await Promise.all([
            fetch(`${URL_BASE}/pases/ver`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/ver`, { headers: { 'x-token': token } })
        ]);
        //si el codigo de error es 401 obtenemos un redireccionamiento al login
        if (resPases.status === 401 || resPermisos.status === 401) {
            manejarSesionExpirada();
            return;
        }
        const dataPases = await resPases.json();
        const dataPermisos = await resPermisos.json();
        //si todo sale bien:
        if (dataPases.ok && dataPermisos.ok) {
            const pasesM = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso }));
            const permisosM = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio }));
            
            todosLosRegistrosGlobal = [...pasesM, ...permisosM];

            const eventos = todosLosRegistrosGlobal.map(reg => ({
                title: `${reg.tipoTramite}: ${reg.estado}`,
                start: reg.fechaClave.split('T')[0], 
                backgroundColor: reg.estado === 'Aprobado' ? '#198754' : (reg.estado === 'Pendiente' ? '#ffc107' : '#dc3545'),
                extendedProps: { ...reg }
            }));

            pintarHistorial(todosLosRegistrosGlobal);
            calendarioOficial.removeAllEventSources();
            calendarioOficial.addEventSource(eventos);
        }
    } catch (e) { 
        console.error("Error de sincronizacion:", e);
        mostrarToast("Error de sincronizacion", "error"); 
    }
}
//funcion para pintar el calendario con los datos del usuario
function pintarCalendario(eventos) {
    calendarioOficial = new FullCalendar.Calendar(document.getElementById('calendario'), {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        events: eventos,
        dateClick: (info) => {
            if (info.date.getDay() === 0 || info.date.getDay() === 6) return mostrarToast("Fin de semana", "warning");
            volverPaso1();
            document.getElementById('fecha_uso').value = info.dateStr;
            document.getElementById('fecha_inicio').value = info.dateStr;
            actualizarLimitesFechaFin();
            document.getElementById('fecha_fin').value = info.dateStr;
            calcularDiasPermiso();
            modalInstancia.show();
        },
        eventClick: (info) => verDetallesSolicitud(info.event.extendedProps)
    });
    calendarioOficial.render();
}

//funcion para ver el historial del usaario
function pintarHistorial(registros) {
    const contenedor = document.getElementById('historial-lista');
    contenedor.innerHTML = '';
    [...registros].sort((a, b) => b.id - a.id).slice(0, 59).forEach(reg => {
        const fechaParaMostrar = reg.fecha_uso_h || reg.fecha_inicio_h;
        
        //colores
        let borderClass = 'border-secondary';
        if (reg.estado === 'Aprobado') borderClass = 'border-success';
        else if (reg.estado === 'Pendiente') borderClass = 'border-warning';
        else if (reg.estado === 'Rechazado' || reg.estado === 'Cancelado') borderClass = 'border-danger';

        const div = document.createElement('div');
        div.className = `card mb-2 shadow-sm border-0 border-start border-4 ${borderClass}`;
        div.style.cursor = 'pointer';
        div.onclick = () => verDetallesSolicitud(reg);
        
        //si el motivo viene vacio:
        const textoMotivo = reg.motivo || 'Sin motivo especificado';

        div.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold small text-truncate pe-2" style="max-width: 65%;" title="${textoMotivo}">${textoMotivo}</span>
                    <span class="text-muted text-end" style="font-size: 0.75rem; min-width: 75px;">${fechaParaMostrar}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1">
                    <div class="d-flex gap-1 align-items-center">
                        <span class="badge ${reg.estado === 'Aprobado' ? 'bg-success' : (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger')}" style="font-size: 0.65rem;">${reg.estado}</span>
                        <span class="badge bg-light text-dark border" style="font-size: 0.80rem;">${reg.tipoTramite}</span>
                    </div>
                    ${reg.estado === 'Pendiente' ? `
                        <div class="btn-group" onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-outline-primary p-1" style="line-height: 1;" onclick="prepararEdicion('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-pen" style="font-size: 0.7rem;"></i></button>
                            <button class="btn btn-sm btn-outline-danger p-1" style="line-height: 1;" onclick="cancelarSolicitud('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-trash" style="font-size: 0.7rem;"></i></button>
                        </div>
                    ` : ''}
                </div>
            </div>`;
        contenedor.appendChild(div);
    });
}

//funcion para editar el tramite
function prepararEdicion(tipo, id) {
    const reg = todosLosRegistrosGlobal.find(r => r.id === id && r.tipoTramite === tipo);
    editandoId = id;
    document.getElementById('step-1-choice').style.display = 'none';
    if (tipo === 'Pase') {
        document.getElementById('form-pedir-pase').style.display = 'block';
        document.getElementById('fecha_uso').value = reg.fecha_uso.split('T')[0];
        document.getElementById('hora_inicio').value = reg.hora_inicio.substring(0, 5);
        document.getElementById('hora_fin').value = reg.hora_fin.substring(0, 5);
        document.getElementById('motivo_pase').value = reg.motivo;
    } else {
        document.getElementById('form-pedir-permiso').style.display = 'block';
        document.getElementById('tipo_permiso').value = reg.tipo_permiso;
        document.getElementById('fecha_inicio').value = reg.fecha_inicio.split('T')[0];
        document.getElementById('fecha_fin').value = reg.fecha_fin.split('T')[0];
        document.getElementById('cantidad_dias').value = reg.cantidad_dias;
        document.getElementById('motivo').value = reg.motivo;
        actualizarLimitesFechaFin();
    }
    modalInstancia.show();
}
//funcion para cancelar un tramite si aun no esta aprobado o rechazado
async function cancelarSolicitud(tipo, id) {
    if (!confirm(`¿Cancelar #${id}?`)) return;
    const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';
    try {
        const resp = await fetch(`${URL_BASE}/${endpoint}/cancelar`, {
            method: 'PATCH',
            headers: { 'x-token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, cancelar: "Cancelado" })
        });
        if ((await resp.json()).ok) { mostrarToast("Cancelada"); cargarDatosYActualizarCalendario(); }
    } catch (e) { mostrarToast("Error de red", "error"); }
}

//confirmacion de pases
document.getElementById('form-pedir-pase').addEventListener('submit', (e) => {
    e.preventDefault();
    const hInicio = document.getElementById('hora_inicio').value;
    const hFin = document.getElementById('hora_fin').value;
    const fechaUso = document.getElementById('fecha_uso').value;
    const motivo = document.getElementById('motivo_pase').value;

    if (hFin <= hInicio) return mostrarToast("La hora de salida debe ser mayor a la de entrada", "error");

    //tenemos la informacion temporalmente
    datosPendientes = { fecha_uso: fechaUso, hora_inicio: hInicio, hora_fin: hFin, motivo: motivo, id: editandoId };
    urlPendiente = editandoId ? `${URL_BASE}/pases/mod` : `${URL_BASE}/pases/crear`;
    metodoPendiente = editandoId ? 'PATCH' : 'POST';

    //generamos los datos para preguntar la confirmacion
    document.getElementById('conf-resumen').innerHTML = `
        <strong>Trámite:</strong> Pase de Salida <br>
        <strong>Fecha de Uso:</strong> <span class="text-primary">${fechaUso}</span> <br>
        <strong>Horario:</strong> ${hInicio} a ${hFin} <br>
        <strong>Motivo:</strong> <span class="text-muted fst-italic">${motivo}</span>
    `;
    
    //mostramos la confirmacion
    modalConfirmacionInstancia.show();
});

//confirmacion de permisos
document.getElementById('form-pedir-permiso').addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo_permiso').value;
    const fechaI = document.getElementById('fecha_inicio').value;
    const fechaF = document.getElementById('fecha_fin').value;
    const dias = document.getElementById('cantidad_dias').value;
    const motivo = document.getElementById('motivo').value;

    //guardamos la informacion temporalmente
    datosPendientes = { tipo_permiso: tipo, fecha_inicio: fechaI, fecha_fin: fechaF, cantidad_dias: dias, motivo: motivo, id: editandoId };
    urlPendiente = editandoId ? `${URL_BASE}/permisos/mod` : `${URL_BASE}/permisos/crear`;
    metodoPendiente = editandoId ? 'PATCH' : 'POST';

    //genramos los datos para la pregunta de confirmacion
    document.getElementById('conf-resumen').innerHTML = `
        <strong>Trámite:</strong> Permiso de Inasistencia <br>
        <strong>Tipo:</strong> ${tipo} <br>
        <strong>Periodo:</strong> <span class="text-primary">${fechaI}</span> al <span class="text-primary">${fechaF}</span> <br>
        <strong>Total Días:</strong> ${dias} <br>
        <strong>Motivo:</strong> <span class="text-muted fst-italic">${motivo}</span>
    `;
    modalConfirmacionInstancia.show();
});

const formPassDocente = document.getElementById('form-cambiar-pass');
if (formPassDocente) {
    formPassDocente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('pass-actual').value;
        const npassword = document.getElementById('pass-nueva').value;
        try {
            const resp = await fetch(`${URL_BASE}/login/npassword`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-token': token }, body: JSON.stringify({ password, npassword }) });
            if ((await resp.json()).ok) { mostrarToast("Cambiado"); bootstrap.Modal.getInstance(document.getElementById('modalCambiarPass')).hide(); formPassDocente.reset(); }
        } catch (error) { mostrarToast("Error", "error"); }
    });
document.getElementById('btn-confirmar-envio').addEventListener('click', async () => {
    const btn = document.getElementById('btn-confirmar-envio');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
        const resp = await fetch(urlPendiente, { 
            method: metodoPendiente, 
            headers: { 'Content-Type': 'application/json', 'x-token': token }, 
            body: JSON.stringify(datosPendientes) 
        });
        
        const resultado = await resp.json();

        modalConfirmacionInstancia.hide();

        if (resultado.ok) { 
            modalInstancia.hide();
            volverPaso1(); 
            cargarDatosYActualizarCalendario(); 
            mostrarToast(metodoPendiente === 'PATCH' ? "Modificación exitosa" : "Solicitud enviada correctamente", "success");
        } else {
            mostrarToast(resultado.msg, "error");
        }
    } catch (e) { 
        modalConfirmacionInstancia.hide();
        mostrarToast("Error de conexion con el server", "error"); 
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar y Enviar';
    }
});
}

//funcion para  determinar las horas de inicio y fin
function actualizarLimitesHoraFin() {
    const hInicioSelect = document.getElementById('hora_inicio');
    const hFinSelect = document.getElementById('hora_fin');
    
    if (!hInicioSelect || !hFinSelect || !hInicioSelect.value) return;

    //hora de inicio a numero
    const horaInicioNum = parseInt(hInicioSelect.value.split(':')[0], 10);

    Array.from(hFinSelect.options).forEach(opcion => {
        const horaFinNum = parseInt(opcion.value.split(':')[0], 10);

        if (horaFinNum <= horaInicioNum || horaFinNum > horaInicioNum + 3) {
            opcion.disabled = true;          
            opcion.style.color = '#ccc';     
            opcion.style.backgroundColor = '#f8f9fa'; 
        } else {
            opcion.disabled = false;       
            opcion.style.color = '';
            opcion.style.backgroundColor = '';
        }
    });

    const horaFinActual = parseInt(hFinSelect.value.split(':')[0], 10);
    if (horaFinActual <= horaInicioNum || horaFinActual > horaInicioNum + 3) {
        let nuevaHoraFin = horaInicioNum + 1;
        if (nuevaHoraFin > 20) nuevaHoraFin = 20;
        const nuevaHoraFmt = nuevaHoraFin < 10 ? `0${nuevaHoraFin}:00` : `${nuevaHoraFin}:00`;
        hFinSelect.value = nuevaHoraFmt;
    }
}

//funcion para limitar la seleccion de fechas de acuerdo a lo que selecciona el usuario
function actualizarLimitesFechaFin() {
    const inputInicio = document.getElementById('fecha_inicio');
    const inputFin = document.getElementById('fecha_fin');

    if (!inputInicio || !inputFin || !inputInicio.value) return;

    inputFin.min = inputInicio.value;

    //maximo 3 dias habiles
    let fechaMax = new Date(inputInicio.value + 'T00:00:00');
    let diasHabiles = 1;

    if (fechaMax.getDay() === 0 || fechaMax.getDay() === 6) {
        diasHabiles = 0; 
    }

    while (diasHabiles < 3) {
        fechaMax.setDate(fechaMax.getDate() + 1);
        //si no es fin de semana cuenta como dia habil
        if (fechaMax.getDay() !== 0 && fechaMax.getDay() !== 6) {
            diasHabiles++;
        }
    }

    //formateamos la fecha dia mes año
    const año = fechaMax.getFullYear();
    const mes = String(fechaMax.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaMax.getDate()).padStart(2, '0');
    const maxStr = `${año}-${mes}-${dia}`;

    //limite al calendario 
    inputFin.max = maxStr;

    if (inputFin.value > maxStr || inputFin.value < inputInicio.value) {
        inputFin.value = inputInicio.value;
        calcularDiasPermiso();
    }
}