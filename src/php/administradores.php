<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

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

validarSesionAdmin($conexion);

$funcion = isset($_POST['funcion']) ? $_POST['funcion'] : '';

if ($funcion === 'listarAdministradores') {
    listarAdministradores($conexion);
} elseif ($funcion === 'crearAdministrador') {
    crearAdministrador($conexion);
} elseif ($funcion === 'cambiarEstadoAdministrador') {
    cambiarEstadoAdministrador($conexion);
} else {
    responder($conexion, 'error', 'Funcion no valida');
}

function validarSesionAdmin($conexion)
{
    if (!isset($_SESSION['rol']) || $_SESSION['rol'] !== 'admin' || !isset($_SESSION['id'])) {
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $idAdmin = (int)$_SESSION['id'];
    $sql = "SELECT id, activo FROM administrador WHERE id = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al validar la sesion');
    }

    $stmt->bind_param('i', $idAdmin);
    $stmt->execute();
    $resultado = $stmt->get_result();

    if (!$resultado || $resultado->num_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Sesion de administrador no valida');
    }

    $admin = $resultado->fetch_assoc();
    $stmt->close();

    if (!(bool)$admin['activo']) {
        session_destroy();
        responder($conexion, 'error', 'Cuenta de administrador inactiva');
    }
}

function listarAdministradores($conexion)
{
    $sql = "SELECT id, nombre, email, super_admin, activo, fecha_creacion
            FROM administrador
            ORDER BY nombre ASC";

    $resultado = $conexion->query($sql);

    if (!$resultado) {
        responder($conexion, 'error', 'Error al obtener los administradores');
    }

    $administradores = [];

    while ($fila = $resultado->fetch_assoc()) {
        $activo = (bool)$fila['activo'];

        $administradores[] = [
            'id' => (int)$fila['id'],
            'nombre' => $fila['nombre'],
            'email' => $fila['email'],
            'super_admin' => (bool)$fila['super_admin'],
            'activo' => $activo,
            'estado' => $activo ? 'Activo' : 'Inactivo',
            'fecha_creacion' => $fila['fecha_creacion']
        ];
    }

    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'administradores' => $administradores
    ]);
    exit;
}

function crearAdministrador($conexion)
{
    $nombre = obtenerTexto('nombre');
    $email = obtenerTexto('email');
    $password = 'admin1234';

    if ($nombre === '' || $email === '') {
        responder($conexion, 'error', 'Completa todos los campos');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responder($conexion, 'error', 'Introduce un correo electronico valido');
    }

    if (emailExiste($conexion, $email)) {
        responder($conexion, 'error', 'Ya existe un administrador con ese correo');
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $sql = "INSERT INTO administrador (email, passwd_hash, nombre, super_admin, activo)
            VALUES (?, ?, ?, 1, 1)";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al crear el administrador');
    }

    $stmt->bind_param('sss', $email, $passwordHash, $nombre);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo crear el administrador');
    }

    $idAdministrador = $conexion->insert_id;
    $stmt->close();
    $conexion->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Administrador creado correctamente',
        'idAdministrador' => (int)$idAdministrador
    ]);
    exit;
}

function cambiarEstadoAdministrador($conexion)
{
    $idAdministrador = isset($_POST['idAdministrador']) ? (int)$_POST['idAdministrador'] : 0;
    $activo = isset($_POST['activo']) && $_POST['activo'] === '1' ? 1 : 0;
    $idAdminActual = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;

    if ($idAdministrador <= 0) {
        responder($conexion, 'error', 'Administrador no valido');
    }

    if ($idAdministrador === $idAdminActual && $activo === 0) {
        responder($conexion, 'error', 'No puedes desactivar tu propia cuenta');
    }

    $sql = "UPDATE administrador SET activo = ? WHERE id = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al cambiar el estado');
    }

    $stmt->bind_param('ii', $activo, $idAdministrador);

    if (!$stmt->execute()) {
        $stmt->close();
        responder($conexion, 'error', 'No se pudo cambiar el estado');
    }

    if ($stmt->affected_rows === 0) {
        $stmt->close();
        responder($conexion, 'error', 'Administrador no encontrado o sin cambios');
    }

    $stmt->close();
    responder($conexion, 'success', $activo ? 'Administrador activado' : 'Administrador desactivado');
}

function emailExiste($conexion, $email)
{
    $sql = "SELECT id FROM administrador WHERE email = ? LIMIT 1";
    $stmt = $conexion->prepare($sql);

    if (!$stmt) {
        responder($conexion, 'error', 'Error interno al comprobar el correo');
    }

    $stmt->bind_param('s', $email);
    $stmt->execute();
    $resultado = $stmt->get_result();
    $existe = $resultado && $resultado->num_rows > 0;
    $stmt->close();

    return $existe;
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
