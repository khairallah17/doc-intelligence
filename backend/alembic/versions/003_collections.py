"""Add collections table and collection_id FK on documents.

Revision ID: 003
Revises: 002
Create Date: 2026-06-22
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "collections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_collections_user_id", "collections", ["user_id"])

    op.add_column(
        "documents",
        sa.Column(
            "collection_id",
            UUID(as_uuid=True),
            sa.ForeignKey("collections.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_documents_collection_id", "documents", ["collection_id"])


def downgrade() -> None:
    op.drop_index("ix_documents_collection_id", "documents")
    op.drop_column("documents", "collection_id")
    op.drop_index("ix_collections_user_id", "collections")
    op.drop_table("collections")
