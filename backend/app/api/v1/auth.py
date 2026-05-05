from __future__ import annotations

from datetime import timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    new_jti,
    utcnow,
    verify_password,
)
from app.core.deps import get_current_user
from app.db.iam_session import get_identity_db
from app.models import RefreshToken, User
from app.schemas.auth import ChangePasswordBody, LoginRequest, TokenResponse
from app.services import audit_write, user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
):
    r = await db.execute(select(User).where(User.email == body.email))
    user = r.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User inactive")

    settings = get_settings()
    jti = new_jti()
    expires_at = utcnow() + timedelta(days=settings.refresh_token_expire_days)
    rt_row = RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at)
    db.add(rt_row)
    await db.commit()

    access = create_access_token(
        subject=str(user.id),
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
    )
    refresh = create_refresh_token(subject=str(user.id), jti=jti)
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )
    return TokenResponse(access_token=access)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    refresh_token: Annotated[Optional[str], Cookie()] = None,
):
    """Rotate refresh cookie and return new access_token."""
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh cookie")
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Wrong token type")
    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        raise HTTPException(status_code=401, detail="Malformed refresh token")

    r = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    row = r.scalar_one_or_none()
    if not row or row.revoked_at is not None or row.expires_at < utcnow():
        raise HTTPException(status_code=401, detail="Refresh revoked or expired")

    from app.services.redis_client import get_redis

    redis = await get_redis()
    if redis is not None and await redis.get(f"revoked_refresh:{jti}"):
        raise HTTPException(status_code=401, detail="Refresh revoked")

    user = await db.get(User, row.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User missing")

    settings = get_settings()
    new_jti_val = new_jti()
    new_exp = utcnow() + timedelta(days=settings.refresh_token_expire_days)
    new_row = RefreshToken(user_id=user.id, jti=new_jti_val, expires_at=new_exp)
    db.add(new_row)
    await db.flush()
    row.revoked_at = utcnow()
    row.replaced_by_id = new_row.id
    await db.commit()

    access = create_access_token(
        subject=str(user.id),
        role=user.role,
        branch_id=str(user.branch_id) if user.branch_id else None,
    )
    refresh = create_refresh_token(subject=str(user.id), jti=new_jti_val)
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.refresh_token_expire_days * 86400,
        path="/api/v1/auth",
    )
    return TokenResponse(access_token=access)


@router.post("/logout", summary="Revoke refresh session and blacklist jti in Redis")
async def logout(
    response: Response,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    refresh_token: Annotated[Optional[str], Cookie()] = None,
):
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
        except JWTError:
            payload = {}
        jti = payload.get("jti") if isinstance(payload, dict) else None
        if jti:
            await db.execute(update(RefreshToken).where(RefreshToken.jti == jti).values(revoked_at=utcnow()))
            await db.commit()
            from app.services.redis_client import get_redis

            r = await get_redis()
            if r is not None:
                ttl = get_settings().refresh_token_expire_days * 86400
                await r.setex(f"revoked_refresh:{jti}", ttl, "1")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return JSONResponse({"ok": True})


@router.get("/me", summary="Current user (Bearer or relax mode)")
async def auth_me(user: Annotated[User, Depends(get_current_user)]):
    branch_name = user.branch.name if user.branch else None
    return JSONResponse(
        {
            "id": str(user.id),
            "name": user.full_name,
            "role": user.role,
            "branch": branch_name,
            "email": user.email,
        }
    )


@router.post("/change-password", summary="Change current user's password")
async def change_password(
    body: ChangePasswordBody,
    db: Annotated[AsyncSession, Depends(get_identity_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    await user_service.change_own_password(
        db,
        user,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    # Отзываем все refresh-токены пользователя — старые сессии больше не валидны.
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    await audit_write.write_audit_log(
        db,
        user,
        action="patch",
        entity_type="user",
        entity_id=str(user.id),
        details="Смена пароля пользователем",
    )
    await db.commit()
    return JSONResponse({"ok": True})
