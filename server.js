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



// --- NUEVAS RUTAS PARA GESTIÓN DE PERMISOS ---

// Obtener permisos filtrados por estado (pendientes, aceptado, rechazado)
app.get("/api/permisos/:estado", (req, res) => {
    const estadoSolicitado = req.params.estado;
    const sql = "SELECT * FROM permisos_goce WHERE estado = ?";

    conexion.query(sql, [estadoSolicitado], (error, results) => {
        if (error) {
            console.error("Error al consultar permisos:", error);
            return res.status(500).json({ success: false, mensaje: "Error en la base de datos" });
        }
        res.json(results);
    });
});

//  Para cambiar el estado de un permiso (El jefe acepta o rechaza)
app.post("/api/permisos/actualizar", (req, res) => {
    const { id, nuevoEstado } = req.body; 
    const sql = "UPDATE permisos_goce SET estado = ? WHERE id = ?";

    conexion.query(sql, [nuevoEstado, id], (error, result) => {
        if (error) {
            console.error("Error al actualizar:", error);
            return res.status(500).json({ success: false, mensaje: "No se pudo actualizar el estado" });
        }
        res.json({ success: true, mensaje: "Estado actualizado con éxito" });
    });
});


// --- GESTIÓN DE PERMISOS PARA EL JEFE ---

//  Ruta para obtener la lista según el estado (pendientes, aceptados o rechazados)
app.get("/api/permisos/:estado", (req, res) => {
    const estado = req.params.estado;
    const sql = "SELECT * FROM permisos_goce WHERE estado = ?";

    conexion.query(sql, [estado], (error, results) => {
        if (error) {
            return res.status(500).json({ success: false, mensaje: "Error al consultar la base de datos" });
        }
        res.json(results);
    });
});

//  Ruta para que el jefe pueda cambiar el estado (Aceptar/Rechazar)
app.post("/api/permisos/actualizar", (req, res) => {
    const { id, nuevoEstado } = req.body; 
    const sql = "UPDATE permisos_goce SET estado = ? WHERE id = ?";

    conexion.query(sql, [nuevoEstado, id], (error, result) => {
        if (error) {
            return res.status(500).json({ success: false, mensaje: "Error al actualizar el permiso" });
        }
        res.json({ success: true, mensaje: "Estado actualizado correctamente" });
    });
});





app.listen(3000, () => {
    console.log("Servidor corriendo en http://localhost:3000");
});