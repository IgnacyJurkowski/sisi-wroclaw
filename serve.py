#!/usr/bin/env python3
import http.server, socketserver, os

os.chdir(os.path.join(os.path.dirname(__file__), 'public'))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.mjs':       'application/javascript',
        '.js':        'application/javascript',
        '.json':      'application/json',
        '.woff2':     'font/woff2',
        '.woff':      'font/woff',
        '.mp4':       'video/mp4',
        '.svg':       'image/svg+xml',
        '.webp':      'image/webp',
        '.framercms': 'application/octet-stream',
    }

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, fmt, *args):
        code = args[1] if len(args) > 1 else '???'
        if str(code).startswith(('4', '5')):
            super().log_message(fmt, *args)

PORT = 8888
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Serving at http://localhost:{PORT}/')
    httpd.serve_forever()
