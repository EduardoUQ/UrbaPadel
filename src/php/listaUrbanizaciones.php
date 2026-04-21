<?php
if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexion con la base de datos'
    ]);
    exit;
}

$sql = "SELECT
            u.id,
            u.nombre,
            u.direccion,
            u.activo,
            COUNT(DISTINCT e.id) AS cantidad_espacios,
            COUNT(DISTINCT v.id) AS cantidad_viviendas
        FROM urbanizacion u
        LEFT JOIN espacio e ON e.id_urbanizacion = u.id
        LEFT JOIN vivienda v ON v.id_urbanizacion = u.id
        GROUP BY u.id, u.nombre, u.direccion, u.activo
        ORDER BY u.nombre ASC";

$resultado = $conexion->query($sql);

if (!$resultado) {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'message' => 'Error al obtener las urbanizaciones'
    ]);
    exit;
}

$urbanizaciones = [];

while ($fila = $resultado->fetch_assoc()) {
    $activo = (bool)$fila['activo'];

    $urbanizaciones[] = [
        'id' => (int)$fila['id'],
        'nombre' => $fila['nombre'],
        'direccion' => $fila['direccion'],
        'activo' => $activo,
        'estado' => $activo ? 'Activa' : 'Inactiva',
        'cantidad_espacios' => (int)$fila['cantidad_espacios'],
        'cantidad_viviendas' => (int)$fila['cantidad_viviendas']
    ];
}

$conexion->close();

echo json_encode([
    'status' => 'success',
    'urbanizaciones' => $urbanizaciones
]);
