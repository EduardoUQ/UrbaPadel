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
        'autenticado' => false,
        'message' => 'Sesion de usuario no valida'
    ]);
    exit;
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    echo json_encode([
        'status' => 'error',
        'autenticado' => false,
        'message' => 'Error de conexion con la base de datos'
    ]);
    exit;
}

$idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;

$sql = "SELECT 
            v.id,
            v.nombre_usuario,
            v.codigo_vivienda,
            v.email_notificaciones,
            v.superusuario,
            v.activa,
            u.id AS id_urbanizacion,
            u.nombre AS urbanizacion
        FROM vivienda v
        INNER JOIN urbanizacion u ON u.id = v.id_urbanizacion
        WHERE v.id = ?
        LIMIT 1";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'autenticado' => false,
        'message' => 'Error interno al validar la sesion'
    ]);
    exit;
}

$stmt->bind_param('i', $idVivienda);
$stmt->execute();
$resultado = $stmt->get_result();

if (!$resultado || $resultado->num_rows === 0) {
    $stmt->close();
    $conexion->close();
    session_destroy();

    echo json_encode([
        'status' => 'error',
        'autenticado' => false,
        'message' => 'Sesion de usuario no valida'
    ]);
    exit;
}

$usuario = $resultado->fetch_assoc();

if (!(bool)$usuario['activa']) {
    $stmt->close();
    $conexion->close();
    session_destroy();

    echo json_encode([
        'status' => 'error',
        'autenticado' => false,
        'message' => 'Cuenta de usuario inactiva'
    ]);
    exit;
}

$stmt->close();
$conexion->close();

echo json_encode([
    'status' => 'success',
    'autenticado' => true,
    'rol' => $_SESSION['rol'],
    'id' => (int)$usuario['id'],
    'nombre_usuario' => $usuario['nombre_usuario'],
    'codigo_vivienda' => $usuario['codigo_vivienda'],
    'email' => $usuario['email_notificaciones'],
    'superusuario' => (bool)$usuario['superusuario'],
    'id_urbanizacion' => (int)$usuario['id_urbanizacion'],
    'urbanizacion' => $usuario['urbanizacion']
]);