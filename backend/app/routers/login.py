from fastapi import APIRouter, HTTPException, status

from ..db import get_connection
from ..schemas import LoginRequest
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT password FROM users WHERE email = %s", (payload.email,))
        row = cur.fetchone()
        if not row or not verify_password(payload.password, row[0]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(payload.email)
        return {"token": token, "token-type": "bearer"}
    finally:
        cur.close()
        conn.close()
