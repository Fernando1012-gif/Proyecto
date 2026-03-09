require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

//importamos el archivo de rutas para poder mandar ahi el resto de la url
const rutasLogin = require('../backend/rutas/rutaLogin');
const connection = require('./bd/base');



//lanzamos la ruta de usuarios, el segundo argumento es a que archivo mandaremos el resto de la url
//por ejemplo es localhost:3000/api/login/2
//este archivo se queda con /api/login/ y el "2" que es el id lo manda al siguiente archivo 
//que nombramos como "router", mira arriba ahi esta definido
app.use('/api/login', rutasLogin);

//levantamos el server en el puerto 3001
app.listen(3001, () => {console.log("Servidor en puerto 3001")});