const API = '/api/root';
const tkn = sessionStorage.getItem('sys_tkn');

if(!tkn) {
    window.location.href = "Rlogin.html";
}

document.getElementById('btn-logout').onclick = () => {
    sessionStorage.removeItem('sys_tkn');
    window.location.href = "Rlogin.html";
};

const fReq = async (endpoint, method = 'GET', body = null) => {
    const headers = { 'Content-Type': 'application/json', 'x-token': tkn };
    const config = { method, headers };
    if(body) config.body = JSON.stringify(body);
    try {
        const res = await fetch(`${API}${endpoint}`, config);
        if(res.status === 401 || res.status === 403) {
            sessionStorage.removeItem('sys_tkn');
            window.location.href = "Rlogin.html";
        }
        return res.json();
    } catch (err) {
        alert('FATAL SYS ERROR: ' + err.message);
    }
};

const cargarDatosPanel = async (panel) => {
    if(panel === 'sys-dashboard') cargarDashboard();
    if(panel === 'sys-usuarios') cargarUsuarios();
    if(panel === 'sys-pases') cargarPases();
    if(panel === 'sys-permisos') cargarPermisos();
    if(panel === 'sys-festivos') cargarFestivos();
};

const cargarDashboard = async () => {
    const u = await fReq('/usuarios');
    const p = await fReq('/pases');
    const pe = await fReq('/permisos');
    if(u && u.data) document.getElementById('c-users').innerText = u.data.length;
    if(p && p.data) document.getElementById('c-pases').innerText = p.data.length;
    if(pe && pe.data) document.getElementById('c-permisos').innerText = pe.data.length;
};

const cargarUsuarios = async () => {
    const res = await fReq('/usuarios');
    const tb = document.getElementById('tb-usuarios');
    tb.innerHTML = '';
    if(res && res.data) {
        res.data.forEach(u => {
            tb.innerHTML += `<tr>
                <td>${u.id}</td>
                <td>${u.nombre_completo}</td>
                <td>${u.correo_institucional}</td>
                <td>
                    <select class="form-select form-select-sm" id="u_rol_${u.id}">
                        <option value="Docente" ${u.rol==='Docente'?'selected':''}>Docente</option>
                        <option value="Administrador" ${u.rol==='Administrador'?'selected':''}>Administrador</option>
                        <option value="RRHH" ${u.rol==='RRHH'?'selected':''}>RRHH</option>
                        <option value="Jefe" ${u.rol==='Jefe'?'selected':''}>Jefe</option>
                    </select>
                </td>
                <td>${u.area_adscripcion || 'NULL'}</td>
                <td>
                    <button class="btn btn-warning btn-xs" onclick="updateRolUsuario(${u.id})">UPD_ROL</button>
                    <button class="btn btn-primary btn-xs" onclick="abrirModalUsuario(${u.id})">EDIT_ALL</button>
                    <button class="btn btn-danger btn-xs" onclick="resetPass(${u.id})">RST_PWD</button>
                    <button class="btn btn-danger btn-xs" style="background:#000;" onclick="eliminarUsuario(${u.id})">DROP</button>
                </td>
            </tr>`;
        });
    }
};

const cargarPases = async () => {
    const res = await fReq('/pases');
    const tb = document.getElementById('tb-pases');
    tb.innerHTML = '';
    if(res && res.data) {
        res.data.forEach(p => {
            tb.innerHTML += `<tr>
                <td>${p.id}</td>
                <td>${p.usuario_id}</td>
                <td><input type="date" class="form-control form-control-sm" value="${p.fecha_uso.split('T')[0]}" id="fp_${p.id}"></td>
                <td><input type="time" class="form-control form-control-sm" value="${p.hora_inicio}" id="fhi_${p.id}"></td>
                <td><input type="time" class="form-control form-control-sm" value="${p.hora_fin}" id="fhf_${p.id}"></td>
                <td>
                    <select class="form-select form-select-sm" id="sp_${p.id}">
                        <option value="Pendiente" ${p.estado==='Pendiente'?'selected':''}>Pendiente</option>
                        <option value="Vo.Bo." ${p.estado==='Vo.Bo.'?'selected':''}>Vo.Bo.</option>
                        <option value="Aprobado" ${p.estado==='Aprobado'?'selected':''}>Aprobado</option>
                        <option value="Rechazado" ${p.estado==='Rechazado'?'selected':''}>Rechazado</option>
                        <option value="Cancelado" ${p.estado==='Cancelado'?'selected':''}>Cancelado</option>
                    </select>
                </td>
                <td><input type="text" class="form-control form-control-sm" value="${p.motivo}" id="mp_${p.id}"></td>
                <td>
                    <button class="btn btn-success btn-xs" onclick="updatePase(${p.id})">FORCE_UPD</button>
                    <button class="btn btn-danger btn-xs" style="background:#000;" onclick="deletePase(${p.id})">DROP</button>
                </td>
            </tr>`;
        });
    }
};

const cargarPermisos = async () => {
    const res = await fReq('/permisos');
    const tb = document.getElementById('tb-permisos');
    tb.innerHTML = '';
    if(res && res.data) {
        res.data.forEach(p => {
            tb.innerHTML += `<tr>
                <td>${p.id}</td>
                <td>${p.usuario_id}</td>
                <td>
                    <select class="form-select form-select-sm" id="tper_${p.id}">
                        <option value="Personal" ${p.tipo_permiso==='Personal'?'selected':''}>Personal</option>
                        <option value="Salud" ${p.tipo_permiso==='Salud'?'selected':''}>Salud</option>
                        <option value="Institucional" ${p.tipo_permiso==='Institucional'?'selected':''}>Institucional</option>
                    </select>
                </td>
                <td><input type="date" class="form-control form-control-sm" value="${p.fecha_inicio.split('T')[0]}" id="fip_${p.id}"></td>
                <td><input type="date" class="form-control form-control-sm" value="${p.fecha_fin.split('T')[0]}" id="ffp_${p.id}"></td>
                <td><input type="number" class="form-control form-control-sm" value="${p.cantidad_dias}" id="dp_${p.id}" style="width:40px;"></td>
                <td>
                    <select class="form-select form-select-sm" id="sper_${p.id}">
                        <option value="Pendiente" ${p.estado==='Pendiente'?'selected':''}>Pendiente</option>
                        <option value="Vo.Bo." ${p.estado==='Vo.Bo.'?'selected':''}>Vo.Bo.</option>
                        <option value="Aprobado" ${p.estado==='Aprobado'?'selected':''}>Aprobado</option>
                        <option value="Rechazado" ${p.estado==='Rechazado'?'selected':''}>Rechazado</option>
                        <option value="Cancelado" ${p.estado==='Cancelado'?'selected':''}>Cancelado</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-success btn-xs" onclick="updatePermiso(${p.id})">FORCE_UPD</button>
                    <button class="btn btn-danger btn-xs" style="background:#000;" onclick="deletePermiso(${p.id})">DROP</button>
                </td>
            </tr>`;
        });
    }
};

const abrirModalUsuario = async (id = null) => {
    document.getElementById('mu-title').innerText = id ? `UPDATE usuarios SET... WHERE id=${id}` : 'INSERT INTO usuarios...';
    let u = {};
    if(id) {
        const res = await fReq(`/usuarios/${id}`);
        if(res.ok) u = res.data;
    }
    
    document.getElementById('mu-body').innerHTML = `
        <div class="row g-2">
            <input type="hidden" id="nu-id" value="${u.id || ''}">
            <div class="col-6"><label>nombre_completo</label><input type="text" id="nu-nom" class="form-control form-control-sm" value="${u.nombre_completo || ''}"></div>
            <div class="col-6"><label>correo_institucional</label><input type="email" id="nu-cor" class="form-control form-control-sm" value="${u.correo_institucional || ''}"></div>
            <div class="col-6"><label>contraseña</label><input type="text" id="nu-pass" class="form-control form-control-sm" placeholder="${id ? 'NULL = NO CHANGE' : 'REQUIRED'}"></div>
            <div class="col-6"><label>rol</label>
                <select id="nu-rol" class="form-select form-select-sm">
                    <option value="Docente" ${u.rol==='Docente'?'selected':''}>Docente</option>
                    <option value="Jefe" ${u.rol==='Jefe'?'selected':''}>Jefe</option>
                    <option value="RRHH" ${u.rol==='RRHH'?'selected':''}>RRHH</option>
                    <option value="Administrador" ${u.rol==='Administrador'?'selected':''}>Administrador</option>
                </select>
            </div>
            <div class="col-4"><label>rfc</label><input type="text" id="nu-rfc" class="form-control form-control-sm" value="${u.rfc || ''}"></div>
            <div class="col-4"><label>fecha_nacimiento</label><input type="date" id="nu-nac" class="form-control form-control-sm" value="${u.fecha_nacimiento ? u.fecha_nacimiento.split('T')[0] : ''}"></div>
            <div class="col-4"><label>fecha_ingreso</label><input type="date" id="nu-ing" class="form-control form-control-sm" value="${u.fecha_ingreso ? u.fecha_ingreso.split('T')[0] : ''}"></div>
            <div class="col-6"><label>categoria</label><input type="text" id="nu-cat" class="form-control form-control-sm" value="${u.categoria || ''}"></div>
            <div class="col-6"><label>area_adscripcion</label><input type="text" id="nu-area" class="form-control form-control-sm" value="${u.area_adscripcion || ''}"></div>
            <div class="col-12"><label>tipo_contrato</label><input type="text" id="nu-cont" class="form-control form-control-sm" value="${u.tipo_contrato || ''}"></div>
        </div>`;
    
    document.getElementById('mu-btn-save').onclick = guardarUsuario;
    document.getElementById('modalUniversal').style.display = 'block';
};

const guardarUsuario = async () => {
    const id = document.getElementById('nu-id').value;
    const payload = {
        nombre_completo: document.getElementById('nu-nom').value,
        correo_institucional: document.getElementById('nu-cor').value,
        rol: document.getElementById('nu-rol').value,
        rfc: document.getElementById('nu-rfc').value,
        fecha_nacimiento: document.getElementById('nu-nac').value,
        fecha_ingreso: document.getElementById('nu-ing').value,
        categoria: document.getElementById('nu-cat').value,
        area_adscripcion: document.getElementById('nu-area').value,
        tipo_contrato: document.getElementById('nu-cont').value
    };
    const pass = document.getElementById('nu-pass').value;
    if(pass) payload.contraseña = pass;
    
    const endpoint = id ? `/usuarios/${id}` : '/usuarios';
    const method = id ? 'PATCH' : 'POST';
    
    const res = await fReq(endpoint, method, payload);
    if(res.ok) {
        cerrarModal();
        cargarUsuarios();
    } else {
        alert(res.msg || 'SYS_ERR: QUERY FAILED');
    }
};

const resetPass = async (id) => {
    if(confirm('WARN: FORCE PWD TO "123456" Y/N?')) {
        const res = await fReq(`/usuarios/resetpass/${id}`, 'PATCH');
        if(res.ok) alert('SYS_MSG: 1 ROW AFFECTED');
    }
};

const updateRolUsuario = async (id) => {
    const rol = document.getElementById(`u_rol_${id}`).value;
    const res = await fReq(`/usuarios/rol/${id}`, 'PATCH', { rol });
    if(res.ok) alert('SYS_MSG: 1 ROW AFFECTED');
};

const eliminarUsuario = async (id) => {
    if(confirm('WARN: DROP USER AND CASCADING DATA Y/N?')) {
        const res = await fReq(`/usuarios/${id}`, 'DELETE');
        if(res.ok) cargarUsuarios();
    }
};

const updatePase = async (id) => {
    const payload = {
        fecha_uso: document.getElementById(`fp_${id}`).value,
        hora_inicio: document.getElementById(`fhi_${id}`).value,
        hora_fin: document.getElementById(`fhf_${id}`).value,
        estado: document.getElementById(`sp_${id}`).value,
        motivo: document.getElementById(`mp_${id}`).value
    };
    const res = await fReq(`/pases/override/${id}`, 'PATCH', payload);
    if(res.ok) alert('SYS_MSG: 1 ROW AFFECTED');
};

const deletePase = async (id) => {
    if(confirm('WARN: DROP PASE Y/N?')) {
        const res = await fReq(`/pases/${id}`, 'DELETE');
        if(res.ok) cargarPases();
    }
};

const updatePermiso = async (id) => {
    const payload = {
        tipo_permiso: document.getElementById(`tper_${id}`).value,
        fecha_inicio: document.getElementById(`fip_${id}`).value,
        fecha_fin: document.getElementById(`ffp_${id}`).value,
        cantidad_dias: document.getElementById(`dp_${id}`).value,
        estado: document.getElementById(`sper_${id}`).value
    };
    const res = await fReq(`/permisos/override/${id}`, 'PATCH', payload);
    if(res.ok) alert('SYS_MSG: 1 ROW AFFECTED');
};

const deletePermiso = async (id) => {
    if(confirm('WARN: DROP PERMISO Y/N?')) {
        const res = await fReq(`/permisos/${id}`, 'DELETE');
        if(res.ok) cargarPermisos();
    }
};

const cargarFestivos = async () => {
    const res = await fReq('/dias');
    const tb = document.getElementById('tb-festivos');
    tb.innerHTML = '';
    if(res && res.data) {
        res.data.forEach(d => {
            tb.innerHTML += `<tr>
                <td>${d.id}</td>
                <td>${d.fecha.split('T')[0]}</td>
                <td>${d.descripcion}</td>
                <td><button class="btn btn-danger btn-xs" style="background:#000;" onclick="deleteFestivo(${d.id})">DROP</button></td>
            </tr>`;
        });
    }
};

const abrirModalFestivo = () => {
    document.getElementById('mu-title').innerText = 'INSERT INTO dias_festivos...';
    document.getElementById('mu-body').innerHTML = `
        <div class="row g-2">
            <div class="col-4"><label>fecha</label><input type="date" id="nf-fec" class="form-control form-control-sm"></div>
            <div class="col-8"><label>descripcion</label><input type="text" id="nf-des" class="form-control form-control-sm"></div>
        </div>`;
    document.getElementById('mu-btn-save').onclick = guardarFestivo;
    document.getElementById('modalUniversal').style.display = 'block';
};

const guardarFestivo = async () => {
    const payload = {
        fecha: document.getElementById('nf-fec').value,
        descripcion: document.getElementById('nf-des').value
    };
    const res = await fReq('/dias', 'POST', payload);
    if(res.ok) {
        cerrarModal();
        cargarFestivos();
    }
};

const deleteFestivo = async (id) => {
    if(confirm('WARN: DROP FESTIVO Y/N?')) {
        const res = await fReq(`/dias/${id}`, 'DELETE');
        if(res.ok) cargarFestivos();
    }
};

const cerrarModal = () => { document.getElementById('modalUniversal').style.display = 'none'; };

window.onload = () => cargarDashboard();