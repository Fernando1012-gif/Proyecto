//importamos el modelo sql propio de permisos
const usersql = require('../modelos/sqlPermiso');

////creamos el objeto con las funciones 
const permisosControlador = {
    verPermisos: async (req, res) => {
        const {id} = req.usuario;
        console.log(id);
        try {
            //sacamos id del objeto usuario
            
            //mandamos id en la consulta sql
            const permisos = await usersql.obtenerPermisos(id);
            if (!permisos) {
                return res.status(404).json({
                    ok: false,
                    msg: "ALgo salio mal :v"
                });}
            res.json({
                ok: true, 
                data: permisos
            });
        } catch(error) {
            console.log(error);
            res.status(500).json({ok: false, msg: "Error de server"});
        }
    }, 
    //funcion para modificar permisos
    //recibe los datos del frontend 
    modPermisos: async (req, res) => {
        //sacamos del body los datos que nos interesan
        const {tipo, fI, fF, cD, motivo, id} = req.body;
        try {
            //intentamos hacer la consulta sql 
            const permisos = await usersql.modPermiso(tipo, fI, fF, cD, motivo, id);
            //sino devuelve nada damos el error
            if (!permisos) {
                console.log(permisos);
                return res.status(404).json({
                    ok: false,
                    msg: "Algo salio mal"
                });}
                //si devuelve algo damos el mensaje de exito :v
            res.json({
                ok: true,
                msg: "SE ha modificado correctamente el permiso"
            });
            //catch para manejar erroreees
        } catch(error) {
            console.log(error);
            res.status(500).json({ok: false, msg: "Error de serverp"});
        }},
        //funcion para crearun permiso obtenemos los datos del frontend
    crearPermiso: async (req, res) => {
        //sacamos del body los datos que nos interesan
        const {us, tipo, fI, fF, cD, motivo} = req.body;
        try {
            const permisos = await usersql.crearPermiso(us, tipo, fI, fF, cD, motivo);
            if (!permisos) {
                console.log(permisos);
                return res.status(404).json({
                    ok: false,
                    msg: "Algo salio mal"
                });}
                res.json({
                ok: true,
                msg: "se ha creado correctamente el permiso!"
        }); 
    } catch(error) {
            if (error.errno === 1644 || error.sqlState === '45000') {
                return res.status(400).json({
                    ok: false,
                    msg: error.sqlMessage
                })}
            console.error();
            res.status(500).json({ 
                ok: false, 
                mensaje: "hay un problema en el server" 
        });}},  
    //funcion para cancelar un permiso mediante el valor 1
    cancelarPermiso: async (req, res) => {
        const {id, cancelar} = req.body;
        try {
            const permisos = await usersql.cancelarPermiso(cancelar, id);
            if (!permisos) {
                console.log(permisos);
                return res.status(404).json({
                    ok: false,
                    msg: "Algo salio mal"
                });}
            res.json({
                ok: true,
                msg: "se ha cancelado correctamente el permisop!"
            }); 
        } catch(error) {
            console.log(error);
            res.status(500).json({ok: false, msg: "Error de serverp"});
    }}

        }
    
//exportamos el objeto para que rutas js pueda acceder a el
module.exports = permisosControlador;