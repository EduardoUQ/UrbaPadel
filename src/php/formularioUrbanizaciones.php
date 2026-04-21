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

$funcion = isset($_POST['funcion']) ? $_POST['funcion'] : '';

if ($funcion === 'obtenerUrbanizacion') {
    obtenerUrbanizacion($conexion);
} elseif ($funcion === 'crearUrbanizacion') {
    guardarUrbanizacion($conexion, false);
} elseif ($funcion === 'editarUrbanizacion') {
    guardarUrbanizacion($conexion, true);
} elseif ($funcion === 'eliminarUrbanizacion') {
    eliminarUrbanizacion($conexion);
} else {
    responder($conexion, 'error', 'Funcion no valida');
}

function obtenerUrbanizacion($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;

    if ($idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    $sql = "SELECT id, nombre, direccion, codigo_postal, municipio, provincia, activo
            FROM urbanizacion
            WHERE id = ?
            LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al obtener la urbanizacion');
    }

    $stmt->bind_param('i', $idUrbanizacion);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Urbanizacion no encontrada');
    }

    $urbanizacion = $resultado->fetch_assoc();
    $urbanizacion['id'] = (int)$urbanizacion['id'];
    $urbanizacion['activo'] = (bool)$urbanizacion['activo'];

    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'urbanizacion' => $urbanizacion
    ]);
    exit;
}

function guardarUrbanizacion($conexion, $esEdicion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;
    $nombre = obtenerTexto('nombre');
    $direccion = obtenerTexto('direccion');
    $codigoPostal = obtenerTexto('codigo_postal');
    $municipio = obtenerTexto('municipio');
    $provincia = obtenerTexto('provincia');
    $activo = isset($_POST['activo']) && $_POST['activo'] === '0' ? 0 : 1;

    if ($esEdicion && $idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    if ($nombre === '' || $direccion === '' || $codigoPostal === '' || $municipio === '' || $provincia === '') {
        responder($conexion, 'error', 'Completa todos los campos');
    }

    if ($esEdicion) {
        $sql = "UPDATE urbanizacion
                SET nombre = ?, direccion = ?, codigo_postal = ?, municipio = ?, provincia = ?, activo = ?
                WHERE id = ?
                LIMIT 1";
        $stmt = $conexion->prepare($sql);

        if (!$stmt) {
            responder($conexion, 'error', 'Error interno al editar la urbanizacion');
        }

        $stmt->bind_param('sssssii', $nombre, $direccion, $codigoPostal, $municipio, $provincia, $activo, $idUrbanizacion);
    } else {
        $sql = "INSERT INTO urbanizacion (nombre, direccion, codigo_postal, municipio, provincia)
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $conexion->prepare($sql);

        if (!$stmt) {
            responder($conexion, 'error', 'Error interno al crear la urbanizacion');
        }

        $stmt->bind_param('sssss', $nombre, $direccion, $codigoPostal, $municipio, $provincia);
    }

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', $esEdicion ? 'No se pudo editar la urbanizacion' : 'No se pudo crear la urbanizacion');
    }

    $idGuardado = $esEdicion ? $idUrbanizacion : $conexion->insert_id;
    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'message' => $esEdicion ? 'Editado correctamente' : 'Creado correctamente',
        'idUrbanizacion' => (int)$idGuardado
    ]);
    exit;
}

function eliminarUrbanizacion($conexion)
{
    $idUrbanizacion = isset($_POST['idUrbanizacion']) ? (int)$_POST['idUrbanizacion'] : 0;

    if ($idUrbanizacion <= 0) {
        responder($conexion, 'error', 'Urbanizacion no valida');
    }

    $conexion->begin_transaction();

    try {
        ejecutarDelete($conexion, "DELETE ce FROM comentario_espacio ce INNER JOIN espacio e ON ce.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE ce FROM comentario_espacio ce INNER JOIN vivienda v ON ce.id_vivienda = v.id WHERE v.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE be FROM bloqueo_espacio be INNER JOIN espacio e ON be.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE ru FROM restriccion_uso ru INNER JOIN espacio e ON ru.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE ru FROM restriccion_uso ru INNER JOIN vivienda v ON ru.id_vivienda = v.id WHERE v.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE le FROM lista_espera le INNER JOIN espacio e ON le.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE le FROM lista_espera le INNER JOIN vivienda v ON le.id_vivienda = v.id WHERE v.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE r FROM reserva r INNER JOIN espacio e ON r.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE r FROM reserva r INNER JOIN vivienda v ON r.id_vivienda = v.id WHERE v.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE vep FROM vivienda_espacio_permiso vep INNER JOIN espacio e ON vep.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE vep FROM vivienda_espacio_permiso vep INNER JOIN vivienda v ON vep.id_vivienda = v.id WHERE v.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE ec FROM espacio_configuracion ec INNER JOIN espacio e ON ec.id_espacio = e.id WHERE e.id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE FROM espacio WHERE id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE FROM vivienda WHERE id_urbanizacion = ?", $idUrbanizacion);
        ejecutarDelete($conexion, "DELETE FROM urbanizacion WHERE id = ?", $idUrbanizacion);

        $conexion->commit();
    } catch (Exception $error) {
        $conexion->rollback();
        responder($conexion, 'error', 'No se pudo borrar la urbanizacion');
    }

    responder($conexion, 'success', 'Urbanizacion borrada');
}

function ejecutarDelete($conexion, $sql, $idUrbanizacion)
{
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        throw new Exception('Error al preparar borrado');
    }

    $stmt->bind_param('i', $idUrbanizacion);

    if (!$stmt->execute()) {
        $stmt->close();
        throw new Exception('Error al ejecutar borrado');
    }

    $stmt->close();
}

function obtenerTexto($campo)
{
    return isset($_POST[$campo]) ? trim($_POST[$campo]) : '';
}

function responder($conexion, $status, $message)
{
    $conexion->close();
    echo json_encode([
        'status' => $status,
        'message' => $message
    ]);
    exit;
}
