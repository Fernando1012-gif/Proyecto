const db = require('../bd/base');

const pasesql = {
    //consulta para obtener pases de un usuario especifico
    obtenerPases: async (id) => {
        try {
            const sql = `SELECT p.*, u.nombre_completo, 
                        DATE_FORMAT(p.fecha_uso, '%d/%m/%Y') AS fecha_uso_h,
                        DATE_FORMAT(p.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h
                        FROM pases_salida p
                        INNER JOIN usuarios u ON p.usuario_id = u.id
                        WHERE p.usuario_id = ?
                        ORDER BY p.fecha_solicitud DESC`;
            const [datos] = await db.execute(sql, [id]);
            return datos;
        } catch (error) {
            console.error("Error al obtener pases docente", error);
            throw error;
        }
    },

    //consulta para obtener todos los pases sin importar el usuario
    obtenerTodos: async () => {
        try {
            const sql = `SELECT p.*, u.nombre_completo,
                        DATE_FORMAT(p.fecha_uso, '%d/%m/%Y') AS fecha_uso_h,
                        DATE_FORMAT(p.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h
                        FROM pases_salida p
                        INNER JOIN usuarios u ON p.usuario_id = u.id
                        ORDER BY p.fecha_solicitud DESC`;
            const [datos] = await db.execute(sql);
            return datos;
        } catch (error) {
            console.error("Error en obtenerTodos", error);
            throw error;
        }
    },
    obtenerTodosPases: async function() { return await this.obtenerTodos(); },

    //consulta para contar pases mensuales
    contarPasesMensuales: async (usuario_id) => {
        try {
            const sql = `SELECT COUNT(*) as total FROM pases_salida 
                         WHERE usuario_id = ? 
                         AND MONTH(fecha_uso) = MONTH(CURRENT_DATE()) 
                         AND YEAR(fecha_uso) = YEAR(CURRENT_DATE())
                         AND estado IN ('Pendiente', 'Aprobado')`;
            
            const [rows] = await db.execute(sql, [usuario_id]);
            return rows[0].total || 0;
        } catch (error) {
            console.error("Error en contador", error);
            return 0;
        }
    },

    //consulta para crear pase nuevo
    crearPase: async (us, fU, hI, hF, motivo) => {
        try {
            const sql = `INSERT INTO pases_salida(usuario_id, fecha_uso, hora_inicio, hora_fin, motivo) VALUES(?,?,?,?,?)`;
            const [datos] = await db.execute(sql, [us, fU, hI, hF, motivo]);
            return datos;
        } catch (error) { throw error; }
    },
    //consulta para modificar pase existente solo si el estado es "pendiente"
    modPase: async (fU, hI, hF, motivo, id) => {
        try {
            const sql = `UPDATE pases_salida SET fecha_uso = ?, hora_inicio = ?, hora_fin = ?, motivo = ? WHERE id = ?`;
            const [datos] = await db.execute(sql, [fU, hI, hF, motivo, id]); 
            return datos;
        } catch (error) { throw error; }
    },
    //consulta para cancelar un pase
    cancelarPase: async (estado, id) => {
        try {
            const sql = 'UPDATE pases_salida SET estado = ? WHERE id = ?';
            const [datos] = await db.execute(sql, [estado, id]);
            return datos;
        } catch (error) { throw error; }
    },

    //consulta para buscar pase por id
    buscarPasePorId: async (id) => {
        try {
            const sql = `SELECT p.*, u.nombre_completo, 
                        DATE_FORMAT(p.fecha_uso, '%d/%m/%Y') AS fecha_uso_h, 
                        DATE_FORMAT(p.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h 
                        FROM pases_salida p 
                        INNER JOIN usuarios u ON p.usuario_id = u.id 
                        WHERE p.id = ?`;
            const [datos] = await db.execute(sql, [id]);
            return datos[0] || null;
        } catch (error) {
            console.error("Error al buscar por id", error);
            throw error;
        }
    },
    obtenerInfoDocentePorPase: async (paseId) => {
        
        const sql = `
            SELECT u.correo_institucional, u.nombre_completo 
            FROM pases_salida p 
            JOIN usuarios u ON p.usuario_id = u.id 
            WHERE p.id = ?`;
        const [rows] = await db.execute(sql, [paseId]);
        return rows[0];
    }
};

module.exports = pasesql;