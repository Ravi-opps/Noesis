import hashlib
import os
from pathlib import Path

import chromadb
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

from scrape import get_final_data

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
PERSIST_DIR = str(Path(os.getenv("CHROMA_PERSIST_DIR", str(BASE_DIR / "chroma_db"))))
COLLECTION_NAME = "reddit_comment_chunks"
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
LLM_TEMPERATURE = float(os.getenv("RAG_LLM_TEMPERATURE", "0.7"))
TOP_K = 5
MAX_RELEVANCE_DISTANCE = float(os.getenv("RAG_MAX_RELEVANCE_DISTANCE", "0.85"))
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
BATCH_SIZE = 64
MIN_QUERY_TOKEN_LENGTH = 4

PREDEFINED_PROMPT = (
    "Analyze the retrieved context and return strict JSON.\n"
    "You must produce only these keys: positives, negatives, suggestions.\n"
    "Each key must be an array of detailed objects with keys: title, details, evidence.\n"
    "Each suggestions item must also include keys: technical_actions, addresses.\n"
    "Each evidence field must contain direct snippets from context.\n"
    "Extract as many distinct grounded points as the context supports for both positives and negatives.\n"
    "Suggestions must be technical product improvements that directly address negatives.\n"
    "technical_actions must contain concrete engineering actions.\n"
    "addresses must reference related negative titles.\n"
    "Do not invent facts; every point must be supported by evidence snippets from retrieved context.\n"
    "Do not add extra keys."
)

_embedding_model = None
_collection = None
_STOPWORDS = {
    "what", "which", "when", "where", "why", "how", "does", "is", "are", "the", "this",
    "that", "with", "from", "about", "have", "has", "into", "your", "best", "good",
    "laptop", "laptops", "reddit", "review", "reviews",
}


class RAGPoint(BaseModel):
    title: str = Field(description="Short heading for the insight")
    details: str = Field(description="Detailed explanation of the point")
    evidence: list[str] = Field(default_factory=list, description="Direct snippets from retrieved context")

    @field_validator("evidence", mode="before")
    @classmethod
    def normalize_evidence(cls, value):
        if value is None:
            return []
        if isinstance(value, str):
            cleaned = value.strip()
            return [cleaned] if cleaned else []
        if isinstance(value, list):
            normalized = []
            for item in value:
                if item is None:
                    continue
                cleaned = str(item).strip()
                if cleaned:
                    normalized.append(cleaned)
            return normalized
        cleaned = str(value).strip()
        return [cleaned] if cleaned else []


def _normalize_string_list(value):
    if value is None:
        return []
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    if isinstance(value, list):
        normalized = []
        for item in value:
            if item is None:
                continue
            cleaned = str(item).strip()
            if cleaned:
                normalized.append(cleaned)
        return normalized
    cleaned = str(value).strip()
    return [cleaned] if cleaned else []


class RAGSuggestion(BaseModel):
    title: str = Field(description="Short technical suggestion heading")
    details: str = Field(description="Technical rationale and expected impact")
    technical_actions: list[str] = Field(
        default_factory=list,
        description="Concrete engineering implementation actions",
    )
    addresses: list[str] = Field(
        default_factory=list,
        description="Negative point titles this suggestion addresses",
    )
    evidence: list[str] = Field(default_factory=list, description="Direct snippets from retrieved context")

    @field_validator("technical_actions", "addresses", "evidence", mode="before")
    @classmethod
    def normalize_lists(cls, value):
        return _normalize_string_list(value)


class LLMStructuredOutput(BaseModel):
    positives: list[RAGPoint] = Field(description="Detailed positive points")
    negatives: list[RAGPoint] = Field(description="Detailed negative points")
    suggestions: list[RAGSuggestion] = Field(
        description="Technical product improvement suggestions grounded in negatives"
    )


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _embedding_model


def _get_collection():
    global _collection
    if _collection is None:
        Path(PERSIST_DIR).mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=PERSIST_DIR)
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def _sanitize_metadata(raw_metadata: dict) -> dict:
    metadata = {}
    for key, value in raw_metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            metadata[key] = value
        else:
            metadata[key] = str(value)
    return metadata


def _build_chunk_rows(final_data: list[dict]) -> list[dict]:
    chunk_rows = []
    for post_index, post in enumerate(final_data):
        comments = post.get("comments") or []
        post_id = str(post.get("post_id") or f"post-{post_index}")

        for comment_index, comment in enumerate(comments):
            comment_text = " ".join(str(comment.get("body") or "").split())
            if not comment_text:
                continue

            comment_id = str(comment.get("id") or comment.get("link") or f"{post_id}-comment-{comment_index}")
            chunks = []
            start = 0

            while start < len(comment_text):
                end = min(start + CHUNK_SIZE, len(comment_text))
                if end < len(comment_text):
                    split_at = comment_text.rfind(" ", start, end)
                    if split_at > start + int(CHUNK_SIZE * 0.6):
                        end = split_at

                chunk = comment_text[start:end].strip()
                if chunk:
                    chunks.append(chunk)

                if end >= len(comment_text):
                    break
                start = end - CHUNK_OVERLAP

            for chunk_index, chunk in enumerate(chunks):
                chunk_id_source = f"{comment_id}:{chunk_index}:{chunk}"
                chunk_id = hashlib.sha1(chunk_id_source.encode("utf-8")).hexdigest()

                raw_metadata = {
                    "post_id": post_id,
                    "subreddit": post.get("subreddit"),
                    "post_title": post.get("title"),
                    "post_score": post.get("score"),
                    "comment_id": comment_id,
                    "comment_link": comment.get("link"),
                    "comment_score": comment.get("score"),
                    "chunk_index": chunk_index,
                    "chunk_count": len(chunks),
                }

                chunk_rows.append(
                    {
                        "id": chunk_id,
                        "document": chunk,
                        "metadata": _sanitize_metadata(raw_metadata),
                    }
                )

    return chunk_rows


def ensure_collection_indexed() -> None:
    collection = _get_collection()
    if collection.count() > 0:
        return

    final_data = get_final_data(use_live_reddit=False)
    chunk_rows = _build_chunk_rows(final_data)
    embedding_model = _get_embedding_model()

    for start in range(0, len(chunk_rows), BATCH_SIZE):
        batch = chunk_rows[start : start + BATCH_SIZE]
        documents = [row["document"] for row in batch]
        ids = [row["id"] for row in batch]
        metadatas = [row["metadata"] for row in batch]
        embeddings = embedding_model.encode(
            documents,
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).tolist()

        collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )


def run_structured_rag(search: str) -> dict:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    ensure_collection_indexed()
    embedding_model = _get_embedding_model()
    collection = _get_collection()

    query_embedding = embedding_model.encode(
        [search],
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).tolist()[0]

    retrieval_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=TOP_K,
        include=["documents", "metadatas", "distances"],
    )

    retrieved_documents = retrieval_results.get("documents", [[]])[0]
    retrieved_metadatas = retrieval_results.get("metadatas", [[]])[0]
    retrieved_distances = retrieval_results.get("distances", [[]])[0]
    if not retrieved_documents:
        return {
            "sufficient_info": False,
            "message": "There is not sufficient info about this on Reddit.",
            "positives": [],
            "negatives": [],
            "suggestions": [],
        }

    has_relevant_match = False
    for distance in retrieved_distances:
        if distance is None:
            continue
        if float(distance) <= MAX_RELEVANCE_DISTANCE:
            has_relevant_match = True
            break

    if not has_relevant_match:
        return {
            "sufficient_info": False,
            "message": "There is not sufficient info about this on Reddit.",
            "positives": [],
            "negatives": [],
            "suggestions": [],
        }

    query_tokens = []
    for token in search.lower().replace("/", " ").replace("-", " ").split():
        cleaned = "".join(ch for ch in token if ch.isalnum())
        if len(cleaned) < MIN_QUERY_TOKEN_LENGTH:
            continue
        if cleaned in _STOPWORDS:
            continue
        query_tokens.append(cleaned)

    searchable_text_parts = []
    for index, doc in enumerate(retrieved_documents):
        searchable_text_parts.append(doc.lower())
        metadata = retrieved_metadatas[index] if index < len(retrieved_metadatas) else {}
        searchable_text_parts.append(str(metadata.get("post_title", "")).lower())
        searchable_text_parts.append(str(metadata.get("subreddit", "")).lower())
    searchable_text = " ".join(searchable_text_parts)

    token_overlap = False
    for token in query_tokens:
        if token in searchable_text:
            token_overlap = True
            break

    if query_tokens and not token_overlap:
        return {
            "sufficient_info": False,
            "message": "There is not sufficient info about this on Reddit.",
            "positives": [],
            "negatives": [],
            "suggestions": [],
        }

    context_lines = []
    for index, doc in enumerate(retrieved_documents):
        metadata = retrieved_metadatas[index] if index < len(retrieved_metadatas) else {}
        subreddit = metadata.get("subreddit", "unknown")
        title = metadata.get("post_title", "unknown")
        score = metadata.get("comment_score", "n/a")
        context_lines.append(
            f"[{index + 1}] subreddit={subreddit} | title={title} | comment_score={score}\n{doc}"
        )

    context_block = "\n\n".join(context_lines)
    prompt_text = (
        f"{PREDEFINED_PROMPT}\n\n"
        f"User search: {search}\n\n"
        f"Retrieved context:\n{context_block}"
    )

    llm = ChatGroq(
        model=GROQ_MODEL,
        api_key=groq_api_key,
        temperature=LLM_TEMPERATURE,
    )
    structured_llm = llm.with_structured_output(LLMStructuredOutput, method="json_mode")
    structured_response = structured_llm.invoke(
        [
            SystemMessage(content="You are a grounded RAG assistant. Use only provided context."),
            HumanMessage(content=prompt_text),
        ]
    )

    return {
        "sufficient_info": True,
        "message": "Structured Reddit insights generated successfully.",
        "positives": [point.model_dump() for point in structured_response.positives],
        "negatives": [point.model_dump() for point in structured_response.negatives],
        "suggestions": [point.model_dump() for point in structured_response.suggestions],
    }
