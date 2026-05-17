document.addEventListener("DOMContentLoaded", function () {
  const tableBody = document.getElementById("spaces-table-body");
  const spacesCount = document.getElementById("spaces-count");
  const adminName = document.getElementById("admin-name");
  const logoutButton = document.getElementById("logout");
  const urbanizationName = document.getElementById("urbanization-name");
  const breadcrumbUrbanization = document.getElementById("breadcrumb-urbanization");
  const createSpaceLink = document.getElementById("create-space");
  const paginationControls = document.getElementById("spaces-pagination");
  const prevPageButton = document.getElementById("prev-page");
  const nextPageButton = document.getElementById("next-page");
  const LOGIN_URL = "login.html";
  const URBANIZACIONES_URL = "panelAdminUrbanizaciones.html";
  const FORMULARIO_ESPACIO_URL = "panelAdminFormularioEspacios.html";
  const ESPACIOS_POR_PAGINA = 5;
  let idUrbanizacion = obtenerIdUrbanizacionSeleccionada();
  let espaciosDisponibles = [];
  let paginaActual = 1;
  const navViviendas = document.getElementById("nav-viviendas");
  const VIVIENDAS_URL = "panelAdminViviendas.html";

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = "";
  prepararLogout();
  prepararNuevoEspacio();
  pintarUrbanizacionGuardada();
  validarSesionAdmin();
  prepararNavViviendas();
  prepararPaginacion();

  function prepararPaginacion() {
    if (prevPageButton) {
      prevPageButton.addEventListener("click", function () {
        if (paginaActual > 1) {
          paginaActual--;
          pintarEspaciosPagina();
        }
      });
    }

    if (nextPageButton) {
      nextPageButton.addEventListener("click", function () {
        if (paginaActual < obtenerTotalPaginas()) {
          paginaActual++;
          pintarEspaciosPagina();
        }
      });
    }
  }

  function prepararNavViviendas() {
    if (!navViviendas) {
      return;
    }

    navViviendas.addEventListener("click", function (event) {
      if (!idUrbanizacion) {
        event.preventDefault();
        mostrarModalMensaje(
          "Selecciona una urbanizacion antes de gestionar viviendas.",
          false,
          function () {
            window.location.href = URBANIZACIONES_URL;
          },
        );
        return;
      }

      navViviendas.href = `${VIVIENDAS_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
    });
  }

  function validarSesionAdmin() {
    mostrarMensaje("Comprobando sesion...");

    fetch("../php/sessionAdmin.php")
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== "success" || data.rol !== "admin") {
          window.location.href = LOGIN_URL;
          return;
        }

        if (adminName) {
          adminName.textContent = data.nombre || "Administrador";
        }

        if (!idUrbanizacion) {
          mostrarModalMensaje(
            "Selecciona una urbanizacion antes de gestionar sus espacios.",
            false,
            function () {
              window.location.href = URBANIZACIONES_URL;
            },
          );
          return;
        }

        cargarEspacios();
      })
      .catch((error) => {
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
        .then((response) => response.json())
        .then(() => {
          window.location.href = LOGIN_URL;
        })
        .catch((error) => {
          console.error("Error:", error);
          window.location.href = LOGIN_URL;
        });
    });
  }

  function prepararNuevoEspacio() {
    if (!createSpaceLink) {
      return;
    }

    createSpaceLink.addEventListener("click", function (event) {
      if (!idUrbanizacion) {
        event.preventDefault();
        mostrarModalMensaje(
          "Selecciona una urbanizacion antes de crear espacios.",
          false,
          function () {
            window.location.href = URBANIZACIONES_URL;
          },
        );
        return;
      }

      createSpaceLink.href = `${FORMULARIO_ESPACIO_URL}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
    });
  }

  function cargarEspacios() {
    mostrarMensaje("Cargando espacios...");

    const formData = new FormData();
    formData.append("funcion", "listarEspacios");
    formData.append("idUrbanizacion", idUrbanizacion);

    fetch("../php/espacios.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((texto) => {
        try {
          return JSON.parse(texto);
        } catch (error) {
          console.error("Respuesta no valida:", texto);
          throw new Error("Respuesta no valida del servidor");
        }
      })
      .then((data) => {
        if (data.status !== "success") {
          mostrarMensaje(data.message || "No se pudieron cargar los espacios.");
          actualizarContador(0);
          actualizarPaginacion();
          return;
        }

        if (data.urbanizacion) {
          guardarUrbanizacion(data.urbanizacion);
          pintarNombreUrbanizacion(data.urbanizacion.nombre);
        }

        pintarEspacios(data.espacios || []);
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarMensaje("Error al conectar con el servidor.");
        actualizarContador(0);
      });
  }

  function pintarEspacios(espacios) {
    espaciosDisponibles = espacios;
    paginaActual = 1;
    pintarEspaciosPagina();
  }

  function pintarEspaciosPagina() {
    tableBody.innerHTML = "";
    actualizarContador(espaciosDisponibles.length);

    if (espaciosDisponibles.length === 0) {
      mostrarMensaje(
        "Todavia no hay espacios registrados para esta urbanizacion.",
      );
      actualizarPaginacion();
      return;
    }

    obtenerEspaciosPagina().forEach((espacio) => {
      tableBody.appendChild(crearFilaEspacio(espacio));
    });

    actualizarPaginacion();
  }

  function obtenerEspaciosPagina() {
    const inicio = (paginaActual - 1) * ESPACIOS_POR_PAGINA;
    return espaciosDisponibles.slice(inicio, inicio + ESPACIOS_POR_PAGINA);
  }

  function obtenerTotalPaginas() {
    return Math.max(
      1,
      Math.ceil(espaciosDisponibles.length / ESPACIOS_POR_PAGINA),
    );
  }

  function actualizarPaginacion() {
    const totalPaginas = obtenerTotalPaginas();

    if (paginaActual > totalPaginas) {
      paginaActual = totalPaginas;
    }

    if (paginationControls) {
      paginationControls.hidden = espaciosDisponibles.length <= ESPACIOS_POR_PAGINA;
    }

    if (prevPageButton) {
      prevPageButton.disabled = paginaActual <= 1;
    }

    if (nextPageButton) {
      nextPageButton.disabled = paginaActual >= totalPaginas;
    }
  }

  function crearFilaEspacio(espacio) {
    const tr = document.createElement("tr");
    const activo = Boolean(espacio.activo);
    const horario =
      espacio.hora_apertura && espacio.hora_cierre
        ? `${formatearHora(espacio.hora_apertura)} - ${formatearHora(espacio.hora_cierre)}`
        : "Sin configurar";

    tr.innerHTML = `
            <td>
                <div class="space-cell">
                    <div>
                        <strong>${escaparHTML(espacio.nombre)}</strong>
                        <span>${escaparHTML(espacio.descripcion || "Sin descripcion")}</span>
                    </div>
                </div>
            </td>
            <td>${escaparHTML(espacio.tipo)}</td>
            <td>
                <div class="schedule-cell">
                    <strong>${escaparHTML(horario)}</strong>
                    <span>${escaparHTML(espacio.unidad_reserva_texto || "Configuracion pendiente")}</span>
                </div>
            </td>
            <td>
                <span class="status-badge${activo ? "" : " inactive"}">${activo ? "Activa" : "Inactiva"}</span>
            </td>
            <td>
                <div class="row-actions" aria-label="Acciones de espacio">
                    <button class="icon-btn js-editar-espacio" type="button" aria-label="Editar espacio">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn delete js-eliminar-espacio" type="button" aria-label="Eliminar espacio">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;

    tr.querySelector(".js-editar-espacio").addEventListener(
      "click",
      function () {
        guardarEspacioSeleccionado(espacio);
        window.location.href = `${FORMULARIO_ESPACIO_URL}?modo=editar&idUrbanizacion=${encodeURIComponent(idUrbanizacion)}&idEspacio=${encodeURIComponent(espacio.id)}`;
      },
    );

    tr.querySelector(".js-eliminar-espacio").addEventListener(
      "click",
      function () {
        mostrarModalConfirmacion(
          "Seguro que quieres eliminar este espacio?",
          function () {
            eliminarEspacio(espacio.id);
          },
        );
      },
    );

    return tr;
  }

  function eliminarEspacio(idEspacio) {
    const formData = new FormData();
    formData.append("funcion", "eliminarEspacio");
    formData.append("idUrbanizacion", idUrbanizacion);
    formData.append("idEspacio", idEspacio);

    fetch("../php/espacios.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then((texto) => {
        try {
          return JSON.parse(texto);
        } catch (error) {
          console.error("Respuesta no valida:", texto);
          throw new Error("Respuesta no valida del servidor");
        }
      })
      .then((data) => {
        const correcto = data.status === "success";
        mostrarModalMensaje(
          correcto ? "Espacio eliminado" : data.message || "Hubo algun fallo",
          correcto,
          function () {
            if (correcto) {
              cargarEspacios();
            }
          },
        );
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarModalMensaje("Hubo algun fallo", false);
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

    if (breadcrumbUrbanization) {
      breadcrumbUrbanization.textContent = nombre ? `${nombre} /` : "";
    }
  }

  function obtenerUrbanizacionGuardada() {
    try {
      return JSON.parse(
        sessionStorage.getItem("urbanizacionSeleccionada") || "null",
      );
    } catch (error) {
      return null;
    }
  }

  function guardarUrbanizacion(urbanizacion) {
    sessionStorage.setItem("idUrbanizacionSeleccionada", urbanizacion.id);
    sessionStorage.setItem(
      "urbanizacionSeleccionada",
      JSON.stringify(urbanizacion),
    );
    idUrbanizacion = Number(urbanizacion.id) || idUrbanizacion;
  }

  function guardarEspacioSeleccionado(espacio) {
    sessionStorage.setItem("idEspacioSeleccionado", espacio.id);
    sessionStorage.setItem("espacioSeleccionado", JSON.stringify(espacio));
  }

  function actualizarContador(total) {
    if (!spacesCount) {
      return;
    }

    if (total > ESPACIOS_POR_PAGINA) {
      const visibles = obtenerEspaciosPagina().length;
      spacesCount.textContent = `Mostrando ${visibles} de ${total} espacios`;
      return;
    }

    spacesCount.textContent =
      total === 1 ? "Mostrando 1 espacio" : `Mostrando ${total} espacios`;
  }

  function mostrarMensaje(texto) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="spaces-message">${escaparHTML(texto)}</td>
            </tr>
        `;
    espaciosDisponibles = [];
    paginaActual = 1;
    actualizarPaginacion();
  }

  function formatearHora(hora) {
    return String(hora || "").slice(0, 5);
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
    modalIcon.className = correcto
      ? "modal-icon modal-icon-success"
      : "modal-icon modal-icon-error";
    modalIcon.innerHTML = correcto
      ? '<i class="fa-solid fa-check"></i>'
      : '<i class="fa-solid fa-xmark"></i>';
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
    let modal = document.getElementById("spaces-modal");

    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "spaces-modal";
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
