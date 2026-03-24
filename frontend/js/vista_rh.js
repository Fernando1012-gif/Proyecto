const URL_BASE = 'http://localhost:3000/api';
let registrosGlobales = [];

const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
    window.location.href = "login.html";
}
const usuario = JSON.parse(usuarioStr);

// Inyectar contenedor de Toasts dinámicamente para no ensuciar tu HTML
document.body.insertAdjacentHTML('beforeend', `
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1055;">
        <div id="toastRH" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header text-white" id="toast-header-rh">
                <i class="fa-solid fa-bell me-2"></i><strong class="me-auto">Aviso RRHH</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body fw-bold bg-white text-dark" id="toast-msg-rh"></div>
        </div>
    </div>
`);

function mostrarToast(mensaje, tipo = 'success') {
    const toastEl = document.getElementById('toastRH');
    document.getElementById('toast-msg-rh').textContent = mensaje;
    document.getElementById('toast-header-rh').className = tipo === 'success' ? 'toast-header text-white bg-success' : 'toast-header text-white bg-danger';
    new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('saludo-rh').textContent = usuario.nombre_completo || "RRHH";
    
    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = "login.html";
    });

    cargarDatosGenerales();

    // Evento para el botón de filtros
    document.getElementById('btn-aplicar-filtros').addEventListener('click', aplicarFiltros);
    document.getElementById('form-filtros').addEventListener('reset', () => {
        setTimeout(pintarTabla, 100); // Repinta todo después de limpiar el form
    });
});

async function cargarDatosGenerales() {
    try {
        const respPases = await fetch(`${URL_BASE}/pases/todos`, { headers: { 'x-token': token } });
        const respPermisos = await fetch(`${URL_BASE}/permisos/todos`, { headers: { 'x-token': token } });
        
        const dataPases = respPases.ok ? await respPases.json() : { data: [] };
        const dataPermisos = respPermisos.ok ? await respPermisos.json() : { data: [] };

        // Estandarizamos los datos en un solo formato para la tabla
        const pasesMapeados = (dataPases.data || []).map(p => ({ ...p, tipoTramite: 'Pase', fechaClave: p.fecha_uso }));
        const permisosMapeados = (dataPermisos.data || []).map(p => ({ ...p, tipoTramite: 'Permiso', fechaClave: p.fecha_inicio }));

        registrosGlobales = [...pasesMapeados, ...permisosMapeados];
        
        // Ordenar por fecha más reciente
        registrosGlobales.sort((a, b) => new Date(b.fechaClave) - new Date(a.fechaClave));
        
        pintarTabla(registrosGlobales);
    } catch (error) {
        mostrarToast("Error obteniendo registros generales", "error");
    }
}

function pintarTabla(datos = registrosGlobales) {
    const tbody = document.getElementById('tabla-general');
    tbody.innerHTML = '';

    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron registros...</td></tr>';
        return;
    }

    datos.forEach(reg => {
        const fechaFormat = reg.fechaClave ? reg.fechaClave.split('T')[0] : 'N/A';
        let badgeColor = 'bg-warning text-dark';
        if(reg.estado === 'Aprobado') badgeColor = 'bg-success';
        if(reg.estado === 'Rechazado' || reg.estado === 'Cancelado') badgeColor = 'bg-danger';

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-muted">#${reg.id}</td>
                <td><span class="badge bg-secondary">${reg.tipoTramite}</span></td>
                <td>ID Usuario: ${reg.usuario_id}</td>
                <td>${fechaFormat}</td>
                <td class="text-truncate" style="max-width: 200px;" title="${reg.motivo}">${reg.motivo}</td>
                <td><span class="badge ${badgeColor}">${reg.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="mostrarToast('Detalles no implementados en BD aún', 'success')">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function aplicarFiltros() {
    const fDocente = document.getElementById('filtro-docente').value.toLowerCase();
    const fEstado = document.getElementById('filtro-estado').value;
    const fTipo = document.getElementById('filtro-tipo').value;
    const fMes = document.getElementById('filtro-mes').value;
    const fAño = document.getElementById('filtro-año').value;

    const filtrados = registrosGlobales.filter(reg => {
        let cumple = true;
        const fechaObj = new Date(reg.fechaClave);

        // Como tu BD ahorita trae usuario_id en lugar del nombre_completo, este filtro de texto se puede ajustar luego
        if (fDocente && !reg.usuario_id.toString().includes(fDocente)) cumple = false; 
        if (fEstado !== 'Todos' && reg.estado !== fEstado) cumple = false;
        if (fTipo !== 'Ambos' && reg.tipoTramite !== fTipo) cumple = false;
        
        // Cuidado con los meses de JS (0-11)
        if (fMes && (fechaObj.getMonth() + 1).toString().padStart(2, '0') !== fMes) cumple = false;
        if (fAño && fechaObj.getFullYear().toString() !== fAño) cumple = false;

        return cumple;
    });

    pintarTabla(filtrados);
    mostrarToast(`Se encontraron ${filtrados.length} resultados`);
}