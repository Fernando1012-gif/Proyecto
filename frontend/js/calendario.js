$(document).ready(function() {
    var calendar = $('#calendario').fullCalendar({
        header: {
            left: 'today,prev,next',
            center: 'title',
            right: 'month,basicWeek,basicDay'
        },
        dayClick: function(date, jsEvent, view) {
            $('#txtTitulo').val("");
            $('#txtDescripcion').val("");
            $('#txtFecha').val(date.format());
            $("#exampleModal").modal('show');
        }
    });
    $('#btnAgregar').click(function() {
        var nuevoEvento = {
            title: $('#txtTitulo').val(),
            start: $('#txtFecha').val(),
            description: $('#txtDescripcion').val(),
            color: $('#txtColor').val(),
            allDay: true
        };

        if (nuevoEvento.title) {
            $('#calendario').fullCalendar('renderEvent', nuevoEvento, true);
            $("#exampleModal").modal('hide');
            alert("Pase solicitado correctamente para el día: " + nuevoEvento.start);
        } else {
            alert("Por favor, ingresa un título para el pase.");
        }
    });
});