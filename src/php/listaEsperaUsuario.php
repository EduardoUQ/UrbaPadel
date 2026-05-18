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
    responder($conexion, 'error', 'Datos de lista de espera no validos');
}

$espacio = obtenerEspacioPermitido($conexion, $idVivienda, $idEspacio);

if (!$espacio) {
    responder($conexion, 'error', 'No tienes permiso para apuntarte a este espacio');
}

if (!(bool)$espacio['permite_lista_espera']) {
    responder($conexion, 'error', 'Este espacio no permite lista de espera');
}

if (!hayReservaActivaEnFranja($conexion, $idEspacio, $fechaInicio, $fechaFin)) {
    responder($conexion, 'error', 'Solo puedes apuntarte a la lista de espera si la franja esta ocupada');
}

if (tieneReservaActivaPropia($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)) {
    responder($conexion, 'error', 'No puedes apuntarte a la lista de espera de una reserva que ya es tuya');
}

if (yaEstaEnListaEspera($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)) {
    responder($conexion, 'error', 'Ya estas apuntado a la lista de espera de esta franja');
}

$posicion = obtenerSiguientePosicion($conexion, $idEspacio, $fechaInicio, $fechaFin);
insertarListaEspera($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin, $posicion);

responder($conexion, 'success', 'Te has apuntado a la lista de espera');

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
                ec.permite_lista_espera
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

    return $espacio;
}

function hayReservaActivaEnFranja($conexion, $idEspacio, $fechaInicio, $fechaFin)
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
        return false;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function tieneReservaActivaPropia($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM reserva
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio < ?
                AND fecha_fin > ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function yaEstaEnListaEspera($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM lista_espera
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND fecha_inicio_deseada = ?
                AND fecha_fin_deseada = ?
                AND estado = 'EN_ESPERA'
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaInicio, $fechaFin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function obtenerSiguientePosicion($conexion, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT COALESCE(MAX(posicion), 0) + 1 AS siguiente_posicion
            FROM lista_espera
            WHERE id_espacio = ?
                AND fecha_inicio_deseada = ?
                AND fecha_fin_deseada = ?
                AND estado = 'EN_ESPERA'";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return 1;
    }

    $stmt->bind_param('iss', $idEspacio, $fechaInicio, $fechaFin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $fila = $resultado ? $resultado->fetch_assoc() : ['siguiente_posicion' => 1];

    $stmt->close();

    return (int)$fila['siguiente_posicion'];
}

function insertarListaEspera($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin, $posicion)
{
    $sql = "INSERT INTO lista_espera 
                (id_espacio, id_vivienda, fecha_inicio_deseada, fecha_fin_deseada, posicion, estado)
            VALUES 
                (?, ?, ?, ?, ?, 'EN_ESPERA')";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la lista de espera');
    }

    $stmt->bind_param('iissi', $idEspacio, $idVivienda, $fechaInicio, $fechaFin, $posicion);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo apuntar a la lista de espera');
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