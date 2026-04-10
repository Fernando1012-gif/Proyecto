//url api
const URL_BASE = 'http://localhost:3000/api';
const socket = io('http://localhost:3000');
let calendarioOficial;
let modalInstancia;
let modalDetalleDocenteInstancia;
let todosLosRegistrosGlobal = [];
let editandoId = null;
let modalConfirmacionInstancia;
let datosPendientes = null;
let urlPendiente = null;
let metodoPendiente = null;
let festivosGlobales = []; //

const token = sessionStorage.getItem('token');
const usuarioStr = sessionStorage.getItem('usuario');

// CONFIGURACIÓN DE SOCKETS PARA TIEMPO REAL
socket.on('pase-actualizado', (data) => {
    cargarDatosYActualizarCalendario();
    mostrarToast("¡Tu solicitud de Pase ha sido actualizada!", "info");
});

socket.on('permiso-actualizado', (data) => {
    cargarDatosYActualizarCalendario();
    mostrarToast("¡Tu solicitud de Permiso ha sido actualizada!", "info");
});

if (!token || !usuarioStr) window.location.href = "login.html";
const usuario = JSON.parse(usuarioStr);

function manejarSesionExpirada() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

function parseLocal(dateStr) {
    const partes = dateStr.split('-');
    return new Date(partes[0], partes[1] - 1, partes[2]);
}

function actualizarBadges(registros) {
    let aprobados = 0, pendientes = 0, rechazados = 0;
    registros.forEach(reg => {
        if (reg.estado === 'Aprobado') aprobados++;
        else if (reg.estado === 'Pendiente') pendientes++;
        else if (reg.estado === 'Rechazado') rechazados++;
    });

    const bAprobados = document.getElementById('badge-aprobados');
    const bPendientes = document.getElementById('badge-pendientes');
    const bRechazados = document.getElementById('badge-rechazados');

    if (bAprobados) bAprobados.textContent = aprobados;
    if (bPendientes) bPendientes.textContent = pendientes;
    if (bRechazados) bRechazados.textContent = rechazados;
}

document.addEventListener('DOMContentLoaded', () => {
    modalInstancia = new bootstrap.Modal(document.getElementById('modalSolicitud'));
    modalDetalleDocenteInstancia = new bootstrap.Modal(document.getElementById('modalDetalleDocente'));
    document.getElementById('saludo-profesor').textContent = usuario.nombre_completo || "Docente";
    modalConfirmacionInstancia = new bootstrap.Modal(document.getElementById('modalConfirmacion'));
    modalPerfilInstancia = new bootstrap.Modal(document.getElementById('modalPerfil'));
    document.getElementById('link-perfil').addEventListener('click', (e) => {
        e.preventDefault();
        abrirPerfil(false);
    });

    inicializarMotorPDF();

    document.getElementById('link-seguridad').addEventListener('click', (e) => {
        e.preventDefault();
        abrirPerfil(true);
    });
    document.getElementById('form-cambiar-pass').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('pass-actual').value;
        const npassword = document.getElementById('pass-nueva').value;
        try {
            const resp = await fetch(`${URL_BASE}/login/npassword`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-token': token
                },
                body: JSON.stringify({ password, npassword })
            });

            const res = await resp.json();

            if (res.ok) {
                // Si todo sale bien, avisamos y cerramos
                mostrarToast(res.msg);
                e.target.reset(); // Limpiamos los campos
                modalPerfilInstancia.hide(); // Cerramos el modal de golpe
            } else {
                // Si la contraseña actual no coincide o algo falla
                mostrarToast(res.msg, "error");
            }
        } catch (error) {
            // Por si se cae el servidor o no hay internet
            mostrarToast("Error de conexión con el servidor", "error");
        }
    });
    const hoy = new Date().toISOString().split('T')[0];

    // Aplicamos el límite a los inputs de fecha
    const inputFechaPase = document.getElementById('fecha_uso'); 
    const inputFechaInicio = document.getElementById('fecha_inicio'); 

    if (inputFechaPase) inputFechaPase.setAttribute('min', hoy);
    if (inputFechaInicio) inputFechaInicio.setAttribute('min', hoy);


    document.getElementById('modalSolicitud').addEventListener('hidden.bs.modal', volverPaso1);

    const hInicioSelect = document.getElementById('hora_inicio');
    const hFinSelect = document.getElementById('hora_fin');
    if (hInicioSelect && hFinSelect) {
        hInicioSelect.innerHTML = '';
        hFinSelect.innerHTML = '';
        for (let i = 7; i <= 20; i++) {
            const horaFmt = i < 10 ? `0${i}:00` : `${i}:00`;
            const opcion = `<option value="${horaFmt}">${horaFmt}</option>`;
            hInicioSelect.innerHTML += opcion;
            hFinSelect.innerHTML += opcion;
        }
        hInicioSelect.addEventListener('change', actualizarLimitesHoraFin);
        actualizarLimitesHoraFin();
    }

    const inputDias = document.getElementById('cantidad_dias');
    if (inputDias) {
        inputDias.readOnly = true;
        document.getElementById('fecha_inicio').addEventListener('change', () => {
            actualizarLimitesFechaFin();
            calcularDiasPermiso();
        });
        document.getElementById('fecha_fin').addEventListener('change', calcularDiasPermiso);
    }

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

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    document.getElementById('toast-mensaje').textContent = mensaje;
    let claseFondo = tipo === 'info' ? 'bg-info' : (tipo === 'error' || tipo === 'danger' ? 'bg-danger' : 'bg-success');
    toastHeader.className = `toast-header text-white ${claseFondo}`;
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

function calcularDiasPermiso() {
    const fechaInicioStr = document.getElementById('fecha_inicio').value;
    const fechaFinStr = document.getElementById('fecha_fin').value;
    const inputDias = document.getElementById('cantidad_dias');
    const btnSubmit = document.querySelector('#form-pedir-permiso button[type="submit"]');

    if (!fechaInicioStr || !fechaFinStr) return;

    let f1 = parseLocal(fechaInicioStr);
    let f2 = parseLocal(fechaFinStr);

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

function verDetallesSolicitud(data) {
    const esPase = data.tipoTramite === 'Pase';
    document.getElementById('v-det-tipo').textContent = data.tipoTramite;
    document.getElementById('v-det-motivo').textContent = data.motivo || 'Sin motivo';

    // SECCIÓN DE AUDITORÍA: Muestra quién aprobó/rechazó y cuándo
    const contRev = document.getElementById('v-cont-revision');
    if (data.estado !== 'Pendiente' && data.revisado_por_nombre) {
        contRev.style.display = 'block';
        document.getElementById('v-det-revisado-por').textContent = data.revisado_por_nombre;
        
        const f = new Date(data.fecha_revision);
        document.getElementById('v-det-fecha-revision').textContent = 
            `${f.toLocaleDateString()} a las ${f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hrs`;
    } else {
        contRev.style.display = 'none';
    }

    const labelFecha = document.getElementById('v-label-fecha');
    if (esPase) {
        labelFecha.textContent = "Fecha de Uso";
        document.getElementById('v-det-fecha').textContent = data.fecha_uso_h;
        document.getElementById('v-cont-horas').style.display = 'block';
        document.getElementById('v-cont-fin').style.display = 'none';
        document.getElementById('v-cont-dias').style.display = 'none';
        document.getElementById('v-det-horas').textContent = `${data.hora_inicio.substring(0, 5)} - ${data.hora_fin.substring(0, 5)}`;
    } else {
        labelFecha.textContent = "Fecha Inicio";
        document.getElementById('v-det-fecha').textContent = data.fecha_inicio_h;
        document.getElementById('v-cont-horas').style.display = 'none';
        document.getElementById('v-cont-fin').style.display = 'block';
        document.getElementById('v-cont-dias').style.display = 'block';
        document.getElementById('v-det-fecha-fin').textContent = data.fecha_fin_h;
        document.getElementById('v-det-dias').textContent = `${data.cantidad_dias} día(s)`;
    }

    const btnPDF = document.getElementById('btn-descargar-pdf');
    if (btnPDF) {
        if (data.estado === 'Aprobado') {
            btnPDF.style.display = 'block';
            btnPDF.onclick = () => {
                if (data.tipoTramite === 'Pase') {
                    pdfPase(data, usuario); 
                } else {
                    pdfPermiso(data, usuario);
                }
            };
        } else {
            btnPDF.style.display = 'none';
        }
    }


    document.getElementById('v-det-tipo-badge').className = `badge rounded-pill px-3 py-2 ${esPase ? 'bg-info text-dark' : 'bg-primary'}`;
    const badgeEstado = document.getElementById('v-det-estado-badge');
    badgeEstado.textContent = data.estado;
    
    const colorEstado = data.estado === 'Aprobado' ? 'bg-success' : 
                   (data.estado === 'Vo.Bo.' ? 'bg-info text-white' : 
                   (data.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger'));

    badgeEstado.className = `badge fs-6 ${colorEstado}`;
    
    modalDetalleDocenteInstancia.show();
}

async function cargarDatosYActualizarCalendario() {
    try {
        const [resPases, resPermisos, resFest] = await Promise.all([
            fetch(`${URL_BASE}/pases/ver`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/permisos/ver`, { headers: { 'x-token': token } }),
            fetch(`${URL_BASE}/dias/ver`, { headers: { 'x-token': token } })
        ]);

        if (resPases.status === 401 || resPermisos.status === 401) return manejarSesionExpirada();

        const dataPases = await resPases.json();
        const dataPermisos = await resPermisos.json();
        festivosGlobales = await resFest.json();

        if (dataPases.ok && dataPermisos.ok) {
            const pasesM = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso }));
            const permisosM = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio }));
            todosLosRegistrosGlobal = [...pasesM, ...permisosM];

            const eventosTramites = todosLosRegistrosGlobal.map(reg => ({
                title: `${reg.tipoTramite}: ${reg.estado}`,
                start: reg.fechaClave.split('T')[0],
                backgroundColor: reg.estado === 'Aprobado' ? '#198754' : 
                    (reg.estado === 'Vo.Bo.' ? '#02c4ff' :
                    (reg.estado === 'Pendiente' ? '#ffc107' : '#dc3545')),
                    borderColor: 'transparent',
                extendedProps: { ...reg }
            }));

            const eventosFestivos = festivosGlobales.map(f => ({
                title: ` ${f.descripcion}`,
                start: f.fecha.split('T')[0],
                display: 'background',
                backgroundColor: 'rgba(25, 135, 84, 0.2)',
                extendedProps: { esBloqueado: true, msg: f.descripcion }
            }));

            const cumpleMesDia = usuario.fecha_nacimiento.substring(5, 10);
            const añoActual = new Date().getFullYear();
            const eventoCumple = {
                title: "Cumpleaños",
                start: `${añoActual}-${cumpleMesDia}`,
                backgroundColor: '#ffc107',
                borderColor: '#ffc107',
                allDay: true,
                extendedProps: { esBloqueado: true, msg: "tu cumpleaños" }
            };

            pintarHistorial(todosLosRegistrosGlobal);
            actualizarBadges(todosLosRegistrosGlobal);
            calendarioOficial.removeAllEventSources();
            calendarioOficial.addEventSource(eventosTramites);
            calendarioOficial.addEventSource(eventosFestivos);
            calendarioOficial.addEventSource([eventoCumple]);
        }
    } catch (e) { mostrarToast("Error de sincronizacion", "error"); }
}

function pintarCalendario(eventos) {
    if (calendarioOficial) calendarioOficial.destroy();

    calendarioOficial = new FullCalendar.Calendar(document.getElementById('calendario'), {
        initialView: 'dayGridMonth', locale: 'es', height: '100%',
        events: eventos,
        buttonText: {
            today: 'Hoy',
            month: 'mes',
            week: 'semana',
            day: 'día',
            list: 'agenda'
        },

        
        dayCellClassNames: (arg) => {
            const fechaCelda = arg.date.toISOString().split('T')[0];
            const cumpleMesDia = usuario.fecha_nacimiento.substring(5, 10);
            
            // 1. Fines de semana (fondo gris claro)
            if (arg.date.getDay() === 0 || arg.date.getDay() === 6) return ['bg-light'];
            
            // 2. Comprobaciones de la UTM
            const esFestivo = festivosGlobales.some(f => f.fecha.split('T')[0] === fechaCelda);
            const esCumple = fechaCelda.substring(5, 10) === cumpleMesDia;
            
            // 3. NUEVO: Comprobamos si el día ya está ocupado por un trámite (Pase o rango de Permiso)
            const diaOcupado = verificarDias(fechaCelda);

            // Si es festivo, cumple, o ya tiene trámite, le ponemos la clase que lo sombrea y bloquea el cursor
            if (esFestivo || esCumple || diaOcupado) {
                return ['dia-bloqueado'];
            }
            
            return [];
        },

        
        dateClick: (info) => {
            const hoyCheck = new Date();
            hoyCheck.setHours(0, 0, 0, 0);
            const fechaClick = new Date(info.dateStr + 'T00:00:00');
            
            // Si es pasado, no dejes que abra el modal
            if (fechaClick < hoyCheck) {
                mostrarToast("No puedes solicitar días pasados", "error");
                return;
            }
            
            // Si el día tiene la clase de bloqueo (Fines de semana, festivos, cumple u ocupado)
            if (info.dayEl.classList.contains('dia-bloqueado') || info.date.getDay() === 0 || info.date.getDay() === 6) {
                
                // Revisamos por qué está bloqueado para mandar el mensaje correcto
                if (verificarDias(info.dateStr)) {
                    mostrarToast("Ya tienes un trámite activo para este día", "error"); // Bloqueo por trámite
                } else {
                    const esCumple = info.dateStr.substring(5, 10) === usuario.fecha_nacimiento.substring(5, 10);
                    mostrarToast(esCumple ? "Feliz cumpleaños!!!" : "No hay labores este día", "info"); // Bloqueo por calendario
                }
                return;
            }

            volverPaso1();
            document.getElementById('fecha_uso').value = info.dateStr;
            document.getElementById('fecha_inicio').value = info.dateStr;
            actualizarLimitesFechaFin();
            document.getElementById('fecha_fin').value = info.dateStr;
            calcularDiasPermiso();
            modalInstancia.show();
        },

        eventClick: (info) => {
            if (info.event.extendedProps.esBloqueado) return;
            verDetallesSolicitud(info.event.extendedProps);
        }
    });
    calendarioOficial.render();
}
function pintarHistorial(registros) {

    const contenedor = document.getElementById('historial-lista');
    contenedor.innerHTML = '';



    [...registros].sort((a, b) => {
        const prioridad = { 'Pendiente': 1, 'Vo.Bo.': 2, 'Aprobado': 3, 'Rechazado': 4, 'Cancelado': 5 };
        const pA = prioridad[a.estado] || 99;
        const pB = prioridad[b.estado] || 99;

        if (pA !== pB) return pA - pB; // Primero por estado
        return b.id - a.id; // Luego por ID más reciente
    
    }).slice(0, 59).forEach(reg => {
        const fechaParaMostrar = reg.fecha_uso_h || reg.fecha_inicio_h;
        // principal.js
        let borderClass = reg.estado === 'Aprobado' ? 'border-success' : (reg.estado === 'Vo.Bo.' ? 'border-info' : 
            (reg.estado === 'Pendiente' ? 'border-warning' : 'border-danger'));
        const div = document.createElement('div');
        div.className = `card mb-2 shadow-sm border-0 border-start border-4 ${borderClass}`;
        div.style.cursor = 'pointer';
        div.onclick = () => verDetallesSolicitud(reg);
        div.innerHTML = `
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="fw-bold small text-truncate pe-2" style="max-width: 65%;">${reg.motivo || 'Sin motivo'}</span>
                    <span class="text-muted" style="font-size: 0.75rem;">${fechaParaMostrar}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1">
                    <span class="badge ${
                        reg.estado === 'Aprobado' ? 'bg-success' : 
                        (reg.estado === 'Vo.Bo.' ? 'bg-info text-white' : 
                        (reg.estado === 'Pendiente' ? 'bg-warning text-dark' : 'bg-danger'))
                        }" style="font-size: 0.65rem;">${reg.estado}
                    </span>
                    ${reg.estado === 'Pendiente' ? `
                        <div class="btn-group" onclick="event.stopPropagation()">
                            <button class="btn btn-sm btn-outline-primary p-1" onclick="prepararEdicion('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-pen" style="font-size: 0.7rem;"></i></button>
                            <button class="btn btn-sm btn-outline-danger p-1" onclick="cancelarSolicitud('${reg.tipoTramite}', ${reg.id})"><i class="fa-solid fa-trash" style="font-size: 0.7rem;"></i></button>
                        </div>` : ''}
                </div>
            </div>`;
        contenedor.appendChild(div);
    });
}
function prepararEdicion(tipo, id) {
    const reg = todosLosRegistrosGlobal.find(r => r.id === id && r.tipoTramite === tipo);
    editandoId = id;

    document.getElementById('step-1-choice').style.display = 'none';
    document.getElementById('form-pedir-pase').style.display = 'none';
    document.getElementById('form-pedir-permiso').style.display = 'none';

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

// Función para cancelar un trámite usando el modal del sistema
function cancelarSolicitud(tipo, id) {
    // 1. Preparamos el endpoint según el tipo
    const endpoint = tipo === 'Pase' ? 'pases' : 'permisos';

    // 2. Seteamos las variables globales que ya usa tu botón de "Confirmar"
    urlPendiente = `${URL_BASE}/${endpoint}/cancelar`;
    metodoPendiente = 'PATCH';
    datosPendientes = { id, cancelar: "Cancelado" };

    // 3. Personalizamos el mensaje del modal para que no sea genérico
    document.getElementById('conf-resumen').innerHTML = `
        <div class="text-center">
            <i class="fa-solid fa-circle-exclamation text-danger mb-3" style="font-size: 3rem;"></i>
            <h5 class="mb-2">¿Confirmas la cancelación?</h5>
            <p class="text-muted">Estás a punto de cancelar tu <strong>${tipo}</strong> con folio <strong>#${id}</strong>.</p>
            <div class="alert alert-warning py-2 small">
                <i class="fa-solid fa-info-circle me-1"></i> Esta acción no se puede deshacer.
            </div>
        </div>
    `;

    // 4. Mostramos el modal de confirmación del sistema
    modalConfirmacionInstancia.show();
}

// Listeners de formularios
document.getElementById('form-pedir-pase').addEventListener('submit', (e) => {
    e.preventDefault();
    const fechaUso = document.getElementById('fecha_uso').value;

    if (!editandoId && verificarDias(fechaUso)) { 
        return mostrarToast("Ya tienes una solicitud activa para esa fecha", "error");
    }
    const hInicio = document.getElementById('hora_inicio').value;
    const hFin = document.getElementById('hora_fin').value;
    const motivo = document.getElementById('motivo_pase').value;
    if (hFin <= hInicio) return mostrarToast("Hora incorrecta", "error");
    datosPendientes = { fecha_uso: fechaUso, hora_inicio: hInicio, hora_fin: hFin, motivo, id: editandoId };
    urlPendiente = editandoId ? `${URL_BASE}/pases/mod` : `${URL_BASE}/pases/crear`;
    metodoPendiente = editandoId ? 'PATCH' : 'POST';
    document.getElementById('conf-resumen').innerHTML = `<strong>Pase</strong>: ${fechaUso} de ${hInicio} a ${hFin}`;
    modalConfirmacionInstancia.show();
});

document.getElementById('form-pedir-permiso').addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('tipo_permiso').value;
    const fechaI = document.getElementById('fecha_inicio').value;
    const fechaF = document.getElementById('fecha_fin').value;

    // Revisamos cada día del rango solicitado
    let temp = new Date(fechaI + 'T00:00:00');
    const fFinal = new Date(fechaF + 'T00:00:00');

    while (temp <= fFinal) {
        if (!editandoId && verificarDias(temp.toISOString().split('T')[0])) {
            return mostrarToast(`El día ${temp.toLocaleDateString()} ya está ocupado`, "error");
        }
        temp.setDate(temp.getDate() + 1);
    }
    const dias = document.getElementById('cantidad_dias').value;
    const motivo = document.getElementById('motivo').value;
    datosPendientes = { tipo_permiso: tipo, fecha_inicio: fechaI, fecha_fin: fechaF, cantidad_dias: dias, motivo, id: editandoId };
    urlPendiente = editandoId ? `${URL_BASE}/permisos/mod` : `${URL_BASE}/permisos/crear`;
    metodoPendiente = editandoId ? 'PATCH' : 'POST';
    document.getElementById('conf-resumen').innerHTML = `<strong>Permiso</strong>: ${tipo} del ${fechaI} al ${fechaF}`;
    modalConfirmacionInstancia.show();
});

document.getElementById('btn-confirmar-envio').addEventListener('click', async () => {
    const btn = document.getElementById('btn-confirmar-envio');
    btn.disabled = true;
    try {
        const resp = await fetch(urlPendiente, {
            method: metodoPendiente,
            headers: { 'Content-Type': 'application/json', 'x-token': token },
            body: JSON.stringify(datosPendientes)
        });
        const res = await resp.json();
        modalConfirmacionInstancia.hide();
        if (res.ok) {
            modalInstancia.hide(); volverPaso1(); cargarDatosYActualizarCalendario();
            mostrarToast("Operación exitosa");
        } else { mostrarToast(res.msg, "error"); }
    } catch (e) { mostrarToast("Error de servidor", "error"); }
    finally { btn.disabled = false; }
});

// Ayudantes de límites
function actualizarLimitesHoraFin() {
    const hIn = document.getElementById('hora_inicio');
    const hFi = document.getElementById('hora_fin');
    if (!hIn || !hFi || !hIn.value) return;
    const hInNum = parseInt(hIn.value.split(':')[0]);
    Array.from(hFi.options).forEach(opt => {
        const hFiNum = parseInt(opt.value.split(':')[0]);
        opt.disabled = (hFiNum <= hInNum || hFiNum > hInNum + 3);
    });
}

function actualizarLimitesFechaFin() {
    const iI = document.getElementById('fecha_inicio');
    const iF = document.getElementById('fecha_fin');
    if (!iI || !iF || !iI.value) return;
    iF.min = iI.value;

    let fMax = parseLocal(iI.value);

    let dH = (fMax.getDay() === 0 || fMax.getDay() === 6) ? 0 : 1;
    while (dH < 3) {
        fMax.setDate(fMax.getDate() + 1);
        if (fMax.getDay() !== 0 && fMax.getDay() !== 6) dH++;
    }

    const y = fMax.getFullYear();
    const m = String(fMax.getMonth() + 1).padStart(2, '0');
    const d = String(fMax.getDate()).padStart(2, '0');
    iF.max = `${y}-${m}-${d}`;

    if (iF.value > iF.max) iF.value = iI.value;
}

function abrirPerfil(conSeguridad) {
    const u = JSON.parse(sessionStorage.getItem('usuario'));

    // Llenamos el modal con los datos de la DB
    document.getElementById('p-nombre').textContent = u.nombre_completo;
    document.getElementById('p-rfc').textContent = u.rfc || 'No registrado';
    document.getElementById('p-categoria').textContent = u.categoria || 'N/A';
    document.getElementById('p-area').textContent = u.area_adscripcion || 'N/A';
    document.getElementById('p-ingreso').textContent = u.fecha_ingreso ? u.fecha_ingreso.split('T')[0] : 'N/A';
    document.getElementById('p-contrato').textContent = u.tipo_contrato || 'N/A';

    // Mostramos u ocultamos la seguridad según el clic
    document.getElementById('info-laboral-perfil').style.display = conSeguridad ? 'none' : 'flex';
    document.getElementById('seccion-seguridad').style.display = conSeguridad ? 'block' : 'none';
    const titulo = document.querySelector('#modalPerfil .modal-title');
    titulo.innerHTML = conSeguridad
        ? '<i class="fa-solid fa-key me-2 text-warning"></i> Actualizar Seguridad'
        : '<i class="fa-solid fa-user-gear me-2"></i> Expediente Docente';
    modalPerfilInstancia.show();
}
function verificarDias(fechaNueva) {
    // Comparamos solo la parte YYYY-MM-DD
    const fechaBusqueda = typeof fechaNueva === 'string' ? fechaNueva : fechaNueva.toISOString().split('T')[0];

    return todosLosRegistrosGlobal.some(reg => {
        // No contamos las solicitudes rechazadas o canceladas
        if (reg.estado === 'Rechazado' || reg.estado === 'Cancelado') return false;

        if (reg.tipoTramite === 'Pase') {
            // Si es un pase, comparamos fecha directa
            return reg.fecha_uso.split('T')[0] === fechaBusqueda;
        } else {
            // Si es permiso, revisamos si la fecha cae dentro del rango
            const inicio = new Date(reg.fecha_inicio.split('T')[0]);
            const fin = new Date(reg.fecha_fin.split('T')[0]);
            const actual = new Date(fechaBusqueda);
            return (actual >= inicio && actual <= fin);
        }
    });
}