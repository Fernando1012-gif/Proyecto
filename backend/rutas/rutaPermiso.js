const express = require('express');
const router = express.Router();
//Importamos el archivo del controlador 
const permisosControlador = require('../controladores/conPermiso');
//importamos el archivo para validar tokens(sesion)
const validarToken = require('../validacion/valLogin');
const validaciones = require('../validacion/valMes');

//primero validamos que tenga token y luego mostramos los permisos que existen
router.get('/ver', validarToken, permisosControlador.verPermisos);

//ruta para modificar un permiso mediante el metodo patch 
router.patch('/mod', validarToken, permisosControlador.modPermisos);
//ruta para crear un permiso mediante el metodo post :v
router.post('/crear', validarToken, validaciones.vDia, permisosControlador.crearPermiso);
//ruta para cancelar un permiso mediante el metodo patchhh
router.patch('/cancelar', validarToken, permisosControlador.cancelarPermiso);
//ruta para ver todos los permisos
router.get('/todos', validarToken, permisosControlador.verTodosPermisos);

module.exports = router;