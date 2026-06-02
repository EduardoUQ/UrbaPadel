<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (!headers_sent()) {
    header('Content-Type: application/json; charset=utf-8');
}

require_once(__DIR__ . '/db/conexion.php');

if (!isset($conexion) || !($conexion instanceof mysqli)) {
    responder(null, 'error', 'Error de conexion con la base de datos');
}

$rol = isset($_SESSION['rol']) ? $_SESSION['rol'] : '';
$idCuenta = isset($_SESSION['id']) ? (int)$_SESSION['id'] : 0;
$passwordActual = isset($_POST['actualpassword']) ? $_POST['actualpassword'] : '';
$passwordNueva = isset($_POST['newpassword']) ? $_POST['newpassword'] : '';
$passwordRepetida = isset($_POST['repassword']) ? $_POST['repassword'] : '';

if (($rol !== 'admin' && $rol !== 'usuario') || $idCuenta <= 0) {
    responder($conexion, 'error', 'Sesion no valida');
}

if ($passwordActual === '' || $passwordNueva === '' || $passwordRepetida === '') {
    responder($conexion, 'error', 'Completa todos los campos');
}

if ($passwordNueva !== $passwordRepetida) {
    responder($conexion, 'error', 'Las nuevas contrasenas no coinciden');
}

if (!passwordValida($passwordNueva)) {
    responder($conexion, 'error', 'La nueva contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo');
}

if ($passwordActual === $passwordNueva) {
    responder($conexion, 'error', 'La nueva contrasena debe ser distinta de la actual');
}

$tabla = $rol === 'admin' ? 'administrador' : 'vivienda';
$campoActivo = $rol === 'admin' ? 'activo' : 'activa';
$sql = "SELECT passwd_hash, $campoActivo AS activo FROM $tabla WHERE id = ? LIMIT 1";
$stmt = $conexion->prepare($sql);

if (!$stmt) {
    responder($conexion, 'error', 'Error interno al validar la cuenta');
}

$stmt->bind_param('i', $idCuenta);
$stmt->execute();
$resultado = $stmt->get_result();

if (!$resultado || $resultado->num_rows === 0) {
    $stmt->close();
    session_destroy();
    responder($conexion, 'error', 'Sesion no valida');
}

$cuenta = $resultado->fetch_assoc();
$stmt->close();

if (!(bool)$cuenta['activo']) {
    session_destroy();
    responder($conexion, 'error', 'Cuenta inactiva');
}

if (!password_verify($passwordActual, $cuenta['passwd_hash'])) {
    responder($conexion, 'error', 'La contrasena actual no es correcta');
}

$passwordHash = password_hash($passwordNueva, PASSWORD_DEFAULT);
$sql = "UPDATE $tabla SET passwd_hash = ? WHERE id = ? LIMIT 1";
$stmt = $conexion->prepare($sql);

if (!$stmt) {
    responder($conexion, 'error', 'Error interno al cambiar la contrasena');
}

$stmt->bind_param('si', $passwordHash, $idCuenta);

if (!$stmt->execute()) {
    $stmt->close();
    responder($conexion, 'error', 'No se pudo cambiar la contrasena');
}

$stmt->close();
responder($conexion, 'success', 'Contrasena cambiada correctamente');

function passwordValida($password)
{
    return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/', $password) === 1;
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
