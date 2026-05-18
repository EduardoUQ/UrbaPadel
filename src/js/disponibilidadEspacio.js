document.addEventListener("DOMContentLoaded", function () {
    const usuarioName = document.getElementById("usuario-name");
    const logoutButton = document.getElementById("logout");
    const fechaReserva = document.getElementById("fecha-reserva");
    const slotsList = document.getElementById("slots-list");
    const slotsDateText = document.getElementById("slots-date-text");

    const spaceTitle = document.getElementById("space-title");
    const spaceSubtitle = document.getElementById("space-subtitle");
    const selectedSpaceName = document.getElementById("selected-space-name");
    const selectedSpaceDescription = document.getElementById("selected-space-description");
    const selectedSpaceType = document.getElementById("selected-space-type");
    const selectedSpaceSchedule = document.getElementById("selected-space-schedule");
    const selectedSpaceUnit = document.getElementById("selected-space-unit");
    const selectedSpaceWaitlist = document.getElementById("selected-space-waitlist");

    const LOGIN_URL = "login.html";
    const PANEL_USUARIO_URL = "panelUsuario.html";

    let espacioSeleccionado = obtenerEspacioSeleccionado();
    let idEspacio = obtenerIdEspacioSeleccionado();

    prepararLogout();

    if (!idEspacio) {
        window.location.href = PANEL_USUARIO_URL;
        return;
    }

    configurarFechaInicial();
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

                pintarEspacioGuardado();
                cargarDisponibilidad();
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

    function configurarFechaInicial() {
        if (!fechaReserva) {
            return;
        }

        const hoy = new Date();
        const fechaHoy = formatearFechaInput(hoy);

        fechaReserva.value = fechaHoy;
        fechaReserva.min = fechaHoy;

        fechaReserva.addEventListener("change", function () {
            cargarDisponibilidad();
        });
    }

    function cargarDisponibilidad() {
        if (!fechaReserva || !fechaReserva.value) {
            mostrarMensaje("Selecciona una fecha.");
            return;
        }

        mostrarMensaje("Cargando disponibilidad...");

        const formData = new FormData();
        formData.append("funcion", "obtenerDisponibilidad");
        formData.append("idEspacio", idEspacio);
        formData.append("fecha", fechaReserva.value);

        fetch("../php/disponibilidadEspacio.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudo cargar la disponibilidad.");
                    return;
                }

                if (data.espacio) {
                    espacioSeleccionado = data.espacio;
                    guardarEspacioSeleccionado(data.espacio);
                    pintarEspacio(data.espacio);
                }

                pintarFranjas(data.franjas || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
            });
    }

    function pintarEspacioGuardado() {
        if (espacioSeleccionado) {
            pintarEspacio(espacioSeleccionado);
        }
    }

    function pintarEspacio(espacio) {
        const horario = obtenerHorario(espacio);

        if (spaceTitle) {
            spaceTitle.textContent = espacio.nombre || "Disponibilidad";
        }

        if (spaceSubtitle) {
            spaceSubtitle.textContent = "Consulta y reserva franjas disponibles.";
        }

        if (selectedSpaceName) {
            selectedSpaceName.textContent = espacio.nombre || "Espacio seleccionado";
        }

        if (selectedSpaceDescription) {
            selectedSpaceDescription.textContent = espacio.descripcion || "Sin descripción.";
        }

        if (selectedSpaceType) {
            selectedSpaceType.textContent = espacio.tipo || "-";
        }

        if (selectedSpaceSchedule) {
            selectedSpaceSchedule.textContent = horario;
        }

        if (selectedSpaceUnit) {
            selectedSpaceUnit.textContent = obtenerUnidadTexto(espacio.unidad_reserva);
        }

        if (selectedSpaceWaitlist) {
            selectedSpaceWaitlist.textContent = Number(espacio.permite_lista_espera) === 1 || espacio.permite_lista_espera === true ? "Sí" : "No";
        }
    }

    function pintarFranjas(franjas) {
        slotsList.innerHTML = "";

        if (slotsDateText) {
            slotsDateText.textContent = "Disponibilidad para el " + formatearFechaVisible(fechaReserva.value) + ".";
        }

        if (franjas.length === 0) {
            mostrarMensaje("No hay franjas disponibles para esta fecha.");
            return;
        }

        franjas.forEach(franja => {
            slotsList.appendChild(crearFilaFranja(franja));
        });
    }

    function crearFilaFranja(franja) {
        const row = document.createElement("div");
        row.className = "slot-row";

        const franjaPasada = esFranjaPasada(franja);
        const disponible = franja.estado === "DISPONIBLE" && !franjaPasada;
        const ocupada = franja.estado === "OCUPADA";
        const bloqueada = franja.estado === "BLOQUEADA";
        const permiteListaEspera = espacioSeleccionado && (Number(espacioSeleccionado.permite_lista_espera) === 1 || espacioSeleccionado.permite_lista_espera === true);

        const claseEstado = disponible ? "available" : (bloqueada ? "blocked" : "occupied");
        const textoEstado = disponible ? "Disponible" : (franjaPasada ? "No disponible" : (bloqueada ? "Bloqueado" : "Ocupado"));
        const detalle = obtenerDetalleFranja(franja, franjaPasada);

        row.innerHTML = `
            <div class="slot-time">
                <i class="fa-regular fa-clock"></i>
                <span>${escaparHTML(franja.hora_inicio)} - ${escaparHTML(franja.hora_fin)}</span>
            </div>

            <div class="slot-detail">
                <strong>
                    <span class="slot-status ${claseEstado}">${textoEstado}</span>
                </strong>
                <span>${escaparHTML(detalle)}</span>
            </div>

            <div class="slot-actions">
            ${disponible
                ? `<button class="btn btn-primary js-reservar" type="button">Reservar</button>`
                : ocupada && permiteListaEspera && !franjaPasada
                    ? `<button class="btn btn-secondary js-lista-espera" type="button">Lista de espera</button>`
                    : `<button class="btn btn-secondary" type="button" disabled>No disponible</button>`
            }
            </div>
        `;

        const botonReservar = row.querySelector(".js-reservar");
        const botonListaEspera = row.querySelector(".js-lista-espera");

        if (botonReservar && disponible) {
            botonReservar.addEventListener("click", function () {
                crearReserva(franja, botonReservar);
            });
        }

        if (botonListaEspera && ocupada) {
            botonListaEspera.addEventListener("click", function () {
                apuntarListaEspera(franja, botonListaEspera);
            });
        }

        return row;
    }

    function crearReserva(franja, botonReservar) {
        const formData = new FormData();
        formData.append("idEspacio", idEspacio);
        formData.append("fechaInicio", franja.fecha_inicio);
        formData.append("fechaFin", franja.fecha_fin);

        if (botonReservar) {
            botonReservar.disabled = true;
            botonReservar.textContent = "Reservando...";
        }

        fetch("../php/crearReserva.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Reserva creada correctamente" : (data.message || "No se pudo crear la reserva"),
                    correcto
                );

                if (correcto) {
                    cargarDisponibilidad();
                }
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            })
            .finally(() => {
                if (botonReservar) {
                    botonReservar.disabled = false;
                    botonReservar.textContent = "Reservar";
                }
            });
    }

    function apuntarListaEspera(franja, botonListaEspera) {
        const formData = new FormData();
        formData.append("idEspacio", idEspacio);
        formData.append("fechaInicio", franja.fecha_inicio);
        formData.append("fechaFin", franja.fecha_fin);

        if (botonListaEspera) {
            botonListaEspera.disabled = true;
            botonListaEspera.textContent = "Apuntando...";
        }

        fetch("../php/listaEsperaUsuario.php", {
            method: "POST",
            body: formData
        })
            .then(response => response.text())
            .then(parsearJson)
            .then(data => {
                const correcto = data.status === "success";

                mostrarModalMensaje(
                    correcto ? "Te has apuntado a la lista de espera" : (data.message || "No se pudo apuntar a la lista de espera"),
                    correcto
                );

                if (correcto) {
                    cargarDisponibilidad();
                }
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarModalMensaje("Error al conectar con el servidor.", false);
            })
            .finally(() => {
                if (botonListaEspera) {
                    botonListaEspera.disabled = false;
                    botonListaEspera.textContent = "Lista de espera";
                }
            });
    }

    function obtenerDetalleFranja(franja, franjaPasada) {
        if (franjaPasada) {
            return "Esta franja ya ha pasado.";
        }

        if (franja.estado === "DISPONIBLE") {
            return "Puedes reservar esta franja.";
        }

        if (franja.estado === "BLOQUEADA") {
            return franja.motivo || "Espacio bloqueado temporalmente.";
        }

        if (franja.vivienda) {
            return "Reservado por " + franja.vivienda + ".";
        }

        return "Franja no disponible.";
    }

    function esFranjaPasada(franja) {
        if (!franja.fecha_inicio) {
            return false;
        }

        const ahora = new Date();
        const inicioFranja = new Date(String(franja.fecha_inicio).replace(" ", "T"));

        return inicioFranja < ahora;
    }

    function mostrarMensaje(texto) {
        slotsList.innerHTML = `
            <p class="spaces-message">${escaparHTML(texto)}</p>
        `;
    }

    function obtenerEspacioSeleccionado() {
        try {
            return JSON.parse(sessionStorage.getItem("espacioSeleccionado") || "null");
        } catch (error) {
            return null;
        }
    }

    function obtenerIdEspacioSeleccionado() {
        const params = new URLSearchParams(window.location.search);
        const idUrl = Number(params.get("idEspacio")) || 0;

        if (idUrl > 0) {
            sessionStorage.setItem("idEspacioSeleccionado", idUrl);
            return idUrl;
        }

        return Number(sessionStorage.getItem("idEspacioSeleccionado")) || 0;
    }

    function guardarEspacioSeleccionado(espacio) {
        sessionStorage.setItem("idEspacioSeleccionado", espacio.id);
        sessionStorage.setItem("espacioSeleccionado", JSON.stringify(espacio));
    }

    function obtenerHorario(espacio) {
        if (espacio.hora_apertura && espacio.hora_cierre) {
            return formatearHora(espacio.hora_apertura) + " - " + formatearHora(espacio.hora_cierre);
        }

        return "Sin configurar";
    }

    function obtenerUnidadTexto(unidad) {
        if (unidad === "30_MIN") {
            return "30 minutos";
        }

        if (unidad === "60_MIN") {
            return "60 minutos";
        }

        if (unidad === "1_DIA") {
            return "1 día";
        }

        return "Sin configurar";
    }

    function formatearHora(hora) {
        return String(hora || "").slice(0, 5);
    }

    function formatearFechaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, "0");
        const day = String(fecha.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatearFechaVisible(fechaTexto) {
        const partes = String(fechaTexto).split("-");

        if (partes.length !== 3) {
            return fechaTexto;
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function parsearJson(texto) {
        try {
            return JSON.parse(texto);
        } catch (error) {
            console.error("Respuesta no valida:", texto);
            throw new Error("Respuesta no valida del servidor");
        }
    }

    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function mostrarModalMensaje(mensaje, correcto) {
        const modal = crearModal();
        const modalText = modal.querySelector(".modal-text");
        const modalIcon = modal.querySelector(".modal-icon");
        const acceptButton = modal.querySelector(".modal-accept");

        modalText.textContent = mensaje;
        modalIcon.className = correcto ? "modal-icon modal-icon-success" : "modal-icon modal-icon-error";
        modalIcon.innerHTML = correcto ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
        modal.hidden = false;

        acceptButton.onclick = function () {
            modal.hidden = true;
        };
    }

    function crearModal() {
        let modal = document.getElementById("availability-modal");

        if (modal) {
            return modal;
        }

        modal = document.createElement("div");
        modal.id = "availability-modal";
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