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
  console.log("JS de viviendas cargado correctamente");

  const tableHead = document.getElementById("viviendas-table-head");
  const tableBody = document.getElementById("viviendas-table-body");
  const viviendasCount = document.getElementById("viviendas-count");
  const adminName = document.getElementById("admin-name");
  const logoutButton = document.getElementById("logout");
  const urbanizationName = document.getElementById("urbanization-name");
  const breadcrumbUrbanization = document.getElementById("breadcrumb-urbanization");
  const csvFileInput = document.getElementById("csv-file");
  const saveHomesButton = document.getElementById("save-homes");
  const editHomesButton = document.getElementById("edit-homes");
  const savedControls = document.getElementById("saved-controls");
  const applyFiltersButton = document.getElementById("apply-filters");
  const clearFiltersButton = document.getElementById("clear-filters");
  const pageSizeSelect = document.getElementById("page-size");
  const paginationControls = document.getElementById("pagination-controls");
  const prevPageButton = document.getElementById("prev-page");
  const nextPageButton = document.getElementById("next-page");
  const pageInfo = document.getElementById("page-info");
  const toolbarHelp = document.getElementById("toolbar-help");

  let idUrbanizacion = obtenerIdUrbanizacionSeleccionada();
  let espacios = [];
  let viviendasPreview = [];
  let viviendasFiltradas = [];
  let modoEdicion = true;
  let esListadoGuardado = false;
  let paginaActual = 1;
  let registrosPorPagina = PAGINACION.TODOS;

  prepararLogout();
  prepararFiltrosYPaginacion();
  pintarUrbanizacionGuardada();
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

        if (!idUrbanizacion) {
          mostrarModalMensaje(
            MENSAJES_ADMIN.SELECCIONA_URBANIZACION_VIVIENDAS,
            false,
            function () {
              window.location.href = URLS_ADMIN.PANEL_URBANIZACIONES;
            }
          );
          return;
        }

        cargarDatosIniciales();
      })
      .catch((error) => {
        console.error("Error:", error);
        window.location.href = URLS_ADMIN.LOGIN;
      });
  }

  function cargarDatosIniciales() {
    mostrarMensaje(MENSAJES_ADMIN.CARGANDO_DATOS);

    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.DATOS_INICIALES);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);

    fetch(API_ADMIN.VIVIENDAS, {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        if (data.status !== RESPUESTAS.SUCCESS) {
          mostrarMensaje(data.message || MENSAJES_ADMIN.ERROR_DATOS, TIPOS_ALERTA.ERROR);
          return;
        }

        if (data.urbanizacion) {
          guardarUrbanizacion(data.urbanizacion);
          pintarNombreUrbanizacion(data.urbanizacion.nombre);
        }

        espacios = data.espacios || [];
        cargarViviendasExistentes();
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarMensaje(MENSAJES_ADMIN.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
      });
  }

  function cargarViviendasExistentes() {
    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.LISTAR_VIVIENDAS);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);

    fetch(API_ADMIN.VIVIENDAS, {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        if (data.status !== RESPUESTAS.SUCCESS) {
          mostrarMensaje(data.message || MENSAJES_ADMIN.ERROR_VIVIENDAS, TIPOS_ALERTA.ERROR);
          actualizarContador(0, 0);
          return;
        }

        viviendasPreview = data.viviendas || [];
        viviendasFiltradas = viviendasPreview.slice();

        if (viviendasPreview.length === 0) {
          esListadoGuardado = false;
          modoEdicion = true;
          mostrarMensaje(MENSAJES_ADMIN.SIN_VIVIENDAS);
          actualizarContador(0, 0);
          actualizarControlesListado();
          return;
        }

        esListadoGuardado = true;
        modoEdicion = false;
        paginaActual = 1;
        pintarTablaEditable(true);
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarMensaje(MENSAJES_ADMIN.ERROR_SERVIDOR, TIPOS_ALERTA.ERROR);
      });
  }

  function prepararFiltrosYPaginacion() {
    if (applyFiltersButton) {
      applyFiltersButton.addEventListener("click", function () {
        aplicarFiltros();
      });
    }

    if (clearFiltersButton) {
      clearFiltersButton.addEventListener("click", function () {
        limpiarFiltros();
      });
    }

    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", function () {
        registrosPorPagina = pageSizeSelect.value;
        paginaActual = 1;
        pintarTablaEditable(!modoEdicion);
      });
    }

    if (prevPageButton) {
      prevPageButton.addEventListener("click", function () {
        if (paginaActual > 1) {
          paginaActual--;
          pintarTablaEditable(!modoEdicion);
        }
      });
    }

    if (nextPageButton) {
      nextPageButton.addEventListener("click", function () {
        const totalPaginas = obtenerTotalPaginas();

        if (paginaActual < totalPaginas) {
          paginaActual++;
          pintarTablaEditable(!modoEdicion);
        }
      });
    }
  }

  if (csvFileInput) {
    csvFileInput.addEventListener("change", function () {
      const archivo = csvFileInput.files[0];

      if (!archivo) {
        return;
      }

      if (!archivo.name.toLowerCase().endsWith(".csv")) {
        mostrarModalMensaje("El archivo debe tener formato CSV.", false);
        csvFileInput.value = "";
        return;
      }

      const lector = new FileReader();

      lector.onload = function (event) {
        try {
          const filas = leerCSV(event.target.result);
          prepararPreview(filas);
        } catch (error) {
          console.error("Error:", error);
          mostrarModalMensaje(error.message || "No se pudo leer el CSV.", false);
        }
      };

      lector.readAsText(archivo, "UTF-8");
    });
  }

  if (saveHomesButton) {
    saveHomesButton.addEventListener("click", guardarViviendas);
  }

  if (editHomesButton) {
    editHomesButton.addEventListener("click", function () {
      modoEdicion = true;
      pintarTablaEditable(false);
    });
  }

  function prepararPreview(filas) {
    if (!filas.length) {
      mostrarModalMensaje("El archivo CSV no contiene viviendas.", false);
      return;
    }

    esListadoGuardado = false;
    modoEdicion = true;
    paginaActual = 1;
    limpiarFiltrosSinPintar();

    viviendasPreview = filas.map((fila) => ({
      id: "",
      id_urbanizacion: idUrbanizacion,
      codigo_vivienda: "",
      nombre_usuario: "",
      password: generarPassword(),
      email_notificaciones: fila.email_notificaciones || "",
      telefono_contacto: fila.telefono_contacto || "",
      bloque: fila.bloque || "",
      portal: fila.portal || "",
      escalera: fila.escalera || "",
      planta: fila.planta || "",
      puerta: fila.puerta || "",
      descripcion_extra: fila.descripcion_extra || "",
      superusuario: false,
      activa: true,
      permisos: crearPermisosPorDefecto()
    }));

    viviendasFiltradas = viviendasPreview.slice();
    pintarTablaEditable(false);
  }

  function crearPermisosPorDefecto() {
    const permisos = {};

    espacios.forEach((espacio) => {
      permisos[espacio.id] = true;
    });

    return permisos;
  }

  function pintarTablaEditable(camposBloqueados) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    const mostrarPassword = !esListadoGuardado;
    const viviendasAMostrar = obtenerViviendasVisibles();

    const columnasBase = [
      "ID",
      "ID Urb.",
      "Código",
      "Usuario",
      ...(mostrarPassword ? ["Password"] : []),
      "Email",
      "Teléfono",
      "Bloque",
      "Portal",
      "Escalera",
      "Planta",
      "Puerta",
      "Descripción",
      "SU"
    ];

    const trHead = document.createElement("tr");

    columnasBase.forEach((columna) => {
      const th = document.createElement("th");
      th.textContent = columna;
      trHead.appendChild(th);
    });

    espacios.forEach((espacio) => {
      const th = document.createElement("th");
      th.textContent = espacio.nombre;
      trHead.appendChild(th);
    });

    tableHead.appendChild(trHead);

    if (viviendasAMostrar.length === 0) {
      mostrarFilaSinResultados(columnasBase.length + espacios.length);
    } else {
      viviendasAMostrar.forEach((vivienda) => {
        tableBody.appendChild(crearFilaVivienda(vivienda, camposBloqueados, mostrarPassword));
      });
    }

    actualizarContador(viviendasAMostrar.length, viviendasFiltradas.length);

    if (camposBloqueados) {
      modoEdicion = false;
    }

    actualizarControlesListado();
  }

  function crearFilaVivienda(vivienda, camposBloqueados, mostrarPassword) {
    const tr = document.createElement("tr");

    tr.appendChild(crearCeldaTexto(vivienda.id || "-"));
    tr.appendChild(crearCeldaTexto(vivienda.id_urbanizacion || idUrbanizacion));
    tr.appendChild(crearCeldaTexto(vivienda.codigo_vivienda || "-"));
    tr.appendChild(crearCeldaTexto(vivienda.nombre_usuario || "-"));

    if (mostrarPassword) {
      tr.appendChild(crearCeldaInput(vivienda, "password", vivienda.password, camposBloqueados));
    }

    tr.appendChild(crearCeldaInput(vivienda, "email_notificaciones", vivienda.email_notificaciones, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "telefono_contacto", vivienda.telefono_contacto, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "bloque", vivienda.bloque, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "portal", vivienda.portal, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "escalera", vivienda.escalera, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "planta", vivienda.planta, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "puerta", vivienda.puerta, camposBloqueados));
    tr.appendChild(crearCeldaInput(vivienda, "descripcion_extra", vivienda.descripcion_extra, camposBloqueados));
    tr.appendChild(crearCeldaCheckbox(vivienda, "superusuario", vivienda.superusuario, camposBloqueados));

    espacios.forEach((espacio) => {
      const permisos = vivienda.permisos || {};
      tr.appendChild(crearCeldaPermiso(vivienda, espacio.id, permisos[espacio.id], camposBloqueados));
    });

    return tr;
  }

  function crearCeldaTexto(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  function crearCeldaInput(vivienda, campo, valor, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "text";
    input.value = valor || "";
    input.disabled = disabled;
    input.className = "table-input";

    input.addEventListener("input", function () {
      vivienda[campo] = input.value;
    });

    td.appendChild(input);
    return td;
  }

  function crearCeldaCheckbox(vivienda, campo, checked, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.disabled = disabled;
    input.className = "table-check";

    input.addEventListener("change", function () {
      vivienda[campo] = input.checked;
    });

    td.appendChild(input);
    return td;
  }

  function crearCeldaPermiso(vivienda, idEspacio, checked, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.disabled = disabled;
    input.className = "table-check";

    input.addEventListener("change", function () {
      if (!vivienda.permisos) {
        vivienda.permisos = {};
      }

      vivienda.permisos[idEspacio] = input.checked;
    });

    td.appendChild(input);
    return td;
  }

  function guardarViviendas() {
    if (!viviendasPreview.length) {
      mostrarModalMensaje("No hay viviendas para guardar.", false);
      return;
    }

    const error = validarViviendasAntesGuardar();

    if (error) {
      mostrarModalMensaje(error, false);
      return;
    }

    const formData = new FormData();
    formData.append(FORM_FIELDS_ADMIN.FUNCION, FUNCIONES_ADMIN.GUARDAR_VIVIENDAS);
    formData.append(FORM_FIELDS_ADMIN.ID_URBANIZACION, idUrbanizacion);
    formData.append(FORM_FIELDS_ADMIN.VIVIENDAS, JSON.stringify(viviendasPreview));

    saveHomesButton.disabled = true;

    fetch(API_ADMIN.VIVIENDAS, {
      method: "POST",
      body: formData
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        saveHomesButton.disabled = false;

        if (data.status !== RESPUESTAS.SUCCESS) {
          mostrarModalMensaje(data.message || "No se pudieron guardar las viviendas.", false);
          return;
        }

        viviendasPreview = data.viviendas || [];
        viviendasFiltradas = viviendasPreview.slice();
        esListadoGuardado = true;
        modoEdicion = false;
        paginaActual = 1;
        limpiarFiltrosSinPintar();
        pintarTablaEditable(true);
        mostrarModalMensaje("Viviendas guardadas correctamente.", true);
      })
      .catch((error) => {
        console.error("Error completo al guardar:", error);
        saveHomesButton.disabled = false;
        mostrarModalMensaje("Error al conectar con el servidor. Revisa la consola.", false);
      });
  }

  function aplicarFiltros() {
    viviendasFiltradas = viviendasPreview.filter((vivienda) => {
      return (
        cumpleFiltro(vivienda.id, "filter-id") &&
        cumpleFiltro(vivienda.codigo_vivienda, "filter-codigo") &&
        cumpleFiltro(vivienda.nombre_usuario, "filter-usuario") &&
        cumpleFiltro(vivienda.email_notificaciones, "filter-email") &&
        cumpleFiltro(vivienda.telefono_contacto, "filter-telefono") &&
        cumpleFiltro(vivienda.bloque, "filter-bloque") &&
        cumpleFiltro(vivienda.portal, "filter-portal") &&
        cumpleFiltro(vivienda.escalera, "filter-escalera") &&
        cumpleFiltro(vivienda.planta, "filter-planta") &&
        cumpleFiltro(vivienda.puerta, "filter-puerta") &&
        cumpleFiltro(vivienda.descripcion_extra, "filter-descripcion") &&
        cumpleFiltroSuperusuario(vivienda.superusuario)
      );
    });

    paginaActual = 1;
    pintarTablaEditable(!modoEdicion);
  }

  function cumpleFiltro(valor, idInput) {
    const input = document.getElementById(idInput);
    const filtro = input ? input.value.trim().toLowerCase() : "";

    if (filtro === "") {
      return true;
    }

    return String(valor || "").toLowerCase().includes(filtro);
  }

  function cumpleFiltroSuperusuario(superusuario) {
    const select = document.getElementById("filter-superusuario");

    if (!select || select.value === "") {
      return true;
    }

    return select.value === "1" ? Boolean(superusuario) : !Boolean(superusuario);
  }

  function limpiarFiltros() {
    limpiarFiltrosSinPintar();
    viviendasFiltradas = viviendasPreview.slice();
    paginaActual = 1;
    pintarTablaEditable(!modoEdicion);
  }

  function limpiarFiltrosSinPintar() {
    const ids = [
      "filter-id",
      "filter-codigo",
      "filter-usuario",
      "filter-email",
      "filter-telefono",
      "filter-bloque",
      "filter-portal",
      "filter-escalera",
      "filter-planta",
      "filter-puerta",
      "filter-descripcion"
    ];

    ids.forEach((id) => {
      const input = document.getElementById(id);

      if (input) {
        input.value = "";
      }
    });

    const select = document.getElementById("filter-superusuario");

    if (select) {
      select.value = "";
    }
  }

  function obtenerViviendasVisibles() {
    if (!esListadoGuardado) {
      return viviendasPreview;
    }

    if (registrosPorPagina === PAGINACION.TODOS) {
      return viviendasFiltradas;
    }

    const limite = Number(registrosPorPagina);
    const inicio = (paginaActual - 1) * limite;
    const fin = inicio + limite;

    return viviendasFiltradas.slice(inicio, fin);
  }

  function obtenerTotalPaginas() {
    if (registrosPorPagina === PAGINACION.TODOS) {
      return 1;
    }

    const limite = Number(registrosPorPagina);
    return Math.max(1, Math.ceil(viviendasFiltradas.length / limite));
  }

  function actualizarControlesListado() {
    const hayViviendas = viviendasPreview.length > 0;

    if (savedControls) {
      savedControls.hidden = !esListadoGuardado || !hayViviendas;
    }

    if (toolbarHelp) {
      toolbarHelp.textContent =
        esListadoGuardado && hayViviendas
          ? "Filtra, pagina o edita las viviendas registradas."
          : "Sube un CSV, revisa los datos, modifica lo necesario y pulsa guardar.";
    }

    if (saveHomesButton) {
      saveHomesButton.hidden = !modoEdicion || !hayViviendas;
    }

    if (editHomesButton) {
      editHomesButton.hidden = modoEdicion || !hayViviendas || !esListadoGuardado;
    }

    actualizarPaginacion();
  }

  function actualizarPaginacion() {
    const totalPaginas = obtenerTotalPaginas();
    const usarPaginacion =
      esListadoGuardado &&
      registrosPorPagina !== PAGINACION.TODOS &&
      viviendasFiltradas.length > 0;

    if (paginationControls) {
      paginationControls.hidden = !usarPaginacion;
    }

    if (pageInfo) {
      pageInfo.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    }

    if (prevPageButton) {
      prevPageButton.disabled = paginaActual <= 1;
    }

    if (nextPageButton) {
      nextPageButton.disabled = paginaActual >= totalPaginas;
    }
  }

  function mostrarFilaSinResultados(colspan) {
    tableBody.innerHTML = `
      <tr>
        <td class="viviendas-message" colspan="${colspan}">
          <urba-alert tipo="${TIPOS_ALERTA.INFO}" mensaje="${MENSAJES_ADMIN.SIN_RESULTADOS_VIVIENDAS}"></urba-alert>
        </td>
      </tr>
    `;
  }

  function validarViviendasAntesGuardar() {
    const emails = new Set();
    const passwords = new Set();

    for (let i = 0; i < viviendasPreview.length; i++) {
      const vivienda = viviendasPreview[i];

      vivienda.email_notificaciones = String(vivienda.email_notificaciones || "").trim();
      vivienda.telefono_contacto = String(vivienda.telefono_contacto || "").trim();
      vivienda.bloque = String(vivienda.bloque || "").trim();
      vivienda.portal = String(vivienda.portal || "").trim();
      vivienda.escalera = String(vivienda.escalera || "").trim();
      vivienda.planta = String(vivienda.planta || "").trim();
      vivienda.puerta = String(vivienda.puerta || "").trim();
      vivienda.descripcion_extra = String(vivienda.descripcion_extra || "").trim();
      vivienda.password = String(vivienda.password || "").trim();

      if (!vivienda.email_notificaciones) return `La vivienda de la fila ${i + 1} no tiene email.`;
      if (!esEmailValido(vivienda.email_notificaciones)) return `El email de la fila ${i + 1} no tiene un formato valido.`;

      const emailNormalizado = vivienda.email_notificaciones.toLowerCase();

      if (emails.has(emailNormalizado)) return `El email ${vivienda.email_notificaciones} esta repetido.`;

      emails.add(emailNormalizado);

      if (!esTelefonoValido(vivienda.telefono_contacto)) {
        return `El telefono de la fila ${i + 1} debe tener 9 cifras o estar vacio.`;
      }

      if (!vivienda.id) {
        if (!vivienda.password) return `La vivienda de la fila ${i + 1} no tiene password.`;
        if (!esPasswordValida(vivienda.password)) {
          return `La password de la fila ${i + 1} debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo.`;
        }
        if (passwords.has(vivienda.password)) return `La password de la fila ${i + 1} esta repetida.`;
        passwords.add(vivienda.password);
      }

      if (vivienda.bloque.length > 20) return `El bloque de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.portal.length > 20) return `El portal de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.escalera.length > 20) return `La escalera de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.planta.length > 20) return `La planta de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.puerta.length > 20) return `La puerta de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.descripcion_extra.length > 255) return `La descripcion de la fila ${i + 1} supera los 255 caracteres.`;

      const permisosMarcados = Object.values(vivienda.permisos || {}).some(Boolean);

      if (!permisosMarcados) {
        return `La vivienda de la fila ${i + 1} no tiene ningun espacio permitido.`;
      }
    }

    return "";
  }

  function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function esTelefonoValido(telefono) {
    return telefono === "" || /^[0-9]{9}$/.test(telefono);
  }

  function esPasswordValida(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  }

  function leerCSV(texto) {
    const lineas = texto.replace(/\r/g, "").split("\n").filter((linea) => linea.trim() !== "");

    if (lineas.length < 2) {
      throw new Error("El CSV debe tener cabecera y al menos una vivienda.");
    }

    const separador = lineas[0].includes(";") ? ";" : ",";
    const cabeceras = lineas[0].split(separador).map(normalizarCabecera);

    validarCabecerasCSV(cabeceras);

    return lineas.slice(1).map((linea, index) => {
      const valores = dividirLineaCSV(linea, separador);

      if (valores.length !== cabeceras.length) {
        throw new Error(`La fila ${index + 2} no tiene el mismo numero de columnas que la cabecera.`);
      }

      const fila = {};

      cabeceras.forEach((cabecera, indice) => {
        fila[cabecera] = limpiarValorCSV(valores[indice] || "");
      });

      return fila;
    });
  }

  function validarCabecerasCSV(cabeceras) {
    const obligatorias = [
      "email_notificaciones",
      "telefono_contacto",
      "bloque",
      "portal",
      "escalera",
      "planta",
      "puerta",
      "descripcion_extra"
    ];

    const vistas = new Set();

    cabeceras.forEach((cabecera) => {
      if (vistas.has(cabecera)) {
        throw new Error(`La columna ${cabecera} esta duplicada.`);
      }

      vistas.add(cabecera);
    });

    obligatorias.forEach((columna) => {
      if (!cabeceras.includes(columna)) {
        throw new Error(`Falta la columna obligatoria ${columna}.`);
      }
    });
  }

  function dividirLineaCSV(linea, separador) {
    const valores = [];
    let actual = "";
    let dentroComillas = false;

    for (let i = 0; i < linea.length; i++) {
      const caracter = linea[i];

      if (caracter === '"') {
        dentroComillas = !dentroComillas;
      } else if (caracter === separador && !dentroComillas) {
        valores.push(actual);
        actual = "";
      } else {
        actual += caracter;
      }
    }

    valores.push(actual);
    return valores;
  }

  function limpiarValorCSV(valor) {
    return String(valor || "").trim().replace(/^"|"$/g, "");
  }

  function normalizarCabecera(cabecera) {
    return limpiarValorCSV(cabecera).toLowerCase();
  }

  function generarPassword() {
    const mayusculas = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const minusculas = "abcdefghijkmnopqrstuvwxyz";
    const numeros = "23456789";
    const simbolos = "@$%&!*?";
    const todos = mayusculas + minusculas + numeros + simbolos;

    let password = "";

    password += obtenerCaracterAleatorio(mayusculas);
    password += obtenerCaracterAleatorio(minusculas);
    password += obtenerCaracterAleatorio(numeros);
    password += obtenerCaracterAleatorio(simbolos);

    while (password.length < 12) {
      password += obtenerCaracterAleatorio(todos);
    }

    return mezclarTexto(password);
  }

  function obtenerCaracterAleatorio(caracteres) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return caracteres[array[0] % caracteres.length];
  }

  function mezclarTexto(texto) {
    const caracteres = texto.split("");

    for (let i = caracteres.length - 1; i > 0; i--) {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);

      const j = array[0] % (i + 1);
      const temporal = caracteres[i];
      caracteres[i] = caracteres[j];
      caracteres[j] = temporal;
    }

    return caracteres.join("");
  }

  function prepararLogout() {
    if (!logoutButton) return;

    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();

      fetch(API_ADMIN.LOGOUT)
        .then((response) => response.json())
        .then(() => {
          sessionStorage.clear();
          window.location.href = URLS_ADMIN.LOGIN;
        })
        .catch((error) => {
          console.error("Error:", error);
          sessionStorage.clear();
          window.location.href = URLS_ADMIN.LOGIN;
        });
    });
  }

  function obtenerIdUrbanizacionSeleccionada() {
    const params = new URLSearchParams(window.location.search);
    const idUrl =
      Number(params.get(FORM_FIELDS_ADMIN.ID_URBANIZACION) || params.get("idurbanizacion")) || 0;

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

  function actualizarContador(mostradas, filtradas) {
    if (!viviendasCount) return;

    if (!esListadoGuardado) {
      viviendasCount.textContent =
        mostradas === 1 ? "Mostrando 1 vivienda" : `Mostrando ${mostradas} viviendas`;
      return;
    }

    viviendasCount.textContent = `Mostrando ${mostradas} de ${filtradas} viviendas filtradas (${viviendasPreview.length} total)`;
  }

  function mostrarMensaje(texto, tipo = TIPOS_ALERTA.INFO) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = `
      <tr>
        <td class="viviendas-message">
          <urba-alert tipo="${tipo}" mensaje="${escaparHTML(texto)}"></urba-alert>
        </td>
      </tr>
    `;
  }

  function parsearJSON(texto) {
    try {
      return JSON.parse(texto);
    } catch (error) {
      console.error("Respuesta no valida:", texto);
      throw new Error(MENSAJES_ADMIN.RESPUESTA_NO_VALIDA);
    }
  }

  function escaparHTML(valor) {
    const elemento = document.createElement("span");
    elemento.textContent = valor || "";
    return elemento.innerHTML;
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
    let modal = document.getElementById("viviendas-modal");

    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "viviendas-modal";
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