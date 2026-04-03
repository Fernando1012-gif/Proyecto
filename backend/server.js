require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Inicializamos app primero para poder usarla en el server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } 
});

app.use(cors());
//midlewares
app.use(express.json());
app.use(cookieParser());
//seguridad desactivada por el momento
app.use(helmet({
    contentSecurityPolicy: false 
}));
app.set('socketio', io);
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
server.listen(PORT,'0.0.0.0', () => {
    console.log(`Servidor listo en http://localhost:${PORT}`);
});