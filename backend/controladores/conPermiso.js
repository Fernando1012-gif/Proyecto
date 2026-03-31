//importamos el modelo sql propio de permisos
const usersql = require('../modelos/sqlPermiso');

////creamos el objeto con las funciones 
const permisosControlador = {
    // Para que el docente vea solo los suyos
    verPermisos: async (req, res) => {
        const {id} = req.usuario;
        try {
            //mandamos id en la consulta sql
            const permisos = await usersql.obtenerPermisos(id);
            if (!permisos) {
                return res.status(404).json({ ok: false, msg: "ALgo salio mal :v" });
            }
            res.json({ ok: true, data: permisos });
        } catch(error) {
            res.status(500).json({ok: false, msg: "Error de server"});
        }
    }, 

    // NUEVA FUNCIÓN: Para que RH y Jefes vean TODOS los permisos de todos los profes
    verTodosPermisos: async (req, res) => {
        try {
            // Llama a una nueva funcion en tu sqlPermiso que no lleve el id
            // Ej: obtenerTodos: async () => { ... sql = 'select * from permisos_goce'; ... }
            const permisos = await usersql.obtenerTodos();
            res.json({ ok: true, data: permisos });
        } catch(error) {
            res.status(500).json({ok: false, msg: "Error de server"});
        }
    },

    //funcion para modificar permisos
    modPermisos: async (req, res) => {
        const {tipo_permiso, fecha_inicio, fecha_fin, cantidad_dias, motivo, id} = req.body;
        try {
            const permisos = await usersql.modPermiso(tipo_permiso, fecha_inicio, fecha_fin, cantidad_dias, motivo, id);
            if (!permisos) {
                return res.status(404).json({ ok: false, msg: "Algo salio mal" });
            }
            res.json({ ok: true, msg: "se ha modificado correctamente el permiso!" }); 
        } catch(error) {
            if (error.errno === 1644 || error.sqlState === '45000') {
                return res.status(400).json({ ok: false, msg: error.sqlMessage })
            }
            res.status(500).json({ ok: false, mensaje: "hay un problema en el server" });
        }
    },

    //funcion para crear permiso añadiendo los campos de algunas columnas
    crearPermiso: async (req, res) => {
        const { tipo_permiso, fecha_inicio, fecha_fin, cantidad_dias, motivo } = req.body;
        const us = req.usuario.id;

        try {
            const permisos = await usersql.crearPermiso(us, tipo_permiso, fecha_inicio, fecha_fin, cantidad_dias, motivo);
            if (!permisos) {
                return res.status(404).json({ ok: false, msg: "Algo salio mal" });
            }
            res.json({ ok: true, msg: "se ha creado correctamente el permiso!" }); 
        } catch(error) {
            // Aquí atrapamos el error del TRIGGER de MySQL (los 3 permisos por cuatrimestre)
            if (error.errno === 1644 || error.sqlState === '45000') {
                return res.status(400).json({ ok: false, msg: error.sqlMessage })
            }
            res.status(500).json({ ok: false, mensaje: "hay un problema en el server al crear" });
        }
    },  
        
    //funcion para cancelar un permiso mediante el valor (Reciclada para Aprobar/Rechazar)
    cancelarPermiso: async (req, res) => {
        const {cancelar, id} = req.body;
        try {
            const permisos = await usersql.cancelarPermiso(cancelar, id);
            if (!permisos) {
                return res.status(404).json({ ok: false, msg: "Algo salio mal" });
            }
            res.json({ ok: true, msg: "Estado modificado correctamente!" }); 
        } catch(error) {
            res.status(500).json({ok: false, msg: "Error de serverp"});
        }
    }
}
    
module.exports = permisosControlador;