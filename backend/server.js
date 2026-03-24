require('dotenv').config();
const express = require('express');
const path = require('path'); 
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
    contentSecurityPolicy: false 
}));
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "frontend", "login.html"));
});
const rutasLogin = require('./rutas/rutaLogin'); 
const rutasPermisos = require('./rutas/rutaPermiso');
const rutasPases = require('./rutas/rutaPase');

app.use('/api/login', rutasLogin);
app.use('/api/permisos', rutasPermisos);
app.use('/api/pases', rutasPases); 

// PUERTO
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});