import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import get_current_user, get_active_subscription

router = APIRouter(prefix="/billing", tags=["billing"])

PLANS = {
    "monthly": {"name": "شهري", "period_days": 30, "features": {"max_groups": 100, "max_campaigns": 20}},
    "yearly": {"name": "سنوي", "period_days": 365, "features": {"max_groups": 500, "max_campaigns": 100}},
}

SERVICES = {
    "new_post": {
        "name": "النشر بمنشور جديد",
        "description": "كتابة منشور جديد وجدولته أو نشره على المجموعات.",
    },
    "share_page": {
        "name": "مشاركة منشور من الصفحة",
        "description": "مشاركة منشور موجود من صفحتك على المجموعات.",
    },
}

DEFAULT_PLATFORM_SETTINGS = {
    "manual_payment_info": "حوّل قيمة الاشتراك ثم أدخل رقم العملية أو رابط إثبات الدفع ليقوم المدير بالتفعيل.",
    "currency": "USD",
    "service_prices": {
        "new_post": {"monthly": 0, "yearly": 0},
        "share_page": {"monthly": 0, "yearly": 0},
    },
}

MANUAL_PAYMENT_DETAILS = {
    "method": "manual",
    "instructions": DEFAULT_PLATFORM_SETTINGS["manual_payment_info"],
    "reference_hint": "رقم العملية / Transaction ID",
}


def get_platform_settings(db: Session) -> dict:
    config = (
        db.query(models.BotConfig)
        .filter(models.BotConfig.user_id.is_(None), models.BotConfig.key == "platform_settings")
        .first()
    )
    if not config or not config.value:
        return DEFAULT_PLATFORM_SETTINGS
    try:
        saved = json.loads(config.value)
    except json.JSONDecodeError:
        return DEFAULT_PLATFORM_SETTINGS
    merged = {
        **DEFAULT_PLATFORM_SETTINGS,
        **saved,
        "service_prices": {
            **DEFAULT_PLATFORM_SETTINGS["service_prices"],
            **(saved.get("service_prices") or {}),
        },
    }
    currency = str(merged.get("currency") or "USD").upper()
    merged["currency"] = "USD" if currency == "EGP" else currency
    return merged


def service_amount_cents(settings: dict, service_key: str, plan: str) -> int:
    value = ((settings.get("service_prices") or {}).get(service_key) or {}).get(plan, 0)
    return int(value or 0)


@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    settings = get_platform_settings(db)
    services = {}
    for key, service in SERVICES.items():
        prices = (settings.get("service_prices") or {}).get(key, {})
        services[key] = {
            **service,
            "prices": {
                "monthly": int(prices.get("monthly") or 0),
                "yearly": int(prices.get("yearly") or 0),
            },
        }
    return {
        "plans": PLANS,
        "services": services,
        "currency": settings.get("currency", "USD"),
        "manual_payment": {
            **MANUAL_PAYMENT_DETAILS,
            "instructions": settings.get("manual_payment_info") or MANUAL_PAYMENT_DETAILS["instructions"],
        },
    }


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
    if data.service_key not in SERVICES:
        raise HTTPException(status_code=400, detail="الخدمة غير صحيحة")
    settings = get_platform_settings(db)
    amount_cents = service_amount_cents(settings, data.service_key, data.plan)
    service_name = SERVICES[data.service_key]["name"]
    subscription = models.Subscription(
        user_id=current_user.id,
        plan=data.plan,
        service_key=data.service_key,
        service_name=service_name,
        status="pending",
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        amount_cents=amount_cents,
        currency=settings.get("currency", "USD"),
        provider="manual",
    )
    db.add(subscription)
    db.flush()

    payment = models.Payment(
        user_id=current_user.id,
        subscription_id=subscription.id,
        plan=data.plan,
        service_key=data.service_key,
        service_name=service_name,
        status="pending",
        payment_method=data.payment_method,
        payment_reference=data.payment_reference,
        proof_url=data.proof_url,
        amount_cents=amount_cents,
        currency=settings.get("currency", "USD"),
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
