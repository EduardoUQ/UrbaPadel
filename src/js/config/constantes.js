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