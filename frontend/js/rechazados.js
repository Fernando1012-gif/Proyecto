// Función para obtener y mostrar los permisos rechazados
async function cargarRechazados() {
    try {
        // Hacemos la petición al servidor filtrando por el estado "Rechazado"
        const respuesta = await fetch('/api/permisos/Rechazado'); 
        const permisos = await respuesta.json();
        const cuerpo = document.getElementById('tabla-rechazados');

        // Generamos las filas con los datos reales de la base de datos
        cuerpo.innerHTML = permisos.map(p => `
            <tr>
                <td>#${p.id}</td>
                <td>${p.tipo_permiso}</td>
                <td>${p.motivo}</td>
                <td><span class="badge rojo" style="background-color: #d9534f; color: white; padding: 4px 8px; border-radius: 4px;">Rechazado</span></td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Error al cargar los permisos rechazados:", error);
    }
}

// Se ejecuta automáticamente al cargar la página
window.onload = cargarRechazados;