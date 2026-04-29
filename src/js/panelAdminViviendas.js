document.addEventListener("DOMContentLoaded", function () {
  console.log("JS de viviendas cargado correctamente");

  const tableHead = document.getElementById("viviendas-table-head");
  const tableBody = document.getElementById("viviendas-table-body");
  const viviendasCount = document.getElementById("viviendas-count");
  const adminName = document.getElementById("admin-name");
  const logoutButton = document.getElementById("logout");
  const urbanizationName = document.getElementById("urbanization-name");
  const csvFileInput = document.getElementById("csv-file");
  const saveHomesButton = document.getElementById("save-homes");
  const editHomesButton = document.getElementById("edit-homes");

  const LOGIN_URL = "login.html";
  const URBANIZACIONES_URL = "panelAdminUrbanizaciones.html";

  let idUrbanizacion = obtenerIdUrbanizacionSeleccionada();
  let espacios = [];
  let viviendasPreview = [];
  let modoEdicion = true;

  prepararLogout();
  pintarUrbanizacionGuardada();
  validarSesionAdmin();

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
            "Selecciona una urbanizacion antes de gestionar viviendas.",
            false,
            function () {
              window.location.href = URBANIZACIONES_URL;
            },
          );
          return;
        }

        cargarDatosIniciales();
      })
      .catch((error) => {
        console.error("Error:", error);
        window.location.href = LOGIN_URL;
      });
  }

  function cargarDatosIniciales() {
    mostrarMensaje("Cargando datos...");

    const formData = new FormData();
    formData.append("funcion", "datosIniciales");
    formData.append("idUrbanizacion", idUrbanizacion);

    fetch("../php/viviendas.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        if (data.status !== "success") {
          mostrarMensaje(data.message || "No se pudieron cargar los datos.");
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
        mostrarMensaje("Error al conectar con el servidor.");
      });
  }

  function cargarViviendasExistentes() {
    const formData = new FormData();
    formData.append("funcion", "listarViviendas");
    formData.append("idUrbanizacion", idUrbanizacion);

    fetch("../php/viviendas.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        if (data.status !== "success") {
          mostrarMensaje(
            data.message || "No se pudieron cargar las viviendas.",
          );
          actualizarContador(0);
          return;
        }

        viviendasPreview = data.viviendas || [];

        if (viviendasPreview.length === 0) {
          modoEdicion = true;
          mostrarMensaje(
            "Todavia no hay viviendas registradas. Sube un archivo CSV para previsualizarlas.",
          );
          actualizarContador(0);
          if (saveHomesButton) saveHomesButton.hidden = true;
          if (editHomesButton) editHomesButton.hidden = true;
          return;
        }

        modoEdicion = false;
        pintarTablaEditable(true);
      })
      .catch((error) => {
        console.error("Error:", error);
        mostrarMensaje("Error al conectar con el servidor.");
      });
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
          mostrarModalMensaje(
            error.message || "No se pudo leer el CSV.",
            false,
          );
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
      permisos: crearPermisosPorDefecto(),
    }));

    modoEdicion = true;
    pintarTablaEditable(false);
  }

  function crearPermisosPorDefecto() {
    const permisos = {};

    espacios.forEach((espacio) => {
      permisos[espacio.id] = true;
    });

    return permisos;
  }

  function pintarTablaEditable(guardadas) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = "";

    const columnasBase = [
      "ID",
      "ID Urb.",
      "Código",
      "Usuario",
      ...(guardadas ? [] : ["Password"]),
      "Email",
      "Teléfono",
      "Bloque",
      "Portal",
      "Escalera",
      "Planta",
      "Puerta",
      "Descripción",
      "SU",
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

    viviendasPreview.forEach((vivienda, index) => {
      tableBody.appendChild(crearFilaVivienda(vivienda, index, guardadas));
    });

    actualizarContador(viviendasPreview.length);

    if (guardadas) {
      modoEdicion = false;
    }

    if (saveHomesButton) {
      saveHomesButton.hidden = !modoEdicion || viviendasPreview.length === 0;
    }

    if (editHomesButton) {
      editHomesButton.hidden = modoEdicion || viviendasPreview.length === 0;
    }
  }

  function crearFilaVivienda(vivienda, index, guardada) {
    const tr = document.createElement("tr");

    tr.appendChild(crearCeldaTexto(vivienda.id || "-"));
    tr.appendChild(crearCeldaTexto(vivienda.id_urbanizacion || idUrbanizacion));
    tr.appendChild(crearCeldaTexto(vivienda.codigo_vivienda || "-"));
    tr.appendChild(crearCeldaTexto(vivienda.nombre_usuario || "-"));

    if (!guardada) {
      tr.appendChild(
        crearCeldaInput(index, "password", vivienda.password, guardada),
      );
    }
    tr.appendChild(
      crearCeldaInput(
        index,
        "email_notificaciones",
        vivienda.email_notificaciones,
        guardada,
      ),
    );
    tr.appendChild(
      crearCeldaInput(
        index,
        "telefono_contacto",
        vivienda.telefono_contacto,
        guardada,
      ),
    );
    tr.appendChild(crearCeldaInput(index, "bloque", vivienda.bloque, guardada));
    tr.appendChild(crearCeldaInput(index, "portal", vivienda.portal, guardada));
    tr.appendChild(
      crearCeldaInput(index, "escalera", vivienda.escalera, guardada),
    );
    tr.appendChild(crearCeldaInput(index, "planta", vivienda.planta, guardada));
    tr.appendChild(crearCeldaInput(index, "puerta", vivienda.puerta, guardada));
    tr.appendChild(
      crearCeldaInput(
        index,
        "descripcion_extra",
        vivienda.descripcion_extra,
        guardada,
      ),
    );
    tr.appendChild(
      crearCeldaCheckbox(
        index,
        "superusuario",
        vivienda.superusuario,
        guardada,
      ),
    );

    espacios.forEach((espacio) => {
      const permisos = vivienda.permisos || {};
      tr.appendChild(
        crearCeldaPermiso(index, espacio.id, permisos[espacio.id], guardada),
      );
    });

    return tr;
  }

  function crearCeldaTexto(texto) {
    const td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  function crearCeldaInput(index, campo, valor, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "text";
    input.value = valor || "";
    input.disabled = disabled;
    input.className = "table-input";

    input.addEventListener("input", function () {
      viviendasPreview[index][campo] = input.value;
    });

    td.appendChild(input);
    return td;
  }

  function crearCeldaCheckbox(index, campo, checked, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.disabled = disabled;
    input.className = "table-check";

    input.addEventListener("change", function () {
      viviendasPreview[index][campo] = input.checked;
    });

    td.appendChild(input);
    return td;
  }

  function crearCeldaPermiso(index, idEspacio, checked, disabled) {
    const td = document.createElement("td");
    const input = document.createElement("input");

    input.type = "checkbox";
    input.checked = Boolean(checked);
    input.disabled = disabled;
    input.className = "table-check";

    input.addEventListener("change", function () {
      if (!viviendasPreview[index].permisos) {
        viviendasPreview[index].permisos = {};
      }

      viviendasPreview[index].permisos[idEspacio] = input.checked;
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
    formData.append("funcion", "guardarViviendas");
    formData.append("idUrbanizacion", idUrbanizacion);
    formData.append("viviendas", JSON.stringify(viviendasPreview));

    saveHomesButton.disabled = true;

    fetch("../php/viviendas.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.text())
      .then(parsearJSON)
      .then((data) => {
        saveHomesButton.disabled = false;

        if (data.status !== "success") {
          mostrarModalMensaje(
            data.message || "No se pudieron guardar las viviendas.",
            false,
          );
          return;
        }

        viviendasPreview = data.viviendas || [];
        modoEdicion = false;
        pintarTablaEditable(true);
        mostrarModalMensaje("Viviendas guardadas correctamente.", true);
      })
      .catch((error) => {
        console.error("Error completo al guardar:", error);
        saveHomesButton.disabled = false;
        mostrarModalMensaje(
          "Error al conectar con el servidor. Revisa la consola.",
          false,
        );
      });
  }

  function validarViviendasAntesGuardar() {
    const emails = new Set();
    const passwords = new Set();

    for (let i = 0; i < viviendasPreview.length; i++) {
      const vivienda = viviendasPreview[i];

      vivienda.email_notificaciones = String(
        vivienda.email_notificaciones || "",
      ).trim();
      vivienda.telefono_contacto = String(
        vivienda.telefono_contacto || "",
      ).trim();
      vivienda.bloque = String(vivienda.bloque || "").trim();
      vivienda.portal = String(vivienda.portal || "").trim();
      vivienda.escalera = String(vivienda.escalera || "").trim();
      vivienda.planta = String(vivienda.planta || "").trim();
      vivienda.puerta = String(vivienda.puerta || "").trim();
      vivienda.descripcion_extra = String(
        vivienda.descripcion_extra || "",
      ).trim();
      vivienda.password = String(vivienda.password || "").trim();

      if (!vivienda.email_notificaciones) {
        return `La vivienda de la fila ${i + 1} no tiene email.`;
      }

      if (!esEmailValido(vivienda.email_notificaciones)) {
        return `El email de la fila ${i + 1} no tiene un formato valido.`;
      }

      const emailNormalizado = vivienda.email_notificaciones.toLowerCase();

      if (emails.has(emailNormalizado)) {
        return `El email ${vivienda.email_notificaciones} esta repetido.`;
      }

      emails.add(emailNormalizado);

      if (!esTelefonoValido(vivienda.telefono_contacto)) {
        return `El telefono de la fila ${i + 1} debe tener 9 cifras o estar vacio.`;
      }

      if (!vivienda.id) {
        if (!vivienda.password) {
          return `La vivienda de la fila ${i + 1} no tiene password.`;
        }

        if (!esPasswordValida(vivienda.password)) {
          return `La password de la fila ${i + 1} debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo.`;
        }

        if (passwords.has(vivienda.password)) {
          return `La password de la fila ${i + 1} esta repetida.`;
        }

        passwords.add(vivienda.password);
      }

      if (vivienda.bloque.length > 20)
        return `El bloque de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.portal.length > 20)
        return `El portal de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.escalera.length > 20)
        return `La escalera de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.planta.length > 20)
        return `La planta de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.puerta.length > 20)
        return `La puerta de la fila ${i + 1} supera los 20 caracteres.`;
      if (vivienda.descripcion_extra.length > 255)
        return `La descripcion de la fila ${i + 1} supera los 255 caracteres.`;

      const permisosMarcados = Object.values(vivienda.permisos || {}).some(
        Boolean,
      );

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
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
      password,
    );
  }

  function leerCSV(texto) {
    const lineas = texto
      .replace(/\r/g, "")
      .split("\n")
      .filter((linea) => linea.trim() !== "");

    if (lineas.length < 2) {
      throw new Error("El CSV debe tener cabecera y al menos una vivienda.");
    }

    const separador = lineas[0].includes(";") ? ";" : ",";
    const cabeceras = lineas[0].split(separador).map(normalizarCabecera);

    validarCabecerasCSV(cabeceras);

    return lineas.slice(1).map((linea, index) => {
      const valores = dividirLineaCSV(linea, separador);

      if (valores.length !== cabeceras.length) {
        throw new Error(
          `La fila ${index + 2} no tiene el mismo numero de columnas que la cabecera.`,
        );
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
      "descripcion_extra",
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
    return String(valor || "")
      .trim()
      .replace(/^"|"$/g, "");
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
    if (!logoutButton) {
      return;
    }

    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();

      fetch("../php/logout.php")
        .then((response) => response.json())
        .then(() => {
          sessionStorage.clear();
          window.location.href = LOGIN_URL;
        })
        .catch((error) => {
          console.error("Error:", error);
          sessionStorage.clear();
          window.location.href = LOGIN_URL;
        });
    });
  }

  function obtenerIdUrbanizacionSeleccionada() {
    const params = new URLSearchParams(window.location.search);
    const idUrl =
      Number(params.get("idUrbanizacion") || params.get("idurbanizacion")) || 0;

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

  function actualizarContador(total) {
    viviendasCount.textContent =
      total === 1 ? "Mostrando 1 vivienda" : `Mostrando ${total} viviendas`;
  }

  function mostrarMensaje(texto) {
    tableHead.innerHTML = "";
    tableBody.innerHTML = `
      <tr>
        <td class="viviendas-message">${escaparHTML(texto)}</td>
      </tr>
    `;
  }

  function parsearJSON(texto) {
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

    if (modal) {
      return modal;
    }

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
