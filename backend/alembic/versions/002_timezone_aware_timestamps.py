"""Convert all timestamp columns to TIMESTAMPTZ.

Revision ID: 002
Revises: 001
Create Date: 2026-06-22
"""

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE users ALTER COLUMN created_at "
        "TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE documents ALTER COLUMN created_at "
        "TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE documents ALTER COLUMN processed_at "
        "TYPE TIMESTAMP WITH TIME ZONE USING processed_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE chat_sessions ALTER COLUMN created_at "
        "TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'"
    )
    op.execute(
        "ALTER TABLE messages ALTER COLUMN created_at "
        "TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC'"
    )


def downgrade() -> None:
    for table, col in [
        ("users", "created_at"),
        ("documents", "created_at"),
        ("documents", "processed_at"),
        ("chat_sessions", "created_at"),
        ("messages", "created_at"),
    ]:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN {col} "
            f"TYPE TIMESTAMP WITHOUT TIME ZONE USING {col} AT TIME ZONE 'UTC'"
        )
