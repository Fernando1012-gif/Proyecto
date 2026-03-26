require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

//midlewares
app.use(express.json());
app.use(cookieParser());
//desactivamos las seguridad por el momento
app.use(helmet({
    contentSecurityPolicy: false 
}));
//configuracion de rutas estaticas
app.use(express.static(path.join(__dirname, "..", "frontend")));

//ruta principal para entrar idrectamente al login
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});
//importamos las rutas api de nuestra app web
const rutasLogin = require('./rutas/rutaLogin'); 
const rutasPermisos = require('./rutas/rutaPermiso');
const rutasPases = require('./rutas/rutaPase'); 
//usamos las apis
app.use('/api/login', rutasLogin);
app.use('/api/permisos', rutasPermisos);
app.use('/api/pases', rutasPases); 

//puerto que usaremos
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});