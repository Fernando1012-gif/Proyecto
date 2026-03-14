const formulario = document.getElementById("loginform");
const correoInput = document.getElementById("correo");
const contraseñaInput = document.getElementById("contraseña");
const errorCorreo = document.getElementById("correoerror");
const errorContraseña = document.getElementById("contraseñaerror");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    errorCorreo.style.display = "none";
    errorContraseña.style.display = "none";

    const correo = correoInput.value.trim();
    const contraseña = contraseñaInput.value.trim();

    if (correo === "") {
        errorCorreo.textContent = "Ingrese su correo institucional";
        errorCorreo.style.display = "block";
        return;
    }

    if (contraseña === "") {
        errorContraseña.textContent = "Ingrese su contraseña";
        errorContraseña.style.display = "block";
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo_institucional: correo,
                contraseña: contraseña
            })
        });

        const data = await response.json();

        if (data.success) {
            const rol = data.rol;

            if (rol === "administrador") {
                window.location.href = "admin.html";
            } 
            else if (rol === "docente") {
                window.location.href = "principal.html";
            } 
            else if (rol === "RRHH") {
                window.location.href = "rrhh.html";
            } 
            else {
                window.location.href = "principal.html";
            }

        } else {
            alert(data.mensaje || "Acceso denegado");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo conectar con el servidor");
    }
});