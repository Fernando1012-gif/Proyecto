$(document).ready(function() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    if (!token || !usuario) {
        window.location.href = 'login.html';
        return;
    }

    $('#nombreDocente').text(`Hola, ${usuario.nombre_completo}`);

    let fechaSeleccionada = '';

    $('#calendario').fullCalendar({
        header: {
            left: 'today,prev,next',
            center: 'title',
            right: 'month,basicWeek'
        },
        locale: 'es',
        events: async function(start, end, timezone, callback) {
            try {
                const [resPases, resPermisos] = await Promise.all([
                    fetch('http://localhost:3000/api/pases/ver', { headers: { 'x-token': token } }),
                    fetch('http://localhost:3000/api/permisos/ver', { headers: { 'x-token': token } })
                ]);

                const pases = await resPases.json();
                const permisos = await resPermisos.json();
                const eventos = [];

                if (pases.ok) {
                    pases.data.forEach(p => {
                        eventos.push({
                            title: `PASE: ${p.motivo}`,
                            start: `${p.fecha_uso}T${p.hora_inicio}`,
                            color: p.estado === 'Aprobado' ? '#4caf50' : p.estado === 'Rechazado' ? '#d32f2f' : '#efa81a'
                        });
                    });
                }

                if (permisos.ok) {
                    permisos.data.forEach(p => {
                        eventos.push({
                            title: `PERMISO: ${p.tipo_permiso}`,
                            start: p.fecha_inicio,
                            end: moment(p.fecha_fin).add(1, 'days').format('YYYY-MM-DD'),
                            color: '#9f2626'
                        });
                    });
                }
                callback(eventos);
            } catch (error) { console.error(error); }
        },

        dayClick: function(date) {
            fechaSeleccionada = date.format();
            $('#formSolicitud')[0].reset();
            $('#camposDinamicos').html('');
            $('#tituloFormulario').text(`Solicitud para el día ${fechaSeleccionada}`);
            $('#modalFormulario').modal('show');
        }
    });

    $('#tipoSolicitud').on('change', function() {
        const seleccion = $(this).val();
        const contenedor = $('#camposDinamicos');
        contenedor.html('');

        if (seleccion === 'pase') {
            contenedor.append(`
                <div class="form-group">
                    <label>Hora de Inicio</label>
                    <input type="time" id="hora_inicio" class="form-control" required>
                </div>
            `);
        } else if (seleccion === 'permiso') {
            contenedor.append(`
                <div class="form-group">
                    <label>Tipo de Permiso</label>
                    <select id="tipo_permiso" class="form-control" required>
                        <option value="Personal">Asuntos Particulares</option>
                        <option value="Medico">Médico</option>
                        <option value="Vacaciones">Vacaciones</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha de Fin</label>
                    <input type="date" id="fecha_fin" class="form-control" min="${fechaSeleccionada}" required>
                </div>
                <div class="form-group">
                    <label>Cantidad de Días</label>
                    <input type="number" id="cantidad_dias" class="form-control" min="1" value="1" required>
                </div>
            `);
        }
    });

    $('#formSolicitud').on('submit', async function(e) {
        e.preventDefault();
        const tipo = $('#tipoSolicitud').val();
        const motivo = $('#motivo').val();

        if (!tipo) return alert("Selecciona un tipo de solicitud");

        let url = '';
        let body = {};

        if (tipo === 'pase') {
            url = 'http://localhost:3000/api/pases/crear';
            body = {
                fecha_uso: fechaSeleccionada,
                hora_inicio: $('#hora_inicio').val(),
                motivo: motivo
            };
        } else {
            url = 'http://localhost:3000/api/permisos/crear';
            body = {
                us: usuario.id,
                tipo: $('#tipo_permiso').val(),
                fI: fechaSeleccionada,
                fF: $('#fecha_fin').val(),
                cD: $('#cantidad_dias').val(),
                motivo: motivo
            };
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-token': token },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.ok) {
                alert(data.msg || "Solicitud creada con éxito");
                $('#modalFormulario').modal('hide');
                $('#calendario').fullCalendar('refetchEvents');
            } else {
                alert(data.msg || "Error en la solicitud");
            }
        } catch (error) {
            alert("Error de conexión con el servidor");
        }
    });
});