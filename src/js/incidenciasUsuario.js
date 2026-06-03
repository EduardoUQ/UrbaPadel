import {
    API,
    URLS,
    ROLES,
    RESPUESTAS,
    TIPOS_ALERTA,
    MENSAJES,
    API_INCIDENCIAS,
    FUNCIONES_INCIDENCIA,
    ESTADOS_INCIDENCIA,
    TEXTOS_ESTADOS_INCIDENCIA,
    FORM_FIELDS_INCIDENCIA,
    MENSAJES_INCIDENCIAS
} from "./config/constantes.js";

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

    if (!form || !tableBody) {
        return;
    }

    prepararLogout();
    prepararEventos();
    validarSesionUsuario();

    function validarSesionUsuario() {
        mostrarMensaje(MENSAJES_INCIDENCIAS.COMPROBANDO_SESION);

        fetch(API.SESSION_USUARIO)
            .then(response => response.json())
            .then(data => {
                if (data.status !== RESPUESTAS.SUCCESS || data.rol !== ROLES.USUARIO) {
                    window.location.href = URLS.LOGIN;
                    return;
                }

                if (usuarioName) {
                    usuarioName.textContent = data.nombre_usuario || MENSAJES.USUARIO_GENERICO;
                    mostrarMenuSuperusuario(data.superusuario);
                }

                cargarDatos();
            })
            .catch(error => {
                console.error("Error:", error);
                window.location.href = URLS.LOGIN;
            });
    }

    function prepararLogout() {
        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener("click", function (event) {
            event.preventDefault();

            fetch(API.LOGOUT)
                .then(response => response.json())
                .then(() => {
                    window.location.href = URLS.LOGIN;
                })
                .catch(error => {
                    console.error("Error:", error);
                    window.location.href = URLS.LOGIN;
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
        fetch(API_INCIDENCIAS.LISTAR_ESPACIOS)
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== RESPUESTAS.SUCCESS) {
                    mostrarModalMensaje(data.message || MENSAJES_INCIDENCIAS.ERROR_CARGAR_ESPACIOS, false);
                    return;
                }

                pintarEspacios(data.espacios || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje(MENSAJES_INCIDENCIAS.ERROR_CARGAR_ESPACIOS_SERVIDOR, false);
            });
    }

    function cargarIncidencias() {
        mostrarMensaje(MENSAJES_INCIDENCIAS.CARGANDO_INCIDENCIAS);

        fetch(API_INCIDENCIAS.LISTAR_INCIDENCIAS)
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== RESPUESTAS.SUCCESS) {
                    mostrarMensaje(data.message || MENSAJES_INCIDENCIAS.ERROR_CARGAR_INCIDENCIAS, TIPOS_ALERTA.ERROR);
                    actualizarContador(0);
                    return;
                }

                pintarIncidencias(data.incidencias || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje(MENSAJES_INCIDENCIAS.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
                actualizarContador(0);
            });
    }

    function pintarEspacios(espacios) {
        selectEspacio.innerHTML = `<option value="">${MENSAJES_INCIDENCIAS.PLACEHOLDER_ESPACIO}</option>`;

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
            mostrarMensaje(MENSAJES_INCIDENCIAS.NO_HAY_INCIDENCIAS);
            return;
        }

        incidencias.forEach(incidencia => {
            tableBody.appendChild(crearFilaIncidencia(incidencia));
        });
    }

    function crearFilaIncidencia(incidencia) {
        const tr = document.createElement("tr");
        const resuelta = Boolean(incidencia.resuelto);
        const claseEstado = resuelta ? ESTADOS_INCIDENCIA.RESUELTA : ESTADOS_INCIDENCIA.PENDIENTE;
        const textoEstado = resuelta ? TEXTOS_ESTADOS_INCIDENCIA.RESUELTA : TEXTOS_ESTADOS_INCIDENCIA.PENDIENTE;

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
            mostrarError(selectEspacio, errorEspacio, MENSAJES_INCIDENCIAS.SELECCIONA_ESPACIO);
            valido = false;
        }

        if (comentarioInput.value.trim() === "") {
            mostrarError(comentarioInput, errorComentario, MENSAJES_INCIDENCIAS.ESCRIBE_INCIDENCIA);
            valido = false;
        } else if (comentarioInput.value.trim().length < 10) {
            mostrarError(comentarioInput, errorComentario, MENSAJES_INCIDENCIAS.INCIDENCIA_MINIMA);
            valido = false;
        }

        return valido;
    }

    function crearIncidencia() {
        const formData = new FormData();
        formData.append(FORM_FIELDS_INCIDENCIA.FUNCION, FUNCIONES_INCIDENCIA.CREAR_INCIDENCIA);
        formData.append(FORM_FIELDS_INCIDENCIA.ID_ESPACIO, selectEspacio.value);
        formData.append(FORM_FIELDS_INCIDENCIA.COMENTARIO, comentarioInput.value.trim());

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = MENSAJES_INCIDENCIAS.ENVIANDO;
        }

        fetch(API_INCIDENCIAS.CREAR_INCIDENCIA, {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === RESPUESTAS.SUCCESS;

                mostrarModalMensaje(
                    correcto
                        ? MENSAJES_INCIDENCIAS.INCIDENCIA_ENVIADA
                        : (data.message || MENSAJES_INCIDENCIAS.ERROR_ENVIAR_INCIDENCIA),
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
                mostrarModalMensaje(MENSAJES_INCIDENCIAS.ERROR_SERVIDOR, false);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = MENSAJES_INCIDENCIAS.ENVIAR_INCIDENCIA;
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

    function mostrarMensaje(texto, tipo = TIPOS_ALERTA.INFO) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="spaces-message">
                    <urba-alert tipo="${tipo}" mensaje="${escaparHTML(texto)}"></urba-alert>
                </td>
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
            throw new Error(MENSAJES_INCIDENCIAS.RESPUESTA_NO_VALIDA);
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

    function mostrarMenuSuperusuario(esSuperusuario) {
        const superuserMenu = document.getElementById("superuser-menu");

        if (!superuserMenu) {
            return;
        }

        superuserMenu.hidden = !(esSuperusuario === true || Number(esSuperusuario) === 1);
    }
});