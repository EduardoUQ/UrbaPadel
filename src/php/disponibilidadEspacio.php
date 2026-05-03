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

if (!isset($_POST['funcion']) || $_POST['funcion'] !== 'obtenerDisponibilidad') {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'message' => 'Funcion no valida'
    ]);
    exit;
}

$idVivienda = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;
$idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
$fecha = isset($_POST['fecha']) ? trim($_POST['fecha']) : '';

if ($idVivienda <= 0 || $idEspacio <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'message' => 'Datos de disponibilidad no validos'
    ]);
    exit;
}

$espacio = obtenerEspacioPermitido($conexion, $idVivienda, $idEspacio);

if (!$espacio) {
    $conexion->close();
    echo json_encode([
        'status' => 'error',
        'message' => 'No tienes permiso para consultar este espacio'
    ]);
    exit;
}

$franjas = generarFranjas($espacio, $fecha);
$reservas = obtenerReservasDia($conexion, $idEspacio, $fecha);
$bloqueos = obtenerBloqueosDia($conexion, $idEspacio, $fecha);

foreach ($franjas as $indice => $franja) {
    $bloqueo = buscarSolapamiento($franja['fecha_inicio'], $franja['fecha_fin'], $bloqueos);

    if ($bloqueo) {
        $franjas[$indice]['estado'] = 'BLOQUEADA';
        $franjas[$indice]['motivo'] = $bloqueo['motivo'];
        continue;
    }

    $reserva = buscarSolapamiento($franja['fecha_inicio'], $franja['fecha_fin'], $reservas);

    if ($reserva) {
        $franjas[$indice]['estado'] = 'OCUPADA';
        $franjas[$indice]['vivienda'] = $reserva['codigo_vivienda'];
        continue;
    }

    $franjas[$indice]['estado'] = 'DISPONIBLE';
}

$conexion->close();

echo json_encode([
    'status' => 'success',
    'espacio' => $espacio,
    'fecha' => $fecha,
    'franjas' => $franjas
]);

function obtenerEspacioPermitido($conexion, $idVivienda, $idEspacio)
{
    $sql = "SELECT 
                e.id,
                e.id_urbanizacion,
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
                ec.minutos_limite_cancelacion,
                ec.normas_texto
            FROM vivienda v
            INNER JOIN vivienda_espacio_permiso vep 
                ON vep.id_vivienda = v.id
            INNER JOIN espacio e 
                ON e.id = vep.id_espacio
                AND e.id_urbanizacion = v.id_urbanizacion
            INNER JOIN espacio_configuracion ec 
                ON ec.id_espacio = e.id
            WHERE v.id = ?
                AND e.id = ?
                AND v.activa = 1
                AND e.activo = 1
                AND vep.puede_reservar = 1
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idVivienda, $idEspacio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $espacio = $resultado->fetch_assoc();
    $stmt->close();

    $espacio['id'] = (int)$espacio['id'];
    $espacio['id_urbanizacion'] = (int)$espacio['id_urbanizacion'];
    $espacio['activo'] = (bool)$espacio['activo'];
    $espacio['duracion_maxima_minutos'] = (int)$espacio['duracion_maxima_minutos'];
    $espacio['max_reservas_dia'] = (int)$espacio['max_reservas_dia'];
    $espacio['max_reservas_semana'] = (int)$espacio['max_reservas_semana'];
    $espacio['max_dias_anticipacion'] = (int)$espacio['max_dias_anticipacion'];
    $espacio['minutos_entre_reservas'] = (int)$espacio['minutos_entre_reservas'];
    $espacio['permite_lista_espera'] = (bool)$espacio['permite_lista_espera'];
    $espacio['permite_cancelacion'] = (bool)$espacio['permite_cancelacion'];
    $espacio['minutos_limite_cancelacion'] = (int)$espacio['minutos_limite_cancelacion'];

    return $espacio;
}

function generarFranjas($espacio, $fecha)
{
    $franjas = [];

    if ($espacio['unidad_reserva'] === '1_DIA') {
        $fechaInicio = $fecha . ' ' . $espacio['hora_apertura'];
        $fechaFin = $fecha . ' ' . $espacio['hora_cierre'];

        $franjas[] = [
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin,
            'hora_inicio' => substr($espacio['hora_apertura'], 0, 5),
            'hora_fin' => substr($espacio['hora_cierre'], 0, 5),
            'estado' => 'DISPONIBLE'
        ];

        return $franjas;
    }

    $minutosUnidad = $espacio['unidad_reserva'] === '30_MIN' ? 30 : 60;

    $inicio = new DateTime($fecha . ' ' . $espacio['hora_apertura']);
    $fin = new DateTime($fecha . ' ' . $espacio['hora_cierre']);

    while ($inicio < $fin) {
        $finFranja = clone $inicio;
        $finFranja->modify('+' . $minutosUnidad . ' minutes');

        if ($finFranja > $fin) {
            break;
        }

        $franjas[] = [
            'fecha_inicio' => $inicio->format('Y-m-d H:i:s'),
            'fecha_fin' => $finFranja->format('Y-m-d H:i:s'),
            'hora_inicio' => $inicio->format('H:i'),
            'hora_fin' => $finFranja->format('H:i'),
            'estado' => 'DISPONIBLE'
        ];

        $inicio = $finFranja;
    }

    return $franjas;
}

function obtenerReservasDia($conexion, $idEspacio, $fecha)
{
    $inicioDia = $fecha . ' 00:00:00';
    $finDia = $fecha . ' 23:59:59';

    $sql = "SELECT 
                r.fecha_inicio,
                r.fecha_fin,
                v.codigo_vivienda
            FROM reserva r
            INNER JOIN vivienda v ON v.id = r.id_vivienda
            WHERE r.id_espacio = ?
                AND r.estado = 'ACTIVA'
                AND r.fecha_inicio < ?
                AND r.fecha_fin > ?
            ORDER BY r.fecha_inicio ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('iss', $idEspacio, $finDia, $inicioDia);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $reservas = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $reservas[] = $fila;
        }
    }

    $stmt->close();

    return $reservas;
}

function obtenerBloqueosDia($conexion, $idEspacio, $fecha)
{
    $inicioDia = $fecha . ' 00:00:00';
    $finDia = $fecha . ' 23:59:59';

    $sql = "SELECT 
                fecha_inicio,
                fecha_fin,
                motivo
            FROM bloqueo_espacio
            WHERE id_espacio = ?
                AND activo = 1
                AND fecha_inicio < ?
                AND fecha_fin > ?
            ORDER BY fecha_inicio ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return [];
    }

    $stmt->bind_param('iss', $idEspacio, $finDia, $inicioDia);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $bloqueos = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $bloqueos[] = $fila;
        }
    }

    $stmt->close();

    return $bloqueos;
}

function buscarSolapamiento($inicioFranja, $finFranja, $elementos)
{
    foreach ($elementos as $elemento) {
        if ($elemento['fecha_inicio'] < $finFranja && $elemento['fecha_fin'] > $inicioFranja) {
            return $elemento;
        }
    }

    return null;
}