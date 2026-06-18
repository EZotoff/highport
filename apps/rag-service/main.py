import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import (
    ingest_router,
    scope_router,
    query_router,
    narrative_router,
    portrait_router,
)

load_dotenv()

app = FastAPI(title="Highport RAG Service")

app.include_router(ingest_router)
app.include_router(scope_router)
app.include_router(query_router)
app.include_router(narrative_router)
app.include_router(portrait_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:18120",
        "https://highport.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    from providers.embeddings import get_embeddings_provider
    from providers.llm import get_llm_provider_name
    from providers.vectordb import get_vectordb_provider_name

    embeddings_provider = get_embeddings_provider()

    return {
        "status": "ok",
        "providers": {
            "embeddings": {
                "provider": os.environ.get("EMBEDDINGS_PROVIDER", "ollama"),
                "model": embeddings_provider.model_name,
                "dimension": embeddings_provider.dimension,
            },
            "llm": get_llm_provider_name(),
            "vectordb": get_vectordb_provider_name(),
        },
    }
