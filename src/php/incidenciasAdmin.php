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

if ($funcion === 'listarIncidencias') {
    listarIncidencias($conexion);
}

if ($funcion === 'resolverIncidencia') {
    resolverIncidencia($conexion);
}

responder($conexion, 'error', 'Funcion no valida');

function listarIncidencias($conexion)
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
                c.id,
                c.comentario,
                c.fecha_creacion,
                c.visible,
                c.resuelto,
                e.nombre AS espacio_nombre,
                e.tipo AS espacio_tipo,
                v.codigo_vivienda,
                v.nombre_usuario
            FROM comentario_espacio c
            INNER JOIN espacio e ON e.id = c.id_espacio
            INNER JOIN vivienda v ON v.id = c.id_vivienda
            WHERE e.id_urbanizacion = ?
            ORDER BY c.resuelto ASC, c.fecha_creacion DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar las incidencias');
    }

    $stmt->bind_param('i', $idUrbanizacion);
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
                'espacio_tipo' => $fila['espacio_tipo'],
                'codigo_vivienda' => $fila['codigo_vivienda'],
                'nombre_usuario' => $fila['nombre_usuario']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'urbanizacion' => $urbanizacion,
        'incidencias' => $incidencias
    ]);

    $conexion->close();
    exit;
}

function resolverIncidencia($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;
    $idIncidencia = isset($_POST['idIncidencia']) ? (int)$_POST['idIncidencia'] : 0;

    if ($idUrbanizacion <= 0 || $idIncidencia <= 0) {
        responder($conexion, 'error', 'Datos de incidencia no validos');
    }

    $incidencia = obtenerIncidenciaUrbanizacion($conexion, $idIncidencia, $idUrbanizacion);

    if (!$incidencia) {
        responder($conexion, 'error', 'No se ha encontrado la incidencia');
    }

    if ((bool)$incidencia['resuelto']) {
        responder($conexion, 'error', 'La incidencia ya esta resuelta');
    }

    $sql = "UPDATE comentario_espacio
            SET resuelto = 1
            WHERE id = ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la resolucion');
    }

    $stmt->bind_param('i', $idIncidencia);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo resolver la incidencia');
    }

    $stmt->close();

    responder($conexion, 'success', 'Incidencia resuelta correctamente');
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

function obtenerIncidenciaUrbanizacion($conexion, $idIncidencia, $idUrbanizacion)
{
    $sql = "SELECT 
                c.id,
                c.resuelto
            FROM comentario_espacio c
            INNER JOIN espacio e ON e.id = c.id_espacio
            WHERE c.id = ?
                AND e.id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idIncidencia, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $incidencia = $resultado->fetch_assoc();
    $stmt->close();

    return $incidencia;
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