import {
  URLS_ADMIN,
  API_ADMIN,
  FUNCIONES_ADMIN,
  FORM_FIELDS_ADMIN,
  MENSAJES_ADMIN,
  ROLES,
  RESPUESTAS,
  TIPOS_ALERTA
} from "./config/constantes.js";

document.addEventListener("DOMContentLoaded", function () {
  const urbanizationGrid = document.getElementById("urbanization-grid");
  const adminName = document.getElementById("admin-name");
  const logoutButton = document.getElementById("logout");

  if (!urbanizationGrid) {
    return;
  }

  urbanizationGrid.innerHTML = "";
  prepararLogout();
  validarSesionAdmin();

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

        cargarUrbanizaciones();
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

  function cargarUrbanizaciones() {
    mostrarMensaje(MENSAJES_ADMIN.CARGANDO_URBANIZACIONES);

    fetch(API_ADMIN.LISTA_URBANIZACIONES)
      .then((response) => response.json())
      .then((data) => {
        if (data.status !== RESPUESTAS.SUCCESS) {
          mostrarMensaje(
            data.message || MENSAJES_ADMIN.ERROR_URBANIZACIONES,
            TIPOS_ALERTA.ERROR
          );
          return;
        }

        pintarUrbanizaciones(data.urbanizaciones || []);
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarMensaje(MENSAJES_ADMIN.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
      });
  }

  function pintarUrbanizaciones(urbanizaciones) {
    urbanizationGrid.innerHTML = "";
    window.urbanizacionesPorId = {};

    if (urbanizaciones.length === 0) {
      mostrarMensaje(MENSAJES_ADMIN.SIN_URBANIZACIONES);
      return;
    }

    urbanizaciones.forEach((urbanizacion) => {
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

      <a class="enter-link" href="${URLS_ADMIN.PANEL_ESPACIOS}?idUrbanizacion=${encodeURIComponent(urbanizacion.id)}">
        <span>Entrar al panel</span>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    `;

    article.querySelector(".enter-link").addEventListener("click", function () {
      guardarUrbanizacionSeleccionada(urbanizacion);
    });

    article
      .querySelector(".js-editar-urbanizacion")
      .addEventListener("click", function () {
        guardarUrbanizacionSeleccionada(urbanizacion);
        window.location.href = `${URLS_ADMIN.FORMULARIO_URBANIZACION}?modo=editar&idUrbanizacion=${encodeURIComponent(urbanizacion.id)}`;
      });

    article
      .querySelector(".js-borrar-urbanizacion")
      .addEventListener("click", function () {
        guardarUrbanizacionSeleccionada(urbanizacion);
        mostrarModalConfirmacion(
          MENSAJES_ADMIN.CONFIRMAR_ELIMINAR_URBANIZACION,
          function () {
            eliminarUrbanizacion(urbanizacion.id);
          }
        );
      });

    return article;
  }

  function guardarUrbanizacionSeleccionada(urbanizacion) {
    sessionStorage.setItem("idUrbanizacionSeleccionada", urbanizacion.id);
    sessionStorage.setItem(
      "urbanizacionSeleccionada",
      JSON.stringify(urbanizacion)
    );
  }

  function eliminarUrbanizacion(idUrbanizacion) {
    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.ELIMINAR_URBANIZACION);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);

    fetch(API_ADMIN.FORMULARIO_URBANIZACIONES, {
      method: "POST",
      body: formData
    })
      .then((response) => response.json())
      .then((data) => {
        const correcto = data.status === RESPUESTAS.SUCCESS;

        mostrarModalMensaje(
          correcto
            ? MENSAJES_ADMIN.URBANIZACION_BORRADA
            : data.message || MENSAJES_ADMIN.ERROR_GENERICO,
          correcto,
          function () {
            if (correcto) {
              cargarUrbanizaciones();
            }
          }
        );
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarModalMensaje(MENSAJES_ADMIN.ERROR_GENERICO, false);
      });
  }

  function mostrarMensaje(texto, tipo = TIPOS_ALERTA.INFO) {
    urbanizationGrid.innerHTML = `
      <urba-alert tipo="${tipo}" mensaje="${escaparHTML(texto)}"></urba-alert>
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