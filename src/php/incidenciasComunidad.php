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

if ($funcion === 'listarIncidencias') {
    listarIncidencias($conexion, $superusuario);
}

if ($funcion === 'resolverIncidencia') {
    resolverIncidencia($conexion, $superusuario);
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

function listarIncidencias($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

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
        'urbanizacion' => [
            'id' => $idUrbanizacion,
            'nombre' => $superusuario['urbanizacion']
        ],
        'incidencias' => $incidencias
    ]);

    $conexion->close();
    exit;
}

function resolverIncidencia($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idIncidencia = isset($_POST['idIncidencia']) ? (int)$_POST['idIncidencia'] : 0;

    if ($idIncidencia <= 0) {
        responder($conexion, 'error', 'Incidencia no valida');
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
