"""Domain-specific HTTP exception subclasses."""

from fastapi import HTTPException, status


class DocumentNotFoundError(HTTPException):
    """Raised when the requested document does not exist in the database."""

    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")


class DocumentNotReadyError(HTTPException):
    """Raised when a document is not yet in 'ready' status and cannot be queried."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not ready for querying",
        )


class DocumentOwnershipError(HTTPException):
    """Raised when a user attempts to access another user's document."""

    def __init__(self) -> None:
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


class FileTooLargeError(HTTPException):
    """Raised when an uploaded file exceeds the configured size limit."""

    def __init__(self, max_mb: int) -> None:
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {max_mb} MB limit",
        )


class InvalidFileTypeError(HTTPException):
    """Raised when an uploaded file is not a PDF."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only PDF files are accepted",
        )
