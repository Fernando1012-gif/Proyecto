const db = require('../bd/base');

const sqlValidaciones = {
    //festivo o cumpleaños
    fechaEspecial: async (fechaSolicitada, usuarioId) => {
        const sqlFestivo = "SELECT descripcion FROM dias_festivos WHERE fecha = ?";
        const [festivos] = await db.execute(sqlFestivo, [fechaSolicitada]);

        const sqlCumple = `
            SELECT nombre_completo FROM usuarios 
            WHERE id = ? 
            AND MONTH(fecha_nacimiento) = MONTH(?) 
            AND DAY(fecha_nacimiento) = DAY(?)`;
        const [cumple] = await db.execute(sqlCumple, [usuarioId, fechaSolicitada, fechaSolicitada]);

        return {
            esFestivo: festivos.length > 0 ? festivos[0].descripcion : null,
            esCumple: cumple.length > 0
        };
    },
    verificarT: async (usuarioId, fechaInicio, fechaFin = null) => {
        const fFin = fechaFin || fechaInicio; 

        const [pases] = await db.execute(
            `SELECT id FROM pases_salida 
             WHERE usuario_id = ? AND fecha_uso BETWEEN ? AND ? 
             AND estado NOT IN ('Rechazado', 'Cancelado')`,
            [usuarioId, fechaInicio, fFin]
        );

        const [permisos] = await db.execute(
            `SELECT id FROM permisos_goce
             WHERE usuario_id = ? 
             AND (fecha_inicio <= ? AND fecha_fin >= ?) 
             AND estado NOT IN ('Rechazado', 'Cancelado')`,
            [usuarioId, fFin, fechaInicio]
        );

        return pases.length > 0 || permisos.length > 0;
    }
};

module.exports = sqlValidaciones;