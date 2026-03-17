// Usar ruta relativa es mejor práctica
const API_URL = 'http://localhost:3000/api/login/login'; 

const formulario = document.getElementById("loginform");
const correoInput = document.getElementById("correo");
const contraseñaInput = document.getElementById("password");
const errorCorreo = document.getElementById("correoerror");
const errorContraseña = document.getElementById("contraseñaerror");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    errorCorreo.style.display = "none";
    errorContraseña.style.display = "none";

    const correo = correoInput.value.trim();
    const contraseña = contraseñaInput.value.trim(); // <--- Variable definida

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
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo: correo,
                password: contraseña // <--- CORREGIDO: Usamos 'contraseña'
            })
        });

        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        const { rol }  = data;

        // CORREGIDO: Verificamos si es true (booleano) o si la respuesta fue exitosa
        if (data.ok === true || data.ok === "true") {
            

            // Redirección según rol
            if (rol === "Administrador") {
                window.location.href = "admin.html";
            } 
            else if (rol === "docente") {
                window.location.href = "principal.html";
            } 
            else if (rol === "RRHH") {
                window.location.href = "rrhh.html";
            } 

        } else {
            alert(data.mensaje || "Credenciales incorrectas");
        }
    } catch (error) {
        console.error("Error en la petición:", error);
        alert("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    }
});