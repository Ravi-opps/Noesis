from fastapi import APIRouter, HTTPException, status

from ..db import get_connection
from ..schemas import SignUpRequest
from ..security import create_access_token, get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignUpRequest):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM users WHERE email = %s", (payload.email,))
        if cur.fetchone():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        hashed_password = get_password_hash(payload.password)
        cur.execute(
            """
            INSERT INTO users (email, password, profession, company)
            VALUES (%s, %s, %s, %s)
            """,
            (payload.email, hashed_password, payload.profession, payload.company),
        )
        conn.commit()

        token = create_access_token(payload.email)
        return {"token": token, "token-type": "bearer"}
    except HTTPException:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
