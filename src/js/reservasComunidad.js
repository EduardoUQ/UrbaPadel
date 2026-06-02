document.addEventListener("DOMContentLoaded", function () {
    const selectEspacio = document.getElementById("idEspacio");
    const tableBody = document.getElementById("reservas-table-body");
    const reservasCount = document.getElementById("reservas-count");
    const usuarioName = document.getElementById("usuario-name");
    const logoutButton = document.getElementById("logout");
    const urbanizacionTexto = document.getElementById("urbanizacion-texto");
    const tabButtons = document.querySelectorAll(".tab-btn");

    const LOGIN_URL = "login.html";
    const PANEL_USUARIO_URL = "panelUsuario.html";

    let filtroActual = "activas";
    let reservas = [];

    if (!tableBody || !selectEspacio) {
        return;
    }

    prepararLogout();
    prepararTabs();
    prepararSelectorEspacios();
    validarSesionSuperusuario();

    function validarSesionSuperusuario() {
        mostrarMensaje("Comprobando sesión...");

        fetch("../php/sessionUsuario.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success" || data.rol !== "usuario") {
                    window.location.href = LOGIN_URL;
                    return;
                }

                if (!(data.superusuario === true || Number(data.superusuario) === 1)) {
                    mostrarModalMensaje(
                        "No tienes permisos de superusuario.",
                        false,
                        function () {
                            window.location.href = PANEL_USUARIO_URL;
                        }
                    );
                    return;
                }

                mostrarMenuSuperusuario(true);

                if (usuarioName) {
                    usuarioName.textContent = data.nombre_usuario || "Usuario";
                }

                if (urbanizacionTexto && data.urbanizacion) {
                    urbanizacionTexto.textContent = "Consulta las reservas realizadas en " + data.urbanizacion + ".";
                }

                cargarEspacios();
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

    function prepararTabs() {
        tabButtons.forEach(button => {
            button.addEventListener("click", function () {
                tabButtons.forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");

                filtroActual = button.dataset.filter || "activas";
                pintarReservas();
            });
        });
    }

    function prepararSelectorEspacios() {
        selectEspacio.addEventListener("change", function () {
            if (!selectEspacio.value) {
                reservas = [];
                mostrarMensaje("Selecciona un espacio para ver sus reservas.");
                actualizarContador(0);
                return;
            }

            cargarReservas();
        });
    }

    function cargarEspacios() {
        mostrarMensaje("Cargando espacios...");

        const formData = new FormData();
        formData.append("funcion", "listarEspacios");

        fetch("../php/reservasComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar los espacios.");
                    actualizarContador(0);
                    return;
                }

                pintarEspacios(data.espacios || []);
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

        if (espacios.length === 0) {
            mostrarMensaje("No hay espacios disponibles en tu urbanización.");
            actualizarContador(0);
            return;
        }

        selectEspacio.value = espacios[0].id;
        cargarReservas();
    }

    function cargarReservas() {
        mostrarMensaje("Cargando reservas...");

        const formData = new FormData();
        formData.append("funcion", "listarReservas");
        formData.append("idEspacio", selectEspacio.value);

        fetch("../php/reservasComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar las reservas.");
                    actualizarContador(0);
                    return;
                }

                reservas = data.reservas || [];
                pintarReservas();
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
                actualizarContador(0);
            });
    }

    function pintarReservas() {
        tableBody.innerHTML = "";

        const reservasFiltradas = reservas.filter(reserva => {
            if (filtroActual === "todas") {
                return true;
            }

            if (filtroActual === "activas") {
                return reserva.estado_visual === "ACTIVA";
            }

            return reserva.estado_visual !== "ACTIVA";
        });

        actualizarContador(reservasFiltradas.length);

        if (reservasFiltradas.length === 0) {
            mostrarMensaje("No hay reservas para mostrar.");
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
                    <strong>${escaparHTML(reserva.codigo_vivienda)}</strong>
                    <span>${escaparHTML(reserva.email_notificaciones || "")}</span>
                </div>
            </td>
            <td>
                <div class="reserva-cell">
                    <strong>${escaparHTML(reserva.nombre_usuario)}</strong>
                    <span>${escaparHTML(reserva.telefono_contacto || "")}</span>
                </div>
            </td>
            <td>${escaparHTML(reserva.fecha_reserva)}</td>
            <td>
                <div class="schedule-cell">
                    <strong>${escaparHTML(reserva.hora_inicio)} - ${escaparHTML(reserva.hora_fin)}</strong>
                    <span>${escaparHTML(reserva.duracion_texto)}</span>
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
                mostrarModalConfirmacion("¿Seguro que quieres cancelar esta reserva?", function () {
                    cancelarReserva(reserva.id);
                });
            });
        }

        return tr;
    }

    function cancelarReserva(idReserva) {
        const formData = new FormData();
        formData.append("funcion", "cancelarReserva");
        formData.append("idReserva", idReserva);
        formData.append("idEspacio", selectEspacio.value);

        fetch("../php/reservasComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Reserva cancelada correctamente" : (data.message || "No se pudo cancelar la reserva"),
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
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            });
    }

    function mostrarMenuSuperusuario(esSuperusuario) {
        const superuserMenu = document.getElementById("superuser-menu");

        if (!superuserMenu) {
            return;
        }

        superuserMenu.hidden = !(esSuperusuario === true || Number(esSuperusuario) === 1);
    }

    function obtenerClaseEstado(estado) {
        if (estado === "ACTIVA") {
            return "activa";
        }

        if (estado === "CANCELADA") {
            return "cancelada";
        }

        return "finalizada";
    }

    function obtenerTextoEstado(estado) {
        if (estado === "ACTIVA") {
            return "Activa";
        }

        if (estado === "CANCELADA") {
            return "Cancelada";
        }

        return "Finalizada";
    }

    function mostrarMensaje(texto) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="spaces-message">${escaparHTML(texto)}</td>
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
            throw new Error("Respuesta no válida del servidor");
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
        let modal = document.getElementById("comunidad-reservas-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "comunidad-reservas-modal";
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