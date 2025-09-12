#!/usr/bin/env node
// Patch Greenlock to skip HTTP server binding

const fs = require('fs');
const path = require('path');

const filePath = '/app/server-ng/node_modules/@root/greenlock-express/servers.js';

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Backup original
fs.writeFileSync(filePath + '.backup', content);

// Find and replace the serveApp function
const original = `    servers.serveApp = function(app) {
        return new Promise(function(resolve, reject) {
            if ("function" !== typeof app) {
                reject(
                    new Error(
                        "glx.serveApp(app) expects a node/express app in the format \`function (req, res) { ... }\`"
                    )
                );
                return;
            }

            var id = cluster.isWorker && cluster.worker.id;
            var idstr = (id && "#" + id + " ") || "";
            var plainServer = servers.httpServer();
            var plainAddr = "0.0.0.0";
            var plainPort = 80;
            plainServer.listen(plainPort, plainAddr, function() {
                console.info(
                    idstr + "Listening on",
                    plainAddr + ":" + plainPort,
                    "for ACME challenges, and redirecting to HTTPS"
                );

                // TODO fetch greenlock.servername
                _middlewareApp = app || _middlewareApp;
                var secureServer = servers.httpsServer(null, app);
                var secureAddr = "0.0.0.0";
                var securePort = 443;
                secureServer.listen(securePort, secureAddr, function() {
                    console.info(idstr + "Listening on", secureAddr + ":" + securePort, "for secure traffic");

                    plainServer.removeListener("error", startError);
                    secureServer.removeListener("error", startError);
                    resolve();
                });
            });
        });
    };`;

const patched = `    servers.serveApp = function(app) {
        return new Promise(function(resolve, reject) {
            if ("function" !== typeof app) {
                reject(
                    new Error(
                        "glx.serveApp(app) expects a node/express app in the format \`function (req, res) { ... }\`"
                    )
                );
                return;
            }

            var id = cluster.isWorker && cluster.worker.id;
            var idstr = (id && "#" + id + " ") || "";
            
            // PATCHED: Skip HTTP server completely - we handle it ourselves
            console.info(idstr + "Skipping HTTP server (handled externally)");
            
            // TODO fetch greenlock.servername
            _middlewareApp = app || _middlewareApp;
            var secureServer = servers.httpsServer(null, app);
            var secureAddr = "0.0.0.0";
            var securePort = 443;
            secureServer.listen(securePort, secureAddr, function() {
                console.info(idstr + "Listening on", secureAddr + ":" + securePort, "for secure traffic");
                
                secureServer.removeListener("error", startError);
                resolve();
            });
        });
    };`;

// Replace the function
if (content.includes(original)) {
    content = content.replace(original, patched);
    fs.writeFileSync(filePath, content);
    console.log('[Patch] Greenlock patched successfully to skip HTTP server');
} else {
    console.log('[Patch] Warning: Could not find expected code to patch');
    console.log('[Patch] Greenlock may have already been patched or has a different version');
}