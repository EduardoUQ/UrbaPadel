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
        'autenticado' => false,
        'message' => 'Sesion de administrador no valida'
    ]);
    exit;
}

$adminActivo = true;

if (isset($_SESSION['id'])) {
    require_once(__DIR__ . '/db/conexion.php');

    if (!isset($conexion) || !($conexion instanceof mysqli)) {
        echo json_encode([
            'status' => 'error',
            'autenticado' => false,
            'message' => 'Error de conexion con la base de datos'
        ]);
        exit;
    }

    $idAdmin = (int)$_SESSION['id'];
    $sql = "SELECT activo FROM administrador WHERE id = ? LIMIT 1";
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

    $stmt->bind_param('i', $idAdmin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        $conexion->close();
        session_destroy();
        echo json_encode([
            'status' => 'error',
            'autenticado' => false,
            'message' => 'Sesion de administrador no valida'
        ]);
        exit;
    }

    $admin = $resultado->fetch_assoc();
    $adminActivo = (bool)$admin['activo'];
    $stmt->close();
    $conexion->close();
}

if (!$adminActivo) {
    session_destroy();
    echo json_encode([
        'status' => 'error',
        'autenticado' => false,
        'message' => 'Cuenta de administrador inactiva'
    ]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'autenticado' => true,
    'rol' => $_SESSION['rol'],
    'id' => isset($_SESSION['id']) ? (int)$_SESSION['id'] : null,
    'nombre' => isset($_SESSION['nombre']) ? $_SESSION['nombre'] : 'Administrador',
    'email' => isset($_SESSION['email']) ? $_SESSION['email'] : null,
    'super_admin' => isset($_SESSION['super_admin']) ? (bool)$_SESSION['super_admin'] : false
]);
