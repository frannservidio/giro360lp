import http.server, socketserver

class H(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.svg': 'image/svg+xml',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

class S(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

with S(("127.0.0.1", 8139), H) as httpd:
    print("serving on 8139")
    httpd.serve_forever()
