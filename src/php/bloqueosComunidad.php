<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

if (!isset($_SESSION['rol']) || $_SESSION['rol'] !== 'usuario') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Sesion de usuario no valida'
    ]);
    exit;
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexion con la base de datos'
    ]);
    exit;
}

$superusuario = obtenerSuperusuario($conexion);

if (!$superusuario) {
    responder($conexion, 'error', 'No tienes permisos de superusuario');
}

$funcion = isset($_POST['funcion']) ? trim($_POST['funcion']) : '';

if ($funcion === 'listarEspacios') {
    listarEspacios($conexion, $superusuario);
}

if ($funcion === 'listarBloqueos') {
    listarBloqueos($conexion, $superusuario);
}

if ($funcion === 'crearBloqueo') {
    crearBloqueo($conexion, $superusuario);
}

if ($funcion === 'desactivarBloqueo') {
    desactivarBloqueo($conexion, $superusuario);
}

responder($conexion, 'error', 'Funcion no valida');

function obtenerSuperusuario($conexion)
{
    $idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;

    $sql = "SELECT 
                v.id,
                v.id_urbanizacion,
                v.nombre_usuario,
                v.superusuario,
                v.activa,
                u.nombre AS urbanizacion
            FROM vivienda v
            INNER JOIN urbanizacion u ON u.id = v.id_urbanizacion
            WHERE v.id = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $idVivienda);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $usuario = $resultado->fetch_assoc();
    $stmt->close();

    if (!(bool)$usuario['activa'] || !(bool)$usuario['superusuario']) {
        return null;
    }

    $usuario['id'] = (int)$usuario['id'];
    $usuario['id_urbanizacion'] = (int)$usuario['id_urbanizacion'];
    $usuario['superusuario'] = (bool)$usuario['superusuario'];

    return $usuario;
}

function listarEspacios($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT 
                e.id,
                e.nombre,
                e.tipo,
                ec.hora_apertura,
                ec.hora_cierre,
                ec.unidad_reserva
            FROM espacio e
            INNER JOIN espacio_configuracion ec 
                ON ec.id_espacio = e.id
            WHERE e.id_urbanizacion = ?
                AND e.activo = 1
            ORDER BY e.nombre ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar los espacios: ' . $conexion->error);
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $espacios = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $espacios[] = [
                'id' => (int)$fila['id'],
                'nombre' => $fila['nombre'],
                'tipo' => $fila['tipo'],
                'hora_apertura' => $fila['hora_apertura'],
                'hora_cierre' => $fila['hora_cierre'],
                'unidad_reserva' => $fila['unidad_reserva']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'espacios' => $espacios
    ]);

    $conexion->close();
    exit;
}

function listarBloqueos($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT 
                b.id,
                b.id_espacio,
                b.motivo,
                b.fecha_inicio,
                b.fecha_fin,
                b.activo,
                b.creado_por_tipo,
                b.creado_por_id,
                b.fecha_creacion,
                e.nombre AS espacio_nombre,
                e.tipo AS espacio_tipo
            FROM bloqueo_espacio b
            INNER JOIN espacio e ON e.id = b.id_espacio
            WHERE e.id_urbanizacion = ?
            ORDER BY b.fecha_inicio DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar los bloqueos');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $bloqueos = [];
    $ahora = new DateTime();

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $inicio = new DateTime($fila['fecha_inicio']);
            $fin = new DateTime($fila['fecha_fin']);

            $activo = (bool)$fila['activo'];

            if (!$activo) {
                $estadoVisual = 'DESACTIVADO';
            } else if ($fin > $ahora) {
                $estadoVisual = 'ACTIVO';
            } else {
                $estadoVisual = 'FINALIZADO';
            }

            $bloqueos[] = [
                'id' => (int)$fila['id'],
                'id_espacio' => (int)$fila['id_espacio'],
                'espacio_nombre' => $fila['espacio_nombre'],
                'espacio_tipo' => $fila['espacio_tipo'],
                'fecha_inicio_visible' => $inicio->format('d/m/Y'),
                'fecha_fin_visible' => $fin->format('d/m/Y'),
                'hora_inicio' => $inicio->format('H:i'),
                'hora_fin' => $fin->format('H:i'),
                'motivo' => $fila['motivo'],
                'activo' => $activo,
                'creado_por_tipo' => $fila['creado_por_tipo'],
                'creado_por_id' => (int)$fila['creado_por_id'],
                'fecha_creacion' => $fila['fecha_creacion'],
                'estado_visual' => $estadoVisual,
                'puede_desactivar' => $estadoVisual === 'ACTIVO'
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'bloqueos' => $bloqueos
    ]);

    $conexion->close();
    exit;
}

function crearBloqueo($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
    $fechaInicioTexto = isset($_POST['fechaInicio']) ? trim($_POST['fechaInicio']) : '';
    $horaInicio = isset($_POST['horaInicio']) ? trim($_POST['horaInicio']) : '';
    $fechaFinTexto = isset($_POST['fechaFin']) ? trim($_POST['fechaFin']) : '';
    $horaFin = isset($_POST['horaFin']) ? trim($_POST['horaFin']) : '';
    $motivo = isset($_POST['motivo']) ? trim($_POST['motivo']) : '';

    if (
        $idEspacio <= 0 ||
        !validarFecha($fechaInicioTexto) ||
        !validarFecha($fechaFinTexto) ||
        !validarHora($horaInicio) ||
        !validarHora($horaFin) ||
        mb_strlen($motivo) < 5
    ) {
        responder($conexion, 'error', 'Datos de bloqueo no validos');
    }

    if (!espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)) {
        responder($conexion, 'error', 'No tienes permiso sobre este espacio');
    }

    $horaInicioNormalizada = normalizarHora($horaInicio);
    $horaFinNormalizada = normalizarHora($horaFin);

    $fechaInicio = $fechaInicioTexto . ' ' . $horaInicioNormalizada;
    $fechaFin = $fechaFinTexto . ' ' . $horaFinNormalizada;

    $inicio = new DateTime($fechaInicio);
    $fin = new DateTime($fechaFin);
    $ahora = new DateTime();

    if ($fin <= $inicio) {
        responder($conexion, 'error', 'La fecha y hora de fin debe ser posterior al inicio');
    }

    if ($inicio < $ahora) {
        responder($conexion, 'error', 'No puedes crear un bloqueo en una franja pasada');
    }

    if (hayBloqueoSolapado($conexion, $idEspacio, $fechaInicio, $fechaFin)) {
        responder($conexion, 'error', 'Ya existe un bloqueo activo en ese periodo');
    }

    cancelarReservasSolapadas($conexion, $idEspacio, $fechaInicio, $fechaFin);
    cancelarListasEsperaSolapadas($conexion, $idEspacio, $fechaInicio, $fechaFin);

    $creadoPorTipo = 'SUPERUSUARIO';
    $creadoPorId = (int)$superusuario['id'];

    $sql = "INSERT INTO bloqueo_espacio
                (id_espacio, motivo, fecha_inicio, fecha_fin, activo, creado_por_tipo, creado_por_id)
            VALUES
                (?, ?, ?, ?, 1, ?, ?)";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar el bloqueo');
    }

    $stmt->bind_param(
        'issssi',
        $idEspacio,
        $motivo,
        $fechaInicio,
        $fechaFin,
        $creadoPorTipo,
        $creadoPorId
    );

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo crear el bloqueo');
    }

    $stmt->close();

    responder($conexion, 'success', 'Bloqueo creado correctamente');
}

function desactivarBloqueo($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idBloqueo = isset($_POST['idBloqueo']) ? (int)$_POST['idBloqueo'] : 0;

    if ($idBloqueo <= 0) {
        responder($conexion, 'error', 'Bloqueo no valido');
    }

    $bloqueo = obtenerBloqueoUrbanizacion($conexion, $idBloqueo, $idUrbanizacion);

    if (!$bloqueo) {
        responder($conexion, 'error', 'No se ha encontrado el bloqueo');
    }

    $sql = "UPDATE bloqueo_espacio
            SET activo = 0
            WHERE id = ?
                AND activo = 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la desactivacion');
    }

    $stmt->bind_param('i', $idBloqueo);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo desactivar el bloqueo');
    }

    $stmt->close();

    responder($conexion, 'success', 'Bloqueo desactivado correctamente');
}

function espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)
{
    $sql = "SELECT id
            FROM espacio
            WHERE id = ?
                AND id_urbanizacion = ?
                AND activo = 1
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $idEspacio, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function obtenerBloqueoUrbanizacion($conexion, $idBloqueo, $idUrbanizacion)
{
    $sql = "SELECT b.id
            FROM bloqueo_espacio b
            INNER JOIN espacio e ON e.id = b.id_espacio
            WHERE b.id = ?
                AND e.id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idBloqueo, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $bloqueo = $resultado->fetch_assoc();
    $stmt->close();

    return $bloqueo;
}

function hayBloqueoSolapado($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM bloqueo_espacio
            WHERE id_espacio = ?
                AND activo = 1
                AND fecha_inicio < ?
                AND fecha_fin > ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function cancelarReservasSolapadas($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "UPDATE reserva
            SET estado = 'CANCELADA',
                fecha_cancelacion = NOW()
            WHERE id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio < ?
                AND fecha_fin > ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $stmt->close();
}

function cancelarListasEsperaSolapadas($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "UPDATE lista_espera
            SET estado = 'CANCELADA'
            WHERE id_espacio = ?
                AND estado = 'EN_ESPERA'
                AND fecha_inicio_deseada < ?
                AND fecha_fin_deseada > ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $stmt->close();
}

function validarFecha($fecha)
{
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha);
}

function validarHora($hora)
{
    return preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $hora);
}

function normalizarHora($hora)
{
    if (preg_match('/^\d{2}:\d{2}$/', $hora)) {
        return $hora . ':00';
    }

    return $hora;
}

function responder($conexion, $status, $message)
{
    if ($conexion instanceof mysqli) {
        $conexion->close();
    }

    echo json_encode([
        'status' => $status,
        'message' => $message
    ]);
    exit;
}
