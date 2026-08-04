<?php
require_once __DIR__ . '/../config/constantes.php';

mysqli_report(MYSQLI_REPORT_OFF);

$conexion = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conexion->connect_error) {
    $esLocal = in_array(DB_HOST, ['localhost', '127.0.0.1'], true)
        && DB_USER === 'root'
        && DB_PASS === '';

    if ($esLocal) {
        require_once __DIR__ . '/BBDD.php';
        exit;
    }

    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexion con la base de datos. Revisa DB_HOST, DB_USER, DB_PASS y DB_NAME.'
    ]);
    exit;
}

$conexion->set_charset(DB_CHARSET);
?>
