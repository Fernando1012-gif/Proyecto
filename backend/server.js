require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

//importamos el archivo de rutas para poder mandar ahi el resto de la url
const rutasLogin = require('../backend/rutas/rutaLogin');
const rutasPermisos = require('../backend/rutas/rutaPermiso');
const connection = require('./bd/base');




//ruta para login js
app.use('/api/login', rutasLogin);
//ruta para permisos js :V
app.use('/api/permisos', rutasPermisos);

//levantamos el server en el puerto 3001
app.listen(3000, () => {console.log("Servidor en puerto 3001")});