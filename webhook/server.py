#!/usr/bin/env python3
"""
ChoreMax Deploy Webhook Server
Runs directly on the host (not in Docker).
Listens on localhost:9876, triggered via HTTPS through NPM.
"""
import os
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer

DEPLOY_TOKEN = os.environ.get("DEPLOY_TOKEN", "")
PROJECT_DIR  = "/srv/docker/choremax"
LOG_FILE     = "/tmp/choremax_deploy.log"


class DeployHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Validate token
        token = self.headers.get("X-Deploy-Token", "")
        if not DEPLOY_TOKEN or token != DEPLOY_TOKEN:
            self._respond(403, {"error": "invalid token"})
            return

        self._respond(200, {"status": "deploying"})

        # Run deploy script in background — detached so it outlives this request
        subprocess.Popen(
            ["bash", f"{PROJECT_DIR}/webhook/deploy.sh"],
            start_new_session=True,
            stdout=open(LOG_FILE, "w"),
            stderr=subprocess.STDOUT,
        )

    def _respond(self, code, body):
        import json
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass  # Suppress access logs


if __name__ == "__main__":
    if not DEPLOY_TOKEN:
        print("ERROR: DEPLOY_TOKEN environment variable is not set")
        exit(1)
    print(f"ChoreMax webhook server listening on localhost:9876")
    HTTPServer(("127.0.0.1", 9876), DeployHandler).serve_forever()
