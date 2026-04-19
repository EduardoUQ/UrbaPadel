document.addEventListener("DOMContentLoaded", () => {
    const formLogin = document.getElementById("formLogin");
    const inputNombreUsuario = document.getElementById("nombreUsuario");
    const inputPassword = document.getElementById("password");
    const mensaje = document.getElementById("mensaje");
    const mensajeUsuario = document.getElementById("mensajeUsuario");
    const mensajePassword = document.getElementById("mensajePassword");

    function validarVacioUsuario() {
        const nombreUsuario = inputNombreUsuario.value.trim();
        if (nombreUsuario === "") {
            mensajeUsuario.textContent = "*Escribe tu nombre de Usuario";
            return false;
        }
        mensajeUsuario.textContent = "";
        return true;
    }

    function validarVacioPass() {
        const pass = inputPassword.value.trim();
        if (pass === "") {
            mensajePassword.textContent = "*Escribe tu contraseña";
            return false;
        }
        mensajePassword.textContent = "";
        return true;
    }

    inputNombreUsuario.addEventListener("blur", validarVacioUsuario);
    inputPassword.addEventListener("blur", validarVacioPass);

    inputNombreUsuario.addEventListener("input", () => {
        mensajeUsuario.textContent = "";
        mensaje.textContent = "";
    });

    inputPassword.addEventListener("input", () => {
        mensajePassword.textContent = "";
        mensaje.textContent = "";
    });

    if (formLogin) {
        formLogin.addEventListener("submit", function (event) {
            event.preventDefault();

            const okUser = validarVacioUsuario();
            const okPass = validarVacioPass();

            if (!okUser || !okPass) {
                mensaje.textContent = "Por favor completa todos los campos";
                return;
            }

            const usuario = inputNombreUsuario.value.trim();
            const pass = inputPassword.value;

            procesarLogin(usuario, pass);
        });
    }

    function procesarLogin(usuario, pass) {
        let formData = new FormData();
        formData.append("funcion", "procesarLogin");
        formData.append("usuario", usuario);
        formData.append("pass", pass);

        fetch("../php/login.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success" && data.rol === 'admin') {
                    window.location.href = "../html/panelAdmiEspacios.html";
                } else if (data.status === "success" && data.rol === 'usuario') {
                    // window.location.href = "../html/panel_usuario_candidatura.html";
                } else {
                    mensaje.textContent = data.message;
                }
            })
            .catch(error => {
                console.error("Error:", error);
                mensaje.textContent = "Error al conectar con el servidor.";
            });
    }
});