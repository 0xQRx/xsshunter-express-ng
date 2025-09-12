#!/bin/bash
# Patch Greenlock to skip HTTP server binding

FILE="/app/server-ng/node_modules/@root/greenlock-express/servers.js"

if [ ! -f "$FILE" ]; then
    echo "[Patch] Error: Greenlock servers.js not found at $FILE"
    exit 1
fi

# Backup original file
cp "$FILE" "$FILE.backup"

# Use sed to replace the HTTP server section
# This is more reliable than using patch with complex multi-line changes
sed -i '
/var plainServer = servers\.httpServer();/,/plainServer\.removeListener("error", startError);/ {
    # When we find the start of the block
    /var plainServer = servers\.httpServer();/ {
        # Replace with our patched version
        i\            // PATCHED: Skip HTTP server completely - we handle it ourselves
        i\            console.info(idstr + "Skipping HTTP server (handled externally)");
        i\            
        i\            // TODO fetch greenlock.servername
        i\            _middlewareApp = app || _middlewareApp;
        i\            var secureServer = servers.httpsServer(null, app);
        i\            var secureAddr = "0.0.0.0";
        i\            var securePort = 443;
        i\            secureServer.listen(securePort, secureAddr, function() {
        i\                console.info(idstr + "Listening on", secureAddr + ":" + securePort, "for secure traffic");
        i\                
        # Skip to the end of the block
        :skip
        n
        /plainServer\.removeListener("error", startError);/! b skip
        # Replace the last two lines
        c\                secureServer.removeListener("error", startError);\
                resolve();\
            });
    }
}
' "$FILE"

echo "[Patch] Greenlock patched successfully to skip HTTP server"