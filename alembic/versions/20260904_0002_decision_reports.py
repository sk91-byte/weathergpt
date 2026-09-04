"""Add decision and citizen-report metadata tables."""

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry
from sqlalchemy.dialects import postgresql


revision = "20260904_0002"
down_revision = "20260903_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weather_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("conversations.id", ondelete="SET NULL")),
        sa.Column("profile_type", sa.String(40), nullable=False, server_default="general_public"),
        sa.Column("risk_score", sa.Integer()),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("confidence_score", sa.Integer()),
        sa.Column("confidence_level", sa.String(20), nullable=False),
        sa.Column("decision_type", sa.String(50), nullable=False),
        sa.Column("source_summary", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_weather_decisions_user_id", "weather_decisions", ["user_id"])
    op.create_index("ix_weather_decisions_conversation_id", "weather_decisions", ["conversation_id"])
    op.create_table(
        "citizen_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("report_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("image_url", sa.String(1000)),
        sa.Column("status", sa.String(30), nullable=False, server_default="unverified"),
        sa.Column("confidence", sa.Float()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("geometry", Geometry("POINT", srid=4326)),
    )
    op.create_index("ix_citizen_reports_user_id", "citizen_reports", ["user_id"])
    op.create_index("ix_citizen_reports_geometry", "citizen_reports", ["geometry"], postgresql_using="gist")


def downgrade() -> None:
    op.drop_table("citizen_reports")
    op.drop_table("weather_decisions")
