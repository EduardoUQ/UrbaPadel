document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("admin-form");
    const inputNombre = document.getElementById("admin-name-input");
    const inputEmail = document.getElementById("admin-email-input");
    const submitButton = document.getElementById("crear-admi");
    const adminName = document.getElementById("admin-name");
    const logoutButton = document.getElementById("logout");
    const tableBody = document.getElementById("admins-table-body");
    const LOGIN_URL = "login.html";
    let idAdminActual = null;
    let administradoresActuales = [];

    const campos = [
        {
            input: inputNombre,
            error: document.getElementById("name-error"),
            nombre: "nombre",
            mensaje: "Completa el nombre del administrador"
        },
        {
            input: inputEmail,
            error: document.getElementById("email-error"),
            nombre: "email",
            mensaje: "Completa el correo electronico",
            validar: validarEmail,
            mensajeFormato: "Introduce un correo electronico valido"
        }
    ];

    if (!form || !tableBody) {
        return;
    }

    tableBody.innerHTML = "";
    prepararLogout();
    prepararFormulario();
    validarSesionAdmin();

    function validarSesionAdmin() {
        mostrarMensaje("Comprobando sesion...");

        fetch("../php/sessionAdmin.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success" || data.rol !== "admin") {
                    window.location.href = LOGIN_URL;
                    return;
                }

                idAdminActual = Number(data.id) || null;

                if (adminName) {
                    adminName.textContent = data.nombre || "Administrador";
                }

                cargarAdministradores();
            })
            .catch(error => {
                console.error("Error:", error);
                window.location.href = LOGIN_URL;
            });
    }

    function prepararLogout() {
        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener("click", function (event) {
            event.preventDefault();

            fetch("../php/logout.php")
                .then(response => response.json())
                .then(() => {
                    window.location.href = LOGIN_URL;
                })
                .catch(error => {
                    console.error("Error:", error);
                    window.location.href = LOGIN_URL;
                });
        });
    }

    function prepararFormulario() {
        campos.forEach(campo => {
            if (!campo.input || !campo.error) {
                return;
            }

            campo.input.addEventListener("blur", function () {
                validarCampo(campo);
            });
            campo.input.addEventListener("input", function () {
                campo.error.textContent = "";
                campo.input.classList.remove("input-error");
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validarFormulario()) {
                return;
            }

            crearAdministrador();
        });
    }

    function cargarAdministradores() {
        mostrarMensaje("Cargando administradores...");

        const formData = new FormData();
        formData.append("funcion", "listarAdministradores");

        fetch("../php/administradores.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar los administradores.");
                    return;
                }

                administradoresActuales = data.administradores || [];
                pintarAdministradores(administradoresActuales);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
            });
    }

    function pintarAdministradores(administradores) {
        tableBody.innerHTML = "";

        if (administradores.length === 0) {
            mostrarMensaje("Todavia no hay administradores registrados.");
            return;
        }

        administradores.forEach(administrador => {
            tableBody.appendChild(crearFilaAdministrador(administrador));
        });
    }

    function crearFilaAdministrador(administrador) {
        const tr = document.createElement("tr");
        const activo = Boolean(administrador.activo);
        const esAdminActual = Number(administrador.id) === idAdminActual;
        const accionTexto = activo ? "Desactivar" : "Activar";
        const accionClase = activo ? "danger" : "success";
        const nuevoEstado = activo ? "0" : "1";

        tr.innerHTML = `
            <td>
                <strong>${escaparHTML(administrador.nombre)}</strong>
                <span>${escaparHTML(administrador.email)}</span>
            </td>
            <td>
                <span class="status-badge${activo ? "" : " inactive"}">${activo ? "Activo" : "Inactivo"}</span>
            </td>
            <td>
                <button class="action-btn ${accionClase}" type="button" data-id-admin="${escaparHTML(administrador.id)}"${esAdminActual && activo ? " disabled" : ""}>
                    ${accionTexto}
                </button>
            </td>
        `;

        const actionButton = tr.querySelector(".action-btn");
        if (esAdminActual && activo) {
            actionButton.title = "No puedes desactivar tu propia cuenta";
        } else {
            actionButton.addEventListener("click", function () {
                const mensaje = activo
                    ? "¿Seguro que quieres desactivar este administrador?"
                    : "¿Seguro que quieres activar este administrador?";

                mostrarModalConfirmacion(mensaje, function () {
                    cambiarEstadoAdministrador(administrador.id, nuevoEstado);
                });
            });
        }

        return tr;
    }

    function crearAdministrador() {
        const formData = new FormData();
        formData.append("funcion", "crearAdministrador");

        campos.forEach(campo => {
            formData.append(campo.nombre, campo.input.value.trim());
        });

        if (submitButton) {
            submitButton.disabled = true;
        }

        fetch("../php/administradores.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(texto => {
                try {
                    return JSON.parse(texto);
                } catch (error) {
                    console.error("Respuesta no valida:", texto);
                    throw new Error("Respuesta no valida del servidor");
                }
            })
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(correcto ? data.message : (data.message || "Hubo algun fallo"), correcto, function () {
                    if (correcto) {
                        form.reset();
                        cargarAdministradores();
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Hubo algun fallo", false);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
    }

    function cambiarEstadoAdministrador(idAdministrador, activo) {
        const formData = new FormData();
        formData.append("funcion", "cambiarEstadoAdministrador");
        formData.append("idAdministrador", idAdministrador);
        formData.append("activo", activo);
        const boton = document.querySelector(`.action-btn[data-id-admin="${Number(idAdministrador)}"]`);

        if (boton) {
            boton.disabled = true;
        }

        fetch("../php/administradores.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(texto => {
                try {
                    return JSON.parse(texto);
                } catch (error) {
                    console.error("Respuesta no valida:", texto);
                    throw new Error("Respuesta no valida del servidor");
                }
            })
            .then(data => {
                const correcto = data.status === "success";
                mostrarModalMensaje(correcto ? data.message : (data.message || "Hubo algun fallo"), correcto, function () {
                    if (correcto) {
                        actualizarEstadoLocal(idAdministrador, activo);
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Hubo algun fallo", false);
            })
            .finally(() => {
                if (boton) {
                    boton.disabled = false;
                }
            });
    }

    function actualizarEstadoLocal(idAdministrador, activo) {
        const idNormalizado = Number(idAdministrador);
        const activoNormalizado = activo === "1" || activo === 1 || activo === true;

        administradoresActuales = administradoresActuales.map(administrador => {
            if (Number(administrador.id) !== idNormalizado) {
                return administrador;
            }

            return {
                ...administrador,
                activo: activoNormalizado,
                estado: activoNormalizado ? "Activo" : "Inactivo"
            };
        });

        pintarAdministradores(administradoresActuales);
    }

    function validarFormulario() {
        let formularioValido = true;

        campos.forEach(campo => {
            if (!validarCampo(campo)) {
                formularioValido = false;
            }
        });

        return formularioValido;
    }

    function validarCampo(campo) {
        const valor = campo.input.value.trim();

        if (valor === "") {
            campo.error.textContent = campo.mensaje;
            campo.input.classList.add("input-error");
            return false;
        }

        if (typeof campo.validar === "function" && !campo.validar(valor)) {
            campo.error.textContent = campo.mensajeFormato;
            campo.input.classList.add("input-error");
            return false;
        }

        campo.error.textContent = "";
        campo.input.classList.remove("input-error");
        return true;
    }

    function validarEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function mostrarMensaje(texto) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="admin-message">${escaparHTML(texto)}</td>
            </tr>
        `;
    }

    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function mostrarModalConfirmacion(mensaje, onAccept) {
        const modal = crearModal(true);
        const modalText = modal.querySelector(".modal-text");
        const modalIcon = modal.querySelector(".modal-icon");
        const cancelButton = modal.querySelector(".modal-cancel");
        const acceptButton = modal.querySelector(".modal-accept");

        modalText.textContent = mensaje;
        modalIcon.className = "modal-icon modal-icon-warning";
        modalIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
        cancelButton.hidden = false;
        acceptButton.textContent = "Aceptar";
        modal.hidden = false;

        cancelButton.onclick = function () {
            modal.hidden = true;
        };
        acceptButton.onclick = function () {
            modal.hidden = true;
            if (typeof onAccept === "function") {
                onAccept();
            }
        };
    }

    function mostrarModalMensaje(mensaje, correcto, onClose) {
        const modal = crearModal(false);
        const modalText = modal.querySelector(".modal-text");
        const modalIcon = modal.querySelector(".modal-icon");
        const cancelButton = modal.querySelector(".modal-cancel");
        const acceptButton = modal.querySelector(".modal-accept");

        modalText.textContent = mensaje;
        modalIcon.className = correcto ? "modal-icon modal-icon-success" : "modal-icon modal-icon-error";
        modalIcon.innerHTML = correcto ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
        cancelButton.hidden = true;
        acceptButton.textContent = "Aceptar";
        modal.hidden = false;

        acceptButton.onclick = function () {
            modal.hidden = true;
            if (typeof onClose === "function") {
                onClose();
            }
        };
    }

    function crearModal() {
        let modal = document.getElementById("admins-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "admins-modal";
        modal.className = "modal-backdrop";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="modal-box" role="dialog" aria-modal="true">
                <span class="modal-icon" aria-hidden="true"></span>
                <p class="modal-text"></p>
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel" type="button">Cancelar</button>
                    <button class="btn btn-primary modal-accept" type="button">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }
});
