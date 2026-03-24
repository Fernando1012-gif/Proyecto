// URL base de tu backend
const URL_BASE = 'http://localhost:3000/api';
let calendarioOficial;
let modalInstancia;

// 1. VALIDAR SESIÓN
const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
    window.location.href = "login.html";
}

const usuario = JSON.parse(usuarioStr);

// FUNCIÓN PARA MOSTRAR TOASTS (Reemplaza a los alert)
function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastHeader = document.getElementById('toast-header-bg');
    const toastMsg = document.getElementById('toast-mensaje');
    
    toastMsg.textContent = mensaje;
    
    if(tipo === 'success') {
        toastHeader.className = 'toast-header text-white bg-success';
    } else if(tipo === 'error') {
        toastHeader.className = 'toast-header text-white bg-danger';
    } else {
        toastHeader.className = 'toast-header text-dark bg-warning';
    }

    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}

// LÓGICA DEL MODAL DINÁMICO
function volverPaso1() {
    document.getElementById('step-1-choice').style.display = 'block';
    document.getElementById('form-pedir-pase').style.display = 'none';
    document.getElementById('form-pedir-permiso').style.display = 'none';
}

document.getElementById('btn-elegir-pase').addEventListener('click', () => {
    document.getElementById('step-1-choice').style.display = 'none';
    document.getElementById('form-pedir-pase').style.display = 'block';
});

document.getElementById('btn-elegir-permiso').addEventListener('click', () => {
    document.getElementById('step-1-choice').style.display = 'none';
    document.getElementById('form-pedir-permiso').style.display = 'block';
});


// 2. CUANDO EL HTML ESTÉ LISTO
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar variable del modal
    modalInstancia = new bootstrap.Modal(document.getElementById('modalSolicitud'));

    // Pintar nombre del profe modo corporativo
    const nombre = usuario.nombre || usuario.nombre_completo || "Usuario Desconocido";
    document.getElementById('saludo-profesor').textContent = nombre;
    
    // Botón logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    // PINTAR CALENDARIO VACÍO PRIMERO (Para que no se quede la pantalla muerta si hay error)
    pintarCalendario([]);

    // LUEGO INTENTAR LLENARLO CON DATOS REALES
    cargarDatosYActualizarCalendario();
});


// 3. OBTENER DATOS DE LA BD
async function cargarDatosYActualizarCalendario() {
    try {
        const respuesta = await fetch(`${URL_BASE}/pases/ver`, {
            method: 'GET',
            headers: { 'x-token': token }
        });

        const data = await respuesta.json();

        if (data.ok) {
            let cantAprobados = 0;
            let cantPendientes = 0;
            let cantRechazados = 0;

            // Mapeamos los datos de MySQL
            const eventosCalendario = data.data.map(pase => {
                const fecha = pase.fecha_uso.split('T')[0]; 
                
                // Colores corporativos Bootstrap
                let colorEvento = '#ffc107'; // Warning
                
                if(pase.estado === 'Aprobado') {
                    colorEvento = '#198754'; // Success
                    cantAprobados++;
                } else if(pase.estado === 'Rechazado' || pase.estado === 'Cancelado') {
                    colorEvento = '#dc3545'; // Danger
                    cantRechazados++;
                } else {
                    cantPendientes++;
                }

                return {
                    id: pase.id,
                    title: `Pase: ${pase.estado}`,
                    start: `${fecha}T${pase.hora_inicio}`,
                    backgroundColor: colorEvento,
                    borderColor: colorEvento,
                    textColor: (pase.estado === 'Pendiente') ? '#000' : '#fff',
                    extendedProps: {
                        motivo: pase.motivo,
                        hora: pase.hora_inicio,
                        tipo: 'Pase'
                    }
                };
            });

            // Actualizamos los badges del sidebar
            document.getElementById('badge-aprobados').textContent = cantAprobados;
            document.getElementById('badge-pendientes').textContent = cantPendientes;
            document.getElementById('badge-rechazados').textContent = cantRechazados;

            // Actualizamos la fuente de datos del calendario que ya existe
            calendarioOficial.removeAllEventSources();
            calendarioOficial.addEventSource(eventosCalendario);
            
        } else {
            mostrarToast(data.msg, 'error');
        }
    } catch (error) {
        mostrarToast("Error de conexión con el servidor", 'error');
    }
}

// 4. LA FUNCIÓN QUE DIBUJA EL CALENDARIO FULLCALENDAR V6
function pintarCalendario(eventos) {
    const calendarEl = document.getElementById('calendario');
    
    calendarioOficial = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: '100%', // Ajuste para el bspwm
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        events: eventos,
        // Al hacer clic en un día vacío
        dateClick: function(info) {
            volverPaso1(); // Resetea el modal al paso 1
            // Precarga la fecha seleccionada en ambos formularios
            document.getElementById('fecha_uso').value = info.dateStr;
            document.getElementById('fecha_inicio').value = info.dateStr;
            modalInstancia.show();
        },
        // Al hacer clic en un evento que ya existe
        eventClick: function(info) {
            mostrarToast(`${info.event.extendedProps.tipo} ${info.event.title} - Motivo: ${info.event.extendedProps.motivo}`, 'info');
        }
    });
    
    calendarioOficial.render();
}

// 5. ENVIAR FORMULARIO PARA CREAR PASE
const formPedirPase = document.getElementById('form-pedir-pase');

formPedirPase.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const fecha_uso = document.getElementById('fecha_uso').value;
    const hora_inicio = document.getElementById('hora_inicio').value;
    const motivo = document.getElementById('motivo_pase').value;

    try {
        const response = await fetch(`${URL_BASE}/pases/crear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-token': token
            },
            // El backend recibe 'motivo', así se lo mandamos correctamente
            body: JSON.stringify({ fecha_uso, hora_inicio, motivo })
        });

        const result = await response.json();

        if (result.ok) {
            modalInstancia.hide();
            formPedirPase.reset(); 
            cargarDatosYActualizarCalendario(); 
            mostrarToast('Solicitud enviada correctamente', 'success');
        } else {
            mostrarToast(result.msg, 'error');
        }
    } catch (error) {
        mostrarToast("Fallo crítico de red", 'error');
    }
});
// 6. ENVIAR FORMULARIO PARA CREAR PERMISO
const formPedirPermiso = document.getElementById('form-pedir-permiso');

formPedirPermiso.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const tipo_permiso = document.getElementById('tipo_permiso').value;
    const fecha_inicio = document.getElementById('fecha_inicio').value;
    const fecha_fin = document.getElementById('fecha_fin').value;
    const cantidad_dias = document.getElementById('cantidad_dias').value;
    const motivo = document.getElementById('motivo_permiso').value;

    try {
        const response = await fetch(`${URL_BASE}/permisos/crear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-token': token
            },
            body: JSON.stringify({ tipo_permiso, fecha_inicio, fecha_fin, cantidad_dias, motivo })
        });

        const result = await response.json();

        if (result.ok) {
            modalInstancia.hide();
            formPedirPermiso.reset(); 
            cargarDatosYActualizarCalendario(); 
            mostrarToast('Permiso solicitado correctamente', 'success');
        } else {
            mostrarToast(result.msg, 'error');
        }
    } catch (error) {
        mostrarToast("Error de conexión al solicitar permiso", 'error');
    }
});