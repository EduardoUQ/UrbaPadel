import { LitElement, html } from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";

class UrbaAlert extends LitElement {

    static properties = {
        tipo: { type: String },
        mensaje: { type: String }
    };

    constructor() {
        super();
        this.tipo = "info";
        this.mensaje = "";
    }

    render() {
        return html`
            <style>
                .alert {
                    padding: 14px 18px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }

                .info {
                    background-color: #e8f1ff;
                    color: #174ea6;
                }

                .success {
                    background-color: #e7f7ed;
                    color: #137333;
                }

                .error {
                    background-color: #fdecea;
                    color: #b3261e;
                }
            </style>

            <div class="alert ${this.tipo}">
                ${this.mensaje}
            </div>
        `;
    }
}

customElements.define("urba-alert", UrbaAlert);