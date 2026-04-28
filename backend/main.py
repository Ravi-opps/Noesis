from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.config import ALGORITHM, SECRET_KEY
from app.routers.login import router as login_router
from app.routers.rag import router as rag_router
from app.routers.signup import router as signup_router

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
app = FastAPI(title="Noesis Enterprise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(signup_router)
app.include_router(login_router)
app.include_router(rag_router)

@app.get("/dashboard/home")
async def get_dashboard_home(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"message": f"Welcome back, {email}!", "status": "authorized"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

