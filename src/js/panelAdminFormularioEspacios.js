document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("space-form");
    const submitButton = document.getElementById("submit-space");
    const cancelButton = document.getElementById("cancel-space");
    const adminName = document.getElementById("admin-name");
    const logoutButton = document.getElementById("logout");
    const title = document.getElementById("form-title");
    const subtitle = document.getElementById("form-subtitle");
    const breadcrumbAction = document.getElementById("breadcrumb-action");
    const backToSpaces = document.getElementById("back-to-spaces");
    const LOGIN_URL = "login.html";
    const PANEL_ESPACIOS_URL = "panelAdminEspacios.html";

    const params = new URLSearchParams(window.location.search);
    let idUrbanizacion = Number(params.get("idUrbanizacion")) || Number(sessionStorage.getItem("idUrbanizacionSeleccionada")) || 0;
    const idEspacio = Number(params.get("idEspacio")) || Number(sessionStorage.getItem("idEspacioSeleccionado")) || 0;
    const esEdicion = params.get("modo") === "editar" && idEspacio > 0;

    const campos = [
        campo("spaceName", "nombre", "Completa el nombre del espacio"),
        campo("spaceType", "tipo", "Completa el tipo de instalacion"),
        campo("description", "descripcion", "Completa la descripcion"),
        campo("openingTime", "hora_apertura", "Completa la hora de apertura"),
        campo("closingTime", "hora_cierre", "Completa la hora de cierre", validarHoraCierre),
        campo("unitReservation", "unidad_reserva", "Selecciona la unidad de reserva"),
        campo("maxTime", "duracion_maxima_minutos", "Completa la duracion maxima", validarEnteroPositivo),
        campo("maxDayReservation", "max_reservas_dia", "Completa las reservas por dia", validarEnteroPositivo),
        campo("maxWeekReservation", "max_reservas_semana", "Completa las reservas por semana", validarEnteroPositivo),
        campo("maxAdvance", "max_dias_anticipacion", "Completa los dias de anticipacion", validarEnteroPositivo),
        campo("minutesBetweenReservations", "minutos_entre_reservas", "Completa los minutos entre reservas", validarEnteroCeroOPositivo),
        campo("allowWaitlist", "permite_lista_espera", "Selecciona si permite lista de espera"),
        campo("allowCancel", "permite_cancelacion", "Selecciona si permite cancelacion"),
        campo("minutesLimitCancel", "minutos_limite_cancelacion", "Completa el limite de cancelacion", validarEnteroCeroOPositivo),
        campo("rules", "normas_texto", "Completa las normas de uso")
    ];

    if (!form) {
        return;
    }

    prepararNavegacion();
    prepararEventos();
    validarSesionAdmin();

    function campo(inputId, nombre, mensaje, validar) {
        return {
            input: document.getElementById(inputId),
            error: document.getElementById(`error-${inputId}`),
            nombre,
            mensaje,
            validar
        };
    }

    function prepararNavegacion() {
        if (backToSpaces) {
            backToSpaces.href = obtenerUrlPanelEspacios();
        }

        if (cancelButton) {
            cancelButton.addEventListener("click", function () {
                window.location.href = obtenerUrlPanelEspacios();
            });
        }
    }

    function prepararEventos() {
        prepararLogout();
        prepararModo();

        campos.forEach(campoActual => {
            if (!campoActual.input || !campoActual.error) {
                return;
            }

            campoActual.input.addEventListener("blur", function () {
                validarCampo(campoActual);
            });

            campoActual.input.addEventListener("input", function () {
                campoActual.error.textContent = "";
                campoActual.input.classList.remove("input-error");
            });

            campoActual.input.addEventListener("change", function () {
                campoActual.error.textContent = "";
                campoActual.input.classList.remove("input-error");
            });
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validarFormulario()) {
                return;
            }

            guardarEspacio();
        });
    }

    function prepararModo() {
        if (!esEdicion) {
            return;
        }

        document.title = "Editar Espacio";
        if (title) {
            title.textContent = "Editar Espacio";
        }
        if (subtitle) {
            subtitle.textContent = "Actualiza la informacion y configuracion del espacio seleccionado.";
        }
        if (breadcrumbAction) {
            breadcrumbAction.textContent = "Editar Espacio";
        }
        if (submitButton) {
            submitButton.textContent = "Editar Espacio";
        }
    }

    function validarSesionAdmin() {
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
                    mostrarModal("Selecciona una urbanizacion antes de gestionar espacios.", false, function () {
                        window.location.href = "panelAdminUrbanizaciones.html";
                    });
                    return;
                }

                if (esEdicion) {
                    cargarEspacio();
                }
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

    function cargarEspacio() {
        const formData = new FormData();
        formData.append("funcion", "obtenerEspacio");
        formData.append("idUrbanizacion", idUrbanizacion);
        formData.append("idEspacio", idEspacio);

        fetch("../php/espacios.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarModal(data.message || "No se pudo cargar el espacio", false);
                    return;
                }

                rellenarFormulario(data.espacio);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModal("Error al conectar con el servidor.", false);
            });
    }

    function rellenarFormulario(espacio) {
        idUrbanizacion = Number(espacio.id_urbanizacion) || idUrbanizacion;
        asignarValor("spaceName", espacio.nombre);
        asignarValor("spaceType", espacio.tipo);
        asignarValor("description", espacio.descripcion);
        asignarValor("openingTime", formatearHora(espacio.hora_apertura));
        asignarValor("closingTime", formatearHora(espacio.hora_cierre));
        asignarValor("unitReservation", espacio.unidad_reserva || "30_MIN");
        asignarValor("maxTime", espacio.duracion_maxima_minutos);
        asignarValor("maxDayReservation", espacio.max_reservas_dia);
        asignarValor("maxWeekReservation", espacio.max_reservas_semana);
        asignarValor("maxAdvance", espacio.max_dias_anticipacion);
        asignarValor("minutesBetweenReservations", espacio.minutos_entre_reservas);
        asignarValor("allowWaitlist", espacio.permite_lista_espera ? "1" : "0");
        asignarValor("allowCancel", espacio.permite_cancelacion ? "1" : "0");
        asignarValor("minutesLimitCancel", espacio.minutos_limite_cancelacion);
        asignarValor("rules", espacio.normas_texto);
    }

    function asignarValor(id, valor) {
        const input = document.getElementById(id);
        if (input) {
            input.value = valor ?? "";
        }
    }

    function validarFormulario() {
        let formularioValido = true;

        campos.forEach(campoActual => {
            if (!validarCampo(campoActual)) {
                formularioValido = false;
            }
        });

        return formularioValido;
    }

    function validarCampo(campoActual) {
        const valor = campoActual.input.value.trim();

        if (valor === "") {
            campoActual.error.textContent = campoActual.mensaje;
            campoActual.input.classList.add("input-error");
            return false;
        }

        if (typeof campoActual.validar === "function") {
            const mensaje = campoActual.validar(valor);
            if (mensaje) {
                campoActual.error.textContent = mensaje;
                campoActual.input.classList.add("input-error");
                return false;
            }
        }

        campoActual.error.textContent = "";
        campoActual.input.classList.remove("input-error");
        return true;
    }

    function validarEnteroPositivo(valor) {
        return Number.isInteger(Number(valor)) && Number(valor) > 0 ? "" : "Introduce un numero mayor que 0";
    }

    function validarEnteroCeroOPositivo(valor) {
        return Number.isInteger(Number(valor)) && Number(valor) >= 0 ? "" : "Introduce un numero igual o mayor que 0";
    }

    function validarHoraCierre(valor) {
        const apertura = document.getElementById("openingTime").value;
        if (apertura && valor <= apertura) {
            return "La hora de cierre debe ser posterior a la apertura";
        }

        return "";
    }

    function guardarEspacio() {
        const formData = new FormData();
        formData.append("funcion", esEdicion ? "editarEspacio" : "crearEspacio");
        formData.append("idUrbanizacion", idUrbanizacion);

        if (esEdicion) {
            formData.append("idEspacio", idEspacio);
        }

        campos.forEach(campoActual => {
            formData.append(campoActual.nombre, campoActual.input.value.trim());
        });

        if (submitButton) {
            submitButton.disabled = true;
        }

        fetch("../php/espacios.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                if (correcto && data.idEspacio) {
                    sessionStorage.setItem("idEspacioSeleccionado", data.idEspacio);
                }

                mostrarModal(correcto ? data.message : (data.message || "Hubo algun fallo"), correcto, function () {
                    if (correcto) {
                        window.location.href = obtenerUrlPanelEspacios();
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModal("Hubo algun fallo", false);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                }
            });
    }

    function parsearJson(texto) {
        try {
            return JSON.parse(texto);
        } catch (error) {
            console.error("Respuesta no valida:", texto);
            throw new Error("Respuesta no valida del servidor");
        }
    }

    function formatearHora(hora) {
        return String(hora || "").slice(0, 5);
    }

    function obtenerUrlPanelEspacios() {
        return idUrbanizacion ? `${PANEL_ESPACIOS_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}` : PANEL_ESPACIOS_URL;
    }

    function mostrarModal(mensaje, correcto, onClose) {
        const modal = crearModal();
        const modalText = modal.querySelector(".modal-text");
        const modalIcon = modal.querySelector(".modal-icon");
        const acceptButton = modal.querySelector(".modal-accept");
        let redireccionProgramada = null;

        modalText.textContent = mensaje;
        modalIcon.className = correcto ? "modal-icon modal-icon-success" : "modal-icon modal-icon-error";
        modalIcon.innerHTML = correcto ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
        modal.hidden = false;

        acceptButton.onclick = function () {
            if (redireccionProgramada) {
                clearTimeout(redireccionProgramada);
            }
            modal.hidden = true;
            if (typeof onClose === "function") {
                onClose();
            }
        };

        if (correcto && typeof onClose === "function") {
            redireccionProgramada = setTimeout(function () {
                modal.hidden = true;
                onClose();
            }, 1400);
        }
    }

    function crearModal() {
        let modal = document.getElementById("space-form-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "space-form-modal";
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
