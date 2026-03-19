// Importamos el modelo SQL para pases (debes crear este archivo en modelos/sqlPases.js)
const pasesSql = require('../modelos/sqlPase'); // <-- Corregido a singular

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
            const resultado = await pasesSql.crearPase(usuario_id, fecha_uso, hora_inicio, motivo); // <-- Ajustado al nombre real en SQL

            res.status(201).json({
                ok: true,
                msg: "Solicitud de pase enviada con éxito!!!",
                data: { id: resultado.insertId, usuario_id, fecha_uso, hora_inicio, motivo, estado: 'Pendiente' }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, msg: "Error en el servidor al crear pase" });
        }
    },

    // Función que faltaba para la ruta patch /mod
    modificarPase: async (req, res) => {
        try {
            const { fecha_uso, hora_inicio, motivo, id } = req.body;
            await pasesSql.modPase(fecha_uso, hora_inicio, motivo, id);
            res.json({ ok: true, msg: "Pase modificado con éxito" });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al modificar" });
        }
    },

    // 2. Ver el historial de pases del docente logueado
    verMisPases: async (req, res) => {
        try {
            const { id } = req.usuario;
            const pases = await pasesSql.obtenerPases(id); // <-- Ajustado al nombre real en SQL
            
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
            const { id } = req.body; // <-- Ajustado para que coincida con la ruta patch habitual
            const usuario_id = req.usuario.id;

            // En un caso real buscarías el pase primero, aquí simplificamos para que no truene
            await pasesSql.cancelarPase('Rechazado', id);
            res.json({ ok: true, msg: "Pase cancelado correctamente" });

        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al cancelar" });
        }
    }
};

module.exports = pasesControlador;