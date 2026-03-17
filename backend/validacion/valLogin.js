const jwt = require('jsonwebtoken');

//creamos unc funcion para validar tokens y nadie haga nada malo si no esta en la db
const validarToken = (req, res, next) => {
    //extraemos el token del header
    const token = req.header('x-token');
    //sino existe lo volamos
    if(!token){
        return res.status(401).json({msg: 'Permisp denegado'});
    }
        try{
            //verificamos que el token del header coincida con el secreto 
            const {id, rol, nombre} = jwt.verify(token, process.env.JWT_SECRET);
            //metemos los datos en usuario para usarlos
            req.usuario = {id, rol, nombre};
            //le damos el pase a la siguiente ruta
            next();
            //si algo sale mal avisamos
        } catch(error){
            res.status(401).json({msg: 'TOKEN NO VALIDO'});
        }}
//exportamos esta funcion        
module.exports = validarToken;