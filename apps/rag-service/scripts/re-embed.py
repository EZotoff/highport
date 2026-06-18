#!/usr/bin/env python3
"""Re-embed stored vector records with the active embedding provider.

Scan APIs: ChromaDB collection.get(include=["metadatas", "documents"], limit,
offset); Pinecone index.list()/list_paginated() for IDs, then index.fetch(ids).
Use --ids-file when the installed Pinecone SDK cannot list IDs.
"""
import argparse, asyncio, json, os, sys, warnings
from importlib import import_module
from typing import Any, Iterator

# Add parent directory to path so we can import providers.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
warnings.filterwarnings("ignore", category=FutureWarning)

from dotenv import load_dotenv

Record = dict[str, Any]; Stats = dict[str, int]

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Re-embed vector DB records with the active embedding provider.")
    parser.add_argument("--dry-run", action="store_true", help="scan and report only")
    parser.add_argument("--limit", type=int, help="only process first N matching records")
    parser.add_argument("--force", action="store_true", help="re-embed records already on the active model")
    parser.add_argument("--batch-size", type=int, default=100, help="records per embed/upsert batch")
    parser.add_argument("--source-filter", action="append", default=[], metavar="KEY=VALUE", help="metadata KEY must exactly match VALUE; repeatable")
    parser.add_argument("--ids-file", help="Pinecone fallback file with IDs to fetch")
    return parser.parse_args()
def parse_filters(raw_filters: list[str]) -> dict[str, str]:
    filters: dict[str, str] = {}
    for raw in raw_filters:
        if "=" not in raw:
            raise ValueError(f"Invalid --source-filter '{raw}'. Expected KEY=VALUE.")
        key, value = raw.split("=", 1)
        if not key:
            raise ValueError(f"Invalid --source-filter '{raw}'. Key cannot be empty.")
        filters[key] = value
    return filters
def p_name(provider: Any) -> str:
    return provider.__class__.__name__.replace("Embeddings", "").replace("Provider", "").lower()
def mget(value: Any, key: str, default: Any = None) -> Any:
    return value.get(key, default) if isinstance(value, dict) else getattr(value, key, default)
def print_config(embeddings: Any, vectordb: Any) -> None:
    print(f"[INFO] Embeddings: provider={p_name(embeddings)} model={embeddings.model_name} dimension={embeddings.dimension}")
    parts = [f"provider={p_name(vectordb)}"]
    for attr in ("persist_directory", "collection_name", "index_name", "environment"):
        value = getattr(vectordb, attr, None)
        if value:
            parts.append(f"{attr}={value}")
    print(f"[INFO] Vector DB: {' '.join(parts)}")
def pinecone_index(vectordb: Any) -> Any:
    vectordb._ensure_index()
    index = getattr(vectordb, "_index", None)
    if index is None:
        raise RuntimeError("Pinecone index not initialized")
    return index
def verify_pinecone_dimension(vectordb: Any, embedding_dim: int) -> None:
    index_dim = mget(pinecone_index(vectordb).describe_index_stats(), "dimension")
    if index_dim is None:
        print("[WARN] Could not read Pinecone index dimension; continuing")
        return
    if int(index_dim) != embedding_dim:
        raise RuntimeError(f"Pinecone index dimension mismatch: index={index_dim}, active_embeddings={embedding_dim}. Pinecone dimensions are immutable; create a new index. See docs/rag-setup.md#migration-changing-your-embedding-model.")
    print(f"[INFO] Pinecone index dimension verified: {index_dim}")
def scan_chroma(vectordb: Any, page_size: int) -> Iterator[Record]:
    vectordb._ensure_collection()
    collection = getattr(vectordb, "_collection", None)
    if collection is None:
        raise RuntimeError("Chroma collection not initialized")
    offset = 0
    while True:
        result = collection.get(include=["metadatas", "documents"], limit=page_size, offset=offset)
        ids = result.get("ids") or []
        if not ids:
            break
        metas = result.get("metadatas") or [{} for _ in ids]
        docs = result.get("documents") or [None for _ in ids]
        for i, record_id in enumerate(ids):
            yield {"id": record_id, "metadata": metas[i] or {}, "document": docs[i], "namespace": ""}
        offset += len(ids)
def load_ids(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read().strip()
    if not content:
        return []
    if content.startswith("["):
        parsed = json.loads(content)
        if not isinstance(parsed, list):
            raise ValueError("--ids-file JSON must be a list")
        return [str(item) for item in parsed]
    return [line.strip() for line in content.splitlines() if line.strip()]
def ids_from(page: Any) -> list[str]:
    if page is None:
        return []
    if isinstance(page, str):
        return [page]
    items = page.get("ids", page.get("vectors", [])) if isinstance(page, dict) else mget(page, "vectors", page)
    ids: list[str] = []
    for item in items:
        if isinstance(item, str):
            ids.append(item)
        elif isinstance(item, dict) and "id" in item:
            ids.append(str(item["id"]))
        elif getattr(item, "id", None) is not None:
            ids.append(str(getattr(item, "id")))
    return ids
def pinecone_namespaces(index: Any) -> list[str]:
    try:
        namespaces = mget(index.describe_index_stats(), "namespaces", {}) or {}
        if isinstance(namespaces, dict) and namespaces:
            return [str(name) for name in namespaces]
    except Exception as exc:
        print(f"[WARN] Could not list Pinecone namespaces ({exc}); using default namespace")
    return [""]
def iter_pinecone_ids(index: Any, namespace: str) -> Iterator[str]:
    if hasattr(index, "list"):
        for page in index.list(namespace=namespace):
            yield from ids_from(page)
        return
    if not hasattr(index, "list_paginated"):
        raise RuntimeError("Pinecone SDK cannot list IDs; use --ids-file")
    token = None
    while True:
        kwargs: dict[str, Any] = {"namespace": namespace, "limit": 100}
        if token:
            kwargs["pagination_token"] = token
        page = index.list_paginated(**kwargs)
        yield from ids_from(page)
        token = mget(mget(page, "pagination", {}) or {}, "next")
        if not token:
            break
def fetch_pinecone(index: Any, ids: list[str], namespace: str) -> Iterator[Record]:
    vectors = mget(index.fetch(ids=ids, namespace=namespace), "vectors", {}) or {}
    for record_id, vector in vectors.items():
        yield {"id": record_id, "metadata": mget(vector, "metadata", {}) or {}, "document": None, "namespace": namespace}
def scan_pinecone(vectordb: Any, page_size: int, ids_file: str | None) -> Iterator[Record]:
    index = pinecone_index(vectordb)
    for namespace in pinecone_namespaces(index):
        id_source = iter(load_ids(ids_file)) if ids_file else iter_pinecone_ids(index, namespace)
        pending: list[str] = []
        for record_id in id_source:
            pending.append(record_id)
            if len(pending) >= page_size:
                yield from fetch_pinecone(index, pending, namespace)
                pending = []
        if pending:
            yield from fetch_pinecone(index, pending, namespace)
def scan_records(vectordb: Any, args: argparse.Namespace) -> Iterator[Record]:
    if p_name(vectordb) == "chroma":
        yield from scan_chroma(vectordb, args.batch_size)
    elif p_name(vectordb) == "pinecone":
        yield from scan_pinecone(vectordb, args.batch_size, args.ids_file)
    else:
        raise RuntimeError(f"Unsupported vector DB provider: {p_name(vectordb)}")
async def embed_with_retry(embeddings: Any, texts: list[str]) -> list[list[float]]:
    try:
        return await embeddings.embed_batch(texts)
    except Exception as exc:
        print(f"[WARN] Embed batch failed ({exc}); retrying once in 2s")
        await asyncio.sleep(2)
        return await embeddings.embed_batch(texts)
async def process_batch(vectordb: Any, embeddings: Any, records: list[Record], stats: Stats, number: int) -> None:
    try:
        vectors = await embed_with_retry(embeddings, [str(record["text"]) for record in records])
        if len(vectors) != len(records):
            raise RuntimeError(f"embedding count mismatch: got {len(vectors)} for {len(records)}")
        upserts = []
        for record, vector in zip(records, vectors):
            metadata = dict(record["metadata"])
            metadata["embedding_model"] = embeddings.model_name
            upserts.append({"id": record["id"], "values": vector, "metadata": metadata})
        await vectordb.upsert_batch(upserts, namespace=records[0].get("namespace", ""))
    except Exception as exc:
        stats["failed"] += len(records)
        print(f"[ERROR] Failed batch {number}: {exc}")
        return
    stats["reembedded"] += len(records)
    print(f"[INFO] Re-embedded batch {number}: {len(records)} records")
def summary(prefix: str, stats: Stats) -> None:
    print(f"{prefix} Summary: scanned={stats['scanned']} matched={stats['matched']} reembedded={stats['reembedded']} skipped={stats['skipped']} failed={stats['failed']}")
async def run() -> int:
    args = parse_args()
    if args.batch_size <= 0 or (args.limit is not None and args.limit < 0):
        raise ValueError("--batch-size must be > 0 and --limit must be >= 0")
    filters = parse_filters(args.source_filter)
    load_dotenv()
    embeddings = getattr(import_module("providers.embeddings"), "get_embeddings_provider")()
    vectordb = getattr(import_module("providers.vectordb"), "get_vectordb_provider")()
    print_config(embeddings, vectordb)
    if p_name(vectordb) == "pinecone":
        verify_pinecone_dimension(vectordb, embeddings.dimension)
    stats: Stats = {"scanned": 0, "matched": 0, "reembedded": 0, "skipped": 0, "failed": 0}
    batch: list[Record] = []
    batch_number = 1
    try:
        for record in scan_records(vectordb, args):
            stats["scanned"] += 1
            metadata = record.get("metadata") or {}
            if not all(str(metadata.get(key)) == value for key, value in filters.items()):
                continue
            if args.limit is not None and stats["matched"] >= args.limit:
                break
            stats["matched"] += 1
            if metadata.get("embedding_model") == embeddings.model_name and not args.force:
                stats["skipped"] += 1
                print(f"[INFO] Skipping {record['id']}: embedding_model already {embeddings.model_name}")
                continue
            text = metadata.get("text") or record.get("document")
            if not text:
                stats["failed"] += 1
                print(f"[ERROR] Skipping {record['id']}: missing metadata.text")
                continue
            record["text"] = text
            if args.dry_run:
                stats["reembedded"] += 1
            else:
                batch.append(record)
            if len(batch) >= args.batch_size:
                await process_batch(vectordb, embeddings, batch, stats, batch_number)
                batch_number += 1
                batch = []
        if batch and not args.dry_run:
            await process_batch(vectordb, embeddings, batch, stats, batch_number)
    except KeyboardInterrupt:
        print("[WARN] Interrupted by user")
        summary("[WARN] Partial", stats)
        return 130
    summary("[DRY-RUN]" if args.dry_run else "[INFO]", stats)
    return 0
def main() -> None:
    try:
        raise SystemExit(asyncio.run(run()))
    except KeyboardInterrupt:
        print("[WARN] Interrupted by user")
        raise SystemExit(130)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1)
if __name__ == "__main__":
    main()
