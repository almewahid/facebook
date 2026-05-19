"""saas auth subscriptions user isolation

Revision ID: 8b1c2d3e4f5a
Revises: 50aa0fd31aaa
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8b1c2d3e4f5a"
down_revision: Union[str, Sequence[str], None] = "50aa0fd31aaa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_user_id(table_name: str, nullable: bool = True) -> None:
    with op.batch_alter_table(table_name) as batch:
        batch.add_column(sa.Column("user_id", sa.Integer(), nullable=nullable))
        batch.create_index(f"ix_{table_name}_user_id", ["user_id"])
        batch.create_foreign_key(f"fk_{table_name}_user_id_users", "users", ["user_id"], ["id"])


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("plan", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("payment_reference", sa.String(), nullable=True),
        sa.Column("provider", sa.String(), nullable=True),
        sa.Column("provider_customer_id", sa.String(), nullable=True),
        sa.Column("provider_subscription_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])
    op.create_index("ix_subscriptions_plan", "subscriptions", ["plan"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("subscription_id", sa.Integer(), nullable=True),
        sa.Column("plan", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("payment_reference", sa.String(), nullable=True),
        sa.Column("proof_url", sa.String(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(), nullable=True),
        sa.Column("provider", sa.String(), nullable=True),
        sa.Column("provider_payment_id", sa.String(), nullable=True),
        sa.Column("raw_payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_subscription_id", "payments", ["subscription_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_plan", "payments", ["plan"])

    for table_name in ["groups", "posts", "publish_posts", "campaigns", "schedules", "bot_logs", "bot_configs", "ai_insights"]:
        _add_user_id(table_name)

    op.execute("DROP INDEX IF EXISTS ix_bot_configs_key")
    op.create_unique_constraint("uq_bot_configs_user_key", "bot_configs", ["user_id", "key"])


def downgrade() -> None:
    op.drop_constraint("uq_bot_configs_user_key", "bot_configs", type_="unique")
    op.create_index("ix_bot_configs_key", "bot_configs", ["key"], unique=True)

    for table_name in ["ai_insights", "bot_configs", "bot_logs", "schedules", "campaigns", "publish_posts", "posts", "groups"]:
        with op.batch_alter_table(table_name) as batch:
            batch.drop_constraint(f"fk_{table_name}_user_id_users", type_="foreignkey")
            batch.drop_index(f"ix_{table_name}_user_id")
            batch.drop_column("user_id")

    op.drop_index("ix_payments_plan", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_subscription_id", table_name="payments")
    op.drop_index("ix_payments_user_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_subscriptions_plan", table_name="subscriptions")
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
