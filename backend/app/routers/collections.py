"""Collections router: CRUD for document groups."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.database import get_db
from app.db.models import Collection, Document, User
from app.schemas.collections import (
    AssignCollectionRequest,
    CollectionResponse,
    CreateCollectionRequest,
    RenameCollectionRequest,
)

router = APIRouter()


def _to_response(collection: Collection, count: int) -> CollectionResponse:
    return CollectionResponse(
        id=collection.id,
        name=collection.name,
        created_at=collection.created_at,
        document_count=count,
    )


@router.post(
    "",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a collection",
)
async def create_collection(
    body: CreateCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionResponse:
    collection = Collection(user_id=current_user.id, name=body.name)
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    return _to_response(collection, 0)


@router.get(
    "",
    response_model=list[CollectionResponse],
    summary="List collections",
)
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CollectionResponse]:
    result = await db.execute(
        select(Collection, func.count(Document.id).label("doc_count"))
        .outerjoin(Document, Document.collection_id == Collection.id)
        .where(Collection.user_id == current_user.id)
        .group_by(Collection.id)
        .order_by(Collection.created_at.desc())
    )
    rows = result.all()
    return [_to_response(col, count) for col, count in rows]


@router.patch(
    "/{collection_id}",
    response_model=CollectionResponse,
    summary="Rename a collection",
)
async def rename_collection(
    collection_id: uuid.UUID,
    body: RenameCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CollectionResponse:
    collection: Collection | None = await db.get(Collection, collection_id)
    if collection is None or collection.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    collection.name = body.name
    await db.commit()
    await db.refresh(collection)
    count_result = await db.execute(
        select(func.count(Document.id)).where(Document.collection_id == collection_id)
    )
    return _to_response(collection, count_result.scalar_one())


@router.delete(
    "/{collection_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a collection",
)
async def delete_collection(
    collection_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    collection: Collection | None = await db.get(Collection, collection_id)
    if collection is None or collection.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    await db.delete(collection)
    await db.commit()


@router.patch(
    "/documents/{doc_id}/assign",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Assign or remove a document from a collection",
)
async def assign_document(
    doc_id: uuid.UUID,
    body: AssignCollectionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    doc: Document | None = await db.get(Document, doc_id)
    if doc is None or doc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if body.collection_id is not None:
        collection: Collection | None = await db.get(Collection, body.collection_id)
        if collection is None or collection.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found"
            )

    doc.collection_id = body.collection_id
    await db.commit()
