document.addEventListener("DOMContentLoaded", function () {
    const tableBody = document.getElementById("incidencias-table-body");
    const incidenciasCount = document.getElementById("incidencias-count");
    const adminName = document.getElementById("admin-name");
    const logoutButton = document.getElementById("logout");
    const urbanizationName = document.getElementById("urbanization-name");
    const tabButtons = document.querySelectorAll(".tab-btn");

    const navEspacios = document.getElementById("nav-espacios");
    const navViviendas = document.getElementById("nav-viviendas");
    const navReservas = document.getElementById("nav-reservas");

    const LOGIN_URL = "login.html";
    const URBANIZACIONES_URL = "panelAdminUrbanizaciones.html";
    const ESPACIOS_URL = "panelAdminEspacios.html";
    const VIVIENDAS_URL = "panelAdminViviendas.html";
    const RESERVAS_URL = "panelAdminReservas.html";

    let idUrbanizacion = obtenerIdUrbanizacionSeleccionada();
    let filtroActual = "pendientes";
    let incidencias = [];

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";
    prepararLogout();
    prepararTabs();
    prepararNavegacion();
    pintarUrbanizacionGuardada();
    validarSesionAdmin();

    function validarSesionAdmin() {
        mostrarMensaje("Comprobando sesión...");

        fetch("../php/sessionAdmin.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success" || data.rol !== "admin") {
                    window.location.href = LOGIN_URL;
                    return;
                }

                if (adminName) {
                    adminName.textContent = data.nombre || "Administrador";
                }

                if (!idUrbanizacion) {
                    mostrarModalMensaje(
                        "Selecciona una urbanización antes de consultar sus incidencias.",
                        false,
                        function () {
                            window.location.href = URBANIZACIONES_URL;
                        }
                    );
                    return;
                }

                cargarIncidencias();
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

                filtroActual = button.dataset.filter || "pendientes";
                pintarIncidencias();
            });
        });
    }

    function prepararNavegacion() {
        if (navEspacios) {
            navEspacios.addEventListener("click", function () {
                navEspacios.href = `${ESPACIOS_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
            });
        }

        if (navViviendas) {
            navViviendas.addEventListener("click", function () {
                navViviendas.href = `${VIVIENDAS_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
            });
        }

        if (navReservas) {
            navReservas.addEventListener("click", function () {
                navReservas.href = `${RESERVAS_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
            });
        }
    }

    function cargarIncidencias() {
        mostrarMensaje("Cargando incidencias...");

        const formData = new FormData();
        formData.append("funcion", "listarIncidencias");
        formData.append("idUrbanizacion", idUrbanizacion);

        fetch("../php/incidenciasAdmin.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar las incidencias.");
                    actualizarContador(0);
                    return;
                }

                if (data.urbanizacion) {
                    guardarUrbanizacion(data.urbanizacion);
                    pintarNombreUrbanizacion(data.urbanizacion.nombre);
                }

                incidencias = data.incidencias || [];
                pintarIncidencias();
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
                actualizarContador(0);
            });
    }

    function pintarIncidencias() {
        tableBody.innerHTML = "";

        const incidenciasFiltradas = incidencias.filter(incidencia => {
            const resuelta = Boolean(incidencia.resuelto);

            if (filtroActual === "todas") {
                return true;
            }

            if (filtroActual === "resueltas") {
                return resuelta;
            }

            return !resuelta;
        });

        actualizarContador(incidenciasFiltradas.length);

        if (incidenciasFiltradas.length === 0) {
            mostrarMensaje("No hay incidencias para mostrar.");
            return;
        }

        incidenciasFiltradas.forEach(incidencia => {
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
                <div class="incidencia-cell">
                    <strong>${escaparHTML(incidencia.codigo_vivienda)}</strong>
                    <span>${escaparHTML(incidencia.nombre_usuario)}</span>
                </div>
            </td>
            <td>
                <p class="incidencia-comment">${escaparHTML(incidencia.comentario)}</p>
            </td>
            <td>${escaparHTML(incidencia.fecha_creacion)}</td>
            <td>
                <span class="status-badge ${claseEstado}">${textoEstado}</span>
            </td>
            <td>
                <div class="row-actions" aria-label="Acciones de incidencia">
                    <button class="icon-btn success js-resolver-incidencia" type="button" ${resuelta ? "disabled" : ""} aria-label="Resolver incidencia">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </div>
            </td>
        `;

        const botonResolver = tr.querySelector(".js-resolver-incidencia");

        if (botonResolver && !resuelta) {
            botonResolver.addEventListener("click", function () {
                mostrarModalConfirmacion("¿Marcar esta incidencia como resuelta?", function () {
                    resolverIncidencia(incidencia.id);
                });
            });
        }

        return tr;
    }

    function resolverIncidencia(idIncidencia) {
        const formData = new FormData();
        formData.append("funcion", "resolverIncidencia");
        formData.append("idUrbanizacion", idUrbanizacion);
        formData.append("idIncidencia", idIncidencia);

        fetch("../php/incidenciasAdmin.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Incidencia resuelta correctamente" : (data.message || "No se pudo resolver la incidencia"),
                    correcto,
                    function () {
                        if (correcto) {
                            cargarIncidencias();
                        }
                    }
                );
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            });
    }

    function obtenerIdUrbanizacionSeleccionada() {
        const params = new URLSearchParams(window.location.search);
        const idUrl = Number(params.get("idUrbanizacion")) || 0;

        if (idUrl > 0) {
            sessionStorage.setItem("idUrbanizacionSeleccionada", idUrl);
            return idUrl;
        }

        return Number(sessionStorage.getItem("idUrbanizacionSeleccionada")) || 0;
    }

    function pintarUrbanizacionGuardada() {
        const urbanizacion = obtenerUrbanizacionGuardada();

        if (urbanizacion && Number(urbanizacion.id) === Number(idUrbanizacion)) {
            pintarNombreUrbanizacion(urbanizacion.nombre);
        }
    }

    function pintarNombreUrbanizacion(nombre) {
        if (urbanizationName) {
            urbanizationName.textContent = nombre || "la comunidad";
        }
    }

    function obtenerUrbanizacionGuardada() {
        try {
            return JSON.parse(sessionStorage.getItem("urbanizacionSeleccionada") || "null");
        } catch (error) {
            return null;
        }
    }

    function guardarUrbanizacion(urbanizacion) {
        sessionStorage.setItem("idUrbanizacionSeleccionada", urbanizacion.id);
        sessionStorage.setItem("urbanizacionSeleccionada", JSON.stringify(urbanizacion));
        idUrbanizacion = Number(urbanizacion.id) || idUrbanizacion;
    }

    function mostrarMensaje(texto) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="spaces-message">${escaparHTML(texto)}</td>
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
        let modal = document.getElementById("admin-incidencias-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "admin-incidencias-modal";
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