"""Initial WeatherGPT PostgreSQL/PostGIS platform schema."""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql

revision = "20260903_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table("users", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("name", sa.String(120)), sa.Column("email", sa.String(320), unique=True), sa.Column("preferred_language", sa.String(12), nullable=False, server_default="en"), sa.Column("timezone", sa.String(80)), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table("conversations", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("title", sa.String(200)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("last_message_at", sa.DateTime(timezone=True)), sa.Column("state", postgresql.JSONB(), nullable=False, server_default="{}"))
    op.create_table("messages", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False), sa.Column("role", sa.String(16), nullable=False), sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("metadata_json", postgresql.JSONB(), nullable=False, server_default="{}"))
    op.create_table("user_preferences", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False), sa.Column("language", sa.String(12), nullable=False, server_default="en"), sa.Column("temperature_unit", sa.String(4), nullable=False, server_default="celsius"), sa.Column("wind_unit", sa.String(8), nullable=False, server_default="kmh"), sa.Column("default_latitude", sa.Float()), sa.Column("default_longitude", sa.Float()), sa.Column("default_location_name", sa.String(200)), sa.Column("notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("locations", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(200), nullable=False), sa.Column("country", sa.String(100)), sa.Column("state", sa.String(100)), sa.Column("district", sa.String(100)), sa.Column("city", sa.String(100)), sa.Column("locality", sa.String(200)), sa.Column("postal_code", sa.String(20)), sa.Column("latitude", sa.Float(), nullable=False), sa.Column("longitude", sa.Float(), nullable=False), sa.Column("timezone", sa.String(80)), sa.Column("elevation", sa.Float()), sa.Column("geometry", Geometry("POINT", srid=4326)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("alerts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("external_id", sa.String(200), nullable=False), sa.Column("source", sa.String(120), nullable=False), sa.Column("alert_type", sa.String(80), nullable=False), sa.Column("severity", sa.String(40), nullable=False), sa.Column("title", sa.String(300), nullable=False), sa.Column("description", sa.Text(), nullable=False), sa.Column("affected_area", sa.String(300)), sa.Column("start_time", sa.DateTime(timezone=True), nullable=False), sa.Column("end_time", sa.DateTime(timezone=True), nullable=False), sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False), sa.Column("source_url", sa.String(1000)), sa.Column("geometry", Geometry("POLYGON", srid=4326)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False), sa.Column("is_test", sa.Boolean(), nullable=False, server_default=sa.false(),), sa.UniqueConstraint("external_id", "source", name="uq_alert_external_source"))
    op.create_table("data_sources", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), unique=True, nullable=False), sa.Column("provider_type", sa.String(80), nullable=False), sa.Column("base_url", sa.String(1000)), sa.Column("description", sa.Text()), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))
    for table, column in (("conversations", "user_id"), ("conversations", "updated_at"), ("messages", "conversation_id"), ("messages", "created_at"), ("locations", "name")):
        op.create_index(f"ix_{table}_{column}", table, [column])
    op.create_index("ix_locations_geometry", "locations", ["geometry"], postgresql_using="gist")
    op.create_index("ix_alerts_geometry", "alerts", ["geometry"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_table("data_sources")
    op.drop_table("alerts")
    op.drop_table("locations")
    op.drop_table("user_preferences")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("users")
