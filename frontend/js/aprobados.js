async function cargarAprobados() {
    try {
        const respuesta = await fetch('/api/permisos/Aprobado');
        const permisos = await respuesta.json();
        const cuerpo = document.getElementById('tabla-aprobados');

        cuerpo.innerHTML = permisos.map(p => `
    <tr class="fila-aprobada">
        <td>#${p.id}</td>
        <td>${p.tipo_permiso}</td> <td>${p.fecha_inicio.split('T')[0]}</td> <td><span class="badge verde">Aprobado</span></td>
    </tr>
`).join('');
    } catch (error) {
        console.error("Error al cargar aprobados:", error);
    }
}
window.onload = cargarAprobados;


