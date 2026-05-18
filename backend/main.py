from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from db import init_db
from routes import servers, stats, health
from collectors.prometheus import collect_and_store_all

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    # Collect immediately on startup, then every 30 seconds
    await collect_and_store_all()
    scheduler.add_job(collect_and_store_all, "interval", seconds=30, id="collect_metrics")
    scheduler.start()

    yield

    scheduler.shutdown()


app = FastAPI(
    title="Servinga Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(servers.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
