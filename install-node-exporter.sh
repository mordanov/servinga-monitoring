#!/bin/bash
# install-node-exporter.sh
# Run this script on each Servinga VPS you want to monitor.
# Usage: bash install-node-exporter.sh
# Tested on Ubuntu 20.04/22.04/24.04

set -euo pipefail

VERSION="1.7.0"
ARCH="amd64"
USER="node_exporter"
DOWNLOAD_URL="https://github.com/prometheus/node_exporter/releases/download/v${VERSION}/node_exporter-${VERSION}.linux-${ARCH}.tar.gz"

echo "==> Installing node_exporter v${VERSION} on $(hostname)"

# Download and install
cd /tmp
curl -fsSL "$DOWNLOAD_URL" -o node_exporter.tar.gz
tar xzf node_exporter.tar.gz
sudo mv "node_exporter-${VERSION}.linux-${ARCH}/node_exporter" /usr/local/bin/
rm -rf "node_exporter-${VERSION}.linux-${ARCH}" node_exporter.tar.gz

# Create system user
if ! id "$USER" &>/dev/null; then
  sudo useradd -rs /bin/false "$USER"
fi

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=${USER}
ExecStart=/usr/local/bin/node_exporter
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

echo ""
echo "==> node_exporter is running on port 9100"
echo "==> Verify: curl http://localhost:9100/metrics | head -5"
echo ""

# UFW firewall rule (optional — restrict to your dashboard server IP)
read -p "Enter your dashboard server IP to allow through firewall (or press Enter to skip): " DASHBOARD_IP
if [[ -n "$DASHBOARD_IP" ]]; then
  sudo ufw allow from "$DASHBOARD_IP" to any port 9100 comment "Prometheus node_exporter"
  echo "==> Firewall rule added for $DASHBOARD_IP"
else
  echo "==> Skipping firewall rule. You can add it later:"
  echo "    ufw allow from YOUR_DASHBOARD_IP to any port 9100"
fi

echo ""
echo "==> Done! Add this server to prometheus/prometheus.yml:"
echo "    - $(hostname -I | awk '{print $1}'):9100"
