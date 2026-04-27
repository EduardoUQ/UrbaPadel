<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexion con la base de datos'
    ]);
    exit;
}

validarSesionAdmin($conexion);

$funcion = isset($_POST['funcion']) ? $_POST['funcion'] : '';

if ($funcion === 'listarEspacios') {
    listarEspacios($conexion);
} elseif ($funcion === 'obtenerEspacio') {
    obtenerEspacio($conexion);
} elseif ($funcion === 'crearEspacio') {
    guardarEspacio($conexion, false);
} elseif ($funcion === 'editarEspacio') {
    guardarEspacio($conexion, true);
} elseif ($funcion === 'eliminarEspacio') {
    eliminarEspacio($conexion);
} else {
    responder($conexion, 'error', 'Funcion no valida');
}

function validarSesionAdmin($conexion)
{
    if (!isset($_SESSION['rol']) || $_SESSION['rol'] !== 'admin' || !isset($_SESSION['id'])) {
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $idAdmin = (int)$_SESSION['id'];
    $sql = "SELECT id, activo FROM administrador WHERE id = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al validar la sesion');
    }

    $stmt->bind_param('i', $idAdmin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $admin = $resultado->fetch_assoc();
    $stmt->close();

    if (!(bool)$admin['activo']) {
        session_destroy();
        responder($conexion, 'error', 'Cuenta de administrador inactiva');
    }
}

function listarEspacios($conexion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    $urbanizacion = obtenerUrbanizacion($conexion, $idUrbanizacion);

    $sql = "SELECT
                e.id,
                e.id_urbanizacion,
                e.nombre,
                e.tipo,
                e.descripcion,
                e.activo,
                ec.hora_apertura,
                ec.hora_cierre,
                ec.unidad_reserva
            FROM espacio e
            LEFT JOIN espacio_configuracion ec ON ec.id_espacio = e.id
            WHERE e.id_urbanizacion = ?
            ORDER BY e.nombre ASC";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener los espacios');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado) {
        $stmt->close();
        responder($conexion, 'error', 'Error al obtener los espacios');
    }

    $espacios = [];

    while ($fila = $resultado->fetch_assoc()) {
        $activo = (bool)$fila['activo'];

        $espacios[] = [
            'id' => (int)$fila['id'],
            'id_urbanizacion' => (int)$fila['id_urbanizacion'],
            'nombre' => $fila['nombre'],
            'tipo' => $fila['tipo'],
            'descripcion' => $fila['descripcion'],
            'activo' => $activo,
            'estado' => $activo ? 'Activa' : 'Inactiva',
            'hora_apertura' => $fila['hora_apertura'],
            'hora_cierre' => $fila['hora_cierre'],
            'unidad_reserva' => $fila['unidad_reserva'],
            'unidad_reserva_texto' => obtenerTextoUnidadReserva($fila['unidad_reserva'])
        ];
    }

    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'urbanizacion' => $urbanizacion,
        'espacios' => $espacios
    ]);
    exit;
}

function eliminarEspacio($conexion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;

    if ($idEspacio <= 0) {
        responder($conexion, 'error', 'Espacio no valido');
    }

    $sql = "DELETE FROM espacio WHERE id = ? AND id_urbanizacion = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al borrar el espacio');
    }

    $stmt->bind_param('ii', $idEspacio, $idUrbanizacion);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo borrar el espacio');
    }

    if ($stmt->affected_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Espacio no encontrado para esta urbanizacion');
    }

    $stmt->close();
    responder($conexion, 'success', 'Espacio eliminado');
}

function obtenerEspacio($conexion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;

    if ($idEspacio <= 0) {
        responder($conexion, 'error', 'Espacio no valido');
    }

    $sql = "SELECT
                e.id,
                e.id_urbanizacion,
                e.nombre,
                e.tipo,
                e.descripcion,
                e.activo,
                ec.hora_apertura,
                ec.hora_cierre,
                ec.unidad_reserva,
                ec.duracion_maxima_minutos,
                ec.max_reservas_dia,
                ec.max_reservas_semana,
                ec.max_dias_anticipacion,
                ec.minutos_entre_reservas,
                ec.permite_lista_espera,
                ec.permite_cancelacion,
                ec.minutos_limite_cancelacion,
                ec.normas_texto
            FROM espacio e
            LEFT JOIN espacio_configuracion ec ON ec.id_espacio = e.id
            WHERE e.id = ? AND e.id_urbanizacion = ?
            LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener el espacio');
    }

    $stmt->bind_param('ii', $idEspacio, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Espacio no encontrado para esta urbanizacion');
    }

    $espacio = normalizarEspacio($resultado->fetch_assoc());
    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'espacio' => $espacio
    ]);
    exit;
}

function guardarEspacio($conexion, $esEdicion)
{
    $idUrbanizacion = obtenerIdUrbanizacion($conexion);
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
    $nombre = obtenerTexto('nombre');
    $tipo = obtenerTexto('tipo');
    $descripcion = obtenerTexto('descripcion');
    $horaApertura = obtenerTexto('hora_apertura');
    $horaCierre = obtenerTexto('hora_cierre');
    $unidadReserva = obtenerTexto('unidad_reserva');
    $duracionMaxima = obtenerEntero('duracion_maxima_minutos');
    $maxReservasDia = obtenerEntero('max_reservas_dia');
    $maxReservasSemana = obtenerEntero('max_reservas_semana');
    $maxDiasAnticipacion = obtenerEntero('max_dias_anticipacion');
    $minutosEntreReservas = obtenerEntero('minutos_entre_reservas');
    $permiteListaEspera = obtenerBooleano('permite_lista_espera');
    $permiteCancelacion = obtenerBooleano('permite_cancelacion');
    $minutosLimiteCancelacion = obtenerEntero('minutos_limite_cancelacion');
    $normasTexto = obtenerTexto('normas_texto');

    if ($esEdicion && $idEspacio <= 0) {
        responder($conexion, 'error', 'Espacio no valido');
    }

    validarDatosEspacio(
        $conexion,
        $nombre,
        $tipo,
        $descripcion,
        $horaApertura,
        $horaCierre,
        $unidadReserva,
        $duracionMaxima,
        $maxReservasDia,
        $maxReservasSemana,
        $maxDiasAnticipacion,
        $minutosEntreReservas,
        $minutosLimiteCancelacion,
        $normasTexto
    );

    $conexion->begin_transaction();

    if ($esEdicion) {
        $sqlEspacio = "UPDATE espacio
                       SET nombre = ?, tipo = ?, descripcion = ?
                       WHERE id = ? AND id_urbanizacion = ?
                       LIMIT 1";
        $stmtEspacio = $conexion->prepare($sqlEspacio);

        if (!$stmtEspacio) {
            responderRollback($conexion, 'error', 'Error interno al editar el espacio');
        }

        $stmtEspacio->bind_param('sssii', $nombre, $tipo, $descripcion, $idEspacio, $idUrbanizacion);
    } else {
        $sqlEspacio = "INSERT INTO espacio (id_urbanizacion, nombre, tipo, descripcion)
                       VALUES (?, ?, ?, ?)";
        $stmtEspacio = $conexion->prepare($sqlEspacio);

        if (!$stmtEspacio) {
            responderRollback($conexion, 'error', 'Error interno al crear el espacio');
        }

        $stmtEspacio->bind_param('isss', $idUrbanizacion, $nombre, $tipo, $descripcion);
    }

    if (!$stmtEspacio->execute()) {
        $stmtEspacio->close();
        responderRollback($conexion, 'error', $esEdicion ? 'No se pudo editar el espacio' : 'No se pudo crear el espacio');
    }

    if ($esEdicion && $stmtEspacio->affected_rows === 0 && !existeEspacio($conexion, $idEspacio, $idUrbanizacion)) {
        $stmtEspacio->close();
        responderRollback($conexion, 'error', 'Espacio no encontrado para esta urbanizacion');
    }

    $idGuardado = $esEdicion ? $idEspacio : $conexion->insert_id;
    $stmtEspacio->close();

    $sqlConfiguracion = "INSERT INTO espacio_configuracion (
                            id_espacio,
                            hora_apertura,
                            hora_cierre,
                            unidad_reserva,
                            duracion_maxima_minutos,
                            max_reservas_dia,
                            max_reservas_semana,
                            max_dias_anticipacion,
                            minutos_entre_reservas,
                            permite_lista_espera,
                            permite_cancelacion,
                            minutos_limite_cancelacion,
                            normas_texto
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            hora_apertura = VALUES(hora_apertura),
                            hora_cierre = VALUES(hora_cierre),
                            unidad_reserva = VALUES(unidad_reserva),
                            duracion_maxima_minutos = VALUES(duracion_maxima_minutos),
                            max_reservas_dia = VALUES(max_reservas_dia),
                            max_reservas_semana = VALUES(max_reservas_semana),
                            max_dias_anticipacion = VALUES(max_dias_anticipacion),
                            minutos_entre_reservas = VALUES(minutos_entre_reservas),
                            permite_lista_espera = VALUES(permite_lista_espera),
                            permite_cancelacion = VALUES(permite_cancelacion),
                            minutos_limite_cancelacion = VALUES(minutos_limite_cancelacion),
                            normas_texto = VALUES(normas_texto)";
    $stmtConfiguracion = $conexion->prepare($sqlConfiguracion);

    if (!$stmtConfiguracion) {
        responderRollback($conexion, 'error', 'Error interno al guardar la configuracion');
    }

    $stmtConfiguracion->bind_param(
        'isssiiiiiiiis',
        $idGuardado,
        $horaApertura,
        $horaCierre,
        $unidadReserva,
        $duracionMaxima,
        $maxReservasDia,
        $maxReservasSemana,
        $maxDiasAnticipacion,
        $minutosEntreReservas,
        $permiteListaEspera,
        $permiteCancelacion,
        $minutosLimiteCancelacion,
        $normasTexto
    );

    if (!$stmtConfiguracion->execute()) {
        $stmtConfiguracion->close();
        responderRollback($conexion, 'error', 'No se pudo guardar la configuracion');
    }

    $stmtConfiguracion->close();
    $conexion->commit();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'message' => $esEdicion ? 'Espacio editado correctamente' : 'Espacio creado correctamente',
        'idEspacio' => (int)$idGuardado,
        'idUrbanizacion' => (int)$idUrbanizacion
    ]);
    exit;
}

function obtenerIdUrbanizacion($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;

    if ($idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    return $idUrbanizacion;
}

function obtenerUrbanizacion($conexion, $idUrbanizacion)
{
    $sql = "SELECT id, nombre, direccion, codigo_postal, municipio, provincia, activo
            FROM urbanizacion
            WHERE id = ?
            LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener la urbanizacion');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Urbanizacion no encontrada');
    }

    $urbanizacion = $resultado->fetch_assoc();
    $stmt->close();

    return [
        'id' => (int)$urbanizacion['id'],
        'nombre' => $urbanizacion['nombre'],
        'direccion' => $urbanizacion['direccion'],
        'codigo_postal' => $urbanizacion['codigo_postal'],
        'municipio' => $urbanizacion['municipio'],
        'provincia' => $urbanizacion['provincia'],
        'activo' => (bool)$urbanizacion['activo']
    ];
}

function obtenerTextoUnidadReserva($unidadReserva)
{
    if ($unidadReserva === '30_MIN') {
        return 'Reservas de 30 minutos';
    }

    if ($unidadReserva === '60_MIN') {
        return 'Reservas de 60 minutos';
    }

    if ($unidadReserva === '1_DIA') {
        return 'Reservas de dia completo';
    }

    return null;
}

function normalizarEspacio($fila)
{
    $activo = (bool)$fila['activo'];

    return [
        'id' => (int)$fila['id'],
        'id_urbanizacion' => (int)$fila['id_urbanizacion'],
        'nombre' => $fila['nombre'],
        'tipo' => $fila['tipo'],
        'descripcion' => $fila['descripcion'],
        'activo' => $activo,
        'estado' => $activo ? 'Activa' : 'Inactiva',
        'hora_apertura' => $fila['hora_apertura'],
        'hora_cierre' => $fila['hora_cierre'],
        'unidad_reserva' => $fila['unidad_reserva'],
        'unidad_reserva_texto' => obtenerTextoUnidadReserva($fila['unidad_reserva']),
        'duracion_maxima_minutos' => isset($fila['duracion_maxima_minutos']) ? (int)$fila['duracion_maxima_minutos'] : null,
        'max_reservas_dia' => isset($fila['max_reservas_dia']) ? (int)$fila['max_reservas_dia'] : null,
        'max_reservas_semana' => isset($fila['max_reservas_semana']) ? (int)$fila['max_reservas_semana'] : null,
        'max_dias_anticipacion' => isset($fila['max_dias_anticipacion']) ? (int)$fila['max_dias_anticipacion'] : null,
        'minutos_entre_reservas' => isset($fila['minutos_entre_reservas']) ? (int)$fila['minutos_entre_reservas'] : null,
        'permite_lista_espera' => isset($fila['permite_lista_espera']) ? (bool)$fila['permite_lista_espera'] : true,
        'permite_cancelacion' => isset($fila['permite_cancelacion']) ? (bool)$fila['permite_cancelacion'] : true,
        'minutos_limite_cancelacion' => isset($fila['minutos_limite_cancelacion']) ? (int)$fila['minutos_limite_cancelacion'] : null,
        'normas_texto' => $fila['normas_texto']
    ];
}

function validarDatosEspacio(
    $conexion,
    $nombre,
    $tipo,
    $descripcion,
    $horaApertura,
    $horaCierre,
    $unidadReserva,
    $duracionMaxima,
    $maxReservasDia,
    $maxReservasSemana,
    $maxDiasAnticipacion,
    $minutosEntreReservas,
    $minutosLimiteCancelacion,
    $normasTexto
) {
    if (
        $nombre === '' ||
        $tipo === '' ||
        $descripcion === '' ||
        $horaApertura === '' ||
        $horaCierre === '' ||
        $unidadReserva === '' ||
        $normasTexto === ''
    ) {
        responder($conexion, 'error', 'Completa todos los campos');
    }

    if (!in_array($unidadReserva, ['30_MIN', '60_MIN', '1_DIA'], true)) {
        responder($conexion, 'error', 'Unidad de reserva no valida');
    }

    if ($horaCierre <= $horaApertura) {
        responder($conexion, 'error', 'La hora de cierre debe ser posterior a la apertura');
    }

    if ($duracionMaxima <= 0 || $maxReservasDia <= 0 || $maxReservasSemana <= 0 || $maxDiasAnticipacion <= 0) {
        responder($conexion, 'error', 'Los limites deben ser mayores que 0');
    }

    if ($minutosEntreReservas < 0 || $minutosLimiteCancelacion < 0) {
        responder($conexion, 'error', 'Los minutos no pueden ser negativos');
    }
}

function existeEspacio($conexion, $idEspacio, $idUrbanizacion)
{
    $sql = "SELECT id FROM espacio WHERE id = ? AND id_urbanizacion = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responderRollback($conexion, 'error', 'Error interno al comprobar el espacio');
    }

    $stmt->bind_param('ii', $idEspacio, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado && $resultado->num_rows > 0;
    $stmt->close();

    return $existe;
}

function obtenerTexto($campo)
{
    return isset($_POST[$campo]) ? trim($_POST[$campo]) : '';
}

function obtenerEntero($campo)
{
    return isset($_POST[$campo]) ? (int)$_POST[$campo] : 0;
}

function obtenerBooleano($campo)
{
    return isset($_POST[$campo]) && $_POST[$campo] === '1' ? 1 : 0;
}

function responderRollback($conexion, $status, $message)
{
    $conexion->rollback();
    responder($conexion, $status, $message);
}

function responder($conexion, $status, $message)
{
    $conexion->close();
    echo json_encode([
        'status' => $status,
        'message' => $message
    ]);
    exit;
}
