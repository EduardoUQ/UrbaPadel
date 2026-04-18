<?php
function manejarLogin()
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }

    require_once(__DIR__ . '/db/conexion.php');

    if (!isset($conexion) || !($conexion instanceof mysqli)) {
        return ['status' => 'error', 'message' => 'Error de conexión con la base de datos'];
    }

    if (!isset($_POST['funcion'])) {
        $conexion->close();
        return ['status' => 'error', 'message' => 'Función no especificada'];
    }

    $funcion = $_POST['funcion'];

    // =========================
    // 1) LOGIN (admin/usuario)
    // =========================
    if ($funcion === "procesarLogin") {

        $usuario = isset($_POST['usuario']) ? trim($_POST['usuario']) : '';
        $pass  = isset($_POST['pass']) ? $_POST['pass'] : '';

        if ($usuario === '' || $pass === '') {
            $conexion->close();
            return ['status' => 'error', 'message' => 'Usuario y/o contraseña vacíos'];
        }

        // 1) ADMIN
        $sqlAdmin = "SELECT id, email, passwd_hash, nombre, super_admin
                     FROM administrador
                     WHERE email = ?
                     LIMIT 1";

        $stmt = $conexion->prepare($sqlAdmin);
        if (!$stmt) {
            $conexion->close();
            return ['status' => 'error', 'message' => 'Error interno (prepare admin)'];
        }

        $stmt->bind_param("s", $usuario);
        $stmt->execute();
        $res = $stmt->get_result();

        if ($res && $res->num_rows === 1) {
            $admin = $res->fetch_assoc();
            if (password_verify($pass, $admin['passwd_hash'])) {

                $_SESSION['rol'] = 'admin';
                $_SESSION['id']  = (int)$admin['id'];
                $_SESSION['email'] = $admin['email'];
                $_SESSION['nombre'] = $admin['nombre'];
                $_SESSION['super_admin'] = (bool)$admin['super_admin'];

                $stmt->close();
                $conexion->close();

                return [
                    'status' => 'success',
                    'message' => 'Login admin correcto',
                    'rol' => 'admin',
                ];
            }
        }

        $stmt->close();

        // 2) USUARIO
        $sqlUser = "SELECT id, nombre_usuario, passwd_hash, superusuario, activa
                    FROM vivienda
                    WHERE nombre_usuario = ?
                    LIMIT 1";

        $stmt2 = $conexion->prepare($sqlUser);
        if (!$stmt2) {
            $conexion->close();
            return ['status' => 'error', 'message' => 'Error interno (prepare usuario)'];
        }

        $stmt2->bind_param("s", $usuario);
        $stmt2->execute();
        $res2 = $stmt2->get_result();

        if ($res2 && $res2->num_rows === 1) {
            $user = $res2->fetch_assoc();
            if (password_verify($pass, $user['passwd_hash'])) {

                $_SESSION['rol'] = 'usuario';
                $_SESSION['id']  = (int)$user['id'];
                $_SESSION['nombre_usuario'] = $user['nombre_usuario'];
                $_SESSION['superusuario'] = (bool)$user['superusuario'];
                $_SESSION['activa'] = (bool)$user['activa'];

                $stmt2->close();
                $conexion->close();

                return [
                    'status' => 'success',
                    'message' => 'Login usuario correcto',
                    'rol' => 'usuario'
                ];
            }
        }

        $stmt2->close();
        $conexion->close();

        return ['status' => 'error', 'message' => 'Email y/o contraseña incorrectos'];
    }

    $conexion->close();
    return ['status' => 'error', 'message' => 'Función no válida'];
}

if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    $respuesta = manejarLogin();
    echo json_encode($respuesta);
}
