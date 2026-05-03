<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

if (!isset($_SESSION['rol']) || $_SESSION['rol'] !== 'admin') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Sesion de administrador no valida'
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

$funcion = isset($_POST['funcion']) ? trim($_POST['funcion']) : '';

if ($funcion === 'listarReservas') {
    listarReservas($conexion);
}

if ($funcion === 'cancelarReserva') {
    cancelarReservaAdmin($conexion);
}

responder($conexion, 'error', 'Funcion no valida');

function listarReservas($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;

    if ($idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    $urbanizacion = obtenerUrbanizacion($conexion, $idUrbanizacion);

    if (!$urbanizacion) {
        responder($conexion, 'error', 'No se ha encontrado la urbanizacion');
    }

    $sql = "SELECT 
                r.id,
                r.fecha_inicio,
                r.fecha_fin,
                r.estado,
                r.fecha_cancelacion,
                e.nombre AS espacio_nombre,
                e.tipo AS espacio_tipo,
                v.codigo_vivienda,
                v.nombre_usuario
            FROM reserva r
            INNER JOIN espacio e ON e.id = r.id_espacio
            INNER JOIN vivienda v ON v.id = r.id_vivienda
            WHERE e.id_urbanizacion = ?
            ORDER BY r.fecha_inicio DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al cargar las reservas');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $reservas = [];
    $ahora = new DateTime();

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $inicio = new DateTime($fila['fecha_inicio']);
            $fin = new DateTime($fila['fecha_fin']);

            $estadoVisual = obtenerEstadoVisual($fila['estado'], $fin, $ahora);

            $reservas[] = [
                'id' => (int)$fila['id'],
                'espacio_nombre' => $fila['espacio_nombre'],
                'espacio_tipo' => $fila['espacio_tipo'],
                'codigo_vivienda' => $fila['codigo_vivienda'],
                'nombre_usuario' => $fila['nombre_usuario'],
                'fecha_reserva' => $inicio->format('d/m/Y'),
                'hora_inicio' => $inicio->format('H:i'),
                'hora_fin' => $fin->format('H:i'),
                'duracion_texto' => obtenerDuracionTexto($inicio, $fin),
                'estado' => $fila['estado'],
                'estado_visual' => $estadoVisual,
                'fecha_cancelacion' => $fila['fecha_cancelacion'],
                'puede_cancelar' => $estadoVisual === 'ACTIVA'
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'urbanizacion' => $urbanizacion,
        'reservas' => $reservas
    ]);

    $conexion->close();
    exit;
}

function cancelarReservaAdmin($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;
    $idReserva = isset($_POST['idReserva']) ? (int)$_POST['idReserva'] : 0;

    if ($idUrbanizacion <= 0 || $idReserva <= 0) {
        responder($conexion, 'error', 'Datos de cancelacion no validos');
    }

    $reserva = obtenerReservaUrbanizacion($conexion, $idReserva, $idUrbanizacion);

    if (!$reserva) {
        responder($conexion, 'error', 'No se ha encontrado la reserva');
    }

    if ($reserva['estado'] !== 'ACTIVA') {
        responder($conexion, 'error', 'Solo se pueden cancelar reservas activas');
    }

    $sql = "UPDATE reserva
            SET estado = 'CANCELADA',
                fecha_cancelacion = NOW()
            WHERE id = ?
                AND estado = 'ACTIVA'";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la cancelacion');
    }

    $stmt->bind_param('i', $idReserva);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo cancelar la reserva');
    }

    $stmt->close();

    responder($conexion, 'success', 'Reserva cancelada correctamente');
}

function obtenerUrbanizacion($conexion, $idUrbanizacion)
{
    $sql = "SELECT id, nombre
            FROM urbanizacion
            WHERE id = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $urbanizacion = $resultado->fetch_assoc();
    $stmt->close();

    $urbanizacion['id'] = (int)$urbanizacion['id'];

    return $urbanizacion;
}

function obtenerReservaUrbanizacion($conexion, $idReserva, $idUrbanizacion)
{
    $sql = "SELECT 
                r.id,
                r.estado
            FROM reserva r
            INNER JOIN espacio e ON e.id = r.id_espacio
            WHERE r.id = ?
                AND e.id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idReserva, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $reserva = $resultado->fetch_assoc();
    $stmt->close();

    return $reserva;
}

function obtenerEstadoVisual($estado, $fin, $ahora)
{
    if ($estado === 'CANCELADA') {
        return 'CANCELADA';
    }

    if ($estado === 'ACTIVA' && $fin < $ahora) {
        return 'FINALIZADA';
    }

    return 'ACTIVA';
}

function obtenerDuracionTexto($inicio, $fin)
{
    $segundos = $fin->getTimestamp() - $inicio->getTimestamp();
    $minutos = (int)($segundos / 60);

    if ($minutos < 60) {
        return $minutos . ' minutos';
    }

    $horas = $minutos / 60;

    if ($horas == 1) {
        return '1 hora';
    }

    if ($minutos % 60 === 0) {
        return (int)$horas . ' horas';
    }

    return $minutos . ' minutos';
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