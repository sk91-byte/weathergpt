"""Parameterized PostGIS location queries."""

from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import Location


async def search_location(session: AsyncSession, text: str, limit: int = 10) -> list[Location]:
    pattern = f"%{text.strip()}%"
    result = await session.execute(select(Location).where(Location.name.ilike(pattern)).limit(limit))
    return list(result.scalars())


async def get_location_by_id(session: AsyncSession, location_id: int) -> Location | None:
    return await session.get(Location, location_id)


async def create_location(session: AsyncSession, **values: object) -> Location:
    location = Location(**values)
    session.add(location)
    await session.commit()
    await session.refresh(location)
    return location


async def find_nearby_locations(session: AsyncSession, latitude: float, longitude: float, radius_km: float = 25, limit: int = 20) -> list[Location]:
    point = cast(func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326), Geography("POINT", srid=4326))
    geographic_location = cast(Location.geometry, Geography("POINT", srid=4326))
    distance = func.ST_Distance(geographic_location, point)
    result = await session.execute(select(Location).where(func.ST_DWithin(geographic_location, point, radius_km * 1000)).order_by(distance).limit(limit))
    return list(result.scalars())
