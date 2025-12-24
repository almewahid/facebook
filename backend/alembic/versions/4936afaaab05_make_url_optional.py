"""make_url_optional

Revision ID: 4936afaaab05
Revises: ec5b7b9c76ee
Create Date: 2025-12-21 14:37:04.372374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4936afaaab05'
down_revision: Union[str, Sequence[str], None] = 'ec5b7b9c76ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
