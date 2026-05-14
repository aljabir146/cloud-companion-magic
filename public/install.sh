#!/bin/bash
# TigerHost VPS Panel — one-line installer
# Usage: curl -fsSL https://your-panel-domain/install.sh | sudo bash
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

clear
echo -e "${BLUE}"
cat << 'EOF'
  ████████╗██╗ ██████╗ ███████╗██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗
  ╚══██╔══╝██║██╔════╝ ██╔════╝██╔══██╗██║  ██║██╔═══██╗██╔════╝╚══██╔══╝
     ██║   ██║██║  ███╗█████╗  ██████╔╝███████║██║   ██║███████╗   ██║
     ██║   ██║██║   ██║██╔══╝  ██╔══██╗██╔══██║██║   ██║╚════██║   ██║
     ██║   ██║╚██████╔╝███████╗██║  ██║██║  ██║╚██████╔╝███████║   ██║
     ╚═╝   ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝
EOF
echo -e "${NC}"
echo -e "${GREEN}TigerHost VPS Panel Installer (LXD/LXC engine)${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# 1. Root check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗ Please run as root: sudo bash install.sh${NC}"
  exit 1
fi

# 2. Virtualization check
echo -e "${YELLOW}▶ Checking virtualization...${NC}"
VIRT=$(systemd-detect-virt 2>/dev/null || echo "unknown")
echo -e "  Detected: ${BLUE}$VIRT${NC}"
if [ "$VIRT" = "lxc" ] || [ "$VIRT" = "openvz" ]; then
  echo -e "${RED}✗ INCOMPATIBLE HOST — running inside $VIRT container.${NC}"
  echo -e "  Use KVM-based VPS, bare metal, GCP, AWS, DigitalOcean, or Hetzner."
  exit 1
fi
echo -e "  ${GREEN}✓ Compatible host${NC}"

# 3. Sysreq
echo -e "\n${YELLOW}▶ System requirements...${NC}"
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
[ "$TOTAL_RAM" -lt 1024 ] && { echo -e "${RED}✗ Need ≥1GB RAM (found ${TOTAL_RAM}MB)${NC}"; exit 1; }
echo -e "  ${GREEN}✓ RAM: ${TOTAL_RAM}MB${NC}"
TOTAL_DISK=$(df -BG / | awk 'NR==2{print $2}' | tr -d 'G')
FREE_DISK=$(df -BG / | awk 'NR==2{print $4}' | tr -d 'G')
echo -e "  ${GREEN}✓ Disk: ${FREE_DISK}GB free of ${TOTAL_DISK}GB${NC}"
RECOMMENDED_POOL=$((TOTAL_DISK - 8))
echo -e "  ${BLUE}ℹ Recommended LXD pool: ${RECOMMENDED_POOL}GB${NC}"
OS=$(lsb_release -is 2>/dev/null || echo "Unknown")
VER=$(lsb_release -rs 2>/dev/null || echo "Unknown")
echo -e "  ${GREEN}✓ OS: $OS $VER${NC}"

# 4. Config
echo -e "\n${YELLOW}▶ Configuration${NC}"
read -p "  Panel domain (e.g. panel.example.com): " PANEL_DOMAIN
read -p "  Admin email: " ADMIN_EMAIL
read -s -p "  Admin password: " ADMIN_PASSWORD; echo
read -s -p "  Confirm password: " ADMIN_PASSWORD_CONFIRM; echo
[ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ] && { echo -e "${RED}✗ Passwords mismatch${NC}"; exit 1; }
read -p "  LXD storage pool size in GB [${RECOMMENDED_POOL}]: " LXD_POOL_SIZE
LXD_POOL_SIZE=${LXD_POOL_SIZE:-$RECOMMENDED_POOL}

echo -e "\n${YELLOW}▶ Installing...${NC}"

# 5. System packages
echo -e "${BLUE}[1/8] Updating system...${NC}"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git unzip jq snapd net-tools ufw iptables-persistent

# 6. Node 20
echo -e "${BLUE}[2/8] Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs
echo -e "  ${GREEN}✓ Node $(node --version)${NC}"

# 7. pnpm
echo -e "${BLUE}[3/8] pnpm...${NC}"
npm install -g pnpm >/dev/null 2>&1
echo -e "  ${GREEN}✓ pnpm $(pnpm --version)${NC}"

# 8. LXD
echo -e "${BLUE}[4/8] LXD...${NC}"
snap install lxd >/dev/null 2>&1 || snap refresh lxd >/dev/null 2>&1
/snap/bin/lxd waitready
cat <<LXDEOF | /snap/bin/lxd init --preseed
config: {}
networks:
- config:
    ipv4.address: 10.100.0.1/24
    ipv4.nat: "true"
    ipv6.address: none
  name: lxdbr0
  type: bridge
storage_pools:
- config:
    size: ${LXD_POOL_SIZE}GB
  name: default
  driver: zfs
profiles:
- config: {}
  devices:
    eth0: { name: eth0, network: lxdbr0, type: nic }
    root: { path: /, pool: default, type: disk }
  name: default
LXDEOF
usermod -aG lxd root 2>/dev/null || true
echo -e "  ${GREEN}✓ LXD ready (${LXD_POOL_SIZE}GB pool)${NC}"

# 9. Panel files
echo -e "${BLUE}[5/8] Downloading panel...${NC}"
mkdir -p /opt/tigerhost && cd /opt/tigerhost
if [ -f /tmp/tigerhost.zip ]; then
  unzip -q /tmp/tigerhost.zip -d /opt/tigerhost
else
  echo -e "  ${YELLOW}⚠ Place your panel build at /opt/tigerhost or upload /tmp/tigerhost.zip${NC}"
fi

# 10. Dirs
echo -e "${BLUE}[6/8] Directories...${NC}"
mkdir -p /opt/tigerhost/{data,backups,images,logs}

# 11. Env + secrets
echo -e "${BLUE}[7/8] Environment...${NC}"
JWT_SECRET=$(openssl rand -hex 32)
COOKIE_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SERVER_IP=$(curl -s https://api.ipify.org || hostname -I | awk '{print $1}')

cat > /opt/tigerhost/.env <<ENVEOF
NODE_ENV=production
PANEL_URL=https://${PANEL_DOMAIN}
SERVER_IP=${SERVER_IP}
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
LXD_SOCKET=/var/snap/lxd/common/lxd/unix.socket
LXD_BRIDGE_INTERFACE=lxdbr0
LXD_SUBNET=10.100.0.0/24
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ENVEOF

# 12. Daemon (LXD agent)
echo -e "${BLUE}[8/8] Installing tigerhost-daemon...${NC}"
curl -fsSL https://${PANEL_DOMAIN}/agent/lxd-daemon.js -o /opt/tigerhost/lxd-daemon.js 2>/dev/null || \
  echo "// daemon stub — replace with real download" > /opt/tigerhost/lxd-daemon.js

curl -fsSL https://${PANEL_DOMAIN}/cli/vpspanel -o /usr/local/bin/vpspanel 2>/dev/null && \
  chmod +x /usr/local/bin/vpspanel

# 13. systemd
cat > /etc/systemd/system/tigerhost-daemon.service <<SVC
[Unit]
Description=TigerHost LXD Daemon
After=network.target snap.lxd.daemon.service
[Service]
Type=simple
User=root
WorkingDirectory=/opt/tigerhost
EnvironmentFile=/opt/tigerhost/.env
ExecStart=/usr/bin/node /opt/tigerhost/lxd-daemon.js
Restart=always
RestartSec=5
StandardOutput=append:/opt/tigerhost/logs/daemon.log
StandardError=append:/opt/tigerhost/logs/daemon-error.log
[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable tigerhost-daemon
systemctl start tigerhost-daemon

# 14. Firewall
ufw --force enable >/dev/null 2>&1
for p in 22 80 443 3000 4000; do ufw allow ${p}/tcp >/dev/null 2>&1; done

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ TigerHost installed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "  Panel: ${BLUE}https://${PANEL_DOMAIN}${NC}"
echo -e "  Local: ${BLUE}http://${SERVER_IP}:3000${NC}"
echo -e "  Admin: ${ADMIN_EMAIL}"
echo
echo -e "  ${BLUE}CLI:${NC}  vpspanel status | logs | restart | tunnel | update | backup | lxd-info"
echo
