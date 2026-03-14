// 1. Selección de elementos
const formulario = document.getElementById("loginform"); 
const usuarioInput = document.getElementById("usuario");
const contraseñaInput = document.getElementById("contraseña");
const rolSelect = document.getElementById("rol");

const errorUsuario = document.getElementById("usuarioerror");
const errorContraseña = document.getElementById("contraseñaerror");

let mensajeExito = document.getElementById("successMessage");

formulario.addEventListener("submit", (e) => {
    e.preventDefault();

    errorUsuario.style.display = "none";
    errorContraseña.style.display = "none";
    usuarioInput.style.borderBottomColor = "#9f2626"; 
    contraseñaInput.style.borderBottomColor = "#9f2626";

    const usuario = usuarioInput.value.trim();
    const contraseña = contraseñaInput.value.trim();
    const rol = rolSelect.value;

    // --- VALIDACIÓN DE USUARIO ---
    if (usuario.length < 3) {
        errorUsuario.textContent = "El usuario debe tener al menos 3 caracteres";
        errorUsuario.style.display = "block";
        usuarioInput.style.borderBottomColor = "red";
        usuarioInput.focus();
        return;
    }

    // --- VALIDACIÓN DE CONTRASEÑA ---
    const tieneNumero = /\d/.test(contraseña);
    const tieneMayuscula = /[A-Z]/.test(contraseña);

    if (contraseña.length < 8 || !tieneNumero || !tieneMayuscula) {
        errorContraseña.textContent = "Mínimo 8 caracteres, una Mayúscula y un Número";
        errorContraseña.style.display = "block";
        contraseñaInput.style.borderBottomColor = "red";
        contraseñaInput.focus();
        return;
    }
    mostrarExito(rol);
});

function mostrarExito(rol) {
    const aviso = document.createElement("div");
    aviso.innerHTML = `<strong>¡Acceso Aceptado!</strong><br>Entrando como ${rol}...`;
    
    Object.assign(aviso.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        backgroundColor: "#1b5e20",
        color: "white",
        padding: "20px",
        borderRadius: "10px",
        fontFamily: "'Graduate'",
        boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        zIndex: "1000"
    });

///Pendiente para el rol de cada pagina!!!!!!!!!!
    document.body.appendChild(aviso);
    setTimeout(() => {
        if (rol === "docente") {
            window.location.href = "principal.html"; 
        } else if(rol==="administrador"){
            window.location.href="";
        } else if (rol === "RRHH"){
            window.location.href="";
        }
    }, 2000);
}