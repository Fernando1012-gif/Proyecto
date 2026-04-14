const db = require('../bd/base'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const rootControlador = {
    loginSysadmin: async (req, res) => {
        try {
            const { user, pass } = req.body;
            if (user === process.env.ROOT_USER && pass === process.env.ROOT_PASS) {
                const token = jwt.sign(
                    { id: 'SYSADMIN', rol: 'Administrador' }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '4h' }
                );
                return res.json({ ok: true, token });
            }
            res.status(401).json({ ok: false, msg: 'INVALID_CREDENTIALS' });
        } catch (e) { res.status(500).json({ ok: false }); }
    },
    getUsuarios: async (req, res) => {
        try {
            const [data] = await db.query('SELECT id, nombre_completo, correo_institucional, rol, area_adscripcion FROM usuarios');
            res.json({ ok: true, data });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    getUsuarioId: async (req, res) => {
        try {
            const [data] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.params.id]);
            res.json({ ok: true, data: data[0] });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    crearUsuario: async (req, res) => {
        try {
            const b = req.body;
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(b.contraseña || '123456', salt);
            await db.query('INSERT INTO usuarios (nombre_completo, correo_institucional, contraseña, rol, rfc, fecha_nacimiento, fecha_ingreso, categoria, area_adscripcion, tipo_contrato) VALUES (?,?,?,?,?,?,?,?,?,?)', [b.nombre_completo, b.correo_institucional, hash, b.rol, b.rfc, b.fecha_nacimiento, b.fecha_ingreso, b.categoria, b.area_adscripcion, b.tipo_contrato]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    editarUsuario: async (req, res) => {
        try {
            const b = req.body;
            let q = 'UPDATE usuarios SET nombre_completo=?, correo_institucional=?, rol=?, rfc=?, fecha_nacimiento=?, fecha_ingreso=?, categoria=?, area_adscripcion=?, tipo_contrato=? WHERE id=?';
            let params = [b.nombre_completo, b.correo_institucional, b.rol, b.rfc, b.fecha_nacimiento, b.fecha_ingreso, b.categoria, b.area_adscripcion, b.tipo_contrato, req.params.id];
            if (b.contraseña) {
                const salt = await bcrypt.genSalt(10);
                const hash = await bcrypt.hash(b.contraseña, salt);
                q = 'UPDATE usuarios SET nombre_completo=?, correo_institucional=?, contraseña=?, rol=?, rfc=?, fecha_nacimiento=?, fecha_ingreso=?, categoria=?, area_adscripcion=?, tipo_contrato=? WHERE id=?';
                params = [b.nombre_completo, b.correo_institucional, hash, b.rol, b.rfc, b.fecha_nacimiento, b.fecha_ingreso, b.categoria, b.area_adscripcion, b.tipo_contrato, req.params.id];
            }
            await db.query(q, params);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    resetPass: async (req, res) => {
        try {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash('123456', salt);
            await db.query('UPDATE usuarios SET contraseña = ? WHERE id = ?', [hash, req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    cambiarRol: async (req, res) => {
        try {
            await db.query('UPDATE usuarios SET rol = ? WHERE id = ?', [req.body.rol, req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    eliminarUsuario: async (req, res) => {
        try {
            await db.query('DELETE FROM pases_salida WHERE usuario_id = ?', [req.params.id]);
            await db.query('DELETE FROM permisos_goce WHERE usuario_id = ?', [req.params.id]);
            await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    getPases: async (req, res) => {
        try {
            const [data] = await db.query('SELECT * FROM pases_salida');
            res.json({ ok: true, data });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    overridePase: async (req, res) => {
        try {
            const b = req.body;
            await db.query('UPDATE pases_salida SET fecha_uso=?, hora_inicio=?, hora_fin=?, estado=?, motivo=? WHERE id=?', [b.fecha_uso, b.hora_inicio, b.hora_fin, b.estado, b.motivo, req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    eliminarPase: async (req, res) => {
        try {
            await db.query('DELETE FROM pases_salida WHERE id = ?', [req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    getPermisos: async (req, res) => {
        try {
            const [data] = await db.query('SELECT * FROM permisos_goce');
            res.json({ ok: true, data });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    overridePermiso: async (req, res) => {
        try {
            const b = req.body;
            await db.query('UPDATE permisos_goce SET tipo_permiso=?, fecha_inicio=?, fecha_fin=?, cantidad_dias=?, estado=? WHERE id=?', [b.tipo_permiso, b.fecha_inicio, b.fecha_fin, b.cantidad_dias, b.estado, req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    eliminarPermiso: async (req, res) => {
        try {
            await db.query('DELETE FROM permisos_goce WHERE id = ?', [req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    getDias: async (req, res) => {
        try {
            const [data] = await db.query('SELECT * FROM dias_festivos');
            res.json({ ok: true, data });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    crearDia: async (req, res) => {
        try {
            await db.query('INSERT INTO dias_festivos (fecha, descripcion) VALUES (?,?)', [req.body.fecha, req.body.descripcion]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    },
    eliminarDia: async (req, res) => {
        try {
            await db.query('DELETE FROM dias_festivos WHERE id = ?', [req.params.id]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ ok: false, msg: e.message }); }
    }
};

module.exports = rootControlador;