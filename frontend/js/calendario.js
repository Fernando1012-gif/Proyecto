$(document).ready(function() {
    var calendar = $('#calendario').fullCalendar({
        header: {
            left: 'today,prev,next',
            center: 'title',
            right: 'month,basicWeek,basicDay'
        },
        dayClick: function(date, jsEvent, view) {
            // Limpiar inputs y preparar fecha
            $('#txtTitulo').val("");
            $('#txtDescripcion').val("");
            $('#txtFecha').val(date.format()); // Guardamos la fecha en el input oculto
            
            // Abrir el modal
            $("#exampleModal").modal('show');
        }
    });

    // Acción del botón "Agregar" dentro del modal
    $('#btnAgregar').click(function() {
        var nuevoEvento = {
            title: $('#txtTitulo').val(),
            start: $('#txtFecha').val(),
            description: $('#txtDescripcion').val(),
            color: $('#txtColor').val(),
            allDay: true
        };

        if (nuevoEvento.title) {
            // Agrega el evento visualmente al calendario
            $('#calendario').fullCalendar('renderEvent', nuevoEvento, true);
            
            // Cerrar modal
            $("#exampleModal").modal('hide');
            alert("Pase solicitado correctamente para el día: " + nuevoEvento.start);
        } else {
            alert("Por favor, ingresa un título para el pase.");
        }
    });
});