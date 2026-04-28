import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from redis import Redis
from redis.exceptions import RedisError

from RAG import run_structured_rag
from ..config import ALGORITHM, RAG_CACHE_TTL_SECONDS, REDIS_URL, SECRET_KEY
from ..schemas import RAGSearchRequest, RAGSearchResponse

router = APIRouter(tags=["rag"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
CACHE_VERSION = "v3"


def _get_current_user_email(token: str = Depends(oauth2_scheme)) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


def _run_rag_search(search: str, user_email: str) -> RAGSearchResponse:
    normalized_search = search.strip()
    if not normalized_search:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search text is required.",
        )

    cache_key_raw = f"{user_email}:{normalized_search.lower()}"
    cache_key = f"rag:search:{CACHE_VERSION}:{hashlib.sha256(cache_key_raw.encode('utf-8')).hexdigest()}"

    try:
        cached = redis_client.get(cache_key)
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Redis cache read failed: {exc}",
        )

    if cached:
        cached_payload = json.loads(cached)
        if "sufficient_info" not in cached_payload:
            cached_payload["sufficient_info"] = bool(
                cached_payload.get("positives") or cached_payload.get("negatives")
            )
        if "message" not in cached_payload:
            cached_payload["message"] = "Insights retrieved successfully."
        if "suggestions" not in cached_payload:
            cached_payload["suggestions"] = []
        try:
            return RAGSearchResponse(**cached_payload)
        except ValidationError:
            # Backward compatibility for stale cache entries with incompatible shapes.
            try:
                redis_client.delete(cache_key)
            except RedisError:
                pass

    try:
        rag_result = run_structured_rag(normalized_search)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    response_payload = RAGSearchResponse(
        search=normalized_search,
        sufficient_info=bool(rag_result.get("sufficient_info", True)),
        message=rag_result.get("message", "Insights retrieved successfully."),
        positives=rag_result.get("positives", []),
        negatives=rag_result.get("negatives", []),
        suggestions=rag_result.get("suggestions", []),
    )

    try:
        redis_client.setex(
            cache_key,
            RAG_CACHE_TTL_SECONDS,
            response_payload.model_dump_json(),
        )
    except RedisError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Redis cache write failed: {exc}",
        )

    return response_payload


@router.post("/rag/search", response_model=RAGSearchResponse)
async def rag_search(payload: RAGSearchRequest, user_email: str = Depends(_get_current_user_email)):
    return _run_rag_search(payload.search, user_email)
