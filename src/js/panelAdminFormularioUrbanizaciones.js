document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("urbanization-form");
    const inputNombre = document.getElementById("urbanName");
    const inputDireccion = document.getElementById("address");
    const inputCodigoPostal = document.getElementById("postalCode");
    const inputMunicipio = document.getElementById("city");
    const inputProvincia = document.getElementById("province");
    const submitButton = document.getElementById("submit-urbanization");
    const submitText = submitButton ? submitButton.querySelector("span") : null;
    const title = document.querySelector(".form-heading h1");
    const subtitle = document.querySelector(".form-heading p");
    const breadcrumb = document.querySelector(".breadcrumbs strong");
    const statusField = document.getElementById("status-field");
    const adminName = document.getElementById("admin-name");
    const logoutButton = document.getElementById("logout");
    const params = new URLSearchParams(window.location.search);
    const idUrbanizacion = params.get("idUrbanizacion") || sessionStorage.getItem("idUrbanizacionSeleccionada");
    const esEdicion = Boolean(params.get("modo") === "editar" && idUrbanizacion);
    const LOGIN_URL = "login.html";

    prepararLogout();
    validarSesionAdmin();

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


    const campos = [
        {
            input: inputNombre,
            error: document.getElementById("error-urbaName"),
            nombre: "nombre",
            mensaje: "Completa el nombre de la urbanización"
        },
        {
            input: inputDireccion,
            error: document.getElementById("error-address"),
            nombre: "direccion",
            mensaje: "Completa la dirección"
        },
        {
            input: inputCodigoPostal,
            error: document.getElementById("error-postalCode"),
            nombre: "codigo_postal",
            mensaje: "Completa el código postal"
        },
        {
            input: inputMunicipio,
            error: document.getElementById("error-city"),
            nombre: "municipio",
            mensaje: "Completa el municipio"
        },
        {
            input: inputProvincia,
            error: document.getElementById("error-province"),
            nombre: "provincia",
            mensaje: "Completa la provincia"
        }
    ];

    if (!form) {
        return;
    }

    prepararModo();
    campos.forEach(campo => {
        campo.input.addEventListener("blur", function () {
            validarCampo(campo);
        });
        campo.input.addEventListener("input", function () {
            campo.error.textContent = "";
        });
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!validarFormulario()) {
            return;
        }

        guardarUrbanizacion();
    });

    function prepararModo() {
        if (!esEdicion) {
            return;
        }

        document.title = "Editar Urbanización";
        if (title) {
            title.textContent = "Editar Urbanización";
        }
        if (subtitle) {
            subtitle.textContent = "Actualiza los datos básicos de la comunidad seleccionada.";
        }
        if (breadcrumb) {
            breadcrumb.textContent = "Editar Urbanización";
        }
        if (submitText) {
            submitText.textContent = "Editar Urbanización";
        }
        if (statusField) {
            statusField.hidden = false;
        }

        cargarUrbanizacion();
    }

    function cargarUrbanizacion() {
        const formData = new FormData();
        formData.append("funcion", "obtenerUrbanizacion");
        formData.append("idUrbanizacion", idUrbanizacion);

        fetch("../php/formularioUrbanizaciones.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success") {
                    mostrarModal(data.message || "No se pudo cargar la urbanización", false);
                    return;
                }

                rellenarFormulario(data.urbanizacion);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModal("Error al conectar con el servidor.", false);
            });
    }

    function rellenarFormulario(urbanizacion) {
        inputNombre.value = urbanizacion.nombre || "";
        inputDireccion.value = urbanizacion.direccion || "";
        inputCodigoPostal.value = urbanizacion.codigo_postal || "";
        inputMunicipio.value = urbanizacion.municipio || "";
        inputProvincia.value = urbanizacion.provincia || "";

        const activo = urbanizacion.activo ? "1" : "0";
        const radioActivo = document.querySelector(`input[name="activeStatus"][value="${activo}"]`);
        if (radioActivo) {
            radioActivo.checked = true;
        }
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
        if (campo.input.value.trim() === "") {
            campo.error.textContent = campo.mensaje;
            campo.input.classList.add("input-error");
            return false;
        }

        campo.error.textContent = "";
        campo.input.classList.remove("input-error");
        return true;
    }

    function guardarUrbanizacion() {
        const formData = new FormData();
        formData.append("funcion", esEdicion ? "editarUrbanizacion" : "crearUrbanizacion");

        if (esEdicion) {
            formData.append("idUrbanizacion", idUrbanizacion);
            formData.append("activo", obtenerEstadoActivo());
        }

        campos.forEach(campo => {
            formData.append(campo.nombre, campo.input.value.trim());
        });

        submitButton.disabled = true;

        fetch("../php/formularioUrbanizaciones.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(texto => {
                let data;

                try {
                    data = JSON.parse(texto);
                } catch (error) {
                    console.error("Respuesta no valida:", texto);
                    throw new Error("Respuesta no valida del servidor");
                }

                return data;
            })
            .then(data => {
                const correcto = data.status === "success";

                if (correcto && data.idUrbanizacion) {
                    sessionStorage.setItem("idUrbanizacionSeleccionada", data.idUrbanizacion);
                }

                mostrarModal(correcto ? data.message : (data.message || "Hubo algun fallo"), correcto, function () {
                    if (correcto) {
                        window.location.href = "panelAdminUrbanizaciones.html";
                    }
                });
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModal("Hubo algún fallo", false);
            })
            .finally(() => {
                submitButton.disabled = false;
            });
    }

    function obtenerEstadoActivo() {
        const radioSeleccionado = document.querySelector('input[name="activeStatus"]:checked');
        return radioSeleccionado ? radioSeleccionado.value : "1";
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
                    <button class="btn btn-primary modal-accept" type="button">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }
});
