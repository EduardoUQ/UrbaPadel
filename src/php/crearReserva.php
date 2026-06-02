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
$idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
$fechaInicio = isset($_POST['fechaInicio']) ? trim($_POST['fechaInicio']) : '';
$fechaFin = isset($_POST['fechaFin']) ? trim($_POST['fechaFin']) : '';

if ($idVivienda <= 0 || $idEspacio <= 0 || !validarFechaHora($fechaInicio) || !validarFechaHora($fechaFin)) {
    responder($conexion, 'error', 'Datos de reserva no validos');
}

$restriccion = obtenerRestriccionActiva($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin);

if ($restriccion) {
    responder($conexion, 'error', 'No puedes reservar este espacio porque tienes una restricción activa.');
}

try {
    $inicio = new DateTime($fechaInicio);
    $fin = new DateTime($fechaFin);
    $ahora = new DateTime();

    if ($inicio >= $fin) {
        responder($conexion, 'error', 'La hora de fin debe ser posterior a la hora de inicio');
    }

    if ($inicio < $ahora) {
        responder($conexion, 'error', 'No puedes reservar una franja pasada');
    }

    $espacio = obtenerEspacioPermitido($conexion, $idVivienda, $idEspacio);

    if (!$espacio) {
        responder($conexion, 'error', 'No tienes permiso para reservar este espacio');
    }

    if (!validarAnticipacion($inicio, $espacio)) {
        responder($conexion, 'error', 'La fecha supera los dias maximos de anticipacion permitidos');
    }

    if (!validarDuracion($inicio, $fin, $espacio)) {
        responder($conexion, 'error', 'La reserva supera la duracion maxima permitida');
    }

    if (!validarHorario($inicio, $fin, $espacio)) {
        responder($conexion, 'error', 'La franja seleccionada esta fuera del horario permitido');
    }

    if (hayBloqueoSolapado($conexion, $idEspacio, $fechaInicio, $fechaFin)) {
        responder($conexion, 'error', 'El espacio esta bloqueado en esa franja');
    }

    if (hayReservaSolapada($conexion, $idEspacio, $fechaInicio, $fechaFin)) {
        responder($conexion, 'error', 'La franja ya esta reservada');
    }

    if (!validarMaxReservasDia($conexion, $idVivienda, $idEspacio, $inicio, $espacio)) {
        responder($conexion, 'error', 'Has alcanzado el maximo de reservas diarias para este espacio');
    }

    if (!validarMaxReservasSemana($conexion, $idVivienda, $idEspacio, $inicio, $espacio)) {
        responder($conexion, 'error', 'Has alcanzado el maximo de reservas semanales para este espacio');
    }

    crearReserva($conexion, $idEspacio, $idVivienda, $fechaInicio, $fechaFin);

    responder($conexion, 'success', 'Reserva creada correctamente');
} catch (Exception $e) {
    responder($conexion, 'error', 'Error al procesar la reserva');
}

function validarFechaHora($valor)
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $valor)) {
        return false;
    }

    $fecha = DateTime::createFromFormat('Y-m-d H:i:s', $valor);
    return $fecha && $fecha->format('Y-m-d H:i:s') === $valor;
}

function obtenerEspacioPermitido($conexion, $idVivienda, $idEspacio)
{
    $sql = "SELECT 
                e.id,
                e.id_urbanizacion,
                e.nombre,
                e.tipo,
                e.activo,
                ec.hora_apertura,
                ec.hora_cierre,
                ec.unidad_reserva,
                ec.duracion_maxima_minutos,
                ec.max_reservas_dia,
                ec.max_reservas_semana,
                ec.max_dias_anticipacion,
                ec.minutos_entre_reservas,
                ec.permite_cancelacion,
                ec.minutos_limite_cancelacion
            FROM vivienda v
            INNER JOIN vivienda_espacio_permiso vep 
                ON vep.id_vivienda = v.id
            INNER JOIN espacio e 
                ON e.id = vep.id_espacio
                AND e.id_urbanizacion = v.id_urbanizacion
            INNER JOIN espacio_configuracion ec 
                ON ec.id_espacio = e.id
            WHERE v.id = ?
                AND e.id = ?
                AND v.activa = 1
                AND e.activo = 1
                AND vep.puede_reservar = 1
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idVivienda, $idEspacio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $espacio = $resultado->fetch_assoc();
    $stmt->close();

    $espacio['id'] = (int)$espacio['id'];
    $espacio['id_urbanizacion'] = (int)$espacio['id_urbanizacion'];
    $espacio['activo'] = (bool)$espacio['activo'];
    $espacio['duracion_maxima_minutos'] = (int)$espacio['duracion_maxima_minutos'];
    $espacio['max_reservas_dia'] = (int)$espacio['max_reservas_dia'];
    $espacio['max_reservas_semana'] = (int)$espacio['max_reservas_semana'];
    $espacio['max_dias_anticipacion'] = (int)$espacio['max_dias_anticipacion'];
    $espacio['minutos_entre_reservas'] = (int)$espacio['minutos_entre_reservas'];
    $espacio['permite_cancelacion'] = (bool)$espacio['permite_cancelacion'];
    $espacio['minutos_limite_cancelacion'] = (int)$espacio['minutos_limite_cancelacion'];

    return $espacio;
}

function validarAnticipacion($inicio, $espacio)
{
    $maxDias = (int)$espacio['max_dias_anticipacion'];

    if ($maxDias <= 0) {
        return true;
    }

    $limite = new DateTime();
    $limite->setTime(23, 59, 59);
    $limite->modify('+' . $maxDias . ' days');

    return $inicio <= $limite;
}

function validarDuracion($inicio, $fin, $espacio)
{
    $maxMinutos = (int)$espacio['duracion_maxima_minutos'];

    if ($maxMinutos <= 0) {
        return true;
    }

    $segundos = $fin->getTimestamp() - $inicio->getTimestamp();
    $minutos = $segundos / 60;

    return $minutos <= $maxMinutos;
}

function validarHorario($inicio, $fin, $espacio)
{
    $fecha = $inicio->format('Y-m-d');

    $apertura = new DateTime($fecha . ' ' . $espacio['hora_apertura']);
    $cierre = new DateTime($fecha . ' ' . $espacio['hora_cierre']);

    return $inicio >= $apertura && $fin <= $cierre;
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

function hayReservaSolapada($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM reserva
            WHERE id_espacio = ?
                AND estado = 'ACTIVA'
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

function validarMaxReservasDia($conexion, $idVivienda, $idEspacio, $inicio, $espacio)
{
    $maxDia = (int)$espacio['max_reservas_dia'];

    if ($maxDia <= 0) {
        return true;
    }

    $inicioDia = $inicio->format('Y-m-d') . ' 00:00:00';
    $finDia = $inicio->format('Y-m-d') . ' 23:59:59';

    $sql = "SELECT COUNT(*) AS total
            FROM reserva
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio >= ?
                AND fecha_inicio <= ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $inicioDia, $finDia);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $fila = $resultado ? $resultado->fetch_assoc() : ['total' => 0];
    $stmt->close();

    return (int)$fila['total'] < $maxDia;
}

function validarMaxReservasSemana($conexion, $idVivienda, $idEspacio, $inicio, $espacio)
{
    $maxSemana = (int)$espacio['max_reservas_semana'];

    if ($maxSemana <= 0) {
        return true;
    }

    $inicioSemana = clone $inicio;
    $inicioSemana->modify('monday this week');
    $inicioSemana->setTime(0, 0, 0);

    $finSemana = clone $inicioSemana;
    $finSemana->modify('+6 days');
    $finSemana->setTime(23, 59, 59);

    $inicioSemanaTexto = $inicioSemana->format('Y-m-d H:i:s');
    $finSemanaTexto = $finSemana->format('Y-m-d H:i:s');

    $sql = "SELECT COUNT(*) AS total
            FROM reserva
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio >= ?
                AND fecha_inicio <= ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $inicioSemanaTexto, $finSemanaTexto);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $fila = $resultado ? $resultado->fetch_assoc() : ['total' => 0];
    $stmt->close();

    return (int)$fila['total'] < $maxSemana;
}

function crearReserva($conexion, $idEspacio, $idVivienda, $fechaInicio, $fechaFin)
{
    $sql = "INSERT INTO reserva 
                (id_espacio, id_vivienda, fecha_inicio, fecha_fin, estado)
            VALUES 
                (?, ?, ?, ?, 'ACTIVA')";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la reserva');
    }

    $stmt->bind_param('iiss', $idEspacio, $idVivienda, $fechaInicio, $fechaFin);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo crear la reserva');
    }

    $stmt->close();
}

function obtenerRestriccionActiva($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT 
                id,
                motivo,
                fecha_inicio,
                fecha_fin
            FROM restriccion_uso
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND activa = 1
                AND fecha_inicio < ?
                AND fecha_fin > ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $restriccion = $resultado->fetch_assoc();
    $stmt->close();

    return $restriccion;
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
