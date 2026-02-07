from routers.ingest import router as ingest_router
from routers.scope import router as scope_router
from routers.query import router as query_router
from routers.narrative import router as narrative_router
from routers.portrait import router as portrait_router

__all__ = [
    "ingest_router",
    "scope_router",
    "query_router",
    "narrative_router",
    "portrait_router",
]
