"""add post_method to campaigns and publish_posts

Revision ID: ebacbf038820
Revises: 50aa0fd31aaa
Create Date: 2026-05-11 19:42:27.011234

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ebacbf038820'
down_revision: Union[str, Sequence[str], None] = '50aa0fd31aaa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
