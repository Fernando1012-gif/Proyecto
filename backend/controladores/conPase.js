const pasesSql = require('../modelos/sqlPase');

const pasesControlador = {
    crearPase: async (req, res) => {
        try {
            const { fecha_uso, hora_inicio, motivo } = req.body;
            const { id: usuario_id } = req.usuario;

            if (!fecha_uso || !hora_inicio || !motivo) {
                return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios :v" });
            }

            const pasesEsteMes = await pasesSql.contarPasesMensuales(usuario_id);
            if (pasesEsteMes >= 3) {
                return res.status(403).json({ ok: false, msg: "Límite alcanzado" });
            }

            const resultado = await pasesSql.crearPase(usuario_id, fecha_uso, hora_inicio, motivo);
            res.status(201).json({ ok: true, msg: "Enviado", data: { id: resultado.insertId } });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error server" });
        }
    },

    verMisPases: async (req, res) => {
        try {
            const { id, rol } = req.usuario;
            let pases;

            if (rol === 'Administrador' || rol === 'RRHH') {
                pases = await pasesSql.obtenerTodos();
            } else {
                pases = await pasesSql.obtenerPases(id);
            }
            
            res.json({ ok: true, data: pases });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al obtener" });
        }
    },

    modificarPase: async (req, res) => {
        try {
            const { fecha_uso, hora_inicio, motivo, id } = req.body;
            await pasesSql.modPase(fecha_uso, hora_inicio, motivo, id);
            res.json({ ok: true, msg: "Modificado" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error" });
        }
    },

    cancelarPase: async (req, res) => {
        try {
            const { id, estado } = req.body;
            await pasesSql.cancelarPase(estado || 'Rechazado', id);
            res.json({ ok: true, msg: "Estado actualizado" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al cancelar" });
        }
    }
};

module.exports = pasesControlador;