from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db import get_session, MetricSnapshot
from datetime import datetime, timezone, timedelta
from urllib.parse import unquote

router = APIRouter()

PERIOD_MAP = {
    "1h":  timedelta(hours=1),
    "6h":  timedelta(hours=6),
    "24h": timedelta(hours=24),
    "7d":  timedelta(days=7),
}


@router.get("/stats/{instance:path}")
async def get_stats(
    instance: str,
    period: str = Query("1h", regex="^(1h|6h|24h|7d)$"),
    session: AsyncSession = Depends(get_session),
):
    """
    Return time-series snapshots for one server.
    `instance` is the Prometheus instance label, e.g. 1.2.3.4:9100
    """
    instance = unquote(instance)
    delta = PERIOD_MAP[period]
    since = datetime.now(timezone.utc) - delta

    stmt = (
        select(MetricSnapshot)
        .where(
            MetricSnapshot.instance == instance,
            MetricSnapshot.timestamp >= since,
        )
        .order_by(MetricSnapshot.timestamp.asc())
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()

    if not rows:
        # Check if instance exists at all
        any_stmt = select(MetricSnapshot).where(MetricSnapshot.instance == instance).limit(1)
        any_result = await session.execute(any_stmt)
        if not any_result.scalars().first():
            raise HTTPException(status_code=404, detail=f"Instance '{instance}' not found.")

    series = []
    for row in rows:
        ts = row.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        series.append({
            "timestamp": ts.isoformat(),
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
        })

    return {
        "instance": instance,
        "period": period,
        "points": len(series),
        "series": series,
    }
