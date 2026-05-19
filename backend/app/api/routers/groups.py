from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
import csv
import io
import pandas as pd

from app.database import get_db
from app.deps import get_current_user
from app import models, schemas

router = APIRouter(prefix="/groups", tags=["groups"])


COLUMN_ALIASES = {
    "name": ["name", "اسم المجموعة", "المجموعة", "group_name"],
    "url": ["url", "رابط المجموعة", "الرابط", "group_url"],
    "category": ["category", "القائمة / التصنيف", "القائمة", "التصنيف"],
    "is_active": ["is_active", "نشط", "فعال"],
}


def _row_value(row, field: str, default=None):
    missing = object()
    for key in COLUMN_ALIASES[field]:
        try:
            value = row.get(key, missing)
        except AttributeError:
            value = missing
        if value is not missing and value is not None and (not hasattr(pd, "isna") or not pd.isna(value)):
            return value
    return default


def _parse_bool(value, default=True) -> bool:
    if value is None or (hasattr(pd, "isna") and pd.isna(value)):
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in ("false", "0", "no", "لا", "غير نشط", "معطل"):
        return False
    return True


def _minutes_since(dt):
    if not dt:
        return None
    now = datetime.now(dt.tzinfo or timezone.utc)
    if dt.tzinfo is None:
        now = now.replace(tzinfo=None)
    return max(0, int((now - dt).total_seconds() // 60))


def _group_with_last_post(group: models.Group, db: Session, user_id: int):
    last_post = (
        db.query(models.Post)
        .filter(
            models.Post.user_id == user_id,
            models.Post.group_id == group.id,
            models.Post.status == "success",
            models.Post.posted_at.isnot(None),
        )
        .order_by(models.Post.posted_at.desc(), models.Post.id.desc())
        .first()
    )

    return {
        "id": group.id,
        "name": group.name,
        "url": group.url,
        "category": group.category,
        "is_active": group.is_active,
        "created_at": group.created_at,
        "updated_at": group.updated_at,
        "last_posted_at": last_post.posted_at if last_post else None,
        "last_post_minutes_ago": _minutes_since(last_post.posted_at) if last_post else None,
        "last_post_url": last_post.post_url if last_post else None,
        "last_publish_process_id": last_post.cycle_number if last_post else None,
    }


@router.post("", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group: schemas.GroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """إنشاء مجموعة جديدة مع دعم التصنيفات"""
    existing = db.query(models.Group).filter(
        models.Group.user_id == current_user.id,
        models.Group.name == group.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="المجموعة موجودة بالفعل")

    group_data = group.model_dump()
    db_group = models.Group(**group_data, user_id=current_user.id)
    db.add(db_group)
    try:
        db.commit()
        db.refresh(db_group)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"تعذر حفظ المجموعة في قاعدة البيانات: {exc.__class__.__name__}")
    return db_group


@router.get("", response_model=List[schemas.GroupResponse])
def get_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """الحصول على كل المجموعات"""
    groups = db.query(models.Group).filter(
        models.Group.user_id == current_user.id
    ).order_by(models.Group.id.desc()).offset(skip).limit(limit).all()
    return [_group_with_last_post(group, db, current_user.id) for group in groups]


@router.get("/{group_id}", response_model=schemas.GroupResponse)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """الحصول على مجموعة محددة"""
    group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.user_id == current_user.id,
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return _group_with_last_post(group, db, current_user.id)


@router.put("/{group_id}", response_model=schemas.GroupResponse)
def update_group(
    group_id: int,
    group_update: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """تحديث بيانات المجموعة (الاسم، الرابط، أو القائمة)"""
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.user_id == current_user.id,
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")

    update_data = group_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_group, key, value)

    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """حذف مجموعة"""
    db_group = db.query(models.Group).filter(
        models.Group.id == group_id,
        models.Group.user_id == current_user.id,
    ).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")

    db.delete(db_group)
    db.commit()
    return None


@router.post("/import/csv", response_model=dict)
async def import_groups_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة CSV")

    try:
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(decoded))

        added_count = 0
        skipped_count = 0
        errors = []

        for row_num, row in enumerate(csv_reader, start=2):
            try:
                name = str(_row_value(row, 'name', '')).strip()
                url = str(_row_value(row, 'url', '')).strip() or None
                is_active = _parse_bool(_row_value(row, 'is_active', True))
                category = str(_row_value(row, 'category', 'عام')).strip() or 'عام'

                if not name:
                    errors.append(f"السطر {row_num}: اسم المجموعة فارغ")
                    continue

                existing = db.query(models.Group).filter(
                    models.Group.user_id == current_user.id,
                    models.Group.name == name,
                ).first()
                if existing:
                    skipped_count += 1
                    continue

                new_group = models.Group(name=name, url=url, is_active=is_active, category=category, user_id=current_user.id)
                db.add(new_group)
                added_count += 1

            except Exception as e:
                errors.append(f"السطر {row_num}: {str(e)}")

        db.commit()
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")


@router.post("/import/excel", response_model=dict)
async def import_groups_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        if not any(column in df.columns for column in COLUMN_ALIASES["name"]):
            raise HTTPException(400, "يجب أن يحتوي ملف Excel على عمود name أو اسم المجموعة")

        added_count = 0
        skipped_count = 0
        errors = []

        for index, row in df.iterrows():
            try:
                name = str(_row_value(row, 'name', '')).strip()
                url_value = _row_value(row, 'url', None)
                url = str(url_value).strip() if pd.notna(url_value) else None
                is_active = _parse_bool(_row_value(row, 'is_active', True))
                category_value = _row_value(row, 'category', 'عام')
                category = str(category_value).strip() if pd.notna(category_value) else 'عام'

                if not name or name == 'nan':
                    errors.append(f"السطر {index + 2}: اسم المجموعة فارغ")
                    continue

                existing = db.query(models.Group).filter(
                    models.Group.user_id == current_user.id,
                    models.Group.name == name,
                ).first()
                if existing:
                    skipped_count += 1
                    continue

                new_group = models.Group(
                    name=name,
                    user_id=current_user.id,
                    url=url if url and url != 'nan' else None,
                    is_active=is_active,
                    category=category if category and category != 'nan' else 'عام'
                )
                db.add(new_group)
                added_count += 1

            except Exception as e:
                errors.append(f"السطر {index + 2}: {str(e)}")

        db.commit()
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")


@router.post("/import/bulk", response_model=dict)
async def import_groups_bulk(
    data: schemas.GroupBulkImport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    added_count = 0
    skipped_count = 0
    errors = []

    for idx, group_data in enumerate(data.groups):
        try:
            existing = db.query(models.Group).filter(
                models.Group.user_id == current_user.id,
                models.Group.name == group_data.name,
            ).first()
            if existing:
                skipped_count += 1
                continue

            new_group = models.Group(
                name=group_data.name,
                user_id=current_user.id,
                url=group_data.url,
                is_active=group_data.is_active,
                category=group_data.category or "عام"
            )
            db.add(new_group)
            added_count += 1

        except Exception as e:
            errors.append(f"المجموعة {idx + 1}: {str(e)}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في حفظ البيانات: {str(e)}")

    return {
        "success": True,
        "added": added_count,
        "skipped": skipped_count,
        "errors": errors,
        "total": added_count + skipped_count
    }
