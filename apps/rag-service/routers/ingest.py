"""Document ingestion router.

Handles PDF and text file uploads, chunking, entity extraction,
embedding generation, and storage in Pinecone.
"""

import io
from uuid import uuid4
from dataclasses import dataclass
from typing import Protocol

from fastapi import APIRouter, UploadFile, File, HTTPException

from services.chunker import chunk_text
from services.entity_extractor import extract_entities


router = APIRouter(prefix="/ingest", tags=["ingestion"])


class EmbeddingsProtocol(Protocol):
    """Protocol for embeddings clients."""

    async def embed(self, text: str) -> list[float]: ...
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class LLMProtocol(Protocol):
    """Protocol for LLM providers."""

    async def generate(self, prompt: str) -> str: ...


class PineconeProtocol(Protocol):
    """Protocol for Pinecone service."""

    async def upsert_batch(self, vectors: list[dict], namespace: str = "") -> None: ...


@dataclass
class IngestResult:
    """Result of document ingestion."""

    source_id: str
    chunks: int
    status: str


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF file.

    Args:
        file_bytes: The PDF file as bytes.

    Returns:
        Extracted text content.
    """
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n".join(pages)


# Dependency overrides (set during app initialization or tests)
_embeddings_override: EmbeddingsProtocol | None = None
_llm_override: LLMProtocol | None = None
_pinecone_override: PineconeProtocol | None = None


def set_dependencies(
    embeddings: EmbeddingsProtocol | None = None,
    llm: LLMProtocol | None = None,
    pinecone: PineconeProtocol | None = None,
) -> None:
    """Set dependency overrides for testing.

    Args:
        embeddings: Embeddings client override.
        llm: LLM provider override.
        pinecone: Pinecone service override.
    """
    global _embeddings_override, _llm_override, _pinecone_override
    _embeddings_override = embeddings
    _llm_override = llm
    _pinecone_override = pinecone


def clear_dependencies() -> None:
    """Clear all dependency overrides."""
    global _embeddings_override, _llm_override, _pinecone_override
    _embeddings_override = None
    _llm_override = None
    _pinecone_override = None


def _get_embeddings() -> EmbeddingsProtocol:
    """Get embeddings client."""
    if _embeddings_override is not None:
        return _embeddings_override
    from providers.embeddings import EmbeddingsClient

    return EmbeddingsClient()


def _get_llm() -> LLMProtocol:
    """Get LLM provider."""
    if _llm_override is not None:
        return _llm_override
    from providers.gemini import GeminiProvider

    return GeminiProvider()


def _get_pinecone() -> PineconeProtocol:
    """Get Pinecone service."""
    if _pinecone_override is not None:
        return _pinecone_override
    from services.pinecone_client import PineconeService

    return PineconeService()


@router.post("")
async def ingest_document(
    file: UploadFile = File(...),
) -> dict:
    """Ingest a document (PDF or text file).

    1. Extract text from file (PDF or text)
    2. Chunk text into ~500 token segments
    3. Extract entities per chunk using LLM
    4. Generate embeddings for each chunk
    5. Store in Pinecone with metadata

    Args:
        file: The uploaded file (PDF or text).

    Returns:
        Dict with source_id, chunks count, and status.
    """
    # Get dependencies
    embeddings = _get_embeddings()
    llm = _get_llm()
    pinecone = _get_pinecone()

    # Read file content
    content = await file.read()

    # Determine file type and extract text
    if file.content_type == "application/pdf" or (
        file.filename and file.filename.lower().endswith(".pdf")
    ):
        try:
            text = extract_text_from_pdf(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
    else:
        # Assume text file
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400, detail="File must be UTF-8 encoded text"
            )

    if not text.strip():
        raise HTTPException(status_code=400, detail="File contains no text content")

    # Generate source ID
    source_id = f"doc_{uuid4().hex}"

    # Chunk the text
    chunks = chunk_text(text, target_tokens=500, overlap_tokens=50)

    # Process each chunk
    vectors_to_upsert = []
    for idx, chunk_text_content in enumerate(chunks):
        # Extract entities
        entities = await extract_entities(chunk_text_content, llm)

        # Generate embedding
        embedding = await embeddings.embed(chunk_text_content)

        # Prepare vector for Pinecone
        chunk_id = f"chunk_{uuid4().hex}"
        vectors_to_upsert.append(
            {
                "id": chunk_id,
                "values": embedding,
                "metadata": {
                    "source_id": source_id,
                    "access_scope": ["public"],
                    "entities": entities.all_entities(),
                    "chunk_index": idx,
                    "text": chunk_text_content,
                },
            }
        )

    # Upsert to Pinecone
    if vectors_to_upsert:
        await pinecone.upsert_batch(vectors_to_upsert)

    return {
        "source_id": source_id,
        "chunks": len(chunks),
        "status": "indexed",
    }
