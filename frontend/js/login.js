//ruta api login
const API_URL = 'http://localhost:3000/api/login/login'; 

//se seleccionan los elementps del dom
const formulario = document.getElementById("loginform");
const correoInput = document.getElementById("correo");
const contraseñaInput = document.getElementById("password");
const errorCorreo = document.getElementById("correoerror");
const errorContraseña = document.getElementById("contraseñaerror");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    //limpiar pantalla
    errorCorreo.style.display = "none";
    errorContraseña.style.display = "none";

    //limpiar inputs
    const correo = correoInput.value.trim();
    const contraseña = contraseñaInput.value.trim();

    //validacion de correo
    if (correo === "") {
        errorCorreo.textContent = "Ingrese su correo institucional";
        errorCorreo.style.display = "block";
        return;
    }
    //validacion de password
    if (contraseña === "") {
        errorContraseña.textContent = "Ingrese su contraseña";
        errorContraseña.style.display = "block";
        return;
    }

    try {
        //se llama al backend
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                correo: correo,
                password: contraseña
            })
        });
        //esperamos la respuesta
        const data = await response.json();

        if (data.ok) {
            //guardamos el token)
            localStorage.setItem('token', data.token);
            //guardamos usuario
            localStorage.setItem('usuario', JSON.stringify(data.usuario));

            const rol = data.usuario.rol;
            if (rol === "Administrador") {
                window.location.href = "vista_jefe_inmediato.html";
            } 
            else if (rol === "Docente") {
                window.location.href = "principal.html";
            } 
            else if (rol === "RRHH") {
                window.location.href = "vistaRH.html";
            } 
            else {
                // Si el rol existe pero no está mapeado aquí
                console.warn("Rol detectado pero no configurado para redirección:", rol);
                alert("Acceso correcto, pero no tienes una vista asignada para el rol: " + rol);
            }

        } else {
            //si ok es false
            alert(data.msg || data.mensaje || "Credenciales incorrectas");
        }
    } catch (error) {
        //errir 
                console.error("Error fatal en el fetch:", error);
        alert("Error crítico: No se pudo conectar con el servidor. ¿Está encendido el Backend?");
    }
});