import {
    API,
    URLS,
    ROLES,
    RESPUESTAS,
    ESTADOS_RESERVA,
    FILTROS_RESERVA,
    TIPOS_ALERTA,
    MENSAJES,
    TEXTOS_ESTADOS_RESERVA,
    CLASES_ESTADOS_RESERVA,
    FORM_FIELDS
} from "./config/constantes.js";


document.addEventListener("DOMContentLoaded", function () {
    const tableBody = document.getElementById("reservas-table-body");
    const reservasCount = document.getElementById("reservas-count");
    const usuarioName = document.getElementById("usuario-name");
    const logoutButton = document.getElementById("logout");
    const tabButtons = document.querySelectorAll(".tab-btn");

    let filtroActual = FILTROS_RESERVA.ACTIVAS;
    let reservas = [];

    if (!tableBody) {
        return;
    }

    prepararLogout();
    prepararTabs();
    validarSesionUsuario();

    function validarSesionUsuario() {
        mostrarMensaje(MENSAJES.COMPROBANDO_SESION);

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

                cargarReservas();
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

    function prepararTabs() {
        tabButtons.forEach(button => {
            button.addEventListener("click", function () {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");

                filtroActual = button.dataset.filter || FILTROS_RESERVA.ACTIVAS;
                pintarReservas();
            });
        });
    }

    function cargarReservas() {
        mostrarMensaje(MENSAJES.CARGANDO_RESERVAS);

        fetch(API.MIS_RESERVAS)
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== RESPUESTAS.SUCCESS) {
                    mostrarMensaje(data.message || MENSAJES.ERROR_CARGAR_RESERVAS, TIPOS_ALERTA.ERROR);
                    actualizarContador(0);
                    return;
                }

                reservas = data.reservas || [];
                pintarReservas();
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje(MENSAJES.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
                actualizarContador(0);
            });
    }

    function pintarReservas() {
        tableBody.innerHTML = "";

        const reservasFiltradas = reservas.filter(reserva => {
            if (filtroActual === FILTROS_RESERVA.TODAS) {
                return true;
            }

            if (filtroActual === FILTROS_RESERVA.ACTIVAS) {
                return reserva.estado_visual === ESTADOS_RESERVA.ACTIVA;
            }

            return reserva.estado_visual !== ESTADOS_RESERVA.ACTIVA;
        });

        actualizarContador(reservasFiltradas.length);

        if (reservasFiltradas.length === 0) {
            mostrarMensaje(MENSAJES.NO_HAY_RESERVAS);
            return;
        }

        reservasFiltradas.forEach(reserva => {
            tableBody.appendChild(crearFilaReserva(reserva));
        });
    }

    function crearFilaReserva(reserva) {
        const tr = document.createElement("tr");

        const claseEstado = obtenerClaseEstado(reserva.estado_visual);
        const textoEstado = obtenerTextoEstado(reserva.estado_visual);

        tr.innerHTML = `
            <td>
                <div class="reserva-cell">
                    <strong>${escaparHTML(reserva.espacio_nombre)}</strong>
                    <span>${escaparHTML(reserva.espacio_tipo)}</span>
                </div>
            </td>
            <td>${escaparHTML(reserva.fecha_reserva)}</td>
            <td>
                <div class="schedule-cell">
                    <strong>${escaparHTML(reserva.hora_inicio)} - ${escaparHTML(reserva.hora_fin)}</strong>
                    <span>${escaparHTML(reserva.urbanizacion_nombre)}</span>
                </div>
            </td>
            <td>
                <span class="status-badge ${claseEstado}">${textoEstado}</span>
            </td>
            <td>
                <div class="row-actions" aria-label="Acciones de reserva">
                    <button class="icon-btn delete js-cancelar-reserva" type="button" ${reserva.puede_cancelar ? "" : "disabled"} aria-label="Cancelar reserva">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;

        const botonCancelar = tr.querySelector(".js-cancelar-reserva");

        if (botonCancelar && reserva.puede_cancelar) {
            botonCancelar.addEventListener("click", function () {
                mostrarModalConfirmacion(MENSAJES.CONFIRMAR_CANCELACION, function () {
                    cancelarReserva(reserva.id);
                });
            });
        }

        return tr;
    }

    function cancelarReserva(idReserva) {
        const formData = new FormData();
        formData.append(FORM_FIELDS.ID_RESERVA, idReserva);

        fetch(API.CANCELAR_RESERVA, {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === RESPUESTAS.SUCCESS;

                mostrarModalMensaje(
                    correcto ? MENSAJES.RESERVA_CANCELADA : (data.message || MENSAJES.ERROR_CANCELAR_RESERVA),
                    correcto,
                    function () {
                        if (correcto) {
                            cargarReservas();
                        }
                    }
                );
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje(MENSAJES.ERROR_SERVIDOR, false);
            });
    }

    function obtenerClaseEstado(estado) {
        return CLASES_ESTADOS_RESERVA[estado] || CLASES_ESTADOS_RESERVA[ESTADOS_RESERVA.FINALIZADA];
    }

    function obtenerTextoEstado(estado) {
        return TEXTOS_ESTADOS_RESERVA[estado] || TEXTOS_ESTADOS_RESERVA[ESTADOS_RESERVA.FINALIZADA];
    }

    function mostrarMensaje(texto, tipo = TIPOS_ALERTA.INFO) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="spaces-message">
                    <urba-alert tipo="${tipo}" mensaje="${escaparHTML(texto)}"></urba-alert>
                </td>
            </tr>
        `;
    }

    function actualizarContador(total) {
        if (!reservasCount) {
            return;
        }

        reservasCount.textContent = total === 1 ? "Mostrando 1 reserva" : `Mostrando ${total} reservas`;
    }

    function parsearJson(texto) {
        try {
            return JSON.parse(texto);
        } catch (error) {
            console.error("Respuesta no válida:", texto);
            throw new Error(MENSAJES.RESPUESTA_NO_VALIDA);
        }
    }

    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function mostrarModalConfirmacion(mensaje, onAccept) {
        const modal = crearModal();
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
        let modal = document.getElementById("reservas-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "reservas-modal";
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