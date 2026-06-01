document.addEventListener("DOMContentLoaded", function () {
    const badge = document.getElementById("reservas-badge");

    if (!badge) {
        return;
    }

    const NOTIFICACION_RESERVAS_VISTA = "notificacionReservasVista";

    if (window.location.pathname.includes("misReservas.html")) {
        sessionStorage.setItem(NOTIFICACION_RESERVAS_VISTA, "1");
        badge.hidden = true;
        return;
    }

    if (sessionStorage.getItem(NOTIFICACION_RESERVAS_VISTA) === "1") {
        badge.hidden = true;
        return;
    }

    cargarNotificaciones();

    function cargarNotificaciones() {
        fetch("../php/notificacionesUsuario.php")
            .then(response => response.json())
            .then(data => {
                if (data.status !== "success") {
                    badge.hidden = true;
                    return;
                }

                const total = Number(data.total) || 0;

                if (total > 0) {
                    badge.textContent = total;
                    badge.hidden = false;
                } else {
                    badge.hidden = true;
                }
            })
            .catch(error => {
                console.error("Error:", error);
                badge.hidden = true;
            });
    }
});