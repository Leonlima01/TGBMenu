// ==UserScript==
// @name         Transmission Quick Sender
// @namespace    local.leo.transmission
// @version      0.1.0
// @description  Envia magnet links para um servidor Transmission
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      192.168.0.22
// ==/UserScript==

(function () {
    "use strict";

    const CONFIG = {
        host: "http://192.168.0.22:9091/transmission/rpc",
        username: "casaos",
        password: "casaos"
    };

    let sessionId = null;

    createWidget();

    function createWidget() {
        const collapsed =
            GM_getValue("collapsed", true);

        const container = document.createElement("div");

        container.id = "tm-widget";

        container.innerHTML = `
            <div id="tm-header">
                Transmission
            </div>

            <div id="tm-body">
                <textarea
                    id="tm-magnet"
                    placeholder="Cole um magnet link..."
                ></textarea>

                <div id="tm-actions">
                    <button id="tm-send">
                        Enviar
                    </button>

                    <button id="tm-clear">
                        Limpar
                    </button>
                </div>

                <div id="tm-status"></div>
            </div>
        `;

        const style = document.createElement("style");

        style.textContent = `
            #tm-widget {
                position: fixed;
                right: 20px;
                bottom: 20px;
                width: 320px;
                background: #1f1f1f;
                color: white;
                border: 1px solid #444;
                border-radius: 8px;
                z-index: 999999;
                font-family: Arial, sans-serif;
            }

            #tm-header {
                padding: 10px;
                cursor: pointer;
                background: #2a2a2a;
                font-weight: bold;
            }

            #tm-body {
                padding: 10px;
                display: ${collapsed ? "none" : "block"};
            }

            #tm-magnet {
                width: 100%;
                height: 80px;
                box-sizing: border-box;
                resize: vertical;
            }

            #tm-actions {
                margin-top: 10px;
                display: flex;
                gap: 8px;
            }

            #tm-actions button {
                flex: 1;
                cursor: pointer;
            }

            #tm-status {
                margin-top: 10px;
                font-size: 12px;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(container);

        const header = document.getElementById("tm-header");
        const body = document.getElementById("tm-body");

        header.addEventListener("click", () => {
            const hidden =
                body.style.display === "none";

            body.style.display =
                hidden ? "block" : "none";

            GM_setValue(
                "collapsed",
                !hidden
            );
        });

        document
            .getElementById("tm-clear")
            .addEventListener("click", () => {
                document.getElementById("tm-magnet").value = "";
            });

        document
            .getElementById("tm-send")
            .addEventListener("click", async () => {

                const magnet =
                    document
                        .getElementById("tm-magnet")
                        .value
                        .trim();

                if (!magnet) {
                    setStatus("Cole um magnet link.");
                    return;
                }

                try {

                    setStatus("Enviando...");

                    const result =
                        await addMagnet(magnet);

                    if (result.result === "success") {
                        setStatus("Torrent enviado!");
                    }
                    else {
                        setStatus(
                            "Erro: " +
                            result.result
                        );
                    }

                } catch (err) {

                    console.error(err);

                    setStatus(
                        "Falha ao comunicar com o servidor."
                    );
                }
            });
    }

    function setStatus(text) {
        document.getElementById("tm-status").textContent = text;
    }

    async function addMagnet(magnet) {
        return transmissionRpc({
            method: "torrent-add",
            arguments: {
                filename: magnet
            }
        });
    }

    async function transmissionRpc(payload) {

        const auth =
            btoa(
                `${CONFIG.username}:${CONFIG.password}`
            );

        return new Promise((resolve, reject) => {

            const sendRequest = (sid = null) => {

                const headers = {
                    "Authorization": `Basic ${auth}`,
                    "Content-Type": "application/json"
                };

                if (sid) {
                    headers[
                        "X-Transmission-Session-Id"
                    ] = sid;
                }

                GM_xmlhttpRequest({

                    method: "POST",

                    url: CONFIG.host,

                    headers,

                    data: JSON.stringify(payload),

                    onload(response) {

                        if (response.status === 409) {

                            const match =
                                response.responseHeaders.match(
                                    /X-Transmission-Session-Id:\s*(.+)/i
                                );

                            if (!match) {
                                reject(
                                    new Error(
                                        "Session ID não encontrado."
                                    )
                                );
                                return;
                            }

                            sessionId =
                                match[1].trim();

                            sendRequest(sessionId);

                            return;
                        }

                        try {
                            resolve(
                                JSON.parse(
                                    response.responseText
                                )
                            );
                        }
                        catch (err) {
                            reject(err);
                        }
                    },

                    onerror: reject
                });
            };

            sendRequest(sessionId);
        });
    }

})();