document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario || usuario.rol !== 'Administrador') {
        window.location.href = 'login.html';
        return;
    }

    const contenedor = document.getElementById('contenedorSolicitudes');

    async function cargarSolicitudes() {
        try {
            const res = await fetch('http://localhost:3000/api/pases/ver', {
                headers: { 'x-token': token }
            });
            const data = await res.json();

            if (data.ok) {
                contenedor.innerHTML = "";
                if (data.data.length === 0) {
                    contenedor.innerHTML = "<p>No hay solicitudes pendientes.</p>";
                    return;
                }

                data.data.forEach(p => {
                    const li = document.createElement('li');
                    li.className = p.estado === 'Aprobado' ? 'item-aprobado' : p.estado === 'Pendiente' ? 'item-pendiente' : 'item-rechazado';
                    
                    li.innerHTML = `
                        <strong>${p.nombre_completo}</strong><br>
                        ${p.motivo} - ${p.fecha_uso}<br>
                        <span>Estado: ${p.estado}</span>
                        ${p.estado === 'Pendiente' ? `
                            <div style="margin-top: 10px;">
                                <button onclick="decidirPase(${p.id}, 'Aprobado')" style="background:#4caf50; color:white; border:none; padding:5px 10px; cursor:pointer;">Aprobar</button>
                                <button onclick="decidirPase(${p.id}, 'Rechazado')" style="background:#d32f2f; color:white; border:none; padding:5px 10px; cursor:pointer;">Rechazar</button>
                            </div>
                        ` : ''}
                    `;
                    contenedor.appendChild(li);
                });
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }

    window.decidirPase = async (id, nuevoEstado) => {
        try {
            const res = await fetch('http://localhost:3000/api/pases/can', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-token': token 
                },
                body: JSON.stringify({ id, estado: nuevoEstado })
            });
            const data = await res.json();
            if (data.ok) {
                cargarSolicitudes();
                if (window.calendar) window.calendar.refetchEvents();
            }
        } catch (error) {
            alert("Error al procesar");
        }
    };

    var calendarEl = document.getElementById('calendar');
    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        height: 450,
        events: async function(info, successCallback) {
            const res = await fetch('http://localhost:3000/api/pases/ver', {
                headers: { 'x-token': token }
            });
            const data = await res.json();
            const eventos = data.data.map(p => ({
                title: `${p.nombre_completo}: ${p.estado}`,
                start: p.fecha_uso,
                backgroundColor: p.estado === 'Aprobado' ? '#4caf50' : p.estado === 'Pendiente' ? '#efa81a' : '#d32f2f',
                borderColor: 'transparent'
            }));
            successCallback(eventos);
        }
    });

    window.calendar.render();
    cargarSolicitudes();
});