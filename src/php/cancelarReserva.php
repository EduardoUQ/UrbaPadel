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

$idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;
$idReserva = isset($_POST['idReserva']) ? (int)$_POST['idReserva'] : 0;

if ($idVivienda <= 0 || $idReserva <= 0) {
    responder($conexion, 'error', 'Datos de cancelacion no validos');
}

$reserva = obtenerReservaCancelable($conexion, $idReserva, $idVivienda);

if (!$reserva) {
    responder($conexion, 'error', 'No se ha encontrado una reserva activa para cancelar');
}

$inicio = new DateTime($reserva['fecha_inicio']);
$ahora = new DateTime();

if ($inicio <= $ahora) {
    responder($conexion, 'error', 'No puedes cancelar una reserva que ya ha empezado');
}

if (!(bool)$reserva['permite_cancelacion']) {
    responder($conexion, 'error', 'Este espacio no permite cancelaciones');
}

$minutosLimite = isset($reserva['minutos_limite_cancelacion']) ? (int)$reserva['minutos_limite_cancelacion'] : 0;

if ($minutosLimite > 0) {
    $limiteCancelacion = clone $inicio;
    $limiteCancelacion->modify('-' . $minutosLimite . ' minutes');

    if ($ahora > $limiteCancelacion) {
        responder($conexion, 'error', 'Se ha superado el limite de tiempo para cancelar');
    }
}

cancelarReserva($conexion, $idReserva, $idVivienda);

responder($conexion, 'success', 'Reserva cancelada correctamente');

function obtenerReservaCancelable($conexion, $idReserva, $idVivienda)
{
    $sql = "SELECT 
                r.id,
                r.fecha_inicio,
                r.fecha_fin,
                r.estado,
                ec.permite_cancelacion,
                ec.minutos_limite_cancelacion
            FROM reserva r
            INNER JOIN espacio e ON e.id = r.id_espacio
            LEFT JOIN espacio_configuracion ec ON ec.id_espacio = e.id
            WHERE r.id = ?
                AND r.id_vivienda = ?
                AND r.estado = 'ACTIVA'
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idReserva, $idVivienda);
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

function cancelarReserva($conexion, $idReserva, $idVivienda)
{
    $sql = "UPDATE reserva
            SET estado = 'CANCELADA',
                fecha_cancelacion = NOW()
            WHERE id = ?
                AND id_vivienda = ?
                AND estado = 'ACTIVA'";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la cancelacion');
    }

    $stmt->bind_param('ii', $idReserva, $idVivienda);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo cancelar la reserva');
    }

    $stmt->close();
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