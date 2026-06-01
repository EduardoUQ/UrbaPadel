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

$sql = "SELECT COUNT(*) AS total
        FROM lista_espera
        WHERE id_vivienda = ?
            AND estado = 'ATENDIDA'";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    $conexion->close();

    echo json_encode([
        'status' => 'error',
        'message' => 'No se pudieron cargar las notificaciones'
    ]);
    exit;
}

$stmt->bind_param('i', $idVivienda);
$stmt->execute();
$resultado = $stmt->get_result();
$fila = $resultado ? $resultado->fetch_assoc() : ['total' => 0];

$stmt->close();
$conexion->close();

echo json_encode([
    'status' => 'success',
    'total' => (int)$fila['total']
]);