import http.server
import socketserver
import threading
import subprocess
import time
import os

PORT = 8095
DIRECTORY = "/Users/sfing/Documents/Crshhx/dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
        httpd.serve_forever()

server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()
time.sleep(1)

artifact_dir = "/Users/sfing/.gemini/antigravity/brain/df271967-bc6e-4a65-94bd-e95c6e34b22a"

# 1. Capture Brand Vault View
out1 = os.path.join(artifact_dir, "crshhx_brand_vault.png")
subprocess.run([
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--user-data-dir=/tmp/chrome-data-brand1",
    "--window-size=1400,900",
    "--virtual-time-budget=3000",
    f"--screenshot={out1}",
    f"http://127.0.0.1:{PORT}/index.html"
], capture_output=True)

# 2. Capture Brand Designer View
out2 = os.path.join(artifact_dir, "crshhx_brand_designer.png")
subprocess.run([
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--user-data-dir=/tmp/chrome-data-brand2",
    "--window-size=1400,900",
    "--virtual-time-budget=3000",
    f"--screenshot={out2}",
    f"http://127.0.0.1:{PORT}/index.html?view=designer"
], capture_output=True)

print("Brand Screenshots taken:")
print("1. Brand Vault:", os.path.exists(out1), os.path.getsize(out1) if os.path.exists(out1) else 0)
print("2. Brand Designer:", os.path.exists(out2), os.path.getsize(out2) if os.path.exists(out2) else 0)
