document.addEventListener('DOMContentLoaded', async function() {
    // 1. CARGAR LISTA GENERAL
    try {
        const res = await fetch('/api/permisos/Aceptado'); // O una ruta general si la creas
        const datos = await res.json();
        const lista = document.getElementById('lista-general');
        
        // Mostrar solo los últimos 5 para no saturar
        lista.innerHTML = datos.slice(0, 5).map(p => `
            <li class="item-aprobado">${p.tipo_permiso} - ${p.fecha_inicio} (Aprobado)</li>
        `).join('');
    } catch (e) { console.error("Error en lista:", e); }

    // 2. CONFIGURAR CALENDARIO DINÁMICO
    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: 450,
        events: async function(info, successCallback, failureCallback) {
            try {
                const res = await fetch('/api/permisos/Aceptado');
                const datos = await res.json();
                
                // Convertimos los datos de la BD al formato que entiende FullCalendar
                const eventos = datos.map(p => ({
                    title: 'OCUPADO',
                    start: p.fecha_inicio, // Asegúrate que el nombre coincida con tu BD
                    backgroundColor: '#ff0000',
                    borderColor: '#ff0000',
                    allDay: true
                }));
                successCallback(eventos);
            } catch (e) { failureCallback(e); }
        }
    });
    calendar.render();
});