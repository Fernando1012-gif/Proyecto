//importamos el modelo sql de pases
const pasesSql = require('../modelos/sqlPase'); 

const pasesControlador = {
    //para crearpases
    crearPase: async (req, res) => {
        try {
            const { fecha_uso, hora_inicio, hora_fin, motivo } = req.body;
            const { id: usuario_id } = req.usuario;

            if (!fecha_uso || !hora_inicio || !motivo) {
                return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios :v" });
            }

            const pasesEsteMes = await pasesSql.contarPasesMensuales(usuario_id);
            if (pasesEsteMes >= 3) {

                return res.status(403).json({ ok: false, msg: "limite alcanzado: solo puedes pedir 3 pases por mes :P" });
            }

            const resultado = await pasesSql.crearPase(usuario_id, fecha_uso, hora_inicio, hora_fin, motivo);
            res.json({ ok: true, msg: "Pase creado con éeito" });

        } catch (error) {
            res.status(500).json({ ok: false, msg: "error de servidor al crear pase" });
        }
    },

    //ver pases
    verMisPases: async (req, res) => {
        try {
            const { id } = req.usuario;
            const pases = await pasesSql.obtenerPases(id);
            res.json({ ok: true, data: pases });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "error al obtener pases" });
        }
    },

    //ver todos
    verTodos: async (req, res) => {
        try {

            res.json({ ok: true, data: pases });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "error al obtener todos los pases" });
        }
    },

    //cancelar un pase
    cancelarPase: async (req, res) => {
        const { id, cancelar } = req.body;
        try {
            const paseActualizado = await pasesSql.cancelarPase(cancelar, id);
            if (!paseActualizado) {
                return res.status(404).json({ ok: false, msg: "algo no salio bien" });
            }
            res.json({ ok: true, msg: "Estado de pase actualizado correctamente" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al actualizar estado" });
        }
    },

    //modificar un pase
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