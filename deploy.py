#!/usr/bin/env python3
"""
ChoreMax Deploy Script
─────────────────────────────────────────────────────────────────────────────
Runs three steps in sequence:
  1. Git commit (if there are changes) + push to GitHub
  2. HTTPS webhook → server runs git pull + restarts Docker containers
  3. App Store Connect API → triggers Xcode Cloud build → TestFlight
─────────────────────────────────────────────────────────────────────────────
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

# ── CONFIG ────────────────────────────────────────────────────────────────────
REPO_DIR      = os.path.expanduser("~/Downloads/ChoreMax")
DEPLOY_WEBHOOK = "https://choremax.bltbox.com/deploy"

ASC_KEY_ID    = "QNW5H7HA98"
ASC_ISSUER_ID = "69a6de8d-eec6-47e3-e053-5b8c7c11a4d1"
ASC_KEY_FILE  = os.path.join(REPO_DIR, "AuthKey_QNW5H7HA98.p8")
APP_ID        = "6762284433"

# CiArchiveAction.buildDistributionAudience — controls TestFlight audience.
# INTERNAL_ONLY: Apple permanently flags the upload as internal, blocking
# external groups. APP_STORE_ELIGIBLE makes builds usable for both internal
# and external testing groups (and submits to Beta App Review automatically).
ARCHIVE_AUDIENCE_EXTERNAL_OK = "APP_STORE_ELIGIBLE"
# ─────────────────────────────────────────────────────────────────────────────


def load_deploy_token():
    """Read DEPLOY_TOKEN from deploy.config (gitignored local file)."""
    config_path = os.path.join(REPO_DIR, "deploy.config")
    if not os.path.exists(config_path):
        print("❌  Missing deploy.config — copy deploy.config.example and fill in your token")
        sys.exit(1)
    with open(config_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("DEPLOY_TOKEN="):
                return line.split("=", 1)[1].strip()
    print("❌  DEPLOY_TOKEN not found in deploy.config")
    sys.exit(1)


def log(msg, emoji="▶"):
    print(f"\n{emoji}  {msg}", flush=True)


def run(cmd, cwd=None):
    result = subprocess.run(cmd, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"\n❌  Command failed: {' '.join(str(c) for c in cmd)}")
        sys.exit(1)
    return result


def ensure_pyjwt():
    try:
        import jwt  # noqa: F401
        from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey  # noqa: F401
    except ImportError:
        log("Installing PyJWT + cryptography (one-time setup)...", "📦")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "PyJWT", "cryptography", "-q"],
            check=True,
        )


def make_asc_token():
    ensure_pyjwt()
    import jwt

    with open(ASC_KEY_FILE, "r") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": ASC_ISSUER_ID,
        "iat": now,
        "exp": now + 1200,
        "aud": "appstoreconnect-v1",
    }
    token = jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers={"kid": ASC_KEY_ID},
    )
    return token


def asc_get(path, token):
    url = f"https://api.appstoreconnect.apple.com{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def asc_post(path, body, token):
    url = f"https://api.appstoreconnect.apple.com{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def ensure_external_distribution(workflow_id, token):
    """
    Verify the workflow's ARCHIVE audience is APP_STORE_ELIGIBLE. If not,
    warn — but don't try to PATCH it. Apple's API exposes the audience as
    a readable field but rejects updates because the workflow's internal
    `deploymentConfig` state can only be regenerated atomically by the
    Xcode UI. Setting only the audience leaves the workflow inconsistent
    and Apple returns HTTP 409.

    To fix: Xcode → Report Navigator (⌘9) → Cloud → right-click 'Default'
    → Edit Workflow → Archive action → change audience to
    "TestFlight and App Store" → Save.
    """
    resp = asc_get(f"/v1/ciWorkflows/{workflow_id}", token)
    actions = resp["data"]["attributes"].get("actions") or []

    for action in actions:
        if action.get("actionType") != "ARCHIVE":
            continue
        audience = action.get("buildDistributionAudience")
        if audience == ARCHIVE_AUDIENCE_EXTERNAL_OK:
            return True
        log(
            f"Workflow audience is {audience!r} — builds will upload as "
            "internal-only and CANNOT be added to external TestFlight groups. "
            "Fix once in Xcode: Report Navigator (⌘9) → Cloud → right-click "
            "'Default' → Edit Workflow → Archive action → set audience to "
            "'TestFlight and App Store' → Save.",
            "⚠️ ",
        )
        return False

    return False


def trigger_xcode_build(token):
    resp = asc_get(f"/v1/apps/{APP_ID}/ciProduct", token)
    product_id = resp["data"]["id"]

    resp = asc_get(f"/v1/ciProducts/{product_id}/workflows", token)
    workflows = resp["data"]
    if not workflows:
        raise RuntimeError("No Xcode Cloud workflows found for this app")

    workflow = workflows[0]
    for w in workflows:
        name = w["attributes"].get("name", "").lower()
        if any(kw in name for kw in ("archive", "main", "release", "deploy")):
            workflow = w
            break

    workflow_id   = workflow["id"]
    workflow_name = workflow["attributes"]["name"]
    log(f'Triggering workflow: "{workflow_name}"', "🔨")

    ensure_external_distribution(workflow_id, token)

    body = {
        "data": {
            "type": "ciBuildRuns",
            "relationships": {
                "workflow": {
                    "data": {"type": "ciWorkflows", "id": workflow_id}
                }
            },
        }
    }
    result   = asc_post("/v1/ciBuildRuns", body, token)
    build_id = result["data"]["id"]
    return build_id


# ── STEP 1 — Git commit + push ────────────────────────────────────────────────
print("\n" + "═" * 52)
print("  🚀  ChoreMax Deploy")
print("═" * 52)

log("Checking for uncommitted changes...", "📂")
os.chdir(REPO_DIR)

status = subprocess.run(
    ["git", "status", "--porcelain"], capture_output=True, text=True
)
if status.stdout.strip():
    timestamp = time.strftime("%d %b %Y %H:%M")
    run(["git", "add", "-A"])
    run(["git", "commit", "-m", f"Deploy {timestamp}"])
    log("Changes committed", "✅")
else:
    log("No local changes — pushing existing commits", "ℹ️ ")

log("Pushing to GitHub...", "📤")
run(["git", "push", "origin", "main"])
log("GitHub up to date", "✅")

# ── STEP 2 — Webhook deploy ───────────────────────────────────────────────────
log("Triggering server deploy...", "🖥️ ")
deploy_token = load_deploy_token()
try:
    req = urllib.request.Request(
        DEPLOY_WEBHOOK,
        data=b"{}",
        headers={
            "Content-Type": "application/json",
            "X-Deploy-Token": deploy_token,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        resp = json.loads(r.read())
    log(f"Server deploying ({resp.get('status', 'ok')}) — takes ~30s in background", "✅")
except Exception as e:
    print(f"\n⚠️   Server webhook failed: {e}")
    print("   Check https://cockpit.bltbox.com for status or deploy manually.")

# ── STEP 3 — Xcode Cloud build ────────────────────────────────────────────────
log("Triggering iOS build...", "📱")
try:
    token    = make_asc_token()
    build_id = trigger_xcode_build(token)
    log(f"iOS build queued  (ID: {build_id})", "✅")
    print(
        f"\n   Track it in Xcode → Report Navigator → Cloud\n"
        f"   or: https://appstoreconnect.apple.com/teams/"
        f"{ASC_ISSUER_ID}/apps/{APP_ID}/ci"
    )
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"\n⚠️   Xcode Cloud trigger failed (HTTP {e.code}): {body}")
    print("   Start the build manually in Xcode or App Store Connect.")
except Exception as e:
    print(f"\n⚠️   Xcode Cloud trigger failed: {e}")
    print("   Start the build manually in Xcode or App Store Connect.")

# ── Done ──────────────────────────────────────────────────────────────────────
print("\n" + "═" * 52)
print("  ✅  Deploy complete!")
print("═" * 52 + "\n")
