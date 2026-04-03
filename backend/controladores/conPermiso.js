//importamos el modelo sql propio de permisos
const usersql = require('../modelos/sqlPermiso');
const { enviarNotificacionEstado } = require('../correos/correo');

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

    //funcion para ver todos los permisos sin importar id
    verTodosPermisos: async (req, res) => {
        try {
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
            const io = req.app.get('socketio');
            io.emit('nuevo-permiso-creado', { msg: 'Un docente solicito un permiso' });
            res.json({ ok: true, msg: "se ha creado correctamente el permiso!" }); 
        } catch(error) {
            if (error.errno === 1644 || error.sqlState === '45000') {
                return res.status(400).json({ ok: false, msg: error.sqlMessage })
            }
            res.status(500).json({ ok: false, mensaje: "hay un problema en el server al crear" });
        }
    },  
        
    //funcion para cancelar un permiso mediante el valor (Reciclada para Aprobar/Rechazar)
    //cancelar un permiso (Aprobar/Rechazar/Cancelar)
    cancelarPermiso: async (req, res) => {
        const { cancelar, id } = req.body;
        try {
            const permisos = await usersql.cancelarPermiso(cancelar, id);
            
            if (!permisos) {
                return res.status(404).json({ ok: false, msg: "Algo salio mal" });
            }
            const docente = await usersql.obtenerInfoDocentePorPermiso(id);

            //socket para avisar en tiempo real
            const io = req.app.get('socketio');
            io.emit('permiso-actualizado', { id, nuevoEstado: cancelar });

            if (docente && docente.correo_institucional) {
                enviarNotificacionEstado(
                    docente.correo_institucional, 
                    docente.nombre_completo, 
                    "Permiso de Inasistencia", 
                    cancelar
                );
            }

            res.json({ ok: true, msg: "Estado modificado y docente notificado!" }); 

        } catch(error) {
            console.error("Error en cancelar:", error);
            res.status(500).json({ok: false, msg: "Error de server"});
        }
    }}
    
module.exports = permisosControlador;