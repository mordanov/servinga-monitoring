from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy import Float, String, DateTime, Integer
from datetime import datetime, timezone
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/servinga.db")
# Ensure SQLite async driver prefix
if DATABASE_URL.startswith("sqlite:///"):
    DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance: Mapped[str] = mapped_column(String, index=True)       # e.g. "1.2.3.4:9100"
    server_name: Mapped[str] = mapped_column(String, nullable=True) # e.g. "vps-01"
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # CPU
    cpu_usage_pct: Mapped[float] = mapped_column(Float, nullable=True)

    # Memory
    mem_total_bytes: Mapped[float] = mapped_column(Float, nullable=True)
    mem_available_bytes: Mapped[float] = mapped_column(Float, nullable=True)
    mem_used_pct: Mapped[float] = mapped_column(Float, nullable=True)

    # Disk I/O (bytes/sec, averaged across all disks)
    disk_read_bytes_sec: Mapped[float] = mapped_column(Float, nullable=True)
    disk_write_bytes_sec: Mapped[float] = mapped_column(Float, nullable=True)

    # Network (bytes/sec, summed across all interfaces excl. lo)
    net_rx_bytes_sec: Mapped[float] = mapped_column(Float, nullable=True)
    net_tx_bytes_sec: Mapped[float] = mapped_column(Float, nullable=True)

    # System info (refreshed periodically)
    uptime_seconds: Mapped[float] = mapped_column(Float, nullable=True)
    load1: Mapped[float] = mapped_column(Float, nullable=True)
    load5: Mapped[float] = mapped_column(Float, nullable=True)
    load15: Mapped[float] = mapped_column(Float, nullable=True)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
