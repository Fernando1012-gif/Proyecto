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
    modPermiso: async (tipo, fI,fF,cD,motivo,id) => {
        try {
            const sql = `update permisos_goce set tipo_permiso = ?, fecha_inicio = ?,
            fecha_fin = ?, cantidad_dias = ?, motivo = ? where id = ? `;
            //mandamos la consulta con los datos del controlador
            const [datos] = await db.execute(sql,[tipo, fI,fF,cD,motivo,id]); 
            //regresamos para que el contolador sepa que paso 
            return datos;
        } catch (error){
            console.error("Error al actualizar el permiso");
            throw error;
     }},
     //funcion para crear permiso añadiendo los campos de algunas columnas
     crearPermiso: async (us, tipo, fI, fF, cD, motivo) => {
        try {
            const sql = `insert into permisos_goce(usuario_id, tipo_permiso, fecha_inicio,
            fecha_fin, cantidad_dias, motivo) values(?,?,?,?,?,?) `;
            const [datos] = await db.execute(sql, [us, tipo, fI, fF, cD, motivo]);
            return datos;
        } catch (error){
            console.error("Error al crear",error);
            throw error;
}
    },
    //funcion para cancelar un permiso
    cancelarPermiso: async (cancelar, id) => {
        try {
            const sql = 'update permisos_goce set estado = ? where id = ?';
            const [datos] = await db.execute(sql, [cancelar, id]);
            return datos;
    } catch (error){
            console.error("Error al cancelar");
            throw error;
    }},
    obtenerTodos: async () => {
        try {
            const sql = `SELECT 
    pg.id, 
    pg.usuario_id, 
    u.nombre_completo,
    pg.tipo_permiso,
    pg.cantidad_dias, 
    pg.motivo, 
    pg.estado,
    pg.fecha_inicio, 
    pg.fecha_fin, 
    pg.fecha_solicitud,
    DATE_FORMAT(pg.fecha_inicio, '%d/%m/%Y') AS fecha_inicio_h,
    DATE_FORMAT(pg.fecha_fin, '%d/%m/%Y') AS fecha_fin_h,
    DATE_FORMAT(pg.fecha_solicitud, '%d/%m/%Y %H:%i') AS fecha_solicitud_h,
    pg.revisado_por,
    pg.fecha_revision
    FROM permisos_goce pg
    INNER JOIN usuarios u ON pg.usuario_id = u.id
    ORDER BY pg.fecha_solicitud DESC`;
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