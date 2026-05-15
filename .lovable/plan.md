This is a very large request. To keep it shippable and stable, I'll break it into clear phases. I'll implement them in order and check in after each phase so you can redirect priorities.

## Scope summary

You're asking for, in one message:

1. SSH Access page per VPS (connection info, root password mgmt, setup command)
2. Tmate + SSHX tunnel session generation (DB + API + daemon)
3. Built-in browser SSH console (xterm.js + ssh2 WebSocket proxy)
4. Root password on VPS creation (admin-set, shown once)
5. Pre-installed OS Template system (admin manager + picker + upload)
6. Trial system (admin-enabled, fixed specs for users)
7. Auto-expiration with "Expiring VPS" section, suspend on expiry, renew flow
8. Real-time node monitoring with live CPU/RAM/Disk + 5-min rolling graph
9. Strict RBAC: normal users blocked from admin pages, VPS create, panel logs, nodes
10. Password + confirm-password change for users
11. Run real commands in web console (replace mock)
12. Minecraft animated nature theme on the dashboard background
13. Rename `hvm_panel` → `tigerhost_panel` everywhere in panel logs
14. Panel logs must capture real events (node connect, VPS lifecycle, etc.)
15. Remove "Install on a host" card from normal users' dashboard
16. Remove "Cluster health" card

## Important reality check (please read)

This project runs on **TanStack Start on Cloudflare Workers + Lovable Cloud (Supabase)**. It is NOT a Node.js + Prisma + Redis + Socket.io + Next.js stack. So:

- **Prisma / `prisma migrate`** → does not apply. Schema lives in Supabase migrations.
- **Redis** → not available. Use Supabase tables + Realtime, or in-memory caches in the daemon.
- **Socket.io** → not available in Cloudflare Workers. Live updates use **Supabase Realtime**, which we already use.
- **`ssh2` npm package** → Node-only native dependency. **Cannot run inside the Worker SSR runtime.** The browser-to-VPS SSH bridge must live in the **node daemon** (already a Node.js process on each host) — not in TanStack server functions. The browser will connect to the daemon via WebSocket, with a short-lived signed token issued by the panel.
- **`tmate` / `sshx` / `pct exec` / `qm agent`** → run on the host, executed by the daemon, not by the panel.
- **Bcrypt for VPS root password storage** → fine, but stored in Supabase, not "Prisma + Redis 24h plaintext". For "show once" we'll return plaintext in the create response and never store plaintext.

I'll keep the user-facing behavior you described, just wired through this stack.

## Phased delivery

### Phase 1 — RBAC, theme, branding cleanup (small, low risk)
- Hard-block non-admins from `/admin`, `/nodes`, `/logs`, `/vps/new`, `/api-keys` (admin-only) via `beforeLoad` checks.
- Hide those nav items in the sidebar for non-admins.
- Remove "Install on a host" and "Cluster health" cards from the dashboard for normal users (admin-only).
- Rename every `hvm_panel` reference → `tigerhost_panel` in code, seed data, and the logs filter UI.
- Wire the Minecraft animated nature background into `/dashboard` (already exists at `/`, `/login`, `_authenticated`; verify and fix).
- Add password + confirm-password change form on `/profile` using `supabase.auth.updateUser`.

### Phase 2 — Database schema (one Supabase migration)
Add these tables/columns:
- `vps.root_password_hash` (text), `vps.ssh_external_port` (int), `vps.expires_at` (already exists), `vps.suspended_at` (timestamptz), `vps.is_trial` (bool)
- `tmate_sessions` (vps_id, owner_id, ssh_string, web_url, status, expires_at)
- `sshx_sessions` (vps_id, owner_id, session_url, status, expires_at)
- `os_templates` (name unique, label, type, min_disk, min_ram, image_url, icon_url, description, active)
- `trial_settings` (singleton row: enabled, cpu, ram_mb, disk_gb, duration_days)
- `node_metrics` (node_id, cpu, ram_used_mb, ram_total_mb, disk_used_gb, disk_total_gb, ts) — rolling, indexed on (node_id, ts desc)
- RLS: owner-scoped on session tables; admin-only writes on `os_templates` and `trial_settings`; everyone-read on `os_templates` where active.
- Enable Realtime on `node_metrics`, `tmate_sessions`, `sshx_sessions`, `vps`, `panel_logs`.
- Seed the OS template list you provided.

### Phase 3 — OS templates (admin manager + VPS picker)
- `/admin/os-templates`: grid of OS cards, filter tabs, add/edit modal, toggle active, delete-with-usage-check.
- Image source: URL or "None" (file upload to Supabase Storage as a follow-up — Workers can't accept 20GB uploads; ISOs realistically live on the host).
- `/vps/new`: replace OS dropdown with the card grid + min-spec warnings + Linux/Windows tabs. Disabled templates hidden.

### Phase 4 — Root password + SSH Access page
- VPS create form (admin): root password + confirm + "Generate Random". Plaintext returned **once** in the create response and shown in a modal with copy button. Hash stored in `vps.root_password_hash`.
- `/vps/$id/ssh` route with the connection info card (host from node, port from `port_forwards` where internal=22, username=root, masked password reveal).
- "Create SSH Port Forward" button if missing → inserts a port_forward row with internal=22.
- Setup command code block with copy button (the `sshd_config` snippet you provided).
- Change password form → updates hash + returns the `chpasswd` command for the user to run.
- Add `Overview / Console / SSH Access / Port Forwarding / Backups / Settings` tabs on the VPS detail page.

### Phase 5 — Tmate + SSHX session UI + daemon endpoints
- Daemon: add `/ssh/tmate` and `/ssh/sshx` endpoints that `lxc exec <name> -- bash -c '...'` to install + start the tunnel and parse the URL.
- Panel server fns: `generateTmate`, `generateSshx`, `closeTmate`, `closeSshx` — call the node daemon over HTTP with the existing `x-api-key`, persist to Supabase, return session details.
- UI: two cards on the SSH Access page with active-session display, expires-in countdown, regenerate, close.

### Phase 6 — Web console (real commands)
Two-stage delivery:
1. **Phase 6a (now)**: Real command execution via the **daemon's existing `/vps/exec` endpoint** (already implemented in `lxd-daemon.js`). Browser → panel server fn → daemon → `lxc exec <name>`. Output streamed line-by-line into xterm.js, request/response per command. This is real but not interactive (no `vim`, no `top`).
2. **Phase 6b (follow-up)**: Full interactive shell over WebSocket from the browser **directly to the daemon** (panel issues short-lived signed token; daemon upgrades the WS, runs `lxc exec --interactive`, pipes stdio). Skipped in this round unless you confirm — needs a daemon upgrade and a public WebSocket port on every host.

I'll ship 6a now and queue 6b as a follow-up for your approval.

### Phase 7 — Trial system + auto-expiration + Expiring VPS
- Admin "Trial Settings" page: toggle enabled, CPU/RAM/Disk caps, duration days.
- VPS create: when admin creates for a user, "Auto-expire" toggle + days input → sets `expires_at`.
- Normal user create flow: if trial is enabled, lock specs to trial caps and force `expires_at = now + trial.duration_days`.
- Background sweep (cron-style server fn called from a public route or a Supabase scheduled function): mark `expires_at < now` → `status='suspended'`, `suspended_at=now`, send daemon `stop` + log to `panel_logs`.
- Sidebar entry "Expiring VPS" → `/vps/expiring` with two tabs (≤7 days, ≤30 days), shows time remaining + Renew button.
- Renew → opens a confirm modal with new expiry date → extends `expires_at`, sets status back to `running`, daemon `start`.

### Phase 8 — Real-time node monitoring
- Daemon already pushes heartbeats every 15s to `/api/public/agent/heartbeat`. Update it to also insert a row into `node_metrics` and trim to the last 60.
- Insert into `panel_logs` on every heartbeat with the `Node X: CPU ..%, RAM ..%` line so the panel logs feed matches the format you showed.
- Dashboard `LiveMetrics` component subscribes to `node_metrics` via Supabase Realtime, shows live CPU/RAM stat cards + recharts 5-min line graph, and live-updating green progress bars.

## Technical details

- **Stack note repeated**: TanStack Start + Supabase + Cloudflare Workers. Server-side logic = `createServerFn`. Realtime = Supabase Realtime channels. No Prisma, no Redis, no Socket.io.
- **`ssh2` cannot run in Workers.** Browser-direct interactive SSH (Phase 6b) requires the **node daemon** to host the WebSocket; that's a daemon-side change to `public/agent/lxd-daemon.js` and needs a publicly reachable port on each host. I'll ship Phase 6a (real but per-command exec via the existing daemon) now and confirm with you before doing 6b.
- **File upload of 20GB ISOs** through the Worker is not feasible; ISO uploads will be marked "Upload happens on the host — paste a URL or upload via the daemon CLI." I'll keep the URL/None options in the admin UI.
- **Trial cron**: implemented as `/api/public/cron/expire-vps` protected by a shared secret + a scheduled call. You can wire it to Supabase pg_cron or an external cron — I'll make it idempotent.
- **Existing `console.functions.ts` mock** → replaced with real daemon dispatch in Phase 6a.

## What I need from you before I start

1. **OK to proceed phase-by-phase** as listed (Phase 1 → 8), or do you want me to reorder? The most user-visible items are Phases 1, 4, 5, 6a, 8.
2. **Phase 6b (interactive WebSocket SSH from browser → daemon) — yes or no?** It's the only way `vim` / `top` / arrow keys work in the web console. Adds a public WS port on each node.
3. **ISO uploads through the panel** — confirm OK to drop the in-browser upload (URL only / "host upload via CLI"). Otherwise I need to design a Supabase Storage flow that won't fit large ISOs.

Once you confirm, I'll start with Phase 1 (RBAC + theme + branding cleanup) which is the fastest visible improvement, then proceed.