
// Importamos el modelo SQL para pases 
const pasesSql = require('../modelos/sqlPase'); 

const pasesControlador = {
    // 1. Crear una nueva solicitud de pase
    crearPase: async (req, res) => {
        try {
            const { fecha_uso, hora_inicio, hora_fin, motivo } = req.body;
            const { id: usuario_id } = req.usuario;

            if (!fecha_uso || !hora_inicio || !motivo) {
                return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios :v" });
            }

            const pasesEsteMes = await pasesSql.contarPasesMensuales(usuario_id);
            if (pasesEsteMes >= 3) {

                return res.status(403).json({ ok: false, msg: "Límite alcanzado: Solo puedes pedir 3 pases por mes :P" });
            }

            const resultado = await pasesSql.crearPase(usuario_id, fecha_uso, hora_inicio, hora_fin, motivo);
            res.json({ ok: true, msg: "Pase creado con éxito" });

        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error de servidor al crear pase" });
        }
    },

    // 2. Ver pases del usuario logueado (Para el Docente)
    verMisPases: async (req, res) => {
        try {
            const { id } = req.usuario;
            const pases = await pasesSql.obtenerPases(id);
            res.json({ ok: true, data: pases });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al obtener pases" });
        }
    },

    // 3. NUEVA FUNCIÓN: Ver TODOS los pases (Para RH y Jefe Inmediato)
    verTodos: async (req, res) => {
        try {
            // Mandamos llamar una función SQL sin el filtro WHERE usuario_id
            // Asegúrate de tener: obtenerTodosPases: async () => { ... const sql = 'select * from pases_salida'; ... } en sqlPase.js
            const pases = await pasesSql.obtenerTodosPases(); 
            res.json({ ok: true, data: pases });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al obtener todos los pases" });
        }
    },

    // 4. Cancelar un pase (y Aprobar/Rechazar reciclando esta función)
    cancelarPase: async (req, res) => {
        const { id, cancelar } = req.body;
        try {
            const paseActualizado = await pasesSql.cancelarPase(cancelar, id);
            if (!paseActualizado) {
                return res.status(404).json({ ok: false, msg: "Algo salio mal" });
            }
            res.json({ ok: true, msg: "Estado de pase actualizado correctamente" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al actualizar estado" });
        }
    },

    // 5. Modificar un pase
    modificarPase: async (req, res) => {
        try {
            const { id, fecha_uso, hora_inicio, motivo } = req.body;
            await pasesSql.modPase(fecha_uso, hora_inicio, motivo, id);
            res.json({ ok: true, msg: "Pase modificado" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al modificar" });
        }
    }
};

module.exports = pasesControlador;