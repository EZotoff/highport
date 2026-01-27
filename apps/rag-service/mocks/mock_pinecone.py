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
        filter: Optional[dict] = None,
    ) -> list[MockQueryResult]:
        self.call_history.append(
            {
                "method": "query",
                "top_k": top_k,
                "namespace": namespace,
                "filter": filter,
            }
        )
        # Return canned results based on stored vectors
        results = []
        for key, stored in self.vectors.items():
            if namespace and stored["namespace"] != namespace:
                continue

            # Simple filter simulation
            if filter:
                match = True
                for f_key, f_val in filter.items():
                    # Handle $in operator
                    if isinstance(f_val, dict) and "$in" in f_val:
                        if stored["metadata"].get(f_key) not in f_val["$in"]:
                            # Special case: check if any of the stored value (if list) is in target list
                            # But here we are checking if access_scope (list) contains one of scope (list)
                            # The instructions say: filter={"access_scope": {"$in": scope}}
                            # Pinecone $in checks if the field value equals one of the values in the list.
                            # BUT access_scope is a list of strings.
                            # Pinecone behavior for array fields:
                            # If the metadata field is an array, the $in operator matches if the array contains ANY of the values in the $in list.

                            stored_val = stored["metadata"].get(f_key)
                            if isinstance(stored_val, list):
                                if not any(v in f_val["$in"] for v in stored_val):
                                    match = False
                            elif stored_val not in f_val["$in"]:
                                match = False
                    # Handle direct equality
                    elif stored["metadata"].get(f_key) != f_val:
                        match = False
                if not match:
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
