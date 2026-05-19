from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, get_active_subscription

router = APIRouter(prefix="/billing", tags=["billing"])

PLANS = {
    "monthly": {"name": "شهري", "period_days": 30, "features": {"max_groups": 100, "max_campaigns": 20}},
    "yearly": {"name": "سنوي", "period_days": 365, "features": {"max_groups": 500, "max_campaigns": 100}},
}

MANUAL_PAYMENT_DETAILS = {
    "method": "manual",
    "instructions": "حوّل قيمة الاشتراك ثم أدخل رقم العملية أو رابط إثبات الدفع ليقوم المدير بالتفعيل.",
    "reference_hint": "رقم العملية / Transaction ID",
}


@router.get("/plans")
def list_plans():
    return {"plans": PLANS, "manual_payment": MANUAL_PAYMENT_DETAILS}


@router.get("/subscription")
def my_subscription(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    active = get_active_subscription(db, current_user.id)
    latest = (
        db.query(models.Subscription)
        .filter(models.Subscription.user_id == current_user.id)
        .order_by(models.Subscription.created_at.desc())
        .first()
    )
    subscription = active or latest
    return {
        "active": bool(active),
        "subscription": subscription,
        "features": PLANS.get(subscription.plan, {}).get("features") if subscription else None,
    }


@router.post("/payments/manual", response_model=schemas.PaymentResponse)
def create_manual_payment(
    data: schemas.ManualPaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    subscription = models.Subscription(
        user_id=current_user.id,
        plan=data.plan,
        status="pending",
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        provider="manual",
    )
    db.add(subscription)
    db.flush()

    payment = models.Payment(
        user_id=current_user.id,
        subscription_id=subscription.id,
        plan=data.plan,
        status="pending",
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        proof_url=data.proof_url,
        provider="manual",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/webhooks/{provider}")
async def payment_webhook(provider: str, payload: dict, db: Session = Depends(get_db)):
    return {
        "status": "received",
        "provider": provider,
        "message": "Endpoint جاهز للربط لاحقاً. لم يتم تفعيل الدفع الآلي بعد.",
    }
