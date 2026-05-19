from datetime import datetime, timedelta, timezone
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import require_admin
from app.api.routers.billing import DEFAULT_PLATFORM_SETTINGS, SERVICES, get_platform_settings

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
        for user in users
    ]


@router.get("/platform-settings")
def get_admin_platform_settings(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    return {
        **get_platform_settings(db),
        "services": SERVICES,
    }


@router.put("/platform-settings")
def update_admin_platform_settings(
    data: schemas.AdminPlatformSettings,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    payload = {
        **DEFAULT_PLATFORM_SETTINGS,
        "manual_payment_info": data.manual_payment_info or "",
        "currency": data.currency or "EGP",
        "service_prices": {
            key: {
                "monthly": int(value.monthly or 0),
                "yearly": int(value.yearly or 0),
            }
            for key, value in data.service_prices.items()
            if key in SERVICES
        },
    }
    config = (
        db.query(models.BotConfig)
        .filter(models.BotConfig.user_id.is_(None), models.BotConfig.key == "platform_settings")
        .first()
    )
    if not config:
        config = models.BotConfig(user_id=None, key="platform_settings")
        db.add(config)
    config.value = json.dumps(payload, ensure_ascii=False)
    db.commit()
    return {
        **payload,
        "services": SERVICES,
    }


@router.get("/payments", response_model=list[schemas.PaymentResponse])
def list_payments(
    status: str | None = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    query = db.query(models.Payment)
    if status:
        query = query.filter(models.Payment.status == status)
    return query.order_by(models.Payment.created_at.desc()).all()


@router.post("/users/{user_id}/subscriptions/activate", response_model=schemas.SubscriptionResponse)
def activate_subscription(
    user_id: int,
    data: schemas.AdminActivateSubscription,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    now = datetime.now(timezone.utc)
    period_days = 365 if data.plan == "yearly" else 30

    subscription = None
    payment = None
    if data.payment_id:
        payment = db.query(models.Payment).filter(models.Payment.id == data.payment_id).first()
        if not payment or payment.user_id != user_id:
            raise HTTPException(status_code=404, detail="طلب الدفع غير موجود")
        payment.status = "approved"
        payment.payment_reference = data.payment_reference or payment.payment_reference
        subscription = payment.subscription

    if not subscription:
        subscription = models.Subscription(user_id=user_id, plan=data.plan, provider="manual")
        db.add(subscription)

    subscription.plan = data.plan
    subscription.service_key = getattr(subscription, "service_key", None) or getattr(payment, "service_key", None) or "new_post"
    subscription.service_name = getattr(subscription, "service_name", None) or getattr(payment, "service_name", None) or SERVICES.get(subscription.service_key, {}).get("name")
    subscription.status = "active"
    subscription.start_date = now
    subscription.end_date = now + timedelta(days=period_days)
    subscription.payment_method = "manual"
    subscription.payment_reference = data.payment_reference or subscription.payment_reference
    subscription.amount_cents = getattr(subscription, "amount_cents", None) or getattr(payment, "amount_cents", None)
    subscription.currency = getattr(subscription, "currency", None) or getattr(payment, "currency", None) or "EGP"
    subscription.provider = "manual"

    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/payments/{payment_id}/reject", response_model=schemas.PaymentResponse)
def reject_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="طلب الدفع غير موجود")
    payment.status = "rejected"
    if payment.subscription:
        payment.subscription.status = "cancelled"
    db.commit()
    db.refresh(payment)
    return payment
