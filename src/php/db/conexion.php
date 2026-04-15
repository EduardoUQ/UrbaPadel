<?php
require_once __DIR__ . '/../config/constantes.php';

$conexion = new mysqli(DB_HOST, DB_USER, DB_PASS);

if ($conexion->connect_error) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexión con la base de datos'
    ]);
    exit;
}

$sql = "SHOW DATABASES LIKE '" . DB_NAME . "'";
$result = $conexion->query($sql);

if (!$result) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error al comprobar la base de datos'
    ]);
    exit;
}

if ($result->num_rows === 0) {
    require_once "BBDD.php";
    exit;
}

$conexion->select_db(DB_NAME);
$conexion->set_charset(DB_CHARSET);
?>