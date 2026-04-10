//importamos el modelo de sql para poder usar las funciones de ahi adentro
const bcrypt = require('bcryptjs');
const usersql = require('../modelos/sqlLogin');
const jwt = require('jsonwebtoken');
//creamos el objeto que contentra las funciones con la logica
const loginControlador = {
    //esta es la funcion que se menciona en rutasLogin.js
    verPerfil: async (req, res) => {
        try{
        //se saca el id de para poder meterla en la consulta sql
        const {id} = req.usuario;
        //con este le hablamos al archivo sql y a la funcion que hay ahi adentro
        //le pasamos el id de la url para que lo meta como argumento en la consulta sql
        const usuario = await usersql.buscarId(id);
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: "No existe el id :v"
            });}
        delete usuario.contraseña;
            //si existe respondemos con los datos que nos arrojo sql
        res.json({
            ok: true,
            data: usuario
            });
        //en caso de error mandamos el aviso
        }catch(error){
                res.status(500).json({ok: false, msg: "Error en el servidor"});
            }
    },
    //funcion para hacer login con correo y password
    //funcion para hacer login con correo y password
    iniciarLogin: async (req, res) => {
        //obtenemos los datos del body que nos han enviado
        const { correo, password } = req.body;
        try {
            //primero usamos una funcion para ver si existe el correo 
            const usuario = await usersql.buscarCorreo(correo);
            //sino existe detenemos y avisamos
            if(!usuario){
                return res.status(401).json({ok: false, msg: "Datos incorrectos"});    
            }
            //usamos un comparador para ver si la contraseña es correcta
            //en este caso sacamos la password del front y el hash de la db
            const passwordCorrecto = await bcrypt.compare(password, usuario.contraseña);
            //sino es correcta damos el aviso
            if(!passwordCorrecto) {
                return res.status(401).json({ok: false, msg: "Datos incorrectos"});
            }
            //creamos el payload para hacer nuestro token de sesion :v
            const payload = {
                id: usuario.id,
                rol: usuario.rol
            }
            //obtenemos nuestro token dando como argumentos el payload y el secreto
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: '4h'
            });
            //creamos una copia de usuario :P
            const usuarioSeg = { ...usuario };
            //borramos el dato password si es que existe por seguridad
            delete usuarioSeg.contraseña;
            //respondemos al front con un json: datos del usuario y el token de sesion
            res.json({
                ok: true, 
                msg: "Credenciales correctas!!!",
                usuario: usuarioSeg,
                token});
        //si algo sale mal avisamos :v
        } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: "Error interno" });
    }},

    //nueva funcion para revalidar 
    nuevoToken: async (req, res) => {
        try {
            const { id } = req.usuario;
            
            const usuario = await usersql.buscarId(id);
            
            if (!usuario) {
                return res.status(401).json({ ok: false, msg: "Usuario no encontrado" });
            }

            const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
                expiresIn: '4h'
            });

            const usuarioSeg = { ...usuario };
            delete usuarioSeg.contraseña;

            res.json({
                ok: true,
                usuario: usuarioSeg,
                token
            });
        } catch (error) {
            res.status(500).json({ ok: false, msg: "Error al revalidar" });
        }
    },
    //funcion para actualizar la contraseña
    acContraseña: async (req, res) => {
        //sacamos parametros del body proporcionado por el front
        const { password, npassword } = req.body;
        const { id } = req.usuario;
        try {
            //buscamos datos del usuario
            const usuario = await usersql.buscarId(id);
            //comparamos si la password dada es igual a la de la db 
            const coincide = await bcrypt.compare(password, usuario.contraseña);
            //usamos una funcion para ver si es igual
            if(!coincide) {
                return res.status(401).json({ok: false, msg: "Error en la contraseña"});
            }
            //creamos la seguridad para hashear la nueva contraseña
            const nueva = await bcrypt.genSalt(10);
            //hasheamos la nueva contraseña 
            const nuevapass = await  bcrypt.hash(npassword, nueva);
            //usamos la funcion de sql para actualizar la contraseña
            await usersql.actContraseña(nuevapass, id);
            //avisamos que se cambio correctamente
            res.json({ok: true, msg: "La contraseña se ha cambiado!!!!"});
        } catch (error) {
        //si algo falla, avisamos :v
        res.status(500).json({ok: false, msg: "Error en el server"});
    }
},
//nueva funcion para revalidar 
    nuevoToken: async (req, res) => {
        const { id, rol, nombre_completo } = req.usuario;
        
        const token = jwt.sign({id, rol, nombre_completo}, process.env.JWT_SECRET, {
                expiresIn: '4h'
            });
            res.json({
                ok: true,
                usuario: {id, rol, nombre_completo},
                token
            });
}
}
//con esto exportamos el objeto y sus funciones para que cualquier archivo pueda usarlo
//se llamara "logincontrolador"
module.exports = loginControlador;