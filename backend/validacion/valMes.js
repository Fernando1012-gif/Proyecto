const dayjs = require('dayjs');

const validaciones = {
    vDia: async (req, res, next) => {
        const { fI, fecha_uso } = req.body; // <-- Ahora acepta ambos
        const fechaEvaluar = fI || fecha_uso; // <-- Lógica para elegir la que venga

        if (!fechaEvaluar) {
            return res.status(400).json({
                ok: false,
                msg: "se ocupa una fecha de inicio"
            });}
        try {
            const dia = dayjs(fechaEvaluar).day();

            if (dia === 0 || dia === 6) {
                return res.status(400).json({
                    ok: false,
                    msg: "no se permiten pases para fines de semana :v "
                });
            }
            next();
        
        } catch (error) {
            console.error();
            res.status(500).json({
                ok: false, 
                msg: "error al validar la fecha en el servidor"
            });} }
}

module.exports = validaciones;