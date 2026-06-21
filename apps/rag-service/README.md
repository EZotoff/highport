# Highport RAG Service

> The ship's intelligence core.

A Python FastAPI service that powers the "Ask Computer" assistant. It retrieves campaign knowledge with permission-gated access, using your choice of local (Ollama + ChromaDB) or cloud (Gemini + Pinecone) providers.

## Subsystem Status

v0.1. Multi-provider support is active. The web app degrades gracefully when this service is not configured.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process
- [.env.example](./.env.example) - environment variables
- [RAG Setup Guide](../../docs/rag-setup.md) - full provider configuration

## Running Locally

```bash
cd apps/rag-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 18124
```

## Key Environment Variables

| Variable                  | Purpose                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| `EMBEDDINGS_PROVIDER`     | `ollama` (default, free, local) or `openai` (paid, cloud)                     |
| `OLLAMA_EMBED_MODEL`      | Ollama embedding model tag (default: `qwen3-embedding:0.6b`)                   |
| `OPENAI_EMBEDDING_MODEL`  | OpenAI embedding model (default: `text-embedding-3-small`)                     |
| `EMBEDDING_DIM`           | Optional dim override for MRL truncation (default: provider's native dim)      |
| `LLM_PROVIDER`            | `ollama` (default, local text) or `gemini` (cloud text + portrait images)      |
| `VECTORDB_PROVIDER`       | `chroma` or `pinecone`                                                        |
| `OLLAMA_BASE_URL`         | Local Ollama endpoint                                                         |
| `GEMINI_API_KEY`          | Required only when `LLM_PROVIDER=gemini`                                       |
| `OPENAI_API_KEY`          | Required only when `EMBEDDINGS_PROVIDER=openai`                                |

Narrative text generation follows `LLM_PROVIDER`. Portrait tag extraction also follows `LLM_PROVIDER`, but portrait image generation requires Gemini's image API; when `LLM_PROVIDER=ollama`, portrait images return an unavailable response instead of falling back to Gemini.

See [.env.example](./.env.example) and [../../docs/rag-setup.md](../../docs/rag-setup.md) for the full list and setup walkthrough.
## Testing

```bash
cd apps/rag-service
pytest
```
## Architecture Notes

- `main.py` is the FastAPI entry point.
- `routers/` has five endpoints: ingest, scope, query, narrative, and portrait.
- `providers/` holds LLM and vector database adapters.
- `services/` contains chunking, embedding, and retrieval logic.
## License
MIT - see [root LICENSE](../../LICENSE).
