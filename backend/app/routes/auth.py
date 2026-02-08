"""
Auth routes — Google OAuth flow + JWT session management.
Uses Supabase for user persistence.
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
from app.database import get_user_by_email, get_user_by_id, create_user, update_user

router = APIRouter()
logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


# ---- Models ----

class GoogleAuthRequest(BaseModel):
    code: str


class GoogleIdTokenRequest(BaseModel):
    credential: str


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
    """Dependency to get current authenticated user from Supabase."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    # Fetch user from Supabase instead of in-memory dict
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# ---- Endpoints ----

@router.post("/signin", response_model=AuthResponse)
async def google_signin(request: GoogleIdTokenRequest):
    """Sign in with Google ID token credential (from Google Identity Services)."""
    try:
        # Decode the Google ID token (JWT) - just base64 decode the payload
        # Note: In production, verify signature with Google's public keys
        parts = request.credential.split('.')
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid credential format")
        
        # Decode payload (add padding if needed)
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        
        import base64
        import json
        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        userinfo = json.loads(payload_bytes)
        
        email = userinfo.get("email")
        name = userinfo.get("name", email.split("@")[0] if email else "User")
        picture = userinfo.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email in credential")
        
        logger.info(f"🔐 Google sign-in for: {email}")
        
    except Exception as e:
        logger.error(f"Failed to decode credential: {e}")
        raise HTTPException(status_code=400, detail="Failed to decode credential")
    
    # Check if user already exists in Supabase
    existing_user = await get_user_by_email(email)
    
    if existing_user:
        user_id = existing_user["id"]
        # Update name/avatar if changed
        try:
            user = await update_user(user_id, {
                "name": name,
                "avatar_url": picture,
            })
            if not user:
                user = existing_user
        except Exception as e:
            logger.warning(f"Failed to update user: {e}")
            user = existing_user
        logger.info(f"✅ Existing user signed in: {email}")
    else:
        # Create new user in Supabase
        try:
            user = await create_user({
                "email": email,
                "name": name,
                "avatar_url": picture,
            })
            user_id = user["id"]
            logger.info(f"✅ New user created: {email} (ID: {user_id})")
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise HTTPException(status_code=500, detail="Failed to create user")
    
    # Create JWT session token
    token = create_token(user_id)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            email=email,
            name=name,
            avatar_url=picture
        )
    )


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
    
    email = userinfo.get("email")
    
    # Check if user already exists in Supabase
    existing_user = await get_user_by_email(email)
    
    if existing_user:
        # Update existing user with new tokens
        user_id = existing_user["id"]
        updated_data = {
            "name": userinfo.get("name"),
            "avatar_url": userinfo.get("picture"),
            "google_access_token": access_token,
            "google_refresh_token": refresh_token or existing_user.get("google_refresh_token"),
        }
        user = await update_user(user_id, updated_data)
        if not user:
            user = existing_user  # Fallback to existing if update returns None
            user.update(updated_data)
        logger.info(f"✅ Existing user updated: {email}")
    else:
        # Create new user in Supabase
        user_data = {
            "email": email,
            "name": userinfo.get("name"),
            "avatar_url": userinfo.get("picture"),
            "google_access_token": access_token,
            "google_refresh_token": refresh_token,
        }
        user = await create_user(user_data)
        user_id = user["id"]
        logger.info(f"✅ New user created: {email}")
    
    # Create JWT session token
    token = create_token(user_id)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            avatar_url=user.get("avatar_url")
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
