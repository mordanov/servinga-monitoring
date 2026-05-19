"""
Prometheus metrics collector.
Queries Prometheus (which scrapes node_exporter on each VPS) and
writes MetricSnapshot rows to SQLite.
"""
import os
import logging
import socket
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from db import AsyncSessionLocal, MetricSnapshot

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090").rstrip("/")
PROMETHEUS_FALLBACK_URLS = tuple(
    url.strip().rstrip("/")
    for url in os.getenv("PROMETHEUS_FALLBACK_URLS", "http://host.docker.internal:9090,http://gateway.docker.internal:9090")
    .split(",")
    if url.strip()
)
logger = logging.getLogger(__name__)


def _docker_gateway_url() -> str | None:
    """Return the container's default gateway as a Prometheus URL when available."""
    try:
        with open("/proc/net/route", "r", encoding="utf-8") as route_file:
            next(route_file, None)
            for line in route_file:
                fields = line.strip().split()
                if len(fields) < 4 or fields[1] != "00000000":
                    continue
                gateway_hex = fields[2]
                gateway_ip = socket.inet_ntoa(bytes.fromhex(gateway_hex)[::-1])
                if gateway_ip and gateway_ip != "0.0.0.0":
                    return f"http://{gateway_ip}:9090"
    except OSError:
        return None
    return None


def _candidate_prometheus_urls() -> tuple[str, ...]:
    urls: list[str] = []
    dynamic_gateway_url = _docker_gateway_url()
    for url in (PROMETHEUS_URL, dynamic_gateway_url, *PROMETHEUS_FALLBACK_URLS):
        if url and url not in urls:
            urls.append(url)
    return tuple(urls)


async def _prometheus_get(path: str, params: dict[str, str], timeout: int) -> dict | None:
    failures: list[str] = []
    for base_url in _candidate_prometheus_urls():
        url = f"{base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=timeout, trust_env=False, follow_redirects=True) as client:
                resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") == "success":
                return data
            failures.append(f"{url} -> non-success response: {data}")
        except Exception as exc:
            failures.append(f"{url} -> {exc!r}")

    if failures:
        logger.warning(
            "Prometheus request failed for %s on all candidate URLs: %s",
            params.get("query", path),
            "; ".join(failures),
        )
    return None


async def promql(query: str) -> list[dict]:
    """Run an instant PromQL query, return list of {metric, value} dicts."""
    data = await _prometheus_get("/api/v1/query", {"query": query}, timeout=10)
    if data:
        return data["data"]["result"]
    return []


async def promql_range(query: str, start: str, end: str, step: str = "60s") -> list[dict]:
    """Run a range PromQL query."""
    data = await _prometheus_get(
        "/api/v1/query_range",
        {"query": query, "start": start, "end": end, "step": step},
        timeout=15,
    )
    if data:
        return data["data"]["result"]
    return []


def _index_by_instance(results: list[dict], label: str = "instance") -> dict[str, float]:
    """Build {instance -> float_value} mapping from instant query results."""
    out = {}
    for r in results:
        inst = r["metric"].get(label, r["metric"].get("instance", "unknown"))
        try:
            out[inst] = float(r["value"][1])
        except (IndexError, ValueError):
            pass
    return out


async def collect_and_store_all():
    """Main collection job: run PromQL queries and store a snapshot per instance."""
    logger.info("Collecting metrics from Prometheus…")

    # ── CPU ──────────────────────────────────────────────────────────────────
    # 100 - idle% gives overall CPU usage
    cpu_results = await promql(
        '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[2m])) * 100)'
    )
    cpu_map = _index_by_instance(cpu_results)

    # ── Memory ───────────────────────────────────────────────────────────────
    mem_total_results = await promql("node_memory_MemTotal_bytes")
    mem_total_map = _index_by_instance(mem_total_results)

    mem_avail_results = await promql("node_memory_MemAvailable_bytes")
    mem_avail_map = _index_by_instance(mem_avail_results)

    # ── Disk I/O ─────────────────────────────────────────────────────────────
    disk_read_results = await promql(
        'sum by (instance) (rate(node_disk_read_bytes_total{device!~"sr.*|loop.*"}[2m]))'
    )
    disk_read_map = _index_by_instance(disk_read_results)

    disk_write_results = await promql(
        'sum by (instance) (rate(node_disk_written_bytes_total{device!~"sr.*|loop.*"}[2m]))'
    )
    disk_write_map = _index_by_instance(disk_write_results)

    # ── Network ──────────────────────────────────────────────────────────────
    net_rx_results = await promql(
        'sum by (instance) (rate(node_network_receive_bytes_total{device!="lo"}[2m]))'
    )
    net_rx_map = _index_by_instance(net_rx_results)

    net_tx_results = await promql(
        'sum by (instance) (rate(node_network_transmit_bytes_total{device!="lo"}[2m]))'
    )
    net_tx_map = _index_by_instance(net_tx_results)

    # ── Load ─────────────────────────────────────────────────────────────────
    load1_map  = _index_by_instance(await promql("node_load1"))
    load5_map  = _index_by_instance(await promql("node_load5"))
    load15_map = _index_by_instance(await promql("node_load15"))

    # ── Uptime ───────────────────────────────────────────────────────────────
    uptime_map = _index_by_instance(await promql("time() - node_boot_time_seconds"))

    # ── Server names (from relabel) ───────────────────────────────────────────
    # node_uname_info carries the instance label; server_name comes from our relabel
    name_results = await promql("node_uname_info")
    name_map: dict[str, str] = {}
    for r in name_results:
        inst = r["metric"].get("instance", "")
        name = r["metric"].get("server_name", "")
        if inst:
            name_map[inst] = name

    # ── Collect all known instances ───────────────────────────────────────────
    all_instances = set(cpu_map) | set(mem_total_map) | set(net_rx_map)
    if not all_instances:
        logger.warning("No instances found — check Prometheus targets and node_exporter setup.")
        return

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        for inst in all_instances:
            mem_total = mem_total_map.get(inst)
            mem_avail = mem_avail_map.get(inst)
            if mem_total and mem_avail and mem_total > 0:
                mem_used_pct = (1 - mem_avail / mem_total) * 100
            else:
                mem_used_pct = None

            snapshot = MetricSnapshot(
                instance=inst,
                server_name=name_map.get(inst, ""),
                timestamp=now,
                cpu_usage_pct=cpu_map.get(inst),
                mem_total_bytes=mem_total,
                mem_available_bytes=mem_avail,
                mem_used_pct=mem_used_pct,
                disk_read_bytes_sec=disk_read_map.get(inst),
                disk_write_bytes_sec=disk_write_map.get(inst),
                net_rx_bytes_sec=net_rx_map.get(inst),
                net_tx_bytes_sec=net_tx_map.get(inst),
                uptime_seconds=uptime_map.get(inst),
                load1=load1_map.get(inst),
                load5=load5_map.get(inst),
                load15=load15_map.get(inst),
            )
            session.add(snapshot)

        await session.commit()
        logger.info("Stored %d snapshot(s) at %s", len(all_instances), now.isoformat())

    # Prune snapshots older than 7 days to keep the DB small
    await _prune_old_snapshots()


async def _prune_old_snapshots():
    from datetime import timedelta
    from sqlalchemy import delete
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(MetricSnapshot).where(MetricSnapshot.timestamp < cutoff)
        )
        await session.commit()
