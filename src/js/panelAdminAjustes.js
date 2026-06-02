document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("password-form");
    const submitButton = document.getElementById("change-password-button");
    const accountName = document.getElementById("account-name");
    const logoutButton = document.getElementById("logout");
    const homeLink = document.getElementById("home-link");
    const navigation = document.getElementById("settings-navigation");
    const panelContext = document.getElementById("panel-context");
    const LOGIN_URL = "login.html";

    const campos = [
        {
            input: document.getElementById("actualpassword-input"),
            error: document.getElementById("actualpassword-error"),
            mensaje: "Completa tu contraseña actual"
        },
        {
            input: document.getElementById("newpassword-input"),
            error: document.getElementById("newpassword-error"),
            mensaje: "Completa la nueva contraseña",
            validar: esPasswordValida,
            mensajeFormato: "Debe tener mínimo 8 caracteres, mayúscula, minúscula, número y símbolo"
        },
        {
            input: document.getElementById("repassword-input"),
            error: document.getElementById("repassword-error"),
            mensaje: "Confirma la nueva contraseña",
            validar: function (valor) {
                return valor === document.getElementById("newpassword-input").value;
            },
            mensajeFormato: "Las nuevas contraseñas no coinciden"
        }
    ];

    if (!form) {
        return;
    }

    prepararLogout();
    prepararFormulario();
    prepararPasswordToggles();
    validarSesion();

    function validarSesion() {
        Promise.all([
            comprobarSesion("../php/sessionAdmin.php"),
            comprobarSesion("../php/sessionUsuario.php")
        ]).then(respuestas => {
            const sesion = respuestas.find(data => data && data.status === "success");

            if (!sesion) {
                window.location.href = LOGIN_URL;
                return;
            }

            configurarPanel(sesion);
        });
    }

    function comprobarSesion(url) {
        return fetch(url)
            .then(response => response.json())
            .catch(error => {
                console.error("Error:", error);
                return null;
            });
    }

    function configurarPanel(sesion) {
        if (sesion.rol === "usuario") {
            accountName.textContent = sesion.nombre_usuario || "Usuario";
            panelContext.textContent = "Panel Usuario";
            homeLink.href = "panelUsuario.html";
            navigation.setAttribute("aria-label", "Panel usuario");
            navigation.innerHTML = `
                <a href="panelUsuario.html" class="nav-item">
                    <i class="fa-solid fa-table-cells-large"></i>
                    <span>Mis Espacios</span>
                </a>
                <a href="misReservas.html" class="nav-item">
                    <i class="fa-solid fa-calendar-days"></i>
                    <span>Mis Reservas</span>
                </a>
                <a href="incidenciasUsuario.html" class="nav-item">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Incidencias</span>
                </a>
            `;
            return;
        }

        accountName.textContent = sesion.nombre || "Administrador";
    }

    function prepararLogout() {
        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener("click", function (event) {
            event.preventDefault();

            fetch("../php/logout.php")
                .finally(() => {
                    window.location.href = LOGIN_URL;
                });
        });
    }

    function prepararFormulario() {
        campos.forEach(campo => {
            campo.input.addEventListener("blur", function () {
                validarCampo(campo);
            });
            campo.input.addEventListener("input", function () {
                limpiarError(campo);
            });
        });

        document.getElementById("newpassword-input").addEventListener("input", function () {
            limpiarError(campos[2]);
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (validarFormulario()) {
                cambiarContrasena();
            }
        });
    }

    function prepararPasswordToggles() {
        document.querySelectorAll(".password-toggle").forEach(button => {
            button.addEventListener("click", function () {
                const input = button.parentElement.querySelector("input");
                const mostrar = input.type === "password";
                const icon = button.querySelector("i");

                input.type = mostrar ? "text" : "password";
                button.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
                button.setAttribute("aria-pressed", String(mostrar));
                icon.className = mostrar ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
            });
        });
    }

    function validarFormulario() {
        let valido = true;

        campos.forEach(campo => {
            if (!validarCampo(campo)) {
                valido = false;
            }
        });

        if (valido && campos[0].input.value === campos[1].input.value) {
            campos[1].error.textContent = "La nueva contraseña debe ser distinta de la actual";
            campos[1].input.classList.add("input-error");
            valido = false;
        }

        return valido;
    }

    function validarCampo(campo) {
        const valor = campo.input.value;

        if (valor === "") {
            campo.error.textContent = campo.mensaje;
            campo.input.classList.add("input-error");
            return false;
        }

        if (campo.validar && !campo.validar(valor)) {
            campo.error.textContent = campo.mensajeFormato;
            campo.input.classList.add("input-error");
            return false;
        }

        limpiarError(campo);
        return true;
    }

    function limpiarError(campo) {
        campo.error.textContent = "";
        campo.input.classList.remove("input-error");
    }

    function esPasswordValida(password) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
    }

    function cambiarContrasena() {
        const formData = new FormData(form);
        submitButton.disabled = true;

        fetch("../php/cambiarContrasena.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                const correcto = data.status === "success";
                mostrarModalMensaje(data.message || "Hubo algún fallo", correcto, function () {
                    if (correcto) {
                        form.reset();
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor", false);
            })
            .finally(() => {
                submitButton.disabled = false;
            });
    }

    function mostrarModalMensaje(mensaje, correcto, onClose) {
        const modal = crearModal();
        const acceptButton = modal.querySelector(".modal-accept");
        const modalIcon = modal.querySelector(".modal-icon");

        modal.querySelector(".modal-text").textContent = mensaje;
        modalIcon.className = correcto ? "modal-icon modal-icon-success" : "modal-icon modal-icon-error";
        modalIcon.innerHTML = correcto ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
        modal.hidden = false;

        acceptButton.onclick = function () {
            modal.hidden = true;
            if (onClose) {
                onClose();
            }
        };
    }

    function crearModal() {
        let modal = document.getElementById("password-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "password-modal";
        modal.className = "modal-backdrop";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true">
                <span class="modal-icon" aria-hidden="true"></span>
                <p class="modal-text"></p>
                <div class="modal-actions">
                    <button class="btn btn-primary modal-accept" type="button">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }
});
