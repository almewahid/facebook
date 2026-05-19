from datetime import datetime, timezone
import os
import secrets

from fastapi import Depends, Header, HTTPException, status
import requests
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import decode_access_token, hash_password


def _supabase_auth_user(token: str) -> dict | None:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        return None

    try:
        response = requests.get(
            f"{supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=8,
        )
    except requests.RequestException:
        return None

    if response.status_code != 200:
        return None
    return response.json()


def _local_user_from_supabase(db: Session, auth_user: dict) -> models.User | None:
    email = (auth_user.get("email") or "").strip().lower()
    if not email:
        return None

    metadata = auth_user.get("user_metadata") or {}
    full_name = metadata.get("full_name") or metadata.get("name")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        first_user = db.query(models.User).count() == 0
        user = models.User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role="admin" if first_user else "user",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif full_name and not user.full_name:
        user.full_name = full_name
        db.commit()
        db.refresh(user)
    return user


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="تسجيل الدخول مطلوب")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        auth_user = _supabase_auth_user(token)
        if not auth_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="جلسة الدخول غير صالحة")
        user = _local_user_from_supabase(db, auth_user)
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير نشط")
        return user

    user = db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير نشط")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="صلاحيات المدير مطلوبة")
    return current_user


def get_active_subscription(db: Session, user_id: int) -> models.Subscription | None:
    now = datetime.now(timezone.utc)
    return (
        db.query(models.Subscription)
        .filter(
            models.Subscription.user_id == user_id,
            models.Subscription.status == "active",
            models.Subscription.start_date <= now,
            models.Subscription.end_date >= now,
        )
        .order_by(models.Subscription.end_date.desc())
        .first()
    )


def require_active_subscription(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> models.User:
    if current_user.role == "admin":
        return current_user
    if not get_active_subscription(db, current_user.id):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="الاشتراك غير فعال")
    return current_user
