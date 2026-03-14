const express = require("express");
const cors = require("cors");
const path = require("path");
const conexion = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

app.post("/login", (req, res) => {
    const { correo_institucional, contraseña } = req.body;
    const sql = "SELECT * FROM usuarios WHERE correo_institucional = ? AND contraseña = ?";

    conexion.query(sql, [correo_institucional, contraseña], (error, result) => {
        if (error) {
            res.status(500).json({ success: false, mensaje: "Error en el servidor" });
            return;
        }

        if (result.length > 0) {
            res.json({
                success: true,
                mensaje: "Login correcto",
                rol: result[0].rol
            });
        } else {
            res.status(401).json({
                success: false,
                mensaje: "Usuario o contraseña incorrectos"
            });
        }
    });
});

app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});