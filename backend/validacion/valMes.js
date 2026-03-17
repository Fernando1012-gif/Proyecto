const dayjs = require('dayjs');

const validaciones = {
    vDia: async (req, res, next) => {
        const { fI } = req.body; 
        if (!fI) {
            return res.status(400).json({
                ok: false,
                msg: "se ocupa una fecha de inicio"
            });}
        try {
            const dia = dayjs(fI).day();

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