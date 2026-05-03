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

$sql = "SELECT 
            r.id,
            r.fecha_inicio,
            r.fecha_fin,
            r.estado,
            r.fecha_cancelacion,
            e.nombre AS espacio_nombre,
            e.tipo AS espacio_tipo,
            u.nombre AS urbanizacion_nombre,
            ec.permite_cancelacion,
            ec.minutos_limite_cancelacion
        FROM reserva r
        INNER JOIN espacio e ON e.id = r.id_espacio
        INNER JOIN urbanizacion u ON u.id = e.id_urbanizacion
        LEFT JOIN espacio_configuracion ec ON ec.id_espacio = e.id
        WHERE r.id_vivienda = ?
        ORDER BY r.fecha_inicio DESC";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    $conexion->close();

    echo json_encode([
        'status' => 'error',
        'message' => 'Error interno al cargar las reservas'
    ]);
    exit;
}

$stmt->bind_param('i', $idVivienda);
$stmt->execute();
$resultado = $stmt->get_result();

$reservas = [];
$ahora = new DateTime();

if ($resultado) {
    while ($fila = $resultado->fetch_assoc()) {
        $inicio = new DateTime($fila['fecha_inicio']);
        $fin = new DateTime($fila['fecha_fin']);

        $estadoVisual = obtenerEstadoVisual($fila['estado'], $fin, $ahora);
        $puedeCancelar = puedeCancelarReserva($fila, $inicio, $ahora, $estadoVisual);

        $reservas[] = [
            'id' => (int)$fila['id'],
            'espacio_nombre' => $fila['espacio_nombre'],
            'espacio_tipo' => $fila['espacio_tipo'],
            'urbanizacion_nombre' => $fila['urbanizacion_nombre'],
            'fecha_reserva' => $inicio->format('d/m/Y'),
            'hora_inicio' => $inicio->format('H:i'),
            'hora_fin' => $fin->format('H:i'),
            'estado' => $fila['estado'],
            'estado_visual' => $estadoVisual,
            'fecha_cancelacion' => $fila['fecha_cancelacion'],
            'puede_cancelar' => $puedeCancelar
        ];
    }
}

$stmt->close();
$conexion->close();

echo json_encode([
    'status' => 'success',
    'reservas' => $reservas
]);

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

function puedeCancelarReserva($fila, $inicio, $ahora, $estadoVisual)
{
    if ($estadoVisual !== 'ACTIVA') {
        return false;
    }

    if (!(bool)$fila['permite_cancelacion']) {
        return false;
    }

    if ($inicio <= $ahora) {
        return false;
    }

    $minutosLimite = isset($fila['minutos_limite_cancelacion']) ? (int)$fila['minutos_limite_cancelacion'] : 0;

    if ($minutosLimite <= 0) {
        return true;
    }

    $limiteCancelacion = clone $inicio;
    $limiteCancelacion->modify('-' . $minutosLimite . ' minutes');

    return $ahora <= $limiteCancelacion;
}