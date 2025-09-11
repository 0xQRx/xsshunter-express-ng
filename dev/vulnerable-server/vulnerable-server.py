import os
from http.server import SimpleHTTPRequestHandler, HTTPServer
from functools import partial

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add permissive CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        # Respond to preflight requests
        self.send_response(200, "ok")
        self.end_headers()

if __name__ == '__main__':
    PORT = 8888
    content_dir = os.path.join(os.path.dirname(__file__), 'content')

    # Use functools.partial to serve from ./content
    handler_class = partial(CORSRequestHandler, directory=content_dir)

    httpd = HTTPServer(('', PORT), handler_class)
    print(f"Serving from '{content_dir}' on port {PORT} with CORS enabled...")
    httpd.serve_forever()
