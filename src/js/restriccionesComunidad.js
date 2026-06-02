document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("restriccion-form");

    const selectVivienda = document.getElementById("idVivienda");
    const selectEspacio = document.getElementById("idEspacio");

    const fechaInicioInput = document.getElementById("fechaInicio");
    const horaInicioInput = document.getElementById("horaInicio");
    const fechaFinInput = document.getElementById("fechaFin");
    const horaFinInput = document.getElementById("horaFin");
    const motivoInput = document.getElementById("motivo");
    const submitButton = document.getElementById("submit-restriccion");

    const tableBody = document.getElementById("restricciones-table-body");
    const restriccionesCount = document.getElementById("restricciones-count");
    const usuarioName = document.getElementById("usuario-name");
    const logoutButton = document.getElementById("logout");
    const urbanizacionTexto = document.getElementById("urbanizacion-texto");

    const errorVivienda = document.getElementById("error-idVivienda");
    const errorEspacio = document.getElementById("error-idEspacio");
    const errorFechaInicio = document.getElementById("error-fechaInicio");
    const errorHoraInicio = document.getElementById("error-horaInicio");
    const errorFechaFin = document.getElementById("error-fechaFin");
    const errorHoraFin = document.getElementById("error-horaFin");
    const errorMotivo = document.getElementById("error-motivo");

    const LOGIN_URL = "login.html";
    const PANEL_USUARIO_URL = "panelUsuario.html";

    let viviendasDisponibles = [];
    let espaciosDisponibles = [];

    if (!form || !tableBody) {
        return;
    }

    configurarFechaMinima();
    prepararLogout();
    prepararEventos();
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
                    urbanizacionTexto.textContent = "Restringe temporalmente el uso de espacios en " + data.urbanizacion + ".";
                }

                cargarDatos();
            })
            .catch(error => {
                console.error("Error:", error);
                window.location.href = LOGIN_URL;
            });
    }

    function configurarFechaMinima() {
        const hoy = new Date();
        const fechaHoy = formatearFechaInput(hoy);

        if (fechaInicioInput) {
            fechaInicioInput.min = fechaHoy;
            fechaInicioInput.value = fechaHoy;
        }

        if (fechaFinInput) {
            fechaFinInput.min = fechaHoy;
            fechaFinInput.value = fechaHoy;
        }
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
        selectVivienda.addEventListener("change", function () {
            limpiarError(selectVivienda, errorVivienda);
        });

        selectEspacio.addEventListener("change", function () {
            limpiarError(selectEspacio, errorEspacio);
            generarHorasEspacioSeleccionado();
        });

        fechaInicioInput.addEventListener("change", function () {
            limpiarError(fechaInicioInput, errorFechaInicio);

            if (fechaFinInput && fechaInicioInput.value) {
                fechaFinInput.min = fechaInicioInput.value;

                if (fechaFinInput.value < fechaInicioInput.value) {
                    fechaFinInput.value = fechaInicioInput.value;
                }
            }

            filtrarHorasFinPosteriores();
        });

        horaInicioInput.addEventListener("change", function () {
            limpiarError(horaInicioInput, errorHoraInicio);
            filtrarHorasFinPosteriores();
        });

        fechaFinInput.addEventListener("change", function () {
            limpiarError(fechaFinInput, errorFechaFin);
            filtrarHorasFinPosteriores();
        });

        horaFinInput.addEventListener("change", function () {
            limpiarError(horaFinInput, errorHoraFin);
        });

        motivoInput.addEventListener("input", function () {
            limpiarError(motivoInput, errorMotivo);
        });

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!validarFormulario()) {
                return;
            }

            crearRestriccion();
        });
    }

    function cargarDatos() {
        cargarViviendas();
        cargarEspacios();
        cargarRestricciones();
    }

    function cargarViviendas() {
        const formData = new FormData();
        formData.append("funcion", "listarViviendas");

        fetch("../php/restriccionesComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarModalMensaje(data.message || "No se pudieron cargar las viviendas.", false);
                    return;
                }

                pintarViviendas(data.viviendas || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al cargar las viviendas.", false);
            });
    }

    function cargarEspacios() {
        const formData = new FormData();
        formData.append("funcion", "listarEspacios");

        fetch("../php/restriccionesComunidad.php", {
            method: "POST",
            body: formData
        })
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

    function cargarRestricciones() {
        mostrarMensaje("Cargando restricciones...");

        const formData = new FormData();
        formData.append("funcion", "listarRestricciones");

        fetch("../php/restriccionesComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar las restricciones.");
                    actualizarContador(0);
                    return;
                }

                pintarRestricciones(data.restricciones || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
                actualizarContador(0);
            });
    }

    function pintarViviendas(viviendas) {
        viviendasDisponibles = viviendas || [];
        selectVivienda.innerHTML = '<option value="">Selecciona una vivienda</option>';

        viviendasDisponibles.forEach(vivienda => {
            const option = document.createElement("option");
            option.value = vivienda.id;
            option.textContent = crearTextoVivienda(vivienda);
            selectVivienda.appendChild(option);
        });
    }

    function pintarEspacios(espacios) {
        espaciosDisponibles = espacios || [];
        selectEspacio.innerHTML = '<option value="">Selecciona un espacio</option>';

        espaciosDisponibles.forEach(espacio => {
            const option = document.createElement("option");
            option.value = espacio.id;
            option.textContent = espacio.nombre + " - " + espacio.tipo;
            selectEspacio.appendChild(option);
        });

        limpiarSelectHoras();

        if (espaciosDisponibles.length > 0) {
            selectEspacio.value = espaciosDisponibles[0].id;
            generarHorasEspacioSeleccionado();
        }
    }

    function pintarRestricciones(restricciones) {
        tableBody.innerHTML = "";
        actualizarContador(restricciones.length);

        if (restricciones.length === 0) {
            mostrarMensaje("No hay restricciones para mostrar.");
            return;
        }

        restricciones.forEach(restriccion => {
            tableBody.appendChild(crearFilaRestriccion(restriccion));
        });
    }

    function crearFilaRestriccion(restriccion) {
        const tr = document.createElement("tr");
        const claseEstado = obtenerClaseEstado(restriccion.estado_visual);
        const textoEstado = obtenerTextoEstado(restriccion.estado_visual);

        tr.innerHTML = `
            <td>
                <div class="restriccion-cell">
                    <strong>${escaparHTML(restriccion.vivienda_texto)}</strong>
                    <span>${escaparHTML(restriccion.nombre_usuario)}</span>
                </div>
            </td>
            <td>
                <div class="restriccion-cell">
                    <strong>${escaparHTML(restriccion.espacio_nombre)}</strong>
                    <span>${escaparHTML(restriccion.espacio_tipo)}</span>
                </div>
            </td>
            <td>${escaparHTML(restriccion.fecha_inicio_visible)}</td>
            <td>${escaparHTML(restriccion.fecha_fin_visible)}</td>
            <td>
                <div class="schedule-cell">
                    <strong>${escaparHTML(restriccion.hora_inicio)} - ${escaparHTML(restriccion.hora_fin)}</strong>
                </div>
            </td>
            <td>
                <p class="restriccion-motivo">${escaparHTML(restriccion.motivo)}</p>
            </td>
            <td>
                <span class="status-badge ${claseEstado}">${textoEstado}</span>
            </td>
            <td>
                <div class="row-actions" aria-label="Acciones de restricción">
                    <button class="icon-btn delete js-desactivar-restriccion" type="button" ${restriccion.puede_desactivar ? "" : "disabled"} aria-label="Desactivar restricción">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;

        const botonDesactivar = tr.querySelector(".js-desactivar-restriccion");

        if (botonDesactivar && restriccion.puede_desactivar) {
            botonDesactivar.addEventListener("click", function () {
                mostrarModalConfirmacion("¿Seguro que quieres desactivar esta restricción?", function () {
                    desactivarRestriccion(restriccion.id);
                });
            });
        }

        return tr;
    }

    function validarFormulario() {
        let valido = true;

        if (!selectVivienda.value) {
            mostrarError(selectVivienda, errorVivienda, "Selecciona una vivienda");
            valido = false;
        }

        if (!selectEspacio.value) {
            mostrarError(selectEspacio, errorEspacio, "Selecciona un espacio");
            valido = false;
        }

        if (!fechaInicioInput.value) {
            mostrarError(fechaInicioInput, errorFechaInicio, "Selecciona una fecha de inicio");
            valido = false;
        }

        if (!horaInicioInput.value) {
            mostrarError(horaInicioInput, errorHoraInicio, "Indica la hora de inicio");
            valido = false;
        }

        if (!fechaFinInput.value) {
            mostrarError(fechaFinInput, errorFechaFin, "Selecciona una fecha de fin");
            valido = false;
        }

        if (!horaFinInput.value) {
            mostrarError(horaFinInput, errorHoraFin, "Indica la hora de fin");
            valido = false;
        }

        if (
            fechaInicioInput.value &&
            fechaFinInput.value &&
            horaInicioInput.value &&
            horaFinInput.value
        ) {
            const inicio = new Date(`${fechaInicioInput.value}T${horaInicioInput.value}:00`);
            const fin = new Date(`${fechaFinInput.value}T${horaFinInput.value}:00`);

            if (fin <= inicio) {
                mostrarError(fechaFinInput, errorFechaFin, "El fin debe ser posterior al inicio");
                mostrarError(horaFinInput, errorHoraFin, "El fin debe ser posterior al inicio");
                valido = false;
            }
        }

        if (motivoInput.value.trim().length < 5) {
            mostrarError(motivoInput, errorMotivo, "Indica un motivo de al menos 5 caracteres");
            valido = false;
        }

        return valido;
    }

    function crearRestriccion() {
        const formData = new FormData();
        formData.append("funcion", "crearRestriccion");
        formData.append("idVivienda", selectVivienda.value);
        formData.append("idEspacio", selectEspacio.value);
        formData.append("fechaInicio", fechaInicioInput.value);
        formData.append("horaInicio", horaInicioInput.value);
        formData.append("fechaFin", fechaFinInput.value);
        formData.append("horaFin", horaFinInput.value);
        formData.append("motivo", motivoInput.value.trim());

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fa-solid fa-spinner"></i><span>Creando...</span>';
        }

        fetch("../php/restriccionesComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Restricción creada correctamente" : (data.message || "No se pudo crear la restricción"),
                    correcto,
                    function () {
                        if (correcto) {
                            form.reset();
                            configurarFechaMinima();
                            generarHorasEspacioSeleccionado();
                            cargarRestricciones();
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
                    submitButton.innerHTML = '<i class="fa-solid fa-user-lock"></i><span>Crear restricción</span>';
                }
            });
    }

    function desactivarRestriccion(idRestriccion) {
        const formData = new FormData();
        formData.append("funcion", "desactivarRestriccion");
        formData.append("idRestriccion", idRestriccion);

        fetch("../php/restriccionesComunidad.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Restricción desactivada correctamente" : (data.message || "No se pudo desactivar la restricción"),
                    correcto,
                    function () {
                        if (correcto) {
                            cargarRestricciones();
                        }
                    }
                );
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            });
    }

    function generarHorasEspacioSeleccionado() {
        limpiarSelectHoras();

        const espacio = obtenerEspacioSeleccionado();

        if (!espacio) {
            return;
        }

        const horaApertura = formatearHoraCorta(espacio.hora_apertura);
        const horaCierre = formatearHoraCorta(espacio.hora_cierre);
        const minutosUnidad = obtenerMinutosUnidad(espacio.unidad_reserva);

        if (!horaApertura || !horaCierre || minutosUnidad <= 0) {
            return;
        }

        const horasInicio = generarOpcionesHora(horaApertura, horaCierre, minutosUnidad, false);
        const horasFin = generarOpcionesHora(horaApertura, horaCierre, minutosUnidad, true);

        rellenarSelectHoras(horaInicioInput, horasInicio, "Selecciona inicio");
        rellenarSelectHoras(horaFinInput, horasFin, "Selecciona fin");
    }

    function filtrarHorasFinPosteriores() {
        const espacio = obtenerEspacioSeleccionado();

        if (!espacio) {
            generarHorasEspacioSeleccionado();
            return;
        }

        const horaApertura = formatearHoraCorta(espacio.hora_apertura);
        const horaCierre = formatearHoraCorta(espacio.hora_cierre);
        const minutosUnidad = obtenerMinutosUnidad(espacio.unidad_reserva);

        const todasHorasFin = generarOpcionesHora(horaApertura, horaCierre, minutosUnidad, true);

        if (!horaInicioInput.value || !fechaInicioInput.value || !fechaFinInput.value) {
            rellenarSelectHoras(horaFinInput, todasHorasFin, "Selecciona fin");
            return;
        }

        let horasFinValidas = todasHorasFin;

        if (fechaInicioInput.value === fechaFinInput.value) {
            horasFinValidas = todasHorasFin.filter(hora => hora > horaInicioInput.value);
        }

        const horaFinActual = horaFinInput.value;

        rellenarSelectHoras(horaFinInput, horasFinValidas, "Selecciona fin");

        if (horasFinValidas.includes(horaFinActual)) {
            horaFinInput.value = horaFinActual;
        }
    }

    function obtenerEspacioSeleccionado() {
        const idEspacio = Number(selectEspacio.value) || 0;

        return espaciosDisponibles.find(espacio => Number(espacio.id) === idEspacio) || null;
    }

    function limpiarSelectHoras() {
        horaInicioInput.innerHTML = '<option value="">Selecciona inicio</option>';
        horaFinInput.innerHTML = '<option value="">Selecciona fin</option>';
    }

    function rellenarSelectHoras(select, horas, textoInicial) {
        select.innerHTML = `<option value="">${textoInicial}</option>`;

        horas.forEach(hora => {
            const option = document.createElement("option");
            option.value = hora;
            option.textContent = hora;
            select.appendChild(option);
        });
    }

    function generarOpcionesHora(horaApertura, horaCierre, minutosUnidad, incluirCierre) {
        const opciones = [];
        const fechaBase = "2000-01-01";

        let actual = new Date(`${fechaBase}T${horaApertura}:00`);
        const cierre = new Date(`${fechaBase}T${horaCierre}:00`);

        while (actual < cierre) {
            opciones.push(formatearHoraDesdeDate(actual));
            actual.setMinutes(actual.getMinutes() + minutosUnidad);
        }

        if (incluirCierre) {
            opciones.push(formatearHoraDesdeDate(cierre));
        }

        return opciones;
    }

    function crearTextoVivienda(vivienda) {
        const usuario = vivienda.nombre_usuario || "Usuario";

        const portalBloque = [
            vivienda.portal ? "Portal " + vivienda.portal : "",
            vivienda.bloque ? "Bloque " + vivienda.bloque : ""
        ].filter(Boolean).join(" ");

        const escalera = vivienda.escalera ? "Esc " + vivienda.escalera : "";

        const piso = [
            vivienda.planta,
            vivienda.puerta
        ].filter(Boolean).join(" ");

        const partes = [];

        partes.push(usuario);

        if (portalBloque) {
            partes.push(portalBloque);
        }

        if (escalera) {
            partes.push(escalera);
        }

        if (piso) {
            partes.push("Piso " + piso);
        }

        return partes.join(" - ");
    }

    function obtenerMinutosUnidad(unidad) {
        if (unidad === "30_MIN") {
            return 30;
        }

        if (unidad === "60_MIN") {
            return 60;
        }

        if (unidad === "1_DIA") {
            return 1440;
        }

        return 60;
    }

    function formatearHoraCorta(hora) {
        if (!hora) {
            return "";
        }

        return String(hora).slice(0, 5);
    }

    function formatearHoraDesdeDate(fecha) {
        const horas = String(fecha.getHours()).padStart(2, "0");
        const minutos = String(fecha.getMinutes()).padStart(2, "0");

        return `${horas}:${minutos}`;
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

        if (estado === "DESACTIVADA") {
            return "desactivada";
        }

        return "finalizada";
    }

    function obtenerTextoEstado(estado) {
        if (estado === "ACTIVA") {
            return "Activa";
        }

        if (estado === "DESACTIVADA") {
            return "Desactivada";
        }

        return "Finalizada";
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
                <td colspan="8" class="spaces-message">${escaparHTML(texto)}</td>
            </tr>
        `;
    }

    function actualizarContador(total) {
        if (!restriccionesCount) {
            return;
        }

        restriccionesCount.textContent = total === 1 ? "Mostrando 1 restricción" : `Mostrando ${total} restricciones`;
    }

    function formatearFechaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, "0");
        const day = String(fecha.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
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
        let modal = document.getElementById("comunidad-restricciones-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "comunidad-restricciones-modal";
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