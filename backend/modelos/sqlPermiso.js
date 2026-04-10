//importamos la bd para crear las consultas
const db = require('../bd/base');


//creamo el objeto con las consultas
const usersql = {

    //obtener permisos 
    obtenerPermisos: async (id) => {
        try {
            //creamos la consulta donde obtendremos todos los registros de un usuario
            const sql = `SELECT 
    pg.*, 
    u.nombre_completo, 
    DATE_FORMAT(pg.fecha_inicio, '%d/%m/%Y') AS fecha_inicio_h, 
    DATE_FORMAT(pg.fecha_fin, '%d/%m/%Y') AS fecha_fin_h, 
    DATE_FORMAT(pg.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h 
    FROM permisos_goce pg 
    INNER JOIN usuarios u ON pg.usuario_id = u.id 
    WHERE pg.usuario_id = ? 
    ORDER BY pg.fecha_solicitud DESC`;
            //ejecutamos la consulta mysql con los parametros dados
            const [datos] = await db.execute(sql, [id]);
            //regresamos "datos" pero solo la primera fila 
            return datos;
        } catch (error) {
            console.error("Error al obtener permisos", error);
            throw error;
        }
    },
    //esta funcion sirve para modificar el permiso en algun dato cn la consulta sql
    modPermiso: async (tipo, fI, fF, cD, motivo, id) => {
        try {
            const sql = `update permisos_goce set tipo_permiso = ?, fecha_inicio = ?,
            fecha_fin = ?, cantidad_dias = ?, motivo = ? where id = ? `;
            //mandamos la consulta con los datos del controlador
            const [datos] = await db.execute(sql, [tipo, fI, fF, cD, motivo, id]);
            //regresamos para que el contolador sepa que paso 
            return datos;
        } catch (error) {
            console.error("Error al actualizar el permiso");
            throw error;
        }
    },
    //funcion para crear permiso añadiendo los campos de algunas columnas
    crearPermiso: async (us, tipo, fI, fF, cD, motivo) => {
        try {
            const sql = `insert into permisos_goce(usuario_id, tipo_permiso, fecha_inicio,
            fecha_fin, cantidad_dias, motivo) values(?,?,?,?,?,?) `;
            const [datos] = await db.execute(sql, [us, tipo, fI, fF, cD, motivo]);
            return datos;
        } catch (error) {
            console.error("Error al crear", error);
            throw error;
        }
    },
    //funcion para cancelar un permiso
    //funcion para cancelar o aprobar el permiso en la db
    cancelarPermiso: async (estado, id, revisado_por) => {
        try {
            // Seteamos el estado, el revisor y la hora actual del sistema
            const sql = 'UPDATE permisos_goce SET estado = ?, revisado_por = ?, fecha_revision = NOW() WHERE id = ?';
            const [result] = await db.query(sql, [estado, revisado_por, id]);
            return result.affectedRows > 0;
        } catch (error) {
            console.log("Error sql al cancelar permiso:", error);
            throw error;
        }
    },
    obtenerTodos: async () => {
        try {
            const sql = `SELECT 
    pg.*, 
    u.nombre_completo, 
    u.rfc,                 
    u.area_adscripcion,    
    u.fecha_ingreso,      
    u.categoria,           
    u.tipo_contrato,       
    u.fecha_nacimiento,    
    ur.nombre_completo AS revisado_por_nombre,
    DATE_FORMAT(pg.fecha_inicio, '%d/%m/%Y') AS fecha_inicio_h,
    DATE_FORMAT(pg.fecha_fin, '%d/%m/%Y') AS fecha_fin_h,
    DATE_FORMAT(pg.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h,
    DATE_FORMAT(pg.fecha_revision, '%d/%m/%Y %H:%i') AS fecha_revision_h
FROM permisos_goce pg
INNER JOIN usuarios u ON pg.usuario_id = u.id
LEFT JOIN usuarios ur ON pg.revisado_por = ur.id
ORDER BY pg.fecha_solicitud DESC;`;
            const [datos] = await db.execute(sql);
            return datos;
        } catch (error) {
            console.error("Error al obtener todos los permisos", error);
            throw error;
        }
    },
    obtenerInfoDocentePorPermiso: async (permisoId) => {
        const sql = `
        SELECT u.correo_institucional, u.nombre_completo 
        FROM permisos_goce p 
        JOIN usuarios u ON p.usuario_id = u.id 
        WHERE p.id = ?`;
        const [rows] = await db.execute(sql, [permisoId]);
        return rows[0];
    }
}
//exporamos usersql para que el controlador pueda acceder al objeto de este archivo
module.exports = usersql;