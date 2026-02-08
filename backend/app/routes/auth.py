"""
Auth routes — Google OAuth flow + JWT session management.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import httpx
import jwt
import logging

from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# In-memory user store (replace with database in production)
users_db: dict[str, dict] = {}


# ---- Models ----

class GoogleAuthRequest(BaseModel):
    code: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# ---- JWT Helpers ----

def create_token(user_id: str) -> str:
    """Create a JWT token for a user."""
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return user_id if valid."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current authenticated user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency that returns user if authenticated, or a test user if not.
    This allows the calling feature to work during development without OAuth.
    """
    if credentials:
        user_id = verify_token(credentials.credentials)
        if user_id:
            user = users_db.get(user_id)
            if user:
                return user
    
    # Return a test user for development
    logger.info("⚠️ Using test user (no auth) - for development only")
    return {
        "id": "test-user-123",
        "email": "test@callpilot.dev",
        "name": "Test User"
    }


# ---- Endpoints ----

@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """Exchange Google OAuth code for access token and create session."""
    
    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": request.code,
        "client_id": settings.google_oauth_client_id,
        "client_secret": settings.google_oauth_client_secret,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Get access token from Google
            token_response = await client.post(token_url, data=token_data)
            if token_response.status_code != 200:
                logger.error(f"Google token error: {token_response.text}")
                raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            refresh_token = tokens.get("refresh_token")
            
            # Get user info from Google
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                logger.error(f"Google userinfo error: {userinfo_response.text}")
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            userinfo = userinfo_response.json()
            
        except httpx.RequestError as e:
            logger.error(f"HTTP error during Google auth: {e}")
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    # Create or update user
    user_id = userinfo.get("id")
    user = {
        "id": user_id,
        "email": userinfo.get("email"),
        "name": userinfo.get("name"),
        "avatar_url": userinfo.get("picture"),
        "google_access_token": access_token,
        "google_refresh_token": refresh_token,
        "created_at": datetime.utcnow().isoformat()
    }
    users_db[user_id] = user
    
    logger.info(f"✅ User authenticated: {user['email']}")
    
    # Create JWT session token
    token = create_token(user_id)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            avatar_url=user["avatar_url"]
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        avatar_url=user.get("avatar_url")
    )


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Clear user session."""
    # In production, you'd invalidate the token in a blacklist
    # For now, client just discards the token
    logger.info(f"👋 User logged out: {user['email']}")
    return {"message": "Logged out successfully"}
