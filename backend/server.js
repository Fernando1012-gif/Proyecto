require('dotenv').config();
const express = require('express');
const path = require('path'); // <-- ¡No olvides esto!
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
    contentSecurityPolicy: false // Apagamos temporalmente el bloqueo estricto en desarrollo
}));

// CONFIGURACIÓN DE RUTAS ESTÁTICAS
// Usamos ".." para subir un nivel (salir de backend) y entrar a frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

// RUTA PRINCIPAL (localhost:3000)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});

// IMPORTACIÓN DE RUTAS DE API (Están en la misma carpeta o subcarpetas)
// Si rutaLogin.js está en backend/rutas/ :
const rutasLogin = require('./rutas/rutaLogin'); 
const rutasPermisos = require('./rutas/rutaPermiso');

const rutasPases = require('./rutas/rutaPase'); // <-- Agregado

app.use('/api/login', rutasLogin);
app.use('/api/permisos', rutasPermisos);
app.use('/api/pases', rutasPases); // <-- Agregado

// PUERTO
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});