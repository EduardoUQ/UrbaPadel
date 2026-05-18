document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("incidencia-form");
    const selectEspacio = document.getElementById("idEspacio");
    const comentarioInput = document.getElementById("comentario");
    const submitButton = document.getElementById("submit-incidencia");
    const tableBody = document.getElementById("incidencias-table-body");
    const incidenciasCount = document.getElementById("incidencias-count");
    const usuarioName = document.getElementById("usuario-name");
    const logoutButton = document.getElementById("logout");

    const errorEspacio = document.getElementById("error-idEspacio");
    const errorComentario = document.getElementById("error-comentario");

    const LOGIN_URL = "login.html";

    if (!form || !tableBody) {
        return;
    }

    prepararLogout();
    prepararEventos();
    validarSesionUsuario();

    function validarSesionUsuario() {
        mostrarMensaje("Comprobando sesión...");

        fetch("../php/sessionUsuario.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success" || data.rol !== "usuario") {
                    window.location.href = LOGIN_URL;
                    return;
                }

                if (usuarioName) {
                    usuarioName.textContent = data.nombre_usuario || "Usuario";
                }

                cargarDatos();
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

    function prepararEventos() {
        selectEspacio.addEventListener("change", function () {
            limpiarError(selectEspacio, errorEspacio);
        });

        comentarioInput.addEventListener("input", function () {
            limpiarError(comentarioInput, errorComentario);
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validarFormulario()) {
                return;
            }

            crearIncidencia();
        });
    }

    function cargarDatos() {
        cargarEspacios();
        cargarIncidencias();
    }

    function cargarEspacios() {
        fetch("../php/incidenciasUsuario.php?funcion=listarEspacios")
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarModalMensaje(data.message || "No se pudieron cargar los espacios.", false);
                    return;
                }

                pintarEspacios(data.espacios || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al cargar los espacios.", false);
            });
    }

    function cargarIncidencias() {
        mostrarMensaje("Cargando incidencias...");

        fetch("../php/incidenciasUsuario.php?funcion=listarIncidencias")
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar las incidencias.");
                    actualizarContador(0);
                    return;
                }

                pintarIncidencias(data.incidencias || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
                actualizarContador(0);
            });
    }

    function pintarEspacios(espacios) {
        selectEspacio.innerHTML = '<option value="">Selecciona un espacio</option>';

        espacios.forEach(espacio => {
            const option = document.createElement("option");
            option.value = espacio.id;
            option.textContent = espacio.nombre + " - " + espacio.tipo;
            selectEspacio.appendChild(option);
        });
    }

    function pintarIncidencias(incidencias) {
        tableBody.innerHTML = "";
        actualizarContador(incidencias.length);

        if (incidencias.length === 0) {
            mostrarMensaje("Todavía no has enviado incidencias.");
            return;
        }

        incidencias.forEach(incidencia => {
            tableBody.appendChild(crearFilaIncidencia(incidencia));
        });
    }

    function crearFilaIncidencia(incidencia) {
        const tr = document.createElement("tr");
        const resuelta = Boolean(incidencia.resuelto);
        const claseEstado = resuelta ? "resuelta" : "pendiente";
        const textoEstado = resuelta ? "Resuelta" : "Pendiente";

        tr.innerHTML = `
            <td>
                <div class="incidencia-cell">
                    <strong>${escaparHTML(incidencia.espacio_nombre)}</strong>
                    <span>${escaparHTML(incidencia.espacio_tipo)}</span>
                </div>
            </td>
            <td>
                <p class="incidencia-comment">${escaparHTML(incidencia.comentario)}</p>
            </td>
            <td>${escaparHTML(incidencia.fecha_creacion)}</td>
            <td>
                <span class="status-badge ${claseEstado}">${textoEstado}</span>
            </td>
        `;

        return tr;
    }

    function validarFormulario() {
        let valido = true;

        if (!selectEspacio.value) {
            mostrarError(selectEspacio, errorEspacio, "Selecciona un espacio");
            valido = false;
        }

        if (comentarioInput.value.trim() === "") {
            mostrarError(comentarioInput, errorComentario, "Escribe una incidencia");
            valido = false;
        } else if (comentarioInput.value.trim().length < 10) {
            mostrarError(comentarioInput, errorComentario, "La incidencia debe tener al menos 10 caracteres");
            valido = false;
        }

        return valido;
    }

    function crearIncidencia() {
        const formData = new FormData();
        formData.append("funcion", "crearIncidencia");
        formData.append("idEspacio", selectEspacio.value);
        formData.append("comentario", comentarioInput.value.trim());

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner"></i><span>Enviando...</span>';
        }

        fetch("../php/incidenciasUsuario.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Incidencia enviada correctamente" : (data.message || "No se pudo enviar la incidencia"),
                    correcto,
                    function () {
                        if (correcto) {
                            form.reset();
                            cargarIncidencias();
                        }
                    }
                );
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Enviar incidencia</span>';
                }
            });
    }

    function mostrarError(input, error, mensaje) {
        error.textContent = mensaje;
        input.classList.add("input-error");
    }

    function limpiarError(input, error) {
        error.textContent = "";
        input.classList.remove("input-error");
    }

    function mostrarMensaje(texto) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="spaces-message">${escaparHTML(texto)}</td>
            </tr>
        `;
    }

    function actualizarContador(total) {
        if (!incidenciasCount) {
            return;
        }

        incidenciasCount.textContent = total === 1 ? "Mostrando 1 incidencia" : `Mostrando ${total} incidencias`;
    }

    function parsearJson(texto) {
        try {
            return JSON.parse(texto);
        } catch (error) {
            console.error("Respuesta no válida:", texto);
            throw new Error("Respuesta no válida del servidor");
        }
    }

    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function mostrarModalMensaje(mensaje, correcto, onClose) {
        const modal = crearModal();
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
        let modal = document.getElementById("incidencias-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "incidencias-modal";
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