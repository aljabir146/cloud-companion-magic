#!/usr/bin/env node
// TigerHost LXD daemon — connects host server to the panel via WebSocket.
// Replaces the older Proxmox/KVM agent. All VPS = LXC containers managed by LXD.
//
// Env (from /opt/tigerhost/.env):
//   PANEL_URL        e.g. https://panel.example.com
//   AGENT_API_KEY    issued by panel admin (Nodes page → Add remote node)
//   NODE_ID          uuid of this node row in the panel
//   LXD_BRIDGE_INTERFACE  default lxdbr0

const { exec } = require("child_process");
const { promisify } = require("util");
const os = require("os");
const fs = require("fs");
const path = require("path");

const run = promisify(exec);
const LXC = "/snap/bin/lxc";
const PANEL_URL = process.env.PANEL_URL || "http://localhost:3000";
const API_KEY = process.env.AGENT_API_KEY || "";
const NODE_ID = process.env.NODE_ID || "local";
const HEARTBEAT_MS = 15_000;

async function lxc(args) {
  const { stdout } = await run(`${LXC} ${args}`, { maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

// ── VPS lifecycle ─────────────────────────────────────────
async function createVps({ name, cpu, ram, disk, osImage = "ubuntu:22.04" }) {
  await lxc(`launch ${osImage} ${name} --config limits.cpu=${cpu} --config limits.memory=${ram}MB`);
  await lxc(`config device override ${name} root size=${disk}GB`);
  await new Promise(r => setTimeout(r, 3000));
  const info = JSON.parse(await lxc(`list ${name} --format json`));
  const ip = info[0]?.state?.network?.eth0?.addresses?.find(a => a.family === "inet")?.address ?? null;
  // Default LXC root password (per spec)
  await lxc(`exec ${name} -- bash -c "echo 'root:root' | chpasswd"`);
  return { containerName: name, privateIp: ip };
}
const startVps   = name => lxc(`start ${name}`);
const stopVps    = name => lxc(`stop ${name} --force`);
const restartVps = name => lxc(`restart ${name}`);
const deleteVps  = name => lxc(`delete ${name} --force`);

async function getVpsStats(name) {
  try {
    const info = JSON.parse(await lxc(`list ${name} --format json`));
    const s = info[0]?.state || {};
    return {
      status: info[0]?.status?.toLowerCase(),
      cpuNs: s.cpu?.usage || 0,
      ramUsedMB: Math.round((s.memory?.usage || 0) / 1024 / 1024),
      ramPeakMB: Math.round((s.memory?.usage_peak || 0) / 1024 / 1024),
      netIn: s.network?.eth0?.counters?.bytes_received || 0,
      netOut: s.network?.eth0?.counters?.bytes_sent || 0,
    };
  } catch { return null; }
}

async function getAllVpsStats() {
  const list = JSON.parse(await lxc("list --format json"));
  return list.map(c => ({
    name: c.name,
    status: c.status.toLowerCase(),
    cpuNs: c.state?.cpu?.usage || 0,
    ramUsedMB: Math.round((c.state?.memory?.usage || 0) / 1024 / 1024),
    ip: c.state?.network?.eth0?.addresses?.find(a => a.family === "inet")?.address ?? null,
  }));
}

async function execInVps(name, command) {
  const safe = command.replace(/'/g, "'\\''");
  const { stdout, stderr } = await run(`${LXC} exec ${name} -- bash -c '${safe}'`, { maxBuffer: 8 * 1024 * 1024 });
  return { stdout, stderr };
}

// ── Host metrics ──────────────────────────────────────────
let lastCpu = os.cpus();
function cpuPercent() {
  const cur = os.cpus();
  let idleDiff = 0, totalDiff = 0;
  for (let i = 0; i < cur.length; i++) {
    const a = lastCpu[i].times, b = cur[i].times;
    const aT = a.user + a.nice + a.sys + a.idle + a.irq;
    const bT = b.user + b.nice + b.sys + b.idle + b.irq;
    idleDiff += b.idle - a.idle;
    totalDiff += bT - aT;
  }
  lastCpu = cur;
  return totalDiff ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
}

async function nodeMetrics() {
  const disk = (await run("df -BG / | tail -1")).stdout.trim().split(/\s+/);
  let pool = { used: 0, total: 0 };
  try {
    const p = JSON.parse(await lxc("storage info default --format json"));
    pool = { used: p.space?.used || 0, total: p.space?.total || 0 };
  } catch {}
  return {
    cpu: cpuPercent(),
    ramUsedMB: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
    ramTotalMB: Math.round(os.totalmem() / 1024 / 1024),
    diskUsedGB: parseInt(disk[2]),
    diskTotalGB: parseInt(disk[1]),
    lxdPoolUsedGB: Math.round(pool.used / 1024 / 1024 / 1024),
    lxdPoolTotalGB: Math.round(pool.total / 1024 / 1024 / 1024),
    uptimeSec: Math.round(os.uptime()),
    loadavg: os.loadavg(),
  };
}

// ── Port forwarding via iptables ──────────────────────────
async function addPortForward({ externalPort, privateIp, internalPort, protocol }) {
  const proto = protocol === "both" ? "tcp" : protocol;
  await run(`iptables -t nat -A PREROUTING -p ${proto} --dport ${externalPort} -j DNAT --to-destination ${privateIp}:${internalPort}`);
  await run(`iptables -A FORWARD -p ${proto} -d ${privateIp} --dport ${internalPort} -j ACCEPT`);
  await run("iptables-save > /etc/iptables/rules.v4 2>/dev/null || true");
}
async function removePortForward({ externalPort, privateIp, internalPort, protocol }) {
  const proto = protocol === "both" ? "tcp" : protocol;
  await run(`iptables -t nat -D PREROUTING -p ${proto} --dport ${externalPort} -j DNAT --to-destination ${privateIp}:${internalPort} 2>/dev/null || true`);
  await run(`iptables -D FORWARD -p ${proto} -d ${privateIp} --dport ${internalPort} -j ACCEPT 2>/dev/null || true`);
  await run("iptables-save > /etc/iptables/rules.v4 2>/dev/null || true");
}

// ── Heartbeat to panel ────────────────────────────────────
async function heartbeat() {
  try {
    const metrics = await nodeMetrics();
    const containers = await getAllVpsStats();
    await fetch(`${PANEL_URL}/api/public/agent/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "x-node-id": NODE_ID },
      body: JSON.stringify({ nodeId: NODE_ID, metrics, containers, ts: Date.now() }),
    });
  } catch (e) { console.error("[heartbeat]", e.message); }
}

// ── HTTP control endpoint (panel pushes commands here) ────
const http = require("http");
const server = http.createServer(async (req, res) => {
  if (req.headers["x-api-key"] !== API_KEY) {
    res.writeHead(401); return res.end("unauthorized");
  }
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const ok = (data) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
  const err = (e) => { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); };
  try {
    if (req.url === "/health")            return ok({ ok: true, node: NODE_ID });
    if (req.url === "/metrics")           return ok(await nodeMetrics());
    if (req.url === "/vps/list")          return ok(await getAllVpsStats());
    if (req.url === "/vps/create")        return ok(await createVps(body));
    if (req.url === "/vps/start")         return ok(await startVps(body.name));
    if (req.url === "/vps/stop")          return ok(await stopVps(body.name));
    if (req.url === "/vps/restart")       return ok(await restartVps(body.name));
    if (req.url === "/vps/delete")        return ok(await deleteVps(body.name));
    if (req.url === "/vps/stats")         return ok(await getVpsStats(body.name));
    if (req.url === "/vps/exec")          return ok(await execInVps(body.name, body.command));
    if (req.url === "/portforward/add")   return ok(await addPortForward(body));
    if (req.url === "/portforward/del")   return ok(await removePortForward(body));
    res.writeHead(404); res.end("not found");
  } catch (e) { err(e); }
});

const PORT = process.env.AGENT_PORT || 4001;
server.listen(PORT, () => console.log(`[tigerhost-daemon] node=${NODE_ID} listening :${PORT} → ${PANEL_URL}`));
setInterval(heartbeat, HEARTBEAT_MS);
heartbeat();
