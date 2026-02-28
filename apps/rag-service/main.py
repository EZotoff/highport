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
        "http://localhost:3010",
        "https://highport.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
