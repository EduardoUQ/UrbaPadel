document.addEventListener("DOMContentLoaded", function () {
    const urbanizationGrid = document.getElementById("urbanization-grid");
    const PANEL_URBANIZACION_URL = "panelAdminEspacios.html";
    const FORMULARIO_URBANIZACION_URL = "panelAdminFormularioUrbanizaciones.html";

    if (!urbanizationGrid) {
        return;
    }

    urbanizationGrid.innerHTML = "";
    cargarUrbanizaciones();

    function cargarUrbanizaciones() {
        mostrarMensaje("Cargando urbanizaciones...");

        fetch("../php/listaUrbanizaciones.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar las urbanizaciones.");
                    return;
                }

                pintarUrbanizaciones(data.urbanizaciones || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
            });
    }

    function pintarUrbanizaciones(urbanizaciones) {
        urbanizationGrid.innerHTML = "";
        window.urbanizacionesPorId = {};

        if (urbanizaciones.length === 0) {
            mostrarMensaje("Todavia no hay urbanizaciones registradas.");
            return;
        }

        urbanizaciones.forEach(urbanizacion => {
            window.urbanizacionesPorId[urbanizacion.id] = urbanizacion;
            urbanizationGrid.appendChild(crearTarjetaUrbanizacion(urbanizacion));
        });
    }

    function crearTarjetaUrbanizacion(urbanizacion) {
        const article = document.createElement("article");
        article.className = "urbanization-card";
        article.dataset.idUrbanizacion = urbanizacion.id;

        const activo = Boolean(urbanizacion.activo);
        const estado = urbanizacion.estado || (activo ? "Activa" : "Inactiva");
        const claseEstado = activo ? "" : " status-badge-inactive";
        const espacios = Number(urbanizacion.cantidad_espacios) || 0;
        const viviendas = Number(urbanizacion.cantidad_viviendas) || 0;

        article.innerHTML = `
            <div class="card-top">
                <span class="urban-icon" aria-hidden="true">
                    <i class="fa-regular fa-building"></i>
                </span>
                <span class="card-actions">
                    <span class="status-badge${claseEstado}">${escaparHTML(estado)}</span>
                    <button class="icon-action js-editar-urbanizacion" type="button" aria-label="Editar urbanizacion">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-action icon-action-danger js-borrar-urbanizacion" type="button" aria-label="Borrar urbanizacion">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </span>
            </div>

            <div class="urban-heading">
                <h2>${escaparHTML(urbanizacion.nombre)}</h2>
                <p>
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${escaparHTML(urbanizacion.direccion)}</span>
                </p>
            </div>

            <dl class="urban-stats">
                <div>
                    <dt><i class="fa-regular fa-map"></i> Espacios</dt>
                    <dd>${espacios}</dd>
                </div>
                <div>
                    <dt><i class="fa-solid fa-user-group"></i> Vecinos</dt>
                    <dd>${viviendas}</dd>
                </div>
            </dl>

            <a class="enter-link" href="${PANEL_URBANIZACION_URL}?idUrbanizacion=${encodeURIComponent(urbanizacion.id)}">
                <span>Entrar al panel</span>
                <i class="fa-solid fa-arrow-right"></i>
            </a>
        `;

        article.querySelector(".enter-link").addEventListener("click", function () {
            guardarUrbanizacionSeleccionada(urbanizacion);
        });

        article.querySelector(".js-editar-urbanizacion").addEventListener("click", function () {
            guardarUrbanizacionSeleccionada(urbanizacion);
            window.location.href = `${FORMULARIO_URBANIZACION_URL}?modo=editar&idUrbanizacion=${encodeURIComponent(urbanizacion.id)}`;
        });

        article.querySelector(".js-borrar-urbanizacion").addEventListener("click", function () {
            guardarUrbanizacionSeleccionada(urbanizacion);
            mostrarModalConfirmacion(
                "¿Estás seguro de que quieres borrar esta urbanización?",
                function () {
                    eliminarUrbanizacion(urbanizacion.id);
                }
            );
        });

        return article;
    }

    function guardarUrbanizacionSeleccionada(urbanizacion) {
        sessionStorage.setItem("idUrbanizacionSeleccionada", urbanizacion.id);
        sessionStorage.setItem("urbanizacionSeleccionada", JSON.stringify(urbanizacion));
    }

    function eliminarUrbanizacion(idUrbanizacion) {
        const formData = new FormData();
        formData.append("funcion", "eliminarUrbanizacion");
        formData.append("idUrbanizacion", idUrbanizacion);

        fetch("../php/formularioUrbanizaciones.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                const correcto = data.status === "success";
                mostrarModalMensaje(correcto ? "Urbanización borrada" : (data.message || "Hubo algún fallo"), correcto, function () {
                    if (correcto) {
                        cargarUrbanizaciones();
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Hubo algún fallo", false);
            });
    }

    function mostrarMensaje(texto) {
        urbanizationGrid.innerHTML = `
            <p class="urbanization-message">${escaparHTML(texto)}</p>
        `;
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
        let modal = document.getElementById("urbanization-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "urbanization-modal";
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
