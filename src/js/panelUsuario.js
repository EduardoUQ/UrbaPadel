document.addEventListener("DOMContentLoaded", function () {
    const espaciosGrid = document.getElementById("espacios-grid");
    const usuarioName = document.getElementById("usuario-name");
    const urbanizacionTexto = document.getElementById("urbanizacion-texto");
    const logoutButton = document.getElementById("logout");
    const LOGIN_URL = "login.html";

    if (!espaciosGrid) {
        return;
    }

    espaciosGrid.innerHTML = "";
    prepararLogout();
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
                    mostrarMenuSuperusuario(data.superusuario);
                }

                if (urbanizacionTexto && data.urbanizacion) {
                    urbanizacionTexto.textContent = "Consulta los espacios disponibles de " + data.urbanizacion + ".";
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

    function cargarEspacios() {
        mostrarMensaje("Cargando espacios disponibles...");

        fetch("../php/espaciosUsuario.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success") {
                    mostrarMensaje(data.message || "No se pudieron cargar los espacios.");
                    return;
                }

                pintarEspacios(data.espacios || []);
            })
            .catch(error => {
                console.error("Error:", error);
                mostrarMensaje("Error al conectar con el servidor.");
            });
    }

    function pintarEspacios(espacios) {
        espaciosGrid.innerHTML = "";
        window.espaciosPorId = {};

        if (espacios.length === 0) {
            mostrarMensaje("No tienes espacios disponibles para reservar.");
            return;
        }

        espacios.forEach(espacio => {
            window.espaciosPorId[espacio.id] = espacio;
            espaciosGrid.appendChild(crearTarjetaEspacio(espacio));
        });
    }

    function crearTarjetaEspacio(espacio) {
        const article = document.createElement("article");
        article.className = "urbanization-card";
        article.dataset.idEspacio = espacio.id;

        const tipo = espacio.tipo || "Espacio";
        const descripcion = espacio.descripcion || "Espacio común disponible para reserva.";
        const horario = obtenerHorario(espacio);
        const duracion = obtenerDuracion(espacio);
        const listaEspera = Number(espacio.permite_lista_espera) === 1 ? "Sí" : "No";

        article.innerHTML = `
            <div class="card-top">
                <span class="urban-icon" aria-hidden="true">
                    <i class="${obtenerIconoEspacio(tipo)}"></i>
                </span>
                <span class="card-actions">
                    <span class="status-badge">Disponible</span>
                </span>
            </div>

            <div class="urban-heading">
                <h2>${escaparHTML(espacio.nombre)}</h2>
                <p>
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${escaparHTML(tipo)}</span>
                </p>
            </div>

            <p class="urbanization-message" style="padding: 0; border: 0; font-weight: 600;">
                ${escaparHTML(descripcion)}
            </p>

            <dl class="urban-stats">
                <div>
                    <dt><i class="fa-regular fa-clock"></i> Horario</dt>
                    <dd>${escaparHTML(horario)}</dd>
                </div>
                <div>
                    <dt><i class="fa-solid fa-hourglass-half"></i> Duración</dt>
                    <dd>${escaparHTML(duracion)}</dd>
                </div>
                <div>
                    <dt><i class="fa-solid fa-list"></i> Lista espera</dt>
                    <dd>${listaEspera}</dd>
                </div>
                <div>
                    <dt><i class="fa-solid fa-check"></i> Acceso</dt>
                    <dd>Permitido</dd>
                </div>
            </dl>

            <a class="enter-link" href="#" data-id-espacio="${encodeURIComponent(espacio.id)}">
                <span>Ver disponibilidad</span>
                <i class="fa-solid fa-arrow-right"></i>
            </a>
        `;

        article.querySelector(".enter-link").addEventListener("click", function (event) {
            event.preventDefault();
            guardarEspacioSeleccionado(espacio);
            window.location.href = "../html/disponibilidadEspacio.html";
        });

        return article;
    }

    function obtenerHorario(espacio) {
        if (espacio.hora_apertura && espacio.hora_cierre) {
            return espacio.hora_apertura.substring(0, 5) + " - " + espacio.hora_cierre.substring(0, 5);
        }

        return "Sin configurar";
    }

    function obtenerDuracion(espacio) {
        const duracion = Number(espacio.duracion_maxima_minutos);

        if (!duracion) {
            return "Sin límite";
        }

        return duracion + " min";
    }

    function obtenerIconoEspacio(tipo) {
        const tipoNormalizado = String(tipo || "").toLowerCase();

        if (tipoNormalizado.includes("padel") || tipoNormalizado.includes("pádel")) {
            return "fa-solid fa-table-tennis-paddle-ball";
        }

        if (tipoNormalizado.includes("gimnasio")) {
            return "fa-solid fa-dumbbell";
        }

        if (tipoNormalizado.includes("sala")) {
            return "fa-solid fa-door-open";
        }

        if (tipoNormalizado.includes("piscina")) {
            return "fa-solid fa-person-swimming";
        }

        return "fa-regular fa-building";
    }

    function guardarEspacioSeleccionado(espacio) {
        sessionStorage.setItem("idEspacioSeleccionado", espacio.id);
        sessionStorage.setItem("espacioSeleccionado", JSON.stringify(espacio));
    }

    function mostrarMensaje(texto) {
        espaciosGrid.innerHTML = `
            <p class="urbanization-message">${escaparHTML(texto)}</p>
        `;
    }

    function mostrarMensajeTemporal(texto) {
        let modal = document.getElementById("usuario-modal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "usuario-modal";
            modal.className = "modal-backdrop";
            modal.hidden = true;
            modal.innerHTML = `
                <div class="modal-box" role="dialog" aria-modal="true">
                    <span class="modal-icon modal-icon-success" aria-hidden="true">
                        <i class="fa-solid fa-circle-info"></i>
                    </span>
                    <p class="modal-text"></p>
                    <div class="modal-actions">
                        <button class="btn btn-primary modal-accept" type="button">Aceptar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector(".modal-text").textContent = texto;
        modal.hidden = false;

        modal.querySelector(".modal-accept").onclick = function () {
            modal.hidden = true;
        };
    }

    function escaparHTML(valor) {
        const elemento = document.createElement("span");
        elemento.textContent = valor || "";
        return elemento.innerHTML;
    }

    function mostrarMenuSuperusuario(esSuperusuario) {
        const superuserMenu = document.getElementById("superuser-menu");

        if (!superuserMenu) {
            return;
        }

        superuserMenu.hidden = !(esSuperusuario === true || Number(esSuperusuario) === 1);
    }
});