#!/usr/bin/env python3
"""
TigerHost Node Agent (sample)
-----------------------------
Run on each LXC / VM host to:
  - expose a tiny HTTP API the panel can call (status, exec, etc.)
  - heartbeat back to the panel with live capacity & VPS state

Setup (Linux, root):
  apt install python3 python3-pip
  pip3 install flask requests psutil
  export PANEL_URL=https://your-panel.example.com
  export NODE_ID=<uuid from the panel>
  export AGENT_SECRET=<from the Nodes page>
  python3 node-agent.py

The agent signs every heartbeat with HMAC-SHA256 of the JSON body so the panel
can verify it without a shared session.
"""

import hashlib, hmac, json, os, time, threading, subprocess
from datetime import datetime
import psutil
import requests
from flask import Flask, jsonify, request, abort

PANEL_URL    = os.environ.get("PANEL_URL", "https://your-panel.example.com").rstrip("/")
NODE_ID      = os.environ["NODE_ID"]
AGENT_SECRET = os.environ["AGENT_SECRET"].encode()
PORT         = int(os.environ.get("PORT", "5000"))

app = Flask(__name__)

# ---- helpers --------------------------------------------------------------

def sign(body: bytes) -> str:
    return hmac.new(AGENT_SECRET, body, hashlib.sha256).hexdigest()

def list_lxc():
    try:
        out = subprocess.check_output(["lxc-ls", "--fancy", "-F", "name,state"], text=True)
        rows = [l.split() for l in out.strip().splitlines()[2:] if l.strip()]
        return [{"name": r[0], "state": r[1].lower()} for r in rows]
    except Exception:
        return []

def list_vms():
    try:
        out = subprocess.check_output(["virsh", "list", "--all"], text=True)
        rows = [l.split(None, 2) for l in out.strip().splitlines()[2:] if l.strip()]
        return [{"name": r[1], "state": r[2].lower()} for r in rows if len(r) >= 3]
    except Exception:
        return []

def snapshot():
    vm_total = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "ts": datetime.utcnow().isoformat() + "Z",
        "cpu_pct": psutil.cpu_percent(interval=0.2),
        "ram_used_mb": int((vm_total.total - vm_total.available) / 1024 / 1024),
        "ram_total_mb": int(vm_total.total / 1024 / 1024),
        "disk_used_gb": int(disk.used / 1024 / 1024 / 1024),
        "disk_total_gb": int(disk.total / 1024 / 1024 / 1024),
        "lxc": list_lxc(),
        "vms": list_vms(),
    }

# ---- HTTP API the panel calls --------------------------------------------

def require_signed(req):
    sig = req.headers.get("X-Signature")
    if not sig or not hmac.compare_digest(sig, sign(req.get_data())):
        abort(401)

@app.get("/health")
def health():
    return jsonify({"ok": True, "node_id": NODE_ID})

@app.get("/status")
def status():
    require_signed(request)
    return jsonify(snapshot())

@app.post("/vps/<name>/<action>")
def vps_action(name, action):
    require_signed(request)
    cmd_map = {
        "start":   ["lxc-start", "-n", name],
        "stop":    ["lxc-stop",  "-n", name],
        "restart": ["lxc-stop",  "-n", name],   # then start (omitted for brevity)
    }
    if action not in cmd_map:
        return jsonify({"ok": False, "error": "unknown action"}), 400
    try:
        subprocess.check_call(cmd_map[action])
        return jsonify({"ok": True})
    except subprocess.CalledProcessError as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ---- heartbeat back to the panel -----------------------------------------

def heartbeat_loop():
    url = f"{PANEL_URL}/api/public/agent/heartbeat"
    while True:
        try:
            payload = json.dumps({"node_id": NODE_ID, **snapshot()}).encode()
            sig = sign(payload)
            r = requests.post(url, data=payload, timeout=10,
                              headers={"Content-Type": "application/json",
                                       "X-Signature": sig,
                                       "X-Node-Id": NODE_ID})
            print(f"[hb] {r.status_code}")
        except Exception as e:
            print(f"[hb] failed: {e}")
        time.sleep(15)

if __name__ == "__main__":
    threading.Thread(target=heartbeat_loop, daemon=True).start()
    print(f"TigerHost agent listening on :{PORT}, reporting to {PANEL_URL}")
    app.run(host="0.0.0.0", port=PORT)
