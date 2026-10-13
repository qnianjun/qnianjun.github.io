#!/usr/bin/env python3
"""Run on your own computer; credentials stay out of the repository."""
import base64
import getpass
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer


def main():
    redirect_uri = 'http://127.0.0.1:8888/callback'
    client_id = input('Spotify Client ID: ').strip()
    client_secret = getpass.getpass('Spotify Client Secret (hidden): ').strip()
    if not client_id or not client_secret:
        raise SystemExit('Client ID and Client Secret are required.')
    state = secrets.token_urlsafe(32)
    result = {}

    class Callback(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Authorization codes must not appear in access logs.

        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)
            if parsed.path != '/callback' or not secrets.compare_digest(query.get('state', [''])[0], state):
                self.send_error(400, 'Invalid callback')
                return
            result['code'] = query.get('code', [''])[0]
            result['error'] = query.get('error', [''])[0]
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write('授權已返回，請回到終端機。'.encode())

    url = 'https://accounts.spotify.com/authorize?' + urllib.parse.urlencode({
        'client_id': client_id, 'response_type': 'code', 'redirect_uri': redirect_uri,
        'scope': 'user-read-currently-playing', 'state': state,
    })
    with HTTPServer(('127.0.0.1', 8888), Callback) as server:
        server.timeout = 1
        print('請在執行此程式的電腦上開啟以下網址，登入你要顯示的 Spotify 帳號：\n' + url)
        webbrowser.open(url)
        deadline = time.monotonic() + 300
        while not result and time.monotonic() < deadline:
            server.handle_request()
    if not result.get('code') or result.get('error'):
        raise SystemExit('未完成授權或已逾時，請重新執行。')
    request = urllib.request.Request('https://accounts.spotify.com/api/token',
        data=urllib.parse.urlencode({
            'grant_type': 'authorization_code', 'code': result['code'], 'redirect_uri': redirect_uri,
        }).encode(),
        headers={
            'Authorization': 'Basic ' + base64.b64encode((client_id + ':' + client_secret).encode()).decode(),
            'Content-Type': 'application/x-www-form-urlencoded',
        })
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            data = json.load(response)
    except (urllib.error.URLError, ValueError):
        raise SystemExit('取得授權失敗。請確認 App 的 ID、Secret 和 Redirect URI，再重新執行。')
    if not data.get('refresh_token'):
        raise SystemExit('Spotify 未提供 refresh token，請重新授權。')
    print('\n將以下值存入 Cloudflare 的 SPOTIFY_REFRESH_TOKEN Secret，請勿貼到聊天或 Git：')
    print(data['refresh_token'])


if __name__ == '__main__':
    main()
