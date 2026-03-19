// Importamos el modelo SQL para pases (debes crear este archivo en modelos/sqlPases.js)
const pasesSql = require('../modelos/sqlPases');

const pasesControlador = {

    // 1. Crear una nueva solicitud de pase
    crearPase: async (req, res) => {
        try {
            // Obtenemos datos del body
            const { fecha_uso, hora_inicio, motivo } = req.body;
            // El ID viene del middleware de autenticación (req.usuario)
            const { id: usuario_id } = req.usuario;

            // Validación: No dejar campos vacíos
            if (!fecha_uso || !hora_inicio || !motivo) {
                return res.status(400).json({ ok: false, msg: "Faltan campos obligatorios :v" });
            }

            // Lógica de negocio: Consultar cuántos pases lleva el usuario este mes
            const pasesEsteMes = await pasesSql.contarPasesMensuales(usuario_id);
            
            if (pasesEsteMes >= 3) {
                return res.status(403).json({ 
                    ok: false, 
                    msg: "Límite alcanzado: Solo puedes pedir 3 pases por mes :P" 
                });
            }

            // Si pasa la validación, insertamos en la DB
            const nuevoPase = {
                usuario_id,
                fecha_uso,
                hora_inicio,
                motivo,
                estado: 'Pendiente' // Estado por defecto
            };

            const resultado = await pasesSql.insertarPase(nuevoPase);

            res.status(201).json({
                ok: true,
                msg: "Solicitud de pase enviada con éxito!!!",
                data: { id: resultado.insertId, ...nuevoPase }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, msg: "Error en el servidor al crear pase" });
        }
    },

    // 2. Ver el historial de pases del docente logueado
    verMisPases: async (req, res) => {
        try {
            const { id } = req.usuario;
            const pases = await pasesSql.obtenerPasesPorUsuario(id);
            
            res.json({
                ok: true,
                data: pases
            });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al obtener tus pases" });
        }
    },

    // 3. Cancelar un pase (Solo si sigue pendiente)
    cancelarPase: async (req, res) => {
        try {
            const { id } = req.params; // ID del pase desde la URL
            const usuario_id = req.usuario.id;

            // Verificar si el pase existe y pertenece al usuario
            const pase = await pasesSql.buscarPasePorId(id);

            if (!pase || pase.usuario_id !== usuario_id) {
                return res.status(404).json({ ok: false, msg: "Pase no encontrado" });
            }

            if (pase.estado !== 'Pendiente') {
                return res.status(400).json({ ok: false, msg: "No puedes cancelar un pase ya revisado" });
            }

            await pasesSql.eliminarPase(id);
            res.json({ ok: true, msg: "Pase cancelado correctamente" });

        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al cancelar" });
        }
    }
};

module.exports = pasesControlador;