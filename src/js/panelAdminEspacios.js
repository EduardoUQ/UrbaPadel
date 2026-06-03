import {
  URLS_ADMIN,
  API_ADMIN,
  FUNCIONES_ADMIN,
  FORM_FIELDS_ADMIN,
  PAGINACION,
  MENSAJES_ADMIN,
  ROLES,
  RESPUESTAS,
  TIPOS_ALERTA
} from "./config/constantes.js";

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
  const navViviendas = document.getElementById("nav-viviendas");

  let idUrbanizacion = obtenerIdUrbanizacionSeleccionada();
  let espaciosDisponibles = [];
  let paginaActual = 1;

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
          MENSAJES_ADMIN.SELECCIONA_URBANIZACION_VIVIENDAS,
          false,
          function () {
            window.location.href = URLS_ADMIN.PANEL_URBANIZACIONES;
          }
        );

        return;
      }

      navViviendas.href = `${URLS_ADMIN.PANEL_VIVIENDAS}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
    });
  }

  function validarSesionAdmin() {
    mostrarMensaje(MENSAJES_ADMIN.COMPROBANDO_SESION);

    fetch(API_ADMIN.SESSION_ADMIN)
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== RESPUESTAS.SUCCESS || data.rol !== ROLES.ADMIN) {
          window.location.href = URLS_ADMIN.LOGIN;
          return;
        }

        if (adminName) {
          adminName.textContent = data.nombre || MENSAJES_ADMIN.ADMIN_GENERICO;
        }

        if (!idUrbanizacion) {
          mostrarModalMensaje(
            MENSAJES_ADMIN.SELECCIONA_URBANIZACION_ESPACIOS,
            false,
            function () {
              window.location.href = URLS_ADMIN.PANEL_URBANIZACIONES;
            }
          );

          return;
        }

        cargarEspacios();
      })
      .catch((error) => {
        console.error("Error:", error);
        window.location.href = URLS_ADMIN.LOGIN;
      });
  }

  function prepararLogout() {
    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();

      fetch(API_ADMIN.LOGOUT)
        .then((response) => response.json())
        .then(() => {
          window.location.href = URLS_ADMIN.LOGIN;
        })
        .catch((error) => {
          console.error("Error:", error);
          window.location.href = URLS_ADMIN.LOGIN;
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
          MENSAJES_ADMIN.SELECCIONA_URBANIZACION_CREAR_ESPACIOS,
          false,
          function () {
            window.location.href = URLS_ADMIN.PANEL_URBANIZACIONES;
          }
        );

        return;
      }

      createSpaceLink.href = `${URLS_ADMIN.FORMULARIO_ESPACIO}?idUrbanizacion=${encodeURIComponent(idUrbanizacion)}`;
    });
  }

  function cargarEspacios() {
    mostrarMensaje(MENSAJES_ADMIN.CARGANDO_ESPACIOS);

    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.LISTAR_ESPACIOS);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);

    fetch(API_ADMIN.ESPACIOS, {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        if (data.status !== RESPUESTAS.SUCCESS) {
          mostrarMensaje(data.message || MENSAJES_ADMIN.ERROR_ESPACIOS, TIPOS_ALERTA.ERROR);
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
        mostrarMensaje(MENSAJES_ADMIN.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
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
      mostrarMensaje(MENSAJES_ADMIN.SIN_ESPACIOS);
      actualizarPaginacion();
      return;
    }

    obtenerEspaciosPagina().forEach((espacio) => {
      tableBody.appendChild(crearFilaEspacio(espacio));
    });

    actualizarPaginacion();
  }

  function obtenerEspaciosPagina() {
    const inicio = (paginaActual - 1) * PAGINACION.ESPACIOS_POR_PAGINA;
    return espaciosDisponibles.slice(inicio, inicio + PAGINACION.ESPACIOS_POR_PAGINA);
  }

  function obtenerTotalPaginas() {
    return Math.max(
      1,
      Math.ceil(espaciosDisponibles.length / PAGINACION.ESPACIOS_POR_PAGINA)
    );
  }

  function actualizarPaginacion() {
    const totalPaginas = obtenerTotalPaginas();

    if (paginaActual > totalPaginas) {
      paginaActual = totalPaginas;
    }

    if (paginationControls) {
      paginationControls.hidden = espaciosDisponibles.length <= PAGINACION.ESPACIOS_POR_PAGINA;
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

    tr.querySelector(".js-editar-espacio").addEventListener("click", function () {
      guardarEspacioSeleccionado(espacio);
      window.location.href = `${URLS_ADMIN.FORMULARIO_ESPACIO}?modo=editar&idUrbanizacion=${encodeURIComponent(idUrbanizacion)}&idEspacio=${encodeURIComponent(espacio.id)}`;
    });

    tr.querySelector(".js-eliminar-espacio").addEventListener("click", function () {
      mostrarModalConfirmacion(
        MENSAJES_ADMIN.CONFIRMAR_ELIMINAR_ESPACIO,
        function () {
          eliminarEspacio(espacio.id);
        }
      );
    });

    return tr;
  }

  function eliminarEspacio(idEspacio) {
    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.ELIMINAR_ESPACIO);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);
    formData.append(FORM_FIELDS_ADMIN.ID_ESPACIO, idEspacio);

    fetch(API_ADMIN.ESPACIOS, {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        const correcto = data.status === RESPUESTAS.SUCCESS;

        mostrarModalMensaje(
          correcto ? MENSAJES_ADMIN.ESPACIO_ELIMINADO : (data.message || MENSAJES_ADMIN.ERROR_GENERICO),
          correcto,
          function () {
            if (correcto) {
              cargarEspacios();
            }
          }
        );
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarModalMensaje(MENSAJES_ADMIN.ERROR_GENERICO, false);
      });
  }

  function obtenerIdUrbanizacionSeleccionada() {
    const params = new URLSearchParams(window.location.search);
    const idUrl = Number(params.get(FORM_FIELDS_ADMIN.ID_URBANIZACION)) || 0;

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

  function guardarEspacioSeleccionado(espacio) {
    sessionStorage.setItem("idEspacioSeleccionado", espacio.id);
    sessionStorage.setItem("espacioSeleccionado", JSON.stringify(espacio));
  }

  function actualizarContador(total) {
    if (!spacesCount) {
      return;
    }

    if (total > PAGINACION.ESPACIOS_POR_PAGINA) {
      const visibles = obtenerEspaciosPagina().length;
      spacesCount.textContent = `Mostrando ${visibles} de ${total} espacios`;
      return;
    }

    spacesCount.textContent =
      total === 1 ? "Mostrando 1 espacio" : `Mostrando ${total} espacios`;
  }

  function mostrarMensaje(texto, tipo = TIPOS_ALERTA.INFO) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="spaces-message">
          <urba-alert tipo="${tipo}" mensaje="${escaparHTML(texto)}"></urba-alert>
        </td>
      </tr>
    `;

    espaciosDisponibles = [];
    paginaActual = 1;
    actualizarPaginacion();
  }

  function parsearJSON(texto) {
    try {
      return JSON.parse(texto);
    } catch (error) {
      console.error("Respuesta no valida:", texto);
      throw new Error(MENSAJES_ADMIN.RESPUESTA_NO_VALIDA);
    }
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