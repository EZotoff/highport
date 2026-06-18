"""ChromaDB vector database provider implementation for free local storage."""

import os
from typing import Optional, Any

from providers.embeddings import get_embedding_dimension
from providers.vectordb.base import VectorDBProvider, VectorQueryResult


class ChromaProvider(VectorDBProvider):
    """ChromaDB local vector database provider.

    Uses ChromaDB with a persistent client for free, local vector storage.
    No API key required.
    """

    def __init__(
        self,
        persist_directory: str | None = None,
        collection_name: str | None = None,
    ):
        """Initialize the ChromaDB provider.

        Args:
            persist_directory: Directory for persistent storage. Defaults to
                CHROMA_PERSIST_DIR env var or ./chroma_data.
            collection_name: Name of the collection. Defaults to
                CHROMA_COLLECTION_NAME env var or highport.
        """
        self.persist_directory = persist_directory or os.environ.get(
            "CHROMA_PERSIST_DIR", "./chroma_data"
        )
        self.collection_name = collection_name or os.environ.get(
            "CHROMA_COLLECTION_NAME", "highport"
        )
        self._client: Any = None
        self._collection: Any = None

    def _ensure_collection(self):
        """Lazily initialize the ChromaDB client and collection."""
        if self._collection is None:
            import chromadb  # type: ignore[import-untyped]

            self._client = chromadb.PersistentClient(path=self.persist_directory)
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )

    async def upsert(
        self,
        id: str,
        vector: list[float],
        metadata: Optional[dict] = None,
        namespace: str = "",
    ) -> None:
        """Upsert a vector into ChromaDB."""
        self._ensure_collection()
        meta = _prepare_metadata(metadata, namespace)
        self._collection.upsert(
            ids=[id],
            embeddings=[vector],
            metadatas=[meta],
        )

    async def upsert_batch(self, vectors: list[dict], namespace: str = "") -> None:
        """Upsert multiple vectors into ChromaDB."""
        self._ensure_collection()
        if not vectors:
            return

        ids = [v["id"] for v in vectors]
        embeddings = [v["values"] for v in vectors]
        metadatas = [_prepare_metadata(v.get("metadata"), namespace) for v in vectors]

        self._collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        namespace: str = "",
        include_metadata: bool = True,
        filter: Optional[dict] = None,
    ) -> list[VectorQueryResult]:
        """Query ChromaDB for similar vectors."""
        self._ensure_collection()

        where = _build_chroma_where(filter, namespace)

        query_kwargs: dict[str, Any] = {
            "query_embeddings": [vector],
            "n_results": top_k,
            "include": ["metadatas", "distances"]
            if include_metadata
            else ["distances"],
        }
        if where:
            query_kwargs["where"] = where

        try:
            results = self._collection.query(**query_kwargs)
        except Exception:
            # Collection may be empty or filter matches nothing
            return []

        return _parse_chroma_results(results, include_metadata)

    async def delete(self, ids: list[str], namespace: str = "") -> None:
        """Delete vectors by ID."""
        self._ensure_collection()
        if ids:
            self._collection.delete(ids=ids)

    async def query_by_filter(
        self, filter_dict: dict, top_k: int = 10000, namespace: str = ""
    ) -> list[dict]:
        """Query ChromaDB with a metadata filter (no similarity search).

        Since ChromaDB doesn't support filter-only queries without embeddings,
        we use a zero vector and rely on the filter for matching.
        """
        self._ensure_collection()

        where = _build_chroma_where(filter_dict, namespace)
        if not where:
            return []

        # ChromaDB requires embeddings for query, use zero vector
        zero_vector = [0.0] * get_embedding_dimension()

        try:
            results = self._collection.query(
                query_embeddings=[zero_vector],
                n_results=top_k,
                where=where,
                include=["metadatas"],
            )
        except Exception:
            return []

        if not results or not results.get("ids") or not results["ids"][0]:
            return []

        output = []
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i] if results.get("metadatas") else {}
            output.append({"id": doc_id, "metadata": _restore_metadata(meta)})
        return output

    async def update_metadata(
        self, id: str, metadata: dict, namespace: str = ""
    ) -> None:
        """Update metadata for a specific vector."""
        self._ensure_collection()

        # Get existing metadata
        existing = self._collection.get(ids=[id], include=["metadatas"])
        if not existing or not existing["ids"]:
            return

        current_meta = existing["metadatas"][0] if existing["metadatas"] else {}
        # Merge new metadata into existing
        updated = {**current_meta, **_prepare_metadata(metadata, namespace)}
        self._collection.update(ids=[id], metadatas=[updated])


def _prepare_metadata(metadata: Optional[dict], namespace: str = "") -> dict:
    """Prepare metadata for ChromaDB storage.

    ChromaDB metadata values must be str, int, float, or bool.
    Lists are serialized as comma-separated strings with a __list__ prefix marker.
    """
    meta = {}
    if namespace:
        meta["_namespace"] = namespace

    if metadata:
        for key, value in metadata.items():
            if isinstance(value, list):
                # Serialize lists as pipe-separated strings with marker
                meta[key] = "__list__" + "|".join(str(v) for v in value)
            elif isinstance(value, (str, int, float, bool)):
                meta[key] = value
            else:
                meta[key] = str(value)

    return meta


def _restore_metadata(meta: dict) -> dict:
    """Restore metadata from ChromaDB storage format.

    Deserializes __list__ prefixed values back to lists.
    """
    restored = {}
    for key, value in meta.items():
        if key == "_namespace":
            continue
        if isinstance(value, str) and value.startswith("__list__"):
            restored[key] = value[len("__list__") :].split("|")
        else:
            restored[key] = value
    return restored


def _build_chroma_where(
    filter_dict: Optional[dict], namespace: str = ""
) -> Optional[dict]:
    """Convert Pinecone-style filter to ChromaDB where clause.

    Handles common Pinecone operators:
    - $in: Converted to ChromaDB $in (checks if field value is in the list)
    - $eq: Direct equality
    - Direct value: Equality check

    For list metadata fields (serialized as __list__pipe-separated):
    - $in operator: Uses $contains to check if the serialized string contains any value
    """
    conditions = []

    if namespace:
        conditions.append({"_namespace": {"$eq": namespace}})

    if filter_dict:
        for key, value in filter_dict.items():
            if isinstance(value, dict):
                if "$in" in value:
                    # For Pinecone $in on array fields (like access_scope),
                    # we need to check if any of the filter values appear in the stored list.
                    # Since we serialize lists as "__list__val1|val2|...",
                    # we use $or with $contains for each value.
                    in_values = value["$in"]
                    or_conditions = []
                    for v in in_values:
                        or_conditions.append({key: {"$contains": str(v)}})
                    if len(or_conditions) == 1:
                        conditions.append(or_conditions[0])
                    elif or_conditions:
                        conditions.append({"$or": or_conditions})
                elif "$eq" in value:
                    conditions.append({key: {"$eq": value["$eq"]}})
                else:
                    # Pass through other operators
                    conditions.append({key: value})
            else:
                conditions.append({key: {"$eq": value}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}
