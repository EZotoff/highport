from dataclasses import dataclass
from typing import Optional


@dataclass
class MockQueryResult:
    id: str
    score: float
    metadata: dict


class MockPineconeIndex:
    """Mock Pinecone index for testing without API calls."""

    def __init__(self):
        self.vectors: dict[str, dict] = {}
        self.call_history: list[dict] = []

    async def upsert(
        self,
        id: str,
        vector: list[float],
        metadata: Optional[dict] = None,
        namespace: str = "",
    ) -> None:
        self.call_history.append({"method": "upsert", "id": id, "namespace": namespace})
        key = f"{namespace}:{id}" if namespace else id
        self.vectors[key] = {
            "id": id,
            "values": vector,
            "metadata": metadata or {},
            "namespace": namespace,
        }

    async def upsert_batch(self, vectors: list[dict], namespace: str = "") -> None:
        self.call_history.append(
            {"method": "upsert_batch", "count": len(vectors), "namespace": namespace}
        )
        for vec in vectors:
            key = f"{namespace}:{vec['id']}" if namespace else vec["id"]
            self.vectors[key] = {
                "id": vec["id"],
                "values": vec["values"],
                "metadata": vec.get("metadata", {}),
                "namespace": namespace,
            }

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        namespace: str = "",
        include_metadata: bool = True,
    ) -> list[MockQueryResult]:
        self.call_history.append(
            {"method": "query", "top_k": top_k, "namespace": namespace}
        )
        # Return canned results based on stored vectors
        results = []
        for key, stored in self.vectors.items():
            if namespace and stored["namespace"] != namespace:
                continue
            results.append(
                MockQueryResult(
                    id=stored["id"],
                    score=0.95 - len(results) * 0.1,  # Decreasing scores
                    metadata=stored["metadata"] if include_metadata else {},
                )
            )
            if len(results) >= top_k:
                break
        return results

    async def delete(self, ids: list[str], namespace: str = "") -> None:
        self.call_history.append(
            {"method": "delete", "ids": ids, "namespace": namespace}
        )
        for id in ids:
            key = f"{namespace}:{id}" if namespace else id
            self.vectors.pop(key, None)
