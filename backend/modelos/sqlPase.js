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

    crearPase: async (us, fU, hI, hF, motivo) => {
        try {
            const sql = `insert into pases_salida(usuario_id, fecha_uso, hora_inicio, 
            hora_fin, motivo) values(?,?,?,?,?)`;
            const [datos] = await db.execute(sql, [us, fU, hI, hF, motivo]);
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
    },

    // <-- FUNCIONES NUEVAS PARA QUE FUNCIONE EL CONTROLADOR -->
    contarPasesMensuales: async (usuario_id) => {
        try {
            // Consulta para contar cuántos pases tiene en el mes y año actual
            const sql = 'SELECT COUNT(*) as total FROM pases_salida WHERE usuario_id = ? AND MONTH(fecha_uso) = MONTH(CURRENT_DATE()) AND YEAR(fecha_uso) = YEAR(CURRENT_DATE())';
            const [datos] = await db.execute(sql, [usuario_id]);
            return datos[0].total;
        } catch (error) {
            console.error("Error al contar pases mensuales", error);
            throw error;
        }
    },

    buscarPasePorId: async (id) => {
        try {
            const sql = 'SELECT * FROM pases_salida WHERE id = ?';
            const [datos] = await db.execute(sql, [id]);
            return datos[0];
        } catch (error) {
            console.error("Error al buscar pase por id", error);
            throw error;
        }
    },
    // esta funcion sirve para obtener absolutamente todos los pases (Para Jefe y RRHH)
    obtenerTodosPases: async () => {
        try {
            // creamos la consulta donde obtendremos todos los registros sin filtrar por usuario
            const sql = 'select * from pases_salida';
            // ejecutamos la consulta mysql 
            const [datos] = await db.execute(sql);
            // regresamos todos los registros encontrados
            return datos;
        } catch (error) {
            console.error("Error al obtener todos los pases", error);
            throw error;
        }
    },
    obtenerTodosPases: async () => {
        try {
            // Usamos JOIN para traer también el nombre_completo de la tabla usuarios
            const sql = `SELECT pases_salida.*, usuarios.nombre_completo 
                         FROM pases_salida 
                         INNER JOIN usuarios ON pases_salida.usuario_id = usuarios.id`;
            const [datos] = await db.execute(sql);
            return datos;
        } catch (error) {
            console.error("Error al obtener todos los pases", error);
            throw error;
        }
    },
}

module.exports = pasesql;