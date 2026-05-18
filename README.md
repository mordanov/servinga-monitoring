# Servinga VPS Dashboard

Self-hosted monitoring dashboard for Servinga Cloud VPS servers. Metrics via **node_exporter + Prometheus**, history in SQLite, React UI.

```
Stack: React + Vite · FastAPI · Prometheus · SQLite · Docker Compose
```

```
[VPS #1] :9100 ─┐
[VPS #2] :9100 ─┼──► Prometheus ──► FastAPI ──► React UI :3000
[VPS #N] :9100 ─┘                       │
                                      SQLite (7d)
```

## Setup

**1. Install node_exporter on each VPS**

```bash
scp install-node-exporter.sh user@YOUR_VPS_IP:~
ssh user@YOUR_VPS_IP bash install-node-exporter.sh
```

**2. Add VPS IPs to `prometheus/prometheus.yml`**

```yaml
static_configs:
  - targets:
      - "1.2.3.4:9100"
      - "5.6.7.8:9100"
```

Update `relabel_configs` to assign friendly server names.

**3. Start**

```bash
docker compose up -d
# open http://localhost:3000
```

## Ports

| Service    | Port | Notes               |
|------------|------|---------------------|
| Frontend   | 3000 | React dashboard     |
| Backend    | 8000 | FastAPI (`/api`)    |
| Prometheus | 9090 | Optional direct UI  |

## API

| Endpoint                              | Description                         |
|---------------------------------------|-------------------------------------|
| `GET /api/health`                     | Health check                        |
| `GET /api/servers`                    | All servers + latest snapshot       |
| `GET /api/stats/{instance}?period=1h` | Time-series (`1h` `6h` `24h` `7d`) |

## Notes

- Metrics collected every 30 s — change in `main.py` and `prometheus.yml`
- Data retention: 7 days — edit `_prune_old_snapshots()` in `collectors/prometheus.py`
- Reload Prometheus config live: `curl -X POST http://localhost:9090/-/reload`
- Firewall: restrict port 9100 on each VPS to your dashboard IP only

## Dev (no Docker)

```bash
# backend
cd backend && pip install -r requirements.txt
PROMETHEUS_URL=http://localhost:9090 uvicorn main:app --reload

# frontend
cd frontend && npm install && npm run dev
```
