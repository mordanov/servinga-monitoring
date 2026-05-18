from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from db import get_session, MetricSnapshot
from typing import Optional

router = APIRouter()


def _fmt(instance: str, server_name: Optional[str]) -> dict:
    label = server_name if server_name else instance.split(":")[0]
    return {"instance": instance, "server_name": label}


@router.get("/servers")
async def list_servers(session: AsyncSession = Depends(get_session)):
    """Return all unique instances seen, with their latest snapshot."""
    # Get the most recent snapshot per instance
    subq = (
        select(
            MetricSnapshot.instance,
            func.max(MetricSnapshot.timestamp).label("latest_ts"),
        )
        .group_by(MetricSnapshot.instance)
        .subquery()
    )

    stmt = select(MetricSnapshot).join(
        subq,
        (MetricSnapshot.instance == subq.c.instance)
        & (MetricSnapshot.timestamp == subq.c.latest_ts),
    )

    result = await session.execute(stmt)
    rows = result.scalars().all()

    servers = []
    for row in rows:
        age_seconds = None
        from datetime import datetime, timezone
        if row.timestamp:
            ts = row.timestamp
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()

        servers.append({
            "instance": row.instance,
            "server_name": row.server_name or row.instance.split(":")[0],
            "last_seen": row.timestamp.isoformat() if row.timestamp else None,
            "age_seconds": age_seconds,
            "online": age_seconds is not None and age_seconds < 120,
            "latest": {
                "cpu_usage_pct": row.cpu_usage_pct,
                "mem_used_pct": row.mem_used_pct,
                "mem_total_bytes": row.mem_total_bytes,
                "mem_available_bytes": row.mem_available_bytes,
                "disk_read_bytes_sec": row.disk_read_bytes_sec,
                "disk_write_bytes_sec": row.disk_write_bytes_sec,
                "net_rx_bytes_sec": row.net_rx_bytes_sec,
                "net_tx_bytes_sec": row.net_tx_bytes_sec,
                "uptime_seconds": row.uptime_seconds,
                "load1": row.load1,
                "load5": row.load5,
                "load15": row.load15,
            },
        })

    return {"servers": servers, "count": len(servers)}
