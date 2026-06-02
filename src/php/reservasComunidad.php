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
require_once(__DIR__ . '/listaEsperaFunciones.php');

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

if ($funcion === 'listarEspacios') {
    listarEspacios($conexion, $superusuario);
}

if ($funcion === 'listarReservas') {
    listarReservas($conexion, $superusuario);
}

if ($funcion === 'cancelarReserva') {
    cancelarReservaSuperusuario($conexion, $superusuario);
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

function listarEspacios($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT id, nombre, tipo
            FROM espacio
            WHERE id_urbanizacion = ?
                AND activo = 1
            ORDER BY nombre ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar los espacios');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $espacios = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $espacios[] = [
                'id' => (int)$fila['id'],
                'nombre' => $fila['nombre'],
                'tipo' => $fila['tipo']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'espacios' => $espacios
    ]);

    $conexion->close();
    exit;
}

function listarReservas($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;

    if ($idEspacio <= 0) {
        responder($conexion, 'error', 'Espacio no valido');
    }

    if (!espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)) {
        responder($conexion, 'error', 'No tienes permiso para consultar este espacio');
    }

    $sql = "SELECT 
                r.id,
                r.id_espacio,
                r.id_vivienda,
                r.fecha_inicio,
                r.fecha_fin,
                r.estado,
                r.fecha_cancelacion,
                v.codigo_vivienda,
                v.nombre_usuario,
                v.email_notificaciones,
                v.telefono_contacto
            FROM reserva r
            INNER JOIN vivienda v ON v.id = r.id_vivienda
            WHERE r.id_espacio = ?
            ORDER BY r.fecha_inicio DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar las reservas');
    }

    $stmt->bind_param('i', $idEspacio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $reservas = [];
    $ahora = new DateTime();

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $inicio = new DateTime($fila['fecha_inicio']);
            $fin = new DateTime($fila['fecha_fin']);

            $estadoVisual = obtenerEstadoVisual($fila['estado'], $fin, $ahora);

            $reservas[] = [
                'id' => (int)$fila['id'],
                'id_espacio' => (int)$fila['id_espacio'],
                'id_vivienda' => (int)$fila['id_vivienda'],
                'codigo_vivienda' => $fila['codigo_vivienda'],
                'nombre_usuario' => $fila['nombre_usuario'],
                'email_notificaciones' => $fila['email_notificaciones'],
                'telefono_contacto' => $fila['telefono_contacto'],
                'fecha_reserva' => $inicio->format('d/m/Y'),
                'hora_inicio' => $inicio->format('H:i'),
                'hora_fin' => $fin->format('H:i'),
                'duracion_texto' => obtenerDuracionTexto($inicio, $fin),
                'estado' => $fila['estado'],
                'estado_visual' => $estadoVisual,
                'fecha_cancelacion' => $fila['fecha_cancelacion'],
                'puede_cancelar' => $estadoVisual === 'ACTIVA'
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'reservas' => $reservas
    ]);

    $conexion->close();
    exit;
}

function cancelarReservaSuperusuario($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idReserva = isset($_POST['idReserva']) ? (int)$_POST['idReserva'] : 0;
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;

    if ($idReserva <= 0 || $idEspacio <= 0) {
        responder($conexion, 'error', 'Datos de reserva no validos');
    }

    if (!espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)) {
        responder($conexion, 'error', 'No tienes permiso sobre este espacio');
    }

    $reserva = obtenerReservaEspacio($conexion, $idReserva, $idEspacio);

    if (!$reserva) {
        responder($conexion, 'error', 'No se ha encontrado la reserva');
    }

    if ($reserva['estado'] !== 'ACTIVA') {
        responder($conexion, 'error', 'Solo se pueden cancelar reservas activas');
    }

    $sql = "UPDATE reserva
            SET estado = 'CANCELADA',
                fecha_cancelacion = NOW()
            WHERE id = ?
                AND id_espacio = ?
                AND estado = 'ACTIVA'";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la cancelacion');
    }

    $stmt->bind_param('ii', $idReserva, $idEspacio);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo cancelar la reserva');
    }

    $stmt->close();

    adjudicarSiguienteListaEspera(
        $conexion,
        (int)$reserva['id_espacio'],
        $reserva['fecha_inicio'],
        $reserva['fecha_fin'],
        (int)$reserva['id_vivienda']
    );

    responder($conexion, 'success', 'Reserva cancelada correctamente');
}

function espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)
{
    $sql = "SELECT id
            FROM espacio
            WHERE id = ?
                AND id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $idEspacio, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function obtenerReservaEspacio($conexion, $idReserva, $idEspacio)
{
    $sql = "SELECT 
                id,
                id_espacio,
                id_vivienda,
                fecha_inicio,
                fecha_fin,
                estado
            FROM reserva
            WHERE id = ?
                AND id_espacio = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('ii', $idReserva, $idEspacio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $reserva = $resultado->fetch_assoc();
    $stmt->close();

    return $reserva;
}

function obtenerEstadoVisual($estado, $fin, $ahora)
{
    if ($estado === 'CANCELADA') {
        return 'CANCELADA';
    }

    if ($estado === 'ACTIVA' && $fin < $ahora) {
        return 'FINALIZADA';
    }

    return 'ACTIVA';
}

function obtenerDuracionTexto($inicio, $fin)
{
    $segundos = $fin->getTimestamp() - $inicio->getTimestamp();
    $minutos = (int)($segundos / 60);

    if ($minutos < 60) {
        return $minutos . ' minutos';
    }

    $horas = $minutos / 60;

    if ($horas == 1) {
        return '1 hora';
    }

    if ($minutos % 60 === 0) {
        return (int)$horas . ' horas';
    }

    return $minutos . ' minutos';
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
