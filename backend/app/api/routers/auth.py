import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

try:
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token
except Exception:  # pragma: no cover - optional dependency guard
    google_requests = None
    google_id_token = None

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: schemas.UserCreate, db: Session = Depends(get_db)):
    email = _normalize_email(data.email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني غير صحيح")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    first_user = db.query(models.User).count() == 0
    user = models.User(
        email=email,
        full_name=(data.full_name or "").strip() or None,
        password_hash=hash_password(data.password),
        role="admin" if first_user else "user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "access_token": create_access_token(user.id, user.role),
        "user": user,
    }


@router.post("/login", response_model=schemas.AuthResponse)
def login(data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == _normalize_email(data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

    return {
        "access_token": create_access_token(user.id, user.role),
        "user": user,
    }


@router.post("/google", response_model=schemas.AuthResponse)
def google_login(data: schemas.GoogleLogin, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="تسجيل الدخول بجوجل غير مفعل بعد. أضف GOOGLE_CLIENT_ID في إعدادات السيرفر.")
    if not google_id_token or not google_requests:
        raise HTTPException(status_code=503, detail="اعتمادات Google غير مثبتة على السيرفر.")

    try:
        payload = google_id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            client_id,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="تعذر التحقق من حساب Google")

    if not payload.get("email_verified"):
        raise HTTPException(status_code=401, detail="يجب أن يكون بريد Google مؤكدًا")

    email = _normalize_email(payload.get("email", ""))
    if not email:
        raise HTTPException(status_code=401, detail="لم يرسل Google بريدًا صالحًا")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        first_user = db.query(models.User).count() == 0
        user = models.User(
            email=email,
            full_name=(payload.get("name") or "").strip() or None,
            password_hash=hash_password(os.urandom(32).hex()),
            role="admin" if first_user else "user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif payload.get("name") and not user.full_name:
        user.full_name = payload.get("name")
        db.commit()
        db.refresh(user)

    return {
        "access_token": create_access_token(user.id, user.role),
        "user": user,
    }


@router.get("/me", response_model=schemas.UserResponse)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
