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

if ($funcion === 'listarViviendas') {
    listarViviendas($conexion, $superusuario);
}

if ($funcion === 'listarEspacios') {
    listarEspacios($conexion, $superusuario);
}

if ($funcion === 'listarRestricciones') {
    listarRestricciones($conexion, $superusuario);
}

if ($funcion === 'crearRestriccion') {
    crearRestriccion($conexion, $superusuario);
}

if ($funcion === 'desactivarRestriccion') {
    desactivarRestriccion($conexion, $superusuario);
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

function listarViviendas($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT 
                id,
                codigo_vivienda,
                nombre_usuario,
                bloque,
                portal,
                escalera,
                planta,
                puerta
            FROM vivienda
            WHERE id_urbanizacion = ?
                AND activa = 1
            ORDER BY portal ASC, bloque ASC, planta ASC, puerta ASC, nombre_usuario ASC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar las viviendas');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $viviendas = [];

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $viviendas[] = [
                'id' => (int)$fila['id'],
                'codigo_vivienda' => $fila['codigo_vivienda'],
                'nombre_usuario' => $fila['nombre_usuario'],
                'bloque' => $fila['bloque'],
                'portal' => $fila['portal'],
                'escalera' => $fila['escalera'],
                'planta' => $fila['planta'],
                'puerta' => $fila['puerta']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'viviendas' => $viviendas
    ]);

    $conexion->close();
    exit;
}

function listarEspacios($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT 
                e.id,
                e.nombre,
                e.tipo,
                ec.hora_apertura,
                ec.hora_cierre,
                ec.unidad_reserva
            FROM espacio e
            INNER JOIN espacio_configuracion ec 
                ON ec.id_espacio = e.id
            WHERE e.id_urbanizacion = ?
                AND e.activo = 1
            ORDER BY e.nombre ASC";

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
                'tipo' => $fila['tipo'],
                'hora_apertura' => $fila['hora_apertura'],
                'hora_cierre' => $fila['hora_cierre'],
                'unidad_reserva' => $fila['unidad_reserva']
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

function listarRestricciones($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];

    $sql = "SELECT 
                r.id,
                r.id_vivienda,
                r.id_espacio,
                r.motivo,
                r.fecha_inicio,
                r.fecha_fin,
                r.activa,
                r.creada_por_tipo,
                r.creada_por_id,
                r.fecha_creacion,
                v.codigo_vivienda,
                v.nombre_usuario,
                v.bloque,
                v.portal,
                v.escalera,
                v.planta,
                v.puerta,
                e.nombre AS espacio_nombre,
                e.tipo AS espacio_tipo
            FROM restriccion_uso r
            INNER JOIN vivienda v ON v.id = r.id_vivienda
            INNER JOIN espacio e ON e.id = r.id_espacio
            WHERE v.id_urbanizacion = ?
                AND e.id_urbanizacion = ?
            ORDER BY r.fecha_inicio DESC";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudieron cargar las restricciones');
    }

    $stmt->bind_param('ii', $idUrbanizacion, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $restricciones = [];
    $ahora = new DateTime();

    if ($resultado) {
        while ($fila = $resultado->fetch_assoc()) {
            $inicio = new DateTime($fila['fecha_inicio']);
            $fin = new DateTime($fila['fecha_fin']);
            $activa = (bool)$fila['activa'];

            if (!$activa) {
                $estadoVisual = 'DESACTIVADA';
            } else if ($fin > $ahora) {
                $estadoVisual = 'ACTIVA';
            } else {
                $estadoVisual = 'FINALIZADA';
            }

            $restricciones[] = [
                'id' => (int)$fila['id'],
                'id_vivienda' => (int)$fila['id_vivienda'],
                'id_espacio' => (int)$fila['id_espacio'],
                'motivo' => $fila['motivo'],
                'fecha_inicio_visible' => $inicio->format('d/m/Y'),
                'fecha_fin_visible' => $fin->format('d/m/Y'),
                'hora_inicio' => $inicio->format('H:i'),
                'hora_fin' => $fin->format('H:i'),
                'activa' => $activa,
                'estado_visual' => $estadoVisual,
                'puede_desactivar' => $estadoVisual === 'ACTIVA',
                'codigo_vivienda' => $fila['codigo_vivienda'],
                'nombre_usuario' => $fila['nombre_usuario'],
                'bloque' => $fila['bloque'],
                'portal' => $fila['portal'],
                'escalera' => $fila['escalera'],
                'planta' => $fila['planta'],
                'puerta' => $fila['puerta'],
                'vivienda_texto' => crearTextoVivienda($fila),
                'espacio_nombre' => $fila['espacio_nombre'],
                'espacio_tipo' => $fila['espacio_tipo']
            ];
        }
    }

    $stmt->close();

    echo json_encode([
        'status' => 'success',
        'restricciones' => $restricciones
    ]);

    $conexion->close();
    exit;
}

function crearRestriccion($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idVivienda = isset($_POST['idVivienda']) ? (int)$_POST['idVivienda'] : 0;
    $idEspacio = isset($_POST['idEspacio']) ? (int)$_POST['idEspacio'] : 0;
    $fechaInicioTexto = isset($_POST['fechaInicio']) ? trim($_POST['fechaInicio']) : '';
    $horaInicio = isset($_POST['horaInicio']) ? trim($_POST['horaInicio']) : '';
    $fechaFinTexto = isset($_POST['fechaFin']) ? trim($_POST['fechaFin']) : '';
    $horaFin = isset($_POST['horaFin']) ? trim($_POST['horaFin']) : '';
    $motivo = isset($_POST['motivo']) ? trim($_POST['motivo']) : '';

    if (
        $idVivienda <= 0 ||
        $idEspacio <= 0 ||
        !validarFecha($fechaInicioTexto) ||
        !validarFecha($fechaFinTexto) ||
        !validarHora($horaInicio) ||
        !validarHora($horaFin) ||
        mb_strlen($motivo) < 5
    ) {
        responder($conexion, 'error', 'Datos de restricción no válidos');
    }

    if (!viviendaPerteneceUrbanizacion($conexion, $idVivienda, $idUrbanizacion)) {
        responder($conexion, 'error', 'No tienes permiso sobre esta vivienda');
    }

    if (!espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)) {
        responder($conexion, 'error', 'No tienes permiso sobre este espacio');
    }

    $horaInicioNormalizada = normalizarHora($horaInicio);
    $horaFinNormalizada = normalizarHora($horaFin);

    $fechaInicio = $fechaInicioTexto . ' ' . $horaInicioNormalizada;
    $fechaFin = $fechaFinTexto . ' ' . $horaFinNormalizada;

    $inicio = new DateTime($fechaInicio);
    $fin = new DateTime($fechaFin);
    $ahora = new DateTime();

    if ($fin <= $inicio) {
        responder($conexion, 'error', 'La fecha y hora de fin debe ser posterior al inicio');
    }

    if ($inicio < $ahora) {
        responder($conexion, 'error', 'No puedes crear una restricción en una franja pasada');
    }

    if (hayRestriccionSolapada($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)) {
        responder($conexion, 'error', 'Ya existe una restricción activa para esa vivienda, espacio y periodo');
    }

    cancelarReservasSolapadas($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin);
    cancelarListasEsperaSolapadas($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin);

    $creadaPorTipo = 'SUPERUSUARIO';
    $creadaPorId = (int)$superusuario['id'];

    $sql = "INSERT INTO restriccion_uso
                (id_vivienda, id_espacio, motivo, fecha_inicio, fecha_fin, activa, creada_por_tipo, creada_por_id)
            VALUES
                (?, ?, ?, ?, ?, 1, ?, ?)";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la restricción');
    }

    $stmt->bind_param(
        'iissssi',
        $idVivienda,
        $idEspacio,
        $motivo,
        $fechaInicio,
        $fechaFin,
        $creadaPorTipo,
        $creadaPorId
    );

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo crear la restricción');
    }

    $stmt->close();

    responder($conexion, 'success', 'Restricción creada correctamente');
}

function desactivarRestriccion($conexion, $superusuario)
{
    $idUrbanizacion = (int)$superusuario['id_urbanizacion'];
    $idRestriccion = isset($_POST['idRestriccion']) ? (int)$_POST['idRestriccion'] : 0;

    if ($idRestriccion <= 0) {
        responder($conexion, 'error', 'Restricción no válida');
    }

    $restriccion = obtenerRestriccionUrbanizacion($conexion, $idRestriccion, $idUrbanizacion);

    if (!$restriccion) {
        responder($conexion, 'error', 'No se ha encontrado la restricción');
    }

    $sql = "UPDATE restriccion_uso
            SET activa = 0
            WHERE id = ?
                AND activa = 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'No se pudo preparar la desactivación');
    }

    $stmt->bind_param('i', $idRestriccion);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo desactivar la restricción');
    }

    $stmt->close();

    responder($conexion, 'success', 'Restricción desactivada correctamente');
}

function viviendaPerteneceUrbanizacion($conexion, $idVivienda, $idUrbanizacion)
{
    $sql = "SELECT id
            FROM vivienda
            WHERE id = ?
                AND id_urbanizacion = ?
                AND activa = 1
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('ii', $idVivienda, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function espacioPerteneceUrbanizacion($conexion, $idEspacio, $idUrbanizacion)
{
    $sql = "SELECT id
            FROM espacio
            WHERE id = ?
                AND id_urbanizacion = ?
                AND activo = 1
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

function obtenerRestriccionUrbanizacion($conexion, $idRestriccion, $idUrbanizacion)
{
    $sql = "SELECT r.id
            FROM restriccion_uso r
            INNER JOIN vivienda v ON v.id = r.id_vivienda
            INNER JOIN espacio e ON e.id = r.id_espacio
            WHERE r.id = ?
                AND v.id_urbanizacion = ?
                AND e.id_urbanizacion = ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('iii', $idRestriccion, $idUrbanizacion, $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $restriccion = $resultado->fetch_assoc();
    $stmt->close();

    return $restriccion;
}

function hayRestriccionSolapada($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "SELECT id
            FROM restriccion_uso
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND activa = 1
                AND fecha_inicio < ?
                AND fecha_fin > ?
            LIMIT 1";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return true;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $resultado = $stmt->get_result();

    $existe = $resultado && $resultado->num_rows > 0;

    $stmt->close();

    return $existe;
}

function cancelarReservasSolapadas($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "UPDATE reserva
            SET estado = 'CANCELADA',
                fecha_cancelacion = NOW()
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND estado = 'ACTIVA'
                AND fecha_inicio < ?
                AND fecha_fin > ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $stmt->close();
}

function cancelarListasEsperaSolapadas($conexion, $idVivienda, $idEspacio, $fechaInicio, $fechaFin)
{
    $sql = "UPDATE lista_espera
            SET estado = 'CANCELADA'
            WHERE id_vivienda = ?
                AND id_espacio = ?
                AND estado = 'EN_ESPERA'
                AND fecha_inicio_deseada < ?
                AND fecha_fin_deseada > ?";

    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iiss', $idVivienda, $idEspacio, $fechaFin, $fechaInicio);
    $stmt->execute();
    $stmt->close();
}

function crearTextoVivienda($vivienda)
{
    $usuario = $vivienda['nombre_usuario'] ?: 'Usuario';

    $portalBloquePartes = [];

    if (!empty($vivienda['portal'])) {
        $portalBloquePartes[] = 'Portal ' . $vivienda['portal'];
    }

    if (!empty($vivienda['bloque'])) {
        $portalBloquePartes[] = 'Bloque ' . $vivienda['bloque'];
    }

    $partes = [$usuario];

    if (!empty($portalBloquePartes)) {
        $partes[] = implode(' ', $portalBloquePartes);
    }

    if (!empty($vivienda['escalera'])) {
        $partes[] = 'Esc ' . $vivienda['escalera'];
    }

    $pisoPartes = [];

    if (!empty($vivienda['planta'])) {
        $pisoPartes[] = $vivienda['planta'];
    }

    if (!empty($vivienda['puerta'])) {
        $pisoPartes[] = $vivienda['puerta'];
    }

    if (!empty($pisoPartes)) {
        $partes[] = 'Piso ' . implode(' ', $pisoPartes);
    }

    return implode(' - ', $partes);
}

function validarFecha($fecha)
{
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha);
}

function validarHora($hora)
{
    return preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $hora);
}

function normalizarHora($hora)
{
    if (preg_match('/^\d{2}:\d{2}$/', $hora)) {
        return $hora . ':00';
    }

    return $hora;
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
