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

$sql = "SELECT 
            e.id,
            e.nombre,
            e.tipo,
            e.descripcion,
            e.activo,
            ec.hora_apertura,
            ec.hora_cierre,
            ec.unidad_reserva,
            ec.duracion_maxima_minutos,
            ec.max_reservas_dia,
            ec.max_reservas_semana,
            ec.max_dias_anticipacion,
            ec.minutos_entre_reservas,
            ec.permite_lista_espera,
            ec.permite_cancelacion,
            ec.minutos_limite_cancelacion
        FROM vivienda v
        INNER JOIN vivienda_espacio_permiso vep 
            ON vep.id_vivienda = v.id
        INNER JOIN espacio e 
            ON e.id = vep.id_espacio
            AND e.id_urbanizacion = v.id_urbanizacion
        LEFT JOIN espacio_configuracion ec 
            ON ec.id_espacio = e.id
        WHERE v.id = ?
            AND v.activa = 1
            AND e.activo = 1
            AND vep.puede_reservar = 1
        ORDER BY e.nombre ASC";

$stmt = $conexion->prepare($sql);

if (!$stmt) {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'message' => 'Error interno al cargar los espacios'
    ]);
    exit;
}

$stmt->bind_param('i', $idVivienda);
$stmt->execute();
$resultado = $stmt->get_result();

$espacios = [];

if ($resultado) {
    while ($fila = $resultado->fetch_assoc()) {
        $fila['id'] = (int)$fila['id'];
        $fila['activo'] = (bool)$fila['activo'];
        $fila['duracion_maxima_minutos'] = isset($fila['duracion_maxima_minutos']) ? (int)$fila['duracion_maxima_minutos'] : null;
        $fila['max_reservas_dia'] = isset($fila['max_reservas_dia']) ? (int)$fila['max_reservas_dia'] : null;
        $fila['max_reservas_semana'] = isset($fila['max_reservas_semana']) ? (int)$fila['max_reservas_semana'] : null;
        $fila['max_dias_anticipacion'] = isset($fila['max_dias_anticipacion']) ? (int)$fila['max_dias_anticipacion'] : null;
        $fila['minutos_entre_reservas'] = isset($fila['minutos_entre_reservas']) ? (int)$fila['minutos_entre_reservas'] : null;
        $fila['permite_lista_espera'] = (bool)$fila['permite_lista_espera'];
        $fila['permite_cancelacion'] = (bool)$fila['permite_cancelacion'];

        $espacios[] = $fila;
    }
}

$stmt->close();
$conexion->close();

echo json_encode([
    'status' => 'success',
    'espacios' => $espacios
]);