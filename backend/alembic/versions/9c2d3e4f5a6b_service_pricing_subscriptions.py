"""service pricing subscriptions

Revision ID: 9c2d3e4f5a6b
Revises: 8b1c2d3e4f5a
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "9c2d3e4f5a6b"
down_revision = "8b1c2d3e4f5a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("subscriptions", sa.Column("service_key", sa.String(), server_default="new_post", nullable=True))
    op.add_column("subscriptions", sa.Column("service_name", sa.String(), nullable=True))
    op.add_column("subscriptions", sa.Column("amount_cents", sa.Integer(), nullable=True))
    op.add_column("subscriptions", sa.Column("currency", sa.String(), server_default="USD", nullable=True))
    op.add_column("payments", sa.Column("service_key", sa.String(), server_default="new_post", nullable=True))
    op.add_column("payments", sa.Column("service_name", sa.String(), nullable=True))


def downgrade():
    op.drop_column("payments", "service_name")
    op.drop_column("payments", "service_key")
    op.drop_column("subscriptions", "currency")
    op.drop_column("subscriptions", "amount_cents")
    op.drop_column("subscriptions", "service_name")
    op.drop_column("subscriptions", "service_key")
