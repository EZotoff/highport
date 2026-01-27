from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import ingest_router, scope_router

app = FastAPI(title="PlaneShift RAG Service")

app.include_router(ingest_router)
app.include_router(scope_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://planeshift.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}
