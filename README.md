# Noesis Enterprise API

FastAPI backend with JWT auth, Postgres users table, Redis-backed caching, and a RAG endpoint powered by Groq + ChromaDB.

## Requirements
- Python 3.10+
- PostgreSQL
- Redis

## Setup
1. Create and activate a virtual environment.
   - PowerShell:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```

2. Install dependencies.
   ```powershell
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the project root (or set environment variables directly).

4. Initialize the database.
   ```powershell
   psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f init_db.sql
   ```

5. Start the API.
   ```powershell
   uvicorn main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`.

## Environment variables
| Name | Required | Default | Description |
| --- | --- | --- | --- |
| `SECRET_KEY` | No | `your-secret-key-keep-it-safe` | JWT signing key |
| `DB_NAME` | No | `postgres` | Postgres database name |
| `DB_USER` | No | `postgres` | Postgres user |
| `DB_PASSWORD` | No | `password` | Postgres password |
| `DB_HOST` | No | `localhost` | Postgres host |
| `DB_PORT` | No | `5432` | Postgres port |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection string |
| `RAG_CACHE_TTL_SECONDS` | No | `3600` | Redis cache TTL in seconds |
| `GROQ_API_KEY` | Yes | — | Groq API key for LLM calls |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` | Groq model name |
| `RAG_LLM_TEMPERATURE` | No | `0.7` | LLM temperature |
| `RAG_MAX_RELEVANCE_DISTANCE` | No | `0.85` | Max embedding distance for relevance |
| `CHROMA_PERSIST_DIR` | No | `./chroma_db` | ChromaDB persistence folder |
| `REDDIT_CLIENT_ID` | No | — | Reddit API client id (optional) |
| `REDDIT_CLIENT_SECRET` | No | — | Reddit API client secret (optional) |
| `REDDIT_USERNAME` | No | — | Reddit username (optional) |
| `REDDIT_USER_AGENT` | No | — | Reddit user-agent (optional) |

## Notes
- `/rag/search` requires Redis and `GROQ_API_KEY`. It builds a ChromaDB index on first run and can take a few minutes.
- Live Reddit ingestion is optional. The default flow uses bundled sample data; to use live data, provide Reddit credentials and update `ensure_collection_indexed()` in `RAG.py` to call `get_final_data(use_live_reddit=True)`.
