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

$funcion = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $funcion = isset($_POST['funcion']) ? trim($_POST['funcion']) : '';
} else {
    $funcion = isset($_GET['funcion']) ? trim($_GET['funcion']) : '';
}

if ($funcion === 'listarEspacios') {
    listarEspacios($conexion);
}

if ($funcion === 'listarIncidencias') {
    listarIncidencias($conexion);
}

if ($funcion === 'crearIncidencia') {
    crearIncidencia($conexion);
}

responder($conexion, 'error', 'Funcion no valida');

function listarEspacios($conexion)
{
    $idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;

    $sql = "SELECT 
                e.id,
                e.nombre,
                e.tipo
            FROM vivienda v
            INNER JOIN vivienda_espacio_permiso vep 
                ON vep.id_vivienda = v.id
            INNER JOIN espacio e 
                ON e.id = vep.id_espacio
                AND e.id_urbanizacion = v.id_urbanizacion
            WHERE v.id = ?
                AND v.activa = 1
                AND e.activo = 1
                AND vep.puede_reservar = 1
            ORDER BY e.nombre ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar los espacios');
    }

    $stmt->bind_param('i', $idVivienda);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $espacios = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $espacios[] = [
                'id' => (int)$fila['id'],
                'nombre' => $fila['nombre'],
                'tipo' => $fila['tipo']
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

function listarIncidencias($conexion)
{
    $idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;

    $sql = "SELECT 
                c.id,
                c.comentario,
                c.fecha_creacion,
                c.visible,
                c.resuelto,
                e.nombre AS espacio_nombre,
                e.tipo AS espacio_tipo
            FROM comentario_espacio c
            INNER JOIN espacio e ON e.id = c.id_espacio
            WHERE c.id_vivienda = ?
            ORDER BY c.fecha_creacion DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar las incidencias');
    }

    $stmt->bind_param('i', $idVivienda);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $incidencias = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $fecha = new DateTime($fila['fecha_creacion']);

            $incidencias[] = [
                'id' => (int)$fila['id'],
                'comentario' => $fila['comentario'],
                'fecha_creacion' => $fecha->format('d/m/Y H:i'),
                'visible' => (bool)$fila['visible'],
                'resuelto' => (bool)$fila['resuelto'],
                'espacio_nombre' => $fila['espacio_nombre'],
                'espacio_tipo' => $fila['espacio_tipo']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'incidencias' => $incidencias
    ]);

    $conexion->close();
    exit;
}

function crearIncidencia($conexion)
{
    $idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
    $comentario = isset($_POST['comentario']) ? trim($_POST['comentario']) : '';

    if ($idVivienda <= 0 || $idEspacio <= 0 || $comentario === '') {
        responder($conexion, 'error', 'Completa todos los campos');
    }

    if (mb_strlen($comentario) < 10) {
        responder($conexion, 'error', 'La incidencia debe tener al menos 10 caracteres');
    }

    if (!tienePermisoSobreEspacio($conexion, $idVivienda, $idEspacio)) {
        responder($conexion, 'error', 'No tienes permiso para enviar incidencias sobre este espacio');
    }

    $sql = "INSERT INTO comentario_espacio 
                (id_espacio, id_vivienda, comentario, visible, resuelto)
            VALUES 
                (?, ?, ?, 1, 0)";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la incidencia');
    }

    $stmt->bind_param('iis', $idEspacio, $idVivienda, $comentario);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo guardar la incidencia');
    }

    $stmt->close();

    responder($conexion, 'success', 'Incidencia enviada correctamente');
}

function tienePermisoSobreEspacio($conexion, $idVivienda, $idEspacio)
{
    $sql = "SELECT e.id
            FROM vivienda v
            INNER JOIN vivienda_espacio_permiso vep 
                ON vep.id_vivienda = v.id
            INNER JOIN espacio e 
                ON e.id = vep.id_espacio
                AND e.id_urbanizacion = v.id_urbanizacion
            WHERE v.id = ?
                AND e.id = ?
                AND v.activa = 1
                AND e.activo = 1
                AND vep.puede_reservar = 1
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $idVivienda, $idEspacio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
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