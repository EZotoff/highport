# Highport RAG Service Setup Guide

Complete setup instructions for Highport's AI features. The default stack is fully free and local: Ollama for LLM and embeddings, plus ChromaDB for vector storage. No API keys required. Cloud-provider instructions (OpenAI embeddings, Gemini LLM, Pinecone) are included for production deployments.

---

## Quick Start (5 Minutes)

If you know what you are doing:

```bash
# 1. Install Ollama (macOS example, see below for other platforms)
brew install ollama && ollama serve

# 2. Pull models
ollama pull llama3.2
ollama pull qwen3-embedding:0.6b

# 3. Set up RAG service
cd apps/rag-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# 4. Create .env file
cat > .env << 'EOF'
LLM_PROVIDER=ollama
VECTORDB_PROVIDER=chroma
EMBEDDINGS_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=qwen3-embedding:0.6b
CHROMA_PERSIST_DIR=./chroma_data
EOF

# 5. Start the service
uvicorn main:app --reload --port 18124

# 6. Test it
curl http://localhost:18124/health
```

---

## Prerequisites

Before starting, ensure you have:

- **Python 3.11+** installed
- **Ollama** installed (or will be installed below)
- **OpenAI API key** (only if you choose OpenAI embeddings or Gemini LLM; default stack needs no API keys)
- **Highport server running** (Web on port 18120, Fastify API on port 18122)
- **8GB+ RAM** for running LLMs locally (16GB+ recommended)
  - The embedding model (`qwen3-embedding:0.6b`) is only 639MB and adds minimal RAM overhead compared to the LLM

---

## Detailed Setup

### Step 1: Install Ollama

Ollama runs AI models locally on your machine. No API key required.

**macOS:**

```bash
brew install ollama
ollama serve
```

**Linux:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

**Windows:**
Download the installer from [ollama.com/download](https://ollama.com/download) and run it. The Ollama service will start automatically.

Verify Ollama is running:

```bash
curl http://localhost:11434
```

Expected response: `Ollama is running`

---

### Step 2: Pull Models

You need two models: one for generation (LLM) and one for turning text into searchable vectors (embeddings).

```bash
# LLM for generation
ollama pull llama3.2

# Embedding model for retrieval (required for RAG)
ollama pull qwen3-embedding:0.6b
```

**Why llama3.2?**

- Good reasoning quality for RPG content
- Runs on consumer hardware (8GB VRAM or 16GB system RAM)
- Apache 2.0 license (fully free)

**Alternative LLM models:**

- `ollama pull mistral` - Faster responses, slightly less capable
- `ollama pull llama3.2:3b` - Smaller, works on 4GB RAM
- `ollama pull qwen2.5:14b` - Better quality if you have 32GB+ RAM

---

### Step 3: Set Up the RAG Service

Navigate to the RAG service directory and create a Python virtual environment:

```bash
cd apps/rag-service

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate      # macOS/Linux
# OR
venv\Scripts\activate.bat     # Windows Command Prompt
# OR
venv\Scripts\Activate.ps1     # Windows PowerShell
```

Install dependencies:

```bash
pip install -r requirements.txt
```

This installs FastAPI, ChromaDB, the Ollama client, and all other requirements.

---

### Step 4: Configure Environment Variables

Create a `.env` file in `apps/rag-service/`:

```bash
cat > .env << 'EOF'
# Provider configuration
LLM_PROVIDER=ollama
VECTORDB_PROVIDER=chroma
EMBEDDINGS_PROVIDER=ollama

# Ollama settings (LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Ollama settings (embeddings)
OLLAMA_EMBED_MODEL=qwen3-embedding:0.6b

# ChromaDB settings
CHROMA_PERSIST_DIR=./chroma_data
CHROMA_COLLECTION_NAME=highport
EOF
```

**Available options:**

| Variable                 | Default                  | Description                                                              |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------ |
| `LLM_PROVIDER`           | `ollama`                 | LLM backend: `ollama` or `gemini`                                        |
| `VECTORDB_PROVIDER`      | `chroma`                 | Vector DB: `chroma` or `pinecone`                                        |
| `EMBEDDINGS_PROVIDER`    | `ollama`                 | Embeddings: `ollama` (free, local) or `openai` (paid, cloud)             |
| `OLLAMA_EMBED_MODEL`     | `qwen3-embedding:0.6b`   | Ollama embedding model tag                                               |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model (used when `EMBEDDINGS_PROVIDER=openai`)          |
| `EMBEDDING_DIM`          | (provider native)        | Optional dim override for MRL truncation                                 |
| `OLLAMA_BASE_URL`        | `http://localhost:11434` | Ollama server URL                                                        |
| `OLLAMA_MODEL`           | `llama3.2`               | Model name to use                                                        |
| `CHROMA_PERSIST_DIR`     | `./chroma_data`          | Where to store vector data                                               |
| `CHROMA_COLLECTION_NAME` | `highport`               | ChromaDB collection name                                                 |
| `OPENAI_API_KEY`         | (conditional)            | Required only when `EMBEDDINGS_PROVIDER=openai` or `LLM_PROVIDER=gemini` |

---

### Step 5: Start the Service

Start the RAG service on port 18124:

```bash
uvicorn main:app --reload --port 18124
```

You should see output similar to:

```
INFO:     Will watch for changes in these directories: ['/path/to/apps/rag-service']
INFO:     Uvicorn running on http://0.0.0.0:18124 (Press CTRL+C to quit)
```

The service is now running and will auto-reload when you change code.

---

### Step 6: Test Your Setup

**Health check** (verifies providers are configured):

```bash
curl http://localhost:18124/health
```

Expected response:

```json
{
  "status": "ok",
  "providers": {
    "llm": "ollama",
    "vectordb": "chroma"
  }
}
```

**Query test** (requires ingested data first):

```bash
# First, ingest some test data
curl -X POST http://localhost:18124/ingest \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -H "X-Is-GM: true" \
  -d '{
    "documents": [
      {
        "id": "test-doc-1",
        "content": "The city of Highport was founded in 2847 by the Imperial Scout Service.",
        "metadata": {"title": "History of Highport", "access_scope": ["public"]}
      }
    ]
  }'

# Then query it
curl -X POST http://localhost:18124/query \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -H "X-Is-GM: false" \
  -d '{"query": "When was Highport founded?"}'
```

Expected: Streaming response with generated text based on the ingested document.

---

## Embeddings Configuration

Highport supports two embeddings providers:

| Provider | Default model          | Dimensions | Cost            | Privacy                            |
| -------- | ---------------------- | ---------- | --------------- | ---------------------------------- |
| `ollama` | qwen3-embedding:0.6b   | 1024       | Free (local)    | Full — no data leaves your machine |
| `openai` | text-embedding-3-small | 1536       | $0.02/1M tokens | Chunk text sent to OpenAI API      |

**Default: `ollama`** — matches the "free local RAG, no API keys required" promise.

### Switching to OpenAI

Set in your `.env`:

```
EMBEDDINGS_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Choosing a different local model

```bash
ollama pull nomic-embed-text   # 768-dim, 274MB, smallest mature option
# OR
ollama pull bge-m3              # 1024-dim, 1.2GB, multilingual
```

Then set `OLLAMA_EMBED_MODEL=nomic-embed-text` (or `bge-m3`) in your `.env`.

See the [Ollama embedding model catalog](https://ollama.com/search?c=embedding) for the full list.

---

## Migration: Changing Your Embedding Model

Embedding models are **not cross-compatible**. Vectors generated by model A cannot be queried by model B — different models map text to different geometric spaces. Switching models requires **re-embedding your entire corpus**.

### For ChromaDB users

ChromaDB adapts to any dimension at runtime. To switch:

1. Stop the RAG service.
2. Delete or rename your `CHROMA_PERSIST_DIR` (default: `./chroma_data`).
3. Update your `.env` (e.g., `OLLAMA_EMBED_MODEL=nomic-embed-text`).
4. Restart the service.
5. Re-ingest your documents through the Highport web UI.

### For Pinecone users

Pinecone indexes are locked to a specific dimension at creation time. To switch:

1. Create a NEW Pinecone index at the new dimension (e.g., 1024 for `qwen3-embedding:0.6b`, 768 for `nomic-embed-text`). The existing `highport-index` at 1536d cannot be reused.
2. Update `PINECONE_INDEX_NAME` in your `.env` to point to the new index.
3. Restart the service.
4. Re-ingest your documents through the Highport web UI.
5. (Optional) Delete the old 1536d index from the Pinecone console after verifying the new one works.

### Re-embedding script

A `scripts/re-embed.py` helper is provided for users who want to migrate without re-uploading source documents. It walks existing vector metadata, re-embeds the preserved chunk text, and upserts the new vectors. See `scripts/re-embed.py --help` for usage.

---

## Troubleshooting

### "Ollama is not available" or Connection Refused

**Problem:** The RAG service cannot connect to Ollama.

**Solutions:**

1. Ensure Ollama is running:
   ```bash
   curl http://localhost:11434
   ```
2. If not running, start it:
   ```bash
   ollama serve
   ```
3. Check your `OLLAMA_BASE_URL` matches where Ollama is running
4. On some Linux systems, Ollama may bind to 127.0.0.1 instead of 0.0.0.0:
   ```bash
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```

### "Model 'llama3.2' not found"

**Problem:** You have not downloaded the model yet.

**Solution:**

```bash
ollama pull llama3.2
```

### Port 18124 Already in Use

**Problem:** Another service is using port 18124.

**Solutions:**

1. Use a different port:

   ```bash
   uvicorn main:app --reload --port 18125
   ```

   Then update Highport web to use port 18125 (set `RAG_SERVICE_URL` in web app).

2. Find and stop the process using port 18124:
   ```bash
   # macOS/Linux
   lsof -i :18124
   kill -9 <PID>
   ```

### Out of Memory Errors

**Problem:** Your system cannot load the model into RAM/VRAM.

**Solutions:**

1. Use a smaller model:

   ```bash
   ollama pull llama3.2:3b  # 3 billion parameter version
   ```

   Then update `.env`:

   ```
   OLLAMA_MODEL=llama3.2:3b
   ```

2. Close other applications to free up RAM

3. Check Ollama is using CPU mode (no GPU):
   ```bash
   OLLAMA_GPU_OVERLAP=0 ollama serve
   ```

### ImportError or ModuleNotFoundError

**Problem:** Python packages not installed correctly.

**Solution:**

```bash
# Ensure you are in the virtual environment
source venv/bin/activate  # or equivalent for your OS

# Reinstall dependencies
pip install -r requirements.txt
```

### Query Returns "You do not recall any information"

**Problem:** No documents have been ingested or the query does not match any indexed content.

**Solution:**

1. Ingest documents through the Highport web interface (as GM, go to Data Management)
2. Check that documents have the correct `access_scope` (e.g., `["public"]`)
3. Verify ChromaDB data exists:
   ```bash
   ls ./chroma_data
   ```

---

## Advanced: Cloud Providers

For production deployments or when local hardware is insufficient, you can use cloud providers instead of Ollama+ChromaDB.

### Google Gemini + Pinecone

**Setup:**

1. Get API keys:
   - Google Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Pinecone: [Pinecone Console](https://app.pinecone.io/)

2. Update your `.env`:

   ```bash
   LLM_PROVIDER=gemini
   VECTORDB_PROVIDER=pinecone
   GEMINI_API_KEY=your-key-here
   PINECONE_API_KEY=your-key-here
   PINECONE_INDEX_NAME=highport-index
   PINECONE_ENVIRONMENT=us-east-1-aws
   ```

3. Restart the service:
   ```bash
   uvicorn main:app --reload --port 18124
   ```

**Cost notes:**

- Gemini has a generous free tier (1,500 requests/day)
- Pinecone free tier includes one index with limited operations

---

## Architecture Overview

### How the RAG Service Connects to Highport

```
┌─────────────┐     HTTP/SSE      ┌─────────────┐
│  Highport   │ ◄───────────────► │    RAG      │
│   Web App   │   Port 18124      │  Service    │
│  (Next.js)  │                   │  (FastAPI)  │
└─────────────┘                   └──────┬──────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │    LLM       │    │  Vector DB   │    │  Embeddings  │
            │  (Ollama)    │    │  (ChromaDB)  │    │  (Ollama)    │
            │   Port 11434 │    │  (./chroma)  │    │   (local)    │
            └──────────────┘    └──────────────┘    └──────────────┘
```

### What Is Knowledge Gating?

Knowledge gating ensures players only see information their characters would know. The system filters vector search results based on access scopes:

- `public` - Visible to everyone (common knowledge)
- `gm` - Visible only to GMs (secret information)
- `party` - Visible to all party members
- `char:<id>` - Visible only to a specific character

When a player queries the system, the RAG service automatically filters results based on their headers (`X-Is-GM`, `X-Character-Id`).

### Provider Abstraction

The RAG service uses a provider pattern that lets you swap backends without changing code:

- **LLM Providers:** `ollama` (local), `gemini` (cloud)
- **Vector DB Providers:** `chroma` (local), `pinecone` (cloud)
- **Embeddings Providers:** `ollama` (local, free), `openai` (cloud, paid)

Switch LLM/vector providers by changing environment variables. No code changes required.

---

## Next Steps

1. **Ingest campaign data:** Use the Highport web interface to upload PDFs or paste text
2. **Test queries:** Open the "Ask Computer" panel in the web app
3. **Tune responses:** Adjust prompts in `routers/query.py` for your game's tone
4. **Monitor performance:** Check logs with `tail -f` while users query

---

## Reference: API Endpoints

| Endpoint  | Method | Description                             |
| --------- | ------ | --------------------------------------- |
| `/health` | GET    | Service health and provider status      |
| `/query`  | POST   | Submit a RAG query (returns SSE stream) |
| `/ingest` | POST   | Add documents to the vector DB          |
| `/scope`  | GET    | Get effective scopes for a user         |

See the router files in `apps/rag-service/routers/` for full API documentation.
