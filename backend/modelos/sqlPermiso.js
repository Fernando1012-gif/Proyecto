//importamos la bd para crear las consultas
const db = require('../bd/base');


//creamo el objeto con las consultas
const usersql = {

    //obtener permisos 
    obtenerPermisos: async (id) => {
        try {
            //creamos la consulta donde obtendremos todos los registros de un usuario
            const sql = 'select * from permisos_goce where usuario_id = ?';
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
            console.error("Error al crear");
            throw error;
}
    },
    //funcion para cancelar un permiso mediante el valor de 1
    cancelarPermiso: async (cancelar, id) => {
        try {
            const sql = 'update permisos_goce set cancelado = ? where id = ?';
            const [datos] = await db.execute(sql, [cancelar, id]);
            return datos;
    } catch (error){
            console.error("Error al editar cancelar");
            throw error;
}}
}
//exporamos usersql para que el controlador pueda acceder al objeto de este archivo
module.exports = usersql;