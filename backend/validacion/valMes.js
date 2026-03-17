const dayjs = require('dayjs');

const validaciones = {
    vDia: async (req, res, next) => {
        const { pFecha} = req.body;
        try{
            const dia = dayjs(pFecha).day();
            if(dia === 0 || dia === 6) {
                return res.status(400).json({
                    ok: false,
                    msg: "Es fin de semana"
                });}
            req.fecha = {pFecha};
            next();
        } catch(error){
            res.status(500).json({ok: false, msg: "Error en el servidor"});
            }}
}
module.exports = validaciones;