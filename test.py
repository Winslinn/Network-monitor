import jwt, datetime
from os import getenv
from fastapi import app, Response, HTTPException, status
from pydantic import BaseModel

from utils.database import database as db

SECRET_KEY = getenv("SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    username: str
    password: str

def create_access_token(data: dict, expires_delta=1440):
    to_encode = data.copy()
    expire = datetime.datetime.now(datetime.timezone.utc) +
    datetime.timedelta(minutes=expires_delta)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/api/login")
async def login(request: LoginRequest, response: Response):
    user = db.get_user(request.username)
    if not user or not db.verify_password(request.password, user["pwrd"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    token = create_access_token(data={"sub": user["username"]})
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"status": "ok"}