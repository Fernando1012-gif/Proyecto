async function cargarPendientes() {
    try {
        // Buscamos "Pendiente" (con la P mayúscula como aparece en tu base de datos)
        const respuesta = await fetch('/api/permisos/Pendiente'); 
        const permisos = await respuesta.json();
        const cuerpo = document.getElementById('tabla-cuerpo');

        cuerpo.innerHTML = permisos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.tipo_permiso}</td>
                <td>${p.motivo}</td>
                <td><span class="badge amarillo">${p.estado}</span></td>
                <td>
                    <button onclick="actualizarEstado(${p.id}, 'Aprobado')" style="background-color: #28a745; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Aceptar</button>
                    <button onclick="actualizarEstado(${p.id}, 'Rechazado')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; margin-left: 5px;">Rechazar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Error al cargar los permisos pendientes:", error);
    }
}

async function actualizarEstado(id, nuevoEstado) {
    if (!confirm(`¿Estás seguro de cambiar el estado a ${nuevoEstado}?`)) return;

    try {
        const respuesta = await fetch('/api/permisos/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, nuevoEstado: nuevoEstado })
        });

        const resultado = await respuesta.json();

        if (resultado.success) {
            alert("Estado actualizado correctamente");
            cargarPendientes(); // Recarga la lista para quitar el permiso gestionado
        }
    } catch (error) {
        console.error("Error al actualizar:", error);
    }
}

window.onload = cargarPendientes;