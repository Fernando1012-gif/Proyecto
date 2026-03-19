const db = require('../bd/base');

const pasesql = {
    obtenerPases: async (id) => {
        try {
            const sql = 'select * from pases_salida where usuario_id = ?';
            const [datos] = await db.execute(sql, [id]);
            return datos;
        } catch (error) {
            console.error("Error al obtener pases", error);
            throw error;
        }
    },

    obtenerTodos: async () => {
        try {
            const sql = `SELECT p.*, u.nombre_completo FROM pases_salida p 
                         INNER JOIN usuarios u ON p.usuario_id = u.id 
                         ORDER BY p.fecha_solicitud DESC`;
            const [datos] = await db.execute(sql);
            return datos;
        } catch (error) {
            console.error("Error al obtener todos los pases", error);
            throw error;
        }
    },

    contarPasesMensuales: async (usuario_id) => {
        try {
            const sql = `SELECT COUNT(*) as total FROM pases_salida 
                         WHERE usuario_id = ? AND MONTH(fecha_uso) = MONTH(CURRENT_DATE())`;
            const [rows] = await db.execute(sql, [usuario_id]);
            return rows[0].total;
        } catch (error) {
            throw error;
        }
    },

    modPase: async (fU, hI, motivo, id) => {
        try {
            const sql = `update pases_salida set fecha_uso = ?, hora_inicio = ?, 
            motivo = ? where id = ?`;
            const [datos] = await db.execute(sql, [fU, hI, motivo, id]); 
            return datos;
        } catch (error) {
            console.error("Error al actualizar el pase");
            throw error;
        }
    },

    crearPase: async (us, fU, hI, motivo) => {
        try {
            const sql = `insert into pases_salida(usuario_id, fecha_uso, hora_inicio, 
            motivo) values(?,?,?,?)`;
            const [datos] = await db.execute(sql, [us, fU, hI, motivo]);
            return datos;
        } catch (error) {
            console.error("Error al crear el pase");
            throw error;
        }
    },

    cancelarPase: async (estado, id) => {
        try {
            const sql = 'update pases_salida set estado = ? where id = ?';
            const [datos] = await db.execute(sql, [estado, id]);
            return datos;
        } catch (error) {
            console.error("Error al editar cancelar pase");
            throw error;
        }
    }
}

module.exports = pasesql;