export const URLS = {
    LOGIN: "login.html",
    PANEL_USUARIO: "panelUsuario.html"
};

export const API = {
    SESSION_USUARIO: "../php/sessionUsuario.php",
    LOGOUT: "../php/logout.php",
    MIS_RESERVAS: "../php/misReservas.php",
    CANCELAR_RESERVA: "../php/cancelarReserva.php"
};

export const ROLES = {
    USUARIO: "usuario",
    ADMIN: "admin"
};

export const RESPUESTAS = {
    SUCCESS: "success",
    ERROR: "error"
};

export const ESTADOS_RESERVA = {
    ACTIVA: "ACTIVA",
    CANCELADA: "CANCELADA",
    FINALIZADA: "FINALIZADA"
};

export const FILTROS_RESERVA = {
    ACTIVAS: "activas",
    HISTORIAL: "historial",
    TODAS: "todas"
};

export const TIPOS_ALERTA = {
    INFO: "info",
    SUCCESS: "success",
    ERROR: "error"
};

export const MENSAJES = {
    COMPROBANDO_SESION: "Comprobando sesión...",
    CARGANDO_RESERVAS: "Cargando reservas...",
    NO_HAY_RESERVAS: "No hay reservas para mostrar.",
    ERROR_CARGAR_RESERVAS: "No se pudieron cargar las reservas.",
    ERROR_SERVIDOR: "Error al conectar con el servidor.",
    RESERVA_CANCELADA: "Reserva cancelada correctamente",
    ERROR_CANCELAR_RESERVA: "No se pudo cancelar la reserva",
    CONFIRMAR_CANCELACION: "¿Seguro que quieres cancelar esta reserva?",
    RESPUESTA_NO_VALIDA: "Respuesta no válida del servidor",
    USUARIO_GENERICO: "Usuario"
};

export const TEXTOS_ESTADOS_RESERVA = {
    [ESTADOS_RESERVA.ACTIVA]: "Activa",
    [ESTADOS_RESERVA.CANCELADA]: "Cancelada",
    [ESTADOS_RESERVA.FINALIZADA]: "Finalizada"
};

export const CLASES_ESTADOS_RESERVA = {
    [ESTADOS_RESERVA.ACTIVA]: "activa",
    [ESTADOS_RESERVA.CANCELADA]: "cancelada",
    [ESTADOS_RESERVA.FINALIZADA]: "finalizada"
};

export const FORM_FIELDS = {
    ID_RESERVA: "idReserva"
};

export const API_INCIDENCIAS = {
    LISTAR_ESPACIOS: "../php/incidenciasUsuario.php?funcion=listarEspacios",
    LISTAR_INCIDENCIAS: "../php/incidenciasUsuario.php?funcion=listarIncidencias",
    CREAR_INCIDENCIA: "../php/incidenciasUsuario.php"
};

export const FUNCIONES_INCIDENCIA = {
    CREAR_INCIDENCIA: "crearIncidencia"
};

export const ESTADOS_INCIDENCIA = {
    RESUELTA: "resuelta",
    PENDIENTE: "pendiente"
};

export const TEXTOS_ESTADOS_INCIDENCIA = {
    RESUELTA: "Resuelta",
    PENDIENTE: "Pendiente"
};

export const FORM_FIELDS_INCIDENCIA = {
    FUNCION: "funcion",
    ID_ESPACIO: "idEspacio",
    COMENTARIO: "comentario"
};

export const MENSAJES_INCIDENCIAS = {
    CARGANDO_INCIDENCIAS: "Cargando incidencias...",
    COMPROBANDO_SESION: "Comprobando sesión...",
    NO_HAY_INCIDENCIAS: "Todavía no has enviado incidencias.",
    ERROR_CARGAR_INCIDENCIAS: "No se pudieron cargar las incidencias.",
    ERROR_CARGAR_ESPACIOS: "No se pudieron cargar los espacios.",
    ERROR_CARGAR_ESPACIOS_SERVIDOR: "Error al cargar los espacios.",
    ERROR_SERVIDOR: "Error al conectar con el servidor.",
    INCIDENCIA_ENVIADA: "Incidencia enviada correctamente",
    ERROR_ENVIAR_INCIDENCIA: "No se pudo enviar la incidencia",
    SELECCIONA_ESPACIO: "Selecciona un espacio",
    ESCRIBE_INCIDENCIA: "Escribe una incidencia",
    INCIDENCIA_MINIMA: "La incidencia debe tener al menos 10 caracteres",
    RESPUESTA_NO_VALIDA: "Respuesta no válida del servidor",
    PLACEHOLDER_ESPACIO: "Selecciona un espacio",
    ENVIANDO: '<i class="fa-solid fa-spinner"></i><span>Enviando...</span>',
    ENVIAR_INCIDENCIA: '<i class="fa-solid fa-paper-plane"></i><span>Enviar incidencia</span>'
};

export const URLS_ADMIN = {
    LOGIN: "login.html",
    PANEL_URBANIZACIONES: "panelAdminUrbanizaciones.html",
    PANEL_ESPACIOS: "panelAdminEspacios.html",
    FORMULARIO_ESPACIO: "panelAdminFormularioEspacios.html",
    FORMULARIO_URBANIZACION: "panelAdminFormularioUrbanizaciones.html",
    PANEL_VIVIENDAS: "panelAdminViviendas.html"
};

export const API_ADMIN = {
    SESSION_ADMIN: "../php/sessionAdmin.php",
    LOGOUT: "../php/logout.php",
    VIVIENDAS: "../php/viviendas.php",
    ESPACIOS: "../php/espacios.php",
    LISTA_URBANIZACIONES: "../php/listaUrbanizaciones.php",
    FORMULARIO_URBANIZACIONES: "../php/formularioUrbanizaciones.php"
};

export const FUNCIONES_ADMIN = {
    DATOS_INICIALES: "datosIniciales",
    LISTAR_VIVIENDAS: "listarViviendas",
    GUARDAR_VIVIENDAS: "guardarViviendas",
    LISTAR_ESPACIOS: "listarEspacios",
    ELIMINAR_ESPACIO: "eliminarEspacio",
    ELIMINAR_URBANIZACION: "eliminarUrbanizacion"
};

export const FORM_FIELDS_ADMIN = {
    FUNCION: "funcion",
    ID_URBANIZACION: "idUrbanizacion",
    ID_ESPACIO: "idEspacio",
    VIVIENDAS: "viviendas"
};

export const PAGINACION = {
    ESPACIOS_POR_PAGINA: 5,
    TODOS: "all"
};

export const MENSAJES_ADMIN = {
    COMPROBANDO_SESION: "Comprobando sesión...",
    ADMIN_GENERICO: "Administrador",

    SELECCIONA_URBANIZACION_VIVIENDAS: "Selecciona una urbanización antes de gestionar viviendas.",
    SELECCIONA_URBANIZACION_ESPACIOS: "Selecciona una urbanización antes de gestionar sus espacios.",
    SELECCIONA_URBANIZACION_CREAR_ESPACIOS: "Selecciona una urbanización antes de crear espacios.",

    CARGANDO_DATOS: "Cargando datos...",
    CARGANDO_ESPACIOS: "Cargando espacios...",
    CARGANDO_URBANIZACIONES: "Cargando urbanizaciones...",

    ERROR_SERVIDOR: "Error al conectar con el servidor.",
    ERROR_DATOS: "No se pudieron cargar los datos.",
    ERROR_VIVIENDAS: "No se pudieron cargar las viviendas.",
    ERROR_ESPACIOS: "No se pudieron cargar los espacios.",
    ERROR_URBANIZACIONES: "No se pudieron cargar las urbanizaciones.",

    SIN_VIVIENDAS: "Todavía no hay viviendas registradas. Sube un archivo CSV para previsualizarlas.",
    SIN_ESPACIOS: "Todavía no hay espacios registrados para esta urbanización.",
    SIN_URBANIZACIONES: "Todavía no hay urbanizaciones registradas.",
    SIN_RESULTADOS_VIVIENDAS: "No hay viviendas que cumplan los filtros.",

    RESPUESTA_NO_VALIDA: "Respuesta no válida del servidor",

    ESPACIO_ELIMINADO: "Espacio eliminado",
    URBANIZACION_BORRADA: "Urbanización borrada",
    ERROR_GENERICO: "Hubo algún fallo",

    CONFIRMAR_ELIMINAR_ESPACIO: "¿Seguro que quieres eliminar este espacio?",
    CONFIRMAR_ELIMINAR_URBANIZACION: "¿Estás seguro de que quieres borrar esta urbanización?"
};