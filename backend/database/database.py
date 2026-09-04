"""Async SQLAlchemy engine and session dependency.

No engine is created when DATABASE_URL is absent, so local development remains
fully functional without PostgreSQL.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.config import settings


engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=10,
) if settings.database_url else None
SessionFactory = async_sessionmaker(engine, expire_on_commit=False) if engine else None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    if SessionFactory is None:
        raise RuntimeError("DATABASE_URL is not configured")
    async with SessionFactory() as session:
        yield session


async def check_database() -> str:
    if engine is None:
        return "not_configured"
    try:
        async with engine.connect() as connection:
            await connection.exec_driver_sql("SELECT 1")
        return "connected"
    except Exception:
        return "unavailable"
